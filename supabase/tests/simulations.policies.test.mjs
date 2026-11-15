// Future-simulation persistence: RLS, immutability, publication rules and the job lease, on a dedicated isolated Postgres.
// Run: node supabase/tests/simulations.policies.test.mjs   (needs Docker; creates/reuses only the labelled container below)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const container = 'gaiapus-sim-policy-test-20261115';
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
let exists = true;
try { docker('inspect', container); } catch { exists = false; }
if (!exists) {
  docker('run', '-d', '--name', container, '--label', 'gaiapus.purpose=isolated-policy-test', '-e', 'POSTGRES_PASSWORD=isolated-test-only', '-e', 'POSTGRES_DB=gaiapus_test', 'postgres:17');
}
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
insert into auth.users values ('00000000-0000-4000-8000-000000000001',now()), ('00000000-0000-4000-8000-000000000002',now());`);
for (const m of ['202611140001_personal.sql', '202611150001_future_simulations.sql']) sql(readFileSync(new URL(`../migrations/${m}`, import.meta.url), 'utf8'));

const a = '00000000-0000-4000-8000-000000000001', b = '00000000-0000-4000-8000-000000000002';
// The first output line is set_config's value (possibly empty): split the raw output before trimming.
const as = (role, id, query) => sqlRaw(`begin; set local role ${role}; select set_config('request.jwt.claim.sub','${id ?? ''}',true); ${query}; rollback;`).split('\n').slice(1).join('\n').trim();
const anon = q => as('anon', null, q), user = (id, q) => as('authenticated', id, q);
const denied = fn => assert.throws(fn, /row-level security|permission denied|immutable|violates check|stale lease|duplicate key|only succeeded regional runs can be published/i);
const sha = c => c.repeat(64);

// Service role (backend) writes: one regional published run, one unpublished regional run, one private run per user.
sql(`insert into public.simulation_runs(id,run_key,kind,owner_id,location_id,plan_id,crops,harvest_years,as_of,issued_at,identity_sha256,contract,execution_status,summary)
 values ('10000000-0000-4000-8000-000000000001','sim_aaaaaaaaaaaaaaaaaaaaaaaa','regional',null,'BR:ibge:5107925','soy','{soy}','{2027,2028}','2026-08-31T23:59Z','2026-11-15T12:00Z','${sha('a')}','future-simulation-run.v1','succeeded','{}'),
        ('10000000-0000-4000-8000-000000000002','sim_bbbbbbbbbbbbbbbbbbbbbbbb','regional',null,'BR:ibge:3170206','soy','{soy}','{2027}','2026-08-31T23:59Z','2026-11-15T12:00Z','${sha('b')}','future-simulation-run.v1','succeeded','{}'),
        ('10000000-0000-4000-8000-000000000003','sim_cccccccccccccccccccccccc','private','${a}','BR:ibge:5107925','soy','{soy}','{2027}','2026-08-31T23:59Z','2026-11-15T12:00Z','${sha('c')}','future-simulation-run.v1','succeeded','{}');
 insert into public.simulation_artifacts(run_id,kind,storage_bucket,storage_path,sha256,bytes,compression,schema)
 values ('10000000-0000-4000-8000-000000000001','series','simulation-public','regional/sim_aaaaaaaaaaaaaaaaaaaaaaaa/series.json.gz','${sha('1')}',100,'gzip','future-simulation-series.v1'),
        ('10000000-0000-4000-8000-000000000003','series','simulation-private','${a}/sim_cccccccccccccccccccccccc/series.json.gz','${sha('3')}',100,'gzip','future-simulation-series.v1');
 insert into public.regional_simulation_publications(run_id,location_id,plan_id,harvest_years,publication_version,is_current,sanitized)
 values ('10000000-0000-4000-8000-000000000001','BR:ibge:5107925','soy','{2027,2028}','sim_aaaaaaaaaaaaaaaaaaaaaaaa',true,true);`);

// Public reads: only published regional runs and their artifacts.
assert.equal(anon('select string_agg(run_key, \',\' order by run_key) from simulation_runs'), 'sim_aaaaaaaaaaaaaaaaaaaaaaaa');
assert.equal(anon('select count(*) from simulation_artifacts'), '1');
assert.equal(anon('select count(*) from regional_simulation_publications'), '1');
// Private runs: owner only; another user and visitors see nothing.
assert.equal(user(a, "select count(*) from simulation_runs where kind='private'"), '1');
assert.equal(user(b, "select count(*) from simulation_runs where kind='private'"), '0');
assert.equal(user(b, "select count(*) from simulation_artifacts where storage_bucket='simulation-private'"), '0');
assert.equal(user(a, "select count(*) from simulation_artifacts where storage_bucket='simulation-private'"), '1');
// No client writes to runs, artifacts or publications.
denied(() => anon(`insert into simulation_runs(run_key,kind,location_id,plan_id,crops,harvest_years,as_of,issued_at,identity_sha256,contract,execution_status,summary) values ('sim_dddddddddddddddddddddddd','regional','BR:ibge:5107925','soy','{soy}','{2027}',now(),now(),'${sha('d')}','x','succeeded','{}')`));
denied(() => user(a, `update simulation_runs set summary='{"x":1}' where run_key='sim_cccccccccccccccccccccccc'`));
denied(() => user(a, `insert into regional_simulation_publications(run_id,location_id,plan_id,harvest_years,publication_version,is_current,sanitized) values ('10000000-0000-4000-8000-000000000003','BR:ibge:5107925','soy','{2027}','x',false,true)`));
denied(() => user(a, `delete from simulation_artifacts`));
// A visibility=public flag from the client cannot exist: private runs cannot be published.
denied(() => sql(`insert into public.regional_simulation_publications(run_id,location_id,plan_id,harvest_years,publication_version,is_current,sanitized) values ('10000000-0000-4000-8000-000000000003','BR:ibge:5107925','soy','{2027}','x',false,true)`));
denied(() => sql(`insert into public.regional_simulation_publications(run_id,location_id,plan_id,harvest_years,publication_version,is_current,sanitized) values ('10000000-0000-4000-8000-000000000002','BR:ibge:3170206','soy','{2027}','x',true,false)`));
// Ownership shape: regional runs have no owner; private runs must have one.
denied(() => sql(`insert into public.simulation_runs(run_key,kind,owner_id,location_id,plan_id,crops,harvest_years,as_of,issued_at,identity_sha256,contract,execution_status,summary) values ('sim_eeeeeeeeeeeeeeeeeeeeeeee','regional','${a}','BR:ibge:5107925','soy','{soy}','{2027}',now(),now(),'${sha('e')}','x','succeeded','{}')`));
// Immutable once succeeded, even for the backend.
denied(() => sql(`update public.simulation_runs set summary='{"changed":true}' where run_key='sim_aaaaaaaaaaaaaaaaaaaaaaaa'`));
// One current publication per place × plan.
denied(() => sql(`insert into public.regional_simulation_publications(run_id,location_id,plan_id,harvest_years,publication_version,is_current,sanitized) values ('10000000-0000-4000-8000-000000000002','BR:ibge:5107925','soy','{2027}','v2',true,true)`));

// Jobs: a verified user enqueues own job only; cannot change status; cannot read others'.
sql(`begin; set local role authenticated; select set_config('request.jwt.claim.sub','${a}',true);
 insert into simulation_jobs(owner_id,request,request_hash,idempotency_key) values ('${a}','{"location_id":"BR:ibge:5107925"}','${sha('f')}','k1'); commit;`);
denied(() => user(a, `insert into simulation_jobs(owner_id,request,request_hash,idempotency_key) values ('${b}','{}','${sha('f')}','k2')`));
denied(() => user(a, `insert into simulation_jobs(owner_id,request,request_hash,idempotency_key,status) values ('${a}','{}','${sha('f')}','k3','succeeded')`));
denied(() => user(a, `insert into simulation_jobs(owner_id,request,request_hash,idempotency_key) values ('${a}','{}','${sha('f')}','k1')`));
denied(() => user(a, `update simulation_jobs set status='succeeded'`));
assert.equal(user(b, 'select count(*) from simulation_jobs'), '0');
assert.equal(user(a, 'select count(*) from simulation_jobs'), '1');
denied(() => user(a, `select * from app_private.claim_simulation_job('w1', 60)`));

// Lease: one claim at a time; an expired lease can be reclaimed; the stale worker cannot complete afterwards.
const job = sql(`select id from public.simulation_jobs where idempotency_key='k1'`);
assert.equal(sql(`select id from app_private.claim_simulation_job('w1', 60)`), job);
assert.equal(sql(`select count(*) from app_private.claim_simulation_job('w2', 60)`), '0');
sql(`update public.simulation_jobs set lease_expires_at = now() - interval '1 second' where id='${job}'`);
assert.equal(sql(`select attempts from app_private.claim_simulation_job('w2', 60)`), '2');
denied(() => sql(`select app_private.complete_simulation_job('${job}','w1','10000000-0000-4000-8000-000000000003')`));
sql(`select app_private.complete_simulation_job('${job}','w2','10000000-0000-4000-8000-000000000003')`);
assert.equal(sql(`select status||':'||run_id from public.simulation_jobs where id='${job}'`), 'succeeded:10000000-0000-4000-8000-000000000003');
console.log('simulation policies: all assertions passed');
