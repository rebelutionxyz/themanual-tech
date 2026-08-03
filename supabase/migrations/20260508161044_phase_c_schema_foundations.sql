-- =============================================================================
-- Migration 20260508120000 — Phase C Schema Foundations
-- =============================================================================
-- Date:        2026-05-08
-- Author:      schema-architect (Claude) — supervised by Butch
-- Status:      UNAPPLIED. Apply via Supabase Studio or branch first.
-- Source:      MMF §19.7 (Phase C) Components C and D
--              shared/notes/audits/code-21-schema-drift-audit-2026-05-08.md
--              (3 schema items + 1 RPC rename listed as Phase C blockers)
--
-- Purpose:
--   Unblocks Code 23 (Component C — Geo lens UI) and Code 24 (Component D —
--   Promotion slot framework) by providing the four schema items both
--   builds reference but production does not yet have:
--
--     B-1  bee_profiles table              (Component C-4: bee location facets)
--     B-2  promotions   table              (Component D:   slot-targeted content)
--     B-3  bees.is_admin column            (Component D-5: gates promotions writes)
--
--   B-4 (bling_mint -> bling_free rename) was already completed in a prior
--   session and is not part of this migration. Verified at write time:
--   bling_free exists in production, bling_mint does not. Language firewall
--   is intact.
--
-- Idempotency:
--   Every block uses IF NOT EXISTS / OR REPLACE / DROP-then-CREATE for policies
--   and triggers. Re-running this migration is a no-op after the first apply.
--
-- House-style notes for reviewers:
--   * Follows the policy pattern from migration 20260508002736 / 20260508005230:
--     `DROP POLICY IF EXISTS … ; CREATE POLICY …`.
--   * Reuses the existing public.set_updated_at() function (created in
--     supabase/schema.sql, hardened with search_path in migration 23 Block D).
--     This migration does NOT redefine it.
--   * Uses BEGIN/COMMIT to keep all three blocks atomic. If any block fails,
--     none apply — preserves the "either everything is in or nothing is" invariant
--     that the v9 security migrations established.
-- =============================================================================

BEGIN;

-- =============================================================================
-- B-1 — bee_profiles table (Component C-4: Geo lens)
-- =============================================================================
-- 1:1 sidecar to public.bees, holding free-form location facets used by the
-- Geo lens to scope feed content. Free-form text in v1 — selector-based
-- validation (country picker, region picker, etc.) lives in app code, not the
-- DB. A v2 pass can tighten with a CHECK against an allowed-country list.
--
-- Lifecycle: rows are auto-created by an AFTER INSERT trigger on public.bees
-- so every bee always has a profile row with NULL facets. Bees populate the
-- columns via UPDATE (RLS-gated to self-only).

