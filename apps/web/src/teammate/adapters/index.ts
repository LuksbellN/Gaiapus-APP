// Adapters do frontend: geography, coverage, weather, imagery, crops, simulations, seasons, devices, account.
// Hoje leem fixtures do pacote científico v7 (src/data) ou mocks identificados. Trocar por HTTP
// significa substituir o corpo de cada função mantendo assinatura e metadados.
import { AdapterError, wait, type Sourced } from './core';
import { getState, setState, uid, now, getAccountScope, type FieldRecord, type Plot, type Property } from '../store';
import { norm } from '../format';
import { cropIdFromName, isCropId, type CropId } from '../catalog';
import { backend, publishedExample, request } from './http';
import type { ObservationsResult } from '@gaiapus/contracts';
import { authAccount } from './session';

export type Feature = { type: 'Feature'; id: number; properties: { code: string; name: string; sigla?: string }; geometry: { type: string; coordinates: any } };
export type FC = { type: 'FeatureCollection'; features: Feature[] };
export type BBox = [[number, number], [number, number]];
export type Place = { type: 'pais' | 'uf' | 'municipio'; code: string; name: string; uf: string; ufSigla: string };
/** País ou território do mapa-base. `code` é 'BR' para o Brasil e o ADM0_A3 do Natural Earth para os demais. Só geografia. */
export type Country = { code: string; name: string; continent: string; bbox: BBox };

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
  async countries(signal?: AbortSignal): Promise<Sourced<Country[]>> { await wait(signal, 20); const d = await once('countries', () => import('../data/geo/countries.json').then((m) => m.default)); return { data: d.countries as unknown as Country[], meta: { kind: 'fixture', source: 'MapLibre demotiles · Natural Earth (domínio público)', note: 'Limites simplificados, só para navegação.' } }; },
  async states(signal?: AbortSignal): Promise<Sourced<FC>> { await wait(signal); const data = await once('states', () => import('../data/geo/states.json').then((m) => m.default as unknown as FC)); return { data, meta: { kind: 'fixture', source: IBGE } }; },
  async municipalities(uf: string, signal?: AbortSignal): Promise<Sourced<FC | null>> {
    await wait(signal);
    if (!MUN_LOADERS[uf]) return { data: null, meta: { kind: 'fixture', source: IBGE, note: 'Malha municipal desta UF ainda não carregada nesta edição.' } };
    return { data: await once('mun' + uf, MUN_LOADERS[uf]), meta: { kind: 'fixture', source: IBGE } };
  },
  // Busca por nome ou identificador (sigla/código da UF, código IBGE de 7 dígitos).
  async search(q: string, signal?: AbortSignal): Promise<Place[]> {
    await wait(signal, 40);
    const s = norm(q); if (s.length < 2) return [];
    const st = (await this.states()).data.features;
    const sig = Object.fromEntries(st.map((f) => [f.properties.code, f.properties.sigla!]));
    const out: Place[] = st.filter((f) => norm(f.properties.name).includes(s) || norm(f.properties.sigla!) === s || f.properties.code === s).map((f) => ({ type: 'uf', code: f.properties.code, name: f.properties.name, uf: f.properties.code, ufSigla: f.properties.sigla! }));
    for (const uf of this.ufsWithMunicipalities) {
      const fc = (await this.municipalities(uf)).data!;
      for (const f of fc.features) if (norm(f.properties.name).includes(s) || f.properties.code.startsWith(s)) out.push({ type: 'municipio', code: f.properties.code, name: f.properties.name, uf, ufSigla: sig[uf] });
    }
    for (const c of (await this.countries()).data) if (c.code !== 'BR' ? norm(c.name).includes(s) || norm(c.code) === s : norm(c.name).includes(s)) out.push({ type: 'pais', code: c.code, name: c.name, uf: '', ufSigla: c.continent });
    const published = await backend.geography(q, signal);
    for (const area of published.items) {
      if (area.kind !== 'municipality' || out.some(p => p.code === area.area_id)) continue;
      const uf = area.area_id.slice(0, 2);
      out.push({ type: 'municipio', code: area.area_id, name: area.name, uf, ufSigla: sig[uf] ?? '' });
    }
    const rank = (p: Place) => (norm(p.name) === s ? 0 : norm(p.name).startsWith(s) ? 1 : 2) + (p.type === 'pais' && p.code !== 'BR' ? 0.5 : 0);
    return out.sort((x, y) => rank(x) - rank(y) || x.name.localeCompare(y.name, 'pt-BR')).slice(0, 12);
  },
};

