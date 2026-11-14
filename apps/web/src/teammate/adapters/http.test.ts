import { afterEach, expect, it, vi } from 'vitest';
import { weather, coverage, imagery } from './index';
import { examples } from '@gaiapus/contracts/fixtures';
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
it('keeps unknown API territories geographic-only', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: { code: 'not_found', message: 'Not found' } }), { status: 404 }));
  expect((await coverage.get('1234567')).data).toMatchObject({ level: 'somente_geografia', products: [] });
});
it('uses API imagery URLs and preserves missing observations', async () => {
  const transport = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: { imagery: [{ date: '2024-07-30', url: '/publications/image.png' }], series: [{ series_id: 'ndvi', source: 'HLS', points: [{ date: '2024-04-01', value: null, valid_fraction: 0, acquired_at: null, scene_id: null }] }, { series_id: 'rainfall', points: [{ date: '2024-04-01', value: null }] }] }, meta: {} })));
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
  expect(result.meta.note).toContain(example.result.meta.publication_version);
});
