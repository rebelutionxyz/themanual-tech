-- =============================================================================
-- Migration 20260513120000 — Lock 8 / Migration C: per-Astra/per-Nova RLS rewrite
-- =============================================================================
-- Date:        2026-05-13
-- Author:      Code 2 (Claude) — supervised by Butch
-- Status:      UNAPPLIED. Wednesday 2026-05-13 work item, lands AFTER Migrations
--              A (registries) and B (per-table column adds + backfill).
-- Source:      shared/canon/wednesday-2026-05-13-lock8-prescope.md (§2c, §3a, §3b)
--              shared/canon/federation-tier-1-scoping.md §Lock 8 lines 411-482
--              shared/canon/admin-tier-conventions.md §6 (registries dependency)
-- Sibling:     20260513XXXXXX_lock8_a_registries.sql            (Migration A — author with EARLIER timestamp than this file)
--              20260513XXXXXX_lock8_b_content_columns.sql       (Migration B — author with EARLIER timestamp than this file)
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ⚠ HIGH BLAST RADIUS ⚠
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- This migration rewrites RLS on EVERY in-scope platform content table — 15
-- tables that four live Astras (TheMANUAL.tech, AtlasINTEL.fyi,
-- Rebelution.fyi, AtlasUNITED.fyi) actively read and write through. A bad
-- policy here can silently empty production reads or block production writes.
--
-- The single most likely failure mode is that the new SELECT policy reads
--     current_setting('request.astra_id', true)::uuid
-- and Astra Edge Functions don't yet stamp the request.astra_id GUC on every
-- request. When that GUC is unset, current_setting('...', true) returns NULL,
-- and `astra_id = NULL` is FALSE under strict three-valued logic, so every
-- read returns empty.
--
-- This migration mitigates that with a BRIDGE POLICY (Approach 1 below).
-- An alternate mitigation is to defer this migration entirely (Approach 2).
-- Wednesday morning gets to choose between the two before applying.
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- APPROACH 1 — Bridge policy with NULL fallback (the shape authored below)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- The SELECT policy reads:
--     USING (
--         astra_id IS NULL
--         OR astra_id = current_setting('request.astra_id', true)::uuid
--         OR auth.role() = 'service_role'
--     )
--
-- Because Migration B's backfill set astra_id on every existing row to the
-- 'themanual' UUID and flipped the column to NOT NULL, the literal
-- "astra_id IS NULL" branch is FALSE for every existing row. So in practice
-- the bridge clause does nothing today — the policy reduces to the strict
-- isolation check + service_role bypass.
--
-- BUT the IS NULL branch is structurally important. As Astra Edge Functions
-- gradually roll out request.astra_id stamping, any new INSERTs that forget
-- to stamp astra_id (which Migration B forbids — NOT NULL with no default)
-- would error at write time, not read time. The IS NULL branch is also
-- defensive against any future migration that adds a content table with a
-- nullable astra_id transition window.
--
-- Once every Edge Function is verified to be stamping request.astra_id,
-- a follow-up migration can drop the IS NULL branch from the USING clause.
-- Until then the branch is harmless (no rows can satisfy it under the
-- Migration B post-state) but preserves the bridge for emergency rollback
-- to a nullable-astra_id world if Migration B ever needs to be reversed.
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- APPROACH 2 — Defer entirely (fallback decision Wednesday can take)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- If Wednesday's room judges the bridge policy too risky given the live-Astra
-- query volume, do not apply this migration. Instead:
--
--   1. Land Migrations A + B Wednesday (registries + columns + backfill).
--      These do NOT touch RLS — existing policies remain in effect.
--   2. In parallel, every Astra Edge Function is updated to set the
--      request.astra_id GUC on every request and to stamp astra_id on
--      every INSERT.
--   3. After Edge Function rollout is verified across all four live Astras,
--      apply this migration in a low-traffic window. The bridge fallback
--      is then provably unused, but kept for the reasons above.
--
-- The cost of Approach 2 is one extra coordination day (Edge Function deploys)
-- before Lock 8 isolation actually takes effect. The benefit is zero risk of
-- empty-Astra reads during the rollout. Applies-cleanly-but-late vs. applies-
-- now-with-bridge — the room decides.
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- EDGE FUNCTION REQUIREMENT (must land before bridge tightens)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- Every Astra Edge Function that handles a Bee request must, before any
-- query, call:
--     SET LOCAL request.astra_id = '<this-astra-uuid>';
-- and (when serving a Nova surface) also:
--     SET LOCAL request.nova_id  = '<this-nova-uuid>';
--
-- Suggested helper pattern (out of repo for this migration):
--     async function withAstraContext(supabase, astraId, novaId, fn) {
--         await supabase.rpc('set_astra_context', { p_astra: astraId, p_nova: novaId });
--         return fn();
--     }
-- where set_astra_context is a SECURITY DEFINER RPC that runs the two
-- SET LOCAL statements. Authoring that RPC is a separate Code task.
--
-- Until the Edge Function rollout is complete and verified, the bridge
-- IS NULL branch is the only thing keeping live-Astra reads functional.
-- DO NOT drop the bridge until rollout is confirmed across all four
-- live Astras (TheMANUAL, AtlasINTEL, Rebelution, AtlasUNITED).
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- POLICY POSTURE (per the Wednesday spec, as ratified 2026-05-10 evening)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- For each of the 15 in-scope content tables:
--   • DROP every existing RLS policy on the table (none of them account for
--     astra_id; all are obsolete in the new world). The pre-flight DO block
--     enumerates them by name + RAISE NOTICE so the operator sees what was
--     dropped.
--   • CREATE one SELECT policy with bridge logic:
--         USING (
--             astra_id IS NULL
--             OR astra_id = current_setting('request.astra_id', true)::uuid
--             [+ AND nova_id check when nova_id column exists]
--             OR auth.role() = 'service_role'
--         )
--   • CREATE one ALL policy gated on auth.role() = 'service_role' for
--     INSERT/UPDATE/DELETE. service_role bypasses RLS by default in
--     Supabase; this policy is explicit defense-in-depth so the catalog
--     surface clearly shows write-paths are service-role-only.
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE INVENTORY (15 — must match Migration B exactly)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- INCLUDED (15):
--   pillars                  ← astra_id only, NO nova_id (deprecation-flagged
--                              — see #SCH-11 below)
--   groups
--   group_memberships
--   events
--   event_rsvps
--   forum_threads
--   forum_posts
--   chat_rooms
--   bazaar_listings
--   give_campaigns
--   give_contributions
--   entity_atom_links
--   entity_reactions          ← astra-scoped (conversational context belongs to
--                                the Astra where the reaction occurred)
--   entity_shares
--   promotions                ← keeps existing astra_slug column, with new
--                                astra_id alongside (#SCH-12 deprecation
--                                follow-up post-Wednesday)
--
-- EXCLUDED (4 — Bee-platform-wide rather than per-Astra):
--   message_threads           ← DMs follow the Bee, not the Astra. Bees are
--                                platform-wide per the role-hierarchy lock
--                                (2026-05-10), so DM conversations carry no
--                                astra_id.
--   message_participants      ← DM junction table; follows parent thread.
--   messages                  ← DM content; follows thread.
--   entity_saves              ← Bee bookmarks are personal organization that
--                                belongs to the Bee. The saved content still
--                                has its own astra_id; the save reference
--                                points to it from platform-wide Bee identity.
--                                (Note: entity_reactions is INCLUDED above
--                                because reactions are conversational context;
--                                entity_saves is EXCLUDED because saves are
--                                personal organization. Different semantics
--                                despite similar table shapes.)
--
-- ALSO EXCLUDED (consistent with Migration B + federation Lock 8):
--   bee_profiles              ← sidecar to Bee identity, lives in spine
--   bling_*                   ← live in BLiNG! DB per Lock 9
--   bees, atoms, realms, atom_*, entity_category_links,
--   canonical_documents, document_versions, sessions  ← spine-canonical
--                                taxonomy, not per-Astra
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TRACKED OPEN QUESTIONS (NOT added to open-questions-current.md by this
-- migration — Code 2 is managing that file on a separate task. Logged here
-- so the deprecation work doesn't get lost.)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- #SCH-11 — `pillars` table predates `astra_registry`. The pre-Lock-8 world
--   used a `pillars` table to enumerate pillar (now Astra) configs, and
--   `pillars.id` (or `pillars.slug`) was the de-facto Astra identifier. The
--   new `astra_registry` (Migration A) is the canonical home for Astra
--   identity. Migration B added `astra_id` to `pillars` for transitional
--   isolation, but the table is conceptually superseded. A consolidation
--   session is needed to: (a) decide whether `pillars` is fully replaced by
--   `astra_registry` or kept as Astra-config-detail sidecar, (b) migrate
--   any unique columns from `pillars` into `astra_registry`, (c) DROP
--   `pillars` if/when consolidation completes. No specific date — flag
--   for the post-Lock-8 cleanup arc.
--
--   Until consolidation, `pillars` ships with `astra_id` only (no `nova_id`)
--   because pillar-config rows are conceptually per-Astra and never
--   per-Nova; adding `nova_id` would invite confusion.
--
-- #SCH-12 — `promotions.astra_slug` is now redundant with the new
--   `promotions.astra_id` column (Migration B). The Phase C `promotions`
--   table introduced `astra_slug TEXT` (Component D-2) as an Astra-targeting
--   facet; with `astra_id UUID NOT NULL REFERENCES astra_registry(id)` now
--   in place, `astra_slug` is dead weight at best, drift surface at worst.
--   Deprecation migration (post-Wednesday Lock 8 apply): backfill
--   `astra_id` from `astra_slug` if not already populated by Migration B's
--   default backfill, then DROP COLUMN `astra_slug`. Reader queries that
--   filter by `astra_slug` need to migrate to filtering by `astra_id`.
--
--   This migration ships `promotions` with both columns coexisting —
--   bridge SELECT policy uses `astra_id` only (the new canonical), and
--   `astra_slug` continues to exist but is no longer load-bearing for
--   isolation. Read-side migration to `astra_id` happens in app code as a
--   separate task; the column drop happens after that migration is
--   complete.
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- IDEMPOTENCY
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- DROP POLICY IF EXISTS on every drop. CREATE POLICY uses unique names
-- per the new convention (`<T>_astra_isolation_select` and
-- `<T>_service_role_write`); re-running the migration drops then re-
-- creates them, which is idempotent on body. The pre-flight aborts if
-- A or B aren't applied, so re-runs against an unprepared catalog
-- never reach the destructive CREATE blocks.
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight 1 · Migration A applied — astra_registry + nova_registry exist.
-- ───────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'astra_registry'
    ) THEN
        RAISE EXCEPTION
            'Pre-flight failed: public.astra_registry not found. '
            'Apply Migration A (Lock 8 registries) FIRST.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'nova_registry'
    ) THEN
        RAISE EXCEPTION
            'Pre-flight failed: public.nova_registry not found. '
            'Apply Migration A (Lock 8 registries) FIRST.';
    END IF;

    RAISE NOTICE 'Pre-flight 1 OK: astra_registry + nova_registry present.';
