// Field Shift v2 (three historical strategies in Sorriso): package identity and presentation helpers.
// Nothing here produces a scientific metric: values come from the published package; differences are the same
// year-by-year pairing the producer publishes (data/ingest/field_shift_v2.py, `paired`), for a reference chosen on screen.

export const STRATEGIES = ['reference_fallow', 'brachiaria', 'soy_long_fallow'] as const;
export type StrategyId = (typeof STRATEGIES)[number];
export const STRATEGY_LETTER: Record<StrategyId, 'A' | 'B' | 'C'> = { reference_fallow: 'A', brachiaria: 'B', soy_long_fallow: 'C' };

export const METRICS = ['covered_days', 'off_season_water_use_mm', 'off_season_drainage_mm', 'storage_at_next_sowing_mm', 'soy_deficit_mm', 'maize_deficit_mm', 'maize_stress_days',
  'next_soy_establishment_deficit_mm', 'bare_days', 'off_season_days', 'soy_stress_days', 'year_days', 'year_rain_mm', 'year_water_use_mm', 'year_drainage_mm', 'post_soy_days',
  'post_soy_water_use_mm', 'post_soy_drainage_mm'] as const;
export type MetricId = (typeof METRICS)[number];
export type Indicators = Record<MetricId, number | null>;
export type YearRow = Indicators & { agricultural_year: string; soy_sowing: string; maize_sowing: string | null; next_soy_sowing: string; maize_status: 'grown' | 'not_grown'; next_soy_establishment_status: 'ok' | 'next_season_not_simulated' };
export type PairStat = { n: number; mean: number | null; min: number | null; max: number | null; years: string[]; status: 'ok' | 'not_applicable' };
type ComparisonKey = 'brachiaria_minus_reference_fallow' | 'soy_long_fallow_minus_reference_fallow';
/** A published set of the three strategies under one forcing: the base run or one rain sensitivity point. */
export type PublishedComparison = { scenarios: Record<StrategyId, { mean: Indicators; by_year: YearRow[]; valid_years: number }>; comparisons: Record<ComparisonKey, Record<MetricId, PairStat>> };
export type RainPoint = PublishedComparison & { multiplier: number; rain_change_percent: number };
type ParameterPoint = { parameter: string; value: number | string; scenarios: Record<StrategyId, { mean: Indicators; valid_years: number }>; comparisons: PublishedComparison['comparisons'] };
export type FieldShiftSummary = PublishedComparison & {
  schema_version: '2.0.0'; product: 'field_shift_strategies'; package_id: string; municipality_code: string; municipality: string; reference_scenario: StrategyId; reference_note: string;
  scenarios: Record<StrategyId, { label: 'A' | 'B' | 'C'; crops: string[]; kind: string; sequence: string; mean: Indicators; by_year: YearRow[]; valid_years: number }>;
  weather: { source: string; agricultural_years: string[]; sha256: string; days: number; first_day: string; last_day: string };
  soil: { cad_class: string; capacity_mm: number; initial_storage_fraction: number; basis: string };
  hypotheses: { central: { cover_kc: number; straw_factor: number; cad_class: string; soy_shift_days: number }; fallow_kc: number; sources: Record<string, string> };
  comparisons_note: string; not_simulated: string[]; yield_effect: null; evidence: string;
  sensitivity: { rain: { label: string; method: string; points: RainPoint[] }; parameters: ParameterPoint[]; temperature: { status: 'not_calculated' | 'calculated'; reason: string } };
};
export type DailyColumns = { agricultural_year: string[]; date: string[]; land_cover: string[]; stage: string[]; rain_mm: number[]; storage_end_mm: number[]; et_deficit_mm: number[] } & Record<string, (string | number | boolean)[]>;
export type FieldShiftSeries = { schema_version: string; package_id: string; municipality_code: string; capacity_mm: number; rain_multiplier: number; scenarios: Record<StrategyId, DailyColumns> };
export type PackageManifest = { package_id: string; schema_version: string; generated_at: string; files: Record<string, { sha256: string; bytes: number }>;
  reproduction_v1: Record<'reference_fallow' | 'brachiaria', { by_year_identical: boolean; daily_identical: boolean; years: number; days: number }> | null };

const PACKAGE_ID = /^field-shift-v2-[0-9a-f]{12}$/;
/**
 * The summary and the daily series are shown together only when they belong to the same package as the manifest.
 * Returns the package id; throws `field_shift_package_mismatch` otherwise (the screen then keeps the last valid publication).
 */
export function checkPackage(manifest: PackageManifest, summary: FieldShiftSummary, series: FieldShiftSeries): string {
  const fail = (why: string): never => { throw new Error(`field_shift_package_mismatch: ${why}`); };
  const id = manifest?.package_id;
  if (typeof id !== 'string' || !PACKAGE_ID.test(id)) fail('manifest without a package id');
  if (summary?.package_id !== id) fail('summary of another package');
  if (series?.package_id !== id) fail('series of another package');
  if (summary.schema_version !== '2.0.0' || series.schema_version !== '2.0.0' || manifest.schema_version !== '2.0.0') fail('schema version');
  if (!manifest.files?.['summary.json'] || !manifest.files?.['series.json']) fail('manifest without the summary or the series');
  const days = series.scenarios?.reference_fallow?.date?.length ?? 0; if (!days) fail('series without days');
  for (const s of STRATEGIES) {
    if (!summary.scenarios?.[s]) fail(`summary without ${s}`);
    if (series.scenarios?.[s]?.date?.length !== days || series.scenarios[s].storage_end_mm?.length !== days) fail(`series of ${s} with other days`);
  }
  return id;
}

