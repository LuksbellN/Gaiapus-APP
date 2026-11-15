// Publication tool against an in-memory object store: validation, read-only plan, interrupted and resumed upload,
// refusal to overwrite, remote verification and SQL generation. Run: node --test scripts/simulations/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BUCKET, activateSql, inspect, loadPublication, metadataSql, objectList, plan, rollbackSql, sha256, upload, validate, verifyRemote } from './publication-tool.mjs';

const fixture = fileURLToPath(new URL('../../packages/contracts/fixtures/us-simulation-v2/', import.meta.url));
const { validators } = await import(pathToFileURL(fileURLToPath(new URL('../../packages/contracts/dist/src/index.js', import.meta.url))).href);
const URL_BASE = 'https://project.example';

// Minimal fake of the Storage HTTP surface used by the tool: public GET and authenticated POST without upsert.
function storage({ failAfterUploads = Infinity } = {}) {
  const objects = new Map(); const log = { posts: 0, gets: 0, unauthorized: 0 };
  const fetcher = async (input, init = {}) => {
    const url = String(input);
    if ((init.method ?? 'GET') === 'GET') {
      log.gets++;
      const key = url.split(`/storage/v1/object/public/${BUCKET}/`)[1];
      return objects.has(key) ? new Response(new Uint8Array(objects.get(key)), { status: 200 }) : new Response('{"error":"not_found"}', { status: 400 });
    }
    const key = url.split(`/storage/v1/object/${BUCKET}/`)[1];
    if (init.headers.Authorization !== 'Bearer service-key-for-test') { log.unauthorized++; return new Response('unauthorized', { status: 403 }); }
    if (init.headers['x-upsert'] !== 'false') throw new Error('the tool must never upsert');
    if (objects.has(key)) return new Response('{"statusCode":"409","error":"Duplicate"}', { status: 400 });
    if (log.posts >= failAfterUploads) throw new Error('connection reset');
    log.posts++; objects.set(key, Buffer.from(init.body));
    return new Response('{"Key":"ok"}', { status: 200 });
  };
  return { fetcher, objects, log };
}
const copyOfFixture = () => { const dir = mkdtempSync(join(tmpdir(), 'gaiapus-pub-')); cpSync(fixture, dir, { recursive: true }); return dir; };

test('inspect reports scope, sizes and coverage by harvest year without network', () => {
  const info = inspect(loadPublication(fixture));
  assert.equal(info.scope, 'US');
  assert.equal(info.runs, 5);
  assert.equal(info.objects, 12); // catalog + index + 5 runs × (run, series)
  assert.match(info.batch_key, /^us-[0-9a-f]{16}$/);
  assert.deepEqual(info.by_harvest_year[2026], { capabilities: 3, ready_with_daily_series: 0, yield_only: 3, no_result: 0 });
  assert.equal(info.by_harvest_year[2028].ready_with_daily_series, 3);
  assert.equal(info.megabytes_decimal > info.mebibytes, true);
});

