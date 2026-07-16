-- ═══════════════════════════════════════════════════════════════════════
-- ui_branding_v1 — HQ-editable platform branding on the ui_theme_config
-- singleton. One jsonb blob (wordmark segments, accent hex, logo/favicon
-- URLs) read by every client (existing public-read policy) and written only
-- by the platform admin (is_platform_admin() — bees.is_admin, currently OG
-- HUMAN only). Frontend: src/lib/branding.ts + HQ → Branding section.
-- Proposed 2026-07-16 (Intel menu completion session).
-- ═══════════════════════════════════════════════════════════════════════

alter table public.ui_theme_config
  add column if not exists branding jsonb not null default '{}'::jsonb;

comment on column public.ui_theme_config.branding is
  'HQ-editable brand config: {wordmarkPre, wordmarkAccent, wordmarkPost, accentHex, logoUrl, faviconUrl}. Baked defaults in src/lib/branding.ts win for any missing key. ui_branding_v1 2026-07-16.';

-- Admin-only write. SELECT stays on the existing public-read policy.
drop policy if exists ui_theme_config_admin_update on public.ui_theme_config;
create policy ui_theme_config_admin_update on public.ui_theme_config
  for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
