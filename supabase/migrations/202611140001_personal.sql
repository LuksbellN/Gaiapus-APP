begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists app_private;
revoke all on schema app_private from public,anon,authenticated;
create table app_private.signing_config (
  singleton boolean primary key default true check(singleton),
  secret text not null check(char_length(secret)>=32)
);
revoke all on app_private.signing_config from public,anon,authenticated;

create table public.published_areas (
  area_id text primary key,
  kind text not null check (kind in ('country','state','municipality','published_field')),
  unique(area_id,kind)
);
insert into public.published_areas(area_id,kind) values
('BR','country'),('BR-MT','state'),('BR-MG','state'),('BR-GO','state'),('BR-BA','state'),
('5107925','municipality'),('3170206','municipality'),('5218805','municipality'),('2903201','municipality'),
('published-field-uberlandia','published_field'),('published-field-rio-verde','published_field'),('published-field-barreiras','published_field');
revoke all on public.published_areas from public, anon, authenticated;
grant select on public.published_areas to authenticated;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name)<=100),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.monitored_places (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  area_id text not null, kind text not null, label text not null check(char_length(label) between 1 and 100),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(area_id,kind) references public.published_areas(area_id,kind),
  unique(user_id,area_id), unique(user_id,id)
);
create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  locale text not null default 'pt-BR' check(locale in ('pt-BR','en')),
  last_monitored_place_id uuid,
  foreign key(user_id,last_monitored_place_id) references public.monitored_places(user_id,id) on delete set null(last_monitored_place_id)
);
create table public.comparison_snapshots (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  monitored_place_id uuid, title text not null check(char_length(title) between 1 and 256), notes text not null default '' check(char_length(notes)<=10000),
  area_id text not null references public.published_areas(area_id),
  product_id text not null check(product_id in ('yield_estimate','water_risk_projection','strategy_comparison')),
  result_basis text not null check(result_basis in ('retrospective_estimate','forecast_projection','hypothetical_scenario','mixed')),
  input_snapshot jsonb not null check(jsonb_typeof(input_snapshot)='object'),
  output_envelope jsonb not null check(jsonb_typeof(output_envelope)='object' and not (output_envelope->'meta' ? 'save_handle')),
  source_versions jsonb not null check(jsonb_typeof(source_versions)='object'),
  idempotency_key text not null check(char_length(idempotency_key) between 1 and 128),
  request_fingerprint text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,idempotency_key),
  foreign key(user_id,monitored_place_id) references public.monitored_places(user_id,id) on delete set null(monitored_place_id)
);
create index comparison_snapshots_user_created on public.comparison_snapshots(user_id,created_at desc,id);
create index monitored_places_user_created on public.monitored_places(user_id,created_at,id);
create table public.evidence_views (
  user_id uuid not null references auth.users(id) on delete cascade,
  context_key text not null check(char_length(context_key) between 1 and 4096),
  publication_version text not null check(char_length(publication_version) between 1 and 256),
  reviewed_at timestamptz not null default now(), primary key(user_id,context_key)
);

-- Direct PostgREST access also requires a confirmed email, not just Node routes.
create function public.is_verified() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from auth.users where id=(select auth.uid()) and email_confirmed_at is not null)
$$;
revoke all on function public.is_verified() from public,anon;
grant execute on function public.is_verified() to authenticated;

