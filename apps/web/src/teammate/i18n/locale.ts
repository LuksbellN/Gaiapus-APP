// Supported interface languages. Tags are technical identifiers, not audiences by nationality.
export const LOCALES = ['pt-BR', 'en', 'es', 'fr', 'de'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export const isLocale = (x: unknown): x is Locale => typeof x === 'string' && (LOCALES as readonly string[]).includes(x);

/** Self-names shown in the language selector. */
export const LOCALE_LABEL: Record<Locale, string> = { 'pt-BR': 'Português', en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch' };
export const LOCALE_SHORT: Record<Locale, string> = { 'pt-BR': 'PT', en: 'EN', es: 'ES', fr: 'FR', de: 'DE' };

/** First browser language that matches one of the five, else English. pt-PT and other pt variants map to pt-BR. */
export function negotiateLocale(preferred: readonly string[] | undefined): Locale {
  for (const tag of preferred ?? []) {
    const base = tag.toLowerCase().split('-')[0];
    if (base === 'pt') return 'pt-BR';
    const hit = LOCALES.find((l) => l === base);
    if (hit) return hit;
  }
  return DEFAULT_LOCALE;
}