END $$;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight 2 · Migration B applied — sample table has astra_id column.
-- Uses forum_posts as canary because it's high-volume and any partial-B
-- state would be obvious by Wednesday afternoon.
-- ───────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name   = 'forum_posts'
           AND column_name  = 'astra_id'
    ) THEN
        RAISE EXCEPTION
            'Pre-flight failed: forum_posts.astra_id not found. '
            'Apply Migration B (Lock 8 per-table column adds + backfill) FIRST.';
    END IF;

    RAISE NOTICE 'Pre-flight 2 OK: Migration B canary column present.';
END $$;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight 3 · Lock 3 enum exists (astra_or_nova_status). Required by
-- registries; checking here as belt-and-suspenders against a partial
-- Lock 3 / Lock 8 state.
-- ───────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type
         WHERE typname = 'astra_or_nova_status'
    ) THEN
        RAISE EXCEPTION
            'Pre-flight failed: astra_or_nova_status enum not found. '
            'Apply Lock 3 migration (20260511110000_lock3_discriminators.sql) FIRST.';
    END IF;

    RAISE NOTICE 'Pre-flight 3 OK: astra_or_nova_status enum present.';
END $$;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight 4 · No NULL astra_ids on any in-scope table. Migration B's
-- backfill should have eliminated them; if any are NULL, B applied
-- partially and Migration C cannot proceed.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_table   text;
    v_nulls   bigint;
