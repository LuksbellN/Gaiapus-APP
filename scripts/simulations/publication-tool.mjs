#!/usr/bin/env node
// Publication tool for regional simulation batches (first use: US v2). Separate, explicit operations:
//   inspect        local counts and sizes, no network
//   validate       schemas, hashes, ids, dates, scope, secrets scan, no network
//   plan           what an upload would do, read-only (public reads only)
//   upload         send objects to the public bucket; resumable; never overwrites
//   verify-remote  download every object, check sha256, gunzip and validate
//   metadata-sql   write idempotent SQL that stages the batch (not active)
//   activate-sql   write SQL that makes the staged batch current for its country
//   rollback-sql   write SQL that withdraws the active batch and restores the previous one
// The SQL files are applied by the operator (psql or the SQL editor); this tool never connects to Postgres.
// Credentials come only from the environment of the operator: SUPABASE_URL for reads, and
// SUPABASE_SERVICE_ROLE_KEY for `upload` only. Nothing is read from or written to .env files.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';

export const BUCKET = 'simulation-public';
const ARTIFACT_PATH = /^runs\/(sim_[0-9a-f]{24})\/(run\.json|series\.json\.gz)$/;
const LOCATION = /^(BR:ibge:[0-9]{7}|US:fips:[0-9]{5})$/;
const HEX64 = /^[0-9a-f]{64}$/;
const SECRETS = [/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\./, /sb_secret_[A-Za-z0-9_-]{8,}/, /service_role/i, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}\b/];
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function child(root, relative) {
  const base = resolve(root), full = resolve(base, relative);
  if (!full.startsWith(base + sep)) throw new Error(`Unsafe path in publication: ${relative}`);
  return full;
}

/** Load index and catalog, derive scope, object list and the batch identity. No network. */
export function loadPublication(dir) {
  const root = resolve(dir);
  const read = name => readFileSync(child(root, name));
  const indexBytes = read('index.json'), catalogBytes = read('catalog.json');
  const index = JSON.parse(indexBytes.toString('utf8')), catalog = JSON.parse(catalogBytes.toString('utf8'));
  const scopes = new Set([...catalog.places.map(p => p.location_id), ...index.publications.map(p => p.location_id)].map(id => String(id).split(':')[0]));
  if (scopes.size !== 1) throw new Error(`A batch must hold exactly one country; found ${[...scopes].join(', ') || 'none'}`);
  const scope = [...scopes][0];
  if (scope !== 'BR' && scope !== 'US') throw new Error(`Unsupported scope ${scope}`);
  const artifacts = [];
  for (const p of index.publications) for (const a of p.artifacts) {
    const m = ARTIFACT_PATH.exec(a.path);
    if (!m || m[1] !== p.run_id || !HEX64.test(a.sha256) || !Number.isInteger(a.bytes) || a.bytes < 1 || !['run', 'series'].includes(a.kind) || ![null, 'gzip'].includes(a.compression)) throw new Error(`Unexpected artifact in index: ${a.path}`);
    artifacts.push({ run_id: p.run_id, kind: a.kind, path: a.path, name: m[2], sha256: a.sha256, bytes: a.bytes, compression: a.compression });
  }
  // The batch identity is the content: catalog, index and every artifact hash. Changing any byte changes the key.
  const lines = [`catalog.json ${sha256(catalogBytes)} ${catalogBytes.length}`, `index.json ${sha256(indexBytes)} ${indexBytes.length}`,
    ...artifacts.map(a => `${a.path} ${a.sha256} ${a.bytes}`).sort()];
  const manifestSha = sha256(Buffer.from(lines.join('\n') + '\n', 'utf8'));
  const batchKey = `${scope.toLowerCase()}-${manifestSha.slice(0, 16)}`;
  const prefix = `${scope.toLowerCase()}/batches/${batchKey}`;
  return { root, index, catalog, indexBytes, catalogBytes, scope, artifacts, manifestSha, batchKey, prefix };
}

