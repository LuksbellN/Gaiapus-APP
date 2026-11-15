// Regional simulation publications behind one interface, independent of where the bytes live (pinned directory,
// local directory, remote object storage). Every artifact is verified against the index sha256 and byte length
// before use. Sources are ordered: the first one that publishes a place wins and the shadowing is reported, never
// silent. A failing source is reported as unavailable and never removes the publications of another source.
// Choosing a source is technical configuration, not a model promotion: scientific statuses come from the artifacts.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { ApiError } from '../../plugins/errors.js';

export type Artifact = { kind: 'run' | 'series' | 'members'; path: string; sha256: string; bytes: number; compression: 'gzip' | null };
export type Publication = { run_id: string; location_id: string; plan_id: string; crops: string[]; harvest_years: number[]; as_of: string; artifacts: Artifact[]; [k: string]: unknown };
export type Capability = { crop_id: string; harvest_year: number; [k: string]: unknown };
export type Place = { location_id: string; capabilities: Capability[]; [k: string]: unknown };
export type Catalog = { contract: string; as_of: string; harvest_years: number[]; places: Place[]; inputs: Record<string, unknown> };
export type Index = { as_of: string; publications: Publication[] };
export type SourceStatus = { source: string; status: 'ok' | 'unavailable'; shadowed_places?: number };
export type Query = { location_id?: string; crop_id?: string; harvest_year?: string };

export interface PublicationSource {
  readonly id: string;
  /** Index and catalog of the current publication, or null when the source has none. Throws when unreachable. */
  load(): Promise<{ index: Index; catalog: Catalog } | null>;
  /** Raw artifact bytes; integrity is checked by the store. */
  artifact(artifact: Artifact): Promise<Buffer>;
}

export const ARTIFACT_PATH = /^runs\/sim_[0-9a-f]{24}\/[a-z.]+$/;
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

export class LocalPublicationSource implements PublicationSource {
  private loaded: { index: Index; catalog: Catalog } | null = null;
  private readonly root: string;
  constructor(readonly id: string, directory: string) { this.root = resolve(directory); }
  private file(relative: string) {
    const path = resolve(this.root, relative);
    if (!path.startsWith(this.root + sep)) throw new ApiError(500, 'internal_error', 'Unexpected artifact path');
    return path;
  }
  async load() {
    this.loaded ??= { index: JSON.parse(readFileSync(this.file('index.json'), 'utf8')), catalog: JSON.parse(readFileSync(this.file('catalog.json'), 'utf8')) };
    return this.loaded;
  }
  async artifact(artifact: Artifact) { return readFileSync(this.file(artifact.path)); }
}

export const SIMULATION_PUBLIC_PREFIX = '/publications/future-simulation-v1/';
let pinned: LocalPublicationSource | null = null;
/** The Brazilian publication pinned in the repository (apps/api/public/publications/future-simulation-v1). */
export function pinnedBrazilSource(): PublicationSource {
  pinned ??= new LocalPublicationSource('pinned-br', fileURLToPath(new URL('../../../public/publications/future-simulation-v1/', import.meta.url)));
  return pinned;
}

type Loaded = { source: PublicationSource; index: Index; catalog: Catalog };
type Entry = { value: unknown; bytes: number };
// Parsed JSON held in memory costs several times its serialized size (measured ~4x on Node 22 with these series).
const HEAP_FACTOR = 4;
export interface StoreOptions { cacheBytes?: number; maxInflatedBytes?: number }

export class PublicationStore {
  private readonly cache = new Map<string, Entry>();
  private readonly inflight = new Map<string, Promise<unknown>>();
  private cached = 0;
  private readonly cacheBytes: number;
  private readonly maxInflatedBytes: number;
  constructor(private readonly sources: PublicationSource[], options: StoreOptions = {}) {
    this.cacheBytes = options.cacheBytes ?? 64 * 1024 * 1024;
    this.maxInflatedBytes = options.maxInflatedBytes ?? 32 * 1024 * 1024;
  }

