// Adapters do frontend: geography, coverage, weather, imagery, crops, simulations, seasons, devices, account.
// Hoje leem fixtures do pacote científico v7 (src/data) ou mocks identificados. Trocar por HTTP
// significa substituir o corpo de cada função mantendo assinatura e metadados.
import { AdapterError, wait, type Sourced } from './core';
import { getState, setState, uid, now, getAccountScope, type FieldRecord, type Plot, type Property } from '../store';
import { norm } from '../format';
import { cropIdFromName, isCropId, type CropId } from '../catalog';
import { backend, publishedExample, request } from './http';
import { checkPackage, type FieldShiftSeries, type FieldShiftSummary, type PackageManifest } from '../sim/field-shift-decision';
import type { CoverageResult, ObservationsResult } from '@gaiapus/contracts';
import { fieldOf, loadCoverageIndex } from '../geo/coverageIndex';
import { byName } from '../format';
import { activeLocale, translate } from '../i18n';
import type { Locale } from '../i18n/locale';
import { authAccount } from './session';
import { loadUSStates } from '../geo/usStates';

export type Feature = { type: 'Feature'; id: number; properties: { code: string; name: string; sigla?: string }; geometry: { type: string; coordinates: any } };
export type FC = { type: 'FeatureCollection'; features: Feature[] };
export type BBox = [[number, number], [number, number]];
export type Place = { country?: 'USA'; type: 'pais' | 'uf' | 'municipio'; code: string; name: string; uf: string; ufSigla: string };
export type SearchResult = { places: Place[]; total: number; remote: 'ok' | 'failed' | 'skipped' };
/** País ou território do mapa-base. `code` é 'BR' para o Brasil e o ADM0_A3 do Natural Earth para os demais. Só geografia.
 *  `names` por idioma e `aliases` (nomes nas cinco línguas, ISO alfa-2/alfa-3) servem para mostrar e buscar; nunca como identificador. */
export type Country = { code: string; a2: string | null; names: Record<Locale, string>; aliases: string[]; continent: string; bbox: BBox };
export const countryName = (c: Country, locale: Locale = activeLocale()) => c.names[locale] ?? c.names.en;

export function bboxOf(geometry: Feature['geometry']): BBox {
  let a = 180, b = 90, c = -180, d = -90;
  const walk = (x: any) => { if (typeof x[0] === 'number') { a = Math.min(a, x[0]); c = Math.max(c, x[0]); b = Math.min(b, x[1]); d = Math.max(d, x[1]); } else x.forEach(walk); };
  walk(geometry.coordinates); return [[a, b], [c, d]];
}
const cache = new Map<string, Promise<any>>();
const once = <T,>(k: string, f: () => Promise<T>): Promise<T> => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k)!; };
const MUN_LOADERS: Record<string, () => Promise<FC>> = {
  '31': () => import('../data/geo/mun-31.json').then((m) => m.default as unknown as FC),
  '51': () => import('../data/geo/mun-51.json').then((m) => m.default as unknown as FC),
};
const IBGE = 'IBGE · API Malhas v4 e Localidades';

