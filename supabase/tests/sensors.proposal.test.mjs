// Local test of supabase/proposals/20261115_sensors_plots.sql. Never touches a hosted project.
// It runs only against its own disposable container (not the one of policies.test.mjs, so the two never reset each other):
//   docker run -d --name gaiapus-sensors-proposal-test-20261115 --label gaiapus.purpose=isolated-sensors-proposal-test \
//     -e POSTGRES_PASSWORD=local-test-only -e POSTGRES_DB=gaiapus_test postgres:17
//   node supabase/tests/sensors.proposal.test.mjs
//   docker rm -f gaiapus-sensors-proposal-test-20261115
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const container = 'gaiapus-sensors-proposal-test-20261115';
const label = execFileSync('docker', ['inspect', '--format', '{{index .Config.Labels "gaiapus.purpose"}}', container], { encoding: 'utf8' }).trim();
assert.equal(label, 'isolated-sensors-proposal-test', 'Only the dedicated disposable test database may be reset');
const sql = (input) => execFileSync('docker', ['exec', '-i', container, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'gaiapus_test'], { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();

// Supabase Auth is represented by its documented SQL interface (auth.uid()), as in policies.test.mjs.
sql(`drop schema public cascade; create schema public; drop schema if exists app_private cascade; drop schema if exists auth cascade; drop schema if exists extensions cascade; create schema auth;
do $$ begin if not exists(select from pg_roles where rolname='anon') then create role anon nologin; end if;
if not exists(select from pg_roles where rolname='authenticated') then create role authenticated nologin; end if; end $$;
grant usage on schema public, auth to anon, authenticated;
create table auth.users(id uuid primary key, email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('email_verified',true) $$;
insert into auth.users values ('00000000-0000-4000-8000-000000000001',now()), ('00000000-0000-4000-8000-000000000002',now()), ('00000000-0000-4000-8000-000000000003',null);`);
sql(readFileSync(new URL('../migrations/202611140001_personal.sql', import.meta.url), 'utf8'));
sql(readFileSync(new URL('../proposals/20261115_sensors_plots.sql', import.meta.url), 'utf8'));
sql(`grant usage on schema extensions to authenticated;
insert into app_private.device_registry(device_id,claim_code_hash) values ('c4000110', extensions.crypt('K7Q2-M9XD', extensions.gen_salt('bf'))), ('c4000111', extensions.crypt('ZZZZ-1111', extensions.gen_salt('bf')));`);

const a = '00000000-0000-4000-8000-000000000001', b = '00000000-0000-4000-8000-000000000002', unverified = '00000000-0000-4000-8000-000000000003';
const run = (id, query, end) => sql(`begin; set local role authenticated; select set_config('request.jwt.claim.sub','${id}',true); ${query}; ${end};`).split('\n').slice(1).join('\n');
const asUser = (id, query) => run(id, query, 'rollback');
const commitUser = (id, query) => run(id, query, 'commit');
const denied = (fn, pattern = /row-level security|permission denied|violates|rejected|not allowed|active installations/i) => assert.throws(fn, pattern);
const SQUARE = `'{"type":"Polygon","coordinates":[[[-48.27,-18.92],[-48.26,-18.92],[-48.26,-18.91],[-48.27,-18.91],[-48.27,-18.92]]]}'`;
let passed = 0; const ok = (name) => { passed++; console.log('ok -', name); };

// --- properties and plots are private to their owner -------------------------------------------------------
const property = commitUser(a, `insert into farm_properties(user_id,name,municipality_code) values ('${a}','Sítio Boa Vista','3170206') returning id`).split('\n').at(-1);
const plot = commitUser(a, `insert into farm_plots(user_id,property_id,name,outline,area_calc_ha) values ('${a}','${property}','Talhão A',${SQUARE},117.5) returning id`).split('\n').at(-1);
const plotB = commitUser(a, `insert into farm_plots(user_id,property_id,name) values ('${a}','${property}','Talhão B') returning id`).split('\n').at(-1);
assert.match(plot, /^[a-f0-9-]{36}$/);
assert.equal(asUser(a, 'select count(*) from farm_plots'), '2');
assert.equal(asUser(b, 'select count(*) from farm_plots'), '0');
assert.equal(asUser(b, `with x as (update farm_plots set name='stolen' where id='${plot}' returning *) select count(*) from x`), '0');
assert.equal(asUser(b, `with x as (delete from farm_plots where id='${plot}' returning *) select count(*) from x`), '0');
denied(() => asUser(b, `insert into farm_plots(user_id,property_id,name) values ('${b}','${property}','In someone else''s property')`));
denied(() => asUser(b, `insert into farm_plots(user_id,property_id,name) values ('${a}','${property}','Forged owner')`));
denied(() => sql('set role anon; select * from farm_plots'));
assert.equal(asUser(unverified, 'select count(*) from farm_properties'), '0');
denied(() => asUser(unverified, `insert into farm_properties(user_id,name) values ('${unverified}','Unverified e-mail')`));
ok('properties and plots: owner only, anonymous and unverified accounts get nothing');

// --- outline shape ------------------------------------------------------------------------------------------
for (const [name, outline] of [
  ['open ring', `'{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,1]]]}'`],
  ['two positions', `'{"type":"Polygon","coordinates":[[[0,0],[1,0],[0,0]]]}'`],
  ['hole', `'{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,0]],[[0,0],[1,0],[1,1],[0,0]]]}'`],
  ['multipolygon', `'{"type":"MultiPolygon","coordinates":[]}'`],
  ['latitude out of range', `'{"type":"Polygon","coordinates":[[[0,0],[1,95],[1,1],[0,0]]]}'`],
  ['text coordinate', `'{"type":"Polygon","coordinates":[[[0,0],["1",0],[1,1],[0,0]]]}'`],
]) denied(() => asUser(a, `insert into farm_plots(user_id,property_id,name,outline) values ('${a}','${property}','${name}',${outline})`), /violates check constraint/);
ok('outline: open rings, fewer than three corners, holes, other types and bad coordinates are refused');

// --- claiming a stake ---------------------------------------------------------------------------------------
denied(() => sql(`set role anon; select public.claim_device('c4000110','K7Q2-M9XD')`));
denied(() => asUser(unverified, `select public.claim_device('c4000110','K7Q2-M9XD')`), /not allowed/);
assert.equal(commitUser(a, `select public.claim_device('c4000110','WRONG-CODE')`), 'rejected');
assert.equal(commitUser(a, `select public.claim_device('ffffffff','K7Q2-M9XD')`), 'rejected');
denied(() => asUser(a, `insert into devices(device_id,user_id) values ('c4000110','${a}')`), /permission denied/);
assert.equal(commitUser(a, `select public.claim_device('c4000110','K7Q2-M9XD')`), 'claimed');
assert.equal(commitUser(a, `select public.claim_device('c4000110','K7Q2-M9XD')`), 'already_yours');
// Another account with the RIGHT code gets the same generic refusal as with a wrong code or an unknown stake.
assert.equal(commitUser(b, `select public.claim_device('c4000110','K7Q2-M9XD')`), 'rejected');
assert.equal(asUser(b, 'select count(*) from devices'), '0');
assert.equal(asUser(a, 'select device_id from devices'), 'c4000110');
denied(() => asUser(a, 'select * from app_private.device_registry'), /permission denied/);
ok('claim: needs the right code, is idempotent, has a single owner and refuses generically');

for (let i = 0; i < 10; i++) assert.equal(commitUser(b, `select public.claim_device('c4000111','GUESS-${i}00')`), 'rejected');
// After ten failed attempts in an hour even the right code is refused.
assert.equal(commitUser(b, `select public.claim_device('c4000111','ZZZZ-1111')`), 'rejected');
assert.equal(asUser(b, 'select count(*) from devices'), '0');
ok('claim: repeated attempts are limited');

// Repeated claims in one transaction leave one link, and the primary key refuses any second owner row.
sql(`delete from public.devices; delete from app_private.claim_attempts;`);
commitUser(a, `select public.claim_device('c4000110','K7Q2-M9XD'); select public.claim_device('c4000110','K7Q2-M9XD')`);
assert.equal(sql(`select count(*) from public.devices where device_id='c4000110'`), '1');
denied(() => sql(`insert into public.devices(device_id,user_id) values ('c4000110','${b}')`), /duplicate key/);
ok('claim: a stake can only ever have one owner row');

// --- installations ------------------------------------------------------------------------------------------
const first = commitUser(a, `select public.install_device('c4000110','${plot}',-48.265,-18.915,'phone_gps',8,now())`).split('\n').at(-1);
const second = commitUser(a, `select public.install_device('c4000110','${plotB}',-48.245,-18.915,'manual',null,now())`).split('\n').at(-1);
assert.notEqual(first, second);
assert.equal(asUser(a, `select count(*) from device_installations where device_id='c4000110'`), '2');
assert.equal(asUser(a, `select count(*) from device_installations where device_id='c4000110' and ended_at is null`), '1');
assert.equal(asUser(a, `select plot_id from device_installations where id='${first}' and ended_at is not null`), plot);
assert.equal(asUser(a, `select (select ended_at from device_installations where id='${first}') = (select started_at from device_installations where id='${second}')`), 't');
denied(() => sql(`insert into public.device_installations(user_id,device_id,longitude,latitude,position_source,position_at) values ('${a}','c4000110',0,0,'manual',now())`), /duplicate key/);
denied(() => asUser(b, `select public.install_device('c4000110',null,0,0,'manual',null,now())`), /not allowed/);
denied(() => asUser(a, `insert into device_installations(user_id,device_id,longitude,latitude,position_source,position_at) values ('${a}','c4000110',0,0,'manual',now())`), /permission denied/);
assert.equal(asUser(b, 'select count(*) from device_installations'), '0');
denied(() => commitUser(a, `update farm_plots set archived_at=now() where id='${plotB}'`), /active installations/);
commitUser(a, `update farm_plots set archived_at=now() where id='${plot}'`); // no active installation there any more
commitUser(a, `select public.end_installation('c4000110')`);
assert.equal(asUser(a, `select count(*) from device_installations where device_id='c4000110'`), '2');
assert.equal(asUser(a, `select count(*) from device_installations where ended_at is null`), '0');
ok('installations: one active per stake, moving keeps history, archiving a plot in use is refused');

// --- command intents ----------------------------------------------------------------------------------------
commitUser(a, `select public.request_device_config('c4000110',null,false,15::smallint)`);
commitUser(a, `select public.request_device_config('c4000110',2::smallint,true,null)`);
assert.equal(asUser(a, `select string_agg(revision||':'||coalesce(led::text,'auto')||':'||interval_min||':'||state, ',' order by revision) from device_commands`), '1:auto:15:superseded,2:2:15:saved');
for (const bad of [0, 256]) denied(() => asUser(a, `select public.request_device_config('c4000110',null,false,${bad}::smallint)`), /violates check constraint|out of range/);
denied(() => asUser(a, `select public.request_device_config('c4000110',4::smallint,true,null)`), /violates check constraint/);
denied(() => sql(`update public.device_commands set state='confirmed'`), /violates check constraint/);
denied(() => sql(`update public.device_commands set state='applied'`), /violates check constraint/);
denied(() => asUser(a, `update device_commands set state='awaiting_device'`), /permission denied/);
denied(() => asUser(b, `select public.request_device_config('c4000110',null,false,30::smallint)`), /not allowed/);
assert.equal(asUser(b, 'select count(*) from device_commands'), '0');
ok('commands: LED 0-3, interval 1-255, complete desired state, no "confirmed" state, users cannot advance a state');

console.log(`sensors proposal: ${passed} groups passed`);
