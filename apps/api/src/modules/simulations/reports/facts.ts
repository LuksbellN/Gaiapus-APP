// Language-independent facts of a technical report, read from one saved and verified run. Nothing here is a new
// scientific result: seasonal statistics are the published quantiles, event counts come from the published share,
// and the only series-derived values describe the three representative members by name (never the ensemble).
// No text depends on a language and no number is rounded: presentation happens in the renderer.
import { createHash } from 'node:crypto';
import { canonicalJson } from '@gaiapus/contracts';
import type { ReportAction, ReportConclusion, ReportEventFact, ReportFacts, ReportMetricFact, ReportScope, ReportSeasonFacts, ReportSectionStatus, ReportTextFact, ReportWarning, ReportYieldFact,
  SimulationRun, SimulationSeries, SimulationYield } from '@gaiapus/contracts';
import { ApiError } from '../../../plugins/errors.js';
import { EVENTS, METRICS, classifyLimitation, classifyText, sanitizeSourceText, type TextField } from './registry.js';

export type SeriesInput = { status: 'available'; data: SimulationSeries } | { status: 'absent' } | { status: 'integrity_failed' };
/** A run the server resolved, authorised and verified, plus only the complementary sources the report needs. */
export interface VerifiedReportInput {
  run: SimulationRun;
  scope: ReportScope;
  visibility: string;
  artifacts: { kind: string; sha256: string; bytes: number }[];
  series: SeriesInput;
}
type Season = SimulationRun['seasons'][number];
type Facts = ReportFacts;

const HEX64 = /^[0-9a-f]{64}$/, DAY = /^\d{4}-\d{2}-\d{2}$/;
const seasonId = (s: { crop_id: string; harvest_year: number }) => `season:${s.crop_id}:${s.harvest_year}`;
const bySeason = (a: Season, b: Season) => a.sowing_date.localeCompare(b.sowing_date) || a.crop_id.localeCompare(b.crop_id) || a.harvest_year - b.harvest_year;
const utcDay = (instant: string) => new Date(instant).toISOString().slice(0, 10);

/** Canonical scope: the whole run, or one season that exists in the run. Anything else is a client error. */
export function normalizeScope(scope: ReportScope | undefined, run: SimulationRun): ReportScope {
  if (!scope || scope.kind === 'run') return { kind: 'run' };
  if (!run.seasons.some(s => s.crop_id === scope.crop_id && s.harvest_year === scope.harvest_year)) throw new ApiError(422, 'invalid_input', 'Request does not match the contract', { scope: 'The run has no such crop season' });
  return { kind: 'season', crop_id: scope.crop_id, harvest_year: scope.harvest_year };
}
export const scopeKey = (scope: ReportScope) => (scope.kind === 'run' ? 'run' : `season:${scope.crop_id}:${scope.harvest_year}`);

type Warn = (subject: string, fact: ReportTextFact) => ReportTextFact;
function yieldFact(id: string, y: SimulationYield, warn: Warn): ReportYieldFact {
  if (y.status === 'unavailable') return { id, variant: 'unavailable', reason_code: y.reason_code };
  const scaleKind = /^municipal\b/i.test(y.scale) ? 'municipal' : /^county\b/i.test(y.scale) ? 'county' : 'other';
  const common = { last_label_year: y.last_label_year, history_horizon_years: y.history_horizon_years, label_release_rule: warn('label_release_rule', classifyText('label_release_rule', y.label_release_rule, 'en')),
    research_status: y.research_status, exposure_flags: [...y.exposure_flags], scale: { kind: scaleKind as 'municipal' | 'county' | 'other', original: sanitizeSourceText(y.scale) || 'unspecified' } };
  // The shape decides the variant: a historical reference lists the years it averages; a model result names its model.
  if ('years_used' in y) return { id, variant: 'historical_reference', status: 'reference', value_kg_ha: y.value_kg_ha, method: y.method, years_used: [...y.years_used], conditional_on_scenario: false, ...common };
  return { id, variant: 'model', status: y.status, value_kg_ha: y.value_kg_ha, method: y.method, model_version: y.model_version,
    scenario_range: y.scenario_range ? { ...y.scenario_range } : null, predictive_range: y.predictive_range ? { ...y.predictive_range } : null,
    position_vs_season: y.position_vs_season, conditional_on_scenario: y.conditional_on_scenario, ...common };
}

