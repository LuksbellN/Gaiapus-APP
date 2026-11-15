// Field Shift v2: the pinned package is one unit (manifest + summary + series) and the screen only rearranges published numbers.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildComparison, checkPackage, METRICS, STRATEGIES, type FieldShiftSeries, type FieldShiftSummary, type PackageManifest } from './field-shift-decision';

const DIR = join(process.cwd(), 'src', 'teammate', 'data', 'field-shift-v2');
const bytes = (name: string) => readFileSync(join(DIR, name));
const manifest = JSON.parse(bytes('manifest.json').toString('utf8')) as PackageManifest;
const summary = JSON.parse(bytes('summary.json').toString('utf8')) as FieldShiftSummary;
const series = JSON.parse(bytes('series.json').toString('utf8')) as FieldShiftSeries;

describe('pinned Field Shift v2 package', () => {
  it('has the bytes its manifest names', () => {
    for (const name of ['summary.json', 'series.json']) {
      expect(createHash('sha256').update(bytes(name)).digest('hex'), name).toBe(manifest.files[name].sha256);
      expect(bytes(name).length, name).toBe(manifest.files[name].bytes);
    }
  });
  it('reproduced the published A and B of v1 value for value when it was generated', () => {
    for (const s of ['reference_fallow', 'brachiaria'] as const) expect(manifest.reproduction_v1?.[s]).toMatchObject({ by_year_identical: true, daily_identical: true, years: 6 });
  });
  it('is accepted as one package', () => {
    expect(checkPackage(manifest, summary, series)).toBe(manifest.package_id);
    expect(manifest.package_id).toMatch(/^field-shift-v2-[0-9a-f]{12}$/);
  });
  it('refuses a summary and a series of different packages, and the v1 daily file', () => {
    expect(() => checkPackage(manifest, summary, { ...series, package_id: 'field-shift-v2-000000000000' })).toThrow(/field_shift_package_mismatch/);
    expect(() => checkPackage(manifest, { ...summary, package_id: 'field-shift-v2-000000000000' }, series)).toThrow(/field_shift_package_mismatch/);
    const v1Daily = { capacity_mm: 55, source: 'v7', scenarios: { reference_fallow: series.scenarios.reference_fallow, brachiaria: series.scenarios.brachiaria } };
    expect(() => checkPackage(manifest, summary, v1Daily as unknown as FieldShiftSeries)).toThrow(/field_shift_package_mismatch/);
    expect(() => checkPackage(manifest, { ...summary, schema_version: '1.0.0' } as unknown as FieldShiftSummary, series)).toThrow(/field_shift_package_mismatch/);
    const shorter = { ...series, scenarios: { ...series.scenarios, soy_long_fallow: { ...series.scenarios.soy_long_fallow, date: series.scenarios.soy_long_fallow.date.slice(1) } } };
    expect(() => checkPackage(manifest, summary, shorter)).toThrow(/field_shift_package_mismatch/);
  });
  it('never has a maize number for the strategy without maize', () => {
    const c = summary.scenarios.soy_long_fallow;
    expect(c.mean.maize_deficit_mm).toBeNull(); expect(c.mean.maize_stress_days).toBeNull();
    for (const y of c.by_year) { expect(y.maize_status).toBe('not_grown'); expect(y.maize_deficit_mm).toBeNull(); }
    for (const p of summary.sensitivity.rain.points) expect(p.scenarios.soy_long_fallow.mean.maize_deficit_mm).toBeNull();
  });
});