CREATE TABLE IF NOT EXISTS public.bee_profiles (
    bee_id                UUID PRIMARY KEY REFERENCES public.bees(id) ON DELETE CASCADE,
    location_country      TEXT NULL,
    location_region       TEXT NULL,
    location_city         TEXT NULL,
    location_neighborhood TEXT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at auto-bump trigger. Reuses public.set_updated_at() defined in
-- supabase/schema.sql (search_path hardened in migration 23 Block D).
DROP TRIGGER IF EXISTS bee_profiles_set_updated_at ON public.bee_profiles;
CREATE TRIGGER bee_profiles_set_updated_at
    BEFORE UPDATE ON public.bee_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create-profile trigger function.
-- SECURITY DEFINER so the trigger can INSERT past the public.bee_profiles
-- RLS policies (the table has no INSERT policy by design — see RLS block).
-- ON CONFLICT DO NOTHING makes replay safe.
CREATE OR REPLACE FUNCTION public.handle_new_bee_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
    INSERT INTO public.bee_profiles (bee_id)
        VALUES (NEW.id)
        ON CONFLICT (bee_id) DO NOTHING;
    RETURN NEW;
END;
$function$;

-- REVOKE for hygiene, mirroring migration 23 Block C.12 / 24 Block 1 pattern
-- for trigger functions. Triggers continue to fire regardless of EXECUTE grant.
REVOKE EXECUTE ON FUNCTION public.handle_new_bee_profile() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_bee_profile() FROM anon, authenticated;

DROP TRIGGER IF EXISTS bees_create_profile ON public.bees;
CREATE TRIGGER bees_create_profile
    AFTER INSERT ON public.bees
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_bee_profile();

-- One-time backfill: ensure every existing bee has a profile row.
-- Idempotent via ON CONFLICT — safe to re-run.
INSERT INTO public.bee_profiles (bee_id)
    SELECT id FROM public.bees
    ON CONFLICT (bee_id) DO NOTHING;

-- ----- RLS -----
-- Public read: profile facets are public so the Geo lens can render
-- "bees in <city>" feeds for any visitor.
-- Self-update: a bee can only modify their own profile row.
-- No explicit INSERT policy: the auto-create trigger (SECURITY DEFINER) is the
-- only legitimate INSERT path. End users never INSERT directly.
-- No explicit DELETE policy: rows go away via the bee_id FK ON DELETE CASCADE
-- when the parent bee is deleted.

ALTER TABLE public.bee_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bee_profiles_select_public ON public.bee_profiles;
CREATE POLICY bee_profiles_select_public
    ON public.bee_profiles
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS bee_profiles_update_self ON public.bee_profiles;
CREATE POLICY bee_profiles_update_self
    ON public.bee_profiles
    FOR UPDATE
    TO authenticated
    USING      (bee_id = auth.uid())
    WITH CHECK (bee_id = auth.uid());


-- =============================================================================
-- B-3 — bees.is_admin column (Component D-5: admin gate)
-- =============================================================================
-- Required BEFORE B-2 because the promotions admin-write policies reference
-- bees.is_admin. Default false; v1 admin assignment is a manual UPDATE
-- via Supabase Studio SQL (no UI for it yet).

ALTER TABLE public.bees
    ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;


-- =============================================================================
-- B-2 — promotions table (Component D: slot framework)
-- =============================================================================
-- Empty at v1. Populated manually via Supabase Studio until a promotions
-- admin UI exists.
--
-- Targeting model: each promotion picks ONE slot_key, has an optional
-- behavior, optional astra/realm/branch/atom scope, optional geo scope, and
-- an active window. The reader query (Component D runtime) filters by
-- (slot_key, active=true, time window) and orders by priority DESC.
--
-- Note: the column is `behavior`, NOT `type`. `type` collides with the
-- existing atoms.type column vocabulary (event/concept/etc). `behavior`
-- describes how the promotion renders (static vs scrolling), which is a
-- presentation concern, not a content-type concern.

CREATE TABLE IF NOT EXISTS public.promotions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_key          TEXT NOT NULL,
    behavior          TEXT NOT NULL CHECK (behavior IN ('static', 'scrolling')),
    content_html      TEXT NOT NULL,

    -- Scope facets — all NULL means "fires for any astra/realm/branch/atom".
    -- The reader applies most-specific-match logic in app code:
    -- atom_id > branch_path > realm_slug > astra_slug > catch-all.
    astra_slug        TEXT NULL,
    realm_slug        TEXT NULL,
    branch_path       TEXT NULL,
    -- atoms.id is TEXT (slug-form, e.g. "justice/freedom-of-speech") — see the
    -- atoms table in supabase/02_create_new_taxonomy.sql. The Phase C spec
    -- said `atom_id uuid`; that contradicts how atoms are actually keyed in
    -- production. Using TEXT here matches reality. Flagged in the audit writeup.
    atom_id           TEXT NULL REFERENCES public.atoms(id) ON UPDATE CASCADE ON DELETE SET NULL,

    -- Geo scope facets — same NULL-means-any semantics. v1 reader will filter
    -- on country only; region/city/neighborhood are schema-only for v2.
    geo_country       TEXT NULL,
    geo_region        TEXT NULL,
    geo_city          TEXT NULL,
    geo_neighborhood  TEXT NULL,

    priority          INTEGER NOT NULL DEFAULT 0,
    active            BOOLEAN NOT NULL DEFAULT true,
    starts_at         TIMESTAMPTZ NULL,
    ends_at           TIMESTAMPTZ NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at auto-bump (reuses set_updated_at, see B-1).
DROP TRIGGER IF EXISTS promotions_set_updated_at ON public.promotions;
CREATE TRIGGER promotions_set_updated_at
    BEFORE UPDATE ON public.promotions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----- Indexes -----
-- Each index is keyed to a known reader query pattern from the Component D spec.

-- (a) Astra/realm targeting lookup. Reader, given a current
-- (slot_key, astra_slug, realm_slug), wants the most-specific-matching
-- active row(s). Composite covers the equality predicates and lets the
-- planner skip non-active rows cheaply.
CREATE INDEX IF NOT EXISTS promotions_slot_astra_realm_active_idx
    ON public.promotions (slot_key, astra_slug, realm_slug, active);

-- (b) Geo targeting lookup. Reader, given a current (slot_key, geo_country),
-- wants matching rows. Geo is queried independently of astra/realm so it
-- gets its own composite — same shape, different facets.
CREATE INDEX IF NOT EXISTS promotions_slot_geo_country_active_idx
    ON public.promotions (slot_key, geo_country, active);

-- (c) Active-window filter. Every reader pass evaluates
-- `active AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now())`.
-- Partial index on `active = true` keeps it small (most rows in steady state
-- are expected to be active — paused/expired rows are pruned manually).
CREATE INDEX IF NOT EXISTS promotions_active_window_idx
    ON public.promotions (starts_at, ends_at)
    WHERE active = true;

-- ----- RLS -----
-- Public read: anyone (anon + authenticated) sees only currently-active rows.
-- The active-window predicate is enforced in the policy itself, NOT in the
-- reader query, so anon can never observe paused / future / expired rows.
-- Writes (INSERT/UPDATE/DELETE): admin-only, gated on bees.is_admin.

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS promotions_select_active ON public.promotions;
CREATE POLICY promotions_select_active
    ON public.promotions
    FOR SELECT
    USING (
        active = true
        AND (starts_at IS NULL OR starts_at <= now())
        AND (ends_at   IS NULL OR ends_at   >= now())
    );

-- INSERT / UPDATE / DELETE — split into three policies (Postgres requires
-- separate policies per command for non-SELECT; matches the v9 security
-- migrations' atom_kettle_votes / atom_sources / atom_comments pattern).
DROP POLICY IF EXISTS promotions_admin_insert ON public.promotions;
CREATE POLICY promotions_admin_insert
    ON public.promotions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.bees
            WHERE id = auth.uid() AND is_admin = true
        )
    );

