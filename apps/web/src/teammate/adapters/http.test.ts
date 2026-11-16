import { afterEach, expect, it, vi } from 'vitest';
import { weather, coverage, imagery, crops } from './index';
import { examples } from '@gaiapus/contracts/fixtures';
import { mockCatalog } from '../geo/catalog-mock.test-helper';
import { resetCoverageIndexForTest } from '../geo/coverageIndex';
afterEach(() => vi.restoreAllMocks());
it('reads water from the API without modifying its scientific payload', async () => {
  const example = examples.find(e => e.product_id === 'water_risk_projection')!;
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: example, meta: {} })));
  const controller = new AbortController();
  const result = await weather.waterProjection('5107925', controller.signal);
  expect(result.data).toEqual(example.result.data);
  expect(fetch).toHaveBeenCalledWith('/v1/examples/water-soy-5107925-N10', expect.objectContaining({ signal: controller.signal }));
});
it('does not silently show local scientific results when the backend fails', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ error: { code: 'dependency_failure', message: 'Unavailable' } }), { status: 503 }));
  await expect(weather.waterProjection('5107925')).rejects.toMatchObject({ code: 'dependency_failure', status: 503 });
  await expect(coverage.get('5107925')).rejects.toMatchObject({ code: 'dependency_failure' });
});
it('keeps unknown API territories geographic-only; with the catalogue down it says coverage is not consultable', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ error: { code: 'not_found', message: 'Not found' } }), { status: 404 }));
  expect((await coverage.get('1234567')).data).toMatchObject({ level: 'nao_consultavel', products: [] });
});
it('uses API imagery URLs and preserves missing observations', async () => {
  resetCoverageIndexForTest();
  const transport = mockCatalog({ observations: { imagery: [{ date: '2024-07-30', url: '/publications/image.png', corners: [] }], series: [{ series_id: 'ndvi', source: 'HLS', points: [{ date: '2024-04-01', value: null, valid_fraction: 0, acquired_at: null, scene_id: null }] }, { series_id: 'rainfall', points: [{ date: '2024-04-01', value: null }] }] } });
  const result = await imagery.series('3170206');
  expect(result.data.imageUrl).toBe('/publications/image.png');
  expect(result.data.observations[0].ndvi).toBeNull();
  expect(result.data.rainfall[0].rain_mm).toBeNull();
  expect(transport).toHaveBeenCalledWith(expect.stringContaining('area_id=published-field-uberlandia'), expect.anything());
});
it('servidor inalcançável com o navegador online é "api_unreachable", não falta de rede (D-22)', async () => {
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
  await expect(weather.waterProjection('5107925')).rejects.toMatchObject({ code: 'api_unreachable', status: 0 });
});
it('publicação servida pela API é rotulada como publicação, com a versão (D-13)', async () => {
  const example = examples.find(e => e.product_id === 'water_risk_projection')!;
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: example, meta: {} })));
  const result = await weather.waterProjection('5107925');
  expect(result.meta.kind).toBe('publicacao');
  // Version and contract travel as data; the footer words are chosen when it is drawn, in the language on screen.
  expect(result.meta.version).toBe(example.result.meta.publication_version);
  expect(result.meta.contract).toBe('water_risk_projection');
  expect(result.meta.note ?? '').not.toMatch(/Publicação|contrato/);
});

it('the yield estimate served by the API keeps the publication version in its footer data', async () => {
  const example = examples.find(e => e.product_id === 'yield_estimate' && e.example_id === 'yield-soy-5107925-day75')!;
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: example, meta: {} })));
  const result = await crops.yieldEstimate({ crop: 'soy', municipalityCode: '5107925' });
  expect(result.meta.version).toBe(example.result.meta.publication_version);
  expect(result.meta.note ?? '').not.toMatch(/Publicação/);
});
