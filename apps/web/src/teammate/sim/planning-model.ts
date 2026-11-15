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

type PublicationRef = { run_id: string; crops: string[]; harvest_years: number[] };
/**
 * The regional publication to open for a crop and a harvest year. A publication may group several years (Brazil)
 * or hold exactly one (US): the year is always part of the choice, so one year never opens another year's run.
 * Among matches, the plan whose last crop is the requested one wins (a rotation is opened through its last crop).
 */
export function selectPublication<T extends PublicationRef>(items: readonly T[], crop: string, harvestYear: number): T | null {
  const matches = items.filter((p) => p.crops.includes(crop) && p.harvest_years.includes(harvestYear));
  return matches.find((p) => p.crops[p.crops.length - 1] === crop) ?? matches[0] ?? null;
}

type CapabilityLike = { status: string; reason_code: string | null; run_ids: string[]; yield_result?: unknown };
export type CoverageState = 'daily_series' | 'yield_only' | 'unavailable' | 'not_published';
/**
 * Coverage of one place × crop × harvest year, per product. The daily series and the yield result are different
 * products: a post-harvest estimate has a yield and no series, and that is shown as such, never as a missing place.
 */
export function coverageOf<C extends CapabilityLike>(capability: C | undefined | null) {
  if (!capability) return { state: 'not_published' as CoverageState, dailySeries: false, yieldResult: null, reason: null };
  const dailySeries = capability.status === 'ready' && capability.run_ids.length > 0;
  const yieldResult = (capability.yield_result ?? null) as C['yield_result'] | null;
  const state: CoverageState = dailySeries ? 'daily_series' : yieldResult ? 'yield_only' : 'unavailable';
  return { state, dailySeries, yieldResult: dailySeries ? null : yieldResult, reason: dailySeries ? null : capability.reason_code };
}

const DEFAULT_PLACE = 'BR:ibge:5107925';
const LOCATION = /^(BR:ibge:\d{7}|US:fips:\d{5})$/;
/** Place of the planning screen: ?local=<location id>, or the older ?mun=<IBGE code>. */
export function planningPlaceId(params: URLSearchParams): string {
  const local = params.get('local'); if (local && LOCATION.test(local)) return local;
  const mun = params.get('mun'); return mun && /^\d{7}$/.test(mun) ? `BR:ibge:${mun}` : DEFAULT_PLACE;
}
/** Link to the season planning of a place (and crop), used by every "simulate here" action. */
export function planningHref(locationId: string, crop?: string | null): string {
  return `#/simulador?modo=planejamento&local=${locationId}${crop ? `&cultura=${encodeURIComponent(crop)}` : ''}`;
}
/** True when a place has something to show in the planning: a daily simulation or a yield result. */
export const hasPlanningResult = (capabilities: readonly CapabilityLike[] | undefined) => !!capabilities?.some((c) => { const s = coverageOf(c).state; return s === 'daily_series' || s === 'yield_only'; });

type SeasonMembers = { members?: Record<string, Record<string, number | null | undefined>> | null };
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
/**
 * Water satisfaction of one crop season: for each climate member, water used ÷ water needed inside the cycle
 * (sum of ETa ÷ sum of ETc); the members are summarised afterwards by their median. The median of the ratios is not
 * the ratio of the medians, so the published quantiles of ETa and of the deficit cannot be combined instead.
 * Runs without ETc publish ETa and the deficit, and the deficit is ETc − ETa day by day, so ETc = ETa + deficit.
 * Any member without a positive need or with a missing or non-finite value makes the season "not calculated".
 */
export function waterSatisfaction(season: SeasonMembers | null | undefined): { value: number; members: number } | null {
  const all = Object.values(season?.members ?? {}); if (!all.length) return null;
  const ratios: number[] = [];
  for (const m of all) {
    const eta = m.crop_eta_mm; const need = finite(m.crop_etc_mm) ? m.crop_etc_mm : finite(eta) && finite(m.crop_deficit_mm) ? eta + m.crop_deficit_mm : null;
    if (!finite(eta) || eta < 0 || need == null || !(need > 0)) return null;
    ratios.push(eta / need);
  }
  ratios.sort((a, b) => a - b); const mid = ratios.length >> 1;
  return { value: ratios.length % 2 ? ratios[mid] : (ratios[mid - 1] + ratios[mid]) / 2, members: ratios.length };
}
/** The crop with the highest water satisfaction, only when at least two were calculated and the highest is alone at the displayed precision (whole percent). */
export function highestSatisfaction(rows: readonly { id: string; supply: number | null }[]): string | null {
  const known = rows.filter((r): r is { id: string; supply: number } => r.supply != null).map((r) => ({ id: r.id, shown: Math.round(r.supply * 100) }));
  if (known.length < 2) return null;
  const top = Math.max(...known.map((r) => r.shown)); const first = known.filter((r) => r.shown === top);
  return first.length === 1 ? first[0].id : null;
}
type RunScope = { location_id: string; soil: { profile_id: string; capacity_mm: number }; ensemble: { analog_years: readonly number[] } };
/** Two runs can be put side by side only with the same place, soil hypothesis and climate ensemble. */
export function comparableRuns(a: RunScope, b: RunScope): boolean {
  return a.location_id === b.location_id && a.soil.profile_id === b.soil.profile_id && a.soil.capacity_mm === b.soil.capacity_mm && a.ensemble.analog_years.join(',') === b.ensemble.analog_years.join(',');
}
