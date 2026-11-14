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
let exchange: Promise<Session> | undefined;
export function exchangeEmailCode(code: string) {
  return exchange ??= (async () => {
    if (!supabase) throw new Error('not_configured');
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.session) throw error ?? new Error('missing_session');
    session = data.session;
    return data.session;
  })();
}
