-- PROPOSAL — NOT A MIGRATION. This file is deliberately outside supabase/migrations so that no tool applies it.
-- It describes the tables, policies and functions "Minha área" needs on the server (properties, plots with an
-- outline, stake ownership, installations and command intents) in the style of 202611140001_personal.sql:
-- every row is owned by auth.uid(), and a confirmed e-mail is required even for direct PostgREST access.
-- It has only ever been run against the isolated local container used by supabase/tests/sensors.proposal.test.mjs.
-- Before promoting it to a migration: review names with the API owners, add the Node routes and contracts, and
-- decide the items listed under "NOT COVERED" at the end.
begin;

-- Shape of a plot outline: GeoJSON Polygon, one ring, closed, at least 4 positions, WGS84 ranges.
-- Self-intersection and zero area are NOT checked here: the API must run the same validation as
-- apps/web/src/teammate/area/geometry.ts before writing (the database has no PostGIS in this project).
create function public.plot_outline_shape_ok(g jsonb) returns boolean language sql immutable set search_path='' as $$
  select g is null or (
    jsonb_typeof(g)='object' and g->>'type'='Polygon'
    and jsonb_typeof(g->'coordinates')='array' and jsonb_array_length(g->'coordinates')=1
    and jsonb_typeof(g->'coordinates'->0)='array' and jsonb_array_length(g->'coordinates'->0)>=4
    and g->'coordinates'->0->0 = g->'coordinates'->0->-1
    and not exists (
      select 1 from jsonb_array_elements(g->'coordinates'->0) p
      where jsonb_typeof(p)<>'array' or jsonb_array_length(p)<>2
         or jsonb_typeof(p->0)<>'number' or jsonb_typeof(p->1)<>'number'
         or (p->>0)::numeric not between -180 and 180 or (p->>1)::numeric not between -90 and 90
    )
  )
$$;

create table public.farm_properties (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check(char_length(name) between 1 and 100),
  municipality_code text check(char_length(municipality_code)<=16), municipality_name text check(char_length(municipality_name)<=120),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,id)
);
create table public.farm_plots (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null, name text not null check(char_length(name) between 1 and 80),
  outline jsonb check(public.plot_outline_shape_ok(outline)),
  -- Calculated by the API from the outline; the declared area is what the user typed and is kept apart.
  area_calc_ha numeric check(area_calc_ha is null or area_calc_ha>0), area_declared_ha numeric check(area_declared_ha is null or area_declared_ha>0),
  soil text check(char_length(soil)<=40), irrigation text check(char_length(irrigation)<=40),
  revision integer not null default 1 check(revision>=1), archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,id),
  foreign key(user_id,property_id) references public.farm_properties(user_id,id) on delete restrict
);
create index farm_plots_user_property on public.farm_plots(user_id,property_id);

-- Factory registry: which stakes exist and the hash of each ownership code. Never readable by app users.
create table app_private.device_registry (
  device_id text primary key check(device_id ~ '^[0-9a-f]{8}$'),
  claim_code_hash text not null,
  created_at timestamptz not null default now()
);
revoke all on app_private.device_registry from public,anon,authenticated;
create table app_private.claim_attempts (
  user_id uuid not null, attempted_at timestamptz not null default now()
);
create index claim_attempts_user_time on app_private.claim_attempts(user_id,attempted_at);
revoke all on app_private.claim_attempts from public,anon,authenticated;

-- One row per stake: the primary key makes a second owner impossible. Rows are created only by claim_device().
create table public.devices (
  device_id text primary key references app_private.device_registry(device_id),
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null default '' check(char_length(nickname)<=60),
  claimed_at timestamptz not null default now(),
  unique(user_id,device_id)
);
create table public.device_installations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null, plot_id uuid,
  longitude double precision not null check(longitude between -180 and 180), latitude double precision not null check(latitude between -90 and 90),
  position_source text not null check(position_source in ('phone_gps','manual')),
  accuracy_m real check(accuracy_m is null or accuracy_m>=0), position_at timestamptz not null,
  started_at timestamptz not null default now(), ended_at timestamptz check(ended_at is null or ended_at>=started_at),
  foreign key(user_id,device_id) references public.devices(user_id,device_id) on delete cascade,
  foreign key(user_id,plot_id) references public.farm_plots(user_id,id) on delete restrict
);
-- One active installation per stake.
create unique index device_installations_one_active on public.device_installations(device_id) where ended_at is null;
create index device_installations_device_time on public.device_installations(device_id,started_at);

