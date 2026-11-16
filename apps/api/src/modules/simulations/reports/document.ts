// Deterministic narrative of the report: facts in, document model out. Every sentence is a catalogue template filled
// with values of the facts; every conclusion and next step names the facts it was derived from. No generative model
// is involved and no number is computed here beyond presentation rounding.
import type { ReportBlock, ReportDocument, ReportEventFact, ReportFacts, ReportMetricFact, ReportSeasonFacts, ReportSection, ReportSectionId, ReportTable, ReportTextFact, ReportYieldFact, SimulationSeries } from '@gaiapus/contracts';
import { resolveEvidence, seasonOfEvidence } from './facts.js';
import type { ReportFormatters } from './format.js';
import type { MessageVars, ReportMessageKey, Span, Translator } from './messages/index.js';
import { METRICS, REPORT_TEMPLATE_VERSION } from './registry.js';
import { seasonCharts } from './chart.js';

export interface DocumentContext {
  facts: ReportFacts; t: Translator; f: ReportFormatters;
  report_id: string; facts_digest: string; generated_at: string; translation_version: string;
  /** Verified series of the representative members; null when the report has no usable series. */
  series: SimulationSeries | null;
}
type Yield = ReportYieldFact;
const text = (value: string): Span[] => [{ text: value }];
const code = (value: string): Span => ({ text: value, style: 'code' });
const join = (parts: Span[][], separator = ' '): Span[] => parts.filter(p => p.length).flatMap((p, i) => (i ? [{ text: separator }, ...p] : p));
const paragraph = (content: Span[], tone?: 'note' | 'warning', evidence_ids?: string[]): ReportBlock => ({ type: 'paragraph', content, ...(tone ? { tone } : {}), ...(evidence_ids?.length ? { evidence_ids } : {}) });
const heading = (value: string): ReportBlock => ({ type: 'heading', text: value });
const column = (header: string, numeric = false) => ({ header, numeric });