/** Immutable object keys: the content hash is part of the path (same rule as the API's storageKey). */
export function objectList(pub) {
  return [
    { key: `${pub.prefix}/catalog.json`, file: 'catalog.json', sha256: sha256(pub.catalogBytes), bytes: pub.catalogBytes.length, contentType: 'application/json' },
    { key: `${pub.prefix}/index.json`, file: 'index.json', sha256: sha256(pub.indexBytes), bytes: pub.indexBytes.length, contentType: 'application/json' },
    ...pub.artifacts.map(a => ({ key: `${pub.prefix}/runs/${a.run_id}/${a.sha256}/${a.name}`, file: a.path, sha256: a.sha256, bytes: a.bytes,
      contentType: a.name.endsWith('.gz') ? 'application/gzip' : 'application/json' })),
  ];
}

export function inspect(pub) {
  const byYear = {};
  for (const place of pub.catalog.places) for (const c of place.capabilities) {
    const y = byYear[c.harvest_year] ??= { capabilities: 0, ready_with_daily_series: 0, yield_only: 0, no_result: 0 };
    y.capabilities++;
    if (c.status === 'ready' && c.run_ids.length) y.ready_with_daily_series++;
    else if (c.yield_result) y.yield_only++;
    else y.no_result++;
  }
  const objects = objectList(pub), bytes = objects.reduce((n, o) => n + o.bytes, 0);
  return { scope: pub.scope, batch_key: pub.batchKey, manifest_sha256: pub.manifestSha, storage_prefix: pub.prefix, places: pub.catalog.places.length,
    runs: pub.index.publications.length, objects: objects.length, bytes, megabytes_decimal: +(bytes / 1e6).toFixed(2), mebibytes: +(bytes / 2 ** 20).toFixed(2),
    largest_object_bytes: Math.max(...objects.map(o => o.bytes)), as_of: pub.index.as_of, harvest_years: pub.catalog.harvest_years, by_harvest_year: byYear };
}

/** Full local validation. `validators` are the compiled contract validators (packages/contracts). */
export function validate(pub, validators) {
  const problems = [], note = (where, message) => { if (problems.length < 200) problems.push(`${where}: ${message}`); };
  const check = (name, value, where) => { if (!validators[name](value)) note(where, `${name} ${JSON.stringify(validators[name].errors?.slice(0, 2))}`); };
  const scan = (text, where) => { for (const pattern of SECRETS) if (pattern.test(text)) note(where, `possible credential or personal data (${pattern.source.slice(0, 24)}…)`); };
  check('SimulationCatalog', pub.catalog, 'catalog.json');
  scan(pub.catalogBytes.toString('utf8'), 'catalog.json'); scan(pub.indexBytes.toString('utf8'), 'index.json');
  const runIds = new Set(pub.index.publications.map(p => p.run_id));
  if (runIds.size !== pub.index.publications.length) note('index.json', 'duplicate run ids');
  for (const place of pub.catalog.places) {
    if (!LOCATION.test(place.location_id)) note(place.location_id, 'unexpected location id');
    for (const c of place.capabilities) {
      for (const id of c.run_ids) if (!runIds.has(id)) note(place.location_id, `capability points to unknown run ${id}`);
      if (c.status === 'ready' && !c.run_ids.length) note(place.location_id, `ready capability without run (${c.crop_id} ${c.harvest_year})`);
      if (c.status !== 'ready' && !c.reason_code) note(place.location_id, `non-ready capability without reason (${c.crop_id} ${c.harvest_year})`);
    }
  }
  const keys = new Set();
  for (const p of pub.index.publications) {
    check('SimulationPublication', p, p.run_id);
    if (Date.parse(p.as_of) > Date.parse(p.issued_at)) note(p.run_id, 'as_of is after issued_at');
    const key = `${p.location_id}|${p.plan_id}|${[...p.harvest_years].sort().join(',')}`;
    if (keys.has(key)) note(p.run_id, `two publications for ${key}`);
    keys.add(key);
    if (p.visibility !== 'public_regional') note(p.run_id, 'only public regional publications belong in the public bucket');
  }
  for (const a of pub.artifacts) {
    let bytes;
    try { bytes = readFileSync(child(pub.root, a.path)); } catch { note(a.path, 'file missing'); continue; }
    if (bytes.length !== a.bytes || sha256(bytes) !== a.sha256) { note(a.path, 'sha256 or byte length differs from the index'); continue; }
    try {
      if (a.kind === 'run') {
        const text = bytes.toString('utf8'), run = JSON.parse(text);
        check('SimulationRun', run, a.path); scan(text, a.path);
        const p = pub.index.publications.find(x => x.run_id === a.run_id);
        if (run.run_id !== a.run_id || run.location_id !== p.location_id || JSON.stringify(run.harvest_years) !== JSON.stringify(p.harvest_years)) note(a.path, 'run does not match its publication entry');
        if (Date.parse(run.as_of) > Date.parse(run.issued_at)) note(a.path, 'as_of is after issued_at');
      } else {
        const series = JSON.parse(gunzipSync(bytes, { maxOutputLength: 64 * 1024 * 1024 }).toString('utf8'));
        const run = JSON.parse(readFileSync(child(pub.root, `runs/${a.run_id}/run.json`), 'utf8'));
        if (series.members.length !== run.ensemble.members) note(a.path, 'member count differs from the run');
        if (series.members.some(m => m.storage_mm.length !== series.dates.length)) note(a.path, 'member series length differs from dates');
        for (const role of ['central', 'dry', 'wet']) if (!series.members.some(m => m.member_id === run.representative[role])) note(a.path, `representative ${role} member missing`);
      }
    } catch (error) { note(a.path, `unreadable: ${error.message}`); }
  }
  const extra = [];
  for (const entry of readdirSync(join(pub.root, 'runs'))) if (!runIds.has(entry)) extra.push(entry);
  if (extra.length) note('runs/', `${extra.length} run directories are not in the index (first: ${extra[0]})`);
  return { ok: problems.length === 0, problems, checked: { publications: pub.index.publications.length, artifacts: pub.artifacts.length, places: pub.catalog.places.length } };
}