BEGIN
    FOREACH v_table IN ARRAY ARRAY[
        'pillars', 'groups', 'group_memberships', 'events', 'event_rsvps',
        'forum_threads', 'forum_posts', 'chat_rooms', 'bazaar_listings',
        'give_campaigns', 'give_contributions', 'entity_atom_links',
        'entity_reactions', 'entity_shares', 'promotions'
    ]
    LOOP
        EXECUTE format(
            'SELECT COUNT(*) FROM public.%I WHERE astra_id IS NULL',
            v_table
        ) INTO v_nulls;

        IF v_nulls > 0 THEN
            RAISE EXCEPTION
                'Pre-flight failed: %.astra_id has % NULL row(s). '
                'Migration B backfill is incomplete. Investigate before '
                'applying Migration C.',
                v_table, v_nulls;
        END IF;
    END LOOP;

    RAISE NOTICE 'Pre-flight 4 OK: zero NULL astra_id values across 15 in-scope tables.';
END $$;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight 5 · Enumerate existing policies on the 15 in-scope tables.
-- This is informational only — RAISE NOTICE so the operator sees what's
-- about to be dropped. Does not modify catalog state.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_rec record;
BEGIN
    RAISE NOTICE '─── Pre-flight 5: existing policies that will be DROPPED ───';
    FOR v_rec IN
        SELECT schemaname, tablename, policyname
          FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename IN (
               'pillars', 'groups', 'group_memberships', 'events', 'event_rsvps',
               'forum_threads', 'forum_posts', 'chat_rooms', 'bazaar_listings',
               'give_campaigns', 'give_contributions', 'entity_atom_links',
               'entity_reactions', 'entity_shares', 'promotions'
           )
         ORDER BY tablename, policyname
    LOOP
        RAISE NOTICE '  DROP %.%', v_rec.tablename, v_rec.policyname;
    END LOOP;
    RAISE NOTICE '─── (end policy enumeration) ───';
END $$;

-- ───────────────────────────────────────────────────────────────────────
-- Block A · Drop every existing policy on each of the 15 in-scope tables.
-- All existing policies are obsolete in the new world (none account for
-- astra_id, which is now NOT NULL on every row). Wholesale replacement.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_rec record;
BEGIN
    FOR v_rec IN
        SELECT schemaname, tablename, policyname
          FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename IN (
               'pillars', 'groups', 'group_memberships', 'events', 'event_rsvps',
               'forum_threads', 'forum_posts', 'chat_rooms', 'bazaar_listings',
               'give_campaigns', 'give_contributions', 'entity_atom_links',
               'entity_reactions', 'entity_shares', 'promotions'
           )
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON public.%I',
            v_rec.policyname, v_rec.tablename
        );
    END LOOP;
END $$;

-- ───────────────────────────────────────────────────────────────────────
-- Block B · Create per-table SELECT bridge policies + service-role-only
-- write policies.
--
-- 14 of 15 tables get the standard nova-aware variant (Migration B added
-- both astra_id NOT NULL and nova_id nullable to them). The 15th table
-- (`pillars`) gets an astra_id-only variant — see #SCH-11 above for why.
--
-- Policy naming convention (idempotent re-runs on identical body):
--   <T>_astra_isolation_select   — the SELECT bridge policy
--   <T>_service_role_write       — the ALL policy gated on service_role
-- ───────────────────────────────────────────────────────────────────────

