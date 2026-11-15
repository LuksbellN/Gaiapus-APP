// LocationCore v1: the same data core for every place, in any supported country (Docs/2026-11-14-nucleo-global-lugares-design.md).
import { describe, expect, it } from 'vitest';
import { validators } from './index.js';
import { routeContracts } from './generated/routes.js';
import synthetic from '../fixtures/location-core/test/BR_ibge_9999999.json' with { type: 'json' };

const core = () => structuredClone(synthetic) as any;
const valid = (value: unknown) => validators.LocationCore!(value);

describe('LocationCore v1', () => {
  it('accepts the synthetic package', () => {
    expect(valid(core()), JSON.stringify(validators.LocationCore!.errors)).toBe(true);
  });

  it('accepts a US county id with a leading zero and rejects malformed ids', () => {
    const id = validators.LocationId!;
    expect(id('US:fips:01001')).toBe(true);
    expect(id('BR:ibge:5107925')).toBe(true);
    expect(id('US:fips:9169')).toBe(false);
    expect(id('XX:abc:1')).toBe(false);
    expect(id('5107925')).toBe(false);
  });

  it('rejects an available layer without rows', () => {
    const c = core(); c.layers.weather.rows = [];
    expect(valid(c)).toBe(false);
  });

  it('rejects an unavailable layer without a reason, or with an unknown reason', () => {
    const a = core(); delete a.layers.ndvi.reason_code;
    expect(valid(a)).toBe(false);
    const b = core(); b.layers.ndvi.reason_code = 'cloudy';
    expect(valid(b)).toBe(false);
  });

  it('requires issued_at on an available forecast', () => {
    const c = core();
    c.layers.forecast = { status: 'available', source: 'Open-Meteo ecmwf_ifs025', crop: 'soy', season: '2023/24', period: { start: '2023-10-07', end: '2023-10-16' }, rows: [{ date: '2023-10-07', rain_mm: 1, et0_mm: 5, storage_mm: 20, stress: false }] };
    expect(valid(c)).toBe(false);
    c.layers.forecast.issued_at = '2023-10-06T12:00:00Z';
    expect(valid(c), JSON.stringify(validators.LocationCore!.errors)).toBe(true);
  });

  it('keeps cloudy NDVI as null, never a number', () => {
    const c = core();
    c.layers.ndvi = { status: 'available', source: 'NASA HLS v2', period: { start: '2024-01-01', end: '2024-01-02' }, rows: [{ date: '2024-01-01', ndvi: null, valid_fraction: 0.1, scene_id: 'HLS.S30.T21LXG.2024001', collection: 'hls2-s30' }] };
    expect(valid(c), JSON.stringify(validators.LocationCore!.errors)).toBe(true);
  });

  it('records which FAO-56 parameter set produced each season', () => {
    const c = core(); delete c.layers.water_balance.seasons[0].parameter_set;
    expect(valid(c)).toBe(false);
  });

  it('declares public, additive routes without touching the private /v1/places', () => {
    const routes = routeContracts.map(([method, url, , , , priv]) => `${method} ${url} ${priv}`);
    expect(routes).toContain('GET /v1/locations false');
    expect(routes).toContain('GET /v1/locations/:id/core false');
    expect(routes).toContain('GET /v1/places true');
  });
});
