-- ═══════════════════════════════════════════════════════════════════════
-- pulse_channel_media_v1 — channel avatar/banner uploads (astras sweep: PULSE)
--
-- Proposed 2026-07-17. Same shape as groups/events/campaigns:
--   storage path channels/{channel_id}/profile/… in the group-media bucket,
--   INSERT restricted to the channel's owner_bee. Replace/delete already
--   covered by the bucket-wide uploader rules from group_media_storage_v1.
-- URLs persist onto pulse_channels via the existing pulse_channel_update RPC
-- (p_avatar_url / p_banner_url) — no table or RPC change needed.
-- ═══════════════════════════════════════════════════════════════════════

drop policy if exists pulse_channel_media_insert on storage.objects;
create policy pulse_channel_media_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'group-media'
    and exists (
      select 1 from public.pulse_channels ch
      where ch.owner_bee = auth.uid()
        and ch.id = (substring(name from
          '^channels/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/profile/.'))::uuid
    )
  );
