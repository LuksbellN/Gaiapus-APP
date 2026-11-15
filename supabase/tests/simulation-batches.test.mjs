// Publication batches: staging is invisible, activation is one transaction per scope, 2027 and 2028 coexist,
// Brazil is untouched by a US activation, re-import creates no duplicates, rollback restores the previous batch.
// Run: node supabase/tests/simulation-batches.test.mjs   (needs Docker; creates/reuses only the labelled container below)
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const container = 'gaiapus-sim-policy-test-20261115';
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
let exists = true;
try { docker('inspect', container); } catch { exists = false; }
if (!exists) docker('run', '-d', '--name', container, '--label', 'gaiapus.purpose=isolated-policy-test', '-e', 'POSTGRES_PASSWORD=isolated-test-only', '-e', 'POSTGRES_DB=gaiapus_test', 'postgres:17');
if (docker('inspect', '--format', '{{.State.Running}}', container) !== 'true') docker('start', container);
assert.equal(docker('inspect', '--format', '{{index .Config.Labels "gaiapus.purpose"}}', container), 'isolated-policy-test', 'Only the dedicated isolated test database may be reset');
for (let i = 0; i < 60; i++) { try { docker('exec', container, 'pg_isready', '-U', 'postgres', '-d', 'gaiapus_test'); break; } catch { execFileSync(process.platform === 'win32' ? 'powershell' : 'sleep', process.platform === 'win32' ? ['-Command', 'Start-Sleep -Seconds 1'] : ['1']); } }
const sqlRaw = input => execFileSync('docker', ['exec', '-i', container, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'gaiapus_test'], { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
const sql = input => sqlRaw(input).trim();

sql(`drop schema if exists public cascade; create schema public; drop schema if exists app_private cascade; drop schema if exists auth cascade; create schema auth;
do $$ begin if not exists(select from pg_roles where rolname='anon') then create role anon nologin; end if;
if not exists(select from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
if not exists(select from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if; end $$;
grant usage on schema public, auth to anon, authenticated, service_role;
create table auth.users(id uuid primary key, email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('email_verified',true) $$;
insert into auth.users values ('00000000-0000-4000-8000-000000000001',now());`);
const migrations = readdirSync(new URL('../migrations/', import.meta.url)).filter(f => f.endsWith('.sql')).sort();
assert.deepEqual(migrations.slice(0, 2), ['202611140001_personal.sql', '202611150001_future_simulations.sql'], 'new migrations must sort after the existing ones');
for (const m of migrations) sql(readFileSync(new URL(`../migrations/${m}`, import.meta.url), 'utf8'));

const as = (role, query) => sqlRaw(`begin; set local role ${role}; ${query}; rollback;`).trim();
const anon = q => as('anon', q);
const denied = (fn, pattern = /row-level security|permission denied|violates|duplicate key|not staged|incomplete|scope/i) => assert.throws(fn, pattern);
const sha = c => c.repeat(64);
const run = (n, key, location, plan, years) => `insert into public.simulation_runs(id,run_key,kind,location_id,plan_id,crops,harvest_years,as_of,issued_at,identity_sha256,contract,execution_status)
  values ('10000000-0000-4000-8000-0000000000${n}','${key}','regional','${location}','${plan}','{soy}','{${years}}','2026-11-14T23:59Z','2026-11-15T15:27Z','${sha('a')}','future-simulation-run.v1','succeeded')
  on conflict (run_key) where kind='regional' do nothing;
  insert into public.simulation_artifacts(run_id,kind,storage_bucket,storage_path,sha256,bytes,compression,schema)
  select id, k.kind, 'simulation-public', 'x/'||run_key||'/'||k.kind, '${sha('1')}', 10, null, 's' from public.simulation_runs, (values ('run'),('series')) k(kind) where run_key='${key}'
  on conflict (run_id, kind) do nothing;`;
const publish = (key, batch) => `insert into public.regional_simulation_publications(run_id,location_id,plan_id,harvest_years,publication_version,is_current,sanitized,batch_id)
  select r.id, r.location_id, r.plan_id, r.harvest_years, r.run_key, ${batch ? 'false' : 'true'}, true, ${batch ? `(select id from public.simulation_publication_batches where batch_key='${batch}')` : 'null'}
  from public.simulation_runs r where r.run_key='${key}' on conflict (run_id) do nothing;`;
const batch = (key, scope, runs, manifest = 'b') => `insert into public.simulation_publication_batches(batch_key,scope,manifest_sha256,storage_prefix,catalog_sha256,catalog_bytes,index_sha256,index_bytes,runs,places)
  values ('${key}','${scope}','${sha(manifest)}','us/v2/${key}','${sha('c')}',10,'${sha('d')}',10,${runs},1) on conflict (batch_key) do nothing;`;

// Brazil as it exists today: a current publication without a batch, grouping both years in one run.
sql(run('01', 'sim_aaaaaaaaaaaaaaaaaaaaaaaa', 'BR:ibge:5107925', 'soy>maize2', '2027,2028') + publish('sim_aaaaaaaaaaaaaaaaaaaaaaaa', null));
const brBefore = sql(`select md5(string_agg(run_id::text||is_current::text, ',' order by run_id)) from public.regional_simulation_publications where location_id like 'BR:%'`);

// Stage a US batch: one place, one plan, two harvest years as two runs.
const stage = batch('us-v2-r2-test', 'US', 2) + run('11', 'sim_bbbbbbbbbbbbbbbbbbbbbbbb', 'US:fips:19169', 'us_soy', '2027') + run('12', 'sim_cccccccccccccccccccccccc', 'US:fips:19169', 'us_soy', '2028')
  + publish('sim_bbbbbbbbbbbbbbbbbbbbbbbb', 'us-v2-r2-test') + publish('sim_cccccccccccccccccccccccc', 'us-v2-r2-test');
sql(stage);
// Staged content is invisible to visitors: no batch, run, artifact or publication row.
assert.equal(anon('select count(*) from simulation_publication_batches'), '0');
assert.equal(anon("select count(*) from simulation_runs where location_id like 'US:%'"), '0');
assert.equal(anon("select count(*) from regional_simulation_publications where location_id like 'US:%'"), '0');
assert.equal(anon("select count(*) from simulation_artifacts a join simulation_runs r on r.id=a.run_id where r.location_id like 'US:%'"), '0');
assert.equal(anon("select count(*) from simulation_runs where location_id like 'BR:%'"), '1');
// Re-import (interrupted upload retried): zero duplicates.
sql(stage);
assert.equal(sql(`select (select count(*) from public.simulation_runs)||','||(select count(*) from public.simulation_artifacts)||','||(select count(*) from public.regional_simulation_publications)||','||(select count(*) from public.simulation_publication_batches)`), '3,6,3,1');
// Clients cannot write batches or activate.
denied(() => anon(`insert into simulation_publication_batches(batch_key,scope,manifest_sha256,storage_prefix,catalog_sha256,catalog_bytes,index_sha256,index_bytes,runs,places) values ('evil-batch','US','${sha('e')}','x','${sha('e')}',1,'${sha('e')}',1,0,0)`));
denied(() => anon(`select app_private.activate_simulation_batch('us-v2-r2-test')`));
denied(() => as('authenticated', `select app_private.activate_simulation_batch('us-v2-r2-test')`));
// A batch may only hold publications of its own country.
denied(() => sql(run('13', 'sim_dddddddddddddddddddddddd', 'BR:ibge:3170206', 'soy', '2027') + publish('sim_dddddddddddddddddddddddd', 'us-v2-r2-test')));
// An incomplete batch (declared 3 runs, 2 staged) cannot be activated.
sql(batch('us-incomplete', 'US', 3) + run('14', 'sim_eeeeeeeeeeeeeeeeeeeeeeee', 'US:fips:20191', 'us_wheat_winter', '2028') + publish('sim_eeeeeeeeeeeeeeeeeeeeeeee', 'us-incomplete'));
denied(() => sql(`select app_private.activate_simulation_batch('us-incomplete')`));

// Activation: 2027 and 2028 of the same place/plan are both current and visible; Brazil is byte-for-byte the same.
const activated = JSON.parse(sql(`select app_private.activate_simulation_batch('us-v2-r2-test')`));
assert.deepEqual([activated.scope, activated.runs, activated.previous_batch], ['US', 2, null]);
assert.equal(anon("select string_agg(harvest_years::text, ',' order by harvest_years) from regional_simulation_publications where location_id='US:fips:19169' and plan_id='us_soy' and is_current"), '{2027},{2028}');
assert.equal(anon("select count(*) from simulation_runs where location_id like 'US:%'"), '2');
assert.equal(anon("select batch_key||':'||status from simulation_publication_batches"), 'us-v2-r2-test:active');
assert.equal(sql(`select md5(string_agg(run_id::text||is_current::text, ',' order by run_id)) from public.regional_simulation_publications where location_id like 'BR:%'`), brBefore);
denied(() => sql(`select app_private.activate_simulation_batch('us-v2-r2-test')`), /not staged/i);
// One current publication per place × plan × harvest years still holds.
denied(() => sql(run('15', 'sim_ffffffffffffffffffffffff', 'US:fips:19169', 'us_soy', '2027') + `insert into public.regional_simulation_publications(run_id,location_id,plan_id,harvest_years,publication_version,is_current,sanitized)
  select id,location_id,plan_id,harvest_years,'dup',true,true from public.simulation_runs where run_key='sim_ffffffffffffffffffffffff'`), /duplicate key/i);
// The same manifest key cannot be re-staged with different content.
denied(() => sql(`select app_private.assert_simulation_batch('us-v2-r2-test','${sha('z')}')`), /manifest/i);
sql(`select app_private.assert_simulation_batch('us-v2-r2-test','${sha('b')}')`);

// A newer US batch supersedes the first in one step; rollback restores it. Brazil never changes.
sql(batch('us-v2-r3-test', 'US', 1) + run('16', 'sim_999999999999999999999999', 'US:fips:19169', 'us_soy', '2027') + publish('sim_999999999999999999999999', 'us-v2-r3-test'));
assert.equal(JSON.parse(sql(`select app_private.activate_simulation_batch('us-v2-r3-test')`)).previous_batch, 'us-v2-r2-test');
assert.equal(anon("select string_agg(r.run_key, ',' order by r.run_key) from regional_simulation_publications p join simulation_runs r on r.id=p.run_id where p.location_id like 'US:%' and p.is_current"), 'sim_999999999999999999999999');
assert.equal(anon("select string_agg(batch_key||':'||status, ',' order by batch_key) from simulation_publication_batches"), 'us-v2-r2-test:superseded,us-v2-r3-test:active');
const rolled = JSON.parse(sql(`select app_private.rollback_simulation_batch('US')`));
assert.deepEqual([rolled.withdrawn, rolled.restored], ['us-v2-r3-test', 'us-v2-r2-test']);
assert.equal(anon("select string_agg(r.run_key, ',' order by r.run_key) from regional_simulation_publications p join simulation_runs r on r.id=p.run_id where p.location_id like 'US:%' and p.is_current"), 'sim_bbbbbbbbbbbbbbbbbbbbbbbb,sim_cccccccccccccccccccccccc');
assert.equal(anon("select count(*) from simulation_runs where run_key='sim_999999999999999999999999'"), '0');
assert.equal(sql(`select md5(string_agg(run_id::text||is_current::text, ',' order by run_id)) from public.regional_simulation_publications where location_id like 'BR:%'`), brBefore);
// Rolling back the only batch leaves the US without a current publication and Brazil untouched; nothing is deleted.
assert.equal(JSON.parse(sql(`select app_private.rollback_simulation_batch('US')`)).restored, null);
assert.equal(anon("select count(*) from regional_simulation_publications where location_id like 'US:%'"), '0');
assert.equal(sql("select count(*) from public.simulation_runs where location_id like 'US:%'"), '5');
assert.equal(anon("select count(*) from regional_simulation_publications where location_id like 'BR:%' and is_current"), '1');
console.log('simulation batches: all assertions passed');
