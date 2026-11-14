// Controlled import from a separately cloned, exact scientific revision. Never run during requests.
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const source = new URL('../../../.sources/science/', import.meta.url);
const root = new URL('../', import.meta.url);
const revision = 'ecae8c4457c0bd152915ea16495c83ad5097cfd4';
if (execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, encoding: 'utf8' }).trim() !== revision) throw new Error('Scientific source revision mismatch');
const json = async path => JSON.parse(await readFile(new URL(path, source), 'utf8'));
const publicationVersion = `science-${revision.slice(0, 12)}-app1`;
const base = `/publications/${publicationVersion}`;
const assetDir = new URL(`../../../apps/api/public/publications/${publicationVersion}/`, import.meta.url);
await mkdir(assetDir, { recursive: true }); await mkdir(new URL('fixtures/', root), { recursive: true });
const files = {};
const copy = async (from, name) => {
  const bytes = await readFile(new URL(from, source));
  files[from] = createHash('sha256').update(bytes).digest('hex');
  await copyFile(new URL(from, source), new URL(name, assetDir)); return `${base}/${name}`;
};
const sources = [{ source_id: 'gaiapus-science', description: 'Pinned independent scientific/prototype publication', url: `https://github.com/LeandroJerse/Gaiapus_nasa/tree/${revision}`, source_revision: revision }];
const bbox = pair => [...pair[0], ...pair[1]];
const country = await json('gaiapus-mvp/data/field.json');
const areas = [{ area_id: 'BR', name: 'Brasil', kind: 'country', parent_id: null, country_id: 'BR', state_id: null, bbox: bbox(country.bounds.BR), geometry_ref: await copy('gaiapus-mvp/data/BR.geojson', 'BR.geojson'), scope: 'country' }];
const stateNames = { '31': ['BR-MG', 'Minas Gerais'], '51': ['BR-MT', 'Mato Grosso'], '52': ['BR-GO', 'Goiás'], '29': ['BR-BA', 'Bahia'] };
const states = await json('gaiapus-mvp/data/states.geojson');
const flattenPairs = coords => typeof coords[0] === 'number' ? [coords] : coords.flatMap(flattenPairs);
for (const [code, [id, name]] of Object.entries(stateNames)) {
  const feature = states.features.find(f => f.properties.codarea === code);
  const pairs = flattenPairs(feature.geometry.coordinates);
  const box = [Math.min(...pairs.map(x => x[0])), Math.min(...pairs.map(x => x[1])), Math.max(...pairs.map(x => x[0])), Math.max(...pairs.map(x => x[1]))];
  await writeFile(new URL(`${id}.geojson`, assetDir), JSON.stringify({ type: 'FeatureCollection', features: [feature] }));
  areas.push({ area_id: id, name, kind: 'state', parent_id: 'BR', country_id: 'BR', state_id: id, bbox: box, geometry_ref: `${base}/${id}.geojson`, scope: 'state' });
}
const fields = [];
for (const region of await json('gaiapus-mvp/data/regions.json')) {
  const path = region.id === 'uberlandia' ? 'gaiapus-mvp/data/' : `gaiapus-mvp/data/regions/${region.id}/`;
  const field = await json(`${path}field.json`);
  files[`${path}field.json`] = createHash('sha256').update(await readFile(new URL(`${path}field.json`, source))).digest('hex');
  const stateId = stateNames[region.uf][0]; const fieldId = `published-field-${region.id}`;
  areas.push({ area_id: region.municipalityCode, name: region.label, kind: 'municipality', parent_id: stateId, country_id: 'BR', state_id: stateId, bbox: bbox(field.bounds.city), geometry_ref: await copy(`${path}city.geojson`, `${region.id}-city.geojson`), scope: 'municipality' });
  await writeFile(new URL(`${fieldId}.geojson`, assetDir), JSON.stringify({ type: 'Feature', properties: { publication_version: publicationVersion }, geometry: field.field.geojson }));
  areas.push({ area_id: fieldId, name: `${field.field.label} — ${region.label}`, kind: 'published_field', parent_id: region.municipalityCode, country_id: 'BR', state_id: stateId, bbox: bbox(field.bounds.field), geometry_ref: `${base}/${fieldId}.geojson`, scope: 'published demonstration rectangle, not a cadastral or owned farm boundary' });
  const sceneUrl = await copy(`${path}scene.png`, `${region.id}-scene.png`);
  fields.push({ area_id: fieldId, municipality_code: region.municipalityCode, ...field, image: { ...field.image, url: sceneUrl } });
}
areas.push({ area_id: '5107925', name: 'Sorriso', kind: 'municipality', parent_id: 'BR-MT', country_id: 'BR', state_id: 'BR-MT', scope: 'municipal scientific estimate; no matching field imagery published in this package' });
for (const file of ['yield-estimate.schema.json', 'water-projection.schema.json', ...['yield-soy-5107925-day75', 'yield-maize2-5107925-day75', 'yield-soy-3170206-day20', 'water-soy-5107925-N10'].map(x => `examples/${x}.json`)]) {
  files[`contracts/${file}`] = createHash('sha256').update(await readFile(new URL(`contracts/${file}`, source))).digest('hex');
}
await writeFile(new URL('upstream/pin.json', root), JSON.stringify({ repository: 'https://github.com/LeandroJerse/Gaiapus_nasa', revision, files }, null, 2) + '\n');
await writeFile(new URL('fixtures/publication.json', root), JSON.stringify({ publication_version: publicationVersion, scientific_revision: revision, sources, areas, fields }, null, 2) + '\n');
console.log(`Imported ${areas.length} catalog areas, ${fields.length} historical packages from ${revision}`);
