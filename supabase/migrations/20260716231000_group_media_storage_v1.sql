-- ═══════════════════════════════════════════════════════════════════════
-- group_media_storage_v1 — group-media bucket + first storage RLS policies
--
-- Proposed 2026-07-16 (astras sweep: UNITE completion pass). First client
-- upload surface on the platform. Own bucket (NOT themanual-canonical) so
-- size/mime limits can't affect anything else:
--   • public bucket, 10 MB cap, images only (jpeg/png/webp/gif)
--   • path convention (enforced by policy regex before any uuid cast):
--       groups/{group_id}/profile/…  → owner/moderator only (avatar, cover)
--       groups/{group_id}/album/…    → any group member (Images tab)
--   • delete/replace: the uploader, or the group's owner/moderators
--
-- uuid extraction uses substring() with an exact-shape regex: returns NULL
-- (→ policy false) on any non-conforming path instead of a cast error.
-- ═══════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'group-media', 'group-media', true, 10485760,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do nothing;

-- Read: bucket is public (CDN URLs work regardless); this SELECT policy is
-- what lets the app LIST album objects via the storage API.
drop policy if exists group_media_read on storage.objects;
create policy group_media_read on storage.objects
  for select using (bucket_id = 'group-media');

-- Upload: members → album/, owner+mods → profile/.
drop policy if exists group_media_insert on storage.objects;
create policy group_media_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'group-media'
    and (
      exists (
        select 1 from public.group_memberships m
        where m.bee_id = auth.uid()
          and m.group_id = (substring(name from
            '^groups/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/album/.'))::uuid
      )
      or exists (
        select 1 from public.group_memberships m
        where m.bee_id = auth.uid()
          and m.role in ('owner','moderator')
          and m.group_id = (substring(name from
            '^groups/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/profile/.'))::uuid
      )
    )
  );

-- Delete: the uploader, or the group's owner/moderators (both path kinds).
drop policy if exists group_media_delete on storage.objects;
create policy group_media_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'group-media'
    and (
      owner_id = auth.uid()::text
      or exists (
        select 1 from public.group_memberships m
        where m.bee_id = auth.uid()
          and m.role in ('owner','moderator')
          and m.group_id = (substring(name from
            '^groups/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/'))::uuid
      )
    )
  );

-- Replace-in-place (upsert avatar/cover): uploader only.
drop policy if exists group_media_update on storage.objects;
create policy group_media_update on storage.objects
  for update to authenticated
  using (bucket_id = 'group-media' and owner_id = auth.uid()::text)
  with check (bucket_id = 'group-media');
