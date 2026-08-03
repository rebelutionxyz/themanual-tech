-- ═══════════════════════════════════════════════════════════════════════
-- give_campaign_profile_v1 — campaign cover imagery (astras sweep: GIVE)
--
-- Proposed 2026-07-17. Mirrors groups_profile_v1 / event_host_v1:
--   • give_campaigns.cover_url
--   • give_campaign_set_cover RPC — creator-only (give_campaigns mutations
--     are RPC-only by design; no UPDATE RLS exists, matching cancel/set_funding)
--   • storage: campaigns/{campaign_id}/profile/… covers in the group-media
--     bucket, creator-only INSERT (replace/delete covered by the bucket-wide
--     uploader rules from group_media_storage_v1)
-- ═══════════════════════════════════════════════════════════════════════

alter table public.give_campaigns add column if not exists cover_url text;

comment on column public.give_campaigns.cover_url is
  'Campaign cover image URL (group-media bucket, campaigns/{id}/profile/…). give_campaign_profile_v1 2026-07-17.';

create or replace function public.give_campaign_set_cover(
  p_campaign_id uuid,
  p_cover_url text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_c record;
begin
  if auth.uid() is null then raise exception 'auth required' using errcode='28000'; end if;
  select id, created_by into v_c from public.give_campaigns where id = p_campaign_id;
  if v_c.id is null then raise exception 'campaign not found'; end if;
  if v_c.created_by <> auth.uid() then raise exception 'not your campaign'; end if;

  update public.give_campaigns set cover_url = p_cover_url where id = p_campaign_id;
  return jsonb_build_object('id', p_campaign_id);
end; $$;

drop policy if exists campaign_media_insert on storage.objects;
create policy campaign_media_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'group-media'
    and exists (
      select 1 from public.give_campaigns c
      where c.created_by = auth.uid()
        and c.id = (substring(name from
          '^campaigns/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/profile/.'))::uuid
    )
  );
