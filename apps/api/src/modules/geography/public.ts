import { createHash } from 'node:crypto';
import { publication, examples, scientificCatalog } from '@gaiapus/contracts/fixtures';
import { locationCore, locationSummaries, locationPublication } from '@gaiapus/contracts/fixtures';
import { publishedCoverage, publishedObservations } from '@gaiapus/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { contextKey, canonicalJson } from '@gaiapus/contracts';
import { ApiError, notFound } from '../../plugins/errors.js';
import type { Capabilities } from '../analysis/capabilities.js';
export function areaById(id: string) { return publication.areas.find(x => x.area_id === id) ?? notFound(); }
export function exampleById(id: string) { return structuredClone(examples.find(x => x.example_id === id) ?? notFound()); }
export function paginate<T>(items: T[], query: Record<string, any>, context: string) {
  let offset = 0;
  if (query.cursor) {
    try {
      const parsed = JSON.parse(Buffer.from(query.cursor, 'base64url').toString());
      if (!Number.isSafeInteger(parsed.offset) || parsed.offset < 0 || parsed.context !== context) throw new Error();
      offset = parsed.offset;
    } catch { throw new ApiError(422, 'invalid_input', 'Invalid cursor for this context'); }
  }
  const limit = query.limit ?? 50;
  return { items: items.slice(offset, offset + limit), next_cursor: offset + limit < items.length ? Buffer.from(JSON.stringify({ offset: offset + limit, context })).toString('base64url') : null };
}
export function publicResult(request: FastifyRequest, reply: FastifyReply, kind: string, query: Record<string, any>, data: unknown) {
  const key = contextKey(kind, query);
  const etag = createHash('sha256').update(`${publication.publication_version}:${key}:${canonicalJson(data)}`).digest('hex');
  reply.header('Cache-Control', 'public, max-age=300').header('ETag', `"${etag}"`);
  return { data, meta: { app_contract_version: '0.1.0', request_id: request.id, context_key: key, publication_version: publication.publication_version } };
}
/** Location core responses carry the location publication version in their cache identity. */
function locationResult(request: FastifyRequest, reply: FastifyReply, kind: string, query: Record<string, any>, data: unknown) {
  const key = contextKey(kind, query);
  const etag = createHash('sha256').update(`${locationPublication.version}:${key}:${canonicalJson(data)}`).digest('hex');
  reply.header('Cache-Control', 'public, max-age=300').header('ETag', `"${etag}"`);
  return { data, meta: { app_contract_version: '0.1.0', request_id: request.id, context_key: key, publication_version: locationPublication.version } };
}
export function publicHandlers(options: { origin: 'fixture' | 'live'; capabilities?: Capabilities }) {
  return {
    'GET /v1/scientific-catalog': (request: FastifyRequest, reply: FastifyReply) => publicResult(request,reply,'scientific-catalog',{},scientificCatalog),
    'GET /v1/geography': (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as Record<string, any>;
      if (query.parent_id) areaById(query.parent_id);
      const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const items = publication.areas.filter(x => (!query.parent_id || x.parent_id === query.parent_id) && (!query.q || normalize(x.name).includes(normalize(query.q)))).sort((a, b) => a.area_id.localeCompare(b.area_id));
      return publicResult(request, reply, 'geography', query, paginate(items, query, contextKey('geography', { q: query.q ?? '', parent_id: query.parent_id ?? null, publication_version: publication.publication_version })));
    },
    'GET /v1/coverage': (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as { area_id: string }; areaById(query.area_id);
      const coverage = publishedCoverage(query.area_id);
      if (options.origin === 'live') for (const product of coverage.products) {
        if (product.product_id !== 'yield_estimate' && product.product_id !== 'water_risk_projection') continue;
        const ready = options.capabilities?.[product.product_id];
        product.supported_inputs = product.supported_inputs.filter(x => ready?.supported_inputs.some(input => canonicalJson(input) === canonicalJson(x.input)));
        product.execution_origin = 'live'; product.run_available = product.supported_inputs.length > 0 && ready?.ready === true;
        if (product.availability !== 'no_data' && !product.run_available) product.reason_code = ready?.reason_code ?? 'missing_artifacts';
      }
      // Capability mode is part of cache identity; fixture and live catalogs must not collide.
      return publicResult(request, reply, 'coverage', query, coverage);
    },
    'GET /v1/observations': (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as { area_id: string; start: string; end: string }; areaById(query.area_id);
      if (query.start > query.end) throw new ApiError(422, 'invalid_input', 'Period end must follow start');
      return publicResult(request, reply, 'observations', query, publishedObservations(query.area_id, query.start, query.end));
    },
    'GET /v1/examples': (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as Record<string, any>;
      if (query.area_id) areaById(query.area_id);
      const items = examples.filter(x => (!query.area_id || x.area_id === query.area_id) && (!query.product_id || x.product_id === query.product_id)).map(({ example_id, title, area_id, product_id, period, result_basis }) => ({ example_id, title, area_id, product_id, period, result_basis }));
      return publicResult(request, reply, 'examples', query, paginate(items, query, contextKey('examples', { area_id: query.area_id ?? null, product_id: query.product_id ?? null, publication_version: publication.publication_version })));
    },
    // Location core v1: same data core for every place in any supported country (additive; ids BR:ibge:… / US:fips:…).
    'GET /v1/locations': (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as Record<string, any>;
      return locationResult(request, reply, 'locations', query, paginate(locationSummaries(), query, contextKey('locations', { version: locationPublication.version })));
    },
    'GET /v1/locations/:id/core': (request: FastifyRequest, reply: FastifyReply) => {
      const id = (request.params as { id: string }).id;
      return locationResult(request, reply, 'location-core', { id }, locationCore(id) ?? notFound());
    },
    'GET /v1/examples/:id': (request: FastifyRequest, reply: FastifyReply) => {
      const id = (request.params as { id: string }).id;
      return publicResult(request, reply, 'example', { example_id: id }, exampleById(id));
    },
  };
}
