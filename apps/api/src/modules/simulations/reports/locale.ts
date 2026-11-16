// Deterministic resolution of the report language. The request names a locale explicitly (the language the
// interface is actually rendering); nothing is taken from Accept-Language, IP, the country of the crop or the account.
// Absent, malformed or unsupported input resolves to English and says why.
import type { ReportLocale, ReportLocaleResolution } from '@gaiapus/contracts';

export const REPORT_LOCALES: readonly ReportLocale[] = ['pt-BR', 'en', 'es', 'fr', 'de'];
export const DEFAULT_REPORT_LOCALE: ReportLocale = 'en';
// Portuguese is offered as Brazilian Portuguese only: pt, pt-PT and every other pt variant resolve to pt-BR.
const BY_LANGUAGE: Readonly<Record<string, ReportLocale>> = { pt: 'pt-BR', en: 'en', es: 'es', fr: 'fr', de: 'de' };
const MAX_TAG = 35;

/** What is echoed back of an untrusted locale string: printable characters only, bounded. */
function echo(value: string): string {
  return value.replace(/[^\x20-\x7e]/g, '?').slice(0, MAX_TAG);
}

export interface LocaleOptions {
  /** False when the report catalogue of a language cannot be used; the whole report then falls back to English. */
  available?: (locale: ReportLocale) => boolean;
}

export function resolveReportLocale(requested: string | null | undefined, options: LocaleOptions = {}): ReportLocaleResolution {
  if (requested === null || requested === undefined) return { requested_locale: null, resolved_locale: DEFAULT_REPORT_LOCALE, fallback_reason: 'missing' };
  const fallback = (reason: 'invalid' | 'unsupported' | 'catalog_unavailable'): ReportLocaleResolution => ({ requested_locale: echo(String(requested)), resolved_locale: DEFAULT_REPORT_LOCALE, fallback_reason: reason });
  if (typeof requested !== 'string') return fallback('invalid');
  const tag = requested.trim().replaceAll('_', '-');
  // Validate the shape before anything builds a formatter from it.
  if (!tag || tag.length > MAX_TAG || !/^[A-Za-z0-9-]+$/.test(tag)) return fallback('invalid');
  let canonical: string;
  try { canonical = Intl.getCanonicalLocales(tag)[0] ?? ''; } catch { return fallback('invalid'); }
  const language = canonical.split('-')[0]!.toLowerCase();
  const resolved = BY_LANGUAGE[language];
  if (!resolved) return fallback('unsupported');
  if (options.available && !options.available(resolved)) return fallback('catalog_unavailable');
  return { requested_locale: echo(requested), resolved_locale: resolved, fallback_reason: null };
}

const zones = new Map<string, boolean>();
/** A display time zone is accepted only when the runtime knows it (IANA name). */
export function isKnownTimeZone(zone: string): boolean {
  if (zone.length > 64 || !/^[A-Za-z0-9_+/-]+$/.test(zone)) return false;
  let known = zones.get(zone);
  if (known === undefined) {
    try { new Intl.DateTimeFormat('en', { timeZone: zone }); known = true; } catch { known = false; }
    if (zones.size < 1000) zones.set(zone, known);
  }
  return known;
}
