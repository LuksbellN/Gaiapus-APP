// Public future-planning routes: capabilities, regional publications, immutable runs and series, served from the pinned
// publication with checksum verification.
import { describe, expect, it } from 'vitest';
import { validators } from '@gaiapus/contracts';
import { createApp } from '../app.js';

const valid = (name: string, body: unknown) => expect(validators[name]!(body), JSON.stringify(validators[name]!.errors?.slice(0, 3))).toBe(true);

describe('future simulation API', () => {
  it('lists capabilities per place, crop and harvest year with reasons', async () => {
    const app = createApp();
    const res = await app.inject('/v1/simulations/capabilities?location_id=BR:ibge:3170206');
    expect(res.statusCode).toBe(200);
    valid('SimulationCatalogResponse', res.json());
    const place = res.json().data.places;
    expect(place.map((p: any) => p.location_id)).toEqual(['BR:ibge:3170206']);
    const coffee = place[0].capabilities.find((c: any) => c.crop_id === 'coffee_arabica');
    expect([coffee.status, coffee.reason_code]).toEqual(['unsupported', 'perennial_engine_missing']);
    const filtered = (await app.inject('/v1/simulations/capabilities?crop_id=soy&harvest_year=2028')).json().data.places;
    expect(filtered.length).toBe(4);
    expect(filtered.every((p: any) => p.capabilities.every((c: any) => c.crop_id === 'soy' && c.harvest_year === 2028 && c.status === 'ready'))).toBe(true);
    await app.close();
  });

  it('lists regional publications and filters by place and crop', async () => {
    const app = createApp();
    const res = await app.inject('/v1/simulations/regional?location_id=BR:ibge:5107925&crop_id=maize2');
    valid('SimulationPublicationListResponse', res.json());
    const items = res.json().data.items;
    expect(items.map((p: any) => p.plan_id)).toEqual(['soy>maize2']);
    expect(items[0].visibility).toBe('public_regional');
    expect((await app.inject('/v1/simulations/regional')).json().data.items.length).toBe(7);
    await app.close();
  });

  it('serves an immutable run and its representative series, verified by checksum', async () => {
    const app = createApp();
    const id = (await app.inject('/v1/simulations/regional?location_id=BR:ibge:5107925&crop_id=soy')).json().data.items.find((p: any) => p.plan_id === 'soy>maize2').run_id;
    const run = await app.inject(`/v1/simulations/${id}`);
    expect(run.statusCode).toBe(200);
    valid('SimulationRunResponse', run.json());
    expect(run.headers['cache-control']).toContain('immutable');
    expect(run.json().data.location_id).toBe('BR:ibge:5107925');
    const series = await app.inject(`/v1/simulations/${id}/series`);
    valid('SimulationSeriesResponse', series.json());
    const s = series.json().data;
    expect(s.members.map((m: any) => m.role)).toEqual(['central', 'dry', 'wet']);
    expect(s.members[0].member_id).toBe(run.json().data.representative.central);
    expect(s.dates).toContain('2028-02-29');
    expect(s.members.every((m: any) => m.storage_mm.length === s.dates.length)).toBe(true);
    expect(s.full_members_artifact.kind).toBe('series');
    await app.close();
  });

  it('rejects malformed ids and returns 404 for unknown runs', async () => {
    const app = createApp();
    expect((await app.inject('/v1/simulations/not-a-run')).statusCode).toBe(422);
    expect((await app.inject('/v1/simulations/sim_000000000000000000000000')).statusCode).toBe(404);
    expect((await app.inject('/v1/simulations/capabilities?harvest_year=27')).statusCode).toBe(422);
    await app.close();
  });
});
