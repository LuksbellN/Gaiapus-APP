// Public location core routes (Docs/2026-11-14-nucleo-global-lugares-design.md): additive, fixture-served, pinned by hash.
import { describe, it, expect } from 'vitest';
import { createApp } from '../app.js';
import { validators } from '@gaiapus/contracts';

const IDS = ['BR:ibge:2903201', 'BR:ibge:3170206', 'BR:ibge:5107925', 'BR:ibge:5218805', 'US:fips:19169', 'US:fips:20191', 'US:fips:31185'];

describe('location core API', () => {
  it('lists the seven published locations with layer statuses', async () => {
    const app = createApp();
    const res = await app.inject('/v1/locations?limit=100');
    expect(res.statusCode).toBe(200);
    expect(validators.LocationPageResponse!(res.json()), JSON.stringify(validators.LocationPageResponse!.errors)).toBe(true);
    expect(res.json().data.items.map((x: any) => x.id)).toEqual(IDS);
    expect(res.json().data.items.find((x: any) => x.id === 'BR:ibge:5107925').legacy_area_id).toBe('5107925');
    await app.close();
  });

  it('serves a US county core with a stable ETag', async () => {
    const app = createApp();
    const res = await app.inject(`/v1/locations/${encodeURIComponent('US:fips:19169')}/core`);
    expect(res.statusCode).toBe(200);
    expect(validators.LocationCoreResponse!(res.json()), JSON.stringify(validators.LocationCoreResponse!.errors)).toBe(true);
    expect(res.json().data.place.name).toBe('Story County');
    const again = await app.inject(`/v1/locations/${encodeURIComponent('US:fips:19169')}/core`);
    expect(again.headers.etag).toBe(res.headers.etag);
    await app.close();
  });

  it('rejects a malformed id and returns 404 for a valid but unpublished one', async () => {
    const app = createApp();
    expect((await app.inject(`/v1/locations/${encodeURIComponent('US:fips:9169')}/core`)).statusCode).toBe(422);
    expect((await app.inject(`/v1/locations/${encodeURIComponent('US:fips:01001')}/core`)).statusCode).toBe(404);
    await app.close();
  });

  it('serves the official boundary files referenced by the cores', async () => {
    const app = createApp();
    const core = (await app.inject(`/v1/locations/${encodeURIComponent('US:fips:20191')}/core`)).json().data;
    const boundary = await app.inject(core.place.boundary_url);
    expect(boundary.statusCode).toBe(200);
    expect(JSON.parse(boundary.body).features.length).toBeGreaterThan(0);
    await app.close();
  });
});
