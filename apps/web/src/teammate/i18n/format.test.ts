import { afterEach, expect, it } from 'vitest';
import { dFull, dMonth, dShort, money, n1, pct } from '../format';
import { setPrefs } from '../prefs';
import { loadAllCatalogsForTest } from './index';
afterEach(() => setPrefs({ locale: 'pt-BR' }));

it('português mantém o formato compacto aprovado', () => {
  setPrefs({ locale: 'pt-BR' });
  expect(dFull('2026-11-14')).toBe('14 nov 2026'); expect(dShort('2026-10-05')).toBe('5 out'); expect(dMonth('2026-11-14')).toBe('nov/26');
  expect(n1(1234.5)).toBe('1.234,5'); expect(pct(0.47)).toMatch(/47\s?%/);
});
it('data de calendário nunca muda de dia por fuso', () => {
  setPrefs({ locale: 'pt-BR' });
  expect(dFull('2026-01-01')).toBe('1 jan 2026');
});
it('outras línguas usam o formato do Intl da própria língua', async () => {
  await loadAllCatalogsForTest();
  for (const l of ['en', 'es', 'fr', 'de'] as const) {
    setPrefs({ locale: l });
    expect(n1(1234.5)).toBe(new Intl.NumberFormat(l, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(1234.5));
    expect(dFull('2026-11-14')).toBe(new Intl.DateTimeFormat(l, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date('2026-11-14T12:00:00Z')));
  }
});
it('moeda mantém o código: inglês não converte real em dólar', () => {
  setPrefs({ locale: 'en' });
  expect(money(63000, 'BRL')).toContain('R$');
});
