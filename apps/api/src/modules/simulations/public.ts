// Public future-planning simulations (harvest years 2027/2028): capabilities, regional publications, immutable runs
// and representative series. Served from the pinned regional publication (apps/api/public/publications/future-simulation-v1),
// produced by Gaiapus_nasa data/serving/future_simulation_publish.py. Every artifact is verified against the index
// sha256 before use; a mismatch is a server error, never a silently different result.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ApiError, notFound } from '../../plugins/errors.js';

const ROOT = new URL('../../../public/publications/future-simulation-v1/', import.meta.url);
export const SIMULATION_PUBLIC_PREFIX = '/publications/future-simulation-v1/';
type Artifact = { kind: 'run' | 'series' | 'members'; path: string; sha256: string; bytes: number; compression: 'gzip' | null };
type Publication = { run_id: string; location_id: string; plan_id: string; crops: string[]; harvest_years: number[]; artifacts: Artifact[]; [k: string]: unknown };
type Capability = { crop_id: string; harvest_year: number; [k: string]: unknown };
type Place = { location_id: string; capabilities: Capability[]; [k: string]: unknown };

let loaded: { index: { as_of: string; publications: Publication[] }; catalog: { places: Place[]; [k: string]: unknown } } | null = null;
const cache = new Map<string, unknown>();
function publication() {
  loaded ??= { index: JSON.parse(readFileSync(new URL('index.json', ROOT), 'utf8')), catalog: JSON.parse(readFileSync(new URL('catalog.json', ROOT), 'utf8')) };
  return loaded;
}
function verified(artifact: Artifact): Buffer {
  if (!/^runs\/sim_[0-9a-f]{24}\/[a-z.]+$/.test(artifact.path)) throw new ApiError(500, 'internal_error', 'Unexpected artifact path');
  const bytes = readFileSync(new URL(artifact.path, ROOT));
  if (bytes.length !== artifact.bytes || createHash('sha256').update(bytes).digest('hex') !== artifact.sha256) throw new ApiError(500, 'internal_error', 'Artifact integrity check failed');
  return bytes;
}
function find(id: string) { return publication().index.publications.find(p => p.run_id === id) ?? notFound(); }
function artifactOf(p: Publication, kind: Artifact['kind']) { return p.artifacts.find(a => a.kind === kind) ?? notFound(); }
function runOf(id: string) {
  const key = `run:${id}`;
  if (!cache.has(key)) cache.set(key, JSON.parse(verified(artifactOf(find(id), 'run')).toString('utf8')));
  return cache.get(key) as { representative: { central: string; dry: string; wet: string }; run_id: string };
}
function seriesOf(id: string) {
  const key = `series:${id}`;
  if (!cache.has(key)) {
    const p = find(id), artifact = artifactOf(p, 'series');
    const full = JSON.parse(gunzipSync(verified(artifact)).toString('utf8'));
    const rep = runOf(id).representative;
    const pick = (role: 'central' | 'dry' | 'wet') => ({ ...full.members.find((m: { member_id: string }) => m.member_id === rep[role]), role });
    cache.set(key, { run_id: id, dates: full.dates, capacity_mm: full.capacity_mm, day_kind: full.day_kind, bands: full.bands,
      members: [pick('central'), pick('dry'), pick('wet')], full_members_artifact: artifact });
  }
  return cache.get(key);
}
function result(request: FastifyRequest, reply: FastifyReply, data: unknown, immutable: boolean) {
  reply.header('Cache-Control', immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=300');
  return { data, meta: { app_contract_version: '0.1.0', request_id: request.id, context_key: 'future-simulation-v1', publication_version: publication().index.as_of } };
}
type Query = { location_id?: string; crop_id?: string; harvest_year?: string };
const matches = (q: Query, place: string, crops: string[], years: number[]) =>
  (!q.location_id || q.location_id === place) && (!q.crop_id || crops.includes(q.crop_id)) && (!q.harvest_year || years.includes(Number(q.harvest_year)));

export function simulationHandlers() {
  return {
    'GET /v1/simulations/capabilities': (request: FastifyRequest, reply: FastifyReply) => {
      const q = request.query as Query; const c = publication().catalog;
      const places = c.places.filter(p => !q.location_id || p.location_id === q.location_id)
        .map(p => ({ ...p, capabilities: p.capabilities.filter(x => (!q.crop_id || x.crop_id === q.crop_id) && (!q.harvest_year || x.harvest_year === Number(q.harvest_year))) }))
        .filter(p => p.capabilities.length > 0 || (!q.crop_id && !q.harvest_year));
      return result(request, reply, { ...c, places }, false);
    },
    'GET /v1/simulations/regional': (request: FastifyRequest, reply: FastifyReply) => {
      const q = request.query as Query; const { index } = publication();
      return result(request, reply, { as_of: index.as_of, items: index.publications.filter(p => matches(q, p.location_id, p.crops, p.harvest_years)) }, false);
    },
    'GET /v1/simulations/:id': (request: FastifyRequest, reply: FastifyReply) => result(request, reply, runOf((request.params as { id: string }).id), true),
    'GET /v1/simulations/:id/series': (request: FastifyRequest, reply: FastifyReply) => result(request, reply, seriesOf((request.params as { id: string }).id), true),
  };
}