export type Product = { id: string; label: string; period: string; kind: 'historico' | 'previsao' | 'simulacao' | 'observacao'; to: string };
export type Coverage = { code: string; level: 'analise' | 'somente_geografia'; summary: string; products: Product[] };
const COVERAGE: Record<string, Coverage> = {
  '5107925': { code: '5107925', level: 'analise', summary: 'Projeção hídrica, simulação Field Shift e referência municipal de rendimento.', products: [
    { id: 'water', label: 'Projeção de reserva de água (soja)', period: '14–19 nov 2026 · emitida 14 nov 2026', kind: 'previsao', to: '/visao-geral' },
    { id: 'field-shift', label: 'Field Shift: pousio × braquiária', period: 'Safras 2015/16 a 2020/21', kind: 'simulacao', to: '/field-shift' },
    { id: 'yield', label: 'Rendimento municipal de referência', period: 'Colheita 2021 · retrospectivo', kind: 'historico', to: '/municipio' } ] },
  '3170206': { code: '3170206', level: 'analise', summary: 'NDVI por imagem orbital e chuva diária em um recorte demonstrativo rural.', products: [
    { id: 'ndvi', label: 'NDVI (HLS) e chuva (IMERG)', period: '1 abr – 31 jul 2024', kind: 'observacao', to: '/municipio' },
    { id: 'yield', label: 'Rendimento municipal de referência', period: 'Colheita 2021 · antes do 1º corte', kind: 'historico', to: '/municipio' } ] },
};
export const coverage = {
  covered: Object.keys(COVERAGE),
  async get(code: string, signal?: AbortSignal): Promise<Sourced<Coverage>> {
    const empty: Coverage = { code, level: 'somente_geografia', summary: 'Limites disponíveis. Nenhuma análise publicada para este município nesta edição.', products: [] };
    try {
      const result = await backend.coverage(code, signal);
      const ids: Record<string, string> = { water_risk_projection: 'water', strategy_comparison: 'field-shift', yield_estimate: 'yield', history: 'ndvi' };
      const available = new Set(result.products.filter(p => p.availability !== 'no_data').map(p => ids[p.product_id]));
      if (code === '3170206') {
        const fieldCoverage = await backend.coverage('published-field-uberlandia', signal);
        if (fieldCoverage.products.some(p => p.product_id === 'history' && p.availability !== 'no_data')) available.add('ndvi');
      }
      const original = COVERAGE[code];
      const products = original?.products.filter(p => available.has(p.id)) ?? [];
      return { data: products.length ? { ...original, products } : empty, meta: { kind: 'fixture', source: 'Catálogo de cobertura da API Gaiapus', note: result.publication_version } };
    } catch (error) {
      if (error instanceof AdapterError && error.status === 404) return { data: empty, meta: { kind: 'fixture', source: 'Catálogo de cobertura da API Gaiapus' } };
      throw error;
    }
  },
};

