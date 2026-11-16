// Field Shift v2 — rain on the days a strategy has no crop or cover. Idea from the collaborator's branch
// feat/field-shift-rotacoes (LaraLLC, 07c1c11 and 963c6d0); here the values are a count and a sum over the daily
// columns the pinned package already publishes (date, agricultural_year, soil_covered, rain_mm). No water balance
// runs in the browser. It is an exposure under the calendar hypothesis of the scenario: not soil loss, not measured
// ground cover.
//
// What stands behind the numbers: the bytes of series.json are pinned to the package manifest by sha256 when the app is
// built (field-shift-decision.test.ts). At run time `checkExposure` is a consistency check, not a proof of identity: the
// three strategies must share one weather, the cover flag must agree with the land cover of the day, days must be
// consecutive, seasons must start and end at the published sowings, and the season totals must be those of the summary.
// A series edited consistently in all of these at once would still pass.
import { pairedStat, pyRound2, STRATEGIES, type DailyColumns, type FieldShiftSeries, type FieldShiftSummary, type PairStat, type PublishedComparison, type StrategyId } from './field-shift-decision';

export const EXPOSURE_METRICS = ['bare_days_wet_months', 'rain_on_bare_days_mm'] as const;
export type ExposureMetric = (typeof EXPOSURE_METRICS)[number];
/** November to April: a convention of this screen for the rainy season in Sorriso; the package defines none. `wetShare` reports how much of the rain fell in it. */
const WET_MONTHS: ReadonlySet<number> = new Set([11, 12, 1, 2, 3, 4]);
/** The summary publishes the rain of a season with one decimal, so the daily sum may differ from it by 0.05 mm. */
const TOLERANCE_MM = 0.1;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;
/** Milliseconds of a calendar day written as YYYY-MM-DD, or NaN when it is not a day of the calendar (2021-02-31). */
function dayOf(value: unknown): number {
  const m = DATE.exec(String(value)); if (!m) return Number.NaN;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(ms).toISOString().slice(0, 10) === m[0] ? ms : Number.NaN;
}
const nextDay = (iso: string): string => new Date(dayOf(iso) + DAY_MS).toISOString().slice(0, 10);

export type ExposureYear = { agricultural_year: string; first_day: string; last_day: string; days: number; bare_days: number; bare_days_wet_months: number; rain_mm: number; rain_on_bare_days_mm: number; rain_wet_months_mm: number };

/** Per agricultural year: days without crop or cover, those of them from November to April, and the rain that fell on them over the whole year. */
export function exposureByYear(columns: DailyColumns): ExposureYear[] {
  const invalid = (why: string): never => { throw new Error(`field_shift_exposure_invalid: ${why}`); };
  const year: unknown = columns?.agricultural_year, date: unknown = columns?.date, rain: unknown = columns?.rain_mm, covered: unknown = columns?.soil_covered;
  if (!Array.isArray(year) || !Array.isArray(date) || !Array.isArray(rain) || !Array.isArray(covered)) return invalid('missing column');
  const n = date.length; if (!n || year.length !== n || rain.length !== n || covered.length !== n) invalid('columns of different lengths');
  const out: ExposureYear[] = []; const seen = new Set<string>(); let row: ExposureYear | undefined;
  for (let i = 0; i < n; i++) {
    const iso: unknown = date[i], mm: unknown = rain[i], flag: unknown = covered[i], label: unknown = year[i];
    if (typeof iso !== 'string' || Number.isNaN(dayOf(iso))) return invalid(`date of day ${i}`);
    if (typeof mm !== 'number' || !Number.isFinite(mm) || mm < 0) return invalid(`rain of day ${i}`);
    if (typeof flag !== 'boolean') return invalid(`cover flag of day ${i}`);
    if (typeof label !== 'string' || !label) return invalid(`season of day ${i}`);
    if (!row || row.agricultural_year !== label) {
      if (seen.has(label)) invalid(`season ${label} appears twice`);
      seen.add(label); row = { agricultural_year: label, first_day: iso, last_day: iso, days: 0, bare_days: 0, bare_days_wet_months: 0, rain_mm: 0, rain_on_bare_days_mm: 0, rain_wet_months_mm: 0 }; out.push(row);
    }
    const wet = WET_MONTHS.has(Number(iso.slice(5, 7)));
    row.last_day = iso; row.days += 1; row.rain_mm += mm; if (wet) row.rain_wet_months_mm += mm;
    if (!flag) { row.bare_days += 1; row.rain_on_bare_days_mm += mm; if (wet) row.bare_days_wet_months += 1; }
  }
  // Daily rain is published with two decimals: rounding the sums removes floating-point residue, not information.
  return out.map((y) => ({ ...y, rain_mm: pyRound2(y.rain_mm), rain_on_bare_days_mm: pyRound2(y.rain_on_bare_days_mm), rain_wet_months_mm: pyRound2(y.rain_wet_months_mm) }));
}

