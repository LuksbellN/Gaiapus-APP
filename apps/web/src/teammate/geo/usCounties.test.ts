import { describe, expect, it } from 'vitest';
import { loadUSCounties } from './usStates';
import { stateOfCounty, US_STATE_FIPS } from './usFips';
import { US_STATE_CODES } from './usStateCodes';
import manifest from '../data/geo/us-counties/manifest.json';

describe('US county boundaries', () => {
  it('cover the 50 states and DC with Census counts for the studied states', async () => {
    expect(Object.keys(manifest.files).sort()).toEqual([...US_STATE_CODES].sort());
    expect((await loadUSCounties('US-IA'))!.features).toHaveLength(99);
    expect((await loadUSCounties('US-NE'))!.features).toHaveLength(93);
    expect((await loadUSCounties('US-KS'))!.features).toHaveLength(105);
    expect(manifest.licence).toBe('ISC');
    expect(manifest.vintage).toBe(2017);
    expect(manifest.compatibility.us_v2_universe).toMatchObject({ checked: 245, missing: 0 });
  });
  it('identify counties by namespaced FIPS with leading zeros and their state', async () => {
    const al = await loadUSCounties('US-AL');
    expect(al!.features[0].properties).toMatchObject({ code: 'US:fips:01001', state: 'US-AL', country: 'US' });
  });
  it('return null for unknown states', async () => {
    expect(await loadUSCounties('US-XX')).toBeNull();
    expect(await loadUSCounties('BR-MG')).toBeNull();
  });
  it('map county ids to their state', () => {
    expect(stateOfCounty('US:fips:19169')).toBe('US-IA');
    expect(stateOfCounty('US:fips:72001')).toBeNull();
    expect(stateOfCounty('BR:ibge:5107925')).toBeNull();
    expect(Object.values(US_STATE_FIPS).every((c) => US_STATE_CODES.has(c))).toBe(true);
  });
});
