import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { buildCoverageIndex, centerOf, coveredMunicipalities, fieldOf, placesWithData, statesWithData } from './coverageIndex';
import { mockCatalog } from './catalog-mock.test-helper';

beforeEach(() => { mockCatalog(); });
afterEach(() => vi.restoreAllMocks());

it('lugares com dados vêm do catálogo: Sorriso, Uberlândia, Rio Verde e Barreiras (D-09)', async () => {
  const idx = await buildCoverageIndex();
  expect(idx.status).toBe('ok');
  expect(coveredMunicipalities(idx).sort()).toEqual(['2903201', '3170206', '5107925', '5218805']);
  const sorriso = placesWithData(idx).find((p) => p.municipality.id === '5107925')!;
  expect(sorriso.own.map((p) => p.id).sort()).toEqual(['strategy_comparison', 'water_risk_projection', 'yield_estimate']);
  expect(sorriso.fields).toEqual([]);
});

it('recorte publicado pertence ao município, com o seu próprio período', async () => {
  const idx = await buildCoverageIndex();
  const rv = placesWithData(idx).find((p) => p.municipality.id === '5218805')!;
  expect(rv.own).toEqual([]);
  expect(rv.fields[0].field.id).toBe('published-field-rio-verde');
  expect(rv.fields[0].products[0]).toMatchObject({ id: 'history', periods: [{ start: '2024-06-01', end: '2024-07-31' }] });
  expect(fieldOf(idx, '3170206')?.id).toBe('published-field-uberlandia');
  expect(fieldOf(idx, '5107925')).toBeNull();
});

it('selo de estado só onde há lugar com dados; nunca o país inteiro', async () => {
  const idx = await buildCoverageIndex();
  expect(statesWithData(idx).sort()).toEqual(['BA', 'GO', 'MG', 'MT']);
  expect(coveredMunicipalities(idx)).not.toContain('BR');
});

it('marcador no centro da caixa da área', async () => {
  const idx = await buildCoverageIndex();
  const rv = placesWithData(idx).find((p) => p.municipality.id === '5218805')!;
  const [lon, lat] = centerOf(rv.municipality)!;
  expect(lon).toBeCloseTo(-51.04, 1); expect(lat).toBeCloseTo(-17.72, 1);
});

it('falha do catálogo é "não consultável", não "sem dados"', async () => {
  vi.restoreAllMocks(); mockCatalog({ failCoverage: true });
  const idx = await buildCoverageIndex();
  expect(idx.status).toBe('failed');
  expect(placesWithData(idx)).toEqual([]);
});
