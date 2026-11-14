import { describe, expect, it } from 'vitest';
import { num, toKg } from './form';
describe('quantidades e unidades', () => {
  it('lê número em formato brasileiro', () => { expect(num('1.234,5')).toBe(1234.5); expect(num('')).toBeNull(); expect(num('abc')).toBeNull(); });
  it('saca só converte com peso declarado', () => { expect(toKg(100, 'saca', null)).toBeNull(); expect(toKg(100, 'saca', 60)).toBe(6000); expect(toKg(2, 't', null)).toBe(2000); });
});
