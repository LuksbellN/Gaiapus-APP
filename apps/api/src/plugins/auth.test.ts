import { afterEach, describe, it, expect, vi } from 'vitest';
import { supabaseDependencies } from './supabase.js';
const userId = '00000000-0000-4000-8000-000000000001';
afterEach(() => vi.unstubAllGlobals());
describe('Supabase identity verification boundary', () => {
  it('uses the provider’s verified user instead of browser claims', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', async (url: string | URL | Request, options: RequestInit) => {
      calls.push(String(url));
      expect(new Headers(options.headers).get('authorization')).toBe('Bearer opaque-access-token');
      return new Response(JSON.stringify({ id: userId, email_confirmed_at: '2026-11-14T12:00:00Z' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    const dependencies = supabaseDependencies({ url: 'https://identity.example.test', publishableKey: 'publishable-test' });
    expect(await dependencies.verifyIdentity('opaque-access-token')).toEqual({ id: userId, token: 'opaque-access-token' });
    expect(calls).toEqual(['https://identity.example.test/auth/v1/user']);
  });
  it('rejects expired and unverified tokens and maps provider failure safely', async () => {
    for (const [status, body, expected] of [[401, { message: 'expired' }, 401], [200, { id: userId }, 401], [503, { message: 'provider down' }, 503]] as const) {
      vi.stubGlobal('fetch', async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
      const dependencies = supabaseDependencies({ url: 'https://identity.example.test', publishableKey: 'publishable-test' });
      await expect(dependencies.verifyIdentity('opaque')).rejects.toMatchObject({ status: expected });
    }
  });
});
