import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { coverage } from '../adapters';
import { mockCatalog } from './catalog-mock.test-helper';
import { resetCoverageIndexForTest } from './coverageIndex';

beforeEach(() => { resetCoverageIndexForTest(); mockCatalog(); });
afterEach(() => vi.restoreAllMocks());
const ids = (c: { products: { id: string }[] }) => c.products.map((p) => p.id).sort();

it('Sorriso: dados disponíveis, todos do próprio município', async () => {
  const c = (await coverage.get('5107925')).data;
  expect(c.level).toBe('analise');
  expect(ids(c)).toEqual(['strategy_comparison', 'water_risk_projection', 'yield_estimate']);
});
it('Uberlândia: parcial — rendimento e NDVI do recorte; falta água e Field Shift, com motivo', async () => {
  const c = (await coverage.get('3170206')).data;
  expect(c.level).toBe('parcial');
  expect(ids(c)).toEqual(['ndvi', 'yield_estimate']);
  expect(c.products.find((p) => p.id === 'ndvi')!.kind).toBe('observacao');
  expect(c.missing.map((m) => m.id).sort()).toEqual(['strategy_comparison', 'water_risk_projection']);
  expect(c.missing.find((m) => m.id === 'strategy_comparison')!.reason).toBe('strategy_not_provided');
});
it('Rio Verde: só a imagem do recorte, nunca atribuída ao município inteiro (D-07, D-08)', async () => {
  const c = (await coverage.get('5218805')).data;
  expect(c.level).toBe('parcial');
  expect(ids(c)).toEqual(['ndvi']);
  expect(c.products[0].periods[0].start).toContain('2024');
});
it('Belo Horizonte: catálogo responde e não há nada — sem análise, sem número', async () => {
  const c = (await coverage.get('3106200')).data;
  expect(c).toMatchObject({ level: 'sem_analise', products: [] });
});
