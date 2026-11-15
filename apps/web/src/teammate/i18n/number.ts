// Reads numbers typed by the user in the convention of a locale. Intl.NumberFormat formats; it does not parse.
// Ambiguous input is refused with the expected decimal mark, never reinterpreted (10.5 in pt-BR is not 105).
import type { Locale } from './locale';

export type ParseResult = { ok: true; value: number } | { ok: false; reason: 'empty' | 'ambiguous' | 'invalid'; decimal: string; example: string };

const SPACES = /[\s  ]/g;
const separators = new Map<Locale, { decimal: string; group: string; spaceGroup: boolean }>();
function sepOf(locale: Locale) {
  let s = separators.get(locale);
  if (!s) {
    const parts = new Intl.NumberFormat(locale).formatToParts(1234567.5);
    const decimal = parts.find((p) => p.type === 'decimal')?.value ?? '.';
    const group = parts.find((p) => p.type === 'group')?.value ?? ',';
    s = { decimal, group, spaceGroup: /[\s  ]/.test(group) };
    separators.set(locale, s);
  }
  return s;
}

export function parseLocaleNumber(text: string, locale: Locale): ParseResult {
  const { decimal, group, spaceGroup } = sepOf(locale);
  const fail = (reason: 'empty' | 'ambiguous' | 'invalid'): ParseResult => ({ ok: false, reason, decimal, example: `10${decimal}5` });
  let t = text.trim();
  if (!t) return fail('empty');
  const negative = t.startsWith('-');
  if (negative) t = t.slice(1);
  const G = '\u0001';
  if (spaceGroup) t = t.replace(SPACES, G);
  else if (SPACES.test(t)) return fail('invalid');
  else t = t.split(group).join(G);
  // Only digits, the locale decimal mark and grouping are allowed. Anything else (e, +, letters, a foreign mark) is refused.
  const other = decimal === ',' ? '.' : ',';
  if (!new RegExp(`^[0-9${decimal === '.' ? '\\.' : decimal}${G}]+$`).test(t)) return fail(t.includes(other) ? 'ambiguous' : 'invalid');
  const [int, frac, extra] = t.split(decimal);
  if (extra !== undefined || !int) return fail('invalid');
  if (frac !== undefined && !/^[0-9]+$/.test(frac)) return fail(frac.includes(G) ? 'ambiguous' : 'invalid');
  // Grouping must be in blocks of three; "10.5" in pt-BR or "10,5" in en is a decimal written in another convention.
  if (int.includes(G) && !new RegExp(`^[0-9]{1,3}(${G}[0-9]{3})+$`).test(int)) return fail('ambiguous');
  const value = Number(`${int.split(G).join('')}${frac !== undefined ? '.' + frac : ''}`);
  if (!Number.isFinite(value)) return fail('invalid');
  return { ok: true, value: negative ? -value : value };
}
