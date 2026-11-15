// LocationCore v1 publication: the seven packages produced by Gaiapus_nasa data/serving/location_core.py,
// copied unchanged and pinned by sha256 in fixtures/location-core/pin.json. Validated at load time.
import { createHash } from 'node:crypto';
import { canonicalJson, validators } from './index.js';
import pin from '../fixtures/location-core/pin.json' with { type: 'json' };
import manifest from '../fixtures/location-core/manifest.json' with { type: 'json' };
import barreiras from '../fixtures/location-core/BR_ibge_2903201.json' with { type: 'json' };
import uberlandia from '../fixtures/location-core/BR_ibge_3170206.json' with { type: 'json' };
import sorriso from '../fixtures/location-core/BR_ibge_5107925.json' with { type: 'json' };
import rioVerde from '../fixtures/location-core/BR_ibge_5218805.json' with { type: 'json' };
import story from '../fixtures/location-core/US_fips_19169.json' with { type: 'json' };
import sumner from '../fixtures/location-core/US_fips_20191.json' with { type: 'json' };
import york from '../fixtures/location-core/US_fips_31185.json' with { type: 'json' };
import type { LocationCore, LocationSummary } from './generated/types.js';

const packages = [barreiras, uberlandia, sorriso, rioVerde, story, sumner, york] as unknown as LocationCore[];

// Checked on first access (not at import time: index.ts and fixtures.ts import each other through this module).
// The manifest hashes the generator's exact bytes; here each package is re-checked by canonical content.
let checked = false;
function check() {
  if (checked) return;
  if (createHash('sha256').update(canonicalJson(manifest)).digest('hex') !== pin.manifest_canonical_sha256) throw new Error('Location core manifest does not match its pin');
  for (const core of packages) {
    const id = core.place.id;
    const entry = pin.packages.find(p => p.id === id);
    if (!entry || createHash('sha256').update(canonicalJson(core)).digest('hex') !== entry.canonical_sha256) throw new Error(`Location core ${id} does not match its pin`);
    if (!validators.LocationCore!(core)) throw new Error(`Location core ${id} violates the contract: ${JSON.stringify(validators.LocationCore!.errors)}`);
  }
  checked = true;
}

export const locationPublication = { generator: manifest.generator, generated_at: manifest.generated_at, version: `location-core-v1-${pin.manifest_canonical_sha256.slice(0, 12)}` };
export function locationCore(id: string): LocationCore | undefined { check(); return packages.find(core => core.place.id === id); }
export function locationSummaries(): LocationSummary[] {
  check();
  return packages
    .map(({ place: { boundary_url: _url, ...place }, layers }) => ({ ...place, layers: { weather: layers.weather.status, water_balance: layers.water_balance.status, ndvi: layers.ndvi.status, forecast: layers.forecast.status } }))
    .sort((a, b) => a.id.localeCompare(b.id));
}
