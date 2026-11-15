// Technical report of a future-planning simulation (simulation-technical-report.v1). Additive: no existing definition
// changes and no fourth scientific artifact kind. A report is a derived, separately identified document:
//   facts          language-independent values read from a saved, verified run (never recomputed science);
//   representation the same facts rendered for one locale and display profile (document model + export hashes);
//   result         the envelope of one request, with its own locale resolution.
export function addReportDefs(defs, h) {
  const { str, text, en, arr, ref, nullable, obj, date, instant, integer, number } = h;
  const sha = { type: 'string', pattern: '^[0-9a-f]{64}$' };
  const year = integer(2000, 2100);
  const bool = { type: 'boolean' };
  const evidenceId = { type: 'string', pattern: '^[a-z0-9][A-Za-z0-9_:.>-]{0,159}$' };
  const cropId = { type: 'string', pattern: '^[a-z0-9_]{2,32}$' };
  const run = defs.SimulationRun.properties;

  defs.ReportLocale = en('pt-BR', 'en', 'es', 'fr', 'de');
  defs.ReportFormat = en('json', 'html', 'md');
  defs.ReportId = { type: 'string', pattern: '^rep_[0-9a-f]{32}$' };
  // Whole run (default) or one season of it; validated against the run on the server.
  defs.ReportScope = { oneOf: [obj({ kind: { const: 'run' } }), obj({ kind: { const: 'season' }, crop_id: cropId, harvest_year: year })] };
  // Calendar dates are never shifted; instants are shown in this IANA zone. Units stay canonical in every language.
  defs.ReportDisplayProfile = obj({ time_zone: { type: 'string', minLength: 1, maxLength: 64, pattern: '^[A-Za-z0-9_+/-]+$' }, units: { const: 'canonical_metric' } });
  // locale is untrusted text: bounded here, normalised and resolved on the server (unsupported or malformed -> en).
  defs.ReportRequest = obj({ locale: nullable({ type: 'string', maxLength: 256 }), scope: ref('ReportScope'),
    display_profile: obj({ time_zone: defs.ReportDisplayProfile.properties.time_zone }, []) }, []);
  defs.ReportQuery = obj({ report_id: ref('ReportId'), format: ref('ReportFormat') }, ['report_id']);
  defs.ReportLocaleResolution = obj({ requested_locale: nullable({ type: 'string', maxLength: 35 }), resolved_locale: ref('ReportLocale'),
    fallback_reason: nullable(en('missing', 'invalid', 'unsupported', 'catalog_unavailable')) });
  defs.ReportGenerationState = en('queued', 'running', 'succeeded', 'failed');
  defs.ReportSectionId = en('identification', 'summary', 'results', 'charts', 'yield_economics', 'methods');
  defs.ReportAvailability = en('available', 'partial', 'unavailable');
  defs.ReportReason = en('no_series_artifact', 'series_integrity_failed', 'season_outside_series', 'no_seasonal_statistics', 'unknown_metrics_present',
    'economics_not_integrated', 'yield_and_economics_unavailable', 'untranslated_source_notes');
  defs.ReportSectionStatus = obj({ id: ref('ReportSectionId'), status: ref('ReportAvailability'), reason_code: nullable(ref('ReportReason')) });
  defs.ReportWarning = obj({ code: en('unknown_metric', 'unknown_event', 'event_share_inconsistent', 'untranslated_source_text', 'series_integrity_failed', 'source_covers_after_cutoff'), subject: text });

  // A known code (translated from a versioned registry) or original free text kept as labelled evidence.
  defs.ReportTextFact = { oneOf: [obj({ kind: { const: 'code' }, code: text }), obj({ kind: { const: 'text' }, text: str(1000), lang: nullable(str(35)) })] };
  defs.ReportMetricFact = obj({ id: evidenceId, metric_id: text, known: bool, unit: nullable(en('mm', 'days', 'kg_ha')), p10: number, p50: number, p90: number, n: integer(1) });
  // count is derived from share x members only when that product is an integer within 1e-6; otherwise null and a warning.
  defs.ReportEventFact = obj({ id: evidenceId, event_id: text, known: bool, share_of_members: number, members: integer(1), count: nullable(integer(0)), count_status: en('derived', 'inconsistent') });
  const scale = obj({ kind: en('municipal', 'county', 'other'), original: text });
  const yieldCommon = { last_label_year: year, history_horizon_years: integer(0), label_release_rule: ref('ReportTextFact'), research_status: ref('SimulationResearchStatus'), exposure_flags: arr(text), scale };
  // The discriminator is the shape of the result, never `status` alone: a model result may also carry status "reference".
  defs.ReportYieldFact = { oneOf: [
    obj({ id: evidenceId, variant: { const: 'unavailable' }, reason_code: ref('SimulationReason') }),
    obj({ id: evidenceId, variant: { const: 'historical_reference' }, status: { const: 'reference' }, value_kg_ha: number, method: text, years_used: arr(year), conditional_on_scenario: { const: false }, ...yieldCommon }),
    obj({ id: evidenceId, variant: { const: 'model' }, status: en('research', 'reference'), value_kg_ha: number, method: text, model_version: text,
      scenario_range: nullable(obj({ p10: number, p50: number, p90: number, method: text })), predictive_range: nullable(obj({ p10: number, p50: number, p90: number, interval_method: text })),
      position_vs_season: ref('SimulationSeasonPosition'), conditional_on_scenario: bool, ...yieldCommon }),
  ] };
  const role = en('central', 'dry', 'wet');
  defs.ReportSeasonFacts = obj({
    id: evidenceId, crop_id: text, harvest_year: year, season_label: text, sowing_date: date, expected_harvest_date: date, cycle_days: integer(1, 1500),
    calendar_source: ref('ReportTextFact'), calendar_rule: nullable(obj({ rule: text, state_calendar: date, used: date })), interval_method: text,
    metrics: arr(ref('ReportMetricFact')), events: arr(ref('ReportEventFact')), yield: ref('ReportYieldFact'),
    // From the series of the representative members; null when the run has no usable series. Never ensemble statistics.
    phases: nullable(arr(obj({ phase_code: text, start: date, end: date, days: integer(1) }))),
    trajectories: nullable(arr(obj({ role, member_id: text, analog_year: nullable(year), season_deficit_mm: nullable(number), min_storage_mm: number, min_storage_date: date }))),
    day_kinds: nullable(arr(obj({ kind: ref('SimulationWeatherKind'), start: date, end: date }))),
  });
  defs.ReportDataSourceFact = obj({ id: evidenceId, role: text, provider: nullable(text), product: nullable(text), description: nullable(ref('ReportTextFact')), availability: nullable(ref('ReportTextFact')),
    file_period: nullable(obj({ start: date, end: date })), covers_after_as_of: bool, sha256: nullable(sha) });
  defs.ReportConclusionCode = en('water_deficit_season', 'water_deficit_highest', 'event_frequency', 'yield_overview', 'yield_unavailable');
  defs.ReportCaveatCode = en('soil_capacity_hypothesis', 'coverage_limited', 'scenarios_not_forecast');
  defs.ReportActionCode = en('check_soil_capacity', 'check_recent_yield_data', 'obtain_local_yield', 'treat_model_yield_as_research', 'check_sowing_calendar', 'request_paired_management_run');
  const linked = codes => obj({ code: codes, evidence_ids: arr(evidenceId) });
  // Every conclusion, caveat and next step points at the facts it was derived from.
  defs.ReportConclusion = linked(ref('ReportConclusionCode'));
  defs.ReportCaveat = linked(ref('ReportCaveatCode'));
  defs.ReportAction = linked(ref('ReportActionCode'));
  defs.ReportFacts = obj({
    contract: { const: 'simulation-technical-report-facts.v1' }, scope: ref('ReportScope'),
    run: obj({ run_id: ref('SimulationRunKey'), protocol_id: text, location_id: ref('LocationId'), place_name: text, state_code: text, plan_id: text, output_mode: ref('SimulationOutputMode'),
      execution_status: { const: 'succeeded' }, as_of: instant, issued_at: instant, simulation_start: date, simulation_end: date, harvest_years: arr(year),
      visibility: en('public_regional'), spatial_scale: { const: 'regional' }, seasons_in_run: integer(1), identity_sha256: sha, series_sha256: sha }),
    sources: arr(obj({ kind: en('run', 'series'), sha256: sha, bytes: integer(1) })),
    scientific_status: run.scientific_status, weather_segments: arr(obj({ kind: ref('SimulationWeatherKind'), start: date, end: date, origin: ref('ReportTextFact') })),
    seasons: arr(ref('ReportSeasonFacts')),
    ensemble: obj({ method: text, members: integer(1), effective_source_years: integer(1), analog_years: arr(year), eligible_years: integer(0), excluded_years: arr(obj({ year, reason: ref('ReportTextFact') })),
      coverage_class: en('standard', 'limited'), seed: integer(0), analog_years_requested: bool, calendar_mapping: obj({ method: text, max_month_day_drift_days: integer(0, 2), note: ref('ReportTextFact') }) }),
    soil: obj({ capacity_mm: number, profile_id: text, is_hypothesis: bool }),
    initial_condition: obj({ storage_fraction: number, is_hypothesis: bool, warm_up: nullable(obj({ start: date, end: date, source: text })),
      sensitivity: arr(obj({ storage_fraction: number, season_key: text, value: number })), sensitivity_metric: ref('ReportTextFact') }),
    engine: obj({ version: text, parameter_set_id: text }),
    representative: obj({ central: text, dry: text, wet: text, rule: ref('ReportTextFact') }),
    data_sources: arr(ref('ReportDataSourceFact')),
    limitations: arr(obj({ id: evidenceId, fact: ref('ReportTextFact') })),
    // First release: the future run carries no prices, costs, area or applied irrigation; never inferred.
    economics: obj({ status: { const: 'unavailable' }, reason_code: { const: 'no_integrated_budget' } }),
    management_comparison: obj({ status: { const: 'unavailable' }, reason_code: { const: 'no_paired_management_result' } }),
    charts: obj({ status: ref('ReportAvailability'), reason_code: nullable(ref('ReportReason')) }),
    conclusions: { ...arr(ref('ReportConclusion')), maxItems: 3 }, caveat: ref('ReportCaveat'), actions: { ...arr(ref('ReportAction')), maxItems: 3 },
    sections: arr(ref('ReportSectionStatus')), warnings: arr(ref('ReportWarning')),
  });

  // Document model: display-ready text and geometry. HTML, Markdown and the reading page serialise this one object.
  const span = obj({ text: str(4000), style: en('strong', 'em', 'code'), lang: str(35) }, ['text']);
  const content = arr(span);
  const table = obj({ type: { const: 'table' }, caption: str(1000), columns: arr(obj({ header: str(200), numeric: bool })), rows: arr(obj({ cells: arr(content) })), notes: arr(content) });
  defs.ReportTable = table;
  defs.ReportChart = obj({
    type: { const: 'chart' }, chart_id: text, title: str(500), description: str(2000), width: integer(1, 2000), height: integer(1, 2000),
    shapes: arr(obj({ kind: en('area', 'line'), role: en('band', 'central', 'dry', 'wet', 'capacity'), d: str(60000), label: str(500) })),
    regions: arr(obj({ x: number, width: number, label: str(200), index: integer(0) })),
    x_ticks: arr(obj({ x: number, label: str(100) })), y_ticks: arr(obj({ y: number, label: str(100) })), y_label: str(200),
    plot: obj({ x: number, y: number, width: number, height: number }), table: ref('ReportTable'),
  });
  defs.ReportBlock = { oneOf: [
    obj({ type: { const: 'paragraph' }, content, tone: en('note', 'warning'), evidence_ids: arr(evidenceId) }, ['type', 'content']),
    obj({ type: { const: 'heading' }, text: str(500) }),
    obj({ type: { const: 'list' }, ordered: bool, items: arr(content) }),
    obj({ type: { const: 'definitions' }, items: arr(obj({ term: str(500), content })) }),
    // Original-language evidence that has no translation: always labelled, never presented as translated.
    obj({ type: { const: 'quote' }, label: str(500), content }),
    ref('ReportTable'), ref('ReportChart'),
  ] };
  defs.ReportSection = obj({ id: ref('ReportSectionId'), title: str(500), status: ref('ReportAvailability'), reason_code: nullable(ref('ReportReason')), technical: bool, blocks: arr(ref('ReportBlock')) });
  defs.ReportDocument = obj({ title: str(500), subtitle: str(1000), lang: ref('ReportLocale'), sections: arr(ref('ReportSection')), footer: content });
  defs.ReportArtifact = obj({ format: en('html', 'md'), mime_type: en('text/html; charset=utf-8', 'text/markdown; charset=utf-8'), bytes: integer(1), sha256: sha });
  defs.ReportRepresentation = obj({
    contract: { const: 'simulation-technical-report.v1' }, report_id: ref('ReportId'), run_id: ref('SimulationRunKey'), scope: ref('ReportScope'), facts_digest: sha,
    source_hashes: arr(obj({ kind: en('run', 'series'), sha256: sha })), report_schema_version: text, template_version: text, translation_version: text,
    resolved_locale: ref('ReportLocale'), display_profile: ref('ReportDisplayProfile'), generated_at: instant,
    sections: arr(ref('ReportSectionStatus')), conclusions: arr(ref('ReportConclusion')), caveat: ref('ReportCaveat'), actions: arr(ref('ReportAction')), warnings: arr(ref('ReportWarning')),
    document: ref('ReportDocument'), artifacts: arr(ref('ReportArtifact')),
  });
  // One request. The locale resolution belongs to the request (two requests may share one English representation and
  // still differ in why English was used); it is null when a saved representation is read by id.
  defs.ReportGenerationResult = obj({
    state: ref('ReportGenerationState'), report_id: ref('ReportId'), run_id: ref('SimulationRunKey'), reused: bool,
    locale_resolution: nullable(ref('ReportLocaleResolution')), representation: nullable(ref('ReportRepresentation')),
    links: nullable(obj({ json: str(512), html: str(512), md: str(512) })), error: nullable(obj({ code: text, attempts: integer(1) })),
  });
  return ['ReportGenerationResult'];
}

// [method, url, body, path params, response, private, query]. The seventh entry exists only on routes that take
// both path parameters and a query string.
export const reportRoutes = [
  ['POST', '/v1/simulations/:id/report', 'ReportRequest', 'SimulationIdParams', 'ReportGenerationResultResponse', false],
  ['GET', '/v1/simulations/:id/report', null, 'SimulationIdParams', 'ReportGenerationResultResponse', false, 'ReportQuery'],
];
