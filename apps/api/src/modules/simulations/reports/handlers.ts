// Technical report routes of a simulation: one idempotent "make sure it exists" and one read by id.
//   POST /v1/simulations/:id/report                       -> envelope with state, id, locale resolution and representation
//   GET  /v1/simulations/:id/report?report_id=&format=    -> json (envelope), html or md of a stored representation
// Only reports of public regional publications are served here, built from public, sanitised artifacts; that is
// what allows a public cache header on the read. Errors always answer private, no-store (see the app error handler).
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ReportFormat, ReportRequest } from '@gaiapus/contracts';
import { ApiError } from '../../../plugins/errors.js';
import type { PublicationStore } from '../publication-store.js';
import { REPORT_CSS_SHA256 } from './html.js';
import { MIME } from './render.js';
import type { ReportService } from './service.js';

const MAX_BODY_BYTES = 4096;
const CONTEXT = 'simulation-technical-report.v1';

export function reportHandlers(service: ReportService, store: PublicationStore) {
  const meta = async (request: FastifyRequest) => ({ app_contract_version: '0.1.0' as const, request_id: request.id, context_key: CONTEXT, publication_version: (await store.version()).version });
  return {
    'POST /v1/simulations/:id/report': async (request: FastifyRequest, reply: FastifyReply) => {
      if (Number(request.headers['content-length'] ?? 0) > MAX_BODY_BYTES) throw new ApiError(413, 'payload_too_large', 'Request body is too large');
      const body = (request.body ?? {}) as ReportRequest;
      const { result } = await service.ensure({ run_id: (request.params as { id: string }).id, locale: body.locale ?? null, ...(body.scope ? { scope: body.scope } : {}), ...(body.display_profile ? { display_profile: body.display_profile } : {}) });
      // The envelope carries the locale resolution of this very request: it must never be replayed to another one.
      reply.header('Cache-Control', 'no-store');
      request.log.info({ report_id: result.report_id, run_id: result.run_id, state: result.state, reused: result.reused, error_code: result.error?.code }, 'simulation report');
      return { data: result, meta: await meta(request) };
    },
    'GET /v1/simulations/:id/report': async (request: FastifyRequest, reply: FastifyReply) => {
      const { report_id, format = 'json' } = request.query as { report_id: string; format?: ReportFormat };
      const stored = await service.read((request.params as { id: string }).id, report_id);
      const artifact = stored.representation.artifacts.find(a => a.format === format);
      // A report id names exact bytes only when they survive a restart; otherwise a short public lifetime.
      reply.header('Cache-Control', stored.durable ? 'public, max-age=31536000, immutable' : 'public, max-age=300').header('X-Content-Type-Options', 'nosniff');
      if (format === 'json') return { data: service.resultOf(stored), meta: await meta(request) };
      reply.header('ETag', `"${artifact!.sha256}"`).header('Content-Language', stored.representation.resolved_locale);
      if (format === 'html') {
        // The export has no script, link or remote resource; the policy makes that a guarantee of the response.
        reply.header('Content-Security-Policy', `default-src 'none'; style-src 'sha256-${REPORT_CSS_SHA256}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`).header('Referrer-Policy', 'no-referrer');
        return reply.type(MIME.html).send(stored.html);
      }
      return reply.type(MIME.md).header('Content-Disposition', `inline; filename="${stored.report_id}.md"`).send(stored.markdown);
    },
  };
}
