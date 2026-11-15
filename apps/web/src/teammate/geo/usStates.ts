import type { BBox, FC, Feature } from '../adapters';
import type { LocationSummary } from '../adapters/locations';
import type { Selection } from '../map/types';

export const US_OVERVIEW: BBox = [[-126, 24], [-66, 50]];
export const US_STATES_SOURCE = 'Natural Earth · Admin 1 · 1:50m · public domain';
export async function loadUSStates(): Promise<FC> {
  return (await import('../data/geo/us-states.json')).default as unknown as FC;
}
export function stateSelection(code: string): Selection {
  return { pais: code.startsWith('US-') ? 'USA' : 'BR', uf: code, mun: null };
}
export function countiesInState(items: LocationSummary[], code: string | null): LocationSummary[] {
  return items.filter(l => l.country === 'US' && (!code || l.admin1_code === code));
}
/** Alaska crosses the dateline. Unwrap only for framing; retain the original WGS84 geometry. */
export function stateViewBounds(feature: Feature): BBox {
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
  function visit(value: unknown): void {
    if (!Array.isArray(value)) return;
    if (typeof value[0] === 'number' && typeof value[1] === 'number') {
      const lon = feature.properties.code === 'US-AK' && value[0] > 0 ? value[0] - 360 : value[0];
      west = Math.min(west, lon); east = Math.max(east, lon);
      south = Math.min(south, value[1]); north = Math.max(north, value[1]);
    } else value.forEach(visit);
  }
  visit(feature.geometry.coordinates);
  return [[west, south], [east, north]];
}