const publicUrl = (base, key) => `${base.replace(/\/+$/, '')}/storage/v1/object/public/${BUCKET}/${key}`;
async function pool(items, size, worker) {
  const results = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => { while (next < items.length) { const i = next++; results[i] = await worker(items[i], i); } }));
  return results;
}
async function retry(action, attempts = 4) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try { return await action(); } catch (error) { last = error; if (error.fatal) throw error; await new Promise(r => setTimeout(r, 200 * 2 ** i)); }
  }
  throw last;
}
const fatal = message => Object.assign(new Error(message), { fatal: true });

/** Download one public object and classify it: missing, identical, or different (never to be overwritten). */
async function remoteState(base, object, fetcher) {
  const response = await fetcher(publicUrl(base, object.key));
  if (response.status === 404 || response.status === 400) { await response.arrayBuffer().catch(() => {}); return 'missing'; }
  if (!response.ok) throw new Error(`Storage responded ${response.status} for ${object.key}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  return bytes.length === object.bytes && sha256(bytes) === object.sha256 ? 'identical' : 'different';
}

/** Read-only plan: which objects are new, already identical, or conflicting. */
export async function plan(pub, { url, fetcher = fetch, concurrency = 8 }) {
  const objects = objectList(pub);
  const states = await pool(objects, concurrency, o => retry(() => remoteState(url, o, fetcher)));
  const count = s => states.filter(x => x === s).length;
  return { batch_key: pub.batchKey, scope: pub.scope, storage_prefix: pub.prefix, objects: objects.length, to_upload: count('missing'), already_identical: count('identical'),
    conflicting: objects.filter((_, i) => states[i] === 'different').map(o => o.key), bytes_to_upload: objects.reduce((n, o, i) => n + (states[i] === 'missing' ? o.bytes : 0), 0),
    touches_other_scopes: false, mutates: false };
}

/** Upload missing objects. Existing identical objects are skipped; a different object under the same key stops the run. */
export async function upload(pub, { url, serviceKey, fetcher = fetch, concurrency = 4, log = () => {} }) {
  if (!serviceKey) throw new Error('upload needs SUPABASE_SERVICE_ROLE_KEY in the environment of the operator');
  const objects = objectList(pub), base = url.replace(/\/+$/, '');
  let uploaded = 0, skipped = 0, done = 0;
  await pool(objects, concurrency, async object => {
    await retry(async () => {
      const state = await remoteState(base, object, fetcher);
      if (state === 'identical') { skipped++; return; }
      if (state === 'different') throw fatal(`Refusing to overwrite ${object.key}: remote bytes differ from the manifest`);
      const body = readFileSync(child(pub.root, object.file));
      if (body.length !== object.bytes || sha256(body) !== object.sha256) throw fatal(`Local file changed since validation: ${object.file}`);
      const response = await fetcher(`${base}/storage/v1/object/${BUCKET}/${object.key}`, { method: 'POST', body,
        headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, 'Content-Type': object.contentType, 'x-upsert': 'false', 'Cache-Control': 'public, max-age=31536000, immutable' } });
      const text = await response.text();
      // "Duplicate" means another attempt already created it: verify instead of trusting.
      if (!response.ok && !/duplicate|already exists/i.test(text)) throw new Error(`Upload of ${object.key} failed with ${response.status}`);
      if (await remoteState(base, object, fetcher) !== 'identical') throw new Error(`Uploaded object ${object.key} does not read back identical`);
      uploaded++;
    });
    if (++done % 100 === 0) log(`${done}/${objects.length}`);
  });
  return { batch_key: pub.batchKey, objects: objects.length, uploaded, skipped_identical: skipped };
}

/** Download everything, check hashes, inflate series and validate runs against the contract. */
export async function verifyRemote(pub, validators, { url, fetcher = fetch, concurrency = 8 }) {
  const objects = objectList(pub), problems = [];
  let verified = 0;
  await pool(objects, concurrency, object => retry(async () => {
    const response = await fetcher(publicUrl(url, object.key));
    if (!response.ok) { problems.push(`${object.key}: HTTP ${response.status}`); return; }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length !== object.bytes || sha256(bytes) !== object.sha256) { problems.push(`${object.key}: sha256 or length mismatch`); return; }
    try {
      if (object.file.endsWith('run.json') && !validators.SimulationRun(JSON.parse(bytes.toString('utf8')))) problems.push(`${object.key}: run fails the contract`);
      if (object.file.endsWith('.gz')) JSON.parse(gunzipSync(bytes, { maxOutputLength: 64 * 1024 * 1024 }).toString('utf8'));
      if (object.file === 'catalog.json' && !validators.SimulationCatalog(JSON.parse(bytes.toString('utf8')))) problems.push(`${object.key}: catalog fails the contract`);
    } catch (error) { problems.push(`${object.key}: ${error.message}`); return; }
    verified++;
  }));
  return { ok: problems.length === 0 && verified === objects.length, verified, total: objects.length, problems: problems.slice(0, 50) };
}

const lit = value => value === null || value === undefined ? 'null' : `'${String(value).replace(/'/g, "''")}'`;
const textArray = values => `array[${values.map(lit).join(',')}]::text[]`;
const intArray = values => `array[${values.map(v => { if (!Number.isInteger(v)) throw new Error('integer expected'); return v; }).join(',')}]::integer[]`;

