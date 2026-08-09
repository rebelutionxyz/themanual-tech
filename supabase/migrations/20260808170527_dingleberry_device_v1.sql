-- dingleberry_device_v1 — user-facing device-security rail (DingleBERRY · Security)
-- Tables + RLS + working RPCs. Agent reporting arrives later via dingleberry_scan_report.

create table public.dingleberry_devices (
  id             uuid primary key default gen_random_uuid(),
  bee_id         uuid not null references public.bees(id),
  label          text not null default 'This browser',
  platform       text,
  agent_version  text,
  enrolled_at    timestamptz not null default now(),
  last_seen_at   timestamptz not null default now(),
  unique (bee_id, label)
);
comment on table public.dingleberry_devices is
  'Enrolled devices per Bee. agent_version NULL = web-only; local surfaces only.';

create table public.dingleberry_scans (
  id             uuid primary key default gen_random_uuid(),
  device_id      uuid not null references public.dingleberry_devices(id),
  bee_id         uuid not null references public.bees(id),
  mode           text not null check (mode in ('quick','deep','custom')),
  surfaces       text[] not null,
  status         text not null default 'queued'
                   check (status in ('queued','running','complete','stopped','failed')),
  items_scanned  bigint not null default 0,
  started_at     timestamptz not null default now(),
  finished_at    timestamptz
);
create index dingleberry_scans_bee_idx on public.dingleberry_scans (bee_id, started_at desc);

create table public.dingleberry_findings (
  id             uuid primary key default gen_random_uuid(),
  scan_id        uuid not null references public.dingleberry_scans(id),
  device_id      uuid not null references public.dingleberry_devices(id),
  bee_id         uuid not null references public.bees(id),
  surface        text not null check (surface in
                   ('malware','spyware','pups','network','privacy','system')),
  severity       text not null check (severity in ('critical','high','medium','low')),
  title          text not null,
  detail         text not null,
  item_ref       text,
  status         text not null default 'detected'
                   check (status in ('detected','quarantined','removed','allowed','restored')),
  detected_at    timestamptz not null default now(),
  acted_at       timestamptz
);
create index dingleberry_findings_scan_idx on public.dingleberry_findings (scan_id);
create index dingleberry_findings_bee_idx  on public.dingleberry_findings (bee_id, status);