export const geography = {
  ufsWithMunicipalities: Object.keys(MUN_LOADERS),
  // Países do globo, para navegar. Nenhum dado agrícola é agregado por país; análise só existe em municípios do Brasil.
  async countries(signal?: AbortSignal): Promise<Sourced<Country[]>> { await wait(signal, 20); const d = await once('countries', () => import('../data/geo/countries.json').then((m) => m.default)); return { data: d.countries as unknown as Country[], meta: { kind: 'fixture', source: 'MapLibre demotiles · Natural Earth', noteKey: 'notes.countries' } }; },
  async states(signal?: AbortSignal): Promise<Sourced<FC>> { await wait(signal); const data = await once('states', () => import('../data/geo/states.json').then((m) => m.default as unknown as FC)); return { data, meta: { kind: 'fixture', source: IBGE } }; },
  async municipalities(uf: string, signal?: AbortSignal): Promise<Sourced<FC | null>> {
    await wait(signal);
    if (!MUN_LOADERS[uf]) return { data: null, meta: { kind: 'fixture', source: IBGE, noteKey: 'notes.noMesh' } };
    return { data: await once('mun' + uf, MUN_LOADERS[uf]), meta: { kind: 'fixture', source: IBGE } };
  },
  // Busca por nome ou identificador (sigla/código da UF, código IBGE de 7 dígitos).
  // Os lugares do pacote (países, estados, municípios de MG e MT) aparecem sempre. A consulta ao catálogo
  // publicado da API é complementar: se falhar, os resultados locais continuam e `remote` diz que falhou.
  async search(q: string, signal?: AbortSignal): Promise<SearchResult> {
    await wait(signal, 40);
    const s = norm(q); if (s.length < 2) return { places: [], total: 0, remote: 'skipped' };
    const remote = backend.geography(q, signal).then((r) => ({ ok: true as const, items: r.items }), (error) => { if ((error as Error)?.name === 'AbortError') throw error; return { ok: false as const, items: [] }; });
    const st = (await this.states()).data.features;
    const sig = Object.fromEntries(st.map((f) => [f.properties.code, f.properties.sigla!]));
    const out: Place[] = st.filter((f) => norm(f.properties.name).includes(s) || norm(f.properties.sigla!) === s || f.properties.code === s).map((f) => ({ type: 'uf', code: f.properties.code, name: f.properties.name, uf: f.properties.code, ufSigla: f.properties.sigla! }));
    for (const uf of this.ufsWithMunicipalities) {
      const fc = (await this.municipalities(uf)).data!;
      for (const f of fc.features) if (norm(f.properties.name).includes(s) || f.properties.code.startsWith(s)) out.push({ type: 'municipio', code: f.properties.code, name: f.properties.name, uf, ufSigla: sig[uf] });
    }
    for (const f of (await loadUSStates()).features) {
      if (norm(f.properties.name).includes(s) || norm(f.properties.sigla ?? '') === s || norm(f.properties.code) === s)
        out.push({ type: 'uf', country: 'USA', code: f.properties.code, name: f.properties.name, uf: f.properties.code, ufSigla: f.properties.sigla ?? '' });
    }
    const aliasesOf = new Map<string, string[]>();
    for (const c of (await this.countries()).data) if (c.aliases.some((a) => (a.length <= 3 ? norm(a) === s : norm(a).includes(s)))) { aliasesOf.set(c.code, c.aliases); out.push({ type: 'pais', code: c.code, name: countryName(c), uf: '', ufSigla: c.continent }); }
    const published = await remote;
    for (const area of published.items) {
      if (area.kind !== 'municipality' || out.some(p => p.code === area.area_id)) continue;
      // UF from the catalogue's own state_id (BR-MT), never from the identifier prefix.
      const ufSig = area.state_id?.startsWith('BR-') ? area.state_id.slice(3) : '';
      const uf = st.find((f) => f.properties.sigla === ufSig)?.properties.code ?? '';
      out.push({ type: 'municipio', code: area.area_id, name: area.name, uf, ufSigla: ufSig });
    }
    // Exact match first, then prefix, then contains; countries match on any of their names/aliases (Germany, Deutschland, DEU…).
    const score = (text: string) => (norm(text) === s ? 0 : norm(text).startsWith(s) ? 1 : 2);
    const rank = (p: Place) => (p.type === 'pais' ? Math.min(...(aliasesOf.get(p.code) ?? [p.name]).map(score)) + (p.code !== 'BR' ? 0.5 : 0) : score(p.name));
    const places = out.sort((x, y) => rank(x) - rank(y) || byName(x.name, y.name));
    return { places, total: places.length, remote: published.ok ? 'ok' : 'failed' };
  },
};

export type Product = { id: string; kind: 'historico' | 'previsao' | 'simulacao' | 'observacao'; to: string; periods: { start: string; end: string }[]; crops: string[] };
/** analise: everything published here; parcial: some products, others missing; sem_analise: catalogue answered, nothing here;
 *  nao_consultavel: the catalogue could not be consulted, so absence cannot be concluded. Labels are translated by the screen. */
