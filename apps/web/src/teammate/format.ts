// Numbers and dates in the rendered language (Intl). Same exports as before, so screens keep their calls.
// Calendar dates (YYYY-MM-DD) are formatted in UTC so a day never shifts with the time zone.
import { CROP_IDS, CROPS } from './catalog';
import { activeLocale, translate } from './i18n';
import type { Locale } from './i18n/locale';

const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();
function nf(d: number, l: Locale = activeLocale()) { const k = `n${l}${d}`; let f = cache.get(k) as Intl.NumberFormat | undefined; if (!f) { f = new Intl.NumberFormat(l, { minimumFractionDigits: d, maximumFractionDigits: d }); cache.set(k, f); } return f; }
function df(opts: Intl.DateTimeFormatOptions, l: Locale = activeLocale()) { const k = `d${l}${JSON.stringify(opts)}`; let f = cache.get(k) as Intl.DateTimeFormat | undefined; if (!f) { f = new Intl.DateTimeFormat(l, opts); cache.set(k, f); } return f; }

export const n0 = (v: number | null | undefined) => (v == null || Number.isNaN(v) ? '—' : nf(0).format(v));
export const n1 = (v: number | null | undefined) => (v == null || Number.isNaN(v) ? '—' : nf(1).format(v));
export const n2 = (v: number | null | undefined) => (v == null || Number.isNaN(v) ? '—' : nf(2).format(v));
/** Number with up to `max` decimals (no trailing zeros), in the rendered language. */
export const nMax = (v: number | null | undefined, max = 2) => (v == null || Number.isNaN(v) ? '—' : new Intl.NumberFormat(activeLocale(), { maximumFractionDigits: max }).format(v));
export const signed = (v: number, d = 1) => (v > 0 ? '+' : v < 0 ? '−' : '') + nf(d).format(Math.abs(v));
export const pct = (f: number | null | undefined) => (f == null ? '—' : new Intl.NumberFormat(activeLocale(), { style: 'percent', maximumFractionDigits: 0 }).format(f));

const isDay = (iso: string) => iso.length === 10;
const asDate = (iso: string) => (isDay(iso) ? new Date(iso + 'T12:00:00Z') : new Date(iso));
const tz = (iso: string): Intl.DateTimeFormatOptions => (isDay(iso) ? { timeZone: 'UTC' } : {});
// Portuguese keeps the approved compact form ("14 nov 2026", "nov/26"); other languages use their native Intl form.
function compactPt(iso: string, withYear: boolean) { const parts = df({ day: 'numeric', month: 'short', year: 'numeric', ...tz(iso) }).formatToParts(asDate(iso)); const get = (t: string) => parts.find((p) => p.type === t)?.value.replace('.', '') ?? ''; return [get('day'), get('month'), withYear ? get('year') : ''].filter(Boolean).join(' '); }
export const dShort = (iso: string) => (activeLocale() === 'pt-BR' ? compactPt(iso, false) : df({ day: 'numeric', month: 'short', ...tz(iso) }).format(asDate(iso)));
export const dFull = (iso: string) => (activeLocale() === 'pt-BR' ? compactPt(iso, true) : df({ day: 'numeric', month: 'short', year: 'numeric', ...tz(iso) }).format(asDate(iso)));
export const dMonth = (iso: string) => { if (activeLocale() !== 'pt-BR') return df({ month: 'short', year: '2-digit', ...tz(iso) }).format(asDate(iso)); const parts = df({ month: 'short', year: '2-digit', ...tz(iso) }).formatToParts(asDate(iso)); return `${parts.find((p) => p.type === 'month')?.value.replace('.', '')}/${parts.find((p) => p.type === 'year')?.value}`; };
export const dWeek = (iso: string) => df({ weekday: 'short', ...tz(iso) }).format(asDate(iso)).replace('.', '');
export const dNumeric = (iso: string) => df({ day: '2-digit', month: '2-digit', year: 'numeric', ...tz(iso) }).format(asDate(iso));
export const dDateTime = (iso: string) => df({ dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
export function dTime(iso: string) { const d = new Date(iso); return `${activeLocale() === 'pt-BR' ? compactPt(iso.slice(0, 10), false) : df({ day: 'numeric', month: 'short' }).format(d)}, ${df({ hour: '2-digit', minute: '2-digit' }).format(d)} (${translate('common.localTime')})`; }
export const money = (v: number, cur = 'BRL') => new Intl.NumberFormat(activeLocale(), { style: 'currency', currency: cur }).format(v);
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
/** Collation in the rendered language (lists sorted by name). */
export const byName = (a: string, b: string) => a.localeCompare(b, activeLocale());

// Label maps read on access, so the current language is always used.
const labels = (prefix: string) => new Proxy({} as Record<string, string>, { get: (_, k) => (typeof k === 'string' ? translate(`${prefix}.${k}`) : undefined) });
export const STAGE: Record<string, string> = labels('stage');
export const LAND: Record<string, string> = labels('land');
export const CROP: Record<string, string> = new Proxy({} as Record<string, string>, { get: (_, k) => (typeof k === 'string' && (CROP_IDS as readonly string[]).includes(k) ? CROPS[k as keyof typeof CROPS].name : undefined) });
