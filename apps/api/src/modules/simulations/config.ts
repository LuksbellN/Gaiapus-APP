// Which publication sources the API serves, from environment configuration. Brazil always comes from the pinned
// directory; the US source is opt-in. This is deployment configuration only: it selects where published bytes are
// read from and never changes a model or a scientific status.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { LocalPublicationSource, PublicationStore, pinnedBrazilSource, type PublicationSource } from './publication-store.js';
import { SupabasePublicationSource } from './supabase-publication-store.js';
import { defaultReportRepository } from './reports/repository.js';
import { ReportService, type ReportLogEvent } from './reports/service.js';

type Env = Record<string, string | undefined>;
const bounded = (env: Env, name: string, fallback: number, min: number, max: number) => {
  if (env[name] === undefined) return fallback;
  const value = Number(env[name]);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${name} must be an integer ${min}..${max}`);
  return value;
};

export function simulationStoreFromEnv(env: Env): PublicationStore {
  const sources: PublicationSource[] = [pinnedBrazilSource()];
  const mode = env.SIMULATION_US_SOURCE ?? 'off';
  if (mode === 'local') {
    if (!env.SIMULATION_US_LOCAL_DIR) throw new Error('SIMULATION_US_SOURCE=local requires SIMULATION_US_LOCAL_DIR');
    const directory = resolve(env.SIMULATION_US_LOCAL_DIR);
    if (!existsSync(resolve(directory, 'index.json')) || !existsSync(resolve(directory, 'catalog.json'))) throw new Error('SIMULATION_US_LOCAL_DIR must contain index.json and catalog.json');
    sources.push(new LocalPublicationSource('us-local', directory));
  } else if (mode === 'supabase') {
    if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) throw new Error('SIMULATION_US_SOURCE=supabase requires SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY');
    sources.push(new SupabasePublicationSource({ id: 'us-supabase', scope: 'US', url: env.SUPABASE_URL, publishableKey: env.SUPABASE_PUBLISHABLE_KEY,
      timeoutMs: bounded(env, 'SIMULATION_FETCH_TIMEOUT_MS', 10_000, 100, 120_000), batchTtlMs: bounded(env, 'SIMULATION_BATCH_TTL_SECONDS', 60, 1, 3600) * 1000,
      onError: (source, message) => console.warn(`simulation source ${source} unavailable: ${message}`) }));
  } else if (mode !== 'off') throw new Error('SIMULATION_US_SOURCE must be off, local or supabase');
  return new PublicationStore(sources, { cacheBytes: bounded(env, 'SIMULATION_CACHE_MB', 64, 1, 1024) * 1024 * 1024 });
}

/**
 * Technical reports of the simulations. Deployment configuration only:
 *   REPORT_STORE_DIR                  writable directory where new reports survive a restart (default: process memory)
 *   REPORT_CACHE_MB                   memory budget of reports that are not on disk (default 64)
 *   REPORT_GENERATIONS_PER_MINUTE     new representations per minute for the whole process (default 120; reuse is free)
 * The reports precomputed for the pinned Brazilian publication are always read first.
 */
export function reportServiceFromEnv(env: Env, store: PublicationStore, log?: (event: ReportLogEvent) => void): ReportService {
  const repository = defaultReportRepository({ ...(env.REPORT_STORE_DIR ? { storeDir: resolve(env.REPORT_STORE_DIR) } : {}), cacheBytes: bounded(env, 'REPORT_CACHE_MB', 64, 1, 1024) * 1024 * 1024 });
  return new ReportService(store, { repository, generationsPerMinute: bounded(env, 'REPORT_GENERATIONS_PER_MINUTE', 120, 1, 100_000), ...(log ? { log } : {}) });
}