export type WaterProjection = typeof import('../data/fixtures/water-soy-5107925-N10.json');
export type Daily = { capacity_mm: number; source: string; scenarios: Record<'reference_fallow' | 'brachiaria', { agricultural_year: string[]; date: string[]; land_cover: string[]; stage: string[]; soil_covered: number[]; rain_mm: number[]; et0_mm: number[]; kc: number[]; etc_mm: number[]; eta_mm: number[]; et_deficit_mm: number[]; drainage_mm: number[]; storage_end_mm: number[]; available_water_fraction: number[]; ks: number[] }> };
export const weather = {
  async waterProjection(code: string, signal?: AbortSignal): Promise<Sourced<WaterProjection>> {
    await wait(signal);
    if (code !== '5107925') throw new AdapterError('municipality_not_covered', 422);
    const result = await publishedExample<WaterProjection>('water-soy-5107925-N10', signal);
    return { ...result, meta: { ...result.meta, source: `${result.data.forecast.provider} ${result.data.forecast.model}`, note: 'Fixture do contrato water_risk_projection (pacote v7).' } };
  },
  async dailySeries(code: string, signal?: AbortSignal): Promise<Sourced<Daily>> {
    await wait(signal);
    if (code !== '5107925') throw new AdapterError('municipality_not_covered', 422);
    const data = (await once('daily', () => import('../data/sorriso-daily.json').then((m) => m.default))) as unknown as Daily;
    return { data, meta: { kind: 'fixture', source: data.source, note: 'scenario/*_daily.csv do pacote v7 · simulação histórica.' } };
  },
};

export type Imagery = typeof import('../data/uberlandia-field.json');
export const imagery = {
  async series(code: string, signal?: AbortSignal): Promise<Sourced<Imagery & { imageUrl: string }>> {
    await wait(signal);
    if (code !== '3170206') throw new AdapterError('municipality_not_covered', 422);
    const [d, observed] = await Promise.all([import('../data/uberlandia-field.json'), request<ObservationsResult>('/observations?area_id=published-field-uberlandia&start=2024-04-01&end=2024-07-31', { signal })]);
    const image = observed.imagery.at(-1);
    if (!image) throw new AdapterError('municipality_not_covered', 422);
    const ndvi = observed.series.find(s => s.series_id === 'ndvi');
    const rain = observed.series.find(s => s.series_id === 'rainfall');
    // Geometry and QA pixel counts remain the approved publication's presentation metadata.
    const observations = (ndvi?.points ?? []).map(point => ({ ...d.default.observations.find(o => o.date === point.date), date: point.date, ndvi: point.value, acquired_at: point.acquired_at, scene_id: point.scene_id, valid_fraction: point.valid_fraction })) as Imagery['observations'];
    return { data: { ...d.default, image: { ...d.default.image, ...image }, observations, rainfall: (rain?.points ?? []).map(p => ({ date: p.date, rain_mm: p.value })), imageUrl: image.url } as Imagery & { imageUrl: string }, meta: { kind: 'fixture', source: ndvi?.source ?? d.default.sources.imagery, note: 'Recorte demonstrativo rural; não é um talhão cadastrado.' } };
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
const MODEL_TYPE: Record<string, string> = { ridge: 'Ridge', hgb: 'HGB (gradient boosting)', mlp: 'MLP', reference: 'Referência histórica' };
/** Nome do modelo tirado da resposta: tipo + abrangência. 1.0.0 não traz `scope`; a versão antiga era só nacional. */
export function modelLabel(m: YieldModel) { const scope = m.scope ?? (/national/.test(m.version) ? 'national' : null); return `${MODEL_TYPE[m.type] ?? m.type}${scope === 'national' ? ' nacional' : scope ? ` regional (${scope.replace('+', ' e ')})` : ''}`; }
export const modelScope = (m: YieldModel) => m.scope ?? (/national/.test(m.version) ? 'national' : 'national');
const yieldMeta = (data: YieldEstimate, example: string): Sourced<YieldEstimate>['meta'] => ({ kind: 'fixture', source: `${modelLabel(data.model)} · ${data.model.version} · ${example}`, generatedAt: data.generated_at, note: 'Exemplo retrospectivo do contrato; rendimento municipal, não de talhão.' });
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
    return { ...result, meta: yieldMeta(result.data, 'contracts/examples (1.0.0)') };
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
    return { data: all.filter((x) => x.municipality_code === code), meta: { kind: 'fixture', source: 'MLP regional soja MG/MT (soy_mg_mt, guia 30)', note: 'Amostras de verificação (smoke) da safra 2021; retrospectivo, não liberado para operação. No teste 2022–2024 o ganho sobre o histórico não foi confirmado.' } };
  },
  // Teste selado 2022–2024, aberto uma única vez após o congelamento (data/frozen/test_2022_2024_v7.json).
  async sealedTest(signal?: AbortSignal): Promise<Sourced<SealedTest>> {
    await wait(signal);
    const data = (await import('../data/sealed-test-2022-2024.json')).default as unknown as SealedTest;
    return { data, meta: { kind: 'fixture', source: `${data.source} · pacote v7`, note: 'MAE é erro médio em kg/ha, não intervalo de previsão. Retrospectivo; nada liberado para operação.' } };
  },
  async matrix(signal?: AbortSignal) { await wait(signal); const data = (await import('../data/crop-matrix.json')).default; return { data, meta: { kind: 'fixture' as const, source: 'metrics/crop_matrix.csv · validação walk-forward 2019–2021 (anterior ao teste 2022–2024)' } }; },
};

