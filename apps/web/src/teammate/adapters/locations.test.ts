import { afterEach, expect, it, vi } from 'vitest';
import { locations, locationIdOf, monthlyWeather } from './locations';
import synthetic from '../../../../../packages/contracts/fixtures/location-core/test/BR_ibge_9999999.json';

afterEach(() => vi.restoreAllMocks());

it('reads a location core by its encoded id and keeps the payload untouched', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: synthetic, meta: { publication_version: 'location-core-v1-abc' } })));
  const result = await locations.core('US:fips:19169');
  expect(fetch).toHaveBeenCalledWith('/v1/locations/US%3Afips%3A19169/core', expect.anything());
  expect(result.data).toEqual(synthetic);
  expect(result.meta).toMatchObject({ kind: 'publicacao' });
});

it('lists locations and maps API failures to adapter errors', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: { code: 'dependency_failure', message: 'x' } }), { status: 503 }));
  await expect(locations.list()).rejects.toMatchObject({ code: 'dependency_failure' });
});

it('builds location ids only for supported schemes', () => {
  expect(locationIdOf('5107925')).toBe('BR:ibge:5107925');
  expect(locationIdOf('BR')).toBeNull();
  expect(locationIdOf('published-field-uberlandia')).toBeNull();
});

it('sums daily weather into calendar months without inventing missing days', () => {
  const rows = [
    { date: '2024-01-30', rain_mm: 2, et0_mm: 4, tmin_c: 20, tmax_c: 30 },
    { date: '2024-01-31', rain_mm: 3, et0_mm: 5, tmin_c: 20, tmax_c: 30 },
    { date: '2024-02-01', rain_mm: 1, et0_mm: 3, tmin_c: 20, tmax_c: 30 },
  ];
  expect(monthlyWeather(rows)).toEqual([{ month: '2024-01', rain_mm: 5, et0_mm: 9, days: 2 }, { month: '2024-02', rain_mm: 1, et0_mm: 3, days: 1 }]);
});