export type CoverageLevel = 'analise' | 'parcial' | 'sem_analise' | 'nao_consultavel';
export type Coverage = { code: string; level: CoverageLevel; products: Product[]; missing: { id: string; crops: string[]; reason: string | null }[] };
const PRODUCT_INFO: Record<string, { kind: Product['kind']; to: (code: string) => string }> = {
  water_risk_projection: { kind: 'previsao', to: (code) => `/visao-geral?mun=${code}` },
  strategy_comparison: { kind: 'simulacao', to: () => '/field-shift' },
  yield_estimate: { kind: 'historico', to: (code) => `/municipio?mun=${code}&aba=safra` },
  history: { kind: 'observacao', to: (code) => `/municipio?mun=${code}` },
};
export const coverage = {
  // Products come from the API catalogue; a published field inside the municipality adds its NDVI/rain product,
  // labelled as the rectangle's data, never the whole municipality's (Docs/ux-preservacao/06, section 3).
  async get(code: string, signal?: AbortSignal): Promise<Sourced<Coverage>> {
    const meta = (note?: string): Sourced<Coverage>['meta'] => ({ kind: 'publicacao', source: 'Gaiapus API · /v1/coverage', note });
    let result: CoverageResult;
    try { result = await backend.coverage(code, signal); }
    catch (error) {
      if (!(error instanceof AdapterError && error.status === 404)) throw error;
      const idx = await loadCoverageIndex();
      return { data: { code, level: idx.status === 'ok' ? 'sem_analise' : 'nao_consultavel', products: [], missing: [] }, meta: meta() };
    }
    const products: Product[] = []; const missing: Coverage['missing'] = [];
    for (const p of result.products) {
      const info = PRODUCT_INFO[p.product_id]; if (!info) continue;
      if (p.availability !== 'no_data') products.push({ id: p.product_id, kind: info.kind, to: info.to(code), periods: p.periods, crops: p.supported_crops });
      else if (p.product_id !== 'history') missing.push({ id: p.product_id, crops: p.supported_crops, reason: p.reason_code });
    }
    const idx = await loadCoverageIndex();
    const field = fieldOf(idx, code);
    const fieldHistory = field?.products.find((p) => p.id === 'history' && p.availability !== 'no_data');
    if (field && fieldHistory) products.push({ id: 'ndvi', kind: 'observacao', to: `/municipio?mun=${code}&aba=imagem`, periods: fieldHistory.periods, crops: [] });
    const level: CoverageLevel = products.length ? (missing.length ? 'parcial' : 'analise') : 'sem_analise';
    return { data: { code, level, products, missing }, meta: meta(result.publication_version) };
  },
};

export type WaterProjection = typeof import('../data/fixtures/water-soy-5107925-N10.json');
export type Daily = { capacity_mm: number; source: string; scenarios: Record<'reference_fallow' | 'brachiaria', { agricultural_year: string[]; date: string[]; land_cover: string[]; stage: string[]; soil_covered: number[]; rain_mm: number[]; et0_mm: number[]; kc: number[]; etc_mm: number[]; eta_mm: number[]; et_deficit_mm: number[]; drainage_mm: number[]; storage_end_mm: number[]; available_water_fraction: number[]; ks: number[] }> };
export const weather = {
  async waterProjection(code: string, signal?: AbortSignal): Promise<Sourced<WaterProjection>> {
    await wait(signal);
    if (code !== '5107925') throw new AdapterError('municipality_not_covered', 422);
    const result = await publishedExample<WaterProjection>('water-soy-5107925-N10', signal);
    return { ...result, meta: { ...result.meta, source: `${result.data.forecast.provider} ${result.data.forecast.model}`, note: `${result.meta.note ?? ''} · contrato water_risk_projection` } };
  },
  async dailySeries(code: string, signal?: AbortSignal): Promise<Sourced<Daily>> {
    await wait(signal);
    if (code !== '5107925') throw new AdapterError('municipality_not_covered', 422);
    const data = (await once('daily', () => import('../data/sorriso-daily.json').then((m) => m.default))) as unknown as Daily;
    return { data, meta: { kind: 'fixture', source: data.source, note: 'scenario/*_daily.csv · v7', noteKey: 'notes.dailySeries' } };
  },
};

/** Field imagery normalised for the screens. Optional fields exist only where the publication provides them. */
export type FieldImagery = { areaId: string; label: string; imageUrl: string; image: { date: string; corners: number[][]; scene_id: string };
  field: { geojson: any; label: string }; observations: { date: string; ndvi: number | null; acquired_at: string | null; scene_id: string | null; valid_fraction: number; field_pixels?: number }[];
  rainfall: { date: string; rain_mm: number | null }[]; sources: { imagery: string; rain: string; weather_scope?: string; rain_validation?: string };
  validation: { accepted_scenes: number; total_scenes: number; min_valid_fraction?: number } };
