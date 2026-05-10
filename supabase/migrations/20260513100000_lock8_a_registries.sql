-- =============================================================================
-- Migration 20260513100000 — Lock 8 (A) · Registries (astra_registry + nova_registry)
-- =============================================================================
-- Date:        2026-05-13
-- Author:      Code (Claude Opus 4.7) — supervised by Butch
-- Status:      UNAPPLIED. Apply Wednesday 2026-05-13 as Migration A of the
--              three-part Lock 8 set (A: registries; B: per-table astra_id /
--              nova_id columns + backfill; C: RLS policy rewrite). This
--              migration is the "no-blast-radius" piece — net new tables,
--              no existing-table changes, no RLS rewrite. Safe to apply
--              during business hours.
-- Source:      shared/canon/wednesday-2026-05-13-lock8-prescope.md §2a
--              shared/canon/federation-tier-1-scoping.md §Lock 8 (lines 211–217)
--              shared/canon/admin-tier-conventions.md §6 (`created_by` gap)
--              Open #SCH-2 (seed slug = 'themanual')
--              Open #SCH-3 (nova_registry.tier column ships day-one)
--
-- Purpose:
--   Lands the two registry tables that anchor the entire Lock 8 federation
--   isolation posture:
--
--     astra_registry — every canonical Astra in the constellation, keyed
--                      by slug. The 'themanual' row seeds the existing
--                      spine. Future Astras (AtlasINTEL, Rebelution, etc.)
--                      get their own rows when / if they peel out from the
--                      shared spine.
--
--     nova_registry  — every Bee-cloned Nova, scoped to a parent Astra.
--                      Ships the Lock 9.6 sovereignty `tier` column from
--                      day one (per #SCH-3) so BRANDoSOPHIC's Friday
--                      Nova-creation flow has a column to write into.
--
--   Both tables ship with `created_by uuid REFERENCES bees(id)` per the
--   admin-tier-conventions §6 gap — `useUserRole` already queries this
--   column via `.eq('created_by', beeId)` and fails-soft today.
--
-- Sub-decisions ratified (from Code 2 pre-scope):
--   - #SCH-3: nova_registry ships with sovereignty tier column day one.
--             Column: `tier text NOT NULL DEFAULT 'standard' CHECK (...)`.
--   - #SCH-2: astra_registry seed row uses slug = 'themanual'. The display
--             name is 'TheMANUAL.tech'; domain 'themanual.tech';
--             created_by NULL (system seed, no Bee author).
--   - admin-tier §6 gap: created_by column ships on both registries.
--
-- Naming choices (Butch's spec, supersedes federation-doc verbatim names):
--   - `display_name` (NOT federation-doc's `name`) — reads better; matches
--     UI display vocabulary.
--   - `astra_id` on nova_registry (NOT federation-doc's `parent_astra_id`)
--     — symmetric with Migration B's content-table `astra_id` columns.
--   - Three extra columns not in the federation doc: `domain` on astra,
--     `subdomain` on nova, `notes` on both. Subdomain in particular is
--     what BRANDoSOPHIC's Friday flow will write.
--
-- Dependencies:
--   - Lock 3 (`astra_or_nova_status` enum) MUST be applied first. The
--     pre-flight DO block aborts cleanly if the enum is missing — refusing
--     to ship registries that reference a non-existent type.
--   - No other dependencies. Independent of all other Lock 8 migrations
--     (B and C apply later); independent of Monday's Lock 7 / chargeback /
--     CR-5 / role-hierarchy.
--
-- Idempotency:
--   - CREATE TABLE IF NOT EXISTS guards both registries.
--   - All ADD CONSTRAINT clauses use DROP-then-ADD for refresh-on-rerun.
--   - Indexes use CREATE INDEX IF NOT EXISTS.
--   - RLS ENABLE is safe to re-run.
--   - Policy creation uses DROP POLICY IF EXISTS + CREATE POLICY.
--   - Seed INSERT uses ON CONFLICT (slug) DO NOTHING.
--   Re-applying after a successful first apply is a no-op.
--
-- Permission posture:
--   - read-public (authenticated only): both registries get
--     `SELECT TO authenticated USING (true)` policies. Anon does not see
--     registry contents (matches Monday's bee_disciplines pattern; Astra
--     identity is operator information, not anon-public).
--   - Writes: service-role bypass is the only path. No INSERT / UPDATE /
--     DELETE policies on either table. BRANDoSOPHIC's Nova-creation flow
--     calls a SECURITY DEFINER RPC (out of this migration's scope) that
--     mediates writes.
--
-- House-style notes:
--   * Single BEGIN/COMMIT.
--   * Mirrors the role-hierarchy migration's pre-flight + per-table pattern
--     (Monday `20260511150000_lock_role_hierarchy.sql`).
--   * Verification queries at end (commented). Rollback at end (commented).
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight: confirm Lock 3 enum exists; detect already-applied / mixed state.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_enum_exists      boolean;
    v_astra_exists     boolean;
    v_nova_exists      boolean;
    v_present_tables   integer;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'astra_or_nova_status'
          AND typnamespace = 'public'::regnamespace
    ) INTO v_enum_exists;

    IF NOT v_enum_exists THEN
        RAISE EXCEPTION
            'Pre-flight failed: astra_or_nova_status enum is absent. '
            'Lock 3 migration (20260511110000_lock3_discriminators.sql) '
            'must apply first. Apply it, then re-run this migration.';
    END IF;

    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='astra_registry') INTO v_astra_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='nova_registry')  INTO v_nova_exists;

    v_present_tables := v_astra_exists::int + v_nova_exists::int;

    IF v_present_tables = 0 THEN
        RAISE NOTICE 'Pre-flight OK: enum present, no registries yet. Proceeding.';
    ELSIF v_present_tables = 2 THEN
        RAISE NOTICE 'Lock 8 (A) already applied (both registries present). Idempotent re-run will refresh constraints / indexes / policies / seed row without other effect.';
    ELSE
        RAISE NOTICE
            'Mixed state: astra_registry=%, nova_registry=%. '
            'IF NOT EXISTS guards will fill the gap; review post-apply.',
            v_astra_exists, v_nova_exists;
    END IF;
END
$$;


-- =============================================================================
-- BLOCK A — TABLE astra_registry
-- =============================================================================
-- Every canonical Astra in the constellation. The 'themanual' seed row
-- represents the existing live spine; future Astras get their own rows
-- as they ship.
--
-- Columns:
--   id           — uuid PK
--   slug         — unique short identifier (e.g. 'themanual', 'atlasintel')
--   display_name — human-readable name (e.g. 'TheMANUAL.tech', 'AtlasINTEL')
--   domain       — canonical web domain (nullable for pre-domain Astras)
--   status       — active | archived | off_grid (Lock 3 enum)
--   created_at   — registration timestamp
--   created_by   — Bee who registered the Astra (nullable for system-seeded)
--   notes        — operational notes, free-form
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.astra_registry (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug          text NOT NULL,
    display_name  text NOT NULL,
    domain        text,
    status        public.astra_or_nova_status NOT NULL DEFAULT 'active',
    created_at    timestamptz NOT NULL DEFAULT now(),
    created_by    uuid REFERENCES public.bees(id),
    notes         text
);

ALTER TABLE public.astra_registry
    DROP CONSTRAINT IF EXISTS astra_registry_slug_key;
ALTER TABLE public.astra_registry
    ADD  CONSTRAINT astra_registry_slug_key UNIQUE (slug);

-- Partial index: surfaces archived / off_grid Astras for ops audits.
-- Active Astras (the steady-state majority) are not indexed here — the
-- UNIQUE-derived slug index is the read path for those.
CREATE INDEX IF NOT EXISTS astra_registry_status_non_active_idx
    ON public.astra_registry (status)
    WHERE status <> 'active';

ALTER TABLE public.astra_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS astra_registry_select_authenticated ON public.astra_registry;
CREATE POLICY astra_registry_select_authenticated
    ON public.astra_registry
    FOR SELECT
    TO authenticated
    USING (true);

-- No INSERT / UPDATE / DELETE policies → service_role bypass is the only
-- write path. Future BRANDoSOPHIC / admin RPCs mediate Bee-initiated writes.


-- =============================================================================
-- BLOCK B — TABLE nova_registry
-- =============================================================================
-- Every Bee-cloned Nova. Scoped to a parent Astra via astra_id.
-- UNIQUE (astra_id, slug) keeps Nova slugs unique within each Astra (so
-- 'main' can exist under both themanual and atlasintel without collision).
--
-- Ships with the Lock 9.6 sovereignty `tier` column from day one per
-- #SCH-3 — BRANDoSOPHIC's Friday Nova-creation flow writes into this
-- column directly without a follow-up ALTER.
--
-- Columns:
--   id            — uuid PK
--   astra_id      — FK to astra_registry (every Nova has a parent)
--   slug          — short identifier, scoped uniqueness per parent Astra
--   display_name  — human-readable name
--   subdomain     — e.g. 'oceanresearch' for oceanresearch.themanual.tech
--                   (nullable until BRANDoSOPHIC customizes)
--   tier          — Lock 9.6 sovereignty tier: standard | dedicated | off_grid
--   status        — active | archived | off_grid (Lock 3 enum; orthogonal
--                   to tier — a Nova can be 'standard' tier and 'archived'
--                   status simultaneously)
--   created_at    — registration timestamp
--   created_by    — Bee who created the Nova (operator or BRANDoSOPHIC user)
--   notes         — operational notes, free-form
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.nova_registry (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    astra_id      uuid NOT NULL REFERENCES public.astra_registry(id),
    slug          text NOT NULL,
    display_name  text NOT NULL,
    subdomain     text,
    tier          text NOT NULL DEFAULT 'standard',
    status        public.astra_or_nova_status NOT NULL DEFAULT 'active',
    created_at    timestamptz NOT NULL DEFAULT now(),
    created_by    uuid REFERENCES public.bees(id),
    notes         text
);

-- Slug uniqueness scoped per parent Astra.
ALTER TABLE public.nova_registry
    DROP CONSTRAINT IF EXISTS nova_registry_astra_slug_key;
ALTER TABLE public.nova_registry
    ADD  CONSTRAINT nova_registry_astra_slug_key UNIQUE (astra_id, slug);

-- Lock 9.6 tier domain enforcement.
ALTER TABLE public.nova_registry
    DROP CONSTRAINT IF EXISTS nova_registry_tier_chk;
ALTER TABLE public.nova_registry
    ADD  CONSTRAINT nova_registry_tier_chk
        CHECK (tier IN ('standard', 'dedicated', 'off_grid'));

-- Parent lookup index (every "which Novas does this Astra have" query
-- hits this).
CREATE INDEX IF NOT EXISTS nova_registry_astra_idx
    ON public.nova_registry (astra_id);

-- Partial index: archived / off_grid Novas for ops audits.
CREATE INDEX IF NOT EXISTS nova_registry_status_non_active_idx
    ON public.nova_registry (status)
    WHERE status <> 'active';

ALTER TABLE public.nova_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nova_registry_select_authenticated ON public.nova_registry;
CREATE POLICY nova_registry_select_authenticated
    ON public.nova_registry
    FOR SELECT
    TO authenticated
    USING (true);

-- No INSERT / UPDATE / DELETE policies → service_role bypass is the only
-- write path. BRANDoSOPHIC's Nova-creation flow Friday calls a SECURITY
-- DEFINER RPC (out of this migration's scope) that mediates Bee-initiated
-- writes.


-- =============================================================================
-- BLOCK C — Seed: 'themanual' row in astra_registry
-- =============================================================================
-- Represents the existing live spine. Migration B's content-table
-- backfill (`UPDATE T SET astra_id = <this row's id> WHERE astra_id IS
-- NULL`) reads this row to find the UUID to stamp on every existing
-- content row.
--
-- created_by NULL — system seed, no Bee author.
-- ON CONFLICT (slug) DO NOTHING — idempotent re-run.
-- =============================================================================

INSERT INTO public.astra_registry (slug, display_name, domain, created_by)
VALUES ('themanual', 'TheMANUAL.tech', 'themanual.tech', NULL)
ON CONFLICT (slug) DO NOTHING;


COMMIT;


-- =============================================================================
-- VERIFICATION (run AFTER COMMIT)
-- =============================================================================
-- (1) Both registries exist with RLS enabled:
--     SELECT tablename, rowsecurity
--     FROM pg_tables
--     WHERE schemaname='public'
--       AND tablename IN ('astra_registry', 'nova_registry')
--     ORDER BY tablename;
--     -- expect: 2 rows, rowsecurity=true for both.
--
-- (2) FK from nova_registry → astra_registry wired:
--     SELECT conname, pg_get_constraintdef(c.oid)
--     FROM pg_constraint c
--     JOIN pg_class t ON t.oid = c.conrelid
--     WHERE t.relname='nova_registry' AND c.contype='f';
--     -- expect: FK on astra_id referencing public.astra_registry(id).
--
-- (3) Tier CHECK constraint accepts only the three Lock 9.6 values:
--     SELECT pg_get_constraintdef(c.oid)
--     FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
--     WHERE t.relname='nova_registry' AND c.conname='nova_registry_tier_chk';
--     -- expect: CHECK with 'standard', 'dedicated', 'off_grid'.
--
-- (4) Seed row present:
--     SELECT id, slug, display_name, domain, status, created_by
--     FROM public.astra_registry
--     WHERE slug = 'themanual';
--     -- expect: 1 row. Capture the id — Migration B's backfill needs it.
--
-- (5) RLS policies present (one SELECT policy per table, no write policies):
--     SELECT tablename, polname, polcmd
--     FROM pg_policies
--     WHERE schemaname='public'
--       AND tablename IN ('astra_registry', 'nova_registry')
--     ORDER BY tablename, polname;
--     -- expect: 2 rows, both polcmd='r' (SELECT), names *_select_authenticated.
--
-- (6) Indexes present:
--     SELECT tablename, indexname FROM pg_indexes
--     WHERE schemaname='public'
--       AND tablename IN ('astra_registry', 'nova_registry')
--     ORDER BY tablename, indexname;
--     -- expect:
--     --   astra_registry_pkey
--     --   astra_registry_slug_key  (UNIQUE-derived)
--     --   astra_registry_status_non_active_idx
--     --   nova_registry_astra_idx
--     --   nova_registry_astra_slug_key  (UNIQUE-derived)
--     --   nova_registry_pkey
--     --   nova_registry_status_non_active_idx
--
-- (7) Negative test — tier CHECK rejects bad value (branch DB only):
--     INSERT INTO public.nova_registry (astra_id, slug, display_name, tier)
--     VALUES ((SELECT id FROM public.astra_registry WHERE slug='themanual'),
--             'test-bad-tier', 'Test', 'platinum');
--     -- expect: ERROR — nova_registry_tier_chk violated.
--
-- (8) Negative test — service_role can INSERT, authenticated cannot:
--     -- Run with authenticated JWT:
--     INSERT INTO public.nova_registry (astra_id, slug, display_name)
--     VALUES ((SELECT id FROM public.astra_registry WHERE slug='themanual'),
--             'authd-attempt', 'Should Fail');
--     -- expect: ERROR — RLS rejects (no INSERT policy for authenticated).
--     -- Run with service_role: same insert succeeds.


-- =============================================================================
-- ROLLBACK (commented out — for reference only)
-- =============================================================================
-- ⚠ Rollback is destructive on any registry rows written between apply and
-- rollback. If BRANDoSOPHIC's Nova-creation flow has run and Novas exist
-- here, dropping nova_registry loses them. Capture pg_dump first.
--
-- ⚠ Rolling back AFTER Migration B (per-table astra_id / nova_id columns
-- with FKs to these registries) requires dropping those columns first or
-- the registry drop will cascade unexpectedly. Order:
--   1. Roll back Migration C (RLS policy rewrite)
--   2. Roll back Migration B (per-table columns)
--   3. Roll back this migration (registries)
--
-- BEGIN;
-- DROP POLICY IF EXISTS nova_registry_select_authenticated ON public.nova_registry;
-- DROP TABLE IF EXISTS public.nova_registry;
-- DROP POLICY IF EXISTS astra_registry_select_authenticated ON public.astra_registry;
-- DROP TABLE IF EXISTS public.astra_registry;
-- COMMIT;
--
-- The astra_or_nova_status enum (Lock 3) is NOT dropped here — it may be
-- consumed by other tables (Lock 8 Migration B content tables when they
-- ship). Drop the enum only via Lock 3's rollback.
