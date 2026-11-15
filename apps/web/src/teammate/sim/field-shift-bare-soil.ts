// Field Shift — bare soil and vulnerable seasons. Values come from the extension published by
// services/science-adapter/field_shift_rotations.py (sorriso-field-shift-rotations.json). Everything else on the screen
// comes from the v2 package; the extension is shown only when its calendar of bare and covered days is that package's.
import { STRATEGIES, type FieldShiftSummary, type PairStat, type StrategyId } from './field-shift-decision';

export const BARE_METRICS = ['bare_days', 'bare_days_nov_apr', 'rain_on_bare_soil_mm'] as const;
export type BareMetric = (typeof BARE_METRICS)[number];
type ExtRow = Record<BareMetric | 'covered_days', number | null> & { agricultural_year: string };
type ExtKey = 'reference_fallow' | 'brachiaria' | 'soy_fallow';
type SensitivityRow = { parameter: 'rain_multiplier'; value: number; comparison: `${'brachiaria' | 'soy_fallow'}_minus_reference_fallow` } & Record<string, number | string | null>;
export type BareSoilExtension = {
  schema_version: string; product: 'field_shift_rotations_extension'; municipality_code: string;
  scenarios: Record<ExtKey, { mean: Record<string, number | null>; by_year: ExtRow[] }>;
  delta_change_sensitivity: { label: string; method: string; rows: SensitivityRow[] };
  provenance: { script: string; input_sha256: string };
};
/** Rotation C is `soy_fallow` in the extension and `soy_long_fallow` in the v2 package: same sequence, checked day count by day count below. */
const EXT: Record<StrategyId, ExtKey> = { reference_fallow: 'reference_fallow', brachiaria: 'brachiaria', soy_long_fallow: 'soy_fallow' };

/** Throws `field_shift_bare_soil_mismatch` unless, for every strategy and season, covered and bare days equal the v2 package. */
export function checkBareSoil(ext: BareSoilExtension, summary: FieldShiftSummary): void {
  const fail = (why: string): never => { throw new Error(`field_shift_bare_soil_mismatch: ${why}`); };
  if (ext?.product !== 'field_shift_rotations_extension' || ext.municipality_code !== summary.municipality_code) fail('another product or place');
  for (const s of STRATEGIES) {
    const mine = ext.scenarios?.[EXT[s]]?.by_year ?? [], theirs = summary.scenarios[s].by_year;
    if (mine.length !== theirs.length) fail(`${s}: other seasons`);
    theirs.forEach((y, i) => { const m = mine[i]; if (m.agricultural_year !== y.agricultural_year || m.covered_days !== y.covered_days || m.bare_days !== y.bare_days) fail(`${s} ${y.agricultural_year}: other calendar`); });
  }
}

const round2 = (v: number) => { const out = Number(v.toFixed(2)); return Object.is(out, -0) ? 0 : out; };
function pair(alt: ExtRow[], ref: ExtRow[], k: BareMetric): PairStat {
  const byYear = new Map(ref.map((r) => [r.agricultural_year, r]));
  const pairs = alt.flatMap((y) => { const a = y[k], b = byYear.get(y.agricultural_year)?.[k]; return a != null && b != null ? [{ year: y.agricultural_year, d: a - b }] : []; });
  if (!pairs.length) return { n: 0, mean: null, min: null, max: null, years: [], status: 'not_applicable' };
  const d = pairs.map((p) => p.d);
  return { n: d.length, mean: round2(d.reduce((x, y) => x + y, 0) / d.length), min: round2(Math.min(...d)), max: round2(Math.max(...d)), years: pairs.map((p) => p.year), status: 'ok' };
}

export type BareRow = { metric: BareMetric; values: Record<StrategyId, number | null>; deltas: Record<'brachiaria' | 'soy_long_fallow', PairStat> };
export type BareSensitivity = { percent: number; alt: 'brachiaria' | 'soy_long_fallow'; values: Record<BareMetric, number | null> };
/** Historical means of the three strategies, paired differences against A, and the published ±20% rain rows (differences against A only). */
export function bareSoilView(ext: BareSoilExtension): { rows: BareRow[]; sensitivity: BareSensitivity[] } {
  const by = (s: StrategyId) => ext.scenarios[EXT[s]];
  const rows = BARE_METRICS.map((metric): BareRow => ({
    metric,
    values: Object.fromEntries(STRATEGIES.map((s) => [s, by(s).mean[metric] ?? null])) as BareRow['values'],
    deltas: { brachiaria: pair(by('brachiaria').by_year, by('reference_fallow').by_year, metric), soy_long_fallow: pair(by('soy_long_fallow').by_year, by('reference_fallow').by_year, metric) },
  }));
  const sensitivity = ext.delta_change_sensitivity.rows.filter((r) => r.parameter === 'rain_multiplier').map((r): BareSensitivity => ({
    percent: Math.round((r.value - 1) * 100), alt: r.comparison.startsWith('brachiaria') ? 'brachiaria' : 'soy_long_fallow',
    values: Object.fromEntries(BARE_METRICS.map((k) => [k, (r[`difference_${k}`] as number | null | undefined) ?? null])) as BareSensitivity['values'],
  }));
  return { rows, sensitivity };
}
