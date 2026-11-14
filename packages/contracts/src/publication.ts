import { publication, examples } from './fixtures.js';
import type { CoverageResult, ObservationsResult, ProductCapability, ImageryReference } from './generated/types.js';
export function publishedCoverage(areaId: string): CoverageResult {
  const selected = examples.filter(x => x.area_id === areaId);
  const field = publication.fields.find(x => x.area_id === areaId);
  const products: ProductCapability[] = (['history', 'yield_estimate', 'water_risk_projection', 'strategy_comparison'] as const).map(productId => {
    const matches = selected.filter(x => x.product_id === productId);
    const available = productId === 'history' ? !!field : matches.length > 0;
    const inputs = matches.filter(x=>x.product_id==='yield_estimate'||x.product_id==='water_risk_projection').map(x => ({ input: x.input_snapshot, example_id: x.example_id })) as ProductCapability['supported_inputs'];
    const payloads = matches.map(x => x.result.data) as unknown as Record<string, any>[];
    const dates = field?.rainfall.map(x => x.date).sort() ?? [];
    return { product_id: productId, availability: available ? 'available' : 'no_data', reason_code: available ? null : productId === 'strategy_comparison' ? 'strategy_not_provided' : 'no_published_coverage', periods: field && productId === 'history' ? [{ start: dates[0]!, end: dates.at(-1)! }] : matches.map(x => x.period), supported_crops: [...new Set(payloads.map(x => x.crop).filter(Boolean))], supported_cutoffs_days: [...new Set(payloads.flatMap(x => x.supported_cutoffs_days ?? []))], supported_horizons_days: payloads.map(x => x.horizon_days_requested).filter(Boolean), evaluated_horizon_days: payloads.find(x => x.max_validated_lead_days)?.max_validated_lead_days ?? null, writable_inputs: inputs.length ? Object.keys(inputs[0]!.input) : [], run_available: inputs.length > 0, run_access: 'authenticated', execution_origin: matches.length ? 'fixture' : null, supported_inputs: inputs, source_refs: publication.sources };
  });
  return { area_id: areaId, products, source_refs: publication.sources, publication_version: publication.publication_version };
}
export function publishedObservations(areaId: string, start: string, end: string): ObservationsResult {
  const field = publication.fields.find(x => x.area_id === areaId);
  const base: ObservationsResult = { area_id: areaId, period: { start, end }, availability: 'no_data', reason_code: 'no_published_coverage', series: [], imagery: [], source_refs: publication.sources, alternatives: publication.fields.map(x => x.area_id) };
  if (!field) return base;
  const within = (day: { date: string }) => day.date >= start && day.date <= end;
  const rainfall = field.rainfall.filter(within);
  const ndvi = field.observations.filter(within);
  base.series = [
    { series_id: 'rainfall', unit: 'mm', time_basis: 'UTC', spatial_support: field.sources.weather_scope, source: field.sources.rain, interval: 'daily', points: rainfall.map(x => ({ date: x.date, value: x.rain_mm, quality: x.rain_mm === null ? 'missing' : 'valid', acquired_at: null, scene_id: null, valid_fraction: null })) },
    { series_id: 'ndvi', unit: '1', time_basis: 'UTC', spatial_support: 'published demonstration rectangle, not municipal coverage', source: field.sources.imagery, interval: 'acquisition', points: ndvi.map(x => ({ date: x.date, value: x.ndvi, quality: x.ndvi === null ? 'missing' : x.valid_fraction < 1 ? 'partial' : 'valid', acquired_at: x.acquired_at, scene_id: x.scene_id, valid_fraction: x.valid_fraction })) },
  ];
  if (within(field.image)) base.imagery = [{ ...field.image, spatial_support: 'published georeferenced image footprint' }].map(({ date, scene_id, collection, url, corners, spatial_support }) => ({ date, scene_id, collection, url, corners: corners as ImageryReference['corners'], spatial_support }));
  const completePeriod = rainfall[0]?.date === start && rainfall.at(-1)?.date === end;
  base.availability = !rainfall.length && !ndvi.length ? 'no_data' : completePeriod && ndvi.every(x => x.ndvi !== null && x.valid_fraction === 1) ? 'available' : 'partial';
  base.reason_code = base.availability === 'no_data' ? 'unsupported_period' : null;
  return base;
}
