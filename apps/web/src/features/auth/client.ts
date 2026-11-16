import { createClient, type Session } from '@supabase/supabase-js';
import { clearRecovery } from './recovery';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url, key, {
  auth: { flowType: 'pkce', detectSessionInUrl: false, persistSession: true, autoRefreshToken: true },
}) : null;

let session: Session | null = null;
export const currentAccessToken = () => session?.user.email_confirmed_at ? session.access_token : null;
export async function initializeAuth() {
  if (!supabase) return;
  supabase.auth.onAuthStateChange((event, next) => { session = next; if (event === 'SIGNED_OUT') clearRecovery(); });
  const { data } = await supabase.auth.getSession();
  session = data.session;
}

// Share a single exchange across React StrictMode remounts: PKCE codes are one-use.
const exchanges = new Map<string, Promise<Session>>();
export function exchangeEmailCode(code: string) {
  return completeEmailLink(new URL(`/auth/callback?code=${encodeURIComponent(code)}`, location.origin));
}

export function completeEmailLink(url: URL, recovery = false) {
  const key = `${recovery}:${url.search}:${url.hash}`;
  const existing = exchanges.get(key);
  if (existing) return existing;
  const pending = (async () => {
    if (!supabase) throw new Error('not_configured');
    const code = url.searchParams.get('code');
    const tokenHash = url.searchParams.get('token_hash');
    const type = url.searchParams.get('type');
    const hash = new URLSearchParams(url.hash.slice(1).replace(/^\//, ''));
    let result;
    if (code) result = await supabase.auth.exchangeCodeForSession(code);
    else if (tokenHash && (recovery ? type === 'recovery' : type === 'email' || type === 'signup')) {
      result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as 'email' | 'signup' | 'recovery' });
    } else if (hash.get('access_token') && hash.get('refresh_token') && (recovery ? hash.get('type') === 'recovery' : hash.get('type') !== 'recovery')) {
      result = await supabase.auth.setSession({ access_token: hash.get('access_token')!, refresh_token: hash.get('refresh_token')! });
    } else throw new Error('invalid_email_link');
    const { data, error } = result;
    if (error || !data.session) throw error ?? new Error('missing_session');
    session = data.session;
    return data.session;
  })();
  exchanges.set(key, pending);
  // Keep one-use exchanges only briefly, including across StrictMode remounts.
  void pending.finally(() => setTimeout(() => exchanges.delete(key), 60_000)).catch(() => {});
  return pending;
}