export function buildDocument(context: DocumentContext): ReportDocument {
  const { facts, t, f } = context;
  const cropName = (id: string) => t.lookup('crop', id) ?? id;
  const seasonName = (s: { crop_id: string; season_label: string }) => t.text('common.seasonName', { crop: cropName(s.crop_id), label: s.season_label });
  /** A known code in the report language, or the original text quoted and labelled as untranslated. */
  const fact = (value: ReportTextFact): Span[] => (value.kind === 'code'
    ? text(t.lookup('text', value.code) ?? t.lookup('limitation', value.code) ?? value.code)
    : [{ text: `“${value.text}”`, ...(value.lang ? { lang: value.lang } : {}) }, { text: ` ${t.text('common.originalInline')}` }]);
  /** A method or rule identifier: its registered description, or the identifier itself shown as code. */
  const method = (id: string): Span[] => { const known = t.lookup('methodName', id); return known ? text(known) : [code(id)]; };
  const origin = (isHypothesis: boolean) => t.text(isHypothesis ? 'common.hypothesis' : 'common.measured');
  const sectionOf = (id: ReportSectionId) => facts.sections.find(s => s.id === id)!;
  const section = (id: ReportSectionId, technical: boolean, blocks: ReportBlock[]): ReportSection => {
    const status = sectionOf(id);
    const lead = status.reason_code ? [paragraph(text(t.text(`sectionReason.${status.reason_code}`)), status.status === 'unavailable' ? 'warning' : 'note')] : [];
    return { id, title: t.text(`section.${id}`), status: status.status, reason_code: status.reason_code, technical, blocks: [...lead, ...blocks] };
  };
  const harvestYears = [...new Set(facts.seasons.map(s => s.harvest_year))].sort((a, b) => a - b);
  const yearsText = f.list(harvestYears.map(y => f.year(y)));
  const crops = [...new Set(facts.seasons.map(s => s.crop_id))].map(cropName);
  const scaleKey = (y: Exclude<Yield, { variant: 'unavailable' }>) => (y.scale.kind === 'other' ? 'unspecified' : y.scale.kind);
  const scaleNoun = (y: Exclude<Yield, { variant: 'unavailable' }>) => t.text(`yield.scaleNoun.${scaleKey(y)}`);
  /** Sentence case for a fragment that opens a sentence, a list item or a table row. */
  const cap = (spans: Span[]): Span[] => (spans.length && spans[0]!.text ? [{ ...spans[0]!, text: spans[0]!.text.charAt(0).toLocaleUpperCase(t.locale) + spans[0]!.text.slice(1) }, ...spans.slice(1)] : spans);
  const capText = (value: string) => value.charAt(0).toLocaleUpperCase(t.locale) + value.slice(1);

  // A. Identification and validity -------------------------------------------------------------------------------
  const run = facts.run;
  const status = facts.scientific_status;
  const scopeText = facts.scope.kind === 'run' ? t.text('subtitleRun', { count: facts.seasons.length }) : t.text('subtitleSeason', { season: seasonName(facts.seasons[0]!), total: run.seasons_in_run });
  const identification = section('identification', false, [
    { type: 'definitions', items: [
      { term: t.text('identification.report'), content: text(t.text('identification.reportValue', { template: REPORT_TEMPLATE_VERSION, translation: context.translation_version })) },
      { term: t.text('identification.runId'), content: [code(run.run_id)] },
      { term: t.text('identification.place'), content: text(t.text('identification.placeValue', { place: run.place_name, state: run.state_code, location: run.location_id })) },
      { term: t.text('identification.scale'), content: text(t.text('identification.scaleValue')) },
      { term: t.text('identification.plan'), content: [code(run.plan_id), { text: ` — ${f.list(crops)}` }] },
      { term: t.text('identification.scope'), content: text(scopeText) },
      { term: t.text('identification.period'), content: text(t.text('common.range', { start: f.date(run.simulation_start), end: f.date(run.simulation_end) })) },
      { term: t.text('identification.asOf'), content: text(f.instant(run.as_of)) },
      { term: t.text('identification.issuedAt'), content: text(f.instant(run.issued_at)) },
      { term: t.text('identification.generatedAt'), content: text(f.instant(context.generated_at)) },
      { term: t.text('identification.outputMode'), content: text(t.text(`outputMode.${run.output_mode}`)) },
      { term: t.text('identification.status'), content: text(t.text('identification.statusValue', { weather: t.text(`scientificStatus.${status.weather}`), water: t.text(`scientificStatus.${status.water_balance}`),
        phenology: t.text(`scientificStatus.${status.phenology}`), yield: t.text(`scientificStatus.${status.yield}`) })) },
    ] },
    { type: 'table', caption: t.text('identification.seasonsCaption'),
      columns: [column(t.text('identification.colCrop')), column(t.text('identification.colSeason')), column(t.text('identification.colSowing')), column(t.text('identification.colHarvest')), column(t.text('identification.colCycle'), true), column(t.text('identification.colCalendar'))],
      rows: facts.seasons.map(s => ({ cells: [text(capText(cropName(s.crop_id))), text(s.season_label), text(f.date(s.sowing_date)), text(f.date(s.expected_harvest_date)), text(f.count(s.cycle_days)), fact(s.calendar_source)] })), notes: [] },
    paragraph(text(t.text('identification.datesNote')), 'note'),
    // The historical-scenario sentence is only true of that kind of run; a forecast run gets its own wording.
    paragraph(text(run.output_mode === 'simulation_conditional_on_historical_weather' ? t.text('identification.scenarioNote', { years: yearsText }) : t.text('identification.forecastNote')), 'note', ['run']),
  ]);

  // B. Summary for the producer ----------------------------------------------------------------------------------
  const sentence = (key: ReportMessageKey, vars?: MessageVars) => t.rich(key, vars);
  const yieldSentence = (y: Yield): Span[] => {
    const s = seasonOfEvidence(facts, y.id)!;
    if (y.variant === 'historical_reference') return sentence('conclusion.yieldReference', { season: seasonName(s), value: f.kgHa(y.value_kg_ha), years: f.years(y.years_used) });
    if (y.variant === 'model') return sentence('conclusion.yieldModel', { season: seasonName(s), value: f.kgHa(y.value_kg_ha), scale: t.text(`yield.scaleShort.${scaleKey(y)}`), status: t.text(`researchStatus.${y.research_status}`) });
    return [];
  };
  const conclusions = facts.conclusions.map((c): Span[] => cap(conclusion(c)));
  function conclusion(c: ReportFacts['conclusions'][number]): Span[] {
    if (c.code === 'water_deficit_season' || c.code === 'water_deficit_highest') {
      const m = resolveEvidence(facts, c.evidence_ids[0]!) as ReportMetricFact, s = seasonOfEvidence(facts, m.id)!;
      const below = [m.p10, m.p50, m.p90].some(v => f.belowPrecision(v, 'mm'));
      return join([sentence(`conclusion.${c.code}`, { n: f.count(m.n), count: f.count(facts.seasons.length), season: seasonName(s), p50: f.mm(m.p50), p10: f.mm(m.p10), p90: f.mm(m.p90) }),
        below ? text(t.text('conclusion.belowPrecision')) : [], text(t.text('conclusion.notIrrigation'))]);
    }
    if (c.code === 'event_frequency') {
      const e = resolveEvidence(facts, c.evidence_ids[0]!) as ReportEventFact, s = seasonOfEvidence(facts, e.id)!;
      return join([sentence('conclusion.event_frequency', { season: seasonName(s), event: t.lookup('event', e.event_id) ?? e.event_id, count: f.count(e.count ?? 0), members: f.count(e.members), share: f.percent(e.share_of_members) }),
        text(t.text('conclusion.eventNote')), e.count === 0 ? text(t.text('conclusion.eventZero')) : []]);
    }
    const yields = c.evidence_ids.map(id => resolveEvidence(facts, id) as Yield);
    if (c.code === 'yield_overview') {
      const total = facts.seasons.filter(s => s.yield.variant !== 'unavailable').length, shown = yields.slice(0, 4);
      const model = shown.find((y): y is Extract<Yield, { variant: 'model' }> => y.variant === 'model');
      return join([...shown.map(y => cap(yieldSentence(y))), total > shown.length ? text(t.text('conclusion.yieldMore', { count: total - shown.length })) : [],
        shown.some(y => y.variant === 'historical_reference') ? text(t.text('conclusion.yieldReferenceNote')) : [], model ? text(t.text('conclusion.yieldModelNote', { scale: scaleNoun(model) })) : []]);
    }
    // yield_unavailable: one sentence per distinct reason, never a substitute number.
    const reasons = [...new Set(yields.flatMap(y => (y.variant === 'unavailable' ? [y.reason_code] : [])))];
    return join(reasons.map(reason => text(t.text('conclusion.yield_unavailable', { reason: t.text(`reason.${reason}`),
      seasons: f.list(yields.filter(y => y.variant === 'unavailable' && y.reason_code === reason).map(y => seasonName(seasonOfEvidence(facts, y.id)!))) }))));
  }
  const caveat = facts.caveat.code === 'soil_capacity_hypothesis' ? sentence('caveat.soil_capacity_hypothesis', { capacity: f.generic(facts.soil.capacity_mm), profile: facts.soil.profile_id })
    : facts.caveat.code === 'coverage_limited' ? sentence('caveat.coverage_limited', { years: f.count(facts.ensemble.effective_source_years) }) : sentence('caveat.scenarios_not_forecast');
  const actions = facts.actions.map((a): Span[] => {
    const target = resolveEvidence(facts, a.evidence_ids[0]!);
    switch (a.code) {
      case 'check_soil_capacity': return sentence('action.check_soil_capacity', { capacity: f.generic(facts.soil.capacity_mm) });
      case 'check_recent_yield_data': { const y = target as Extract<Yield, { variant: 'historical_reference' }>; return sentence('action.check_recent_yield_data', { year: f.year(y.last_label_year), age: f.count(y.history_horizon_years) }); }
      case 'obtain_local_yield': { const y = target as Extract<Yield, { variant: 'unavailable' }>; return sentence('action.obtain_local_yield', { reason: t.text(`reason.${y.reason_code}`) }); }
      case 'treat_model_yield_as_research': { const y = target as Extract<Yield, { variant: 'model' }>; return sentence('action.treat_model_yield_as_research', { status: t.text(`researchStatus.${y.research_status}`), scale: scaleNoun(y) }); }
      case 'check_sowing_calendar': { const s = target as ReportSeasonFacts; return sentence('action.check_sowing_calendar', { season: seasonName(s), date: f.date(s.sowing_date) }); }
      default: return sentence('action.request_paired_management_run');
    }
  });
  const untranslated = facts.warnings.some(w => w.code === 'untranslated_source_text');
  const summary = section('summary', false, [
    heading(t.text('summary.conclusionsTitle')),
    { type: 'list', ordered: false, items: conclusions },
    paragraph(text(t.text('summary.noVerdict')), 'note', facts.conclusions.flatMap(c => c.evidence_ids)),
    heading(t.text('summary.caveatTitle')),
    paragraph(caveat, 'warning', facts.caveat.evidence_ids),
    ...(untranslated ? [paragraph(text(t.text('summary.untranslatedNote')), 'note')] : []),
    heading(t.text('summary.actionsTitle')),
    { type: 'list', ordered: true, items: actions },
    paragraph(text(t.text('summary.actionsNote')), 'note', facts.actions.flatMap(a => a.evidence_ids)),
  ]);

  // C. Results by crop and season --------------------------------------------------------------------------------
  const quantileColumns = [column(t.text('results.colP10'), true), column(t.text('results.colP50'), true), column(t.text('results.colP90'), true), column(t.text('results.colN'), true)];
  const results = section('results', true, facts.seasons.flatMap((s): ReportBlock[] => {
    const name = seasonName(s);
    const water = s.metrics.filter(m => m.known && METRICS[m.metric_id]!.block === 'water'), unknown = s.metrics.filter(m => !m.known);
    const has = (id: string) => water.some(m => m.metric_id === id);
    const dayMetrics = water.filter(m => m.unit === 'days'), fractional = [...dayMetrics.map(m => m.p50), ...dayMetrics.flatMap(m => [m.p10, m.p90])].find(v => !Number.isInteger(v));
    const below = water.some(m => [m.p10, m.p50, m.p90].some(v => f.belowPrecision(v, m.unit!)));
    const notes: Span[][] = [text(t.text('results.notes.quantiles')), join([text(t.text('results.notes.spread', { method: t.lookup('methodName', s.interval_method) ?? s.interval_method }))]),
      ...(has('crop_etc_mm') ? [text(t.text('results.notes.etc'))] : []), ...(has('crop_eta_mm') ? [text(t.text('results.notes.eta'))] : []), ...(has('crop_deficit_mm') ? [text(t.text('results.notes.deficit'))] : []),
      ...(fractional !== undefined ? [text(t.text('results.notes.fractionalDays', { example: f.days(fractional) }))] : []), ...(below ? [text(t.text('results.notes.belowPrecision'))] : []),
      ...(dayMetrics.some(m => m.metric_id.includes('stress')) ? [text(t.text('results.notes.stress'))] : [])];
    const blocks: ReportBlock[] = [heading(t.text('results.seasonHeading', { crop: capText(cropName(s.crop_id)), label: s.season_label, year: f.year(s.harvest_year) })),
      paragraph(t.rich('results.calendar', { sowing: f.date(s.sowing_date), harvest: f.date(s.expected_harvest_date), days: f.count(s.cycle_days), source: fact(s.calendar_source) }), undefined, [s.id])];
    if (s.calendar_rule) blocks.push(paragraph(text(t.text('results.calendarRule', { original: f.date(s.calendar_rule.state_calendar), used: f.date(s.calendar_rule.used), rule: t.lookup('methodName', s.calendar_rule.rule) ?? s.calendar_rule.rule })), 'note', [s.id]));
    if (water.length) blocks.push({ type: 'table', caption: t.text('results.tableCaption', { season: name }), columns: [column(t.text('results.colIndicator')), column(t.text('results.colUnit')), ...quantileColumns],
      rows: water.map(m => ({ cells: [text(t.lookup('metric', m.metric_id) ?? m.metric_id), text(t.text(`common.${m.unit!}`)), text(f.byUnit(m.p10, m.unit!)), text(f.byUnit(m.p50, m.unit!)), text(f.byUnit(m.p90, m.unit!)), text(f.count(m.n))] })), notes });
    else blocks.push(paragraph(text(t.text('results.noStatistics')), 'warning'));
    if (unknown.length) blocks.push({ type: 'table', caption: t.text('results.unknownCaption', { season: name }), columns: [column(t.text('results.colIdentifier')), ...quantileColumns],
      rows: unknown.map(m => ({ cells: [[code(m.metric_id)], text(f.generic(m.p10)), text(f.generic(m.p50)), text(f.generic(m.p90)), text(f.count(m.n))] })), notes: [text(t.text('results.unknownNote'))] });
    if (s.events.length) blocks.push({ type: 'table', caption: t.text('results.eventsCaption', { season: name }), columns: [column(t.text('results.colEvent')), column(t.text('results.colCount'), true), column(t.text('results.colFrequency'), true)],
      rows: s.events.map(e => ({ cells: [e.known ? text(capText(t.lookup('event', e.event_id) ?? e.event_id)) : [code(e.event_id), { text: ` — ${t.text('results.eventUnknown')}` }],
        text(e.count === null ? t.text('results.eventInconsistent', { members: f.count(e.members) }) : t.text('results.eventCount', { count: f.count(e.count), members: f.count(e.members) })),
        text(e.count === null ? t.text('common.notAvailable') : f.percent(e.share_of_members))] })), notes: [text(t.text('results.eventsNote'))] });
    if (s.phases) blocks.push({ type: 'table', caption: t.text('results.phasesCaption', { season: name }), columns: [column(t.text('results.colPhase')), column(t.text('results.colStart')), column(t.text('results.colEnd')), column(t.text('results.colDays'), true)],
      rows: s.phases.map(p => ({ cells: [text(capText(t.lookup('phase', p.phase_code) ?? p.phase_code)), text(f.date(p.start)), text(f.date(p.end)), text(f.count(p.days))] })), notes: [text(t.text('results.phasesNote'))] });
    return blocks;
  }));

  // D. Supporting charts ------------------------------------------------------------------------------------------
  const chartBlocks: ReportBlock[] = [];
  if (context.series && facts.charts.status !== 'unavailable') {
    chartBlocks.push(paragraph(t.rich('charts.rule', { rule: fact(facts.representative.rule) }), undefined, ['run']),
      paragraph(text(`${t.text('charts.wholeRun')} ${t.text('charts.centralNote')}`), 'note'), paragraph(text(`${t.text('charts.bandNote')} ${t.text('charts.notEnsemble')}`), 'note'));
    for (const s of facts.seasons) {
      const charts = seasonCharts(s, seasonName(s), context.series, t, f);
      if (!charts) continue;
      chartBlocks.push(charts.storage, charts.deficit);
      if (s.day_kinds) chartBlocks.push(paragraph(text(t.text('charts.dayKinds', { kinds: f.list(s.day_kinds.map(k => t.text('charts.dayKind', { kind: t.text(`weatherKind.${k.kind}`), start: f.date(k.start), end: f.date(k.end) }))) }))));
      chartBlocks.push(paragraph(text(charts.reduced === null ? t.text('charts.resolution', { days: f.count(charts.days) }) : t.text('charts.reduced', { days: f.count(charts.days), points: f.count(charts.reduced) })), 'note'));
    }
  }
  const charts = section('charts', true, chartBlocks);

  // E. Yield, economics and alternatives --------------------------------------------------------------------------
  const yieldBlocks = facts.seasons.flatMap((s): ReportBlock[] => {
    const y = s.yield, name = seasonName(s);
    const blocks: ReportBlock[] = [heading(t.text('yield.seasonHeading', { season: name }))];
    if (y.variant === 'unavailable') return [...blocks, paragraph(text(t.text('yield.unavailable', { reason: t.text(`reason.${y.reason_code}`) })), 'warning', [y.id])];
    const scale = y.scale.kind === 'municipal' ? t.text('yield.scaleMunicipal') : y.scale.kind === 'county' ? t.text('yield.scaleCounty') : t.text('yield.scaleOther', { original: y.scale.original });
    const items = [
      { term: t.text('yield.kind'), content: text(t.text(y.variant === 'historical_reference' ? 'yield.kindReference' : 'yield.kindModel')) },
      { term: t.text('yield.value'), content: [{ text: t.text('yield.valueText', { value: f.kgHa(y.value_kg_ha) }), style: 'strong' as const }] },
      { term: t.text('yield.status'), content: text(t.text(`yieldStatus.${y.status}`)) },
      { term: t.text('yield.researchStatus'), content: text(t.text(`researchStatus.${y.research_status}`)) },
      { term: t.text('yield.method'), content: method(y.method) },
      ...(y.variant === 'model' ? [{ term: t.text('yield.modelVersion'), content: [code(y.model_version)] }, { term: t.text('yield.position'), content: text(t.text(`position.${y.position_vs_season}`)) }] : []),
      { term: t.text('yield.scale'), content: text(scale) },
      ...(y.variant === 'historical_reference' ? [{ term: t.text('yield.yearsUsed'), content: text(f.years(y.years_used)) }] : []),
      { term: t.text('yield.lastLabel'), content: text(f.year(y.last_label_year)) },
      { term: t.text('yield.horizon'), content: text(f.count(y.history_horizon_years)) },
      { term: t.text('yield.releaseRule'), content: fact(y.label_release_rule) },
      { term: t.text('yield.conditional'), content: text(t.text(y.conditional_on_scenario ? 'yield.conditionalYes' : 'yield.conditionalNo')) },
      // The two ranges mean different things and each one is shown only when published, with its own method.
      ...(y.variant === 'model' ? [
        { term: t.text('yield.scenarioRange'), content: y.scenario_range ? t.rich('yield.rangeValue', { p10: f.kgHa(y.scenario_range.p10), p50: f.kgHa(y.scenario_range.p50), p90: f.kgHa(y.scenario_range.p90), method: method(y.scenario_range.method) }) : text(t.text('yield.rangeAbsent')) },
        { term: t.text('yield.predictiveRange'), content: y.predictive_range ? t.rich('yield.rangeValue', { p10: f.kgHa(y.predictive_range.p10), p50: f.kgHa(y.predictive_range.p50), p90: f.kgHa(y.predictive_range.p90), method: method(y.predictive_range.interval_method) }) : text(t.text('yield.rangeAbsent')) },
      ] : []),
      // The spread of the modelled yield is shown once: from the range when published, else from the seasonal quantiles.
      ...s.metrics.filter(m => m.known && METRICS[m.metric_id]!.block === 'yield' && !(y.variant === 'model' && y.scenario_range)).map(m => ({ term: t.text('yield.scenarioQuantiles'), content: text(t.text('yield.scenarioQuantilesValue', { p10: f.kgHa(m.p10), p50: f.kgHa(m.p50), p90: f.kgHa(m.p90), n: f.count(m.n) })) })),
      ...(y.exposure_flags.length ? [{ term: t.text('yield.exposure'), content: join(y.exposure_flags.map(flag => [code(flag)]), ', ') }] : []),
    ];
    return [...blocks, { type: 'definitions', items }, paragraph(text(t.text(y.variant === 'historical_reference' ? 'yield.referenceNote' : 'yield.modelNote')), 'note', [y.id])];
  });
  const yieldEconomics = section('yield_economics', false, [...yieldBlocks,
    paragraph(text(t.text('yield.production')), 'note'),
    heading(t.text('yield.economicsHeading')), paragraph([{ text: t.text('yield.economics'), style: 'strong' }], 'warning', ['economics']), paragraph(text(t.text('yield.economicsDetail'))),
    heading(t.text('yield.managementHeading')), paragraph([{ text: t.text('yield.management'), style: 'strong' }], 'warning', ['management']), paragraph(text(`${t.text('yield.managementDetail')} ${t.text('yield.irrigation')}`)),
  ]);

  // F. Assumptions, methods and traceability ----------------------------------------------------------------------
  const ensemble = facts.ensemble, initial = facts.initial_condition;
  const hash = (value: string | undefined) => (value ? [code(value)] : text(t.text('methods.seriesNotUsed')));
  const intervalMethods = [...new Set(facts.seasons.map(s => s.interval_method))];
  const sensitivityTable: ReportTable | null = initial.sensitivity.length ? { type: 'table', caption: t.text('methods.sensitivityCaption'),
    columns: [column(t.text('methods.colFraction'), true), column(t.text('methods.colSeasonKey')), column(t.text('methods.colEffect'), true)],
    rows: initial.sensitivity.map(x => ({ cells: [text(f.fraction(x.storage_fraction)), [code(x.season_key)], text(f.generic(x.value))] })),
    notes: [t.rich('methods.sensitivityMetric', { metric: fact(initial.sensitivity_metric) }), text(t.text('methods.sensitivityNote'))] } : null;
  const rules = facts.seasons.flatMap(s => (s.calendar_rule ? [{ s, rule: s.calendar_rule }] : []));
  const afterCutoff = facts.data_sources.filter(s => s.covers_after_as_of && s.file_period);
  const roleName = (role: string) => t.lookup('methods.role', role) ?? t.text('methods.roleOther', { role });
  const methods = section('methods', true, [
    heading(t.text('methods.soilHeading')),
    { type: 'definitions', items: [
      { term: t.text('methods.capacity'), content: text(t.text('methods.capacityValue', { capacity: f.generic(facts.soil.capacity_mm), origin: origin(facts.soil.is_hypothesis) })) },
      { term: t.text('methods.profile'), content: [code(facts.soil.profile_id)] },
      { term: t.text('methods.initial'), content: text(t.text('methods.initialValue', { fraction: f.fraction(initial.storage_fraction), origin: origin(initial.is_hypothesis) })) },
      { term: t.text('methods.warmUp'), content: text(initial.warm_up ? t.text('methods.warmUpValue', { start: f.date(initial.warm_up.start), end: f.date(initial.warm_up.end), source: t.lookup('weatherKind', initial.warm_up.source) ?? initial.warm_up.source }) : t.text('methods.warmUpNone')) },
    ] },
    ...(sensitivityTable ? [sensitivityTable] : []),
    heading(t.text('methods.ensembleHeading')),
    { type: 'definitions', items: [
      { term: t.text('methods.method'), content: method(ensemble.method) },
      { term: t.text('methods.members'), content: text(f.count(ensemble.members)) },
      { term: t.text('methods.effectiveYears'), content: text(f.count(ensemble.effective_source_years)) },
      { term: t.text('methods.analogYears'), content: text(f.years(ensemble.analog_years)) },
      { term: t.text('methods.eligible'), content: text(f.count(ensemble.eligible_years)) },
      { term: t.text('methods.excluded'), content: ensemble.excluded_years.length ? join(ensemble.excluded_years.map(x => [{ text: `${f.year(x.year)}: ` }, ...fact(x.reason)]), '; ') : text(t.text('common.none')) },
      { term: t.text('methods.requested'), content: text(t.text(ensemble.analog_years_requested ? 'common.yes' : 'common.no')) },
      { term: t.text('methods.coverage'), content: text(t.text(ensemble.coverage_class === 'standard' ? 'methods.coverageStandard' : 'methods.coverageLimited')) },
      { term: t.text('methods.seed'), content: text(f.year(ensemble.seed)) },
      { term: t.text('methods.calendarMapping'), content: t.rich('methods.calendarMappingValue', { method: method(ensemble.calendar_mapping.method), count: ensemble.calendar_mapping.max_month_day_drift_days, note: fact(ensemble.calendar_mapping.note) }) },
    ] },
    paragraph(text(t.text('methods.coverageNote')), 'note', ['ensemble']),
    { type: 'table', caption: t.text('methods.segmentsCaption'), columns: [column(t.text('methods.colKind')), column(t.text('results.colStart')), column(t.text('results.colEnd')), column(t.text('methods.colOrigin'))],
      rows: facts.weather_segments.map(w => ({ cells: [text(capText(t.text(`weatherKind.${w.kind}`))), text(f.date(w.start)), text(f.date(w.end)),
        w.origin.kind === 'code' ? fact(w.origin) : [{ text: w.origin.text, ...(w.origin.lang ? { lang: w.origin.lang } : {}) }]] })), notes: [text(t.text('methods.segmentsNote'))] },
    { type: 'table', caption: t.text('methods.sourcesCaption'), columns: [column(t.text('methods.colRole')), column(t.text('methods.colProvider')), column(t.text('methods.colAvailability')), column(t.text('methods.colFilePeriod')), column(t.text('methods.colHash'))],
      rows: facts.data_sources.map(source => ({ cells: [text(capText(roleName(source.role))),
        source.description ? fact(source.description) : text([source.provider, source.product].filter(Boolean).join(' — ') || t.text('common.notAvailable')),
        source.availability ? fact(source.availability) : text(t.text('common.notAvailable')),
        text(source.file_period ? t.text('common.range', { start: f.date(source.file_period.start), end: f.date(source.file_period.end) }) : t.text('common.notAvailable')),
        source.sha256 ? [code(source.sha256)] : text(t.text('common.notAvailable'))] })),
      notes: [text(t.text('methods.sourcesNote', { asOf: f.instant(run.as_of) })), ...afterCutoff.map(source => text(t.text('methods.sourceAfterCutoff', { role: roleName(source.role), end: f.date(source.file_period!.end) })))] },
    heading(t.text('methods.engineHeading')),
    { type: 'definitions', items: [
      { term: t.text('methods.protocol'), content: [code(run.protocol_id)] },
      { term: t.text('methods.engine'), content: [code(facts.engine.version)] },
      { term: t.text('methods.parameters'), content: [code(facts.engine.parameter_set_id)] },
      { term: t.text('methods.intervalMethod'), content: join(intervalMethods.map(method), '; ') },
      { term: t.text('methods.validation'), content: text(t.text('methods.validationValue')) },
    ] },
    ...(rules.length ? [{ type: 'table' as const, caption: t.text('methods.calendarRulesCaption'), columns: [column(t.text('methods.colRule')), column(t.text('methods.colHarvestYear')), column(t.text('methods.colCalendarDate')), column(t.text('methods.colUsedDate'))],
      rows: rules.map(({ s, rule }) => ({ cells: [method(rule.rule), text(f.year(s.harvest_year)), text(f.date(rule.state_calendar)), text(f.date(rule.used))] })), notes: [] }] : []),
    heading(t.text('methods.limitationsHeading')),
    { type: 'list', ordered: false, items: facts.limitations.filter(l => l.fact.kind === 'code').map(l => fact(l.fact)) },
    ...facts.limitations.flatMap((l): ReportBlock[] => (l.fact.kind === 'text' ? [{ type: 'quote', label: t.text('common.originalLabel'), content: [{ text: l.fact.text, ...(l.fact.lang ? { lang: l.fact.lang } : {}) }] }] : [])),
    heading(t.text('methods.hashesHeading')),
    { type: 'definitions', items: [
      { term: t.text('methods.reportId'), content: [code(context.report_id)] },
      { term: t.text('methods.factsDigest'), content: [code(context.facts_digest)] },
      { term: t.text('methods.runHash'), content: hash(facts.sources.find(s => s.kind === 'run')?.sha256) },
      { term: t.text('methods.seriesHash'), content: hash(facts.sources.find(s => s.kind === 'series')?.sha256) },
      { term: t.text('methods.identityHash'), content: [code(run.identity_sha256)] },
      { term: t.text('methods.seriesIdentityHash'), content: [code(run.series_sha256)] },
    ] },
    paragraph(text(t.text('methods.hashesNote')), 'note'),
  ]);

  const title = t.text('title', { count: harvestYears.length, place: run.place_name, crops: f.list(crops), years: yearsText });
  return { title, subtitle: scopeText, lang: t.locale, sections: [identification, summary, results, charts, yieldEconomics, methods],
    footer: text(t.text('footer', { reportId: context.report_id, digest: context.facts_digest.slice(0, 16) })) };
}
