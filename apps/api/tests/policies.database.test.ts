import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createApp } from '../src/app.js';
import { supabaseDependencies } from '../src/plugins/supabase.js';
import { randomUUID } from 'node:crypto';

// Intentionally fails when not configured: a skipped run is not policy evidence.
const required = ['SUPABASE_TEST_URL', 'SUPABASE_TEST_PUBLISHABLE_KEY', 'SUPABASE_TEST_USER_A_EMAIL', 'SUPABASE_TEST_USER_A_PASSWORD', 'SUPABASE_TEST_USER_B_EMAIL', 'SUPABASE_TEST_USER_B_PASSWORD', 'SUPABASE_TEST_STORAGE_SIGNING_KEY'] as const;
const missing = required.filter(name => !process.env[name]);
describe('real Supabase Auth + PostgREST user-scoped integration', () => {
  it('requires explicit dedicated test-project configuration', () => { expect(missing, `Missing ${missing.join(', ')}`).toEqual([]); });
  it.runIf(missing.length === 0)('enforces two verified accounts plus anonymous access through API and database', async () => {
    const url = process.env.SUPABASE_TEST_URL!, key = process.env.SUPABASE_TEST_PUBLISHABLE_KEY!;
    const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const userA = client(), userB = client(), anonymous = client();
    const signIn = async (user: typeof userA, prefix: 'A' | 'B') => {
      const { data, error } = await user.auth.signInWithPassword({ email: process.env[`SUPABASE_TEST_USER_${prefix}_EMAIL`]!, password: process.env[`SUPABASE_TEST_USER_${prefix}_PASSWORD`]! });
      expect(error).toBeNull(); expect(data.user?.email_confirmed_at).toBeTruthy(); return data.session!.access_token;
    };
    const [tokenA, tokenB] = await Promise.all([signIn(userA, 'A'), signIn(userB, 'B')]);
    expect((await userA.auth.getUser()).data.user!.id).not.toBe((await userB.auth.getUser()).data.user!.id);
    const app = createApp(supabaseDependencies({ url, publishableKey: key, signingKey: process.env.SUPABASE_TEST_STORAGE_SIGNING_KEY }));
    const headersA = { authorization: `Bearer ${tokenA}` }, headersB = { authorization: `Bearer ${tokenB}` };
    let comparisonId: string | undefined; let placeId: string | undefined;
    try {
      const anon = await anonymous.from('profiles').select('*'); expect(anon.error).not.toBeNull();
      const profileA = await app.inject({ url: '/v1/me', headers: headersA }); expect(profileA.statusCode).toBe(200);
      expect((await app.inject({ url: '/v1/me', headers: headersB })).statusCode).toBe(200);
      const place = await app.inject({ method: 'POST', url: '/v1/places', headers: headersA, payload: { area_id: '5107925' } }); expect(place.statusCode).toBe(200); placeId = place.json().data.id;
      expect((await userB.from('monitored_places').select('*').eq('id', placeId!)).data).toEqual([]);
      expect((await userB.from('monitored_places').update({ label: 'stolen' }).eq('id', placeId!).select()).data).toEqual([]);
      const userBId = (await userB.auth.getUser()).data.user!.id;
      const crossLink = await userB.from('user_preferences').update({ last_monitored_place_id: placeId }).eq('user_id', userBId); expect(crossLink.error).not.toBeNull();
      const saveBody = { source: { kind: 'example', example_id: 'yield-soy-5107925-day75' }, title: 'Dedicated integration test', monitored_place_id: placeId };
      const saveHeaders = { ...headersA, 'Idempotency-Key': `test-${randomUUID()}` };
      const saved = await app.inject({ method: 'POST', url: '/v1/comparisons', headers: saveHeaders, payload: saveBody }); expect(saved.statusCode).toBe(200); comparisonId = saved.json().data.id;
      const retry = await app.inject({ method: 'POST', url: '/v1/comparisons', headers: saveHeaders, payload: saveBody }); expect(retry.json().data.id).toBe(comparisonId);
      expect((await app.inject({ method: 'POST', url: '/v1/comparisons', headers: saveHeaders, payload: { ...saveBody, title: 'conflicting' } })).statusCode).toBe(409);
      expect((await app.inject({ url: `/v1/comparisons/${comparisonId}`, headers: headersB })).statusCode).toBe(404);
      expect((await userA.from('comparison_snapshots').update({ output_envelope: {} }).eq('id', comparisonId!)).error).not.toBeNull();
      expect((await app.inject({ method: 'DELETE', url: `/v1/places/${placeId}`, headers: headersA })).statusCode).toBe(204); placeId = undefined;
      const reopened = await app.inject({ url: `/v1/comparisons/${comparisonId}`, headers: headersA }); expect(reopened.json().data.output_envelope).toEqual(saved.json().data.output_envelope); expect(reopened.json().data.monitored_place_id).toBeNull();
    } finally {
      if (comparisonId) await app.inject({ method: 'DELETE', url: `/v1/comparisons/${comparisonId}`, headers: headersA });
      if (placeId) await app.inject({ method: 'DELETE', url: `/v1/places/${placeId}`, headers: headersA });
      await app.close(); await Promise.all([userA.auth.signOut(), userB.auth.signOut()]);
    }
  }, 30000);
});
