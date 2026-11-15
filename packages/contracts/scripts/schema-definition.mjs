import { readFileSync } from 'node:fs';
const load = name => JSON.parse(readFileSync(new URL(`../upstream/${name}.schema.json`, import.meta.url)));
const str = (maxLength = 256) => ({ type: 'string', maxLength });
const text = { type: 'string', minLength: 1, maxLength: 256 };
const en = (...values) => ({ enum: values });
const arr = items => ({ type: 'array', items });
const ref = name => ({ $ref: `#/$defs/${name}` });
const nullable = schema => ({ anyOf: [schema, { type: 'null' }] });
const obj = (properties, required = Object.keys(properties)) => ({ type: 'object', additionalProperties: false, properties, required });
const date = { type: 'string', format: 'date' };
const instant = { type: 'string', format: 'date-time' };
const uuid = { type: 'string', format: 'uuid' };
const integer = (minimum, maximum) => ({ type: 'integer', minimum, ...(maximum === undefined ? {} : { maximum }) });
const number = { type: 'number' };
const product = en('history', 'yield_estimate', 'water_risk_projection', 'strategy_comparison');
const basis = en('observation', 'retrospective_estimate', 'forecast_projection', 'hypothetical_scenario', 'mixed');
const page = item => obj({ items: arr(item), next_cursor: nullable(text) });
const period = obj({ start: date, end: date });
const defs = {};
function upstream(name, path) {
  const payload = load(path);
  delete payload.$schema; delete payload.$id;
  const replace = value => {
    if (!value || typeof value !== 'object') return;
    if (value.$ref?.startsWith('#/')) value.$ref = `#/$defs/${name}/${value.$ref.slice(2)}`;
    Object.values(value).forEach(replace);
  };
  replace(payload); defs[name] = payload;
}
upstream('YieldPayload', 'yield-estimate'); upstream('WaterRiskPayload', 'water-projection');
upstream('FieldShiftPayload', 'v7/contracts/field-shift');
upstream('YieldErrorPayload','v7/contracts/yield-error');
defs.ReasonCode = en('no_published_coverage', 'unsupported_crop', 'missing_artifacts', 'incomplete_forcing', 'unsupported_period', 'fixture_not_available', 'current_season_unavailable', 'strategy_not_provided');
defs.Period = period;
defs.ResponseMeta = obj({ app_contract_version: { const: '0.1.0' }, request_id: text, publication_version: text, context_key: text }, ['app_contract_version', 'request_id']);
defs.ScientificMeta = obj({ ...defs.ResponseMeta.properties, execution_origin: en('fixture', 'live'), result_basis: basis, save_handle: obj({ id: uuid, expires_at: instant }) }, ['app_contract_version', 'request_id', 'publication_version', 'context_key', 'execution_origin', 'result_basis']);
defs.YieldEstimateResponse = obj({ data: ref('YieldPayload'), meta: ref('ScientificMeta') });
defs.WaterRiskProjectionResponse = obj({ data: ref('WaterRiskPayload'), meta: ref('ScientificMeta') });
defs.FieldShiftResponse = obj({ data: ref('FieldShiftPayload'), meta: ref('ScientificMeta') });
defs.ScientificEnvelope = { oneOf: [ref('YieldEstimateResponse'), ref('WaterRiskProjectionResponse'), ref('FieldShiftResponse')] };
defs.ExplorationContext = obj({ area_id: nullable(text), view: en('explore', 'timeline', 'compare'), product_id: nullable(product), layer_id: nullable(text), period: nullable(period), selected_date: nullable(date), example_id: nullable(text) });
defs.SourceReference = obj({ source_id: text, description: text, url: { type: 'string', format: 'uri' }, source_revision: text });
defs.Geography = obj({ area_id: text, name: text, kind: en('country', 'state', 'municipality', 'published_field'), parent_id: nullable(text), country_id: { const: 'BR' }, state_id: nullable(text), bbox: { type: 'array', items: number, minItems: 4, maxItems: 4 }, geometry_ref: str(2048), scope: text }, ['area_id', 'name', 'kind', 'parent_id', 'country_id', 'state_id', 'scope']);
defs.GeographyPage = page(ref('Geography'));
defs.SupportedInput = obj({ input: { oneOf: [ref('YieldEstimateRequest'), ref('WaterRiskProjectionRequest')] }, example_id: text });
defs.ProductCapability = obj({ product_id: product, availability: en('available', 'partial', 'no_data'), reason_code: nullable(ref('ReasonCode')), periods: arr(period), supported_crops: arr(en('soy', 'maize2')), supported_cutoffs_days: arr(integer(0)), supported_horizons_days: arr(integer(1)), evaluated_horizon_days: nullable(integer(1)), writable_inputs: arr(text), run_available: { type: 'boolean' }, run_access: { const: 'authenticated' }, execution_origin: nullable(en('fixture', 'live')), supported_inputs: arr(ref('SupportedInput')), source_refs: arr(ref('SourceReference')) });
defs.CoverageResult = obj({ area_id: text, products: arr(ref('ProductCapability')), source_refs: arr(ref('SourceReference')), publication_version: text });
defs.ObservationPoint = obj({ date, value: nullable(number), quality: en('valid', 'missing', 'partial'), acquired_at: nullable(instant), scene_id: nullable(text), valid_fraction: nullable({ type: 'number', minimum: 0, maximum: 1 }) });
defs.ObservationSeries = obj({ series_id: text, unit: en('mm', '1'), time_basis: { const: 'UTC' }, spatial_support: text, source: text, interval: en('daily', 'acquisition'), points: arr(ref('ObservationPoint')) });
defs.ImageryReference = obj({ date, scene_id: text, collection: text, url: str(2048), corners: { type: 'array', minItems: 4, maxItems: 4, items: { type: 'array', items: number, minItems: 2, maxItems: 2 } }, spatial_support: text });
defs.ObservationsResult = obj({ area_id: text, period, availability: en('available', 'partial', 'no_data'), reason_code: nullable(ref('ReasonCode')), series: arr(ref('ObservationSeries')), imagery: arr(ref('ImageryReference')), source_refs: arr(ref('SourceReference')), alternatives: arr(text) });
defs.ExampleSummary = obj({ example_id: text, title: text, area_id: text, product_id: product, period, result_basis: basis });
defs.ExamplePage = page(ref('ExampleSummary'));
defs.StrategyExampleInput = obj({ municipality_code: { type: 'string', pattern: '^[0-9]{7}$' }, scenario_id: { const: 'field-shift-sorriso' } });
defs.ExampleDetail = obj({ ...defs.ExampleSummary.properties, input_snapshot: { oneOf: [ref('YieldEstimateRequest'), ref('WaterRiskProjectionRequest'), ref('StrategyExampleInput')] }, result: ref('ScientificEnvelope'), source_refs: arr(ref('SourceReference')), warnings: arr(str(2048)) });
defs.YieldEstimateRequest = obj({ municipality_code: { type: 'string', pattern: '^[0-9]{7}$' }, crop: en('soy', 'maize2'), harvest_year: integer(2002, 2100), days_after_sowing: integer(0, 365) });
defs.WaterRiskProjectionRequest = obj({ municipality_code: { type: 'string', pattern: '^[0-9]{7}$' }, crop: en('soy', 'maize2'), sowing_date: date, decision_at: instant, horizon_days: integer(1, 16) });
defs.Profile = obj({ user_id: uuid, display_name: nullable(str(100)), created_at: instant, updated_at: instant });
defs.Preferences = obj({ locale: en('pt-BR', 'en'), last_monitored_place_id: nullable(uuid) });
defs.MeResult = obj({ profile: ref('Profile'), preferences: ref('Preferences') });
defs.MonitoredPlace = obj({ id: uuid, area_id: text, kind: defs.Geography.properties.kind, label: str(100), created_at: instant, updated_at: instant });
defs.MonitoredPlacePage = page(ref('MonitoredPlace'));
defs.ComparisonSummary = obj({ id: uuid, title: text, product_id: product, area_id: text, created_at: instant, updated_at: instant, result_basis: basis, monitored_place_id: nullable(uuid) });
defs.ComparisonDetail = obj({ ...defs.ComparisonSummary.properties, notes: str(10000), input_snapshot: { oneOf: [ref('YieldEstimateRequest'), ref('WaterRiskProjectionRequest'), ref('StrategyExampleInput')] }, output_envelope: ref('ScientificEnvelope'), source_versions: obj({ scientific_revision: text, publication_version: text, app_contract_version: { const: '0.1.0' } }) });
defs.ScientificCatalog = obj({ bundle_sha256: { type:'string', pattern:'^[0-9a-f]{64}$' }, source_revision:text, operational_release:{ const:'not_released' }, models:arr(obj({ crop:text, artifact:text, validation_status:text, public_contract_supported:{type:'boolean'}, smoke_cases:integer(1), operational_release:{const:'not_released'} })), regional_soy:obj({ selected:{const:'site+mlp'}, run_available:{const:false}, reason_code:{const:'missing_artifacts'}, frozen_at:instant, test_2022_2024_evaluated:{const:false} }), published_strategy_examples:arr(text) });
defs.ComparisonPage = page(ref('ComparisonSummary'));
defs.EvidenceReview = obj({ context_key: str(4096), publication_version: text, reviewed_at: instant });
defs.EvidenceReviewResult = nullable(ref('EvidenceReview'));
defs.UpdateAccountRequest = { ...obj({ display_name: nullable(str(100)), locale: en('pt-BR', 'en'), last_monitored_place_id: nullable(uuid) }, []), minProperties: 1 };
defs.CreatePlaceRequest = obj({ area_id: text, label: { ...text, maxLength: 100 } }, ['area_id']);
defs.RenamePlaceRequest = obj({ label: { ...text, maxLength: 100 } });
defs.SaveComparisonRequest = obj({ source: { oneOf: [obj({ kind: { const: 'example' }, example_id: text }), obj({ kind: { const: 'analysis' }, save_handle_id: uuid })] }, title: text, notes: str(10000), monitored_place_id: nullable(uuid) }, ['source', 'title']);
defs.EditComparisonRequest = { ...obj({ title: text, notes: str(10000) }, []), minProperties: 1 };
defs.RecordEvidenceRequest = obj({ context_key: { ...text, maxLength: 4096 }, publication_version: text });
defs.PageQuery = obj({ cursor: text, limit: integer(1, 100) }, []);
defs.GeographyQuery = obj({ ...defs.PageQuery.properties, q: str(100), parent_id: text }, []);
defs.CoverageQuery = obj({ area_id: text });
defs.ObservationsQuery = obj({ area_id: text, start: date, end: date });
defs.ExamplesQuery = obj({ ...defs.PageQuery.properties, area_id: text, product_id: product }, []);
defs.EvidenceQuery = obj({ context_key: { ...text, maxLength: 4096 } });
defs.PrivateIdParams = obj({ id: uuid });
defs.ExampleIdParams = obj({ id: text });
defs.ErrorResponse = obj({ error: obj({ code: text, message: text, field_errors: { type: 'object', additionalProperties: str(1000) } }, ['code', 'message']), meta: ref('ResponseMeta') });
// LocationCore v1: one data core per place in any supported country (Docs/2026-11-14-nucleo-global-lugares-design.md).
// Additive: existing area ids, coverage, observations, examples and the private /v1/places are unchanged.
defs.LocationId = { type: 'string', pattern: '^(BR:ibge:[0-9]{7}|US:fips:[0-9]{5})$' };
defs.LocationIdParams = obj({ id: ref('LocationId') });
defs.LocationCropId = en('soy', 'maize1', 'maize2', 'wheat_winter');
defs.LocationReason = en('no_field_imagery', 'too_few_clear_scenes', 'forecast_not_in_publication', 'crop_calendar_unknown', 'out_of_season', 'source_unavailable');
defs.LocationLayerStatus = en('available', 'unavailable');
const lonLat = { type: 'array', items: number, minItems: 2, maxItems: 2 };
const nonEmpty = item => ({ ...arr(item), minItems: 1 });
const unavailable = obj({ status: { const: 'unavailable' }, reason_code: ref('LocationReason'), source: text }, ['status', 'reason_code']);
const available = (content, extra = {}, optional = []) => {
  const properties = { status: { const: 'available' }, source: text, method: str(1000), period, ...content, ...extra };
  return obj(properties, Object.keys(properties).filter(k => k !== 'method' && !optional.includes(k)));
};
const layer = (...args) => ({ oneOf: [available(...args), unavailable] });
const stage = en('establishment', 'vegetative', 'reproductive', 'maturation');
defs.LocationWeatherRow = obj({ date, rain_mm: number, et0_mm: number, tmin_c: number, tmax_c: number });
defs.LocationWaterRow = obj({ date, storage_mm: number, available_fraction: number, etc_mm: number, eta_mm: number, deficit_mm: number, drainage_mm: number, ks: number, stage });
defs.LocationWaterSeason = obj({ crop: ref('LocationCropId'), season: text, sowing_date: date, harvest_date: date, initial_fraction: number, parameter_set: text, rows: nonEmpty(ref('LocationWaterRow')) });
defs.LocationNdviRow = obj({ date, ndvi: nullable(number), valid_fraction: number, scene_id: text, collection: en('hls2-l30', 'hls2-s30') });
defs.LocationForecastRow = obj({ date, rain_mm: number, et0_mm: number, storage_mm: number, stress: { type: 'boolean' } });
defs.LocationPlace = obj({ id: ref('LocationId'), country: en('BR', 'US'), scheme: en('ibge', 'fips'), code: text, name: text, admin1_code: { type: 'string', pattern: '^(BR|US)-[A-Z]{2}$' }, admin1_name: text, legacy_area_id: nullable(text), centroid: lonLat, bbox: { type: 'array', items: number, minItems: 4, maxItems: 4 }, boundary_url: text });
defs.LocationField = obj({ polygon: obj({ type: { const: 'Polygon' }, coordinates: nonEmpty(nonEmpty(lonLat)) }), area_ha: number, rationale: str(1000), inside_boundary: { const: true } });
defs.LocationCrop = obj({ crop: ref('LocationCropId'), season: text, sowing_date: nullable(date), harvest_date: nullable(date), calendar_source: nullable(str(1000)), is_hypothesis: { const: true } });
defs.LocationLayerStatuses = obj({ weather: ref('LocationLayerStatus'), water_balance: ref('LocationLayerStatus'), ndvi: ref('LocationLayerStatus'), forecast: ref('LocationLayerStatus') });
defs.LocationCore = obj({
  schema_version: { const: 'location-core.v1' },
  place: ref('LocationPlace'),
  field: nullable(ref('LocationField')),
  crops: nonEmpty(ref('LocationCrop')),
  soil: obj({ capacity_mm: number, source: str(1000), is_hypothesis: { type: 'boolean' } }),
  layers: obj({
    weather: layer({ rows: nonEmpty(ref('LocationWeatherRow')) }),
    water_balance: layer({ seasons: nonEmpty(ref('LocationWaterSeason')) }),
    ndvi: layer({ rows: nonEmpty(ref('LocationNdviRow')) }),
    forecast: layer({ rows: nonEmpty(ref('LocationForecastRow')) }, { issued_at: instant, crop: ref('LocationCropId'), season: text }),
  }),
  provenance: obj({ generated_at: instant, generator: text, inputs: nonEmpty(obj({ source: text, dataset: str(1000), retrieved_at: instant, sha256: nullable({ type: 'string', pattern: '^[0-9a-f]{64}$' }) })) }),
});
defs.LocationSummary = obj({ ...Object.fromEntries(Object.entries(defs.LocationPlace.properties).filter(([k]) => k !== 'boundary_url')), layers: ref('LocationLayerStatuses') });
defs.LocationPage = page(ref('LocationSummary'));
const responseNames = ['LocationPage', 'LocationCore', 'GeographyPage', 'CoverageResult', 'ObservationsResult', 'ExamplePage', 'ExampleDetail', 'MeResult', 'MonitoredPlace', 'MonitoredPlacePage', 'ComparisonPage', 'ComparisonDetail', 'EvidenceReview', 'EvidenceReviewResult', 'ScientificCatalog'];
for (const name of responseNames) defs[`${name}Response`] = obj({ data: ref(name), meta: ref('ResponseMeta') });
export const schema = { $schema: 'https://json-schema.org/draft/2020-12/schema', $id: 'https://gaiapus.local/app/0.1.0', title: 'GaiapusContracts', type: 'object', additionalProperties: false, properties: {}, $defs: defs };
export const routes = [
  ['GET', '/v1/scientific-catalog', null, null, 'ScientificCatalogResponse', false],
  ['GET', '/v1/geography', null, 'GeographyQuery', 'GeographyPageResponse', false],
  ['GET', '/v1/coverage', null, 'CoverageQuery', 'CoverageResultResponse', false],
  ['GET', '/v1/observations', null, 'ObservationsQuery', 'ObservationsResultResponse', false],
  ['GET', '/v1/examples', null, 'ExamplesQuery', 'ExamplePageResponse', false],
  ['GET', '/v1/examples/:id', null, 'ExampleIdParams', 'ExampleDetailResponse', false],
  ['GET', '/v1/locations', null, 'PageQuery', 'LocationPageResponse', false],
  ['GET', '/v1/locations/:id/core', null, 'LocationIdParams', 'LocationCoreResponse', false],
  ['GET', '/v1/me', null, null, 'MeResultResponse', true],
  ['PATCH', '/v1/me', 'UpdateAccountRequest', null, 'MeResultResponse', true],
  ['GET', '/v1/places', null, 'PageQuery', 'MonitoredPlacePageResponse', true],
  ['POST', '/v1/places', 'CreatePlaceRequest', null, 'MonitoredPlaceResponse', true],
  ['PATCH', '/v1/places/:id', 'RenamePlaceRequest', 'PrivateIdParams', 'MonitoredPlaceResponse', true],
  ['DELETE', '/v1/places/:id', null, 'PrivateIdParams', null, true],
  ['GET', '/v1/comparisons', null, 'PageQuery', 'ComparisonPageResponse', true],
  ['POST', '/v1/comparisons', 'SaveComparisonRequest', null, 'ComparisonDetailResponse', true],
  ['GET', '/v1/comparisons/:id', null, 'PrivateIdParams', 'ComparisonDetailResponse', true],
  ['PATCH', '/v1/comparisons/:id', 'EditComparisonRequest', 'PrivateIdParams', 'ComparisonDetailResponse', true],
  ['DELETE', '/v1/comparisons/:id', null, 'PrivateIdParams', null, true],
  ['POST', '/v1/evidence-views', 'RecordEvidenceRequest', null, 'EvidenceReviewResponse', true],
  ['GET', '/v1/evidence-views', null, 'EvidenceQuery', 'EvidenceReviewResultResponse', true],
  ['POST', '/v1/yield-estimates', 'YieldEstimateRequest', null, 'YieldEstimateResponse', true],
  ['POST', '/v1/water-balance/scenarios', 'WaterRiskProjectionRequest', null, 'WaterRiskProjectionResponse', true],
];