-- ── pillars ───────────────────────────────────────────────────────────
-- ASTRA_ID ONLY — no nova_id check. Pillar-config rows are conceptually
-- per-Astra and never per-Nova. Tracked deprecation: #SCH-11 (consolidate
-- pillars into astra_registry in a follow-up session).
ALTER TABLE public.pillars ENABLE ROW LEVEL SECURITY;
CREATE POLICY pillars_astra_isolation_select ON public.pillars
    FOR SELECT USING (
        astra_id IS NULL
        OR astra_id = current_setting('request.astra_id', true)::uuid
        OR auth.role() = 'service_role'
    );
CREATE POLICY pillars_service_role_write ON public.pillars
    FOR ALL USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');

-- ── groups ────────────────────────────────────────────────────────────
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY groups_astra_isolation_select ON public.groups
    FOR SELECT USING (
        (astra_id IS NULL
            OR astra_id = current_setting('request.astra_id', true)::uuid)
        AND (nova_id IS NULL
            OR nova_id  = current_setting('request.nova_id',  true)::uuid)
        OR auth.role() = 'service_role'
    );
CREATE POLICY groups_service_role_write ON public.groups
    FOR ALL USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');

-- ── group_memberships ─────────────────────────────────────────────────
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY group_memberships_astra_isolation_select ON public.group_memberships
    FOR SELECT USING (
        (astra_id IS NULL
            OR astra_id = current_setting('request.astra_id', true)::uuid)
        AND (nova_id IS NULL
            OR nova_id  = current_setting('request.nova_id',  true)::uuid)
        OR auth.role() = 'service_role'
    );
CREATE POLICY group_memberships_service_role_write ON public.group_memberships
    FOR ALL USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');

-- ── events ────────────────────────────────────────────────────────────
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY events_astra_isolation_select ON public.events
    FOR SELECT USING (
        (astra_id IS NULL
            OR astra_id = current_setting('request.astra_id', true)::uuid)
        AND (nova_id IS NULL
            OR nova_id  = current_setting('request.nova_id',  true)::uuid)
        OR auth.role() = 'service_role'
    );
CREATE POLICY events_service_role_write ON public.events
    FOR ALL USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');

-- ── event_rsvps ───────────────────────────────────────────────────────
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY event_rsvps_astra_isolation_select ON public.event_rsvps
    FOR SELECT USING (
        (astra_id IS NULL
            OR astra_id = current_setting('request.astra_id', true)::uuid)
        AND (nova_id IS NULL
            OR nova_id  = current_setting('request.nova_id',  true)::uuid)
        OR auth.role() = 'service_role'
    );
CREATE POLICY event_rsvps_service_role_write ON public.event_rsvps
    FOR ALL USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');

-- ── forum_threads ─────────────────────────────────────────────────────
ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY forum_threads_astra_isolation_select ON public.forum_threads
    FOR SELECT USING (
        (astra_id IS NULL
            OR astra_id = current_setting('request.astra_id', true)::uuid)
        AND (nova_id IS NULL
            OR nova_id  = current_setting('request.nova_id',  true)::uuid)
        OR auth.role() = 'service_role'
    );
CREATE POLICY forum_threads_service_role_write ON public.forum_threads
    FOR ALL USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');

-- ── forum_posts ───────────────────────────────────────────────────────
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY forum_posts_astra_isolation_select ON public.forum_posts
    FOR SELECT USING (
        (astra_id IS NULL
            OR astra_id = current_setting('request.astra_id', true)::uuid)
        AND (nova_id IS NULL
            OR nova_id  = current_setting('request.nova_id',  true)::uuid)
        OR auth.role() = 'service_role'
    );
CREATE POLICY forum_posts_service_role_write ON public.forum_posts
    FOR ALL USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');

-- ── chat_rooms ────────────────────────────────────────────────────────
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY chat_rooms_astra_isolation_select ON public.chat_rooms
    FOR SELECT USING (
        (astra_id IS NULL
            OR astra_id = current_setting('request.astra_id', true)::uuid)
        AND (nova_id IS NULL
            OR nova_id  = current_setting('request.nova_id',  true)::uuid)
        OR auth.role() = 'service_role'
    );
CREATE POLICY chat_rooms_service_role_write ON public.chat_rooms
    FOR ALL USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');

-- ── bazaar_listings ───────────────────────────────────────────────────
ALTER TABLE public.bazaar_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY bazaar_listings_astra_isolation_select ON public.bazaar_listings
    FOR SELECT USING (
        (astra_id IS NULL
            OR astra_id = current_setting('request.astra_id', true)::uuid)
        AND (nova_id IS NULL
            OR nova_id  = current_setting('request.nova_id',  true)::uuid)
        OR auth.role() = 'service_role'
    );
CREATE POLICY bazaar_listings_service_role_write ON public.bazaar_listings
    FOR ALL USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');

-- ── give_campaigns ────────────────────────────────────────────────────
ALTER TABLE public.give_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY give_campaigns_astra_isolation_select ON public.give_campaigns
    FOR SELECT USING (
        (astra_id IS NULL
            OR astra_id = current_setting('request.astra_id', true)::uuid)
        AND (nova_id IS NULL
            OR nova_id  = current_setting('request.nova_id',  true)::uuid)
        OR auth.role() = 'service_role'
    );
