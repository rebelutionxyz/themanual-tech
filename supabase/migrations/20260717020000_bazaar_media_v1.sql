-- ═══════════════════════════════════════════════════════════════════════
-- bazaar_media_v1 — listing photo uploads (astras sweep: BAZAAR)
--
-- Proposed 2026-07-17. Simplest media policy of the set: path is keyed on
-- the UPLOADER (bazaar/{bee_id}/…) rather than an entity id, because photos
-- upload BEFORE the listing exists; the listing then stores the URLs in
-- image_urls. Direct auth.uid() prefix match — no table lookup, no regex
-- cast, and (learned from pulse v1a) no unqualified-name binding risk.
-- Replace/delete already covered by the bucket-wide uploader rules from
-- group_media_storage_v1.
-- ═══════════════════════════════════════════════════════════════════════

drop policy if exists bazaar_media_insert on storage.objects;
create policy bazaar_media_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'group-media'
    and (storage.foldername(objects.name))[1] = 'bazaar'
    and (storage.foldername(objects.name))[2] = auth.uid()::text
  );
