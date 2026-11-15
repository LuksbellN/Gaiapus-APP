// Copy the LocationCore v1 packages from Gaiapus_nasa unchanged and pin them.
// Usage: node scripts/pin-location-core.mjs <path to Gaiapus_nasa/data/serving/location-core>
// Refuses any file whose bytes do not match the generator's manifest sha256.
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/pin-location-core.mjs <location-core dir>');
const target = new URL('../fixtures/location-core/', import.meta.url);
const boundaries = new URL('../../../apps/api/public/publications/location-core-v1/', import.meta.url);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(',')}]`
  : value && typeof value === 'object' ? `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`
  : JSON.stringify(value);

const manifest = JSON.parse(readFileSync(join(source, 'manifest.json'), 'utf8'));
mkdirSync(target, { recursive: true }); mkdirSync(boundaries, { recursive: true });
const packages = [];
for (const file of manifest.files) {
  const bytes = readFileSync(join(source, file.path));
  if (sha(bytes) !== file.sha256 || bytes.length !== file.bytes) throw new Error(`Hash mismatch: ${file.path}`);
  copyFileSync(join(source, file.path), new URL(file.path, target));
  packages.push({ id: file.id, path: file.path, sha256: file.sha256, canonical_sha256: sha(canonical(JSON.parse(bytes.toString('utf8')))) });
}
copyFileSync(join(source, 'manifest.json'), new URL('manifest.json', target));
for (const name of readdirSync(join(source, 'boundaries'))) copyFileSync(join(source, 'boundaries', name), new URL(name, boundaries));
writeFileSync(new URL('pin.json', target), JSON.stringify({
  source: 'LeandroJerse/Gaiapus_nasa data/serving/location-core', generator: manifest.generator, generated_at: manifest.generated_at,
  manifest_sha256: sha(readFileSync(join(source, 'manifest.json'))), manifest_canonical_sha256: sha(canonical(manifest)), packages,
}, null, 2) + '\n');
console.log(`pinned ${packages.length} packages, generator ${manifest.generator}`);
