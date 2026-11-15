import { describe, expect, it } from 'vitest';
import { parseSelection, toApiAreaId } from './ids';
const q = (s: string) => parseSelection(new URLSearchParams(s));

describe('parseSelection: links de hoje continuam válidos', () => {
  it.each([
    ['pais=BR&uf=51&mun=5107925', { pais: 'BR', uf: '51', mun: '5107925' }],
    ['mun=5107925', { pais: 'BR', uf: '51', mun: '5107925' }],
    ['pais=BRA', { pais: 'BR', uf: null, mun: null }],
    ['pais=BR&uf=31', { pais: 'BR', uf: '31', mun: null }],
    ['pais=arg', { pais: 'ARG', uf: null, mun: null }],
    ['pais=ARG&uf=51&mun=5107925', { pais: 'BR', uf: '51', mun: '5107925' }],
    ['', { pais: null, uf: null, mun: null }],
  ])('%s', (url, expected) => { expect(q(url)).toEqual(expected); });
  it('códigos malformados são ignorados, sem inventar UF', () => {
    expect(q('mun=abc')).toEqual({ pais: null, uf: null, mun: null });
    expect(q('pais=BR&uf=5x')).toEqual({ pais: 'BR', uf: null, mun: null });
    expect(q('pais=ARGENTINA')).toEqual({ pais: null, uf: null, mun: null });
  });
});

describe('toApiAreaId', () => {
  it('país estrangeiro nunca vai para a API', () => { expect(toApiAreaId({ pais: 'ARG', uf: null, mun: null })).toBeNull(); });
  it('município do IBGE vai como está', () => { expect(toApiAreaId({ pais: 'BR', uf: '51', mun: '5107925' })).toBe('5107925'); });
});
