import { describe, expect, it } from 'vitest';
import { countriesWithData, orderCountries } from './countriesWithData';

const world = [
  { code: 'AFG', a2: 'AF', name: 'Afeganistão' }, { code: 'BR', a2: 'BR', name: 'Brasil' }, { code: 'USA', a2: 'US', name: 'Estados Unidos' },
  { code: 'ARG', a2: 'AR', name: 'Argentina' }, { code: 'ATA', a2: null, name: 'Antártida' },
];
const abroad = [
  { country: 'US', admin1_code: 'US-NE' }, { country: 'US', admin1_code: 'US-IA' }, { country: 'US', admin1_code: 'US-KS' }, { country: 'US', admin1_code: 'US-IA' },
];

describe('countriesWithData', () => {
  it('marks Brazil from its catalogue states and the US from its published counties', () => {
    const m = countriesWithData({ brStates: ['MT', 'MG', 'BA', 'GO'], abroad });
    expect(m.get('BR')).toEqual(['BA', 'GO', 'MG', 'MT']);
    expect(m.get('US')).toEqual(['IA', 'KS', 'NE']);
    expect(m.has('AR')).toBe(false);
  });
  it('a country is not marked when its catalogue is empty', () => {
    expect(countriesWithData({ brStates: [], abroad: [] }).size).toBe(0);
  });
});

describe('orderCountries', () => {
  it('puts every country with data first (Brazil first), then the rest alphabetically', () => {
    const m = countriesWithData({ brStates: ['MT'], abroad });
    expect(orderCountries(world, m, (c) => c.name).map((c) => c.code)).toEqual(['BR', 'USA', 'AFG', 'ATA', 'ARG']);
  });
  it('without data keeps the plain alphabetical order', () => {
    expect(orderCountries(world, new Map(), (c) => c.name).map((c) => c.code)).toEqual(['AFG', 'ATA', 'ARG', 'BR', 'USA']);
  });
});
