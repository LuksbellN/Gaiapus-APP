// Records a deliberate change to a file listed in design/teammate-source-manifest.json.
// Usage (from apps/web): node scripts/record-visual-change.mjs "<task and reason>" [file ...]
// Without files, records every manifest file whose current content differs from its latest recorded hash.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'design/teammate-source-manifest.json'), 'utf8'));
const historyPath = path.join(root, 'design/teammate-source-history.json');
const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
const [reason, ...files] = process.argv.slice(2);
if (!reason) { console.error('Usage: node scripts/record-visual-change.mjs "<task and reason>" [file ...]'); process.exit(1); }

const sha = (text) => createHash('sha256').update(text).digest('hex');
const current = (file) => fs.readFileSync(path.join(root, 'src/teammate', file), 'utf8').replace(/\r\n/g, '\n');
const latest = (file) => history.entries.filter((e) => e.file === file).at(-1)?.sha256;
const unchanged = (file) => { const lf = current(file); const known = latest(file); return known ? sha(lf) === known : sha(lf.replace(/\n/g, '\r\n')) === manifest.sha256[file]; };

const targets = files.length ? files : Object.keys(manifest.sha256).filter((f) => !unchanged(f));
const date = new Date().toISOString().slice(0, 10);
for (const file of targets) {
  if (!(file in manifest.sha256)) { console.error(`Not in manifest: ${file}`); process.exit(1); }
  history.entries.push({ file, date, reason, sha256: sha(current(file)) });
  console.log(`recorded ${file}`);
}
if (!targets.length) console.log('No manifest file changed.');
fs.writeFileSync(historyPath, JSON.stringify(history, null, 2) + '\n');
