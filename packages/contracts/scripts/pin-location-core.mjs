// Copy the LocationCore v1 packages from Gaiapus_nasa unchanged and pin them.
// Usage: node scripts/pin-location-core.mjs <path to Gaiapus_nasa/data/serving/location-core>
// Refuses any file whose bytes do not match the generator's manifest sha256.
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { childFile, sourceDirectory } from './safe-path.mjs';

// The CLI argument and every file name from the manifest are untrusted: resolved and checked before use.
const source = sourceDirectory(process.argv[2]);
const target = fileURLToPath(new URL('../fixtures/location-core/', import.meta.url));
const boundaries = fileURLToPath(new URL('../../../apps/api/public/publications/location-core-v1/', import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => JSON.stringify(k) + ':' + canonical(v));
    return '{' + entries.join(',') + '}';
  }
  return JSON.stringify(value);
}

const manifestPath = childFile(source, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
mkdirSync(target, { recursive: true }); mkdirSync(boundaries, { recursive: true });
const packages = [];
for (const file of manifest.files) {
  const from = childFile(source, file.path);
  const bytes = readFileSync(from);
  if (sha(bytes) !== file.sha256 || bytes.length !== file.bytes) throw new Error('Hash mismatch in a manifest file');
  copyFileSync(from, childFile(target, file.path));
  packages.push({ id: file.id, path: file.path, sha256: file.sha256, canonical_sha256: sha(canonical(JSON.parse(bytes.toString('utf8')))) });
}
copyFileSync(manifestPath, childFile(target, 'manifest.json'));
const boundarySource = childFile(source, 'boundaries');
for (const name of readdirSync(boundarySource)) copyFileSync(childFile(boundarySource, name), childFile(boundaries, name));
writeFileSync(childFile(target, 'pin.json'), JSON.stringify({
  source: 'LeandroJerse/Gaiapus_nasa data/serving/location-core', generator: manifest.generator, generated_at: manifest.generated_at,
  manifest_sha256: sha(readFileSync(manifestPath)), manifest_canonical_sha256: sha(canonical(manifest)), packages,
}, null, 2) + '\n');
console.log(`pinned ${packages.length} packages`);