CREATE POLICY give_campaigns_service_role_write ON public.give_campaigns
    FOR ALL USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');

-- ── give_contributions ────────────────────────────────────────────────
ALTER TABLE public.give_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY give_contributions_astra_isolation_select ON public.give_contributions
    FOR SELECT USING (
        (astra_id IS NULL
            OR astra_id = current_setting('request.astra_id', true)::uuid)
        AND (nova_id IS NULL
            OR nova_id  = current_setting('request.nova_id',  true)::uuid)
        OR auth.role() = 'service_role'
    );
CREATE POLICY give_contributions_service_role_write ON public.give_contributions
    FOR ALL USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');

-- ── entity_atom_links ─────────────────────────────────────────────────
ALTER TABLE public.entity_atom_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY entity_atom_links_astra_isolation_select ON public.entity_atom_links
    FOR SELECT USING (
        (astra_id IS NULL
            OR astra_id = current_setting('request.astra_id', true)::uuid)
        AND (nova_id IS NULL
            OR nova_id  = current_setting('request.nova_id',  true)::uuid)
        OR auth.role() = 'service_role'
    );
CREATE POLICY entity_atom_links_service_role_write ON public.entity_atom_links
    FOR ALL USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');

-- ── entity_reactions ──────────────────────────────────────────────────
-- KEPT astra-scoped (conversational context belongs to the Astra where
-- the reaction occurred). Sister table entity_saves is EXCLUDED — saves
-- are personal Bee organization, not conversational context. See header
-- inventory for the distinction.
ALTER TABLE public.entity_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY entity_reactions_astra_isolation_select ON public.entity_reactions
    FOR SELECT USING (
        (astra_id IS NULL
            OR astra_id = current_setting('request.astra_id', true)::uuid)
        AND (nova_id IS NULL
            OR nova_id  = current_setting('request.nova_id',  true)::uuid)
        OR auth.role() = 'service_role'
    );
CREATE POLICY entity_reactions_service_role_write ON public.entity_reactions
    FOR ALL USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');

-- ── entity_shares ─────────────────────────────────────────────────────
ALTER TABLE public.entity_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY entity_shares_astra_isolation_select ON public.entity_shares
    FOR SELECT USING (
        (astra_id IS NULL
            OR astra_id = current_setting('request.astra_id', true)::uuid)
        AND (nova_id IS NULL
            OR nova_id  = current_setting('request.nova_id',  true)::uuid)
        OR auth.role() = 'service_role'
    );
CREATE POLICY entity_shares_service_role_write ON public.entity_shares
    FOR ALL USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');

-- ── promotions ────────────────────────────────────────────────────────
-- Phase C added is_admin-gated INSERT/UPDATE/DELETE policies. Block A
-- above drops those; the service-role-only write policy below replaces
-- them. Admin checks now move from RLS to function-body logic in
-- service-role Edge Functions — consistent with the rest of Lock 8.
--
-- This table also carries a legacy `astra_slug TEXT` column from Phase C
-- (Component D-2 — Astra targeting). Migration B adds `astra_id UUID
-- NOT NULL REFERENCES astra_registry(id)` alongside it. The new SELECT
-- policy uses `astra_id` only (the canonical); `astra_slug` is dead
-- weight pending the deprecation migration tracked as #SCH-12.
-- Reader queries that filter by `astra_slug` need to migrate to
-- filtering by `astra_id` before `astra_slug` can be dropped.
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY promotions_astra_isolation_select ON public.promotions
    FOR SELECT USING (
        (astra_id IS NULL
            OR astra_id = current_setting('request.astra_id', true)::uuid)
        AND (nova_id IS NULL
            OR nova_id  = current_setting('request.nova_id',  true)::uuid)
        OR auth.role() = 'service_role'
    );
CREATE POLICY promotions_service_role_write ON public.promotions
    FOR ALL USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');

COMMIT;

