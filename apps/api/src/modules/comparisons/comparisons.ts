import { createHash } from 'node:crypto';
import { canonicalJson, validators } from '@gaiapus/contracts';
import { publication } from '@gaiapus/contracts/fixtures';
import type { SaveComparisonRequest, EditComparisonRequest, ComparisonDetail, ComparisonSummary } from '@gaiapus/contracts';
import type { StoredComparison, SnapshotInput } from '../../plugins/repository.js';
import { privateResult, type PrivateRequest } from '../account/personal.js';
import { exampleById, paginate } from '../geography/public.js';
import { ApiError, notFound } from '../../plugins/errors.js';
import { ResultHandleStore } from './handles.js';
import type { FastifyReply } from 'fastify';
function detail(row: StoredComparison): ComparisonDetail {
  const { idempotency_key: _key, request_fingerprint: _fingerprint, ...result } = row; return result;
}
function summary(row: StoredComparison): ComparisonSummary {
  const { id, title, product_id, area_id, created_at, updated_at, result_basis, monitored_place_id } = row;
  return { id, title, product_id, area_id, created_at, updated_at, result_basis, monitored_place_id };
}
export function comparisonHandlers(handles: ResultHandleStore) {
  return {
    'POST /v1/comparisons': async (request: PrivateRequest) => {
      const input = request.body as SaveComparisonRequest;
      const key = request.headers['idempotency-key'];
      if (typeof key !== 'string' || !key.trim() || key.length > 128) throw new ApiError(422, 'invalid_input', 'A bounded Idempotency-Key header is required');
      const fingerprint = createHash('sha256').update(canonicalJson({ ...input, notes: input.notes ?? '', monitored_place_id: input.monitored_place_id ?? null })).digest('hex');
      const prior = await request.repository.findSave(key);
      if (prior) {
        if (prior.request_fingerprint !== fingerprint) throw new ApiError(409, 'idempotency_conflict', 'Idempotency key reused for a different save');
        return privateResult(request, detail(prior));
      }
      let snapshot: SnapshotInput;
      if (input.source.kind === 'example') {
        const example = exampleById(input.source.example_id);
        snapshot = { area_id: example.area_id, product_id: example.product_id, result_basis: example.result_basis, input_snapshot: example.input_snapshot, output_envelope: example.result, source_versions: { scientific_revision: publication.scientific_revision, publication_version: example.result.meta.publication_version, app_contract_version: '0.1.0' } };
      } else snapshot = handles.resolve(request.identity.id, input.source.save_handle_id);
      if (input.monitored_place_id) {
        const place = await request.repository.place(input.monitored_place_id);
        if (!place) notFound();
        if (place.area_id !== snapshot.area_id) throw new ApiError(422, 'context_mismatch', 'Monitored place must match the result area');
      }
      return privateResult(request, detail(await request.repository.saveComparison(key, fingerprint, input.title, input.notes ?? '', input.monitored_place_id ?? null, snapshot)));
    },
    'GET /v1/comparisons': async (request: PrivateRequest) => {
      const query = request.query as { limit?: number; cursor?: string }; const limit = query.limit ?? 50;
      let before: { created_at: string; id: string } | null = null;
      if (query.cursor) {
        try {
          const parsed = JSON.parse(Buffer.from(query.cursor, 'base64url').toString());
          if (parsed.owner !== request.identity.id || !validators.PrivateIdParams!({ id: parsed.id }) || !validators.Profile!({ user_id: request.identity.id, display_name: null, created_at: parsed.created_at, updated_at: parsed.created_at })) throw new Error();
          before = { created_at: parsed.created_at, id: parsed.id };
        } catch { throw new ApiError(422, 'invalid_input', 'Invalid cursor for this account'); }
      }
      const rows = await request.repository.comparisons({ limit, before });
      const items = rows.slice(0, limit); const last = items.at(-1);
      const next_cursor = rows.length > limit && last ? Buffer.from(JSON.stringify({ owner: request.identity.id, created_at: last.created_at, id: last.id })).toString('base64url') : null;
      return privateResult(request, { items, next_cursor });
    },
    'GET /v1/comparisons/:id': async (request: PrivateRequest) => privateResult(request, detail(await request.repository.comparison((request.params as { id: string }).id) ?? notFound())),
    'PATCH /v1/comparisons/:id': async (request: PrivateRequest) => privateResult(request, detail(await request.repository.editComparison((request.params as { id: string }).id, request.body as EditComparisonRequest) ?? notFound())),
    'DELETE /v1/comparisons/:id': async (request: PrivateRequest, reply: FastifyReply) => {
      if (!await request.repository.deleteComparison((request.params as { id: string }).id)) notFound();
      return reply.code(204).send();
    },
  };
}
