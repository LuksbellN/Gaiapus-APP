import { describe, expect, it } from 'vitest';
import { cycleDay, dayInfo, memberRows, seasonIndex, type PlanningRun, type PlanningSeries } from './planning-model';

const dates = ['2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'];
const member = (id: string, role: 'central' | 'dry' | 'wet', storage: number[]) => ({
  member_id: id, analog_year: 2010, role, crop_id: [null, 'soy', 'soy', 'soy', null], phase_code: ['fallow', 'establishment', 'establishment', 'vegetative', 'fallow'],
  precipitation_mm: [0, 5, 0, 12, 1], et0_mm: [5, 5, 5, 5, 5], etc_mm: [1.5, 2, 2, 3, 1.5], eta_mm: [1, 2, 2, 3, 1], et_deficit_mm: [0.5, 0, 0, 0, 0.5],
  storage_mm: storage, drainage_mm: [0, 0, 0, 0, 0], stress_coefficient: [0.4, 1, 1, 1, 0.5], mass_balance_residual_mm: [0, 0, 0, 0, 0],
});
const series: PlanningSeries = {
  run_id: 'sim_aaaaaaaaaaaaaaaaaaaaaaaa', dates, capacity_mm: 55, day_kind: ['observed', 'climatological_scenario', 'climatological_scenario', 'climatological_scenario', 'climatological_scenario'],
  members: [member('a2010', 'central', [10, 14, 13, 22, 21]), member('a2003', 'dry', [8, 9, 8, 10, 9]), member('a2015', 'wet', [20, 30, 29, 40, 39])],
  bands: { storage_mm: { p10: [8, 9, 8, 10, 9], p50: [10, 14, 13, 22, 21], p90: [20, 30, 29, 40, 39] }, precipitation_mm: { p10: [0, 0, 0, 0, 0], p50: [0, 5, 0, 12, 1], p90: [1, 9, 3, 20, 4] }, et_deficit_mm: { p10: [0, 0, 0, 0, 0], p50: [0.5, 0, 0, 0, 0.5], p90: [1, 1, 1, 1, 1] } },
  full_members_artifact: { kind: 'series', path: 'runs/x/series.json.gz', sha256: 'a'.repeat(64), bytes: 1, compression: 'gzip' },
};
const run = { seasons: [{ crop_id: 'soy', harvest_year: 2027, sowing_date: '2026-10-01', expected_harvest_date: '2027-01-23', cycle_days: 115 }] } as unknown as PlanningRun;

describe('planning-model', () => {
  it('maps a member to canonical scene rows without inventing fields', () => {
    const rows = memberRows(series, 'dry');
    expect(rows).toHaveLength(5);
    expect(rows[1]).toMatchObject({ date: '2026-10-01', land_cover: 'soy', phase_code: 'establishment', storage_mm: 9, capacity_mm: 55, precipitation_mm: 5, root_depth_m: null, runoff_mm: null, irrigation_net_mm: 0 });
    expect(rows[0]).toMatchObject({ land_cover: 'bare', phase_code: 'off_season_bare' }); // fallow day
    expect(rows[0].available_water_fraction).toBeCloseTo(8 / 55, 12);
  });
  it('switching the climate member changes every value of the same day consistently', () => {
    const c = memberRows(series, 'central')[3], w = memberRows(series, 'wet')[3];
    expect(c.date).toBe(w.date);
    expect([c.storage_mm, w.storage_mm]).toEqual([22, 40]);
  });
  it('locates the season and the day of the crop cycle (not the day of the simulation)', () => {
    expect(seasonIndex(series, run, 'soy', 2027)).toEqual({ start: 1, end: 4 });
    expect(cycleDay(run, 'soy', 2027, '2026-10-03')).toEqual({ day: 3, of: 115 });
    expect(cycleDay(run, 'soy', 2027, '2026-09-30')).toBeNull();
  });
  it('labels each day with its weather origin and simulation day', () => {
    expect(dayInfo(series, 0)).toEqual({ kind: 'observed', simDay: 1, simDays: 5 });
    expect(dayInfo(series, 3)).toEqual({ kind: 'climatological_scenario', simDay: 4, simDays: 5 });
  });
});

