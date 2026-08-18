-- =============================================================================
-- FORWARD DRAFT — db73 astra_registry reconcile, SYNC shape
-- PROPOSAL ONLY. NOT APPLIED. NOT a migration until the owner picks a shape and
-- a named dispatch authorises it. Lives in _drafts/ deliberately so the
-- reconcile ledger never sees it.
--
-- Rollback: db73_registry_reconcile_sync_rollback.sql (authored first).
--
-- Reconciles the 30-row public.astra_registry against the 41-entry catalog in
-- src/lib/astra-catalog.ts. Every change is an UPDATE or an INSERT. There is no
-- DELETE anywhere in this file: ids are load-bearing for 21 FK constraints, so
-- a merged-away row is ARCHIVED, never removed.
--
-- NOT INCLUDED, deliberately — one open question the owner must answer first:
--   'fund' (DB, active, live surface, renamed GIVE -> FUND by the owner on
--   2026-08-17) vs 'crowdfunding' (catalog). This file does NOT rename 'fund'.
--   Renaming the slug of the one live funding surface to match a catalog entry
--   that predates the owner's own rename is backwards. The catalog should move
--   to 'fund' instead, which is a FRONT change, not a db one.
-- =============================================================================

BEGIN;

-- ── 1. Renames. Id-stable, so all 21 FKs and all 52 referencing rows are
-- untouched by construction. 'atlasnation' carries the one nova_registry
-- reference and survives the rename for exactly this reason.
UPDATE public.astra_registry SET slug = 'advertising' WHERE slug = 'atlasads';
UPDATE public.astra_registry SET slug = 'legalservices' WHERE slug = 'atlasadvocate';
UPDATE public.astra_registry SET slug = 'comms' WHERE slug = 'atlascomms';
UPDATE public.astra_registry SET slug = 'learning' WHERE slug = 'atlasenlightened';
UPDATE public.astra_registry SET slug = 'proservices' WHERE slug = 'atlasindustry';
UPDATE public.astra_registry SET slug = 'forum' WHERE slug = 'atlasintel';
UPDATE public.astra_registry SET slug = 'livevideo' WHERE slug = 'atlaslounge';
UPDATE public.astra_registry SET slug = 'groups' WHERE slug = 'atlasnation';
UPDATE public.astra_registry SET slug = 'realestatetrust' WHERE slug = 'atlasresidential';
UPDATE public.astra_registry SET slug = 'events' WHERE slug = 'atlasunited';
UPDATE public.astra_registry SET slug = 'voting' WHERE slug = 'atlasvote';
UPDATE public.astra_registry SET slug = 'aitours' WHERE slug = 'freedomrings';
UPDATE public.astra_registry SET slug = 'freedomnetwork' WHERE slug = 'network';
UPDATE public.astra_registry SET slug = 'gaming' WHERE slug = 'thehoneycombgames';

-- ── 2. Merges. The catalog has ONE 'gaming' astra where the registry has five
-- domain-named games houses, and ONE 'bazaar' where the registry has two.
-- The survivor keeps its id; the others go archived and out of the grid.
UPDATE public.astra_registry
   SET status = 'archived', show_in_grid = false, link_redirect_slug = 'gaming',
       notes = coalesce(notes || ' | ', '') || 'db73: merged into gaming (catalog slug). Archived, not deleted - id is FK-referenceable.'
 WHERE slug = 'blingster';
UPDATE public.astra_registry
   SET status = 'archived', show_in_grid = false, link_redirect_slug = 'gaming',
       notes = coalesce(notes || ' | ', '') || 'db73: merged into gaming (catalog slug). Archived, not deleted - id is FK-referenceable.'
 WHERE slug = 'braindualgames';
UPDATE public.astra_registry
   SET status = 'archived', show_in_grid = false, link_redirect_slug = 'gaming',
       notes = coalesce(notes || ' | ', '') || 'db73: merged into gaming (catalog slug). Archived, not deleted - id is FK-referenceable.'
 WHERE slug = 'houseofcardgames';
UPDATE public.astra_registry
   SET status = 'archived', show_in_grid = false, link_redirect_slug = 'gaming',
       notes = coalesce(notes || ' | ', '') || 'db73: merged into gaming (catalog slug). Archived, not deleted - id is FK-referenceable.'
 WHERE slug = 'thebeegames';
UPDATE public.astra_registry
   SET status = 'archived', show_in_grid = false, link_redirect_slug = 'bazaar',
       notes = coalesce(notes || ' | ', '') || 'db73: merged into bazaar (catalog slug). Archived, not deleted - id is FK-referenceable.'
 WHERE slug = 'entertheprize';

-- ── 2b. Fix the redirect the merge would strand. 'thehoneycombgames' (now
-- 'gaming') points link_redirect_slug at 'braindualgames', which step 2 just
-- archived and hid. Left alone, the grid item would link to a hidden row.
UPDATE public.astra_registry
   SET link_redirect_slug = NULL
 WHERE slug = 'gaming' AND link_redirect_slug = 'braindualgames';