/** The producer rounds with Python round(x, 2), which rounds the exact value of the double; toFixed does the same (they differ only on exact binary ties). */
const pyRound2 = (v: number): number => { const out = Number(v.toFixed(2)); return Object.is(out, -0) ? 0 : out; };
function pair(alternative: YearRow[], reference: YearRow[], metric: MetricId): PairStat {
  const ref = new Map(reference.map((y) => [y.agricultural_year, y]));
  const pairs = alternative.flatMap((y) => { const r = ref.get(y.agricultural_year); const a = y[metric], b = r?.[metric]; return a != null && b != null ? [{ year: y.agricultural_year, d: a - b }] : []; });
  if (!pairs.length) return { n: 0, mean: null, min: null, max: null, years: [], status: 'not_applicable' };
  const values = pairs.map((p) => p.d);
  return { n: values.length, mean: pyRound2(values.reduce((a, b) => a + b, 0) / values.length), min: pyRound2(Math.min(...values)), max: pyRound2(Math.max(...values)), years: pairs.map((p) => p.year), status: 'ok' };
}

export type CellStatus = 'ok' | 'not_grown' | 'not_simulated';
export type DecisionRow = { metric: MetricId; values: Record<StrategyId, number | null>; status: Record<StrategyId, CellStatus>; deltas: Record<StrategyId, PairStat | null> };
export type DecisionView = { reference: StrategyId; others: StrategyId[]; rows: DecisionRow[] };
const MAIZE: readonly MetricId[] = ['maize_deficit_mm', 'maize_stress_days'];
/** Published means of the three strategies and the paired differences of the other two against `referenceId`. */
export function buildComparison(input: PublishedComparison, referenceId: StrategyId): DecisionView {
  const rows = METRICS.map((metric): DecisionRow => {
    const values = {} as DecisionRow['values'], status = {} as DecisionRow['status'], deltas = {} as DecisionRow['deltas'];
    for (const s of STRATEGIES) {
      const block = input.scenarios[s]; values[s] = block.mean[metric];
      status[s] = values[s] != null ? 'ok' : MAIZE.includes(metric) && block.by_year.every((y) => y.maize_status === 'not_grown') ? 'not_grown' : 'not_simulated';
      deltas[s] = s === referenceId ? null : pair(block.by_year, input.scenarios[referenceId].by_year, metric);
    }
    return { metric, values, status, deltas };
  });
  return { reference: referenceId, others: STRATEGIES.filter((s) => s !== referenceId), rows };
}

export type GroupId = 'cover' | 'common' | 'soy' | 'maize' | 'own';
/** Indicators by window. `own` holds the off-season of each strategy, whose length differs between strategies. */
export const GROUPS: Record<GroupId, MetricId[]> = {
  cover: ['covered_days', 'bare_days'],
  common: ['storage_at_next_sowing_mm', 'year_water_use_mm', 'year_drainage_mm'],
  soy: ['soy_deficit_mm', 'soy_stress_days', 'next_soy_establishment_deficit_mm'],
  maize: ['maize_deficit_mm', 'maize_stress_days'],
  own: ['off_season_days', 'off_season_water_use_mm', 'off_season_drainage_mm'],
};
export const PRIORITIES = ['margem', 'producao', 'conservacao'] as const;
export type Priority = (typeof PRIORITIES)[number];
const GROUP_ORDER: Record<Priority, GroupId[]> = {
  conservacao: ['cover', 'common', 'soy', 'maize', 'own'],
  producao: ['soy', 'maize', 'common', 'cover', 'own'],
  margem: ['maize', 'soy', 'common', 'cover', 'own'],
};
/** The priority only changes the order in which the same published indicators are read. */
export const orderGroups = (priority: Priority): GroupId[] => GROUP_ORDER[priority];
export const orderIndicators = (priority: Priority): MetricId[] => GROUP_ORDER[priority].flatMap((g) => GROUPS[g]);

type PlanLike = { id: string; createdAt: string; data: Record<string, string> };
export type PrioritySource = 'choice' | 'plan' | 'default' | 'plan_missing';
const isPriority = (v: unknown): v is Priority => PRIORITIES.includes(v as Priority);
/**
 * Priority on screen: the explicit choice, else the saved plan named in the address (plans of the current account only),
 * else soil conservation as a visible default. The latest plan is never picked silently.
 */
export function resolvePriority<P extends PlanLike>({ choice, planId, plans }: { choice: string | null; planId: string | null; plans: readonly P[] }): { priority: Priority; source: PrioritySource; plan: P | null } {
  if (isPriority(choice)) return { priority: choice, source: 'choice', plan: null };
  if (planId) {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return { priority: 'conservacao', source: 'plan_missing', plan: null };
    if (isPriority(plan.data.prioridade)) return { priority: plan.data.prioridade, source: 'plan', plan };
  }
  return { priority: 'conservacao', source: 'default', plan: null };
}
