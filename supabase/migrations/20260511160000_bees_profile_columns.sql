-- =============================================================================
-- Migration 20260511160000 — bees profile columns (bio, name, avatar_url)
-- =============================================================================
-- Date:        2026-05-11
-- Author:      Code (Claude Opus 4.7) — supervised by Butch
-- Status:      UNAPPLIED. Apply Monday 2026-05-11 alongside the other Monday
--              migrations. Independent of Lock 7 / Lock 3 / chargeback /
--              CR-5 / role hierarchy — apply in any order.
-- Source:      shared/canon/bees-table-audit-2026-05-10.md (audit finding §3)
--              shared/canon/admin-tier-conventions.md §6 (Optional schema deps)
--              TheMANUAL.tech/src/admin/sections/ProfileSection.tsx (live code
--                  reading these three columns with partial PostgREST 42703
--                  fail-soft)
--
-- Purpose:
--   Adds the three "Optional, fail-soft on absence" profile columns that
--   admin-tier-conventions.md §6 lists and that ProfileSection.tsx actively
--   queries. Today, all three are absent — the component's fail-soft catches
--   the missing-column error on its first query (selecting handle/name/
--   avatar_url/bio) and retries without bio, but the retry still queries
--   name/avatar_url, which also 42703s. The component silently degrades to
--   "handle initial only." Adding these columns ships the intended Profile
--   UX without further code changes.
--
--   bees columns post-migration:
--     - bio          text NULL  — free-form Bee bio, edited via ProfileSection
--                                  textarea. UI guards length; no DB CHECK.
--     - name         text NULL  — display name; ProfileSection falls back to
--                                  bee.handle when null/empty.
--     - avatar_url   text NULL  — image URL for hex avatar; ProfileSection
--                                  falls back to handle's first letter when
--                                  null.
--
-- What this migration does NOT do:
--   - No backfill. All three columns are NULL for every existing Bee until
--     they choose to set them via ProfileSection.
--   - No RLS change. Existing bees policies cover the new columns.
--   - No CHECK constraints on length / format. UI handles those; tightening
--     can ship later as a follow-up if abuse surfaces.
--   - No avatar-storage integration. avatar_url is just a text URL; the
--     upload pipeline (Supabase Storage bucket, presigned URL flow) is a
--     separate concern not in this migration's scope.
--
-- Idempotency:
--   Pre-flight DO block reports the current state of each column. The
--   subsequent ALTER TABLE statements use ADD COLUMN IF NOT EXISTS so a
--   re-run after partial application (e.g., one column manually added via
--   Studio) fills only the gaps and leaves existing columns untouched.
--
-- House-style notes:
--   * Single BEGIN/COMMIT. The three column adds are independent but
--     bundled atomically — either all three columns exist post-migration
--     or none do (assuming none existed pre-migration).
--   * No trigger functions, no RLS policies — the columns inherit existing
--     bees-table RLS posture.
--   * Verification queries at end (commented). Rollback at end (commented).
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight: report current state of each column. Lenient (mixed state
-- is allowed via ADD COLUMN IF NOT EXISTS); strict alerts only if all
-- three are already present (re-run is no-op).
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_bio_exists        boolean;
    v_name_exists       boolean;
    v_avatar_url_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'bees' AND column_name = 'bio'
    ) INTO v_bio_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'bees' AND column_name = 'name'
    ) INTO v_name_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'bees' AND column_name = 'avatar_url'
    ) INTO v_avatar_url_exists;

    IF v_bio_exists AND v_name_exists AND v_avatar_url_exists THEN
        RAISE NOTICE 'All three profile columns already present. Migration is a no-op.';
    ELSIF NOT v_bio_exists AND NOT v_name_exists AND NOT v_avatar_url_exists THEN
        RAISE NOTICE 'Pre-flight OK: none of the three profile columns present. Adding all three.';
    ELSE
        RAISE NOTICE
            'Mixed state detected: bio=%, name=%, avatar_url=%. ADD COLUMN IF NOT EXISTS will fill the gaps.',
            v_bio_exists, v_name_exists, v_avatar_url_exists;
    END IF;
END
$$;

-- ───────────────────────────────────────────────────────────────────────
-- Add the three columns. Each idempotent via IF NOT EXISTS.
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.bees
    ADD COLUMN IF NOT EXISTS bio        text;

ALTER TABLE public.bees
    ADD COLUMN IF NOT EXISTS name       text;

ALTER TABLE public.bees
    ADD COLUMN IF NOT EXISTS avatar_url text;


COMMIT;


-- =============================================================================
-- VERIFICATION (run AFTER COMMIT)
-- =============================================================================
-- (1) All three columns present, nullable, no default:
--     SELECT column_name, data_type, is_nullable, column_default
--     FROM information_schema.columns
--     WHERE table_schema = 'public'
--       AND table_name   = 'bees'
--       AND column_name IN ('bio', 'name', 'avatar_url')
--     ORDER BY column_name;
--     -- expect 3 rows: text / YES / NULL for each.
--
-- (2) RLS posture unchanged (sanity: existing bees policies still apply):
--     SELECT polname FROM pg_policy WHERE polrelid = 'public.bees'::regclass
--     ORDER BY polname;
--     -- expect: same set as before this migration applied.
--
-- (3) ProfileSection smoke test (manual, in browser):
--     - sign in as test bee
--     - navigate to themanual.tech/myhex
--     - confirm Profile section renders the bio editor (was hidden when
--       bio column was missing)
--     - type a bio, click Save, confirm "Saved." flashes
--     - reload page; confirm bio persists


-- =============================================================================
-- ROLLBACK (commented out — for reference only)
-- =============================================================================
-- ⚠ Rollback is destructive on any data Bees have written into the columns
-- between apply and rollback. If any bee.bio / bee.name / bee.avatar_url
-- has been set, that data is lost on column drop.
--
-- BEGIN;
-- ALTER TABLE public.bees DROP COLUMN IF EXISTS bio;
-- ALTER TABLE public.bees DROP COLUMN IF EXISTS name;
-- ALTER TABLE public.bees DROP COLUMN IF EXISTS avatar_url;
-- COMMIT;