create table public.dingleberry_events (
  id           bigint generated always as identity primary key,
  bee_id       uuid,
  device_id    uuid,
  scan_id      uuid,
  finding_id   uuid,
  kind         text not null,
  payload      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index dingleberry_events_created_idx on public.dingleberry_events (created_at desc);

alter table public.dingleberry_devices  enable row level security;
alter table public.dingleberry_scans    enable row level security;
alter table public.dingleberry_findings enable row level security;
alter table public.dingleberry_events   enable row level security;

create policy dingleberry_devices_read  on public.dingleberry_devices
  for select using (bee_id = auth.uid());
create policy dingleberry_scans_read    on public.dingleberry_scans
  for select using (bee_id = auth.uid());
create policy dingleberry_findings_read on public.dingleberry_findings
  for select using (bee_id = auth.uid());
-- dingleberry_events: no client policies by design (service/admin reads only).

create or replace function public.dingleberry_scan_start(
  p_mode text, p_surfaces text[], p_device_label text default 'This browser'
) returns uuid
language plpgsql security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_bee uuid := auth.uid();
  v_device uuid;
  v_scan uuid;
begin
  if v_bee is null then
    raise exception 'forbidden: sign in required';
  end if;
  if p_mode not in ('quick','deep','custom') then
    raise exception 'invalid mode %', p_mode;
  end if;
  if p_surfaces is null or array_length(p_surfaces, 1) is null
     or exists (select 1 from unnest(p_surfaces) s
                where s not in ('malware','spyware','pups','network','privacy','system')) then
    raise exception 'invalid surfaces';
  end if;

  insert into public.dingleberry_devices as d (bee_id, label, last_seen_at)
  values (v_bee, coalesce(nullif(trim(p_device_label), ''), 'This browser'), now())
  on conflict (bee_id, label) do update set last_seen_at = now()
  returning d.id into v_device;

  insert into public.dingleberry_scans (device_id, bee_id, mode, surfaces, status)
  values (v_device, v_bee, p_mode, p_surfaces, 'queued')
  returning id into v_scan;

  insert into public.dingleberry_events (bee_id, device_id, scan_id, kind, payload)
  values (v_bee, v_device, v_scan, 'scan_start',
          jsonb_build_object('mode', p_mode, 'surfaces', to_jsonb(p_surfaces)));

  return v_scan;
end;
$function$;

create or replace function public.dingleberry_scan_report(
  p_scan_id uuid, p_items bigint, p_findings jsonb, p_status text default 'complete'
) returns void
language plpgsql security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_scan public.dingleberry_scans%rowtype;
  r jsonb;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'forbidden: agent rail only';
  end if;
  select * into v_scan from public.dingleberry_scans where id = p_scan_id;
  if not found then
    raise exception 'unknown scan %', p_scan_id;
  end if;
  if p_status not in ('running','complete','stopped','failed') then
    raise exception 'invalid status %', p_status;
  end if;

  for r in select * from jsonb_array_elements(coalesce(p_findings, '[]'::jsonb)) loop
    insert into public.dingleberry_findings
      (scan_id, device_id, bee_id, surface, severity, title, detail, item_ref)
    values
      (v_scan.id, v_scan.device_id, v_scan.bee_id,
       r->>'surface', r->>'severity',
       coalesce(r->>'title', 'Unnamed finding'),
       coalesce(r->>'detail', ''),
       r->>'item_ref');
  end loop;

  update public.dingleberry_scans
     set items_scanned = greatest(items_scanned, coalesce(p_items, 0)),
         status = p_status,
         finished_at = case when p_status in ('complete','stopped','failed') then now() end
   where id = v_scan.id;

  insert into public.dingleberry_events (bee_id, device_id, scan_id, kind, payload)
  values (v_scan.bee_id, v_scan.device_id, v_scan.id, 'scan_report',
          jsonb_build_object('items', p_items, 'status', p_status,
                             'findings', jsonb_array_length(coalesce(p_findings, '[]'::jsonb))));
end;
$function$;

create or replace function public.dingleberry_finding_act(
  p_finding_id uuid, p_action text
) returns void
language plpgsql security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_bee uuid := auth.uid();
  v_f public.dingleberry_findings%rowtype;
  v_new text;
begin
  if v_bee is null then
    raise exception 'forbidden: sign in required';
  end if;
  select * into v_f from public.dingleberry_findings where id = p_finding_id;
  if not found or v_f.bee_id is distinct from v_bee then
    raise exception 'forbidden: not your finding';
  end if;
  v_new := case p_action
    when 'quarantine' then 'quarantined'
    when 'remove'     then 'removed'
    when 'allow'      then 'allowed'
    when 'restore'    then 'detected'
    when 'purge'      then 'removed'
    else null end;
  if v_new is null then
    raise exception 'invalid action %', p_action;
  end if;

  update public.dingleberry_findings
     set status = v_new, acted_at = now()
   where id = v_f.id;

  insert into public.dingleberry_events (bee_id, device_id, scan_id, finding_id, kind, payload)
  values (v_bee, v_f.device_id, v_f.scan_id, v_f.id, 'finding_act',
          jsonb_build_object('action', p_action, 'new_status', v_new));
end;
$function$;

revoke all on function public.dingleberry_scan_start(text, text[], text) from public, anon;
revoke all on function public.dingleberry_scan_report(uuid, bigint, jsonb, text) from public, anon, authenticated;
revoke all on function public.dingleberry_finding_act(uuid, text) from public, anon;
grant execute on function public.dingleberry_scan_start(text, text[], text) to authenticated;
grant execute on function public.dingleberry_finding_act(uuid, text) to authenticated;
grant execute on function public.dingleberry_scan_report(uuid, bigint, jsonb, text) to service_role;