export type FieldShift = typeof import('../data/sorriso-field-shift.json');
export const simulations = {
  async fieldShift(code: string, signal?: AbortSignal): Promise<Sourced<FieldShift>> {
    await wait(signal);
    if (code !== '5107925') throw new AdapterError('municipality_not_covered', 422);
    const result = await publishedExample<FieldShift>('field-shift-sorriso', signal);
    return { ...result, meta: { ...result.meta, source: result.data.weather.source, note: result.data.evidence } };
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
    const item: Plot = { ...p, id: prev?.id ?? uid('talhao'), createdAt: prev?.createdAt ?? t, updatedAt: t };
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

export type Device = { id: string; name: string; plot: string; depth_cm: number; calibration: string; last_reading_at: string; vwc_pct: number | null; soil_temp_c: number | null; battery_pct: number; signal: string; fault: string | null };
export const devices = {
  async list(signal?: AbortSignal): Promise<Sourced<Device[]>> {
    await wait(signal);
    return { data: [
      { id: 'sonda-demo-01', name: 'Sonda demonstrativa 01', plot: 'Talhão demonstrativo', depth_cm: 20, calibration: 'Sem calibração de campo', last_reading_at: '2026-11-14T09:00:00-03:00', vwc_pct: 24.6, soil_temp_c: 26.1, battery_pct: 82, signal: 'Bom', fault: null },
      { id: 'sonda-demo-02', name: 'Sonda demonstrativa 02', plot: 'Talhão demonstrativo', depth_cm: 40, calibration: 'Sem calibração de campo', last_reading_at: '2026-11-13T21:00:00-03:00', vwc_pct: null, soil_temp_c: null, battery_pct: 12, signal: 'Fraco', fault: 'Sem leitura há 12 h · bateria baixa' },
    ], meta: { kind: 'sintetico', source: 'Telemetria sintética (data/fake)', note: 'Gerada para testar ingestão. Nunca usada em treino nem em decisão.' } };
  },
};

const localAccount = {
  async setConsent(v: boolean) { const scope = getAccountScope(); await wait(undefined, 40); assertCurrentAccount(scope); const s = getState().session; if (s) setState({ session: { ...s, researchConsent: v, consentAt: now() } }); },
  // Exportação protege identidade: sem nome/e-mail, IDs estáveis mantidos.
  exportData() { const s = getState(); return JSON.stringify({ exported_at: now(), schema: 1, user_id: s.session?.userId ?? null, research_consent: s.session?.researchConsent ?? false, properties: s.properties, plots: s.plots, records: s.records, plans: s.plans }, null, 2); },
};
export const account = { ...localAccount, ...authAccount };
