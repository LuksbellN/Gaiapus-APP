// Future-planning run (2027/2028) → the same canonical daily rows used by the charts, the panel and the scenes.
// Identity of a displayed day = run_id + member + date: every view reads the same row.
import type { SimulationRun, SimulationSeries } from '@gaiapus/contracts';
import type { SceneDailyRow } from './scene-adapter';

export type PlanningRun = SimulationRun;
export type PlanningSeries = SimulationSeries;
export type MemberRole = 'central' | 'dry' | 'wet';

export function memberOf(series: PlanningSeries, role: MemberRole) {
  return series.members.find((m) => m.role === role) ?? series.members[0];
}

/** Engine rows of one member, value for value. Fallow days are bare soil; the engine has no root depth (null). */
export function memberRows(series: PlanningSeries, role: MemberRole): SceneDailyRow[] {
  const m = memberOf(series, role); const cap = series.capacity_mm;
  return series.dates.map((date, i) => {
    const crop = m.crop_id[i];
    return {
      date, land_cover: crop ?? 'bare', phase_code: crop ? m.phase_code[i] : 'off_season_bare', precipitation_mm: m.precipitation_mm[i],
      irrigation_net_mm: 0, et0_mm: m.et0_mm[i], etc_mm: m.etc_mm[i], eta_mm: m.eta_mm[i], storage_mm: m.storage_mm[i], capacity_mm: cap,
      available_water_fraction: cap > 0 ? m.storage_mm[i] / cap : null, runoff_mm: null, drainage_mm: m.drainage_mm[i],
      stress_coefficient: m.stress_coefficient[i], root_depth_m: null, root_depth_source: null,
    };
  });
}

export function seasonOf(run: PlanningRun, crop: string, harvestYear: number) {
  return run.seasons.find((s) => s.crop_id === crop && s.harvest_year === harvestYear) ?? null;
}

/** Index range of a crop season inside the run window (inclusive). */
export function seasonIndex(series: PlanningSeries, run: PlanningRun, crop: string, harvestYear: number) {
  const s = seasonOf(run, crop, harvestYear); if (!s) return null;
  const start = series.dates.findIndex((d) => d >= s.sowing_date); let end = -1;
  series.dates.forEach((d, i) => { if (d <= s.expected_harvest_date) end = i; });
  return start < 0 || end < start ? null : { start, end };
}

/** Day of the crop cycle (1-based) for a date, from the effective parameters; null outside the season. */
export function cycleDay(run: PlanningRun, crop: string, harvestYear: number, date: string) {
  const s = seasonOf(run, crop, harvestYear); if (!s || date < s.sowing_date || date > s.expected_harvest_date) return null;
  const day = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${s.sowing_date}T00:00:00Z`)) / 86400000) + 1;
  return { day, of: s.cycle_days };
}

export function dayInfo(series: PlanningSeries, i: number) {
  return { kind: series.day_kind[i], simDay: i + 1, simDays: series.dates.length };
}