function eventFact(id: string, event: Season['events'][number]): ReportEventFact {
  const { share_of_members: share, members } = event;
  const product = share * members;
  const consistent = Number.isFinite(share) && share >= 0 && share <= 1 && Math.abs(product - Math.round(product)) <= 1e-6;
  return { id, event_id: event.event_id, known: event.event_id in EVENTS, share_of_members: share, members, count: consistent ? Math.round(product) : null, count_status: consistent ? 'derived' : 'inconsistent' };
}

/** Consecutive runs of equal values inside [from, to], as dated segments. */
function segments<T extends string>(values: readonly T[], dates: readonly string[], from: number, to: number): { value: T; start: string; end: string; days: number }[] {
  const out: { value: T; start: string; end: string; days: number }[] = [];
  for (let i = from; i <= to; i++) {
    const last = out.at(-1), value = values[i]!;
    if (last && last.value === value) { last.end = dates[i]!; last.days++; } else out.push({ value, start: dates[i]!, end: dates[i]!, days: 1 });
  }
  return out;
}

function seriesFacts(season: Season, series: SimulationSeries): Pick<ReportSeasonFacts, 'phases' | 'trajectories' | 'day_kinds'> | null {
  const from = series.dates.findIndex(d => d >= season.sowing_date);
  let to = -1;
  series.dates.forEach((d, i) => { if (d <= season.expected_harvest_date) to = i; });
  if (from < 0 || to < from) return null;
  const members = season.members as Record<string, Record<string, number> | undefined>;
  const trajectories = (['central', 'dry', 'wet'] as const).flatMap(role => {
    const member = series.members.find(m => m.role === role);
    if (!member) return [];
    let min = Infinity, at = from;
    for (let i = from; i <= to; i++) { const v = member.storage_mm[i]!; if (v < min) { min = v; at = i; } }
    const published = members[member.member_id]?.crop_deficit_mm;
    return [{ role, member_id: member.member_id, analog_year: member.analog_year, season_deficit_mm: typeof published === 'number' ? published : null, min_storage_mm: min, min_storage_date: series.dates[at]! }];
  });
  const central = series.members.find(m => m.role === 'central');
  return {
    trajectories,
    phases: central ? segments(central.phase_code, series.dates, from, to).map(s => ({ phase_code: s.value, start: s.start, end: s.end, days: s.days })) : null,
    day_kinds: segments(series.day_kind, series.dates, from, to).map(s => ({ kind: s.value, start: s.start, end: s.end })),
  };
}

function dataSources(run: SimulationRun, warn: Warn, warnings: ReportWarning[]): Facts['data_sources'] {
  const sources = run.sources as Record<string, unknown>;
  const asOf = utcDay(run.as_of);
  const known = ['history', 'observed', 'et0', 'yield_labels'];
  const roles = [...known.filter(k => k in sources), ...Object.keys(sources).filter(k => !known.includes(k)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))]; // code-unit order, the same on every machine
  const clean = (v: unknown) => (typeof v === 'string' && sanitizeSourceText(v) ? sanitizeSourceText(v).slice(0, 256) : null);
  const out: Facts['data_sources'] = [];
  for (const role of roles) {
    const value = sources[role];
    // Role names come from the artifact: only identifier-like names are kept.
    if (value == null || !/^[a-z0-9_]{1,64}$/.test(role)) continue;
    const id = `source:${role}`;
    if (typeof value === 'string') {
      const field: TextField | null = role === 'et0' ? 'et0' : role === 'yield_labels' ? 'yield_labels' : null;
      const description: ReportTextFact = field ? classifyText(field, value, 'en') : { kind: 'text', text: sanitizeSourceText(value) || '[empty]', lang: null };
      out.push({ id, role, provider: null, product: null, description: warn(role, description), availability: null, file_period: null, covers_after_as_of: false, sha256: null });
      continue;
    }
    if (typeof value !== 'object') continue;
    const record = value as Record<string, unknown>;
    const period = record.period as { start?: unknown; end?: unknown } | undefined;
    const filePeriod = period && typeof period.start === 'string' && typeof period.end === 'string' && DAY.test(period.start) && DAY.test(period.end) ? { start: period.start, end: period.end } : null;
    const after = !!filePeriod && filePeriod.end > asOf;
    if (after) warnings.push({ code: 'source_covers_after_cutoff', subject: role });
    // File names, variable maps and any other key of the provenance object are deliberately not copied.
    out.push({ id, role, provider: clean(record.provider), product: clean(record.product), description: null,
      availability: typeof record.availability === 'string' ? warn('availability', classifyText('availability', record.availability, 'en')) : null,
      file_period: filePeriod, covers_after_as_of: after, sha256: typeof record.sha256 === 'string' && HEX64.test(record.sha256) ? record.sha256 : null });
  }
  return out;
}

