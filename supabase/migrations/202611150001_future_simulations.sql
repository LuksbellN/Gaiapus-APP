-- Future-planning simulations (2027/2028): immutable runs, artifact manifests, sanitized regional publications and a
-- persistent job queue with leases. Additive: no existing table, policy or row is changed.
-- Postgres keeps metadata and compact summaries; full member × day series live in Storage objects listed here.
begin;

create table public.simulation_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null check (run_key ~ '^sim_[0-9a-f]{24}$'),
  kind text not null check (kind in ('regional','private')),
  owner_id uuid references auth.users(id) on delete cascade,
  location_id text not null check (location_id ~ '^(BR:ibge:[0-9]{7}|US:fips:[0-9]{5})$'),
  plan_id text not null check (char_length(plan_id) between 1 and 64),
  crops text[] not null check (cardinality(crops) between 1 and 6),
  harvest_years integer[] not null check (cardinality(harvest_years) between 1 and 5),
  as_of timestamptz not null,
  issued_at timestamptz not null,
  identity_sha256 text not null check (identity_sha256 ~ '^[0-9a-f]{64}$'),
  contract text not null check (char_length(contract) between 1 and 64),
  execution_status text not null check (execution_status in ('queued','running','succeeded','failed','cancelled')),
  scientific_status jsonb not null default '{}' check (jsonb_typeof(scientific_status)='object'),
  summary jsonb not null default '{}' check (jsonb_typeof(summary)='object'),
  created_at timestamptz not null default now(),
  -- Regional runs belong to nobody; private runs always have an owner (a hash match never shares a private result).
  check ((kind='regional' and owner_id is null) or (kind='private' and owner_id is not null))
);
create unique index simulation_runs_regional_key on public.simulation_runs(run_key) where kind='regional';
create unique index simulation_runs_private_key on public.simulation_runs(owner_id, run_key) where kind='private';
create index simulation_runs_owner_created on public.simulation_runs(owner_id, created_at desc) where kind='private';
create index simulation_runs_place on public.simulation_runs(location_id, plan_id, as_of desc);

-- A finished run is immutable: new inputs, sources or models create a new run.
create function app_private.simulation_runs_immutable() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='DELETE' and old.execution_status='succeeded' then raise exception 'immutable simulation run %', old.run_key; end if;
  if tg_op='UPDATE' and old.execution_status='succeeded' then raise exception 'immutable simulation run %', old.run_key; end if;
  return case when tg_op='DELETE' then old else new end;
end $$;
create trigger simulation_runs_immutable before update or delete on public.simulation_runs for each row execute function app_private.simulation_runs_immutable();

create table public.simulation_artifacts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.simulation_runs(id) on delete restrict,
  kind text not null check (kind in ('run','series','members')),
  storage_bucket text not null check (storage_bucket in ('simulation-public','simulation-private')),
  storage_path text not null check (char_length(storage_path) between 1 and 512 and storage_path !~ '(^/|\.\.)'),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  bytes bigint not null check (bytes > 0),
  compression text check (compression in ('gzip')),
  schema text not null check (char_length(schema) between 1 and 64),
  created_at timestamptz not null default now(),
  unique (run_id, kind)
);

create table public.regional_simulation_publications (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique references public.simulation_runs(id) on delete restrict,
  location_id text not null,
  plan_id text not null,
  harvest_years integer[] not null,
  publication_version text not null,
  is_current boolean not null default true,
  sanitized boolean not null check (sanitized),
  published_at timestamptz not null default now()
);
create unique index regional_publications_current on public.regional_simulation_publications(location_id, plan_id) where is_current;
create index regional_publications_lookup on public.regional_simulation_publications(location_id, plan_id, published_at desc);

-- Only regional runs can be published, and only through the backend.
create function app_private.publication_is_regional() returns trigger language plpgsql set search_path='' as $$
begin
  if not exists (select 1 from public.simulation_runs r where r.id=new.run_id and r.kind='regional' and r.execution_status='succeeded') then
    raise exception 'only succeeded regional runs can be published' using errcode='23514';
  end if;
  return new;
end $$;
create trigger regional_publication_is_regional before insert or update on public.regional_simulation_publications for each row execute function app_private.publication_is_regional();

create table public.simulation_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  request jsonb not null check (jsonb_typeof(request)='object'),
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  idempotency_key text not null check (char_length(idempotency_key) between 1 and 128),
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed','cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  lease_owner text,
  lease_expires_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  run_id uuid references public.simulation_runs(id),
  safe_error text check (char_length(safe_error) <= 256),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, idempotency_key)
);
create index simulation_jobs_claim on public.simulation_jobs(status, next_attempt_at);
create index simulation_jobs_owner on public.simulation_jobs(owner_id, created_at desc);

