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