-- Command intents: the complete desired state per revision. There is no "confirmed"/"applied" state because the
-- stake's uplink does not echo the interval, the LED or a command version.
create table public.device_commands (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null, revision integer not null check(revision>=1),
  led smallint check(led is null or led between 0 and 3),
  interval_min smallint not null default 30 check(interval_min between 1 and 255),
  state text not null default 'saved' check(state in ('saved','published','awaiting_device','failed','superseded')),
  failure text check(char_length(failure)<=200),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(device_id,revision),
  foreign key(user_id,device_id) references public.devices(user_id,device_id) on delete cascade
);

do $$ declare t text; begin
  foreach t in array array['farm_properties','farm_plots','devices','device_installations','device_commands'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('create policy own_rows on public.%I for all to authenticated using ((select auth.uid())=user_id and (select public.is_verified())) with check ((select auth.uid())=user_id and (select public.is_verified()))',t);
  end loop;
end $$;
grant select,insert,update,delete on public.farm_properties, public.farm_plots to authenticated;
-- Stakes: the owner may read and rename; linking goes through claim_device(), and nothing deletes history.
grant select on public.devices to authenticated;
grant update(nickname) on public.devices to authenticated;
grant select on public.device_installations, public.device_commands to authenticated;

-- A plot with a stake installed cannot be archived: move the stake or end the installation first.
create function public.farm_plots_guard_archive() returns trigger language plpgsql set search_path='' as $$
begin
  if new.archived_at is not null and old.archived_at is null
     and exists(select 1 from public.device_installations i where i.plot_id=new.id and i.ended_at is null) then
    raise exception 'plot has active installations' using errcode='23514';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger farm_plots_guard_archive before update on public.farm_plots for each row execute function public.farm_plots_guard_archive();

-- Claim: atomic and idempotent. Every refusal (unknown stake, wrong code, stake of another account, too many
-- attempts) RETURNS the same 'rejected', so nothing about other accounts or valid identifiers can be learned.
-- It returns instead of raising so that the attempt it records is committed and the hourly limit really counts.
create function public.claim_device(p_device_id text, p_claim_code text) returns text
language plpgsql security definer set search_path='' as $$
declare v_user uuid := (select auth.uid()); v_hash text; v_owner uuid; v_recent integer;
begin
  if v_user is null or not (select public.is_verified()) then raise exception 'not allowed' using errcode='42501'; end if;
  -- The registry row is locked first: concurrent claims of one stake are decided one after the other.
  select r.claim_code_hash into v_hash from app_private.device_registry r where r.device_id=p_device_id for update;
  select d.user_id into v_owner from public.devices d where d.device_id=p_device_id;
  if v_owner=v_user then return 'already_yours'; end if;
  select count(*) into v_recent from app_private.claim_attempts a where a.user_id=v_user and a.attempted_at>now()-interval '1 hour';
  if v_recent>=10 then return 'rejected'; end if;
  if v_hash is null or v_owner is not null or p_claim_code is null or v_hash <> extensions.crypt(p_claim_code, v_hash) then
    insert into app_private.claim_attempts(user_id) values (v_user);
    return 'rejected';
  end if;
  insert into public.devices(device_id,user_id) values (p_device_id,v_user);
  return 'claimed';
end $$;
revoke all on function public.claim_device(text,text) from public,anon;
grant execute on function public.claim_device(text,text) to authenticated;

-- New installation: closes the active one at the same instant and opens the next. History is never rewritten.
create function public.install_device(p_device_id text, p_plot_id uuid, p_longitude double precision, p_latitude double precision,
  p_position_source text, p_accuracy_m real, p_position_at timestamptz) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_user uuid := (select auth.uid()); v_now timestamptz := clock_timestamp(); v_id uuid;
begin
  if v_user is null or not (select public.is_verified()) then raise exception 'not allowed' using errcode='42501'; end if;
  perform 1 from public.devices d where d.device_id=p_device_id and d.user_id=v_user for update;
  if not found then raise exception 'not allowed' using errcode='42501'; end if;
  if p_plot_id is not null and not exists(select 1 from public.farm_plots p where p.id=p_plot_id and p.user_id=v_user and p.archived_at is null) then
    raise exception 'not allowed' using errcode='42501';
  end if;
  update public.device_installations set ended_at=v_now where device_id=p_device_id and ended_at is null;
  insert into public.device_installations(user_id,device_id,plot_id,longitude,latitude,position_source,accuracy_m,position_at,started_at)
    values (v_user,p_device_id,p_plot_id,p_longitude,p_latitude,p_position_source,p_accuracy_m,p_position_at,v_now) returning id into v_id;
  return v_id;
end $$;
create function public.end_installation(p_device_id text) returns void
language plpgsql security definer set search_path='' as $$
declare v_user uuid := (select auth.uid());
begin
  if v_user is null or not (select public.is_verified()) then raise exception 'not allowed' using errcode='42501'; end if;
  update public.device_installations set ended_at=clock_timestamp() where device_id=p_device_id and user_id=v_user and ended_at is null;
end $$;

-- Command intent: merges the change into the previous desired state (a partial retained message could drop the
-- other field), supersedes the previous intent and stores the new one as 'saved'. Publishing to the broker and
-- the 'published'/'awaiting_device'/'failed' transitions belong to the backend worker (service role), not to users.
create function public.request_device_config(p_device_id text, p_led smallint, p_set_led boolean, p_interval_min smallint) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_user uuid := (select auth.uid()); v_prev public.device_commands; v_id uuid;
begin
  if v_user is null or not (select public.is_verified()) then raise exception 'not allowed' using errcode='42501'; end if;
  perform 1 from public.devices d where d.device_id=p_device_id and d.user_id=v_user for update;
  if not found then raise exception 'not allowed' using errcode='42501'; end if;
  select * into v_prev from public.device_commands c where c.device_id=p_device_id order by c.revision desc limit 1;
  update public.device_commands set state='superseded', updated_at=now() where device_id=p_device_id and state in ('saved','published','awaiting_device');
  insert into public.device_commands(user_id,device_id,revision,led,interval_min)
    values (v_user,p_device_id,coalesce(v_prev.revision,0)+1,
            case when p_set_led then p_led else v_prev.led end,
            coalesce(p_interval_min,v_prev.interval_min,30::smallint)) returning id into v_id;
  return v_id;
end $$;
do $$ declare f text; begin
  foreach f in array array['install_device(text,uuid,double precision,double precision,text,real,timestamptz)','end_installation(text)','request_device_config(text,smallint,boolean,smallint)'] loop
    execute format('revoke all on function public.%s from public,anon',f);
    execute format('grant execute on function public.%s to authenticated',f);
  end loop;
end $$;

commit;

-- NOT COVERED (each needs a decision before this becomes a migration):
--   * Measurements. The identity of a measurement is unresolved: device_id-seq-depth collides after a reset or a
--     uint16 wrap, and observed_at is reconstructed (specification §8.5). No table is proposed until that is settled.
--   * Gateways and their status, and which accounts may see a community gateway.
--   * Calibration per probe/depth and validated soil profiles (needed before any m3/m3 value exists).
--   * Audit trail for cadastral corrections of an installation point.
--   * The worker that publishes the retained MQTT message, and a broker with authentication and TLS: the current
--     demonstration broker is public and the LoRa link is unauthenticated (firmware.md §13).
--   * Loading app_private.device_registry at manufacturing (ownership code hashes).