  private async snapshot(): Promise<{ loaded: Loaded[]; status: SourceStatus[] }> {
    const results = await Promise.all(this.sources.map(async source => {
      try { return { source, data: await source.load(), failed: false }; } catch { return { source, data: null, failed: true }; }
    }));
    const loaded: Loaded[] = [], status: SourceStatus[] = [], seen = new Set<string>();
    for (const r of results) {
      if (r.failed) { status.push({ source: r.source.id, status: 'unavailable' }); continue; }
      if (!r.data) { status.push({ source: r.source.id, status: 'ok' }); continue; }
      // Precedence: an earlier source keeps its places; a later one publishing the same place is shadowed and counted.
      const earlier = new Set(seen);
      const places = r.data.catalog.places.filter(p => !earlier.has(p.location_id));
      const shadowed = r.data.catalog.places.length - places.length;
      const publications = r.data.index.publications.filter(p => !earlier.has(p.location_id));
      for (const p of places) seen.add(p.location_id);
      for (const p of publications) seen.add(p.location_id);
      loaded.push({ source: r.source, index: { ...r.data.index, publications }, catalog: { ...r.data.catalog, places } });
      status.push({ source: r.source.id, status: 'ok', ...(shadowed ? { shadowed_places: shadowed } : {}) });
    }
    return { loaded, status };
  }

  async version(): Promise<{ version: string; degraded: boolean }> {
    const { loaded, status } = await this.snapshot();
    const version = loaded.length === 1 ? loaded[0]!.index.as_of : loaded.map(l => `${l.source.id}@${l.index.as_of}`).join(';').slice(0, 256);
    return { version: version || 'none', degraded: status.some(s => s.status === 'unavailable') };
  }

  async catalog(query: Query = {}) {
    const { loaded, status } = await this.snapshot();
    const year = query.harvest_year ? Number(query.harvest_year) : null;
    const places = loaded.flatMap(l => l.catalog.places).filter(p => !query.location_id || p.location_id === query.location_id)
      .map(p => ({ ...p, capabilities: p.capabilities.filter(c => (!query.crop_id || c.crop_id === query.crop_id) && (year === null || c.harvest_year === year)) }))
      .filter(p => p.capabilities.length > 0 || (!query.crop_id && year === null));
    const single = loaded.length === 1 ? loaded[0]!.catalog : null;
    return {
      contract: 'future-simulation-capabilities.v1' as const,
      as_of: loaded.map(l => l.catalog.as_of).sort().at(-1) ?? new Date(0).toISOString(),
      harvest_years: [...new Set(loaded.flatMap(l => l.catalog.harvest_years))].sort((a, b) => a - b),
      places,
      inputs: single ? single.inputs : { sources: Object.fromEntries(loaded.map(l => [l.source.id, l.catalog.inputs])) },
      ...(this.sources.length > 1 ? { source_status: status } : {}),
    };
  }

  async publications(query: Query = {}) {
    const { loaded, status } = await this.snapshot();
    const year = query.harvest_year ? Number(query.harvest_year) : null;
    const items = loaded.flatMap(l => l.index.publications).filter(p => (!query.location_id || query.location_id === p.location_id)
      && (!query.crop_id || p.crops.includes(query.crop_id)) && (year === null || p.harvest_years.includes(year)));
    return { as_of: loaded.map(l => l.index.as_of).sort().at(-1) ?? new Date(0).toISOString(), items, ...(this.sources.length > 1 ? { source_status: status } : {}) };
  }

  private async find(id: string): Promise<{ source: PublicationSource; publication: Publication }> {
    const { loaded, status } = await this.snapshot();
    for (const l of loaded) { const publication = l.index.publications.find(p => p.run_id === id); if (publication) return { source: l.source, publication }; }
    // Unknown here may mean "published by a source that is down": say so instead of a false 404.
    if (status.some(s => s.status === 'unavailable')) throw new ApiError(503, 'simulation_source_unavailable', 'A simulation publication source is temporarily unavailable');
    throw new ApiError(404, 'not_found', 'Resource not found');
  }