// One publication per place × plan × harvest year (US) next to publications that group years (Brazil).
import { coverageOf, selectPublication } from './planning-model';
describe('publication selection and coverage per product', () => {
  const pub = (run_id: string, crops: string[], harvest_years: number[]) => ({ run_id, crops, harvest_years }) as any;
  const us = [pub('sim_27', ['soy'], [2027]), pub('sim_28', ['soy'], [2028]), pub('sim_m28', ['maize'], [2028])];
  const br = [pub('sim_rot', ['soy', 'maize2'], [2027, 2028]), pub('sim_soy', ['soy'], [2027, 2028])];
  it('picks the run of the requested harvest year, never another year of the same place', () => {
    expect(selectPublication(us, 'soy', 2027)?.run_id).toBe('sim_27');
    expect(selectPublication(us, 'soy', 2028)?.run_id).toBe('sim_28');
    expect(selectPublication(us, 'maize', 2027)).toBeNull();
    expect(selectPublication([], 'soy', 2027)).toBeNull();
  });
  it('keeps the Brazilian rule: the plan whose last crop is the requested one, for either year', () => {
    expect(selectPublication(br, 'maize2', 2028)?.run_id).toBe('sim_rot');
    expect(selectPublication(br, 'soy', 2027)?.run_id).toBe('sim_soy');
  });
  it('separates the daily series from the yield result', () => {
    const y = { status: 'research', value_kg_ha: 4385, position_vs_season: 'post_harvest_pre_release' } as any;
    expect(coverageOf({ crop_id: 'soy', harvest_year: 2028, status: 'ready', reason_code: null, run_ids: ['sim_28'] } as any)).toEqual({ state: 'daily_series', dailySeries: true, yieldResult: null, reason: null });
    expect(coverageOf({ crop_id: 'soy', harvest_year: 2026, status: 'missing_data', reason_code: 'post_harvest_no_daily_series', run_ids: [], yield_result: y } as any))
      .toEqual({ state: 'yield_only', dailySeries: false, yieldResult: y, reason: 'post_harvest_no_daily_series' });
    expect(coverageOf({ crop_id: 'coffee', harvest_year: 2027, status: 'unsupported', reason_code: 'perennial_engine_missing', run_ids: [] } as any))
      .toEqual({ state: 'unavailable', dailySeries: false, yieldResult: null, reason: 'perennial_engine_missing' });
    expect(coverageOf(undefined)).toEqual({ state: 'not_published', dailySeries: false, yieldResult: null, reason: null });
  });
});

import { hasPlanningResult, planningHref, planningPlaceId } from './planning-model';
describe('planning links and place of the screen', () => {
  const q = (s: string) => new URLSearchParams(s);
  it('reads the place from ?local=, from the older ?mun=, and falls back to the default place', () => {
    expect(planningPlaceId(q('local=US:fips:19169'))).toBe('US:fips:19169');
    expect(planningPlaceId(q('mun=3170206'))).toBe('BR:ibge:3170206');
    expect(planningPlaceId(q('local=US:fips:19169&mun=3170206'))).toBe('US:fips:19169');
    expect(planningPlaceId(q('local=XX:foo:1'))).toBe('BR:ibge:5107925');
    expect(planningPlaceId(q('mun=123'))).toBe('BR:ibge:5107925');
  });
  it('builds the same link for every "simulate here" action, keeping codes with leading zeros', () => {
    expect(planningHref('US:fips:01001', 'soy')).toBe('#/simulador?modo=planejamento&local=US:fips:01001&cultura=soy');
    expect(planningHref('BR:ibge:3170206')).toBe('#/simulador?modo=planejamento&local=BR:ibge:3170206');
    expect(planningPlaceId(q(planningHref('US:fips:01001').split('?')[1]!))).toBe('US:fips:01001');
  });
  it('a place can be simulated when it has a daily simulation or a yield result', () => {
    const cap = (status: string, extra: object = {}) => ({ status, reason_code: null, run_ids: [] as string[], ...extra });
    expect(hasPlanningResult([cap('unsupported'), cap('ready', { run_ids: ['sim_x'] })])).toBe(true);
    expect(hasPlanningResult([cap('missing_data', { yield_result: { status: 'research' } })])).toBe(true);
    expect(hasPlanningResult([cap('unsupported')])).toBe(false);
    expect(hasPlanningResult(undefined)).toBe(false);
  });
});

