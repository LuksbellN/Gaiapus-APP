import { describe, expect, it } from 'vitest';
import { publicationMock } from './adapters/publication-mock.test-helper';
publicationMock();
import { crops, modelLabel, modelScope } from './adapters';
import { setLatency } from './adapters/core';
import { capabilities, hasDailySeries, SORRISO, UBERLANDIA } from './capabilities';
import { CROP_IDS, CROPS, cropIdFromName, isAmbiguousCropName, PLANTABLE, RECORD_CROP_OPTIONS } from './catalog';
import { migrate, type State } from './store';
import { economics, pricePerKg } from './units';

setLatency(0);
const cap = (crop: Parameters<typeof capabilities>[0], mun: string | null, id: string) => capabilities(crop, mun).find((c) => c.id === id)!;

describe('catálogo de culturas', () => {
  it('tem os dez IDs do contrato e nove culturas plantáveis', () => { expect(CROP_IDS).toHaveLength(10); expect(PLANTABLE).toHaveLength(9); });
  it('Café total MG é coorte agregada, não espécie plantável', () => { expect(CROPS.coffee_total_mg.plantable).toBe(false); expect(PLANTABLE).not.toContain('coffee_total_mg'); expect(RECORD_CROP_OPTIONS).not.toContain(CROPS.coffee_total_mg.name); });
  it('cadastro oferece arroz, trigo e feijão das duas safras', () => { for (const id of ['rice', 'wheat', 'bean1', 'bean2'] as const) expect(RECORD_CROP_OPTIONS).toContain(CROPS[id].name); });
  it('braquiária é opção de cadastro sem ID de modelo', () => { expect(RECORD_CROP_OPTIONS).toContain('Braquiária (cobertura)'); expect(cropIdFromName('Braquiária (cobertura)')).toBeNull(); });
  it('nomes antigos mapeiam para o mesmo ID; nomes ambíguos não são adivinhados', () => { expect(cropIdFromName('Milho safrinha')).toBe('maize2'); expect(cropIdFromName('Soja')).toBe('soy'); expect(cropIdFromName('Café')).toBeNull(); expect(isAmbiguousCropName('Café')).toBe(true); expect(isAmbiguousCropName('Outra')).toBe(false); });
});

describe('migração do armazenamento local', () => {
  const rec = (id: string, data: Record<string, string>) => ({ id, kind: 'plantio' as const, plotId: 't1', cycleId: 't1:2026/2027', event_at: '2026-10-05', recorded_at: 'x', updated_at: 'x', origin: 'informado' as const, schema: 1 as const, revision: 1, data });
  const old: State = { theme: 'dark', session: null, properties: [], plots: [], drafts: {}, activePlotId: null,
    records: [rec('a', { cultura: 'Milho safrinha', area: '10', cultivar: 'AG 8088' }), rec('b', { cultura: 'Outra', area: '2' }), rec('c', { cultura: 'Café', area: '3', idade: '4' }), { ...rec('d', { quantidade: '100', unidade: 'saca', saca: '60' }), kind: 'colheita' }],
    plans: [{ id: 'p1', createdAt: 'x', data: { cultura: 'Café', area: '5', preco: '1200' } }, { id: 'p2', createdAt: 'x', data: { cultura: 'Soja', area: '50' } }] };
  const m = migrate(old);
  it('acrescenta o ID sem apagar nem reescrever campos', () => { expect(m.records[0].data).toEqual({ cultura: 'Milho safrinha', area: '10', cultivar: 'AG 8088', cultura_id: 'maize2' }); expect(m.plans[1].data).toEqual({ cultura: 'Soja', area: '50', cultura_id: 'soy' }); });
  it('"Outra" fica sem ID e sem pendência', () => { expect(m.records[1].data.cultura_id).toBe(''); expect(m.records[1].data.cultura_pendente).toBeUndefined(); });
  it('"Café" sem espécie fica pendente de complemento, com os demais campos intactos', () => { expect(m.records[2].data).toEqual({ cultura: 'Café', area: '3', idade: '4', cultura_id: '', cultura_pendente: '1' }); expect(m.plans[0].data).toMatchObject({ cultura: 'Café', preco: '1200', cultura_id: '', cultura_pendente: '1' }); });
  it('registros que não são plantio ficam iguais; migrar duas vezes não muda nada', () => { expect(m.records[3]).toEqual(old.records[3]); expect(migrate(m)).toEqual(m); });
});