export const imagery = {
  /** Imagery of the published demonstration field inside municipality `code`, found through the catalogue. */
  async series(code: string, signal?: AbortSignal): Promise<Sourced<FieldImagery>> {
    await wait(signal);
    const idx = await loadCoverageIndex(); const field = fieldOf(idx, code);
    if (!field) throw new AdapterError(idx.status === 'ok' ? 'municipality_not_covered' : 'catalog_unavailable', idx.status === 'ok' ? 422 : 503);
    const hist = field.products.find((p) => p.id === 'history')?.periods[0];
    const [start, end] = hist ? [hist.start, hist.end] : ['2024-01-01', '2024-12-31'];
    const observed = await request<ObservationsResult>(`/observations?area_id=${encodeURIComponent(field.id)}&start=${start}&end=${end}`, { signal });
    const image = observed.imagery.at(-1);
    if (!image) throw new AdapterError('municipality_not_covered', 422);
    const ndvi = observed.series.find(s => s.series_id === 'ndvi');
    const rain = observed.series.find(s => s.series_id === 'rainfall');
    // Uberlândia keeps the approved publication's presentation metadata (pixel counts, validation thresholds).
    const local = field.id === 'published-field-uberlandia' ? (await import('../data/uberlandia-field.json')).default : null;
    const geojson = local?.field.geojson ?? (field.geometryRef ? await fetch(field.geometryRef, { signal }).then((r) => (r.ok ? r.json() : null)).then((g) => g?.geometry ?? g).catch(() => null) : null);
    const points = ndvi?.points ?? [];
    const observations = points.map((point) => ({ field_pixels: local?.observations.find((o) => o.date === point.date)?.field_pixels, date: point.date, ndvi: point.value, acquired_at: point.acquired_at, scene_id: point.scene_id, valid_fraction: point.valid_fraction ?? 0 }));
    const label = local?.field.label ?? 'Recorte demonstrativo rural';
    return { data: {
      areaId: field.id, label, imageUrl: image.url, image: { date: image.date, corners: image.corners, scene_id: image.scene_id },
      field: { geojson, label }, observations, rainfall: (rain?.points ?? []).map(p => ({ date: p.date, rain_mm: p.value })),
      sources: { imagery: ndvi?.source ?? 'NASA HLS v2', rain: rain?.source ?? 'NASA POWER / IMERG', weather_scope: local?.sources.weather_scope, rain_validation: local?.sources.rain_validation },
      validation: local ? { accepted_scenes: local.validation.accepted_scenes, total_scenes: local.validation.total_scenes, min_valid_fraction: local.validation.min_valid_fraction } : { accepted_scenes: points.filter((p) => p.value != null).length, total_scenes: points.length },
    }, meta: { kind: 'publicacao', source: ndvi?.source ?? 'NASA HLS v2', note: field.name, noteKey: 'notes.field' } };
  },
};