/** Idempotent staging SQL: batch, runs, artifacts and publications, all not current. Safe to apply twice. */
export function metadataSql(pub) {
  const run = id => JSON.parse(readFileSync(child(pub.root, `runs/${id}/run.json`), 'utf8'));
  const out = [
    `-- Staging of simulation batch ${pub.batchKey} (${pub.scope}). Generated by scripts/simulations/publication-tool.mjs metadata-sql.`,
    '-- Idempotent: applying it again inserts nothing. It does not activate the batch and changes no existing row.',
    'begin;',
    `select app_private.assert_simulation_batch(${lit(pub.batchKey)}, ${lit(pub.manifestSha)});`,
    `insert into public.simulation_publication_batches(batch_key,scope,manifest_sha256,storage_bucket,storage_prefix,catalog_sha256,catalog_bytes,index_sha256,index_bytes,runs,places,note)`
      + ` values (${lit(pub.batchKey)},${lit(pub.scope)},${lit(pub.manifestSha)},${lit(BUCKET)},${lit(pub.prefix)},${lit(sha256(pub.catalogBytes))},${pub.catalogBytes.length},${lit(sha256(pub.indexBytes))},${pub.indexBytes.length},${pub.index.publications.length},${pub.catalog.places.length},${lit(`as_of ${pub.index.as_of}`)})`
      + ' on conflict (batch_key) do nothing;',
  ];
  for (const p of pub.index.publications) {
    const r = run(p.run_id), season = r.seasons[0], y = season?.yield ?? {};
    const summary = { seasons: r.seasons.length, members: r.ensemble.members, yield: { status: y.status ?? null, value_kg_ha: y.value_kg_ha ?? null, research_status: y.research_status ?? null,
      position_vs_season: y.position_vs_season ?? null, scenario_range: y.scenario_range ?? null, predictive_range: y.predictive_range ?? null } };
    if (!LOCATION.test(p.location_id) || !HEX64.test(r.checksums.identity_sha256)) throw new Error(`Unexpected run metadata for ${p.run_id}`);
    out.push(`insert into public.simulation_runs(run_key,kind,location_id,plan_id,crops,harvest_years,as_of,issued_at,identity_sha256,contract,execution_status,scientific_status,summary)`
      + ` values (${lit(p.run_id)},'regional',${lit(p.location_id)},${lit(p.plan_id)},${textArray(p.crops)},${intArray(p.harvest_years)},${lit(r.as_of)},${lit(r.issued_at)},${lit(r.checksums.identity_sha256)},${lit(r.contract)},${lit(r.execution_status)},${lit(JSON.stringify(r.scientific_status))}::jsonb,${lit(JSON.stringify(summary))}::jsonb)`
      + ` on conflict (run_key) where kind='regional' do nothing;`);
    for (const a of pub.artifacts.filter(x => x.run_id === p.run_id)) {
      out.push(`insert into public.simulation_artifacts(run_id,kind,storage_bucket,storage_path,sha256,bytes,compression,schema)`
        + ` select id,${lit(a.kind)},${lit(BUCKET)},${lit(`${pub.prefix}/runs/${a.run_id}/${a.sha256}/${a.name}`)},${lit(a.sha256)},${a.bytes},${lit(a.compression)},${lit(a.kind === 'run' ? 'future-simulation-run.v1' : 'future-simulation-series.v1')}`
        + ` from public.simulation_runs where run_key=${lit(p.run_id)} and kind='regional' on conflict (run_id, kind) do nothing;`);
    }
    out.push(`insert into public.regional_simulation_publications(run_id,location_id,plan_id,harvest_years,publication_version,is_current,sanitized,batch_id)`
      + ` select r.id,r.location_id,r.plan_id,r.harvest_years,${lit(p.publication_version)},false,true,b.id from public.simulation_runs r, public.simulation_publication_batches b`
      + ` where r.run_key=${lit(p.run_id)} and r.kind='regional' and b.batch_key=${lit(pub.batchKey)} on conflict (run_id) do nothing;`);
  }
  out.push(`do $check$ declare n integer; begin`,
    `  select count(*) into n from public.regional_simulation_publications p join public.simulation_publication_batches b on b.id=p.batch_id where b.batch_key=${lit(pub.batchKey)};`,
    `  if n <> ${pub.index.publications.length} then raise exception 'staged % of ${pub.index.publications.length} publications for ${pub.batchKey}: a run can belong to one batch only, so runs already published by another batch cannot be staged again', n; end if;`,
    'end $check$;', 'commit;',
    `select batch_key, scope, status, runs, places from public.simulation_publication_batches where batch_key=${lit(pub.batchKey)};`);
  return out.join('\n') + '\n';
}