-- Worker side (service role only): claim with lease, complete only while holding the lease.
create function app_private.claim_simulation_job(p_worker text, p_lease_seconds integer)
returns setof public.simulation_jobs language sql security definer set search_path='' as $$
  update public.simulation_jobs j set status='running', attempts=j.attempts+1, lease_owner=p_worker,
         lease_expires_at=now()+make_interval(secs=>p_lease_seconds), updated_at=now()
  where j.id = (select id from public.simulation_jobs
                where attempts < max_attempts and ((status='queued' and next_attempt_at<=now()) or (status='running' and lease_expires_at<now()))
                order by created_at for update skip locked limit 1)
  returning j.*;
$$;
create function app_private.complete_simulation_job(p_job uuid, p_worker text, p_run uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  update public.simulation_jobs set status='succeeded', run_id=p_run, lease_owner=null, lease_expires_at=null, updated_at=now()
  where id=p_job and status='running' and lease_owner=p_worker and lease_expires_at>=now();
  if not found then raise exception 'stale lease for job %', p_job; end if;
end $$;
create function app_private.fail_simulation_job(p_job uuid, p_worker text, p_safe_error text, p_retry_seconds integer) returns void language plpgsql security definer set search_path='' as $$
begin
  update public.simulation_jobs set status=case when attempts>=max_attempts then 'failed' else 'queued' end, safe_error=left(p_safe_error,256),
         lease_owner=null, lease_expires_at=null, next_attempt_at=now()+make_interval(secs=>p_retry_seconds), updated_at=now()
  where id=p_job and status='running' and lease_owner=p_worker;
  if not found then raise exception 'stale lease for job %', p_job; end if;
end $$;
revoke all on function app_private.claim_simulation_job(text,integer), app_private.complete_simulation_job(uuid,text,uuid),
  app_private.fail_simulation_job(uuid,text,text,integer) from public, anon, authenticated;
do $$ begin if exists (select from pg_roles where rolname='service_role') then
  grant usage on schema app_private to service_role;
  grant execute on function app_private.claim_simulation_job(text,integer), app_private.complete_simulation_job(uuid,text,uuid),
    app_private.fail_simulation_job(uuid,text,text,integer) to service_role;
end if; end $$;

-- Row-level security.
alter table public.simulation_runs enable row level security;
alter table public.simulation_artifacts enable row level security;
alter table public.regional_simulation_publications enable row level security;
alter table public.simulation_jobs enable row level security;
revoke all on public.simulation_runs, public.simulation_artifacts, public.regional_simulation_publications, public.simulation_jobs from public, anon, authenticated;

create function public.simulation_run_visible(p_run uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists (select 1 from public.simulation_runs r where r.id=p_run and (
    (r.kind='regional' and exists (select 1 from public.regional_simulation_publications p where p.run_id=r.id))
    or (r.kind='private' and r.owner_id=(select auth.uid()) and (select public.is_verified()))));
$$;
revoke all on function public.simulation_run_visible(uuid) from public;
grant execute on function public.simulation_run_visible(uuid) to anon, authenticated;

grant select on public.simulation_runs, public.simulation_artifacts, public.regional_simulation_publications to anon, authenticated;
create policy visible_runs on public.simulation_runs for select to anon, authenticated using ((select public.simulation_run_visible(id)));
create policy visible_artifacts on public.simulation_artifacts for select to anon, authenticated using ((select public.simulation_run_visible(run_id)));
create policy public_publications on public.regional_simulation_publications for select to anon, authenticated using (true);

grant select, insert on public.simulation_jobs to authenticated;
create policy own_jobs_read on public.simulation_jobs for select to authenticated using ((select auth.uid())=owner_id and (select public.is_verified()));
create policy own_jobs_enqueue on public.simulation_jobs for insert to authenticated
  with check ((select auth.uid())=owner_id and (select public.is_verified()) and status='queued' and attempts=0 and run_id is null and lease_owner is null);

-- Storage: a public bucket that only ever receives sanitized regional artifacts, and a private bucket readable by owners.
do $$ begin if exists (select from information_schema.tables where table_schema='storage' and table_name='buckets') then
  insert into storage.buckets(id, name, public) values ('simulation-public','simulation-public', true) on conflict (id) do nothing;
  insert into storage.buckets(id, name, public) values ('simulation-private','simulation-private', false) on conflict (id) do nothing;
  execute $p$create policy simulation_private_owner_read on storage.objects for select to authenticated
    using (bucket_id='simulation-private' and (storage.foldername(name))[1]=(select auth.uid())::text and (select public.is_verified()))$p$;
end if; end $$;

commit;
