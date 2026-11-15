// Simulation publications from several sources through one interface: the pinned Brazilian directory, a local US
// directory and a remote (Supabase Storage + batches table) source. Brazil must survive any US failure.
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validators } from '@gaiapus/contracts';
import { createApp } from '../app.js';
import { LocalPublicationSource, PublicationStore, pinnedBrazilSource } from './simulations/publication-store.js';
import { SupabasePublicationSource, storageKey } from './simulations/supabase-publication-store.js';

const fixture = fileURLToPath(new URL('../../../../packages/contracts/fixtures/us-simulation-v2/', import.meta.url));
const valid = (name: string, body: unknown) => expect(validators[name]!(body), JSON.stringify(validators[name]!.errors?.slice(0, 3))).toBe(true);
const index = JSON.parse(readFileSync(`${fixture}index.json`, 'utf8'));
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');

// A fake of the two HTTP surfaces the remote source uses: PostgREST (active batch) and public Storage objects.
function remote(options: { fail?: boolean; corrupt?: string; batch?: boolean } = {}) {
  const prefix = 'us/v2/us-v2-r2-test';
  const catalog = readFileSync(`${fixture}catalog.json`), idx = readFileSync(`${fixture}index.json`);
  const objects = new Map<string, Buffer>([[`${prefix}/catalog.json`, catalog], [`${prefix}/index.json`, idx]]);
  for (const p of index.publications) for (const a of p.artifacts) objects.set(storageKey(prefix, a), readFileSync(`${fixture}${a.path}`));
  const calls: string[] = [];
  const fetcher = async (input: string | URL) => {
    const url = String(input); calls.push(url);
    if (options.fail) throw new Error('network down');
    if (url.includes('/rest/v1/simulation_publication_batches')) {
      const rows = options.batch === false ? [] : [{ batch_key: 'us-v2-r2-test', scope: 'US', storage_bucket: 'simulation-public', storage_prefix: prefix,
        catalog_sha256: sha(catalog), catalog_bytes: catalog.length, index_sha256: sha(idx), index_bytes: idx.length, manifest_sha256: 'f'.repeat(64) }];
      return new Response(JSON.stringify(rows), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    const key = url.split('/storage/v1/object/public/simulation-public/')[1]!;
    const bytes = objects.get(key);
    if (!bytes) return new Response('not found', { status: 404 });
    const body = options.corrupt && key.endsWith(options.corrupt) ? Buffer.concat([bytes.subarray(0, bytes.length - 1), Buffer.from([bytes[bytes.length - 1]! ^ 1])]) : bytes;
    return new Response(new Uint8Array(body), { status: 200 });
  };
  const source = new SupabasePublicationSource({ id: 'us-remote', scope: 'US', url: 'https://project.example', publishableKey: 'publishable-test-key', fetcher, batchTtlMs: 60_000 });
  return { source, calls };
}
const appWith = (...extra: ConstructorParameters<typeof PublicationStore>[0]) => createApp({ simulations: new PublicationStore([pinnedBrazilSource(), ...extra]) });
const storyRun = (year: number) => index.publications.find((p: any) => p.location_id === 'US:fips:19169' && p.plan_id === 'us_soy' && p.harvest_years[0] === year).run_id;

describe('simulation publication sources', () => {
  it('serves Brazil and a local US directory together, with yield-only capabilities and one run per harvest year', async () => {
    const app = appWith(new LocalPublicationSource('us-local', fixture));
    const all = (await app.inject('/v1/simulations/regional')).json();
    valid('SimulationPublicationListResponse', all);
    expect(all.data.items.length).toBe(7 + 5);
    const caps = (await app.inject('/v1/simulations/capabilities?location_id=US:fips:19169&crop_id=soy')).json();
    valid('SimulationCatalogResponse', caps);
    expect(caps.data.places.map((p: any) => p.location_id)).toEqual(['US:fips:19169']);
    const byYear = Object.fromEntries(caps.data.places[0].capabilities.map((c: any) => [c.harvest_year, c]));
    expect([byYear[2026].status, byYear[2026].reason_code, byYear[2026].run_ids.length]).toEqual(['missing_data', 'post_harvest_no_daily_series', 0]);
    expect(byYear[2026].yield_result.position_vs_season).toBe('post_harvest_pre_release');
    expect([byYear[2027].run_ids, byYear[2028].run_ids]).toEqual([[storyRun(2027)], [storyRun(2028)]]);
    expect(caps.data.source_status).toEqual([{ source: 'pinned-br', status: 'ok' }, { source: 'us-local', status: 'ok' }]);
    const y2028 = (await app.inject('/v1/simulations/regional?location_id=US:fips:19169&crop_id=soy&harvest_year=2028')).json().data.items;
    expect(y2028.map((p: any) => p.run_id)).toEqual([storyRun(2028)]);
    const run = await app.inject(`/v1/simulations/${storyRun(2027)}`);
    valid('SimulationRunResponse', run.json());
    const series = (await app.inject(`/v1/simulations/${storyRun(2027)}/series`)).json();
    valid('SimulationSeriesResponse', series);
    expect(series.data.members.map((m: any) => m.role)).toEqual(['central', 'dry', 'wet']);
    expect((await app.inject('/v1/simulations/regional?location_id=US:fips:19169&harvest_year=2031')).json().data.items).toEqual([]);
    expect((await app.inject('/v1/simulations/capabilities?location_id=BR:ibge:5107925')).json().data.places.length).toBe(1);
    await app.close();
  });

  it('reads the active remote batch, verifies every object and downloads a series once for concurrent requests', async () => {
    const { source, calls } = remote();
    const app = appWith(source);
    const id = storyRun(2028);
    const responses = await Promise.all([1, 2, 3, 4, 5].map(() => app.inject(`/v1/simulations/${id}/series`)));
    expect(responses.map(r => r.statusCode)).toEqual([200, 200, 200, 200, 200]);
    expect(calls.filter(u => u.endsWith('/series.json.gz')).length).toBe(1);
    expect(calls.filter(u => u.includes('/rest/v1/')).length).toBe(1);
    await app.inject(`/v1/simulations/${id}/series`);
    expect(calls.filter(u => u.endsWith('/series.json.gz')).length).toBe(1);
    expect(calls.every(u => !u.includes('service') && !u.includes('secret'))).toBe(true);
    expect((await app.inject('/v1/simulations/regional')).json().data.items.length).toBe(12);
    await app.close();
  });

  it('keeps Brazil fully available and reports the US source as unavailable when Storage is down', async () => {
    const app = appWith(remote({ fail: true }).source);
    const caps = await app.inject('/v1/simulations/capabilities');
    expect(caps.statusCode).toBe(200);
    valid('SimulationCatalogResponse', caps.json());
    expect(caps.json().data.places.every((p: any) => p.location_id.startsWith('BR:'))).toBe(true);
    expect(caps.json().data.source_status).toEqual([{ source: 'pinned-br', status: 'ok' }, { source: 'us-remote', status: 'unavailable' }]);
    expect(caps.headers['cache-control']).toContain('no-store');
    expect((await app.inject('/v1/simulations/regional')).json().data.items.length).toBe(7);
    const br = (await app.inject('/v1/simulations/regional?location_id=BR:ibge:5107925&crop_id=soy')).json().data.items[0].run_id;
    expect((await app.inject(`/v1/simulations/${br}/series`)).statusCode).toBe(200);
    const us = await app.inject(`/v1/simulations/${storyRun(2027)}`);
    expect([us.statusCode, us.json().error.code]).toEqual([503, 'simulation_source_unavailable']);
    expect(JSON.stringify(us.json())).not.toContain('publishable-test-key');
    await app.close();
  });

  it('a scope without an active batch is simply empty, not an error', async () => {
    const app = appWith(remote({ batch: false }).source);
    const caps = (await app.inject('/v1/simulations/capabilities')).json();
    expect(caps.data.source_status[1]).toEqual({ source: 'us-remote', status: 'ok' });
    expect((await app.inject('/v1/simulations/regional')).json().data.items.length).toBe(7);
    expect((await app.inject(`/v1/simulations/${storyRun(2027)}`)).statusCode).toBe(404);
    await app.close();
  });

  it('refuses a corrupted artifact and does not cache it', async () => {
    const { source, calls } = remote({ corrupt: 'series.json.gz' });
    const app = appWith(source);
    const first = await app.inject(`/v1/simulations/${storyRun(2027)}/series`);
    expect([first.statusCode, first.json().error.code]).toEqual([500, 'internal_error']);
    await app.inject(`/v1/simulations/${storyRun(2027)}/series`);
    expect(calls.filter(u => u.endsWith('/series.json.gz')).length).toBe(2);
    expect((await app.inject(`/v1/simulations/${storyRun(2027)}`)).statusCode).toBe(200);
    await app.close();
  });

  it('bounds memory: the cache evicts by bytes and a series larger than the limit is refused', async () => {
    const roomy = new PublicationStore([new LocalPublicationSource('us-local', fixture)]);
    for (const p of index.publications) await roomy.series(p.run_id);
    expect(roomy.cacheStats().entries).toBe(2 * index.publications.length); // run + series per publication
    const limit = Math.floor(roomy.cacheStats().bytes / 2);
    const store = new PublicationStore([new LocalPublicationSource('us-local', fixture)], { cacheBytes: limit, maxInflatedBytes: 50_000_000 });
    for (const p of index.publications) await store.series(p.run_id);
    expect(store.cacheStats().bytes).toBeLessThanOrEqual(limit);
    expect(store.cacheStats().entries).toBeLessThan(2 * index.publications.length);
    expect((await store.series(index.publications[0].run_id)).run_id).toBe(index.publications[0].run_id); // evicted entries reload
    const tiny = new PublicationStore([new LocalPublicationSource('us-local', fixture)], { cacheBytes: 1_000_000, maxInflatedBytes: 1000 });
    await expect(tiny.series(index.publications[0].run_id)).rejects.toMatchObject({ status: 500 });
  });

  it('when two sources publish the same place, the first source wins and the conflict is reported', async () => {
    const store = new PublicationStore([new LocalPublicationSource('first', fixture), new LocalPublicationSource('second', fixture)]);
    const catalog = await store.catalog();
    expect(catalog.places.length).toBe(2);
    expect(catalog.source_status).toEqual([{ source: 'first', status: 'ok' }, { source: 'second', status: 'ok', shadowed_places: 2 }]);
    expect((await store.publications()).items.length).toBe(5);
  });
});
