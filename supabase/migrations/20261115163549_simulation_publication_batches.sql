-- Regional publication batches (first use: US v2). Additive to 202611150001_future_simulations.sql:
--   * a batch groups the runs of one country published together; its catalog/index live in Storage, verified by sha256;
--   * staged batches are invisible; activation is one transaction per country scope and never touches another country;
--   * the "one current publication" key gains harvest_years, so 2027 and 2028 of the same place and plan coexist
--     (Brazilian publications, which group both years in one run, keep exactly one current row each);
--   * nothing is deleted: superseded and withdrawn batches and their rows stay for audit and rollback.
-- No existing row is modified. One existing index, one function and one policy are replaced by wider/stricter versions.
begin;

create table public.simulation_publication_batches (
  id uuid primary key default gen_random_uuid(),
  batch_key text not null unique check (batch_key ~ '^[a-z0-9][a-z0-9._-]{2,63}$'),
  scope text not null check (scope in ('BR','US')),
  manifest_sha256 text not null check (manifest_sha256 ~ '^[0-9a-f]{64}$'),
  storage_bucket text not null default 'simulation-public' check (storage_bucket = 'simulation-public'),
  storage_prefix text not null check (char_length(storage_prefix) between 1 and 200 and storage_prefix ~ '^[a-z0-9][a-z0-9._/-]*$' and storage_prefix !~ '\.\.'),
  catalog_sha256 text not null check (catalog_sha256 ~ '^[0-9a-f]{64}$'),
  catalog_bytes bigint not null check (catalog_bytes > 0),
  index_sha256 text not null check (index_sha256 ~ '^[0-9a-f]{64}$'),
  index_bytes bigint not null check (index_bytes > 0),
  runs integer not null check (runs >= 0),
  places integer not null check (places >= 0),
  status text not null default 'staged' check (status in ('staged','active','superseded','withdrawn')),
  previous_batch_id uuid references public.simulation_publication_batches(id),
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  activated_at timestamptz
);
create unique index simulation_batches_one_active on public.simulation_publication_batches(scope) where status='active';

alter table public.regional_simulation_publications add column batch_id uuid references public.simulation_publication_batches(id) on delete restrict;
create index regional_publications_batch on public.regional_simulation_publications(batch_id) where batch_id is not null;

-- 2027 and 2028 of the same place and plan are different publications when they are different runs.
drop index public.regional_publications_current;
create unique index regional_publications_current on public.regional_simulation_publications(location_id, plan_id, harvest_years) where is_current;

-- Current publications of one place and plan never overlap in harvest years (e.g. {2027} next to {2027,2028}).
create function app_private.publication_no_overlap() returns trigger language plpgsql set search_path='' as $$
begin
  if new.is_current and exists (select 1 from public.regional_simulation_publications p where p.is_current and p.id<>new.id
      and p.location_id=new.location_id and p.plan_id=new.plan_id and p.harvest_years && new.harvest_years) then
    raise exception 'duplicate key: a current publication of % / % already covers one of the harvest years %', new.location_id, new.plan_id, new.harvest_years using errcode='23505';
  end if;
  return new;
end $$;
create trigger regional_publication_no_overlap before insert or update on public.regional_simulation_publications for each row execute function app_private.publication_no_overlap();

-- A batch only holds publications of its own country, and batched rows start not current (activation flips them).
create function app_private.publication_batch_scope() returns trigger language plpgsql set search_path='' as $$
declare v_scope text;
begin
  if new.batch_id is null then return new; end if;
  select scope into v_scope from public.simulation_publication_batches where id=new.batch_id;
  if split_part(new.location_id, ':', 1) <> v_scope then
    raise exception 'publication % is outside the batch scope %', new.location_id, v_scope using errcode='23514';
  end if;
  return new;
end $$;
create trigger regional_publication_batch_scope before insert or update on public.regional_simulation_publications for each row execute function app_private.publication_batch_scope();

-- Re-staging the same batch key with different content is refused (a new manifest needs a new key).
create function app_private.assert_simulation_batch(p_batch_key text, p_manifest_sha256 text) returns void language plpgsql security definer set search_path='' as $$
begin
  if exists (select 1 from public.simulation_publication_batches where batch_key=p_batch_key and manifest_sha256<>p_manifest_sha256) then
    raise exception 'batch % already exists with a different manifest', p_batch_key using errcode='23514';
  end if;
end $$;

