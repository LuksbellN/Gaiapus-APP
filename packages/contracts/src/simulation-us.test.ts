// US v2 publication subset (Story IA, Sumner KS; Gaiapus_nasa us_v2_publish revision 2) against the shared simulation contracts:
// nullable per-run measurements, yield-only capabilities (2026 post-harvest, KS 2027 in season) and FIPS identities.
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { validators } from './index.js';

const root = new URL('../fixtures/us-simulation-v2/', import.meta.url);
const read = (p: string) => readFileSync(new URL(p, root));
const index = JSON.parse(read('index.json').toString('utf8'));
const catalog = JSON.parse(read('catalog.json').toString('utf8'));
const check = (name: string, value: unknown) => expect(validators[name]!(value), `${name}: ${JSON.stringify(validators[name]!.errors?.slice(0, 3))}`).toBe(true);
const capability = (location: string, crop: string, year: number) =>
  catalog.places.find((p: any) => p.location_id === location).capabilities.find((c: any) => c.crop_id === crop && c.harvest_year === year);

describe('US v2 simulation publication subset', () => {
  it('catalog, publications, runs and series checksums validate', () => {
    check('SimulationCatalog', catalog);
    expect(index.publications.length).toBe(5);
    for (const p of index.publications) {
      check('SimulationPublication', p);
      for (const a of p.artifacts) {
        const bytes = read(a.path);
        expect(createHash('sha256').update(bytes).digest('hex'), a.path).toBe(a.sha256);
        expect(bytes.length).toBe(a.bytes);
      }
      const run = JSON.parse(read(`runs/${p.run_id}/run.json`).toString('utf8'));
      check('SimulationRun', run);
      expect([run.run_id, run.location_id, run.harvest_years]).toEqual([p.run_id, p.location_id, p.harvest_years]);
      expect(Date.parse(run.as_of)).toBeLessThanOrEqual(Date.parse(run.issued_at));
      const series = JSON.parse(gunzipSync(read(`runs/${p.run_id}/series.json.gz`)).toString('utf8'));
      expect(series.members.length).toBe(run.ensemble.members);
    }
  });

  it('per-run time and memory were not measured: null, never zero', () => {
    for (const p of index.publications) {
      expect([p.measured.seconds, p.measured.peak_python_mib]).toEqual([null, null]);
      expect(p.measured.series_bytes_raw).toBeGreaterThan(p.measured.series_bytes_gzip);
    }
    const sample = structuredClone(index.publications[0]);
    sample.measured.seconds = 12.5; sample.measured.peak_python_mib = 300;
    check('SimulationPublication', sample);
    sample.measured.seconds = -1;
    expect(validators.SimulationPublication!(sample)).toBe(false);
  });

  it('2026 is a post-harvest yield result without a daily series or a fabricated run', () => {
    const c = capability('US:fips:19169', 'soy', 2026);
    expect([c.status, c.reason_code, c.run_ids]).toEqual(['missing_data', 'post_harvest_no_daily_series', []]);
    expect(c.yield_result.position_vs_season).toBe('post_harvest_pre_release');
    expect(c.yield_result.scenario_range).toBeNull();
    expect(c.yield_result.conditional_on_scenario).toBe(false);
    expect(c.yield_result.value_kg_ha).toBeGreaterThan(0);
    expect(c.yield_result.exposure_flags).toContain('IA_2025_partial_snippet_exposure');
  });

  it('Kansas winter wheat 2027 has an in-season yield but no daily balance (no observed ET0); 2028 has the series', () => {
    const k27 = capability('US:fips:20191', 'wheat_winter', 2027);
    expect([k27.status, k27.reason_code, k27.run_ids]).toEqual(['missing_data', 'source_unavailable', []]);
    expect(k27.yield_result.position_vs_season).toBe('in_season_partial');
    expect(k27.yield_result.scenario_range.method).toBe('ensemble_spread_uncalibrated');
    const k28 = capability('US:fips:20191', 'wheat_winter', 2028);
    expect(k28.status).toBe('ready');
    expect(k28.run_ids.length).toBe(1);
  });

  it('2027 and 2028 of the same place and plan are distinct runs', () => {
    const story = index.publications.filter((p: any) => p.location_id === 'US:fips:19169' && p.plan_id === 'us_soy');
    expect(story.map((p: any) => p.harvest_years).sort()).toEqual([[2027], [2028]]);
    expect(new Set(story.map((p: any) => p.run_id)).size).toBe(2);
  });

  it('FIPS identities keep leading zeros and never become numbers or Brazilian ids', () => {
    check('SimulationQuery', { location_id: 'US:fips:01001', crop_id: 'soy', harvest_year: '2027' });
    expect(validators.SimulationQuery!({ location_id: 'US:fips:1001' })).toBe(false);
    expect(validators.SimulationQuery!({ location_id: 'BR:ibge:19169' })).toBe(false);
  });

  it('a yield result is optional and must follow the yield contract when present', () => {
    const place = structuredClone(catalog.places[0]);
    place.capabilities[0].yield_result = { status: 'research', value_kg_ha: 1 };
    expect(validators.SimulationCatalog!({ ...catalog, places: [place] })).toBe(false);
  });
});
