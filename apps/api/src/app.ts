import Fastify from 'fastify';
import { validators, routeContracts } from '@gaiapus/contracts';
import { publicHandlers } from './modules/geography/public.js';
import { ApiError } from './plugins/errors.js';
export function createApp(_dependencies: Record<string, unknown> = {}) {
  const app = Fastify({ logger: false, bodyLimit: 65536, genReqId: () => crypto.randomUUID() });
  app.get('/health', async () => ({ status: 'ok' }));
  app.setErrorHandler((error, request, reply) => {
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    const failure = error instanceof ApiError ? error : new ApiError(status < 500 ? 422 : 500, status < 500 ? 'invalid_input' : 'internal_error', status < 500 ? 'Invalid request' : 'Request failed');
    reply.header('Cache-Control', 'private, no-store').code(failure.status).send({ error: { code: failure.code, message: failure.message, ...(failure.fieldErrors ? { field_errors: failure.fieldErrors } : {}) }, meta: { app_contract_version: '0.1.0', request_id: request.id } });
  });
  app.setNotFoundHandler(() => { throw new ApiError(404, 'not_found', 'Resource not found'); });
  const handlers = publicHandlers();
  for (const [method, url, bodySchema, parameterSchema, responseSchema] of routeContracts) {
    const handler = handlers[`${method} ${url}` as keyof typeof handlers];
    if (!handler) continue;
    app.route({ method, url, handler: async (request, reply) => {
      const query = request.query as Record<string, any>;
      if (query.limit !== undefined && typeof query.limit === 'string' && /^\d+$/.test(query.limit)) query.limit = Number(query.limit);
      for (const [name, value] of [[bodySchema, request.body], [parameterSchema, url.includes(':id') ? request.params : query]] as const) {
        if (name && !validators[name]!(value)) throw new ApiError(422, 'invalid_input', 'Request does not match the contract');
      }
      const output = await handler(request, reply);
      if (responseSchema && !validators[responseSchema]!(output)) throw new ApiError(500, 'internal_error', 'Response contract validation failed');
      return output;
    } });
  }
  return app;
}
