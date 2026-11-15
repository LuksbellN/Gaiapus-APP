// Environment configuration of simulation publication sources: Brazil only by default, US opt-in, invalid values fail at startup.
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { simulationStoreFromEnv } from './simulations/config.js';

const fixture = fileURLToPath(new URL('../../../../packages/contracts/fixtures/us-simulation-v2/', import.meta.url));
describe('simulation source configuration', () => {
  it('serves only the pinned Brazilian publication by default', async () => {
    const catalog = await simulationStoreFromEnv({}).catalog();
    expect(catalog.places.every(p => p.location_id.startsWith('BR:'))).toBe(true);
    expect('source_status' in catalog).toBe(false);
  });
  it('adds a local US directory when asked', async () => {
    const catalog = await simulationStoreFromEnv({ SIMULATION_US_SOURCE: 'local', SIMULATION_US_LOCAL_DIR: fixture }).catalog({ location_id: 'US:fips:20191' });
    expect(catalog.places.map(p => p.location_id)).toEqual(['US:fips:20191']);
  });
  it('rejects incomplete or invalid configuration instead of starting half-configured', () => {
    expect(() => simulationStoreFromEnv({ SIMULATION_US_SOURCE: 'local' })).toThrow(/SIMULATION_US_LOCAL_DIR/);
    expect(() => simulationStoreFromEnv({ SIMULATION_US_SOURCE: 'local', SIMULATION_US_LOCAL_DIR: fileURLToPath(new URL('.', import.meta.url)) })).toThrow(/index\.json/);
    expect(() => simulationStoreFromEnv({ SIMULATION_US_SOURCE: 'supabase' })).toThrow(/SUPABASE_URL/);
    expect(() => simulationStoreFromEnv({ SIMULATION_US_SOURCE: 'remote' })).toThrow(/off, local or supabase/);
    expect(() => simulationStoreFromEnv({ SIMULATION_CACHE_MB: '0' })).toThrow(/SIMULATION_CACHE_MB/);
    expect(() => simulationStoreFromEnv({ SIMULATION_US_SOURCE: 'supabase', SUPABASE_URL: 'https://x.example', SUPABASE_PUBLISHABLE_KEY: 'k', SIMULATION_FETCH_TIMEOUT_MS: 'fast' })).toThrow(/SIMULATION_FETCH_TIMEOUT_MS/);
  });
});