test('validate accepts the fixture and catches corruption, foreign places, secrets and stray runs', () => {
  assert.deepEqual(validate(loadPublication(fixture), validators).problems, []);
  const dir = copyOfFixture();
  try {
    const pub = loadPublication(dir), series = pub.artifacts.find(a => a.kind === 'series');
    const bytes = readFileSync(join(dir, series.path)); bytes[bytes.length - 1] ^= 1; writeFileSync(join(dir, series.path), bytes);
    assert.match(validate(loadPublication(dir), validators).problems.join('\n'), /sha256 or byte length differs/);
    const catalog = JSON.parse(readFileSync(join(dir, 'catalog.json'), 'utf8'));
    catalog.inputs.leak = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.c2lnbmF0dXJlLXZhbHVl';
    writeFileSync(join(dir, 'catalog.json'), JSON.stringify(catalog));
    assert.match(validate(loadPublication(dir), validators).problems.join('\n'), /possible credential/);
    catalog.places[0].location_id = 'BR:ibge:5107925';
    writeFileSync(join(dir, 'catalog.json'), JSON.stringify(catalog));
    assert.throws(() => loadPublication(dir), /exactly one country/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the batch key is the content: any byte change gives another key and prefix', () => {
  const a = loadPublication(fixture), dir = copyOfFixture();
  try {
    const catalog = JSON.parse(readFileSync(join(dir, 'catalog.json'), 'utf8')); catalog.inputs.note = 'changed';
    writeFileSync(join(dir, 'catalog.json'), JSON.stringify(catalog));
    const b = loadPublication(dir);
    assert.notEqual(a.batchKey, b.batchKey);
    assert.equal(objectList(a).every(o => o.key.startsWith(`us/batches/${a.batchKey}/`)), true);
    assert.equal(objectList(a).filter(o => o.key.includes('/runs/')).every(o => o.key.includes(`/${o.sha256}/`)), true);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('plan is read-only and reports what an upload would do', async () => {
  const pub = loadPublication(fixture), remote = storage();
  const before = await plan(pub, { url: URL_BASE, fetcher: remote.fetcher });
  assert.deepEqual([before.to_upload, before.already_identical, before.conflicting, before.mutates], [12, 0, [], false]);
  assert.equal(remote.log.posts, 0);
  assert.equal(remote.objects.size, 0);
});

test('an interrupted upload resumes without duplicates or rewrites, and a second run uploads nothing', async () => {
  const pub = loadPublication(fixture), remote = storage({ failAfterUploads: 5 });
  await assert.rejects(upload(pub, { url: URL_BASE, serviceKey: 'service-key-for-test', fetcher: remote.fetcher, concurrency: 2 }), /connection reset/);
  assert.equal(remote.objects.size, 5);
  const partial = await plan(pub, { url: URL_BASE, fetcher: remote.fetcher });
  assert.deepEqual([partial.to_upload, partial.already_identical], [7, 5]);
  const snapshot = new Map(remote.objects);
  const resumed = storage(); for (const [k, v] of snapshot) resumed.objects.set(k, v);
  const second = await upload(pub, { url: URL_BASE, serviceKey: 'service-key-for-test', fetcher: resumed.fetcher });
  assert.deepEqual([second.uploaded, second.skipped_identical], [7, 5]);
  for (const [k, v] of snapshot) assert.equal(resumed.objects.get(k), v, 'objects from the first attempt are not rewritten');
  const third = await upload(pub, { url: URL_BASE, serviceKey: 'service-key-for-test', fetcher: resumed.fetcher });
  assert.deepEqual([third.uploaded, third.skipped_identical], [0, 12]);
  assert.equal(resumed.log.posts, 7);
  const verified = await verifyRemote(pub, validators, { url: URL_BASE, fetcher: resumed.fetcher });
  assert.deepEqual([verified.ok, verified.verified, verified.total], [true, 12, 12]);
});

test('upload never overwrites: a different object under the same key stops the run; a missing key is refused without the service key', async () => {
  const pub = loadPublication(fixture), remote = storage(), first = objectList(pub).find(o => o.key.endsWith('series.json.gz'));
  remote.objects.set(first.key, Buffer.from('someone else wrote this'));
  await assert.rejects(upload(pub, { url: URL_BASE, serviceKey: 'service-key-for-test', fetcher: remote.fetcher, concurrency: 1 }), /Refusing to overwrite/);
  assert.equal(remote.objects.get(first.key).toString(), 'someone else wrote this');
  assert.deepEqual((await plan(pub, { url: URL_BASE, fetcher: remote.fetcher })).conflicting, [first.key]);
  await assert.rejects(upload(pub, { url: URL_BASE, fetcher: storage().fetcher }), /SUPABASE_SERVICE_ROLE_KEY/);
  const denied = storage();
  await assert.rejects(upload(pub, { url: URL_BASE, serviceKey: 'wrong', fetcher: denied.fetcher, concurrency: 1 }), /failed with 403/);
  assert.equal(denied.objects.size, 0);
});

test('verify-remote detects a corrupted or missing remote object', async () => {
  const pub = loadPublication(fixture), remote = storage();
  await upload(pub, { url: URL_BASE, serviceKey: 'service-key-for-test', fetcher: remote.fetcher });
  const victim = objectList(pub).find(o => o.key.endsWith('run.json'));
  remote.objects.set(victim.key, Buffer.from('{}'));
  remote.objects.delete(objectList(pub).at(-1).key);
  const result = await verifyRemote(pub, validators, { url: URL_BASE, fetcher: remote.fetcher });
  assert.equal(result.ok, false);
  assert.equal(result.verified, 10);
  assert.equal(result.problems.length, 2);
});

test('generated SQL is staged, idempotent by construction and scoped to one country', () => {
  const pub = loadPublication(fixture), sql = metadataSql(pub);
  assert.match(sql, /^-- Staging of simulation batch us-[0-9a-f]{16} \(US\)/);
  assert.equal((sql.match(/insert into public\.simulation_runs/g) ?? []).length, 5);
  assert.equal((sql.match(/insert into public\.simulation_artifacts/g) ?? []).length, 10);
  assert.equal((sql.match(/on conflict/g) ?? []).length, 1 + 5 + 10 + 5);
  assert.equal(/\b(update|delete|truncate|drop)\b/i.test(sql.replace(/do nothing/g, '')), false);
  assert.equal(sql.includes(',false,true,b.id'), true, 'publications are staged as not current');
  assert.equal(sql.includes('BR:'), false);
  assert.equal(sql.includes(sha256(pub.catalogBytes)), true);
  assert.match(activateSql(pub), /app_private\.activate_simulation_batch\('us-[0-9a-f]{16}'\)/);
  assert.match(rollbackSql(pub), /app_private\.rollback_simulation_batch\('US'\)/);
  assert.equal(/service|secret|eyJ/i.test(sql + activateSql(pub) + rollbackSql(pub)), false);
});
