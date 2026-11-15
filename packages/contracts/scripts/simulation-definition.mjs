// Future-planning simulation contracts (harvest years 2027/2028+). Additive: no existing definition changes.
// Source protocol: Gaiapus_nasa data/frozen/future_simulation_v1_protocol.json. Generic for every country; US entries
// (history_horizon_years, label_release_rule, research_status, exposure_flags, model quantiles) fit the same shapes.
export function addSimulationDefs(defs, h) {
  const { str, text, en, arr, ref, nullable, obj, date, instant, integer, number } = h;
  const loose = description => ({ type: 'object', description });
  const map = value => ({ type: 'object', additionalProperties: value });
  const sha = { type: 'string', pattern: '^[0-9a-f]{64}$' };
  const year = integer(2000, 2100);
  const quantile = obj({ p10: number, p50: number, p90: number, n: integer(1) });

  defs.SimulationRunKey = { type: 'string', pattern: '^sim_[0-9a-f]{24}$' };
  defs.SimulationIdParams = obj({ id: ref('SimulationRunKey') });
  defs.SimulationCapabilityStatus = en('ready', 'research', 'needs_input', 'queued', 'missing_data', 'out_of_domain', 'unsupported');
  defs.SimulationReason = en('insufficient_history', 'unsupported_crop_engine', 'unknown_yield_lag', 'model_out_of_domain', 'model_not_validated_for_planning',
    'source_unavailable', 'invalid_calendar', 'insufficient_soil_inputs', 'flooded_system_not_represented', 'perennial_engine_missing',
    'season_already_started_without_observations', 'unsupported');
  defs.SimulationResearchStatus = en('research_confirmed', 'gain_not_confirmed', 'reference_selected', 'underpowered', 'not_evaluated');
  defs.SimulationOutputMode = en('simulation_conditional_on_historical_weather', 'in_season_forecast');
  defs.SimulationScientificStatus = en('physical_experimental', 'reference', 'research', 'unavailable');
  defs.SimulationWeatherKind = en('observed', 'short_forecast', 'seasonal_forecast', 'climatological_scenario');
  defs.SimulationQuery = obj({ location_id: ref('LocationId'), crop_id: { type: 'string', pattern: '^[a-z0-9_]{2,32}$' }, harvest_year: { type: 'string', pattern: '^20[0-9]{2}$' } }, []);

  defs.SimulationCapability = obj({
    crop_id: text, harvest_year: year, status: ref('SimulationCapabilityStatus'), reason_code: nullable(ref('SimulationReason')),
    run_ids: arr(ref('SimulationRunKey')), water_balance: { const: 'physical_experimental' }, yield: text,
  }, ['crop_id', 'harvest_year', 'status', 'reason_code', 'run_ids']);
  defs.SimulationPlaceCapabilities = obj({
    location_id: ref('LocationId'), name: text, state_code: text, history_years: integer(0), observed_until: nullable(date), capabilities: arr(ref('SimulationCapability')),
  });
  defs.SimulationCatalog = obj({
    contract: { const: 'future-simulation-capabilities.v1' }, as_of: instant, harvest_years: arr(year), places: arr(ref('SimulationPlaceCapabilities')),
    inputs: loose('Reproduction inputs of the publication (places, seed, member limit)'),
  });

  defs.SimulationArtifact = obj({ kind: en('run', 'series', 'members'), path: str(512), sha256: sha, bytes: integer(1), compression: nullable(en('gzip')) });
  defs.SimulationPublication = obj({
    run_id: ref('SimulationRunKey'), location_id: ref('LocationId'), place_name: text, plan_id: text, crops: arr(text), harvest_years: arr(year),
    as_of: instant, issued_at: instant, visibility: en('public_regional', 'private'), publication_version: text, current: { type: 'boolean' },
    artifacts: arr(ref('SimulationArtifact')),
    measured: obj({ seconds: number, peak_python_mib: number, series_bytes_raw: integer(1), series_bytes_gzip: integer(1), members: integer(1), days: integer(1), note: str(1000) }),
  });
  defs.SimulationPublicationList = obj({ as_of: instant, items: arr(ref('SimulationPublication')) });

  defs.SimulationYield = {
    oneOf: [
      obj({ status: { const: 'unavailable' }, reason_code: ref('SimulationReason'), value_kg_ha: { type: 'null' } }),
      obj({
        status: { const: 'reference' }, method: text, value_kg_ha: number, years_used: arr(year), last_label_year: year, history_horizon_years: integer(0),
        label_release_rule: str(1000), research_status: ref('SimulationResearchStatus'), exposure_flags: arr(text), conditional_on_scenario: { const: false },
        interval_method: { type: 'null' }, scale: text,
      }),
      obj({
        status: en('research', 'reference'), method: text, model_version: text, value_kg_ha: number, quantiles: nullable(obj({ p10: number, p50: number, p90: number })),
        interval_method: text, last_label_year: year, history_horizon_years: integer(0), label_release_rule: str(1000), research_status: ref('SimulationResearchStatus'),
        exposure_flags: arr(text), conditional_on_scenario: { type: 'boolean' }, scale: text,
      }),
    ],
  };
  defs.SimulationSeason = obj({
    crop_id: text, harvest_year: year, season_label: text, sowing_date: date, expected_harvest_date: date, cycle_days: integer(1, 1500), calendar_source: str(1000),
    quantiles: map(quantile), events: arr(obj({ event_id: text, share_of_members: number, members: integer(1) })), interval_method: text,
    members: map(map(number)), yield: ref('SimulationYield'),
  });
  defs.SimulationRun = obj({
    run_id: ref('SimulationRunKey'), contract: { const: 'future-simulation-run.v1' }, protocol_id: text,
    execution_status: en('queued', 'running', 'succeeded', 'failed', 'cancelled'), output_mode: ref('SimulationOutputMode'),
    scientific_status: obj({ weather: en('climatological_scenario', 'observed', 'seasonal_forecast', 'mixed'), water_balance: ref('SimulationScientificStatus'),
      phenology: ref('SimulationScientificStatus'), yield: ref('SimulationScientificStatus') }),
    location_id: ref('LocationId'), place_name: text, state_code: text, plan_id: text, harvest_years: arr(year), as_of: instant, issued_at: instant,
    simulation_start: date, simulation_end: date,
    weather_segments: arr(obj({ kind: ref('SimulationWeatherKind'), start: date, end: date, origin: str(1000) })),
    ensemble: obj({ method: text, members: integer(1), effective_source_years: integer(1), analog_years: arr(year), eligible_years: arr(year),
      excluded_years: map(text), coverage_class: en('standard', 'limited'), seed: integer(0), analog_years_requested: nullable(arr(year)),
      calendar_mapping: obj({ method: text, max_month_day_drift_days: integer(0, 2), note: str(1000) }) }),
    sources: loose('Provenance of history, observed prefix and ET0 method (files, checksums, periods)'),
    engine: obj({ version: text, parameter_set_id: text, daily_order: arr(text) }),
    soil: obj({ capacity_mm: number, profile_id: text, is_hypothesis: { type: 'boolean' } }),
    calendar_rules: arr(obj({ rule: text, harvest_year: year, state_calendar: date, used: date })),
    seasons: arr(ref('SimulationSeason')),
    representative: obj({ central: text, dry: text, wet: text, rule: str(1000) }),
    initial_condition: obj({ storage_fraction: number, is_hypothesis: { type: 'boolean' }, warm_up: nullable(obj({ start: date, end: date, source: text })),
      sensitivity: map(map(number)), sensitivity_metric: str(1000) }),
    limitations: arr(text), identity: loose('Canonical scientific identity hashed into run_id'),
    checksums: obj({ series_sha256: sha, identity_sha256: sha }),
  });
  const columns = Object.fromEntries(['precipitation_mm', 'et0_mm', 'etc_mm', 'eta_mm', 'et_deficit_mm', 'storage_mm', 'drainage_mm', 'stress_coefficient', 'mass_balance_residual_mm'].map(k => [k, arr(number)]));
  defs.SimulationSeriesMember = obj({ member_id: text, analog_year: nullable(year), role: en('central', 'dry', 'wet'), crop_id: arr(nullable(text)), phase_code: arr(text), ...columns });
  const band = obj({ p10: arr(number), p50: arr(number), p90: arr(number) });
  defs.SimulationSeries = obj({
    run_id: ref('SimulationRunKey'), dates: arr(date), capacity_mm: number, day_kind: arr(ref('SimulationWeatherKind')),
    members: arr(ref('SimulationSeriesMember')), bands: obj({ storage_mm: band, precipitation_mm: band, et_deficit_mm: band }),
    full_members_artifact: ref('SimulationArtifact'),
  });
  return ['SimulationCatalog', 'SimulationPublicationList', 'SimulationRun', 'SimulationSeries'];
}

export const simulationRoutes = [
  ['GET', '/v1/simulations/capabilities', null, 'SimulationQuery', 'SimulationCatalogResponse', false],
  ['GET', '/v1/simulations/regional', null, 'SimulationQuery', 'SimulationPublicationListResponse', false],
  ['GET', '/v1/simulations/:id', null, 'SimulationIdParams', 'SimulationRunResponse', false],
  ['GET', '/v1/simulations/:id/series', null, 'SimulationIdParams', 'SimulationSeriesResponse', false],
];
