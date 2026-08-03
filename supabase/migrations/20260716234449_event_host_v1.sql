-- ═══════════════════════════════════════════════════════════════════════
-- event_host_v1 — host controls for RULE (astras sweep, 2026-07-16)
--
--   • events.status: 'scheduled' | 'cancelled'  (cancel is reversible)
--   • events.cover_url: event cover image (WoWonder-style profile header)
--   • event_update / event_cancel: host-only SECDEF RPCs (there is no
--     UPDATE RLS on events — mutation goes through RPCs, matching
--     event_create's conventions: auth guard, validation raises, jsonb out)
--   • storage: events/{event_id}/profile/… covers ride the group-media
--     bucket. Only an INSERT policy is needed — the existing
--     group_media_update/delete owner_id branches are bucket-wide, so the
--     uploader (the host) can already replace/remove their own objects.
--
-- Known debt (client-gated for now): event_rsvp does not itself refuse
-- RSVPs on a cancelled event; the UI hides the buttons. Server-side guard
-- means editing the live event_rsvp body — its own decision gate later.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.events add column if not exists status text not null default 'scheduled'
  check (status in ('scheduled','cancelled'));
alter table public.events add column if not exists cover_url text;

comment on column public.events.status is
  'scheduled | cancelled — event_cancel RPC toggles. event_host_v1 2026-07-16.';
comment on column public.events.cover_url is
  'Event cover image URL (group-media bucket, events/{id}/profile/…). event_host_v1 2026-07-16.';

-- ── event_update: host edits the event in place ──
create or replace function public.event_update(
  p_event_id uuid,
  p_title text,
  p_starts_at timestamptz,
  p_description text default null,
  p_ends_at timestamptz default null,
  p_location_text text default null,
  p_is_virtual boolean default false,
  p_virtual_link text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_cover_url text default null   -- null = leave cover unchanged
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_bee uuid := auth.uid(); v_host uuid;
begin
  if v_bee is null then raise exception 'auth required' using errcode='28000'; end if;
  select created_by into v_host from public.events where id = p_event_id;
  if v_host is null then raise exception 'event not found'; end if;
  if v_host <> v_bee then raise exception 'not the host'; end if;
  if char_length(coalesce(p_title,'')) < 2 then raise exception 'title required (>=2 chars)'; end if;
  if p_starts_at is null then raise exception 'starts_at required'; end if;
  if p_ends_at is not null and p_ends_at < p_starts_at then raise exception 'ends_at is before starts_at'; end if;

  update public.events set
    title = p_title,
    description = p_description,
    starts_at = p_starts_at,
    ends_at = p_ends_at,
    location_text = p_location_text,
    location_coords = case when p_lat is not null and p_lng is not null
                           then point(p_lng, p_lat) else null end,
    is_virtual = coalesce(p_is_virtual, false),
    virtual_link = p_virtual_link,
    cover_url = coalesce(p_cover_url, cover_url),
    updated_at = now()
  where id = p_event_id;

  return jsonb_build_object('id', p_event_id);
end; $$;

-- ── event_cancel: host cancels (or restores) the event ──
create or replace function public.event_cancel(
  p_event_id uuid,
  p_cancelled boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_bee uuid := auth.uid(); v_host uuid; v_status text;
begin
  if v_bee is null then raise exception 'auth required' using errcode='28000'; end if;
  select created_by into v_host from public.events where id = p_event_id;
  if v_host is null then raise exception 'event not found'; end if;
  if v_host <> v_bee then raise exception 'not the host'; end if;

  v_status := case when coalesce(p_cancelled, true) then 'cancelled' else 'scheduled' end;
  update public.events set status = v_status, updated_at = now() where id = p_event_id;

  return jsonb_build_object('id', p_event_id, 'status', v_status);
end; $$;

-- ── storage: event covers (host-only upload; replace/delete already
--    covered by the bucket-wide owner_id branches of group_media_*) ──
drop policy if exists event_media_insert on storage.objects;
create policy event_media_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'group-media'
    and exists (
      select 1 from public.events e
      where e.created_by = auth.uid()
        and e.id = (substring(name from
          '^events/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/profile/.'))::uuid
    )
  );