describe('unidades e economia', () => {
  it('saca só vira R$/kg com peso declarado', () => { expect(pricePerKg(120, 'saca', null)).toBeNull(); expect(pricePerKg(120, 'saca', 60)).toBe(2); expect(pricePerKg(120, 'saca', 50)).toBe(2.4); expect(pricePerKg(2000, 't', null)).toBe(2); expect(pricePerKg(2, 'kg', null)).toBe(2); });
  it('receita = kg/ha × ha × R$/kg; margem usa a mesma área', () => { const e = economics({ yieldKgHa: 3600, areaHa: 10, price: 120, priceUnit: 'saca', sackKg: 60, costPerHa: 4000, priceDate: '2026-11-01' }); expect(e.revenue).toBe(72000); expect(e.costs).toBe(40000); expect(e.margin).toBe(32000); expect(e.missing).toEqual([]); });
  it('o peso da saca muda o resultado (não há 60 kg implícito)', () => { const base = { yieldKgHa: 1500, areaHa: 2, price: 1000, priceUnit: 'saca' as const, costPerHa: 0, priceDate: '2026-11-01' }; expect(economics({ ...base, sackKg: 60 }).revenue).toBe(50000); expect(economics({ ...base, sackKg: 50 }).revenue).toBe(60000); });
  it('sem peso da saca, data do preço ou custo não calcula e diz o que falta', () => { const e = economics({ yieldKgHa: 3600, areaHa: 10, price: 120, priceUnit: 'saca', sackKg: null, costPerHa: null, priceDate: '' }); expect(e.revenue).toBeNull(); expect(e.margin).toBeNull(); expect(e.missing).toEqual(['peso da saca', 'data do preço', 'custo por hectare']); });
});

describe('capacidades por cultura e território', () => {
  it('toda cultura plantável tem cadastro local; a coorte agregada não', () => { for (const id of PLANTABLE) expect(cap(id, SORRISO, 'cadastro').status).toBe('local'); expect(cap('coffee_total_mg', SORRISO, 'cadastro').status).toBe('sem_suporte'); });
  it('série diária e cena 3D só para a rotação de soja em Sorriso', () => { expect(hasDailySeries('soy', SORRISO)).toBe(true); for (const id of PLANTABLE.filter((x) => x !== 'soy')) expect(hasDailySeries(id, SORRISO)).toBe(false); expect(hasDailySeries('soy', UBERLANDIA)).toBe(false); expect(cap('rice', SORRISO, 'cena3d').status).toBe('sem_suporte'); expect(cap('coffee_arabica', UBERLANDIA, 'hidrica').status).toBe('pendente'); });
  it('estimativa: exemplo local é demonstração; ausência de exemplo é integração pendente, não falta de cobertura', () => { expect(cap('soy', SORRISO, 'rendimento').status).toBe('demo'); expect(cap('maize1', UBERLANDIA, 'rendimento').status).toBe('demo'); const r = cap('rice', SORRISO, 'rendimento'); expect(r.status).toBe('pendente'); expect(r.note).toMatch(/não prova falta de cobertura/); });
  it('NDVI é do recorte de Uberlândia, qualquer que seja a cultura', () => { expect(cap('wheat', UBERLANDIA, 'imagem').status).toBe('demo'); expect(cap('soy', SORRISO, 'imagem').status).toBe('pendente'); });
});

describe('exemplos do contrato por cultura', () => {
  it('há ao menos uma resposta para cada cultura com exemplo, e ela é da cultura pedida', async () => { for (const id of CROP_IDS.filter((x) => x !== 'coffee_total_mg')) { const r = await crops.yieldExamples({ crop: id }); expect(r.length, id).toBeGreaterThan(0); for (const x of r) expect(x.data.crop).toBe(id); } });
  it('Café total MG não tem resposta por município', async () => { expect(await crops.yieldExamples({ crop: 'coffee_total_mg' })).toEqual([]); });
  it('filtrar por município nunca devolve outro município nem outra cultura', async () => { const r = await crops.yieldExamples({ crop: 'maize1', municipalityCode: UBERLANDIA }); expect(r).toHaveLength(1); expect(r[0].data).toMatchObject({ crop: 'maize1', municipality_code: UBERLANDIA }); expect(await crops.yieldExamples({ crop: 'rice', municipalityCode: SORRISO })).toEqual([]); });
  it('modelo e abrangência vêm da resposta: Sorriso tem Ridge nacional (1.0.0) e MLP regional (1.1.0), cada um com o seu rótulo', async () => { const r = await crops.yieldExamples({ crop: 'soy', municipalityCode: SORRISO }); const labels = r.map((x) => `${modelLabel(x.data.model)}|${modelScope(x.data.model)}|${x.data.estimate_kg_ha}`).sort(); expect(labels).toEqual(['MLP regional (MG e MT)|MG+MT|3516.3', 'Ridge nacional|national|3554']); for (const x of r) expect(x.meta.source).toContain(modelLabel(x.data.model)); });
  it('cultura fora do contrato continua sendo invalid_crop', async () => { await expect(crops.yieldExamples({ crop: 'banana' })).rejects.toMatchObject({ code: 'invalid_crop' }); });
});