const mismatch = (why: string): never => { throw new Error(`field_shift_exposure_mismatch: ${why}`); };
type Published = PublishedComparison['scenarios'][StrategyId]['by_year'];
/** The seasons, the calendar and the rain of `published` must be those of the daily columns, with the rain times `multiplier`. */
function sameSeasons(strategy: StrategyId, derived: ExposureYear[], published: Published | undefined, multiplier: number): void {
  if (!Array.isArray(published) || published.length !== derived.length) return mismatch(`${strategy}: other seasons`);
  derived.forEach((y, i) => {
    const p = published[i];
    if (p?.agricultural_year !== y.agricultural_year) mismatch(`${strategy}: season ${y.agricultural_year} out of place`);
    if (p.soy_sowing !== y.first_day || p.next_soy_sowing !== nextDay(y.last_day)) mismatch(`${strategy} ${y.agricultural_year}: season limits are not the published sowings`);
    if (p.bare_days !== y.bare_days || p.year_days !== y.days) mismatch(`${strategy} ${y.agricultural_year}: other calendar`);
    if (typeof p.year_rain_mm !== 'number' || !(Math.abs(p.year_rain_mm - multiplier * y.rain_mm) <= TOLERANCE_MM)) mismatch(`${strategy} ${y.agricultural_year}: other rain`);
  });
}

/** Derives the yearly rows of the three strategies and refuses them unless the columns are coherent with each other and with the summary of the same package. */
export function checkExposure(series: FieldShiftSeries, summary: FieldShiftSummary): Record<StrategyId, ExposureYear[]> {
  if (!series || !summary || series.package_id !== summary.package_id || series.municipality_code !== summary.municipality_code) mismatch('series of another package or place');
  if (series.rain_multiplier !== 1) mismatch('series is not the historical rain');
  const out = {} as Record<StrategyId, ExposureYear[]>;
  for (const s of STRATEGIES) out[s] = exposureByYear(series.scenarios?.[s]);
  const base = series.scenarios.reference_fallow;
  for (let i = 1; i < base.date.length; i++) if (dayOf(base.date[i]) - dayOf(base.date[i - 1]) !== DAY_MS) mismatch(`days are not consecutive at ${base.date[i]}`);
  for (const s of STRATEGIES) {
    const c = series.scenarios[s]; const land: unknown = c.land_cover, covered = c.soil_covered as unknown[];
    if (!Array.isArray(land) || land.length !== c.date.length) return mismatch(`${s}: no land cover`);
    for (let i = 0; i < c.date.length; i++) {
      // One weather and one calendar of days for the three strategies; only what grows on the land differs.
      if (c.date[i] !== base.date[i] || c.agricultural_year[i] !== base.agricultural_year[i] || c.rain_mm[i] !== base.rain_mm[i]) mismatch(`${s}: other day or rain than A at ${base.date[i]}`);
      if (typeof land[i] !== 'string' || (land[i] !== 'bare') !== covered[i]) mismatch(`${s}: cover flag disagrees with the land cover at ${c.date[i]}`);
    }
    sameSeasons(s, out[s], summary.scenarios?.[s]?.by_year, 1);
  }
  return out;
}

/** `values` are unrounded means, to be rounded once when shown; `deltas` follow the package's pairing (two decimals). */
export type ExposureRow = { metric: ExposureMetric; values: Record<StrategyId, number>; deltas: Record<StrategyId, PairStat | null> };
export type ExposureView = { multiplier: number; /** Share of the rain of the series that fell from November to April (0 to 1). */ wetShare: number; rows: ExposureRow[] };
/**
 * Means of the three strategies and paired differences against `reference`, for the comparison on screen: the historical
 * summary or one calculated rain point. A rain point keeps the calendar and multiplies every daily rain by one factor, so
 * the rain on the same days is the historical one times that factor; this is checked against the point before it is used.
 */
export function buildExposure(pkg: { series: FieldShiftSeries; summary: FieldShiftSummary }, input: PublishedComparison, reference: StrategyId): ExposureView {
  const base = checkExposure(pkg.series, pkg.summary);
  const multiplier = 'multiplier' in input ? (input as { multiplier: unknown }).multiplier : 1;
  if (typeof multiplier !== 'number' || !Number.isFinite(multiplier) || multiplier <= 0) return mismatch('rain factor');
  const years = {} as Record<StrategyId, { agricultural_year: string; bare_days_wet_months: number; rain_on_bare_days_mm: number }[]>;
  for (const s of STRATEGIES) {
    sameSeasons(s, base[s], input.scenarios?.[s]?.by_year, multiplier);
    years[s] = base[s].map((y) => ({ agricultural_year: y.agricultural_year, bare_days_wet_months: y.bare_days_wet_months, rain_on_bare_days_mm: pyRound2(multiplier * y.rain_on_bare_days_mm) }));
  }
  const mean = (s: StrategyId, k: ExposureMetric) => (k === 'rain_on_bare_days_mm' ? multiplier : 1) * base[s].reduce((sum, y) => sum + y[k], 0) / base[s].length;
  const rows = EXPOSURE_METRICS.map((metric): ExposureRow => ({
    metric,
    values: Object.fromEntries(STRATEGIES.map((s) => [s, mean(s, metric)])) as ExposureRow['values'],
    deltas: Object.fromEntries(STRATEGIES.map((s) => [s, s === reference ? null : pairedStat(years[s], years[reference], (y) => y[metric])])) as ExposureRow['deltas'],
  }));
  const all = base.reference_fallow, total = all.reduce((sum, y) => sum + y.rain_mm, 0);
  return { multiplier, wetShare: total > 0 ? all.reduce((sum, y) => sum + y.rain_wet_months_mm, 0) / total : 0, rows };
}
