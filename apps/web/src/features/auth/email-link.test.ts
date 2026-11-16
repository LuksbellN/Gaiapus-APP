import { beforeEach, expect, it, vi } from 'vitest';

const { code, otp, tokens } = vi.hoisted(() => ({ code: vi.fn(), otp: vi.fn(), tokens: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { exchangeCodeForSession: code, verifyOtp: otp, setSession: tokens } }) }));

beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'public-test-key');
  for (const fn of [code, otp, tokens]) fn.mockResolvedValue({ data: { session: { user: { email_confirmed_at: 'today' } } }, error: null });
});

it('verifies a token hash once across repeated callback effects', async () => {
  const { completeEmailLink } = await import('./client');
  const url = new URL('https://gaiapus.space/auth/callback?token_hash=one-use&type=email');
  await Promise.all([completeEmailLink(url), completeEmailLink(url)]);
  expect(otp).toHaveBeenCalledTimes(1);
  expect(otp).toHaveBeenCalledWith({ token_hash: 'one-use', type: 'email' });
});
it('accepts legacy implicit confirmation tokens', async () => {
  const { completeEmailLink } = await import('./client');
  await completeEmailLink(new URL('https://gaiapus.space/auth/callback#access_token=access&refresh_token=refresh&type=signup'));
  expect(tokens).toHaveBeenCalledWith({ access_token: 'access', refresh_token: 'refresh' });
});
it('exchanges different PKCE codes separately', async () => {
  const { exchangeEmailCode } = await import('./client');
  await exchangeEmailCode('first'); await exchangeEmailCode('second');
  expect(code).toHaveBeenCalledTimes(2);
});
it('rejects signup hashes on the recovery route', async () => {
  const { completeEmailLink } = await import('./client');
  await expect(completeEmailLink(new URL('https://gaiapus.space/auth/recovery?token_hash=signup&type=email'), true)).rejects.toThrow('invalid_email_link');
  expect(otp).not.toHaveBeenCalled();
});
