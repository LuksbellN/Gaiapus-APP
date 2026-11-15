// Build per-state US county boundaries (GeoJSON) from us-atlas@3.0.1 counties-10m (TopoJSON, U.S. Census Bureau cartographic
// boundaries, ISC licence). Input is fixed and checksum-verified; no path comes from the command line.
// Usage: download https://cdn.jsdelivr.net/npm/us-atlas@3.0.1/counties-10m.json (+ LICENSE) into apps/web/.sources/us-atlas-3.0.1/,
// then: node apps/web/scripts/build-us-counties.mjs
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const SOURCE_SHA256 = '145aaf5d1433352a6a1d8e86b5f149c7c653f9171baf14aaf75ee66575def1b0';
const src = new URL('../.sources/us-atlas-3.0.1/', import.meta.url);
const out = new URL('../src/teammate/data/geo/us-counties/', import.meta.url);
const bytes = readFileSync(new URL('counties-10m.json', src));
if (createHash('sha256').update(bytes).digest('hex') !== SOURCE_SHA256) throw new Error('counties-10m.json checksum mismatch');
const licence = readFileSync(new URL('LICENSE', src), 'utf8').trim();
const topo = JSON.parse(bytes.toString('utf8'));
const fipsSource = readFileSync(new URL('../src/teammate/geo/usFips.ts', import.meta.url), 'utf8');
const FIPS = Object.fromEntries([...fipsSource.matchAll(/'(\d{2})': '(US-[A-Z]{2})'/g)].map(m => [m[1], m[2]]));
// Cross-check the FIPS table against state names of both sources (us-atlas states vs the map's Natural Earth states).
const neStates = JSON.parse(readFileSync(new URL('../src/teammate/data/geo/us-states.json', import.meta.url), 'utf8')).features;
const nameByIso = Object.fromEntries(neStates.map(f => [f.properties.code, f.properties.name]));
for (const g of topo.objects.states.geometries) {
  const iso = FIPS[g.id];
  if (iso && nameByIso[iso] !== g.properties.name) throw new Error(`FIPS ${g.id}: ${g.properties.name} ≠ ${nameByIso[iso]}`);
}

const [sx, sy] = topo.transform.scale, [tx, ty] = topo.transform.translate;
const arcs = topo.arcs.map(arc => { let x = 0, y = 0; return arc.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); });
const round = v => Math.round(v * 1e4) / 1e4;
const arc = i => (i >= 0 ? arcs[i] : arcs[~i].slice().reverse());
const ring = ids => { const pts = []; ids.forEach((i, k) => { const a = arc(i); pts.push(...(k ? a.slice(1) : a)); }); return pts.map(([x, y]) => [round(x), round(y)]); };
const geometry = g => g.type === 'Polygon' ? { type: 'Polygon', coordinates: g.arcs.map(ring) } : { type: 'MultiPolygon', coordinates: g.arcs.map(p => p.map(ring)) };

const byState = {};
for (const g of topo.objects.counties.geometries) {
  const iso = FIPS[g.id.slice(0, 2)];
  if (!iso || !g.arcs) continue; // territories are outside the 50 states + DC
  (byState[iso] ??= []).push({ type: 'Feature', properties: { code: `US:fips:${g.id}`, fips: g.id, name: g.properties.name, state: iso, country: 'US' }, geometry: geometry(g) });
}
mkdirSync(out, { recursive: true });
const files = {};
for (const [iso, features] of Object.entries(byState).sort()) {
  features.sort((a, b) => a.properties.fips.localeCompare(b.properties.fips));
  const body = JSON.stringify({ type: 'FeatureCollection', features });
  writeFileSync(new URL(`${iso}.json`, out), body);
  files[iso] = { counties: features.length, bytes: Buffer.byteLength(body), sha256: createHash('sha256').update(body).digest('hex') };
}
writeFileSync(new URL('manifest.json', out), JSON.stringify({
  source: 'us-atlas@3.0.1 counties-10m.json (U.S. Census Bureau cartographic boundary files, 1:10,000,000)',
  source_url: 'https://cdn.jsdelivr.net/npm/us-atlas@3.0.1/counties-10m.json', source_sha256: SOURCE_SHA256, licence: 'ISC', licence_text: licence,
  transform: 'TopoJSON decoded to GeoJSON, coordinates rounded to 1e-4 degree, split by state (FIPS → ISO 3166-2)', files,
}, null, 2) + '\n');
console.log(`wrote ${Object.keys(files).length} state files, ${Object.values(files).reduce((s, f) => s + f.counties, 0)} counties`);