-- Make a fully staged batch the current publication of its country, in one transaction.
create function app_private.activate_simulation_batch(p_batch_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_batch public.simulation_publication_batches; v_prev public.simulation_publication_batches; v_runs integer; v_artifacts integer; v_other integer; v_other_after integer;
begin
  select * into v_batch from public.simulation_publication_batches where batch_key=p_batch_key for update;
  if not found then raise exception 'unknown batch %', p_batch_key using errcode='23514'; end if;
  if v_batch.status <> 'staged' then raise exception 'batch % is not staged (status %)', p_batch_key, v_batch.status using errcode='23514'; end if;
  select count(*) into v_runs from public.regional_simulation_publications where batch_id=v_batch.id;
  select count(*) into v_artifacts from public.simulation_artifacts a join public.regional_simulation_publications p on p.run_id=a.run_id
    where p.batch_id=v_batch.id and a.kind in ('run','series') and a.storage_bucket='simulation-public';
  if v_runs <> v_batch.runs or v_artifacts <> 2*v_batch.runs then
    raise exception 'batch % is incomplete: % of % publications, % of % artifacts', p_batch_key, v_runs, v_batch.runs, v_artifacts, 2*v_batch.runs using errcode='23514';
  end if;
  select count(*) into v_other from public.regional_simulation_publications where is_current and split_part(location_id, ':', 1) <> v_batch.scope;
  select * into v_prev from public.simulation_publication_batches where scope=v_batch.scope and status='active' for update;
  if found then
    update public.regional_simulation_publications set is_current=false where batch_id=v_prev.id and is_current;
    update public.simulation_publication_batches set status='superseded' where id=v_prev.id;
  end if;
  update public.regional_simulation_publications set is_current=true where batch_id=v_batch.id;
  update public.simulation_publication_batches set status='active', activated_at=now(), previous_batch_id=v_prev.id where id=v_batch.id;
  select count(*) into v_other_after from public.regional_simulation_publications where is_current and split_part(location_id, ':', 1) <> v_batch.scope;
  if v_other <> v_other_after then raise exception 'activation changed publications outside scope %', v_batch.scope; end if;
  return jsonb_build_object('batch', v_batch.batch_key, 'scope', v_batch.scope, 'runs', v_runs, 'previous_batch', v_prev.batch_key, 'other_scopes_current', v_other_after);
end $$;

-- Withdraw the active batch of a country and restore the one it superseded, if any. Rows and objects are kept.
create function app_private.rollback_simulation_batch(p_scope text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_batch public.simulation_publication_batches; v_prev public.simulation_publication_batches;
begin
  select * into v_batch from public.simulation_publication_batches where scope=p_scope and status='active' for update;
  if not found then raise exception 'no active batch for scope %', p_scope using errcode='23514'; end if;
  update public.regional_simulation_publications set is_current=false where batch_id=v_batch.id and is_current;
  update public.simulation_publication_batches set status='withdrawn' where id=v_batch.id;
  if v_batch.previous_batch_id is not null then
    select * into v_prev from public.simulation_publication_batches where id=v_batch.previous_batch_id and status='superseded' for update;
    if found then
      update public.regional_simulation_publications set is_current=true where batch_id=v_prev.id;
      update public.simulation_publication_batches set status='active', activated_at=now() where id=v_prev.id;
    end if;
  end if;
  return jsonb_build_object('scope', p_scope, 'withdrawn', v_batch.batch_key, 'restored', v_prev.batch_key);
end $$;

revoke all on function app_private.assert_simulation_batch(text,text), app_private.activate_simulation_batch(text), app_private.rollback_simulation_batch(text) from public, anon, authenticated;
do $$ begin if exists (select from pg_roles where rolname='service_role') then
  grant execute on function app_private.assert_simulation_batch(text,text), app_private.activate_simulation_batch(text), app_private.rollback_simulation_batch(text) to service_role;
end if; end $$;

-- Visibility: batches and their rows appear only while active or superseded (already public once); staged and withdrawn stay hidden.
-- Withdrawing hides catalog rows only: objects already uploaded to the public bucket remain reachable by URL.
alter table public.simulation_publication_batches enable row level security;
revoke all on public.simulation_publication_batches from public, anon, authenticated;
grant select on public.simulation_publication_batches to anon, authenticated;
create policy visible_batches on public.simulation_publication_batches for select to anon, authenticated using (status in ('active','superseded'));

create function public.simulation_batch_visible(p_batch uuid) returns boolean language sql stable security definer set search_path='' as $$
  select p_batch is null or exists (select 1 from public.simulation_publication_batches b where b.id=p_batch and b.status in ('active','superseded'));
$$;
revoke all on function public.simulation_batch_visible(uuid) from public;
grant execute on function public.simulation_batch_visible(uuid) to anon, authenticated;

create or replace function public.simulation_run_visible(p_run uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists (select 1 from public.simulation_runs r where r.id=p_run and (
    (r.kind='regional' and exists (select 1 from public.regional_simulation_publications p where p.run_id=r.id and (select public.simulation_batch_visible(p.batch_id))))
    or (r.kind='private' and r.owner_id=(select auth.uid()) and (select public.is_verified()))));
$$;

drop policy public_publications on public.regional_simulation_publications;
create policy public_publications on public.regional_simulation_publications for select to anon, authenticated using ((select public.simulation_batch_visible(batch_id)));

commit;