-- =============================================================================
-- Verification queries — run AFTER apply (NOT inside the transaction).
-- =============================================================================
--
-- 1. Every in-scope table has exactly 2 policies (the new SELECT bridge + the
--    ALL service-role write):
-- SELECT tablename, COUNT(*) AS policy_count,
--        string_agg(policyname, ', ' ORDER BY policyname) AS policies
--   FROM pg_policies
--  WHERE schemaname = 'public'
--    AND tablename IN (
--        'pillars', 'groups', 'group_memberships', 'events', 'event_rsvps',
--        'forum_threads', 'forum_posts', 'chat_rooms', 'bazaar_listings',
--        'give_campaigns', 'give_contributions', 'entity_atom_links',
--        'entity_reactions', 'entity_shares', 'promotions'
--    )
--  GROUP BY tablename
--  ORDER BY tablename;
-- → 15 rows, each policy_count = 2, policies named
--   '<T>_astra_isolation_select, <T>_service_role_write'.
--
-- 2. RLS is enabled on every in-scope table:
-- SELECT tablename, rowsecurity
--   FROM pg_tables
--  WHERE schemaname = 'public'
--    AND tablename IN (
--        'pillars', 'groups', 'group_memberships', 'events', 'event_rsvps',
--        'forum_threads', 'forum_posts', 'chat_rooms', 'bazaar_listings',
--        'give_campaigns', 'give_contributions', 'entity_atom_links',
--        'entity_reactions', 'entity_shares', 'promotions'
--    )
--  ORDER BY tablename;
-- → 15 rows, all rowsecurity = true.
--
-- 3. Excluded tables (DM family + entity_saves) retain their OLD policies
--    (this migration does NOT touch them):
-- SELECT tablename, COUNT(*) AS policy_count
--   FROM pg_policies
--  WHERE schemaname = 'public'
--    AND tablename IN ('message_threads', 'message_participants', 'messages', 'entity_saves')
--  GROUP BY tablename
--  ORDER BY tablename;
-- → policy counts should match pre-migration state for these 4 tables.
--   Confirms no accidental scope creep.
--
-- 4. pillars policy is the astra_id-only variant (no nova_id reference):
-- SELECT pg_get_expr(qual, polrelid::regclass::oid) AS using_clause
--   FROM pg_policy p
--   JOIN pg_class c ON c.oid = p.polrelid
--  WHERE c.relname = 'pillars'
--    AND p.polname = 'pillars_astra_isolation_select';
-- → must contain 'astra_id', must NOT contain 'nova_id'.
--
-- 5. Bridge USING clause exact-shape check on a sample nova-aware table:
-- SELECT pg_get_expr(qual, polrelid::regclass::oid) AS using_clause
--   FROM pg_policy p
--   JOIN pg_class c ON c.oid = p.polrelid
--  WHERE c.relname = 'forum_posts'
--    AND p.polname = 'forum_posts_astra_isolation_select';
-- → must include "astra_id IS NULL", "current_setting('request.astra_id', true)",
--   "nova_id IS NULL", "current_setting('request.nova_id', true)", and
--   "auth.role() = 'service_role'".
--
-- 6. Live-Astra read smoke test (run via supabase-js as an authenticated
--    Bee on TheMANUAL.tech with the request.astra_id GUC stamped):
--    a. SELECT FROM forum_posts LIMIT 1;        -- expect a row
--    b. SET LOCAL request.astra_id TO '00000000-0000-0000-0000-000000000000';
--       SELECT FROM forum_posts LIMIT 1;        -- expect zero rows (wrong astra)
--    c. RESET request.astra_id;
--       SELECT FROM forum_posts LIMIT 1;        -- expect a row (bridge IS NULL
--                                                  fallback engages until B's
--                                                  backfill is fully verified)
-- → (a) and (c) return rows; (b) returns zero rows; service_role bypasses all
--   three.
--
-- 7. Cross-Astra leak test — the new policy must reject reads keyed to a
--    different Astra UUID even if request.astra_id is set to that value:
-- (run as a non-service-role caller)
-- SET LOCAL request.astra_id TO '<some-other-astra-uuid>';
-- SELECT COUNT(*) FROM public.forum_posts;
-- → 0 (no leak across astra_id boundaries).
--
-- 8. DM family unaffected — Bee A on TheMANUAL.tech can still see DMs with
--    Bee B regardless of which Astra either Bee is currently visiting:
-- (run via supabase-js as Bee A; verify message_threads / messages still
--  return rows from any Astra context. Pre-migration RLS on these tables
--  remains unchanged.)
--
-- 9. entity_saves unaffected — Bee can still see their saved items
--    regardless of current Astra context:
-- (run via supabase-js as authenticated Bee; SELECT FROM entity_saves
--  WHERE bee_id = current Bee returns same rows as before migration.)
--
-- 10. Edge Function rollout readiness check (BEFORE dropping the IS NULL
--     bridge in any follow-up):
-- SELECT current_setting('request.astra_id', true);
-- → must return a non-NULL UUID for every Astra Edge Function before the
--   bridge clause can be safely tightened.
--
-- =============================================================================
-- Cross-references
-- =============================================================================
--   • Lock 8 spec — federation-tier-1-scoping.md lines 202-237
--   • Wednesday execution plan — wednesday-2026-05-13-lock8-prescope.md
--       §3a (sequence), §3b (cutover risk + Approach 1/2/3 framing)
--   • Migration B canon list — wednesday-2026-05-13-lock8-prescope.md §4
--   • Live-Astra blast radius mitigation — wednesday-prescope.md §6 row 1
--   • Lock 9 DB exclusion list (why bling_*, atoms, bee_profiles excluded)
--       — federation-tier-1-scoping.md §Lock 9 lines 240-282
--   • Open #SCH-2 (slug naming) and #SCH-3 (nova_registry.tier) — should
--     have been resolved at Migration A authoring time; verify before
--     applying this migration.
--   • Open #SCH-11 — pillars / astra_registry consolidation (tracked in
--     header; not yet logged to open-questions-current.md).
--   • Open #SCH-12 — promotions.astra_slug deprecation (tracked in header;
--     not yet logged to open-questions-current.md).
-- =============================================================================


