// Message catalogue and active language (Docs/ux-preservacao/07). Stable keys, named interpolation and plurals.
// Language is a device preference (prefs.ts); switching never reloads, never changes route, account or data.
// pt-BR (source text) and en (fallback) are bundled; es, fr and de load on demand with a retry on failure.
import { Fragment, useEffect, useState, type ReactNode } from 'react';
import ptBR from './messages/pt-BR';
import en from './messages/en';
import { getPrefs, setPrefs, usePrefs } from '../prefs';
import { DEFAULT_LOCALE, negotiateLocale, type Locale } from './locale';

export type Plural = { zero?: string; one: string; other: string };
type Tree = { [k: string]: string | Plural | Tree };
type Leaves<T, P extends string = ''> = { [K in keyof T & string]: T[K] extends string ? `${P}${K}` : T[K] extends Plural ? `${P}${K}` : Leaves<T[K], `${P}${K}.`> }[keyof T & string];
export type Messages = typeof ptBR;
export type MessageKey = Leaves<Messages>;
export type DeepPartial<T> = { [K in keyof T]?: T[K] extends string ? string : T[K] extends Plural ? Plural : DeepPartial<T[K]> };
export type Vars = Record<string, string | number>;

const catalogs: Partial<Record<Locale, DeepPartial<Messages>>> = { 'pt-BR': ptBR, en };
const LOADERS: Partial<Record<Locale, () => Promise<{ default: DeepPartial<Messages> }>>> = { es: () => import('./messages/es'), fr: () => import('./messages/fr'), de: () => import('./messages/de') };
const listeners = new Set<() => void>();
let failed: Locale | null = null;

/** The language the user chose, or the negotiated one when they never chose. */
export const chosenLocale = (): Locale => getPrefs().locale ?? negotiateLocale(typeof navigator !== 'undefined' ? navigator.languages : undefined);
/** The language actually rendered: the chosen one once its catalogue is loaded, English meanwhile. */
export const activeLocale = (): Locale => { const c = chosenLocale(); return catalogs[c] ? c : DEFAULT_LOCALE; };

export async function ensureLocale(l: Locale): Promise<boolean> {
  if (catalogs[l]) return true;
  try { catalogs[l] = (await LOADERS[l]!()).default; failed = null; listeners.forEach((f) => f()); return true; }
  catch { failed = l; listeners.forEach((f) => f()); return false; }
}

function lookup(tree: unknown, key: string): string | Plural | undefined {
  let node = tree as Tree | string | Plural | undefined;
  for (const part of key.split('.')) { if (!node || typeof node !== 'object') return undefined; node = (node as Tree)[part]; }
  return typeof node === 'string' || (node && typeof node === 'object' && 'other' in node) ? (node as string | Plural) : undefined;
}
const pluralRules = new Map<Locale, Intl.PluralRules>();
/** Translation outside React (adapters, proxies), using the rendered language. */
export function translate(key: MessageKey | string, vars?: Vars, locale: Locale = activeLocale()): string {
  let msg = lookup(catalogs[locale], key) ?? lookup(catalogs.en, key) ?? lookup(catalogs['pt-BR'], key);
  if (msg === undefined) return key;
  if (typeof msg === 'object') {
    const n = Number(vars?.count ?? 0); let rules = pluralRules.get(locale); if (!rules) { rules = new Intl.PluralRules(locale); pluralRules.set(locale, rules); }
    msg = n === 0 && msg.zero !== undefined ? msg.zero : rules.select(n) === 'one' ? msg.one : msg.other;
  }
  return vars ? msg.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : msg;
}
/** Translation with React nodes as variables, for sentences with bold parts or links. */
export function translateNodes(key: MessageKey, vars: Record<string, ReactNode>, locale?: Locale): ReactNode {
  const raw = translate(key, undefined, locale);
  return raw.split(/(\{\w+\})/g).map((part, i) => { const m = /^\{(\w+)\}$/.exec(part); return <Fragment key={i}>{m && m[1] in vars ? vars[m[1]] : part}</Fragment>; });
}

export function setLocale(l: Locale) { setPrefs({ locale: l }); void ensureLocale(l); }

/** Hook: re-renders on language change. `t` and `tn` use the rendered language. */
export function useI18n() {
  usePrefs((p) => p.locale);
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((x) => x + 1); listeners.add(f); return () => { listeners.delete(f); }; }, []);
  const chosen = chosenLocale(); const locale = activeLocale();
  useEffect(() => { if (!catalogs[chosen]) void ensureLocale(chosen); }, [chosen]);
  return {
    locale, chosen, loading: locale !== chosen && failed !== chosen, failed: failed === chosen,
    t: (key: MessageKey, vars?: Vars) => translate(key, vars, locale),
    tn: (key: MessageKey, vars: Record<string, ReactNode>) => translateNodes(key, vars, locale),
    setLocale, retry: () => ensureLocale(chosen),
  };
}

/** Test helpers. */
export const catalogFor = (l: Locale) => catalogs[l];
export async function loadAllCatalogsForTest() { for (const l of Object.keys(LOADERS) as Locale[]) await ensureLocale(l); }
