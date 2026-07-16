-- ═══════════════════════════════════════════════════════════════════════
-- groups_profile_v1 — group avatar + cover columns (UNITE profile build)
--
-- Proposed 2026-07-16 (astras sweep: UNITE completion pass). URLs point at
-- the group-media bucket (see group_media_storage_v1) or any https image.
-- No RLS change needed: groups_public_read covers display, and the existing
-- groups_update_owner policy (auth.uid() = created_by) already lets the
-- owner set these columns directly.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.groups add column if not exists avatar_url text;
alter table public.groups add column if not exists cover_url text;

comment on column public.groups.avatar_url is
  'Group avatar image URL (usually group-media bucket, groups/{id}/profile/…). groups_profile_v1 2026-07-16.';
comment on column public.groups.cover_url is
  'Group cover/header image URL (usually group-media bucket, groups/{id}/profile/…). groups_profile_v1 2026-07-16.';
