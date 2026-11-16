import { translate } from '../../teammate/i18n';

export function authRedirect(kind: 'callback' | 'recovery', origin = window.location.origin) {
  return `${origin}/auth/${kind}`;
}

export function safeReturnPath(path: string | null) {
  return path?.startsWith('/?') || path?.startsWith('/#/') || path === '/' ? path : '/';
}

/** Problem with an e-mail link as a message key, so the page can show it in the current language. */
export function callbackProblemKey(url: URL): 'auth.expired' | 'auth.incomplete' | null {
  const hash = new URLSearchParams(url.hash.slice(1).replace(/^\//, ''));
  if (url.searchParams.has('error') || hash.has('error')) return 'auth.expired';
  if (!url.searchParams.get('code') && !url.searchParams.get('token_hash') && !(hash.get('access_token') && hash.get('refresh_token'))) return 'auth.incomplete';
  return null;
}

export function callbackProblem(url: URL) {
  const key = callbackProblemKey(url);
  return key ? translate(key) : null;
}
