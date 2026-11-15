// Copy the regional future-simulation publication produced by Gaiapus_nasa (data/serving/future_simulation_publish.py)
// into the API's static publication directory, refusing any artifact whose bytes do not match the index.
// Usage: cd <publication out dir> && node <Gaiapus-APP>/packages/contracts/scripts/pin-future-simulation.mjs
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { childFile } from './safe-path.mjs';
import { realpathSync, existsSync } from 'node:fs';

if (process.argv.length > 2) throw new Error('This script takes no arguments; run it from the publication output directory.');
const source = realpathSync(process.cwd());
if (!existsSync(childFile(source, 'index.json')) || !existsSync(childFile(source, 'catalog.json'))) throw new Error('Run from a directory with index.json and catalog.json');
const target = fileURLToPath(new URL('../../../apps/api/public/publications/future-simulation-v1/', import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const index = JSON.parse(readFileSync(childFile(source, 'index.json'), 'utf8'));
let copied = 0;
for (const publication of index.publications) {
  if (!/^sim_[0-9a-f]{24}$/.test(publication.run_id)) throw new Error('Unexpected run id in index');
  const runs = childFile(source, 'runs'), from = childFile(runs, publication.run_id);
  const to = childFile(childFile(target, 'runs'), publication.run_id);
  mkdirSync(to, { recursive: true });
  for (const artifact of publication.artifacts) {
    const name = artifact.path.split('/').at(-1);
    if (artifact.path !== `runs/${publication.run_id}/${name}`) throw new Error('Unexpected artifact path in index');
    const bytes = readFileSync(childFile(from, name));
    if (sha(bytes) !== artifact.sha256 || bytes.length !== artifact.bytes) throw new Error('Artifact checksum mismatch');
    copyFileSync(childFile(from, name), childFile(to, name));
    copied++;
  }
}
mkdirSync(target, { recursive: true });
copyFileSync(childFile(source, 'index.json'), childFile(target, 'index.json'));
copyFileSync(childFile(source, 'catalog.json'), childFile(target, 'catalog.json'));
console.log(`pinned ${index.publications.length} runs (${copied} artifacts)`);
