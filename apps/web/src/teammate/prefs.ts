// Device preferences (theme, language, last explorer place). Kept outside the per-account buckets
// (gaiapus.v1.guest / gaiapus.v1.user.<id>): they are not private farm data and must survive reloads,
// sign-in and sign-out. Nothing here authenticates or identifies anyone.
import { useSyncExternalStore } from 'react';
import { isLocale, type Locale } from './i18n/locale';

export const PREFS_KEY = 'gaiapus.prefs';
export type Theme = 'dark' | 'light';
/** Browser chrome colour per theme: the `--bg` token of styles.css (also set before React in index.html). */
export const THEME_COLOR: Record<Theme, string> = { dark: '#0B1411', light: '#F2F6F3' };
export type Prefs = { v: 1; theme: Theme; locale: Locale | null; lastExplore: string | null };
const DEFAULTS: Prefs = { v: 1, theme: 'dark', locale: null, lastExplore: null };

function read(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) { const p = JSON.parse(raw); return { ...DEFAULTS, theme: p.theme === 'light' ? 'light' : 'dark', locale: isLocale(p.locale) ? p.locale : null, lastExplore: typeof p.lastExplore === 'string' ? p.lastExplore : null }; }
    // One-time migration: the theme used to live inside the guest bucket (or the legacy key).
    const legacy = JSON.parse(localStorage.getItem('gaiapus.v1.guest') ?? localStorage.getItem('gaiapus.v1') ?? '{}');
    return { ...DEFAULTS, theme: legacy.theme === 'light' ? 'light' : 'dark' };
  } catch { return { ...DEFAULTS }; }
}

let prefs: Prefs = typeof localStorage === 'undefined' ? { ...DEFAULTS } : read();
const subs = new Set<() => void>();
export const getPrefs = () => prefs;
export function setPrefs(patch: Partial<Omit<Prefs, 'v'>>) {
  prefs = { ...prefs, ...patch };
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* storage blocked: keep in memory for this session */ }
  subs.forEach((f) => f());
}
export function usePrefs<T>(sel: (p: Prefs) => T): T { return useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => sel(prefs)); }
/** Test hook: re-read storage as a fresh page load would. */
export function reloadPrefsForTest() { prefs = read(); }
