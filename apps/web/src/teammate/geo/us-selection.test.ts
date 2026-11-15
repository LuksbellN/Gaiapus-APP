import { expect, it } from 'vitest';
import { parseSelection, toApiAreaId } from './ids';

it.each(['pais=USA&uf=US-IA', 'pais=US&uf=US-IA'])('preserves the US state in %s without using an IBGE code', (url) => {
  const selection = parseSelection(new URLSearchParams(url));
  expect(selection).toEqual({ pais: 'USA', uf: 'US-IA', mun: null });
  expect(toApiAreaId(selection)).toBeNull();
});
it('does not turn US FIPS state 19 into a Brazilian UF', () => {
  expect(parseSelection(new URLSearchParams('pais=USA&uf=19'))).toEqual({ pais: 'USA', uf: null, mun: null });
});
it('rejects unknown states and foreign state ids on Brazilian links', () => {
  expect(parseSelection(new URLSearchParams('pais=USA&uf=US-XX'))).toEqual({ pais: 'USA', uf: null, mun: null });
  expect(parseSelection(new URLSearchParams('pais=BR&uf=US-IA'))).toEqual({ pais: 'BR', uf: null, mun: null });
});
