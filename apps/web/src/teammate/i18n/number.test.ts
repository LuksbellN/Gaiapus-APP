import { describe, expect, it } from 'vitest';
import { parseLocaleNumber } from './number';
import type { Locale } from './locale';

const NNBSP = ' ';
// Table from Docs/ux-preservacao/07-idiomas.md, section 6. null = refused.
const CASES: [string, Record<Locale, number | null>][] = [
  ['10,5', { 'pt-BR': 10.5, en: null, es: 10.5, fr: 10.5, de: 10.5 }],
  ['10.5', { 'pt-BR': null, en: 10.5, es: null, fr: null, de: null }],
  ['1.234,5', { 'pt-BR': 1234.5, en: null, es: 1234.5, fr: null, de: 1234.5 }],
  ['1,234.5', { 'pt-BR': null, en: 1234.5, es: null, fr: null, de: null }],
  [`1${NNBSP}234,5`, { 'pt-BR': null, en: null, es: null, fr: 1234.5, de: null }],
  ['1.5', { 'pt-BR': null, en: 1.5, es: null, fr: null, de: null }],
  ['10e2', { 'pt-BR': null, en: null, es: null, fr: null, de: null }],
  ['0', { 'pt-BR': 0, en: 0, es: 0, fr: 0, de: 0 }],
];

describe('parseLocaleNumber', () => {
  for (const [text, expected] of CASES) for (const [locale, value] of Object.entries(expected) as [Locale, number | null][]) {
    it(`${JSON.stringify(text)} em ${locale} → ${value ?? 'recusa'}`, () => {
      const r = parseLocaleNumber(text, locale);
      if (value == null) expect(r.ok).toBe(false); else expect(r).toEqual({ ok: true, value });
    });
  }
  it('vazio é "empty", não zero', () => { expect(parseLocaleNumber('  ', 'pt-BR')).toMatchObject({ ok: false, reason: 'empty' }); });
  it('ponto decimal em português é ambíguo e indica a vírgula', () => { expect(parseLocaleNumber('10.5', 'pt-BR')).toMatchObject({ ok: false, reason: 'ambiguous', decimal: ',' }); });
  it('vírgula decimal em inglês é ambígua e indica o ponto', () => { expect(parseLocaleNumber('10,5', 'en')).toMatchObject({ ok: false, reason: 'ambiguous', decimal: '.' }); });
  it('agrupamento válido em português continua sendo milhar', () => { expect(parseLocaleNumber('1.234', 'pt-BR')).toEqual({ ok: true, value: 1234 }); expect(parseLocaleNumber('12.345.678', 'pt-BR')).toEqual({ ok: true, value: 12345678 }); });
  it('francês aceita espaço comum e espaço inseparável como milhar', () => { expect(parseLocaleNumber('1 234,5', 'fr')).toEqual({ ok: true, value: 1234.5 }); expect(parseLocaleNumber('1 234,5', 'fr')).toEqual({ ok: true, value: 1234.5 }); });
  it('negativos e espaços nas pontas', () => { expect(parseLocaleNumber(' -2,5 ', 'pt-BR')).toEqual({ ok: true, value: -2.5 }); });
  it('recusa texto, sinais soltos e dois separadores decimais', () => { for (const t of ['abc', '-', '1,2,3', '1..2', '+-1', '12a']) expect(parseLocaleNumber(t, 'pt-BR').ok).toBe(false); });
});