do $$ declare t text; begin
  foreach t in array array['profiles','user_preferences','monitored_places','comparison_snapshots','evidence_views'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('create policy own_rows on public.%I for all to authenticated using ((select auth.uid())=user_id and (select public.is_verified())) with check ((select auth.uid())=user_id and (select public.is_verified()))',t);
  end loop;
end $$;
grant select,insert on public.profiles,public.user_preferences to authenticated;
grant update(display_name) on public.profiles to authenticated;
grant update(locale,last_monitored_place_id) on public.user_preferences to authenticated;
grant select,insert,delete on public.monitored_places to authenticated;
grant update(label) on public.monitored_places to authenticated;
grant select,delete on public.comparison_snapshots to authenticated;
grant update(title,notes) on public.comparison_snapshots to authenticated;
grant select,delete on public.evidence_views to authenticated;

create function public.touch_updated() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated();
create trigger monitored_places_touch before update on public.monitored_places for each row execute function public.touch_updated();
create function public.protect_snapshot() returns trigger language plpgsql set search_path='' as $$
begin
  if row(new.id,new.user_id,new.area_id,new.product_id,new.result_basis,new.input_snapshot,new.output_envelope,new.source_versions,new.idempotency_key,new.request_fingerprint,new.created_at)
    is distinct from row(old.id,old.user_id,old.area_id,old.product_id,old.result_basis,old.input_snapshot,old.output_envelope,old.source_versions,old.idempotency_key,old.request_fingerprint,old.created_at) then
    raise exception 'scientific snapshot is immutable' using errcode='42501';
  end if;
  new.updated_at=now(); return new;
end $$;
create trigger comparison_snapshot_immutable before update on public.comparison_snapshots for each row execute function public.protect_snapshot();
create function public.timestamp_review() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='UPDATE' and new.publication_version=old.publication_version then new.reviewed_at=old.reviewed_at;
  else new.reviewed_at=now(); end if;
  return new;
end $$;
create trigger evidence_review_timestamp before insert or update on public.evidence_views for each row execute function public.timestamp_review();

create function public.initialize_account() returns void language plpgsql security invoker set search_path='' as $$
begin
  insert into public.profiles(user_id) values(auth.uid()) on conflict(user_id) do nothing;
  insert into public.user_preferences(user_id) values(auth.uid()) on conflict(user_id) do nothing;
end $$;
create function public.update_account(p_patch jsonb) returns void language plpgsql security invoker set search_path='' as $$
begin
  if p_patch ? 'display_name' then update public.profiles set display_name=p_patch->>'display_name' where user_id=auth.uid(); end if;
  update public.user_preferences set locale=coalesce(p_patch->>'locale',locale),
    last_monitored_place_id=case when p_patch ? 'last_monitored_place_id' then (p_patch->>'last_monitored_place_id')::uuid else last_monitored_place_id end where user_id=auth.uid();
end $$;
create function app_private.verified_payload(p_payload text,p_signature text,p_purpose text) returns jsonb language plpgsql security definer set search_path='' as $$
declare secret_value text; payload jsonb;
begin
  if auth.uid() is null or not public.is_verified() then raise exception 'permission denied' using errcode='42501'; end if;
  select secret into secret_value from app_private.signing_config where singleton;
  if secret_value is null then raise exception 'snapshot signing is not configured' using errcode='P0001'; end if;
  if p_signature is null or encode(extensions.hmac(convert_to(p_payload,'UTF8'),convert_to(secret_value,'UTF8'),'sha256'),'hex') is distinct from p_signature then
    raise exception 'permission denied: invalid server attestation' using errcode='42501';
  end if;
  payload=p_payload::jsonb;
  if payload->>'purpose' is distinct from p_purpose or (payload->>'user_id')::uuid is distinct from auth.uid() then
    raise exception 'permission denied: attestation owner mismatch' using errcode='42501';
  end if;
  return payload;
end $$;
revoke all on function app_private.verified_payload(text,text,text) from public,anon,authenticated;

-- This narrowly scoped definer function verifies Node's attestation and derives
-- ownership from auth.uid(); request clients retain their own bearer identity.
create function public.save_comparison(p_payload text,p_signature text)
returns public.comparison_snapshots language plpgsql security definer set search_path='' as $$
declare saved public.comparison_snapshots; payload jsonb; snapshot jsonb;
begin
  payload=app_private.verified_payload(p_payload,p_signature,'snapshot'); snapshot=payload->'snapshot';
  select * into saved from public.comparison_snapshots where user_id=auth.uid() and idempotency_key=payload->>'idempotency_key';
  if saved.id is null then
    insert into public.comparison_snapshots(user_id,monitored_place_id,title,notes,area_id,product_id,result_basis,input_snapshot,output_envelope,source_versions,idempotency_key,request_fingerprint)
    values(auth.uid(),(payload->>'monitored_place_id')::uuid,payload->>'title',payload->>'notes',snapshot->>'area_id',snapshot->>'product_id',snapshot->>'result_basis',snapshot->'input_snapshot',snapshot->'output_envelope',snapshot->'source_versions',payload->>'idempotency_key',payload->>'request_fingerprint')
    on conflict(user_id,idempotency_key) do nothing returning * into saved;
    if saved.id is null then select * into saved from public.comparison_snapshots where user_id=auth.uid() and idempotency_key=payload->>'idempotency_key'; end if;
  end if;
  if saved.request_fingerprint is distinct from payload->>'request_fingerprint' then raise exception 'idempotency conflict' using errcode='P0001'; end if;
  return saved;
end $$;
create function public.record_evidence_review(p_payload text,p_signature text) returns public.evidence_views language plpgsql security definer set search_path='' as $$
declare saved public.evidence_views; payload jsonb;
begin
  payload=app_private.verified_payload(p_payload,p_signature,'evidence_review');
  insert into public.evidence_views(user_id,context_key,publication_version) values(auth.uid(),payload->>'context_key',payload->>'publication_version')
  on conflict(user_id,context_key) do update set publication_version=excluded.publication_version returning * into saved;
  return saved;
end $$;
revoke all on function public.initialize_account(),public.update_account(jsonb),public.save_comparison(text,text),public.record_evidence_review(text,text) from public,anon;
grant execute on function public.initialize_account(),public.update_account(jsonb),public.save_comparison(text,text),public.record_evidence_review(text,text) to authenticated;
commit;