  private async verified(source: PublicationSource, artifact: Artifact): Promise<Buffer> {
    if (!ARTIFACT_PATH.test(artifact.path)) throw new ApiError(500, 'internal_error', 'Unexpected artifact path');
    let bytes: Buffer;
    try { bytes = await source.artifact(artifact); }
    catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(503, 'simulation_source_unavailable', 'A simulation publication source is temporarily unavailable'); }
    if (bytes.length !== artifact.bytes || sha256(bytes) !== artifact.sha256) throw new ApiError(500, 'internal_error', 'Artifact integrity check failed');
    return bytes;
  }

  /** Bounded LRU by bytes, keyed by content hash; concurrent requests for the same key share one load. Failures are never cached. */
  private remember<T>(key: string, load: () => Promise<{ value: T; bytes: number }>): Promise<T> {
    const hit = this.cache.get(key);
    if (hit) { this.cache.delete(key); this.cache.set(key, hit); return Promise.resolve(hit.value as T); }
    const pending = this.inflight.get(key);
    if (pending) return pending as Promise<T>;
    const promise = load().then(({ value, bytes }) => {
      if (bytes <= this.cacheBytes) {
        this.cache.set(key, { value, bytes }); this.cached += bytes;
        for (const [oldest, entry] of this.cache) { if (this.cached <= this.cacheBytes) break; this.cache.delete(oldest); this.cached -= entry.bytes; }
      }
      return value;
    }).finally(() => { this.inflight.delete(key); });
    this.inflight.set(key, promise);
    return promise;
  }
  cacheStats() { return { entries: this.cache.size, bytes: this.cached }; }

  private artifactOf(publication: Publication, kind: Artifact['kind']) {
    return publication.artifacts.find(a => a.kind === kind) ?? (() => { throw new ApiError(404, 'not_found', 'Resource not found'); })();
  }

  async run(id: string) {
    const { source, publication } = await this.find(id);
    const artifact = this.artifactOf(publication, 'run');
    return this.remember(`run:${artifact.sha256}`, async () => {
      const bytes = await this.verified(source, artifact);
      return { value: JSON.parse(bytes.toString('utf8')) as { run_id: string; representative: { central: string; dry: string; wet: string } }, bytes: bytes.length * HEAP_FACTOR };
    });
  }

  /** Representative members only (central, dry, wet): the full member set stays in the artifact. */
  async series(id: string) {
    const { source, publication } = await this.find(id);
    const artifact = this.artifactOf(publication, 'series');
    return this.remember(`series:${artifact.sha256}`, async () => {
      const [bytes, run] = await Promise.all([this.verified(source, artifact), this.run(id)]);
      let inflated: Buffer;
      try { inflated = artifact.compression === 'gzip' ? gunzipSync(bytes, { maxOutputLength: this.maxInflatedBytes }) : bytes; }
      catch { throw new ApiError(500, 'internal_error', 'Series artifact exceeds the size limit or is not valid gzip'); }
      if (inflated.length > this.maxInflatedBytes) throw new ApiError(500, 'internal_error', 'Series artifact exceeds the size limit');
      const full = JSON.parse(inflated.toString('utf8'));
      const pick = (role: 'central' | 'dry' | 'wet') => ({ ...full.members.find((m: { member_id: string }) => m.member_id === run.representative[role]), role });
      const value = { run_id: id, dates: full.dates, capacity_mm: full.capacity_mm, day_kind: full.day_kind, bands: full.bands,
        members: [pick('central'), pick('dry'), pick('wet')], full_members_artifact: artifact };
      // Only three of the members are kept: account roughly for what stays in memory.
      return { value, bytes: Math.ceil(HEAP_FACTOR * inflated.length * Math.min(1, 4 / Math.max(1, full.members.length))) };
    });
  }
}
