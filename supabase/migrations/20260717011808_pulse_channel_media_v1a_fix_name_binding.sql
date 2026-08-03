-- ═══════════════════════════════════════════════════════════════════════
-- pulse_channel_media_v1a — fix column binding in the v1 policy
--
-- v1's EXISTS subquery used unqualified `name`, which bound to
-- pulse_channels.name (the channel's display name) instead of
-- storage.objects.name (the object path) — pulse_channels is the only
-- media-policy lookup table with a `name` column, so only this policy
-- was affected (verified: groups/events/campaigns policies bind right).
-- Same ratified behavior, now actually enforced on the object path.
-- ═══════════════════════════════════════════════════════════════════════

drop policy if exists pulse_channel_media_insert on storage.objects;
create policy pulse_channel_media_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'group-media'
    and exists (
      select 1 from public.pulse_channels ch
      where ch.owner_bee = auth.uid()
        and ch.id = (substring(objects.name from
          '^channels/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/profile/.'))::uuid
    )
  );