-- ── 3. Insert the 19 catalog astras with no registry row at all.
-- off_grid + show_in_grid=false: this migration reconciles IDENTITY only. Grid
-- placement is a front-end/product call and stays with whoever owns the grid.
INSERT INTO public.astra_registry (slug, display_name, default_name, status, show_in_grid, notes)
VALUES
  ('exchange', 'The Exchange', 'The Exchange', 'off_grid', false, 'db73: added from src/lib/astra-catalog.ts (category core). Identity only - grid placement not set.'),
  ('fnulnu', 'fnulnu', 'fnulnu', 'off_grid', false, 'db73: added from src/lib/astra-catalog.ts (category core). Identity only - grid placement not set.'),
  ('waggles', 'Waggles', 'Waggles', 'off_grid', false, 'db73: added from src/lib/astra-catalog.ts (category economy). Identity only - grid placement not set.'),
  ('honeypot', 'HoneyPOT', 'HoneyPOT', 'off_grid', false, 'db73: added from src/lib/astra-catalog.ts (category economy). Identity only - grid placement not set.'),
  ('beehold', 'BeeHold', 'BeeHold', 'off_grid', false, 'db73: added from src/lib/astra-catalog.ts (category economy). Identity only - grid placement not set.'),
  ('memories', 'Memories', 'Memories', 'off_grid', false, 'db73: added from src/lib/astra-catalog.ts (category knowledge). Identity only - grid placement not set.'),
  ('press', 'Freedom of the Press', 'Freedom of the Press', 'off_grid', false, 'db73: added from src/lib/astra-catalog.ts (category knowledge). Identity only - grid placement not set.'),
  ('feed', 'Feed', 'Feed', 'off_grid', false, 'db73: added from src/lib/astra-catalog.ts (category connection). Identity only - grid placement not set.'),
  ('dating', 'Dating', 'Dating', 'off_grid', false, 'db73: added from src/lib/astra-catalog.ts (category connection). Identity only - grid placement not set.'),
  ('vr', 'VR / Metaverse', 'VR / Metaverse', 'off_grid', false, 'db73: added from src/lib/astra-catalog.ts (category connection). Identity only - grid placement not set.'),
  ('genealogy', 'Genealogy', 'Genealogy', 'off_grid', false, 'db73: added from src/lib/astra-catalog.ts (category connection). Identity only - grid placement not set.'),
  ('theranking', 'TheRanking', 'TheRanking', 'off_grid', false, 'db73: added from src/lib/astra-catalog.ts (category connection). Identity only - grid placement not set.'),
  ('workshop', 'The Workshop', 'The Workshop', 'off_grid', false, 'db73: added from src/lib/astra-catalog.ts (category do). Identity only - grid placement not set.'),
  ('miniwaves', 'Tasks', 'Tasks', 'off_grid', false, 'db73: added from src/lib/astra-catalog.ts (category do). Identity only - grid placement not set.'),
  ('production', 'Production', 'Production', 'off_grid', false, 'db73: added from src/lib/astra-catalog.ts (category do). Identity only - grid placement not set.'),
  ('safetycheck', 'Safety Check', 'Safety Check', 'off_grid', false, 'db73: added from src/lib/astra-catalog.ts (category do). Identity only - grid placement not set.'),
  ('therank', 'TheRANK', 'TheRANK', 'off_grid', false, 'db73: added from src/lib/astra-catalog.ts (category governance). Identity only - grid placement not set.'),
  ('willtestament', 'Will & Testament', 'Will & Testament', 'off_grid', false, 'db73: added from src/lib/astra-catalog.ts (category governance). Identity only - grid placement not set.'),
  ('justice', 'Justice', 'Justice', 'off_grid', false, 'db73: added from src/lib/astra-catalog.ts (category governance). Identity only - grid placement not set.')
ON CONFLICT (slug) DO NOTHING;

-- ── 4. Verify.
DO $verify$
DECLARE
  n_rows integer; n_missing integer;
BEGIN
  SELECT count(*) INTO n_rows FROM public.astra_registry;
  IF n_rows <> 49 THEN
    RAISE EXCEPTION 'db73 verify failed: % rows, expected 49 (41 astras + 5 archived merges + 3 non-astra rows)', n_rows;
  END IF;
  -- every catalog slug must now resolve, with 'fund' standing in for 'crowdfunding'
  SELECT count(*) INTO n_missing FROM (VALUES
    ('exchange'),
    ('fnulnu'),
    ('waggles'),
    ('honeypot'),
    ('beehold'),
    ('memories'),
    ('press'),
    ('feed'),
    ('dating'),
    ('vr'),
    ('genealogy'),
    ('theranking'),
    ('workshop'),
    ('miniwaves'),
    ('production'),
    ('safetycheck'),
    ('therank'),
    ('willtestament'),
    ('justice')
  ) AS c(slug)
  WHERE NOT EXISTS (SELECT 1 FROM public.astra_registry r WHERE r.slug = c.slug);
  IF n_missing > 0 THEN
    RAISE EXCEPTION 'db73 verify failed: % catalog slug(s) still missing', n_missing;
  END IF;
END
$verify$;

COMMIT;