// Resposta do contrato yield-estimate (1.0.0 e 1.1.0). Os campos opcionais só existem a partir de 1.1.0.
export type YieldModel = { version: string; type: 'ridge' | 'hgb' | 'mlp' | 'reference' | string; name?: string; scope?: string; sources: string[]; artifact_sha256?: string; trained_through_harvest: number };
export type YieldEstimate = {
  schema_version: string; product: string; generated_at: string; as_of?: string; municipality_code: string; crop: CropId;
  status: 'ready' | 'before_first_cutoff' | 'not_supported' | 'outside_season' | 'inputs_incomplete';
  harvest_year: number; sowing_date: string; sowing_basis: string; days_after_sowing_requested: number; supported_cutoffs_days: number[]; cutoff_days_used: number | null;
  milestone?: string | null; estimate_kg_ha: number | null; observed_through: string | null; operational_release?: string; availability: string; warnings: string[]; model: YieldModel;
  validation: { years: number[]; cutoff_days: number; scope: string; mae_kg_ha: number; bias_kg_ha?: number; municipalities?: number; validation_status?: string } | null;
  coverage: { forcing_days_expected?: number; forcing_days_present?: number; sources?: string[]; source_mode?: string } | null;
};
const MODEL_TYPE: Record<string, string> = { ridge: 'Ridge', hgb: 'HGB (gradient boosting)', mlp: 'MLP' };
/** Nome do modelo tirado da resposta: tipo + abrangência. 1.0.0 não traz `scope`; a versão antiga era só nacional. */
export function modelLabel(m: YieldModel) {
  const scope = m.scope ?? (/national/.test(m.version) ? 'national' : null);
  const type = m.type === 'reference' ? translate('modelStatus.label.reference') : MODEL_TYPE[m.type] ?? m.type;
  if (scope === 'national') return translate('modelStatus.label.national', { type });
  return scope ? translate('modelStatus.label.regional', { type, scope: scope.split('+').join(translate('modelStatus.label.and')) }) : type;
}
export const modelScope = (m: YieldModel) => m.scope ?? (/national/.test(m.version) ? 'national' : 'national');
const yieldMeta = (data: YieldEstimate, example: string, kind: 'fixture' | 'publicacao' = 'fixture'): Sourced<YieldEstimate>['meta'] => ({ kind, source: `${modelLabel(data.model)} · ${data.model.version} · ${example}`, generatedAt: data.generated_at, noteKey: 'notes.yieldExample' });
const YIELD_FIXTURES: Record<string, () => Promise<{ default: unknown }>> = {
  'soy:5107925': () => import('../data/fixtures/yield-soy-5107925-day75.json'),
  'maize2:5107925': () => import('../data/fixtures/yield-maize2-5107925-day75.json'),
  'soy:3170206': () => import('../data/fixtures/yield-soy-3170206-day20.json'),
};
// Exemplos v7 do contrato (uma resposta por cultura), copiados por scripts/sync-contract-examples.mjs.
const V7_FILES = import.meta.glob<{ default: unknown }>('../data/fixtures/v7/yield-v7-*.json');
export type SealedResult = { mae_kg_ha: number; history_mae_kg_ha: number; difference_vs_history_kg_ha: number; ci95: [number, number]; harvests: number | null; municipalities: number | null; outcome: 'confirmed' | 'not_confirmed' | 'worse_than_history' };
export type SealedTest = { source: string; evaluated_once: boolean; rule: string; years: number[]; protocol: string; crops: Record<string, { national: (SealedResult & { model: string | null }) | null; regional: (SealedResult & { scope: string; model: string })[] }> };
export const crops = {
  // Reproduz o contrato de erro do backend: 400 invalid_crop / invalid_municipality_code, 422 municipality_not_covered.
  async yieldEstimate(req: { crop: string; municipalityCode: string }, signal?: AbortSignal): Promise<Sourced<YieldEstimate>> {
    await wait(signal);
    if (!isCropId(req.crop)) throw new AdapterError('invalid_crop', 400);
    if (!/^\d{7}$/.test(req.municipalityCode)) throw new AdapterError('invalid_municipality_code', 400);
    const load = YIELD_FIXTURES[`${req.crop}:${req.municipalityCode}`];
    if (!load) throw new AdapterError('municipality_not_covered', 422);
    const result = await publishedExample<YieldEstimate>(`yield-${req.crop}-${req.municipalityCode}-day${req.municipalityCode === '3170206' ? 20 : 75}`, signal);
    return { ...result, meta: { ...yieldMeta(result.data, 'API /v1/examples', 'publicacao'), note: result.meta.note } };
  },
  // Todas as respostas de exemplo disponíveis para a cultura (e, se informado, para o município).
  // Sem serviço HTTP ligado, é o que o frontend consegue mostrar; lista vazia = integração pendente, não "sem cobertura".
  async yieldExamples(req: { crop: string; municipalityCode?: string }, signal?: AbortSignal): Promise<Sourced<YieldEstimate>[]> {
    await wait(signal);
    if (!isCropId(req.crop)) throw new AdapterError('invalid_crop', 400);
    if (req.municipalityCode != null && !/^\d{7}$/.test(req.municipalityCode)) throw new AdapterError('invalid_municipality_code', 400);
    const idx = (await import('../data/fixtures/v7/index.json')).default;
    const hit = (crop: string, mun: string) => crop === req.crop && (!req.municipalityCode || mun === req.municipalityCode);
    const v7 = await Promise.all(idx.examples.filter((e) => hit(e.crop, e.municipality_code)).map(async (e) => { const data = (await V7_FILES[`../data/fixtures/v7/${e.file}`]()).default as YieldEstimate; return { data, meta: yieldMeta(data, `contracts/examples/${e.file}`) }; }));
    const old = await Promise.all(Object.keys(YIELD_FIXTURES).filter(k => hit(k.split(':')[0], k.split(':')[1])).map(k => this.yieldEstimate({ crop: k.split(':')[0], municipalityCode: k.split(':')[1] }, signal)));
    return [...v7, ...old];
  },
  async regionalMlp(code: string, signal?: AbortSignal): Promise<Sourced<{ horizon_days: number; expected_kg_ha: number }[]>> {
    await wait(signal);
    const all = (await import('../data/fixtures/soy-mg-mt-mlp.json')).default;
    return { data: all.filter((x) => x.municipality_code === code), meta: { kind: 'fixture', source: 'MLP soy_mg_mt (guia 30)', noteKey: 'notes.mlp' } };
  },
  // Teste selado 2022–2024, aberto uma única vez após o congelamento (data/frozen/test_2022_2024_v7.json).
  async sealedTest(signal?: AbortSignal): Promise<Sourced<SealedTest>> {
    await wait(signal);
    const data = (await import('../data/sealed-test-2022-2024.json')).default as unknown as SealedTest;
    return { data, meta: { kind: 'fixture', source: `${data.source} · v7`, noteKey: 'notes.sealed' } };
  },
  async matrix(signal?: AbortSignal) { await wait(signal); const data = (await import('../data/crop-matrix.json')).default; return { data, meta: { kind: 'fixture' as const, source: 'metrics/crop_matrix.csv · validação walk-forward 2019–2021 (anterior ao teste 2022–2024)' } }; },
};

