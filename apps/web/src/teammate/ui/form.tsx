import { useEffect, useRef, useState } from 'react';
import { getState, setDraft, useStore } from '../store';
import { parseLocaleNumber } from '../i18n/number';
import type { Locale } from '../i18n/locale';
import { activeLocale, translate } from '../i18n';
import { isLocale } from '../i18n/locale';
// Formulário com rascunho recuperável: cada alteração é guardada neste aparelho até salvar.
export function useDraftForm(key: string, initial: Record<string, string>) {
  // `__locale` records the language the numbers were typed in, so switching language never reinterprets them.
  // Drafts and saved data from before languages existed were typed in Portuguese.
  const legacy = (d: Record<string, string> | undefined) => (d ? { ...initial, ...d, __locale: d.__locale || 'pt-BR' } : { ...initial });
  const saved = useStore((s) => s.drafts[key]); const [v, setV] = useState<Record<string, string>>(() => legacy(saved)); const [restored, setRestored] = useState(() => !!saved); const k = useRef(key);
  // Switching key (e.g. plot A → B → A) loads that key's own draft instead of blanking it (D-06).
  useEffect(() => { if (k.current !== key) { k.current = key; const d = getState().drafts[key]; setV(legacy(d)); setRestored(!!d); } }, [key]); // eslint-disable-line
  const set = (name: string, value: string) => setV((p) => { const n = { ...p, [name]: value }; if (!n.__locale) n.__locale = activeLocale(); setDraft(key, n); return n; });
  const bind = (name: string) => ({ value: v[name] ?? '', onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => set(name, e.target.value) });
  return { v, set, bind, restored, locale: (isLocale(v.__locale) ? v.__locale : activeLocale()) as Locale, clear: () => { setDraft(key, null); setV({ ...initial }); }, load: (d: Record<string, string>) => setV(legacy(d)) };
}
/** Number typed in the convention of `locale`; null when empty or not readable. Never guesses magnitude. */
export const num = (s: string | undefined, locale: Locale = 'pt-BR') => { if (s == null) return null; const r = parseLocaleNumber(s, locale); return r.ok ? r.value : null; };
/** Field error for a typed number: undefined when empty or valid, otherwise how to write it. */
export function numError(s: string | undefined, locale: Locale = 'pt-BR'): string | undefined {
  if (s == null) return undefined; const r = parseLocaleNumber(s, locale); if (r.ok || r.reason === 'empty') return undefined;
  return r.reason === 'ambiguous' ? translate(r.decimal === ',' ? 'number.useComma' : 'number.usePoint', { example: r.example }) : translate('number.onlyNumbers', { example: r.example });
}
// Converte quantidade para kg conservando a unidade original no registro. Saca exige peso declarado.
export function toKg(q: number | null, unit: string, sackKg: number | null) { if (q == null) return null; if (unit === 'kg') return q; if (unit === 't') return q * 1000; if (unit === 'saca') return sackKg ? q * sackKg : null; return null; }
