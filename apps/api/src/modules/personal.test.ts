import { describe, it, expect } from 'vitest';
import { createApp } from '../app.js';
import { testDependencies, authA, authB, userA } from '../../tests/helpers.js';
import { validators } from '@gaiapus/contracts';
describe('verified personal API', () => {
  it('rejects anonymous, expired, invalid and unverified identity', async () => {
    const app = createApp(testDependencies());
    for (const token of [null, 'expired', 'invalid', 'unverified']) {
      const response = await app.inject({ url: '/v1/me', headers: token ? { authorization: `Bearer ${token}` } : {} });
      expect(response.statusCode).toBe(401); expect(response.headers['cache-control']).toBe('private, no-store');
    }
    await app.close();
  });
  it('initializes defaults idempotently and permits only allowed account changes', async () => {
    const app = createApp(testDependencies());
    const first = await app.inject({ url: '/v1/me', headers: authA });
    expect(first.statusCode).toBe(200); expect(first.json().data.profile.user_id).toBe(userA);
    expect(validators.MeResultResponse!(first.json())).toBe(true);
    const second = await app.inject({ url: '/v1/me', headers: authA });
    expect(second.json().data).toEqual(first.json().data);
    const update = await app.inject({ method: 'PATCH', url: '/v1/me', headers: authA, payload: { display_name: 'Ana', locale: 'en' } });
    expect(update.json().data.profile.display_name).toBe('Ana'); expect(update.json().data.preferences.locale).toBe('en');
    expect((await app.inject({ method: 'PATCH', url: '/v1/me', headers: authA, payload: { user_id: 'someone-else' } })).statusCode).toBe(422);
    await app.close();
  });
  it('saves published places once per area, renames and isolates another account', async () => {
    const app = createApp(testDependencies());
    const save = () => app.inject({ method: 'POST', url: '/v1/places', headers: authA, payload: { area_id: '5107925' } });
    const first = await save(); const again = await save();
    expect(first.statusCode).toBe(200); expect(again.json().data.id).toBe(first.json().data.id);
    const id = first.json().data.id;
    expect((await app.inject({ url: '/v1/places', headers: authB })).json().data.items).toEqual([]);
    expect((await app.inject({ method: 'PATCH', url: `/v1/places/${id}`, headers: authB, payload: { label: 'stolen' } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'DELETE', url: `/v1/places/${id}`, headers: authB })).statusCode).toBe(404);
    expect((await app.inject({ method: 'PATCH', url: '/v1/me', headers: authB, payload: { last_monitored_place_id: id } })).statusCode).toBe(404);
    const renamed = await app.inject({ method: 'PATCH', url: `/v1/places/${id}`, headers: authA, payload: { label: 'My Sorriso' } });
    expect(renamed.json().data.label).toBe('My Sorriso');
    expect((await app.inject({ method: 'POST', url: '/v1/places', headers: authA, payload: { area_id: 'unknown' } })).statusCode).toBe(404);
    await app.inject({ method: 'PATCH', url: '/v1/me', headers: authA, payload: { last_monitored_place_id: id } });
    const deleted = await app.inject({ method: 'DELETE', url: `/v1/places/${id}`, headers: authA });
    expect(deleted.statusCode).toBe(204); expect(deleted.body).toBe('');
    expect((await app.inject({ url: '/v1/me', headers: authA })).json().data.preferences.last_monitored_place_id).toBeNull();
    await app.close();
  });
});
