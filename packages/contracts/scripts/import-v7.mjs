import { readFile, writeFile, readdir, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const source = new URL('../../../Docs/gaiapus-v7-integracao-regional/gaiapus-v7/', import.meta.url);
const root = new URL('../', import.meta.url);
const runtime = new URL('../../../services/science-adapter/delivery/v7/', import.meta.url);
const files = {}, runtimeFiles = {};
async function walk(prefix = '') {
  for (const entry of await readdir(new URL(prefix, source), { withFileTypes: true })) {
    if(entry.name==='__pycache__'||entry.name.endsWith('.pyc')||entry.name==='.venv') continue;
    const path = `${prefix}${entry.name}`;
    if (entry.isDirectory()) await walk(`${path}/`);
    else {
      const bytes = await readFile(new URL(path, source));
      files[path] = createHash('sha256').update(bytes).digest('hex');
      if (/^(predict\.py|requirements\.txt|model-registry\.json|models\/|smoke\/|data\/serving\/|data\/frozen\/|metrics\/|contracts\/|scenario\/)/.test(path)) {
        runtimeFiles[path] = files[path];
        const destination = new URL(path, runtime); await mkdir(new URL('.', destination), { recursive: true }); await copyFile(new URL(path, source), destination);
      }
      if (path.startsWith('contracts/') || path === 'model-registry.json' || path === 'data/frozen/regional_rule_soy_mg_mt_g30.json') {
        const destination = new URL(`upstream/v7/${path}`, root); await mkdir(new URL('.', destination), { recursive: true }); await copyFile(new URL(path, source), destination);
      }
    }
  }
}
await walk();
const digest = createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(files).sort(([a],[b])=>a.localeCompare(b))))).digest('hex');
const pin = { source: 'User-supplied gaiapus-v7 regional integration delivery', reference_revision: 'ecae8c4457c0bd152915ea16495c83ad5097cfd4', bundle_sha256: digest, files, runtime_files: runtimeFiles };
await writeFile(new URL('upstream/v7/pin.json', root), JSON.stringify(pin,null,2)+'\n');
await writeFile(new URL('../../../services/science-adapter/v7-pin.json', import.meta.url), JSON.stringify(pin,null,2)+'\n');
console.log(`Pinned v7 delivery ${digest}, ${Object.keys(files).length} files; original source untouched.`);
