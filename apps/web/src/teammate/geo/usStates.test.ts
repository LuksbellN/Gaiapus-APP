import { expect, it } from 'vitest';
import type { LocationSummary } from '../adapters/locations';
import { countiesInState, loadUSStates, stateSelection, stateViewBounds } from './usStates';
import { US_STATE_CODES } from './usStateCodes';

it('loads all 50 states plus DC with unique ISO ids and finite geometry bounds', async () => {
  const states = await loadUSStates();
  expect(states.features).toHaveLength(51);
  expect(new Set(states.features.map(f => f.properties.code))).toEqual(US_STATE_CODES);
  for (const feature of states.features) {
    const box = stateViewBounds(feature);
    expect(box.flat().every(Number.isFinite)).toBe(true);
    expect(box[1][0]).toBeGreaterThan(box[0][0]);
    expect(box[1][1]).toBeGreaterThan(box[0][1]);
    expect(stateSelection(feature.properties.code).pais).toBe('USA');
  }
  expect(stateSelection('31')).toEqual({ pais: 'BR', uf: '31', mun: null });
});
it('frames Alaska across the dateline rather than zooming out to the whole world, and includes Hawaii', async () => {
  const states = await loadUSStates();
  const ak = stateViewBounds(states.features.find(f => f.properties.code === 'US-AK')!);
  expect(ak[1][0] - ak[0][0]).toBeLessThan(65);
  const hi = stateViewBounds(states.features.find(f => f.properties.code === 'US-HI')!);
  expect(hi[0][0]).toBeLessThan(-150);
  expect(hi[1][1]).toBeLessThan(30);
});
it('uses the published admin1 code, not a name or numeric identifier prefix, to associate counties', () => {
  const rows = [
    { country: 'US', admin1_code: 'US-IA', name: 'Story County' },
    { country: 'US', admin1_code: 'US-KS', name: 'Sumner County' },
    { country: 'US', admin1_code: 'US-NE', name: 'York County' },
    { country: 'BR', admin1_code: 'BR-MG', name: 'Uberlândia' },
  ] as LocationSummary[];
  expect(countiesInState(rows, null)).toHaveLength(3);
  expect(countiesInState(rows, 'US-IA').map(l => l.name)).toEqual(['Story County']);
  expect(countiesInState(rows, 'US-CA')).toEqual([]);
});