DROP POLICY IF EXISTS promotions_admin_update ON public.promotions;
CREATE POLICY promotions_admin_update
    ON public.promotions
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.bees
            WHERE id = auth.uid() AND is_admin = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.bees
            WHERE id = auth.uid() AND is_admin = true
        )
    );

DROP POLICY IF EXISTS promotions_admin_delete ON public.promotions;
CREATE POLICY promotions_admin_delete
    ON public.promotions
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.bees
            WHERE id = auth.uid() AND is_admin = true
        )
    );


COMMIT;


-- =============================================================================
-- VERIFICATION (run AFTER COMMIT — NOT inside the txn)
-- =============================================================================
-- Save these as a separate verification script for branch deployment.
--
-- -- Check 1: bee_profiles exists with RLS, 2 policies, both triggers
-- SELECT rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename='bee_profiles';
-- -- Expected: t
-- SELECT polname FROM pg_policy WHERE polrelid='public.bee_profiles'::regclass ORDER BY polname;
-- -- Expected: bee_profiles_select_public, bee_profiles_update_self
-- SELECT tgname FROM pg_trigger WHERE tgrelid='public.bee_profiles'::regclass AND NOT tgisinternal;
-- -- Expected: bee_profiles_set_updated_at
-- SELECT tgname FROM pg_trigger WHERE tgrelid='public.bees'::regclass AND tgname='bees_create_profile';
-- -- Expected: 1 row
--
-- -- Check 2: every existing bee has a profile row
-- SELECT
--     (SELECT count(*) FROM public.bees)         AS bee_count,
--     (SELECT count(*) FROM public.bee_profiles) AS profile_count;
-- -- Expected: equal counts.
--
-- -- Check 3: promotions exists with RLS, 4 policies, 3 indexes
-- SELECT rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename='promotions';
-- -- Expected: t
-- SELECT polname FROM pg_policy WHERE polrelid='public.promotions'::regclass ORDER BY polname;
-- -- Expected: promotions_admin_delete, promotions_admin_insert,
-- --           promotions_admin_update, promotions_select_active
-- SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='promotions' ORDER BY indexname;
-- -- Expected: promotions_active_window_idx, promotions_pkey,
-- --           promotions_slot_astra_realm_active_idx, promotions_slot_geo_country_active_idx
--
-- -- Check 4: bees.is_admin column exists, default false
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='bees' AND column_name='is_admin';
-- -- Expected: boolean, false, NO
-- SELECT count(*) FROM public.bees WHERE is_admin = false;
-- SELECT count(*) FROM public.bees WHERE is_admin = true;
-- -- Expected: all-false-count = total bees, all-true-count = 0


-- =============================================================================
-- ROLLBACK (commented out — for reference only, do not run unless reverting)
-- =============================================================================
-- BEGIN;
--
-- -- B-2 rollback
-- DROP POLICY IF EXISTS promotions_select_active   ON public.promotions;
-- DROP POLICY IF EXISTS promotions_admin_insert    ON public.promotions;
-- DROP POLICY IF EXISTS promotions_admin_update    ON public.promotions;
-- DROP POLICY IF EXISTS promotions_admin_delete    ON public.promotions;
-- DROP TRIGGER IF EXISTS promotions_set_updated_at ON public.promotions;
-- DROP INDEX IF EXISTS public.promotions_slot_astra_realm_active_idx;
-- DROP INDEX IF EXISTS public.promotions_slot_geo_country_active_idx;
-- DROP INDEX IF EXISTS public.promotions_active_window_idx;
-- DROP TABLE IF EXISTS public.promotions;
--
-- -- B-3 rollback (DESTRUCTIVE if any admins were assigned)
-- ALTER TABLE public.bees DROP COLUMN IF EXISTS is_admin;
--
-- -- B-1 rollback
-- DROP TRIGGER IF EXISTS bees_create_profile          ON public.bees;
-- DROP TRIGGER IF EXISTS bee_profiles_set_updated_at  ON public.bee_profiles;
-- DROP POLICY  IF EXISTS bee_profiles_select_public   ON public.bee_profiles;
-- DROP POLICY  IF EXISTS bee_profiles_update_self     ON public.bee_profiles;
-- DROP TABLE   IF EXISTS public.bee_profiles;
-- DROP FUNCTION IF EXISTS public.handle_new_bee_profile();
--
-- COMMIT;
