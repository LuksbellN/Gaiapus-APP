import publicationJson from '../fixtures/publication.json' with { type: 'json' };
import soy from '../upstream/examples/yield-soy-5107925-day75.json' with { type: 'json' };
import maize from '../upstream/examples/yield-maize2-5107925-day75.json' with { type: 'json' };
import early from '../upstream/examples/yield-soy-3170206-day20.json' with { type: 'json' };
import water from '../upstream/examples/water-soy-5107925-N10.json' with { type: 'json' };
import v7Soy from '../upstream/v7/contracts/examples/yield-soy-5107925-day75.json' with { type: 'json' };
import v7Maize from '../upstream/v7/contracts/examples/yield-maize2-5107925-day75.json' with { type: 'json' };
import v7Early from '../upstream/v7/contracts/examples/yield-soy-3170206-day20.json' with { type: 'json' };
import v7Water from '../upstream/v7/contracts/examples/water-soy-5107925-N10.json' with { type: 'json' };
import fieldShift from '../upstream/v7/contracts/examples/field-shift-sorriso.json' with { type: 'json' };
import v7Pin from '../upstream/v7/pin.json' with { type: 'json' };
import modelRegistry from '../upstream/v7/model-registry.json' with { type: 'json' };
import frozenRegional from '../upstream/v7/data/frozen/regional_rule_soy_mg_mt_g30.json' with { type: 'json' };
import { contextKey } from './index.js';
import type { ExampleDetail, MeResult, MonitoredPlace, ComparisonDetail, EvidenceReview, ScientificCatalog } from './generated/types.js';
export const publication = { ...publicationJson, sources:[...publicationJson.sources,{source_id:'user-supplied-v7-delivery',description:'User-supplied v7 bundle; URL identifies reference code, bundle hash identifies the delivered artifacts',url:publicationJson.sources[0]!.url,source_revision:`sha256:${v7Pin.bundle_sha256}`}], publication_version: `science-ecae8c4457c0-v7-${v7Pin.bundle_sha256.slice(0,12)}-app2` };
export const v7Delivery = v7Pin;
export const scientificCatalog: ScientificCatalog = {
  bundle_sha256:v7Pin.bundle_sha256,source_revision:publication.scientific_revision,operational_release:'not_released',
  models:Object.entries(modelRegistry).map(([crop,record])=>({crop,artifact:record.artifact,validation_status:record.validation_status,public_contract_supported:crop==='soy'||crop==='maize2',smoke_cases:Object.keys(record.cutoffs_features).length,operational_release:'not_released'})),
  regional_soy:{selected:'site+mlp',run_available:false,reason_code:'missing_artifacts',frozen_at:frozenRegional.frozen_at,test_2022_2024_evaluated:false},published_strategy_examples:['field-shift-sorriso'],
};
function wrapExamples(rawExamples: (typeof soy | typeof maize | typeof early | typeof water)[], publicationVersion: string): ExampleDetail[] {
return rawExamples.map(raw => {
  const isYield = raw.product === 'yield_estimate';
  const payload = raw as unknown as Record<string, any>;
  const id = isYield ? `yield-${raw.crop}-${raw.municipality_code}-day${payload.days_after_sowing_requested}` : `water-${raw.crop}-${raw.municipality_code}-N${payload.horizon_days_requested}`;
  const input = isYield ? { municipality_code: raw.municipality_code, crop: raw.crop, harvest_year: payload.harvest_year, days_after_sowing: payload.days_after_sowing_requested } : { municipality_code: raw.municipality_code, crop: raw.crop, sowing_date: raw.sowing_date, decision_at: payload.decision_at, horizon_days: payload.horizon_days_requested };
  const resultBasis = isYield ? 'retrospective_estimate' : 'forecast_projection';
  return {
    example_id: id, title: `${raw.municipality_code === '5107925' ? 'Sorriso' : 'Uberlândia'} · ${raw.crop} · ${isYield ? 'harvest 2021, retrospective' : 'published N10 forecast example'}`,
    area_id: raw.municipality_code, product_id: raw.product, period: { start: raw.sowing_date, end: isYield ? payload.observed_through ?? raw.sowing_date : payload.days.at(-1).date }, result_basis: resultBasis,
    input_snapshot: input, result: { data: raw, meta: { app_contract_version: '0.1.0', request_id: 'canonical-example', context_key: contextKey('example', { example_id: id }), publication_version: publicationVersion, execution_origin: 'fixture', result_basis: resultBasis } },
    source_refs: publication.sources, warnings: raw.warnings,
  } as ExampleDetail;
});
}
export const v6Examples = wrapExamples([soy,maize,early,water],publicationJson.publication_version);
export const examples: ExampleDetail[] = [
  ...wrapExamples([v7Soy,v7Maize,v7Early,v7Water],publication.publication_version),
  { example_id:'field-shift-sorriso',title:'Sorriso · Field Shift · historical hypothetical simulation',area_id:'5107925',product_id:'strategy_comparison',period:{start:fieldShift.scenarios.reference_fallow.by_year[0]!.soy_sowing,end:fieldShift.daily_series_last_year.reference_fallow.at(-1)!.date},result_basis:'hypothetical_scenario',input_snapshot:{municipality_code:'5107925',scenario_id:'field-shift-sorriso'},result:{data:fieldShift,meta:{app_contract_version:'0.1.0',request_id:'canonical-example',context_key:contextKey('example',{example_id:'field-shift-sorriso'}),publication_version:publication.publication_version,execution_origin:'fixture',result_basis:'hypothetical_scenario'}},source_refs:publication.sources,warnings:[fieldShift.evidence,fieldShift.yield_estimate_note,'Regional soybean MLP weights are not included; national yield results are separate from this simulation.'] } as unknown as ExampleDetail,
];
// These identities and personal states are synthetic application fixtures, not real accounts.
const stamp = '2026-11-14T12:00:00Z';
const userId = '00000000-0000-4000-8000-000000000001';
export const newAccount: MeResult = { profile: { user_id: userId, display_name: null, created_at: stamp, updated_at: stamp }, preferences: { locale: 'pt-BR', last_monitored_place_id: null } };
export const monitoredPlace: MonitoredPlace = { id: '00000000-0000-4000-8000-000000000002', area_id: '5107925', kind: 'municipality', label: 'Sorriso', created_at: stamp, updated_at: stamp };
export const returningAccount: MeResult = { ...newAccount, preferences: { locale: 'pt-BR', last_monitored_place_id: monitoredPlace.id } };
export const savedComparison: ComparisonDetail = { id: '00000000-0000-4000-8000-000000000003', title: 'Published soybean example', product_id: 'yield_estimate', area_id: '5107925', created_at: stamp, updated_at: stamp, result_basis: 'retrospective_estimate', monitored_place_id: monitoredPlace.id, notes: '', input_snapshot: examples[0]!.input_snapshot, output_envelope: structuredClone(examples[0]!.result), source_versions: { scientific_revision: publication.scientific_revision, publication_version: publication.publication_version, app_contract_version: '0.1.0' } };
export const olderSavedComparison: ComparisonDetail = { ...savedComparison,id:'00000000-0000-4000-8000-000000000004',title:'Preserved original v6 example',output_envelope:structuredClone(v6Examples[0]!.result),source_versions:{...savedComparison.source_versions,publication_version:publicationJson.publication_version} };
export const evidenceReview: EvidenceReview = { context_key: examples[0]!.result.meta.context_key, publication_version: publication.publication_version, reviewed_at: stamp };
export const errorFixtures = Object.fromEntries(['invalid_input', 'unauthenticated', 'dependency_timeout', 'dependency_busy', 'rate_limited', 'result_expired', 'dependency_failure', 'upstream_invalid', 'not_found', 'fixture_not_available', 'idempotency_conflict'].map(code => [code, { error: { code, message: code.replaceAll('_', ' ') }, meta: { app_contract_version: '0.1.0', request_id: `fixture-${code}` } }]));
export const fixtures: { schema: string; value: unknown }[] = [
  ...examples.map(value => ({ schema: 'ExampleDetail', value })),
  { schema: 'GeographyPage', value: { items: publication.areas, next_cursor: null } },
  { schema: 'MeResult', value: newAccount }, { schema: 'MeResult', value: returningAccount },
  { schema: 'MonitoredPlace', value: monitoredPlace }, { schema: 'ComparisonDetail', value: savedComparison }, { schema:'ComparisonDetail',value:olderSavedComparison }, { schema: 'EvidenceReview', value: evidenceReview }, { schema: 'EvidenceReviewResult', value: null },
  ...Object.values(errorFixtures).map(value => ({ schema: 'ErrorResponse', value })),
];
