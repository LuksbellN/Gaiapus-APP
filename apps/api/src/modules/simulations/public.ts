// Public future-planning simulations: capabilities, regional publications, immutable runs and representative series.
// Served through a PublicationStore (see publication-store.ts): by default the Brazilian publication pinned in
// apps/api/public/publications/future-simulation-v1; other countries are added as further sources by configuration.
// Every artifact is verified against the index sha256 before use; a mismatch is a server error, never a silently different result.
import type { FastifyReply, FastifyRequest } from 'fastify';
import { PublicationStore, pinnedBrazilSource, type Query } from './publication-store.js';

export { SIMULATION_PUBLIC_PREFIX } from './publication-store.js';
let defaultStore: PublicationStore | null = null;
/** The store used when none is configured: the Brazilian publication pinned in the repository. */
export const defaultSimulationStore = () => (defaultStore ??= new PublicationStore([pinnedBrazilSource()]));

export function simulationHandlers(store?: PublicationStore) {
  const simulations = store ?? defaultSimulationStore();
  async function result(request: FastifyRequest, reply: FastifyReply, data: unknown, immutable: boolean) {
    const { version, degraded } = await simulations.version();
    // A degraded listing (one source down) must not be cached as if it were the full coverage.
    reply.header('Cache-Control', immutable ? 'public, max-age=31536000, immutable' : degraded ? 'no-store' : 'public, max-age=300');
    return { data, meta: { app_contract_version: '0.1.0', request_id: request.id, context_key: 'future-simulation-v1', publication_version: version } };
  }
  return {
    'GET /v1/simulations/capabilities': async (request: FastifyRequest, reply: FastifyReply) => result(request, reply, await simulations.catalog(request.query as Query), false),
    'GET /v1/simulations/regional': async (request: FastifyRequest, reply: FastifyReply) => result(request, reply, await simulations.publications(request.query as Query), false),
    'GET /v1/simulations/:id': async (request: FastifyRequest, reply: FastifyReply) => result(request, reply, await simulations.run((request.params as { id: string }).id), true),
    'GET /v1/simulations/:id/series': async (request: FastifyRequest, reply: FastifyReply) => result(request, reply, await simulations.series((request.params as { id: string }).id), true),
  };
}