const otherScopes = scope => `(select count(*) from public.regional_simulation_publications where is_current and split_part(location_id, ':', 1) <> ${lit(scope)})`;
export function activateSql(pub) {
  return [`-- Activation of simulation batch ${pub.batchKey} (${pub.scope}). One transaction; publications of other countries are not touched.`,
    `-- Apply only after: upload, verify-remote (all objects) and metadata-sql succeeded.`,
    `select ${otherScopes(pub.scope)} as other_countries_current_before;`,
    `select app_private.activate_simulation_batch(${lit(pub.batchKey)});`,
    `select ${otherScopes(pub.scope)} as other_countries_current_after;`,
    `select batch_key, status, activated_at from public.simulation_publication_batches where scope=${lit(pub.scope)} order by created_at;`].join('\n') + '\n';
}
export function rollbackSql(pub) {
  return [`-- Rollback for scope ${pub.scope}: withdraws the active batch and restores the one it superseded, if any. Nothing is deleted.`,
    `-- Objects already uploaded to the public bucket stay reachable by URL; withdrawing only hides catalog rows.`,
    `select ${otherScopes(pub.scope)} as other_countries_current_before;`,
    `select app_private.rollback_simulation_batch(${lit(pub.scope)});`,
    `select ${otherScopes(pub.scope)} as other_countries_current_after;`,
    `select batch_key, status from public.simulation_publication_batches where scope=${lit(pub.scope)} order by created_at;`].join('\n') + '\n';
}

