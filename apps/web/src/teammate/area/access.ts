// Who may open "Minha área".
// The identity is the Supabase session verified by src/features/auth (PKCE, confirmed e-mail); store.session is set
// only by that bridge. On top of it the screen asks the private API route GET /v1/me, which validates the bearer
// token on the server and reads the caller's own rows under row-level security. Hiding a button or keeping a user
// id in the browser is not security: the server check is what authorises, and it is the only server call this area
// can make today — plots, stakes and telemetry have no route yet (see adapter.ts).
import { useAsync } from '../ui';
import { backend } from '../adapters/http';
import { useStore } from '../store';

export type Access =
  /** No verified session: nothing private is shown. */
  | { kind: 'signed_out' }
  /** Explicit demonstration without an account: guest bucket of this browser. Not authentication. */
  | { kind: 'guest_demo' }
  /** Verified session; `server` tells whether GET /v1/me confirmed it. */
  | { kind: 'account'; name: string; server: 'checking' | 'confirmed' | 'rejected' | 'unreachable' };

const REJECTED = new Set([401, 403]);
export function useAccess(demoRequested: boolean): Access {
  const session = useStore((s) => s.session);
  const me = useAsync(() => (session ? backend.me() : Promise.resolve(null)), [session?.userId]);
  if (!session) return demoRequested ? { kind: 'guest_demo' } : { kind: 'signed_out' };
  const status = (me.error as { status?: number } | undefined)?.status;
  const server = me.status === 'error' ? (status != null && REJECTED.has(status) ? 'rejected' : 'unreachable') : me.data ? 'confirmed' : 'checking';
  return { kind: 'account', name: session.name, server };
}
/** Only internal destinations of this app may be used as a return address after signing in. */
export const RETURN_ROUTES = ['/minha-area'] as const;
export const safeReturn = (value: string | null): string | null => ((RETURN_ROUTES as readonly string[]).includes(value ?? '') ? value : null);
