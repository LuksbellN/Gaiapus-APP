import { describe, it, expect } from 'vitest';
import { createApp } from '../app.js';
import { validators } from '@gaiapus/contracts';

describe('public publication API', () => {
  it('searches by accent-insensitive names, pages safely, and navigates parents', async () => {
    const app = createApp();
    const found = await app.inject('/v1/geography?q=uberlandia');
    expect(found.statusCode).toBe(200);
    expect(found.json().data.items.some((x: any) => x.area_id === '3170206')).toBe(true);
    const page = (await app.inject('/v1/geography?parent_id=BR&limit=1')).json();
    expect(page.data.items).toHaveLength(1); expect(page.data.next_cursor).toBeTypeOf('string');
    const next = (await app.inject(`/v1/geography?parent_id=BR&limit=1&cursor=${encodeURIComponent(page.data.next_cursor)}`)).json();
    expect(next.data.items[0].area_id).not.toBe(page.data.items[0].area_id);
    expect((await app.inject('/v1/geography?parent_id=unknown')).statusCode).toBe(404);
    expect((await app.inject('/v1/geography?limit=0')).statusCode).toBe(422);
    expect((await app.inject('/v1/geography?cursor=malformed')).statusCode).toBe(422);
    await app.close();
  });
  it('separates model and imagery coverage and unknown IDs', async () => {
    const app = createApp();
    const coverage = await app.inject('/v1/coverage?area_id=5107925');
    expect(coverage.statusCode).toBe(200); expect(validators.CoverageResultResponse!(coverage.json())).toBe(true);
    expect(coverage.json().data.products.find((p: any) => p.product_id === 'history').availability).toBe('no_data');
    expect(coverage.json().data.products.find((p: any) => p.product_id === 'yield_estimate').run_available).toBe(true);
    const country = (await app.inject('/v1/coverage?area_id=BR')).json();
    expect(country.data.products.every((p: any) => p.availability === 'no_data')).toBe(true);
    expect((await app.inject('/v1/coverage?area_id=unknown')).statusCode).toBe(404);
    await app.close();
  });
  it('preserves actual zeros, cloud-missing NDVI, partial quality, UTC and imagery dates', async () => {
    const app = createApp();
    const response = await app.inject('/v1/observations?area_id=published-field-uberlandia&start=2024-04-01&end=2024-07-31');
    expect(response.statusCode).toBe(200);
    expect(validators.ObservationsResultResponse!(response.json()), JSON.stringify(validators.ObservationsResultResponse!.errors)).toBe(true);
    const data = response.json().data;
    expect(data.series[0].points.some((p: any) => p.value === 0 && p.quality === 'valid')).toBe(true);
    expect(data.series[1].points.some((p: any) => p.value === null && p.quality === 'missing')).toBe(true);
    expect(data.series[1].points.some((p: any) => p.quality === 'partial')).toBe(true);
    expect(data.series.every((s: any) => s.time_basis === 'UTC')).toBe(true);
    expect(data.imagery[0].date).toBe('2024-07-30');
    const noImage = (await app.inject('/v1/observations?area_id=published-field-uberlandia&start=2024-04-01&end=2024-04-01')).json();
    expect(noImage.data.imagery).toEqual([]);
    const missing = await app.inject('/v1/observations?area_id=5107925&start=2024-04-01&end=2024-04-02');
    expect(missing.statusCode).toBe(200); expect(missing.json().data.availability).toBe('no_data');
    expect((await app.inject('/v1/observations?area_id=BR&start=2024-02-30&end=2024-03-01')).statusCode).toBe(422);
    expect((await app.inject('/v1/observations?area_id=BR&start=2024-03-02&end=2024-03-01')).statusCode).toBe(422);
    await app.close();
  });
  it('returns all five published examples without invoking science or authentication', async () => {
    const app = createApp();
    const list = await app.inject('/v1/examples');
    expect(list.statusCode).toBe(200); expect(list.json().data.items).toHaveLength(5);
    for (const example of list.json().data.items) {
      const response = await app.inject(`/v1/examples/${example.example_id}`);
      expect(validators.ExampleDetailResponse!(response.json()), JSON.stringify(validators.ExampleDetailResponse!.errors)).toBe(true);
      expect(response.json().data.result.meta.execution_origin).toBe('fixture');
      expect(response.headers['cache-control']).toContain('public');
    }
    expect((await app.inject('/v1/examples/missing')).statusCode).toBe(404);
    expect((await app.inject('/v1/unknown')).headers['content-type']).toContain('application/json');
    await app.close();
  });
});