// Water satisfaction of a crop season: per climate member, water used ÷ water needed; the members are summarised afterwards.
import { comparableRuns, highestSatisfaction, waterSatisfaction } from './planning-model';
describe('water satisfaction per member, then summarised', () => {
  const season = (members: Record<string, Record<string, number | null>>) => ({ members }) as any;
  it('is the median of the member ratios, not the ratio of the medians', () => {
    const s = season({ a: { crop_eta_mm: 10, crop_deficit_mm: 90 }, b: { crop_eta_mm: 80, crop_deficit_mm: 20 }, c: { crop_eta_mm: 60, crop_deficit_mm: 10 } });
    const r = waterSatisfaction(s);
    expect(r?.value).toBeCloseTo(0.8, 12);
    expect(r?.value).not.toBeCloseTo(0.75, 6); // p50(ETa) / (p50(ETa) + p50(deficit)) = 60 / 80
    expect(r?.members).toBe(3);
  });
  it('uses the published crop need (ETc) when the run has it', () => {
    expect(waterSatisfaction(season({ a: { crop_eta_mm: 30, crop_etc_mm: 60, crop_deficit_mm: 30 }, b: { crop_eta_mm: 50, crop_etc_mm: 50, crop_deficit_mm: 0 } }))?.value).toBeCloseTo(0.75, 12);
  });
  it('is not calculated when a member has no need, a missing value or a non-finite value: absence is not zero', () => {
    expect(waterSatisfaction(season({ a: { crop_eta_mm: 0, crop_etc_mm: 0 }, b: { crop_eta_mm: 5, crop_etc_mm: 10 } }))).toBeNull();
    expect(waterSatisfaction(season({ a: { crop_eta_mm: 5 }, b: { crop_eta_mm: 5, crop_etc_mm: 10 } }))).toBeNull();
    expect(waterSatisfaction(season({ a: { crop_eta_mm: Number.NaN, crop_etc_mm: 10 } }))).toBeNull();
    expect(waterSatisfaction(season({ a: { crop_eta_mm: null, crop_deficit_mm: 4 } }))).toBeNull();
    expect(waterSatisfaction(season({ a: { crop_eta_mm: -1, crop_etc_mm: 10 } }))).toBeNull();
    expect(waterSatisfaction(season({}))).toBeNull();
    expect(waterSatisfaction(null)).toBeNull();
    expect(waterSatisfaction({} as any)).toBeNull();
  });
  it('marks the highest value only when it is alone at the displayed precision', () => {
    expect(highestSatisfaction([{ id: 'soy', supply: 0.71 }, { id: 'maize', supply: 0.64 }])).toBe('soy');
    expect(highestSatisfaction([{ id: 'soy', supply: 0.712 }, { id: 'maize', supply: 0.708 }])).toBeNull(); // both read 71%
    expect(highestSatisfaction([{ id: 'soy', supply: null }, { id: 'maize', supply: 0.64 }])).toBeNull(); // nothing to compare with
    expect(highestSatisfaction([{ id: 'soy', supply: null }, { id: 'maize', supply: 0.64 }, { id: 'wheat', supply: 0.5 }])).toBe('maize');
    expect(highestSatisfaction([])).toBeNull();
  });
  it('compares only runs of the same place, soil and climate ensemble', () => {
    const r = (o: object = {}) => ({ location_id: 'US:fips:19169', soil: { profile_id: 'p', capacity_mm: 120 }, ensemble: { analog_years: [2000, 2001] }, ...o }) as any;
    expect(comparableRuns(r(), r())).toBe(true);
    expect(comparableRuns(r(), r({ location_id: 'US:fips:20191' }))).toBe(false);
    expect(comparableRuns(r(), r({ soil: { profile_id: 'p', capacity_mm: 90 } }))).toBe(false);
    expect(comparableRuns(r(), r({ ensemble: { analog_years: [2000, 2002] } }))).toBe(false);
  });
});