-- =============================================================================
-- ROLLBACK (commented out — read carefully before considering)
-- =============================================================================
--
-- ⚠ ROLLBACK ORDER MATTERS (mirrors Migration A + Migration B rollback
-- discipline).
--
--   Roll back Migration C BEFORE Migration B.
--   Roll back Migration B BEFORE Migration A.
--
-- Reason: Migration B drops the astra_id / nova_id columns that this
-- migration's policy predicates reference. If Migration B's column drops
-- run while these 30 policies still exist, the DROP COLUMN statements
-- abort with "cannot drop column astra_id because other objects depend
-- on it" (the policies' qual expressions are the dependent objects).
-- Similarly, Migration A's astra_registry / nova_registry table drops
-- would fail with FK-dependency errors from Migration B's per-table
-- columns if B isn't rolled back first.
--
-- ⚠ ROLLBACK RESTORES NOTHING AUTOMATICALLY.
--
-- After running the rollback below, the 15 in-scope tables will be in
-- the following state:
--   • RLS DISABLED on every table (Block C2 below).
--   • ZERO policies on every table (Block C1 dropped the 30 lock8 policies,
--     and Block A of the original apply had already dropped every
--     pre-existing policy — those are gone and not restored here).
--   • astra_id / nova_id columns still present (those belong to Migration
--     B, not C).
--
-- This means: post-rollback, the 15 tables are FULLY UNGATED. Every read
-- from every role returns every row, and every write from every role
-- succeeds. That is a strictly more permissive state than pre-Migration-C
-- production — DO NOT leave the catalog in this state for any meaningful
-- duration.
--
-- To restore the pre-Lock-8 RLS posture, the original SELECT and
-- INSERT/UPDATE/DELETE policies on each of the 15 tables must be
-- RE-CREATED from their source migrations. Likely sources (verify per
-- table — the snapshot recommendation below is the authoritative path):
--   • supabase/schema-v8-bling-themanual.sql           — v8 lineage RLS on
--                                                         the original tables
--   • supabase/schema-v2-surfaces.sql                  — surfaces lineage
--                                                         (groups / events /
--                                                          forum_* /
--                                                          chat_rooms /
--                                                          bazaar_listings /
--                                                          give_*)
--   • 20260508120000_phase_c_schema_foundations.sql    — any Phase C policy
--                                                         touches
--   • migrations 23 / 24 (v9 security)                 — REVOKE/GRANT layer
--
-- 🔒 RECOMMENDED PRACTICE (per Wednesday pre-scope §4):
-- BEFORE applying Migration C, capture a snapshot of every policy on the
-- 15 tables — this snapshot is the authoritative source for restoration
-- if rollback is ever needed. The schema files above may have drifted
-- from production reality. From SQL Studio:
--
--   SELECT tablename, policyname, cmd, permissive, roles, qual, with_check
--     FROM pg_policies
--    WHERE schemaname = 'public'
--      AND tablename IN (
--          'pillars', 'groups', 'group_memberships', 'events', 'event_rsvps',
--          'forum_threads', 'forum_posts', 'chat_rooms', 'bazaar_listings',
--          'give_campaigns', 'give_contributions',
--          'entity_atom_links', 'entity_reactions', 'entity_shares', 'promotions'
--      )
--    ORDER BY tablename, policyname;
--
-- Save the output (CSV, gist, handoff doc) before applying.
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🚫 STRONG RECOMMENDATION: FORWARD-FIX ONLY.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- If Migration C produces unexpected behavior after apply (live Astras
-- read as empty, etc.), the preferred mitigation is FORWARD-FIX, not
-- rollback:
--   • If Edge Functions aren't stamping request.astra_id yet, hot-patch
--     the client init to call set_config('request.astra_id', '<uuid>',
--     true) at session start. This restores reads without touching RLS.
--   • If a specific policy body is wrong, author Migration C-prime that
--     uses DROP POLICY + CREATE POLICY to refresh just the affected
--     policies — surgical, auditable, low blast radius.
--   • If the entire Lock 8 isolation posture needs to back out, author
--     Migration C-prime that DROPs the 30 lock8 policies AND immediately
--     re-creates the originals (from the snapshot above). Single
--     transaction; no exposure window.
--
-- The rollback script below exists for completeness and disaster recovery,
-- not for routine use. Production should not see this rollback executed.
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ROLLBACK SCRIPT (commented out)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- BEGIN;
--
-- -- ── Block C1 · Drop all 30 lock8 policies (15 tables × 2 each) ─────
-- DROP POLICY IF EXISTS pillars_astra_isolation_select            ON public.pillars;
-- DROP POLICY IF EXISTS pillars_service_role_write                ON public.pillars;
-- DROP POLICY IF EXISTS groups_astra_isolation_select             ON public.groups;
-- DROP POLICY IF EXISTS groups_service_role_write                 ON public.groups;
-- DROP POLICY IF EXISTS group_memberships_astra_isolation_select  ON public.group_memberships;
-- DROP POLICY IF EXISTS group_memberships_service_role_write      ON public.group_memberships;
-- DROP POLICY IF EXISTS events_astra_isolation_select             ON public.events;
-- DROP POLICY IF EXISTS events_service_role_write                 ON public.events;
-- DROP POLICY IF EXISTS event_rsvps_astra_isolation_select        ON public.event_rsvps;
-- DROP POLICY IF EXISTS event_rsvps_service_role_write            ON public.event_rsvps;
-- DROP POLICY IF EXISTS forum_threads_astra_isolation_select      ON public.forum_threads;
-- DROP POLICY IF EXISTS forum_threads_service_role_write          ON public.forum_threads;
-- DROP POLICY IF EXISTS forum_posts_astra_isolation_select        ON public.forum_posts;
-- DROP POLICY IF EXISTS forum_posts_service_role_write            ON public.forum_posts;
-- DROP POLICY IF EXISTS chat_rooms_astra_isolation_select         ON public.chat_rooms;
-- DROP POLICY IF EXISTS chat_rooms_service_role_write             ON public.chat_rooms;
-- DROP POLICY IF EXISTS bazaar_listings_astra_isolation_select    ON public.bazaar_listings;
-- DROP POLICY IF EXISTS bazaar_listings_service_role_write        ON public.bazaar_listings;
-- DROP POLICY IF EXISTS give_campaigns_astra_isolation_select     ON public.give_campaigns;
-- DROP POLICY IF EXISTS give_campaigns_service_role_write         ON public.give_campaigns;
-- DROP POLICY IF EXISTS give_contributions_astra_isolation_select ON public.give_contributions;
-- DROP POLICY IF EXISTS give_contributions_service_role_write     ON public.give_contributions;
-- DROP POLICY IF EXISTS entity_atom_links_astra_isolation_select  ON public.entity_atom_links;
-- DROP POLICY IF EXISTS entity_atom_links_service_role_write      ON public.entity_atom_links;
-- DROP POLICY IF EXISTS entity_reactions_astra_isolation_select   ON public.entity_reactions;
-- DROP POLICY IF EXISTS entity_reactions_service_role_write       ON public.entity_reactions;
-- DROP POLICY IF EXISTS entity_shares_astra_isolation_select      ON public.entity_shares;
-- DROP POLICY IF EXISTS entity_shares_service_role_write          ON public.entity_shares;
-- DROP POLICY IF EXISTS promotions_astra_isolation_select         ON public.promotions;
-- DROP POLICY IF EXISTS promotions_service_role_write             ON public.promotions;
--
-- -- ── Block C2 · Disable RLS on the 15 in-scope tables ──────────────
-- -- This restores the pre-Migration-C "RLS off" state IF Migration C is
-- -- the only thing that enabled RLS on these tables. If RLS was already
-- -- enabled before Migration C (likely true for most of the 15), KEEP RLS
-- -- ON and rely on the policy snapshot above to re-create the original
-- -- policies instead. Uncommenting these DISABLE statements without
-- -- having re-created the originals first leaves the tables fully ungated.
-- --
-- -- ALTER TABLE public.pillars             DISABLE ROW LEVEL SECURITY;
-- -- ALTER TABLE public.groups              DISABLE ROW LEVEL SECURITY;
-- -- ALTER TABLE public.group_memberships   DISABLE ROW LEVEL SECURITY;
-- -- ALTER TABLE public.events              DISABLE ROW LEVEL SECURITY;
-- -- ALTER TABLE public.event_rsvps         DISABLE ROW LEVEL SECURITY;
-- -- ALTER TABLE public.forum_threads       DISABLE ROW LEVEL SECURITY;
-- -- ALTER TABLE public.forum_posts         DISABLE ROW LEVEL SECURITY;
-- -- ALTER TABLE public.chat_rooms          DISABLE ROW LEVEL SECURITY;
-- -- ALTER TABLE public.bazaar_listings     DISABLE ROW LEVEL SECURITY;
-- -- ALTER TABLE public.give_campaigns      DISABLE ROW LEVEL SECURITY;
-- -- ALTER TABLE public.give_contributions  DISABLE ROW LEVEL SECURITY;
-- -- ALTER TABLE public.entity_atom_links   DISABLE ROW LEVEL SECURITY;
-- -- ALTER TABLE public.entity_reactions    DISABLE ROW LEVEL SECURITY;
-- -- ALTER TABLE public.entity_shares       DISABLE ROW LEVEL SECURITY;
-- -- ALTER TABLE public.promotions          DISABLE ROW LEVEL SECURITY;
-- --
-- -- DEFAULT: leave RLS ON. Re-create the original policies (per the
-- -- snapshot above) IN THE SAME TRANSACTION as the DROPs in Block C1.
-- -- That single-transaction pattern avoids any exposure window where
-- -- the tables are RLS-on-but-policy-less (effectively deny-all-non-
-- -- service-role) OR RLS-off (effectively allow-all).
--
-- COMMIT;
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- POST-ROLLBACK STATE CHECK
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- After running the rollback, confirm the catalog state:
--
--   SELECT tablename, rowsecurity,
--          (SELECT count(*) FROM pg_policies p
--             WHERE p.schemaname = 'public' AND p.tablename = t.tablename) AS policy_count
--     FROM pg_tables t
--    WHERE schemaname = 'public'
--      AND tablename IN (
--          'pillars', 'groups', 'group_memberships', 'events', 'event_rsvps',
--          'forum_threads', 'forum_posts', 'chat_rooms', 'bazaar_listings',
--          'give_campaigns', 'give_contributions',
--          'entity_atom_links', 'entity_reactions', 'entity_shares', 'promotions'
--      )
--    ORDER BY tablename;
--
-- Expected immediately after rollback (Block C1 only, no C2 DISABLE):
--   rowsecurity = true, policy_count = 0 for all 15 rows.
--   → Tables are RLS-on but policy-less → reads return zero rows for
--     non-service-role, writes denied → effectively production-down for
--     these surfaces until originals are re-created.
--
-- This is the strongest argument for forward-fix-only. The rollback path
-- is a 60-second window of production-down even when executed perfectly.
-- =============================================================================