export type FieldShift = typeof import('../data/sorriso-field-shift.json');
export type FieldShiftPackage = { id: string; manifest: PackageManifest; summary: FieldShiftSummary; series: FieldShiftSeries };
export const simulations = {
  async fieldShift(code: string, signal?: AbortSignal): Promise<Sourced<FieldShift>> {
    await wait(signal);
    if (code !== '5107925') throw new AdapterError('municipality_not_covered', 422);
    const result = await publishedExample<FieldShift>('field-shift-sorriso', signal);
    return { ...result, meta: { ...result.meta, source: result.data.weather.source, note: `${result.meta.note ?? ''} · ${result.data.evidence}` } };
  },
  /** Field Shift v2: three strategies. Summary and daily series are one pinned package; a mixed pair is refused. */
  async fieldShiftStrategies(code: string, signal?: AbortSignal): Promise<Sourced<FieldShiftPackage>> {
    await wait(signal);
    if (code !== '5107925') throw new AdapterError('municipality_not_covered', 422);
    const [manifest, summary, series] = await once('field-shift-v2', () => Promise.all([
      import('../data/field-shift-v2/manifest.json').then((m) => m.default as unknown as PackageManifest),
      import('../data/field-shift-v2/summary.json').then((m) => m.default as unknown as FieldShiftSummary),
      import('../data/field-shift-v2/series.json').then((m) => m.default as unknown as FieldShiftSeries)]));
    let id: string;
    try { id = checkPackage(manifest, summary, series); } catch (error) { throw new AdapterError('field_shift_package_mismatch', 409, error instanceof Error ? error.message : undefined); }
    return { data: { id, manifest, summary, series }, meta: { kind: 'fixture', source: summary.weather.source, generatedAt: manifest.generated_at, note: `${id} · ${summary.evidence}` } };
  },
};