const z = (v: number | null) => (v == null ? v : v + 0); // the producer writes -0.0 for a rounded tiny negative; it is zero
describe('comparison against a chosen reference', () => {
  it('with the reference of the publication, equals the published paired differences (base and every rain point)', () => {
    for (const input of [summary, ...summary.sensitivity.rain.points]) {
      const view = buildComparison(input, 'reference_fallow');
      for (const alt of ['brachiaria', 'soy_long_fallow'] as const) {
        const published = input.comparisons[`${alt}_minus_reference_fallow`];
        for (const metric of METRICS) {
          const mine = view.rows.find((r) => r.metric === metric)!.deltas[alt]!;
          expect({ n: mine.n, mean: mine.mean, min: mine.min, max: mine.max, status: mine.status }, `${alt} ${metric}`)
            .toEqual({ n: published[metric].n, mean: z(published[metric].mean), min: z(published[metric].min), max: z(published[metric].max), status: published[metric].status });
        }
      }
    }
  });
  it('changing the reference changes only the differences, never the values', () => {
    const a = buildComparison(summary, 'reference_fallow'), b = buildComparison(summary, 'brachiaria'), c = buildComparison(summary, 'soy_long_fallow');
    for (const view of [b, c]) expect(view.rows.map((r) => r.values)).toEqual(a.rows.map((r) => r.values));
    expect(b.reference).toBe('brachiaria');
    const covered = (v: typeof a, s: (typeof STRATEGIES)[number]) => v.rows.find((r) => r.metric === 'covered_days')!.deltas[s];
    expect(covered(b, 'brachiaria')).toBeNull(); // no difference against itself
    expect(covered(b, 'reference_fallow')!.mean).toBeCloseTo(-covered(a, 'brachiaria')!.mean!, 2);
    expect(covered(c, 'reference_fallow')!.mean).toBeCloseTo(-covered(a, 'soy_long_fallow')!.mean!, 2);
  });
  it('absent maize is "not grown": no value, no difference, never a zero that wins', () => {
    for (const ref of STRATEGIES) {
      const view = buildComparison(summary, ref);
      for (const metric of ['maize_deficit_mm', 'maize_stress_days'] as const) {
        const row = view.rows.find((r) => r.metric === metric)!;
        expect(row.values.soy_long_fallow).toBeNull();
        expect(row.status.soy_long_fallow).toBe('not_grown');
        expect(row.status.reference_fallow).toBe('ok');
        if (ref === 'soy_long_fallow') { expect(row.deltas.reference_fallow).toMatchObject({ n: 0, mean: null, status: 'not_applicable' }); expect(row.deltas.brachiaria).toMatchObject({ n: 0, mean: null }); }
        else expect(row.deltas.soy_long_fallow).toMatchObject({ n: 0, mean: null, status: 'not_applicable' });
      }
    }
  });
  it('pairs only the years both strategies have', () => {
    const cut = { ...summary, scenarios: { ...summary.scenarios, brachiaria: { ...summary.scenarios.brachiaria, by_year: summary.scenarios.brachiaria.by_year.slice(0, 4), valid_years: 4 } } };
    const row = buildComparison(cut, 'reference_fallow').rows.find((r) => r.metric === 'covered_days')!;
    expect(row.deltas.brachiaria).toMatchObject({ n: 4, years: summary.weather.agricultural_years.slice(0, 4) });
    expect(row.deltas.soy_long_fallow!.n).toBe(6);
  });
});

import { GROUPS, orderGroups, orderIndicators, resolvePriority } from './field-shift-decision';
describe('producer priority', () => {
  it('reorders the same indicators and never drops or adds one', () => {
    const base = [...orderIndicators('conservacao')].sort();
    for (const p of ['margem', 'producao', 'conservacao'] as const) expect([...orderIndicators(p)].sort()).toEqual(base);
    expect(orderIndicators('conservacao').slice(0, 2)).toEqual(GROUPS.cover);
    expect(orderIndicators('producao').slice(0, 3)).toEqual(GROUPS.soy);
    expect(orderIndicators('margem').slice(0, 2)).toEqual(GROUPS.maize);
    expect(orderGroups('producao')[0]).toBe('soy');
    for (const p of ['margem', 'producao', 'conservacao'] as const) expect(orderGroups(p).at(-1)).toBe('own'); // windows of different length are never the headline
  });
  it('comes from the explicit choice, else from the plan named in the address, else the visible default', () => {
    const plans = [{ id: 'plano_a', createdAt: '2026-11-10T12:00:00Z', data: { prioridade: 'producao' } }, { id: 'plano_b', createdAt: '2026-11-12T12:00:00Z', data: { prioridade: 'margem' } }];
    expect(resolvePriority({ choice: null, planId: null, plans })).toEqual({ priority: 'conservacao', source: 'default', plan: null }); // never the latest plan silently
    expect(resolvePriority({ choice: null, planId: 'plano_a', plans })).toMatchObject({ priority: 'producao', source: 'plan', plan: { id: 'plano_a' } });
    expect(resolvePriority({ choice: 'margem', planId: 'plano_a', plans })).toMatchObject({ priority: 'margem', source: 'choice' });
    expect(resolvePriority({ choice: null, planId: 'plano_de_outra_conta', plans })).toEqual({ priority: 'conservacao', source: 'plan_missing', plan: null });
    expect(resolvePriority({ choice: 'lucro', planId: null, plans })).toMatchObject({ priority: 'conservacao', source: 'default' });
    expect(resolvePriority({ choice: null, planId: 'plano_x', plans: [{ id: 'plano_x', createdAt: '2026-11-10T12:00:00Z', data: { prioridade: 'qualquer' } }] })).toMatchObject({ priority: 'conservacao', source: 'default' });
  });
});