function writeNew(path, text) {
  if (existsSync(path)) throw new Error(`${path} already exists; choose another --out or remove it yourself`);
  writeFileSync(path, text, { encoding: 'utf8', flag: 'wx' });
}

async function main(argv) {
  const [command, ...rest] = argv;
  const option = name => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1] : undefined; };
  const commands = ['inspect', 'validate', 'plan', 'upload', 'verify-remote', 'metadata-sql', 'activate-sql', 'rollback-sql'];
  if (!commands.includes(command) || !option('dir')) {
    console.error(`usage: node scripts/simulations/publication-tool.mjs <${commands.join('|')}> --dir <publication directory> [--out file.sql]`);
    return 2;
  }
  if (!statSync(option('dir')).isDirectory()) throw new Error('--dir must be a directory');
  const pub = loadPublication(option('dir'));
  const print = value => console.log(JSON.stringify(value, null, 1));
  const validators = async () => (await import(pathToFileURL(resolve(import.meta.dirname, '../../packages/contracts/dist/src/index.js')).href)).validators;
  const url = () => { const value = process.env.SUPABASE_URL; if (!value || !/^https?:\/\//.test(value)) throw new Error('Set SUPABASE_URL in the environment (project URL of the destination)'); return value; };
  if (command === 'inspect') { print(inspect(pub)); return 0; }
  if (command === 'validate') { const result = validate(pub, await validators()); print({ ...inspect(pub), validation: result }); return result.ok ? 0 : 1; }
  if (command === 'plan') { const result = await plan(pub, { url: url() }); print(result); return result.conflicting.length ? 1 : 0; }
  if (command === 'upload') {
    const local = validate(pub, await validators());
    if (!local.ok) { print({ validation: local }); return 1; }
    print(await upload(pub, { url: url(), serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY, log: message => console.error(message) })); return 0;
  }
  if (command === 'verify-remote') { const result = await verifyRemote(pub, await validators(), { url: url() }); print(result); return result.ok ? 0 : 1; }
  const sql = command === 'metadata-sql' ? metadataSql(pub) : command === 'activate-sql' ? activateSql(pub) : rollbackSql(pub);
  if (option('out')) { writeNew(resolve(option('out')), sql); console.error(`wrote ${option('out')} (${Buffer.byteLength(sql)} bytes, sha256 ${sha256(Buffer.from(sql))})`); }
  else process.stdout.write(sql);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; }, error => { console.error(`error: ${error.message}`); process.exitCode = 1; });
}