export function buildReportFacts(input: VerifiedReportInput): ReportFacts {
  const { run } = input;
  if (run.execution_status !== 'succeeded') throw new ApiError(409, 'simulation_not_succeeded', `The simulation is ${run.execution_status}; a report exists only for a succeeded run`);
  if (input.visibility !== 'public_regional') throw new ApiError(404, 'not_found', 'Resource not found');
  const scope = normalizeScope(input.scope, run);
  const warnings: ReportWarning[] = [];
  const warn: Warn = (subject, fact) => { if (fact.kind === 'text') warnings.push({ code: 'untranslated_source_text', subject }); return fact; };
  const series = input.series.status === 'available' ? input.series.data : null;
  if (input.series.status === 'integrity_failed') warnings.push({ code: 'series_integrity_failed', subject: 'series' });

  const inScope = [...run.seasons].sort(bySeason).filter(s => scope.kind === 'run' || (s.crop_id === scope.crop_id && s.harvest_year === scope.harvest_year));
  let charted = 0;
  const seasons: ReportSeasonFacts[] = inScope.map(s => {
    const id = seasonId(s);
    const metrics: ReportMetricFact[] = Object.entries(s.quantiles).map(([metricId, q]) => {
      const definition = METRICS[metricId];
      if (!definition) warnings.push({ code: 'unknown_metric', subject: metricId.slice(0, 256) });
      return { id: `${id}:metric:${metricId}`, metric_id: metricId, known: !!definition, unit: definition?.unit ?? null, p10: q.p10, p50: q.p50, p90: q.p90, n: q.n };
    }).sort((a, b) => (METRICS[a.metric_id]?.order ?? 99) - (METRICS[b.metric_id]?.order ?? 99) || a.metric_id.localeCompare(b.metric_id));
    const events = s.events.map(e => {
      const fact = eventFact(`${id}:event:${e.event_id}`, e);
      if (!fact.known) warnings.push({ code: 'unknown_event', subject: e.event_id.slice(0, 256) });
      if (fact.count_status === 'inconsistent') warnings.push({ code: 'event_share_inconsistent', subject: `${id}:${e.event_id}`.slice(0, 256) });
      return fact;
    }).sort((a, b) => (EVENTS[a.event_id]?.order ?? 99) - (EVENTS[b.event_id]?.order ?? 99) || a.event_id.localeCompare(b.event_id));
    const rule = run.calendar_rules.find(r => r.harvest_year === s.harvest_year && r.used === s.sowing_date);
    const fromSeries = series ? seriesFacts(s, series) : null;
    if (fromSeries) charted++;
    return {
      id, crop_id: s.crop_id, harvest_year: s.harvest_year, season_label: s.season_label, sowing_date: s.sowing_date, expected_harvest_date: s.expected_harvest_date, cycle_days: s.cycle_days,
      calendar_source: warn('calendar_source', classifyText('calendar_source', s.calendar_source, 'en')), calendar_rule: rule ? { rule: rule.rule, state_calendar: rule.state_calendar, used: rule.used } : null,
      interval_method: s.interval_method, metrics, events, yield: yieldFact(`${id}:yield`, s.yield, warn),
      phases: fromSeries?.phases ?? null, trajectories: fromSeries?.trajectories ?? null, day_kinds: fromSeries?.day_kinds ?? null,
    };
  });

  const limitations = run.limitations.map((text, i) => ({ id: `limitation:${i + 1}`, fact: warn('limitation', classifyLimitation(text)) }));
  const sources = input.artifacts.filter((a): a is { kind: 'run' | 'series'; sha256: string; bytes: number } => a.kind === 'run' || (a.kind === 'series' && !!series)).map(a => ({ kind: a.kind, sha256: a.sha256, bytes: a.bytes }));
  const data_sources = dataSources(run, warn, warnings);
  const sensitivity = Object.entries(run.initial_condition.sensitivity).flatMap(([fraction, bySeasonKey]) => Object.entries(bySeasonKey).map(([season_key, value]) => ({ storage_fraction: Number(fraction), season_key, value })))
    .filter(x => Number.isFinite(x.storage_fraction) && (scope.kind === 'run' || x.season_key === `${scope.crop_id}:${scope.harvest_year}`))
    .sort((a, b) => a.storage_fraction - b.storage_fraction || a.season_key.localeCompare(b.season_key));

  const charts: Facts['charts'] = input.series.status === 'absent' ? { status: 'unavailable', reason_code: 'no_series_artifact' }
    : input.series.status === 'integrity_failed' ? { status: 'unavailable', reason_code: 'series_integrity_failed' }
    : charted === 0 ? { status: 'unavailable', reason_code: 'season_outside_series' }
    : charted < seasons.length ? { status: 'partial', reason_code: 'season_outside_series' } : { status: 'available', reason_code: null };

  // Summary rules (deterministic, at most three, never the same indicator twice).
  const conclusions: ReportConclusion[] = [];
  const deficits = seasons.flatMap(s => s.metrics.filter(m => m.metric_id === 'crop_deficit_mm' && m.known));
  if (deficits.length === 1) conclusions.push({ code: 'water_deficit_season', evidence_ids: [deficits[0]!.id] });
  else if (deficits.length > 1) conclusions.push({ code: 'water_deficit_highest', evidence_ids: [deficits.reduce((best, m) => (m.p50 > best.p50 ? m : best), deficits[0]!).id] });
  const events = seasons.flatMap(s => s.events).filter(e => e.known && e.count !== null && !(deficits.length && EVENTS[e.event_id]!.indicator === 'deficit'));
  if (events.length) conclusions.push({ code: 'event_frequency', evidence_ids: [events.reduce((best, e) => (e.share_of_members > best.share_of_members ? e : best), events[0]!).id] });
  const yields = seasons.map(s => s.yield);
  const withYield = yields.filter(y => y.variant !== 'unavailable');
  if (withYield.length) conclusions.push({ code: 'yield_overview', evidence_ids: withYield.slice(0, 6).map(y => y.id) });
  else if (yields.length) conclusions.push({ code: 'yield_unavailable', evidence_ids: yields.slice(0, 6).map(y => y.id) });

  const caveat: Facts['caveat'] = run.soil.is_hypothesis ? { code: 'soil_capacity_hypothesis', evidence_ids: ['soil'] }
    : run.ensemble.coverage_class === 'limited' ? { code: 'coverage_limited', evidence_ids: ['ensemble'] } : { code: 'scenarios_not_forecast', evidence_ids: ['run'] };

  // Next steps: each one points at a concrete assumption or gap of this run. Never an agronomic prescription.
  const actions: ReportAction[] = [];
  if (run.soil.is_hypothesis) actions.push({ code: 'check_soil_capacity', evidence_ids: ['soil'] });
  const reference = yields.find(y => y.variant === 'historical_reference'), model = yields.find(y => y.variant === 'model');
  if (reference) actions.push({ code: 'check_recent_yield_data', evidence_ids: [reference.id] });
  else if (model) actions.push({ code: 'treat_model_yield_as_research', evidence_ids: [model.id] });
  else if (yields.length) actions.push({ code: 'obtain_local_yield', evidence_ids: [yields[0]!.id] });
  actions.push({ code: 'request_paired_management_run', evidence_ids: ['management'] });
  const shifted = seasons.find(s => s.calendar_rule);
  if (actions.length < 3 && seasons.length) actions.push({ code: 'check_sowing_calendar', evidence_ids: [(shifted ?? seasons[0]!).id] });

  const unique = warnings.filter((w, i) => warnings.findIndex(x => x.code === w.code && x.subject === w.subject) === i);
  const untranslated = unique.some(w => w.code === 'untranslated_source_text');
  const anyWater = seasons.some(s => s.metrics.some(m => m.known && METRICS[m.metric_id]!.block === 'water'));
  const unknownStats = unique.some(w => w.code === 'unknown_metric' || w.code === 'unknown_event' || w.code === 'event_share_inconsistent');
  const sections: ReportSectionStatus[] = [
    { id: 'identification', status: 'available', reason_code: null },
    { id: 'summary', status: 'available', reason_code: null },
    !anyWater ? { id: 'results', status: 'unavailable', reason_code: 'no_seasonal_statistics' } : unknownStats ? { id: 'results', status: 'partial', reason_code: 'unknown_metrics_present' } : { id: 'results', status: 'available', reason_code: null },
    { id: 'charts', ...charts },
    withYield.length ? { id: 'yield_economics', status: 'partial', reason_code: 'economics_not_integrated' } : { id: 'yield_economics', status: 'unavailable', reason_code: 'yield_and_economics_unavailable' },
    untranslated ? { id: 'methods', status: 'partial', reason_code: 'untranslated_source_notes' } : { id: 'methods', status: 'available', reason_code: null },
  ];

  return {
    contract: 'simulation-technical-report-facts.v1', scope,
    run: { run_id: run.run_id, protocol_id: run.protocol_id, location_id: run.location_id, place_name: run.place_name, state_code: run.state_code, plan_id: run.plan_id, output_mode: run.output_mode,
      execution_status: 'succeeded', as_of: run.as_of, issued_at: run.issued_at, simulation_start: run.simulation_start, simulation_end: run.simulation_end, harvest_years: [...run.harvest_years],
      visibility: 'public_regional', spatial_scale: 'regional', seasons_in_run: run.seasons.length, identity_sha256: run.checksums.identity_sha256, series_sha256: run.checksums.series_sha256 },
    sources, scientific_status: { ...run.scientific_status },
    weather_segments: run.weather_segments.map(s => ({ kind: s.kind, start: s.start, end: s.end, origin: classifyText('segment_origin', s.origin, 'en') })),
    seasons,
    ensemble: { method: run.ensemble.method, members: run.ensemble.members, effective_source_years: run.ensemble.effective_source_years, analog_years: [...run.ensemble.analog_years], eligible_years: run.ensemble.eligible_years.length,
      excluded_years: Object.entries(run.ensemble.excluded_years).map(([year, reason]) => ({ year: Number(year), reason: warn('excluded_reason', classifyText('excluded_reason', reason, 'en')) })).filter(x => Number.isInteger(x.year)).sort((a, b) => a.year - b.year),
      coverage_class: run.ensemble.coverage_class, seed: run.ensemble.seed, analog_years_requested: run.ensemble.analog_years_requested !== null,
      calendar_mapping: { method: run.ensemble.calendar_mapping.method, max_month_day_drift_days: run.ensemble.calendar_mapping.max_month_day_drift_days, note: warn('calendar_note', classifyText('calendar_note', run.ensemble.calendar_mapping.note, 'en')) } },
    soil: { capacity_mm: run.soil.capacity_mm, profile_id: run.soil.profile_id, is_hypothesis: run.soil.is_hypothesis },
    initial_condition: { storage_fraction: run.initial_condition.storage_fraction, is_hypothesis: run.initial_condition.is_hypothesis, warm_up: run.initial_condition.warm_up ? { ...run.initial_condition.warm_up } : null,
      sensitivity, sensitivity_metric: warn('sensitivity_metric', classifyText('sensitivity_metric', run.initial_condition.sensitivity_metric, 'en')) },
    engine: { version: run.engine.version, parameter_set_id: run.engine.parameter_set_id },
    representative: { central: run.representative.central, dry: run.representative.dry, wet: run.representative.wet, rule: warn('representative_rule', classifyText('representative_rule', run.representative.rule, 'en')) },
    data_sources, limitations,
    economics: { status: 'unavailable', reason_code: 'no_integrated_budget' },
    management_comparison: { status: 'unavailable', reason_code: 'no_paired_management_result' },
    charts, conclusions: conclusions.slice(0, 3) as Facts['conclusions'], caveat, actions: actions.slice(0, 3) as Facts['actions'], sections,
    warnings: unique,
  };
}

/** SHA-256 of the canonical serialisation of the facts: no language, no translated text, no generation time. */
export function factsDigest(facts: ReportFacts): string {
  return createHash('sha256').update(canonicalJson(facts)).digest('hex');
}

/** The fact an evidence id points at, or undefined. Conclusions and next steps must always resolve. */
export function resolveEvidence(facts: ReportFacts, id: string): unknown {
  const fixed: Record<string, unknown> = { run: facts.run, soil: facts.soil, ensemble: facts.ensemble, initial_condition: facts.initial_condition, economics: facts.economics, management: facts.management_comparison };
  if (id in fixed) return fixed[id];
  for (const season of facts.seasons) {
    if (season.id === id) return season;
    if (season.yield.id === id) return season.yield;
    const hit = season.metrics.find(m => m.id === id) ?? season.events.find(e => e.id === id);
    if (hit) return hit;
  }
  return facts.limitations.find(l => l.id === id) ?? facts.data_sources.find(s => s.id === id);
}
/** The season that owns a metric, event or yield fact. */
export function seasonOfEvidence(facts: ReportFacts, id: string): ReportSeasonFacts | undefined {
  return facts.seasons.find(s => id === s.id || id.startsWith(`${s.id}:`));
}
