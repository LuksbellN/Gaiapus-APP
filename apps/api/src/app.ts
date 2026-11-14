import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'node:url';
import { extname } from 'node:path';
import { validators, routeContracts } from '@gaiapus/contracts';
import { publicHandlers } from './modules/geography/public.js';
import { ApiError } from './plugins/errors.js';
import { personalHandlers, type PrivateRequest } from './modules/account/personal.js';
import type { Identity, Repository } from './plugins/repository.js';
import { analysisHandlers } from './modules/analysis/analysis.js';
import type { ScientificExecutor } from './modules/analysis/executor.js';
import { ResultHandleStore } from './modules/comparisons/handles.js';
import { comparisonHandlers } from './modules/comparisons/comparisons.js';
import { reviewHandlers } from './modules/evidence/reviews.js';
import type { Capabilities } from './modules/analysis/capabilities.js';
export interface Dependencies {
  verifyIdentity?: (token: string) => Promise<Identity>;
  repositoryFor?: (identity: Identity) => Repository;
  executor?: ScientificExecutor;
  handles?: ResultHandleStore;
  now?: () => number;
  frontendDir?: string;
  logger?: boolean;
  capabilities?: Capabilities;
  capabilitiesProvider?: () => Promise<Capabilities>;
}
export function createApp(dependencies: Dependencies = {}) {
  const app = Fastify({ logger: dependencies.logger ? { redact: ['req.headers.authorization', 'req.body', 'res.body'] } : false, bodyLimit: 65536, genReqId: () => crypto.randomUUID() });
  app.addHook('onRequest', async request => {
    let path: string;
    try { path = decodeURIComponent(request.url.split('?')[0]!); } catch { throw new ApiError(422, 'invalid_input', 'Invalid request path'); }
    if (path.split(/[\\/]/).some(segment => segment.startsWith('.'))) throw new ApiError(404, 'not_found', 'Resource not found');
  });
  app.register(fastifyStatic, { root: fileURLToPath(new URL('../public/publications/', import.meta.url)), prefix: '/publications/', maxAge: '1y', immutable: true });
  if (dependencies.frontendDir) app.register(fastifyStatic, { root: dependencies.frontendDir, prefix: '/', wildcard: false, decorateReply: false });
  app.get('/health', async () => ({ status: 'ok' }));
  app.setErrorHandler((error, request, reply) => {
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    const failure = error instanceof ApiError ? error : new ApiError(status < 500 ? 422 : 500, status < 500 ? 'invalid_input' : 'internal_error', status < 500 ? 'Invalid request' : 'Request failed');
    reply.header('Cache-Control', 'private, no-store').code(failure.status).send({ error: { code: failure.code, message: failure.message, ...(failure.fieldErrors ? { field_errors: failure.fieldErrors } : {}) }, meta: { app_contract_version: '0.1.0', request_id: request.id } });
  });
  app.setNotFoundHandler((request, reply) => {
    const path = request.url.split('?')[0]!;
    if (dependencies.frontendDir && request.method === 'GET' && path !== '/v1' && !path.startsWith('/v1/') && !path.startsWith('/publications/') && !path.startsWith('/assets/') && !extname(path)) return reply.type('text/html').sendFile('index.html', dependencies.frontendDir);
    throw new ApiError(404, 'not_found', 'Resource not found');
  });
  const handles = dependencies.handles ?? new ResultHandleStore(dependencies.now);
  const capabilities: Capabilities = { ...dependencies.capabilities };
  let refreshAt = -Infinity;
  let refreshPending: Promise<void> | null = null;
  app.addHook('onRequest', async request => {
    if (!dependencies.capabilitiesProvider || dependencies.executor?.origin !== 'live' || !/^\/v1\/(coverage|yield-estimates|water-balance\/scenarios)(\?|$)/.test(request.url)) return;
    const now = (dependencies.now ?? Date.now)();
    if (now < refreshAt) return;
    refreshPending ??= (async () => {
      let next: Capabilities = {};
      try { next = await dependencies.capabilitiesProvider!(); } catch { /* A failed health refresh fails closed, independently of publications. */ }
      delete capabilities.yield_estimate; delete capabilities.water_risk_projection;
      Object.assign(capabilities, next); refreshAt = (dependencies.now ?? Date.now)() + 5000;
    })().finally(() => { refreshPending = null; });
    await refreshPending;
  });
  const handlers = { ...publicHandlers({ origin: dependencies.executor?.origin ?? 'fixture', capabilities }), ...personalHandlers(), ...analysisHandlers({ ...dependencies, capabilities, handles }), ...comparisonHandlers(handles), ...reviewHandlers() };
  for (const [method, url, bodySchema, parameterSchema, responseSchema, privateRoute] of routeContracts) {
    const handler = handlers[`${method} ${url}` as keyof typeof handlers];
    if (!handler) continue;
    app.route({ method, url, handler: async (request, reply) => {
      if (privateRoute) {
        reply.header('Cache-Control', 'private, no-store');
        const authorization = request.headers.authorization;
        if (!authorization || !/^Bearer [^\s]+$/i.test(authorization)) throw new ApiError(401, 'unauthenticated', 'Authentication required');
        if (!dependencies.verifyIdentity || !dependencies.repositoryFor) throw new ApiError(503, 'identity_unavailable', 'Account service is not configured');
        const identity = await dependencies.verifyIdentity(authorization.slice(7));
        const repository = dependencies.repositoryFor(identity);
        Object.assign(request, { identity, repository });
        await repository.initialize();
      }
      const query = request.query as Record<string, any>;
      if (query.limit !== undefined && typeof query.limit === 'string' && /^\d+$/.test(query.limit)) query.limit = Number(query.limit);
      for (const [name, value] of [[bodySchema, request.body], [parameterSchema, url.includes(':id') ? request.params : query]] as const) {
        if (name && !validators[name]!(value)) throw new ApiError(422, 'invalid_input', 'Request does not match the contract');
      }
      const output = await handler(request as PrivateRequest, reply);
      if (responseSchema && !validators[responseSchema]!(output)) throw new ApiError(500, 'internal_error', 'Response contract validation failed');
      return output;
    } });
  }
  return app;
}