// Persistência local (modo local identificado). O backend deverá isolar por usuário/propriedade.
function assertCurrentAccount(scope: number) {
  if (scope !== getAccountScope()) throw new AdapterError('account_changed', 409, 'A conta mudou. Abra o formulário novamente para continuar.');
}
export const seasons = {
  async saveProperty(p: Omit<Property, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Property> {
    const scope = getAccountScope(); await wait(undefined, 60); assertCurrentAccount(scope); const t = now(); const s = getState();
    const prev = p.id ? s.properties.find((x) => x.id === p.id) : undefined;
    const item: Property = { ...p, id: prev?.id ?? uid('prop'), createdAt: prev?.createdAt ?? t, updatedAt: t };
    setState({ properties: prev ? s.properties.map((x) => (x.id === item.id ? item : x)) : [...s.properties, item] }); return item;
  },
  async savePlot(p: Omit<Plot, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Plot> {
    const scope = getAccountScope(); await wait(undefined, 60); assertCurrentAccount(scope); const t = now(); const s = getState();
    const prev = p.id ? s.plots.find((x) => x.id === p.id) : undefined;
    // Fields this form does not know (outline, calculated area, revision) survive an edit made here.
    const item: Plot = { ...prev, ...p, id: prev?.id ?? uid('talhao'), createdAt: prev?.createdAt ?? t, updatedAt: t };
    setState({ plots: prev ? s.plots.map((x) => (x.id === item.id ? item : x)) : [...s.plots, item], activePlotId: s.activePlotId ?? item.id }); return item;
  },
  async saveRecord(r: Pick<FieldRecord, 'kind' | 'plotId' | 'event_at' | 'data'> & { id?: string }): Promise<FieldRecord> {
    const scope = getAccountScope(); await wait(undefined, 60); assertCurrentAccount(scope); const t = now(); const s = getState();
    const prev = r.id ? s.records.find((x) => x.id === r.id) : undefined;
    const year = Number(r.event_at.slice(0, 4)); const cycleId = prev?.cycleId ?? `${r.plotId}:${Number(r.event_at.slice(5, 7)) >= 7 ? `${year}/${year + 1}` : `${year - 1}/${year}`}`;
    const item: FieldRecord = { id: prev?.id ?? uid('reg'), kind: r.kind, plotId: r.plotId, cycleId, event_at: r.event_at, recorded_at: prev?.recorded_at ?? t, updated_at: t, origin: 'informado', schema: 1, revision: (prev?.revision ?? 0) + 1, data: r.kind === 'plantio' ? { ...r.data, cultura_id: cropIdFromName(r.data.cultura) ?? '' } : r.data };
    setState({ records: prev ? s.records.map((x) => (x.id === item.id ? item : x)) : [...s.records, item] }); return item;
  },
};

// Synthetic demonstration probes. Labels are translated by the screen; the fault is a code, not text.
export type Device = { id: string; depth_cm: number; calibrated: boolean; last_reading_at: string; vwc_pct: number | null; soil_temp_c: number | null; battery_pct: number; signal: 'good' | 'weak'; fault: { code: 'no_reading_low_battery'; hours: number } | null };
export const devices = {
  async list(signal?: AbortSignal): Promise<Sourced<Device[]>> {
    await wait(signal);
    return { data: [
      { id: 'sonda-demo-01', depth_cm: 20, calibrated: false, last_reading_at: '2026-11-14T09:00:00-03:00', vwc_pct: 24.6, soil_temp_c: 26.1, battery_pct: 82, signal: 'good', fault: null },
      { id: 'sonda-demo-02', depth_cm: 40, calibrated: false, last_reading_at: '2026-11-13T21:00:00-03:00', vwc_pct: null, soil_temp_c: null, battery_pct: 12, signal: 'weak', fault: { code: 'no_reading_low_battery', hours: 12 } },
    ], meta: { kind: 'sintetico', source: 'data/fake', noteKey: 'notes.devices' } };
  },
};

const localAccount = {
  async setConsent(v: boolean) { const scope = getAccountScope(); await wait(undefined, 40); assertCurrentAccount(scope); const s = getState().session; if (s) setState({ session: { ...s, researchConsent: v, consentAt: now() } }); },
  // Exportação protege identidade: sem nome/e-mail, IDs estáveis mantidos.
  exportData() { const s = getState(); return JSON.stringify({ exported_at: now(), schema: 1, user_id: s.session?.userId ?? null, research_consent: s.session?.researchConsent ?? false, properties: s.properties, plots: s.plots, records: s.records, plans: s.plans, devices: s.devices, installations: s.installations, commands: s.commands, measurements: s.measurements }, null, 2); },
};
export const account = { ...localAccount, ...authAccount };
