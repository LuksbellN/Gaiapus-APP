import type { Session } from '@supabase/supabase-js';
const key = 'gaiapus.auth.recovery';
type RecoverySession = Pick<Session, 'expires_at' | 'user'>;
export function clearRecovery() { sessionStorage.removeItem(key); }
export function rememberRecovery(session: RecoverySession) {
  sessionStorage.setItem(key, JSON.stringify({ user: session.user.id, sessionExpiry: session.expires_at, until: Date.now() + 15 * 60_000 }));
}
export function canResumeRecovery(session: RecoverySession | null) {
  try {
    const marker = JSON.parse(sessionStorage.getItem(key) ?? 'null');
    if (session && marker?.user === session.user.id && marker?.sessionExpiry === session.expires_at && marker?.until > Date.now()) return true;
  } catch { /* Invalid or expired markers require a fresh email link. */ }
  clearRecovery();
  return false;
}
