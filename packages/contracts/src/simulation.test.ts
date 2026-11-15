// Pinned regional future-planning publications validate against the contracts and their own checksums.
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { validators } from './index.js';

const root = new URL('../../../apps/api/public/publications/future-simulation-v1/', import.meta.url);
const read = (p: string) => readFileSync(new URL(p, root));
const index = JSON.parse(read('index.json').toString('utf8'));
const catalog = JSON.parse(read('catalog.json').toString('utf8'));
const check = (name: string, value: unknown) => expect(validators[name]!(value), `${name}: ${JSON.stringify(validators[name]!.errors?.slice(0, 3))}`).toBe(true);

describe('pinned future-simulation publications', () => {
  it('catalog and every publication validate', () => {
    check('SimulationCatalog', catalog);
    expect(index.publications.length).toBeGreaterThan(0);
    for (const p of index.publications) check('SimulationPublication', p);
  });
  it('every artifact matches its sha256 and byte length, and each run validates', () => {
    for (const p of index.publications) {
      for (const a of p.artifacts) {
        const bytes = read(a.path);
        expect(createHash('sha256').update(bytes).digest('hex'), a.path).toBe(a.sha256);
        expect(bytes.length).toBe(a.bytes);
      }
      const run = JSON.parse(read(p.artifacts.find((a: any) => a.kind === 'run').path).toString('utf8'));
      check('SimulationRun', run);
      expect(run.run_id).toBe(p.run_id);
      const series = JSON.parse(gunzipSync(read(p.artifacts.find((a: any) => a.kind === 'series').path)).toString('utf8'));
      expect(createHash('sha256').update(JSON.stringify(series)).digest('hex').length).toBe(64);
      expect(series.members.length).toBe(run.ensemble.members);
    }
  });
  it('covers 2027 and 2028 with honest statuses, no Sorriso data elsewhere', () => {
    for (const place of catalog.places) for (const c of place.capabilities) {
      if (c.status === 'ready') expect(c.run_ids.length).toBeGreaterThan(0);
      else expect(c.reason_code).toBeTruthy();
    }
    for (const p of index.publications) {
      const run = JSON.parse(read(`runs/${p.run_id}/run.json`).toString('utf8'));
      expect(run.location_id).toBe(p.location_id);
      expect(run.harvest_years).toEqual([2027, 2028]);
      expect(run.output_mode).toBe('simulation_conditional_on_historical_weather');
      expect(run.weather_segments.at(-1).kind).toBe('climatological_scenario');
    }
  });
});
