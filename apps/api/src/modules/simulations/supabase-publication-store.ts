// Remote publication source: the active batch of one country in Supabase. Postgres (simulation_publication_batches)
// says which batch is current and the sha256 of its catalog and index; the public bucket holds the objects.
// Uses only the publishable key and public reads; no administrative credential ever reaches the API process.
import { createHash } from 'node:crypto';
import { ARTIFACT_PATH, type Artifact, type Catalog, type Index, type PublicationSource } from './publication-store.js';

type Batch = { batch_key: string; scope: string; storage_bucket: string; storage_prefix: string; catalog_sha256: string; catalog_bytes: number;
  index_sha256: string; index_bytes: number; manifest_sha256: string };
export interface SupabaseSourceConfig {
  id: string; scope: 'BR' | 'US'; url: string; publishableKey: string;
  fetcher?: (input: string, init?: RequestInit) => Promise<Response>;
  timeoutMs?: number; batchTtlMs?: number; maxObjectBytes?: number;
}
const BUCKET = 'simulation-public';
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

/** Immutable object key of an artifact inside a batch prefix: the content hash is part of the path. */
export function storageKey(prefix: string, artifact: Pick<Artifact, 'path' | 'sha256'>): string {
  if (!ARTIFACT_PATH.test(artifact.path) || !/^[0-9a-f]{64}$/.test(artifact.sha256)) throw new Error('Unexpected artifact path');
  const [, run, name] = artifact.path.split('/');
  return `${prefix}/runs/${run}/${artifact.sha256}/${name}`;
}

export class SupabasePublicationSource implements PublicationSource {
  readonly id: string;
  private state: { at: number; batch: Batch | null; data: { index: Index; catalog: Catalog } | null } | null = null;
  private loading: Promise<{ index: Index; catalog: Catalog } | null> | null = null;
  private readonly fetcher: NonNullable<SupabaseSourceConfig['fetcher']>;
  private readonly base: string;
  constructor(private readonly config: SupabaseSourceConfig) {
    this.id = config.id;
    this.fetcher = config.fetcher ?? ((input, init) => fetch(input, init));
    this.base = config.url.replace(/\/+$/, '');
    if (!/^https?:\/\//.test(this.base)) throw new Error('Supabase URL must be http(s)');
  }
  private signal() { return AbortSignal.timeout(this.config.timeoutMs ?? 10_000); }

  private async object(key: string, expectedBytes: number): Promise<Buffer> {
    const limit = this.config.maxObjectBytes ?? 16 * 1024 * 1024;
    if (expectedBytes > limit) throw new Error('Object larger than the configured limit');
    const response = await this.fetcher(`${this.base}/storage/v1/object/public/${BUCKET}/${key}`, { signal: this.signal() });
    if (!response.ok) throw new Error(`Storage responded ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > limit) throw new Error('Object larger than the configured limit');
    return bytes;
  }

  private async activeBatch(): Promise<Batch | null> {
    const columns = 'batch_key,scope,storage_bucket,storage_prefix,catalog_sha256,catalog_bytes,index_sha256,index_bytes,manifest_sha256';
    const response = await this.fetcher(`${this.base}/rest/v1/simulation_publication_batches?select=${columns}&scope=eq.${this.config.scope}&status=eq.active&limit=1`,
      { headers: { apikey: this.config.publishableKey, Authorization: `Bearer ${this.config.publishableKey}`, Accept: 'application/json' }, signal: this.signal() });
    if (!response.ok) throw new Error(`Catalog database responded ${response.status}`);
    const rows = await response.json() as Batch[];
    const batch = rows[0] ?? null;
    if (batch && (batch.storage_bucket !== BUCKET || batch.scope !== this.config.scope || !/^[a-z0-9][a-z0-9._/-]*$/.test(batch.storage_prefix) || batch.storage_prefix.includes('..'))) throw new Error('Unexpected batch descriptor');
    return batch;
  }

  async load() {
    const ttl = this.config.batchTtlMs ?? 60_000;
    if (this.state && Date.now() - this.state.at < ttl) return this.state.data;
    this.loading ??= (async () => {
      const batch = await this.activeBatch();
      if (!batch) { this.state = { at: Date.now(), batch: null, data: null }; return null; }
      // Same batch as before: the parsed catalog and index are still valid (a batch never changes under its key).
      if (this.state?.batch?.batch_key === batch.batch_key && this.state.batch.manifest_sha256 === batch.manifest_sha256 && this.state.data) {
        this.state = { ...this.state, at: Date.now() }; return this.state.data;
      }
      const [catalogBytes, indexBytes] = await Promise.all([this.object(`${batch.storage_prefix}/catalog.json`, batch.catalog_bytes), this.object(`${batch.storage_prefix}/index.json`, batch.index_bytes)]);
      if (catalogBytes.length !== batch.catalog_bytes || sha256(catalogBytes) !== batch.catalog_sha256 || indexBytes.length !== batch.index_bytes || sha256(indexBytes) !== batch.index_sha256) throw new Error('Batch catalog or index failed the integrity check');
      const data = { index: JSON.parse(indexBytes.toString('utf8')) as Index, catalog: JSON.parse(catalogBytes.toString('utf8')) as Catalog };
      const prefix = `${this.config.scope}:`;
      if (data.catalog.places.some(p => !p.location_id.startsWith(prefix)) || data.index.publications.some(p => !p.location_id.startsWith(prefix))) throw new Error('Batch contains places outside its scope');
      this.state = { at: Date.now(), batch, data };
      return data;
    })().finally(() => { this.loading = null; });
    return this.loading;
  }

  async artifact(artifact: Artifact) {
    if (!this.state?.batch) await this.load();
    const batch = this.state?.batch;
    if (!batch) throw new Error('No active batch');
    return this.object(storageKey(batch.storage_prefix, artifact), artifact.bytes);
  }
}
