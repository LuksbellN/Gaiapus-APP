import { beforeEach, expect, it, vi } from 'vitest';
const { signin, signup, signout, me } = vi.hoisted(() => ({ signin: vi.fn(), signup: vi.fn(), signout: vi.fn(), me: vi.fn() }));
vi.mock('../../features/auth/client', () => ({ supabase: { auth: { signInWithPassword: signin, signUp: signup, signOut: signout } } }));
vi.mock('./http', () => ({ backend: { me } }));
import { authAccount, syncSession } from './session';
import { activateAccount, getState, resetAll } from '../store';
const user = { id: 'real-user', email: 'ana@example.com', email_confirmed_at: '2026-11-14', user_metadata: { display_name: 'Ana' } };
beforeEach(() => { vi.clearAllMocks(); activateAccount(null); resetAll(); localStorage.clear(); me.mockResolvedValue({ profile: { display_name: 'Ana' } }); });
it('uses the real password provider without persisting the password in local records', async () => {
  signin.mockResolvedValue({ data: { session: { user } }, error: null });
  await authAccount.signIn('', 'ana@example.com', 'private-password');
  expect(signin).toHaveBeenCalledWith({ email: 'ana@example.com', password: 'private-password' });
  expect(getState().session).toMatchObject({ userId: 'real-user', name: 'Ana' });
  expect(JSON.stringify(getState())).not.toContain('private-password');
});
it('requests email confirmation and never treats a signup as a verified account', async () => {
  signup.mockResolvedValue({ error: null });
  await authAccount.signUp('Ana', 'ana@example.com', 'private-password');
  expect(signup).toHaveBeenCalledWith(expect.objectContaining({ options: { emailRedirectTo: `${location.origin}/auth/callback`, data: { display_name: 'Ana' } } }));
  expect(getState().session).toBeNull();
});
it('preserves rate limiting as an actionable authentication error', async () => {
  signup.mockResolvedValue({ error: { status: 429, code: 'over_email_send_rate_limit' } });
  await expect(authAccount.signUp('Ana', 'ana@example.com', 'private-password')).rejects.toMatchObject({ code: 'auth_rate_limited', status: 429 });
  expect(getState().session).toBeNull();
});
it('identifies an unconfirmed email so login can offer confirmation resend', async () => {
  signin.mockResolvedValue({ data: { session: null }, error: { code: 'email_not_confirmed' } });
  await expect(authAccount.signIn('', 'ana@example.com', 'private-password')).rejects.toMatchObject({ code: 'email_not_confirmed' });
});
it('does not authenticate unconfirmed identities or clear a session after a failed logout', async () => {
  syncSession({ user } as never);
  signout.mockResolvedValue({ error: new Error('network') });
  await expect(authAccount.signOut()).rejects.toMatchObject({ code: 'signout_failed' });
  expect(getState().session?.userId).toBe('real-user');
  syncSession({ user: { ...user, email_confirmed_at: null } } as never);
  expect(getState().session).toBeNull();
});
