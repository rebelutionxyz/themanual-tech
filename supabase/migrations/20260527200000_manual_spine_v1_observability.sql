-- =============================================================================
-- Migration 20260527200000 — Manual Spine v1 observability + tier expansion
-- =============================================================================
-- Date:    2026-05-27
-- Author:  Code (Claude Opus 4.7) — supervised by Butch (OG HUMAN)
-- Source:  shared/canon/manual-spine-api-v1.md §4
--          shared/canon/manual-spine-api-v1-amendment-1.md §2.1, §2.5
--
-- Purpose:
--   Three changes in one migration:
--
--   1. DISCOVERY LADDER 4→5 TIER EXPANSION (per amendment §2.1)
--      Production currently allows kettle ∈ {Accepted, Contested, Emerging,
--      Fringe} on both atoms and atom_kettle_votes. Canonical 5-tier model
--      is {Sourced, Accepted, Emerging, Fringe, Unsourced}. Migrate 107
--      Contested atoms → Emerging (no semantic loss; Contested conceptually
--      overlaps with Emerging). Then expand CHECK to the 5-tier set.
--      atom_kettle_votes has 0 rows so no row migration there, only the
--      CHECK update.
--
--   2. OBSERVABILITY TABLES (per original spec §4.3)
--      - failed_login_events  (admin-only read, attempted_at / ip / agent / reason)
--      - page_view_events     (admin-only read, bee/anon, astra_slug, page_path)
--
--   3. TRENDING MATERIALIZED VIEWS (per amendment §2.5)
--      - atom_trending_24h, _7d, _30d — simple vote-count + total-weight per
--        window (NOT up/down velocity; that model doesn't fit tier-classification
--        voting). Unique index on atom_id for REFRESH CONCURRENTLY support.
--        refresh_atom_trending() function refreshes all three.
--
-- Deferred (out of this migration's scope, noted in dispatch commit):
--   - pg_cron schedule for refresh (pg_cron extension not enabled on the
--     project; needs Supabase dashboard enable or support ticket).
--     Materialized views will need MANUAL refresh until cron lands.
--   - rpc_rate_caps + enforce_rpc_rate_cap helper (DingleBERRY backend
--     stubs haven't shipped yet; rate caps deferred to dedicated dispatch).
--
-- Content-leak posture (preserved):
--   No directive-style content columns added. Atoms remain the public canon;
--   failed_login_events / page_view_events carry operational metadata only.
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight: confirm atoms + atom_kettle_votes + bees tables exist.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_atoms_exists       boolean;
    v_kvotes_exists      boolean;
    v_bees_exists        boolean;
    v_contested_count    integer;
BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables
                    WHERE table_schema='public' AND table_name='atoms')
      INTO v_atoms_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables
                    WHERE table_schema='public' AND table_name='atom_kettle_votes')
      INTO v_kvotes_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables
                    WHERE table_schema='public' AND table_name='bees')
      INTO v_bees_exists;
    IF NOT v_atoms_exists OR NOT v_kvotes_exists OR NOT v_bees_exists THEN
        RAISE EXCEPTION 'Pre-flight failed: atoms / atom_kettle_votes / bees missing.';
    END IF;

    SELECT count(*) INTO v_contested_count
      FROM public.atoms WHERE kettle = 'Contested';
    RAISE NOTICE 'Pre-flight: % atoms with kettle=Contested will be migrated to Emerging.', v_contested_count;
END
$$;


-- =============================================================================
-- BLOCK A — Discovery Ladder 4→5 tier expansion.
-- =============================================================================
-- Order matters: migrate Contested rows FIRST (while old CHECK still permits
-- 'Contested'), THEN swap the CHECK to the 5-tier set. Doing it in the other
-- order would force every row update to also satisfy the new CHECK, which is
-- fine for Contested→Emerging but is more brittle if future migrations add
-- intermediate states.

UPDATE public.atoms
   SET kettle = 'Emerging'
 WHERE kettle = 'Contested';

ALTER TABLE public.atoms
    DROP CONSTRAINT IF EXISTS atoms_kettle_check;
ALTER TABLE public.atoms
    ADD  CONSTRAINT atoms_kettle_check
    CHECK (kettle IN ('Sourced', 'Accepted', 'Emerging', 'Fringe', 'Unsourced'));

-- atom_kettle_votes has zero rows in production today; the CHECK swap is a
-- no-op for data but a forward enabler for the new tier-classification vote
-- shape.
ALTER TABLE public.atom_kettle_votes
    DROP CONSTRAINT IF EXISTS atom_kettle_votes_kettle_check;
ALTER TABLE public.atom_kettle_votes
    ADD  CONSTRAINT atom_kettle_votes_kettle_check
    CHECK (kettle IN ('Sourced', 'Accepted', 'Emerging', 'Fringe', 'Unsourced'));


-- =============================================================================
-- BLOCK B — failed_login_events
-- =============================================================================
-- Admin-only read via bees.is_admin = true. Inserts come from auth-hook
-- service-role writes (server-side; never from authenticated Bee context).

CREATE TABLE IF NOT EXISTS public.failed_login_events (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    attempted_at     timestamptz NOT NULL DEFAULT now(),
    email_attempted  text,
    ip_address       inet,
    user_agent       text,
    failure_reason   text
);

CREATE INDEX IF NOT EXISTS failed_login_events_recent_idx
    ON public.failed_login_events (attempted_at DESC);

ALTER TABLE public.failed_login_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS failed_login_events_admin_read ON public.failed_login_events;
CREATE POLICY failed_login_events_admin_read
    ON public.failed_login_events
    FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.bees
         WHERE id = auth.uid() AND is_admin = true
    ));


-- =============================================================================
-- BLOCK C — page_view_events
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.page_view_events (
    id          bigserial PRIMARY KEY,
    bee_id      uuid REFERENCES public.bees(id),  -- nullable for anon traffic
    astra_slug  text NOT NULL,
    page_path   text NOT NULL,
    viewed_at   timestamptz NOT NULL DEFAULT now(),
    referrer    text,
    user_agent  text
);

CREATE INDEX IF NOT EXISTS page_view_events_recent_idx
    ON public.page_view_events (viewed_at DESC);
CREATE INDEX IF NOT EXISTS page_view_events_astra_idx
    ON public.page_view_events (astra_slug, viewed_at DESC);

ALTER TABLE public.page_view_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS page_view_events_admin_read ON public.page_view_events;
CREATE POLICY page_view_events_admin_read
    ON public.page_view_events
    FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.bees
         WHERE id = auth.uid() AND is_admin = true
    ));


-- =============================================================================
-- BLOCK D — Trending materialized views (simple vote count per window).
-- =============================================================================
-- Per amendment §2.5: simple count + total weight per window. The previous
-- up/down delta from the original spec §4.4 doesn't fit tier-classification
-- voting. Unique index on atom_id supports REFRESH CONCURRENTLY.
--
-- DROP-then-CREATE because materialized views don't accept IF NOT EXISTS;
-- the alternative (CREATE OR REPLACE) doesn't exist for materialized views
-- either. Safe to drop because the view is a cache, not authoritative state.
-- =============================================================================

DROP MATERIALIZED VIEW IF EXISTS public.atom_trending_24h;
CREATE MATERIALIZED VIEW public.atom_trending_24h AS
SELECT
    atom_id,
    COUNT(*)        AS vote_count_24h,
    SUM(weight)     AS total_weight_24h
  FROM public.atom_kettle_votes
 WHERE created_at > now() - interval '24 hours'
 GROUP BY atom_id
 ORDER BY vote_count_24h DESC
 LIMIT 100;

CREATE UNIQUE INDEX IF NOT EXISTS atom_trending_24h_atom_idx
    ON public.atom_trending_24h (atom_id);

DROP MATERIALIZED VIEW IF EXISTS public.atom_trending_7d;
CREATE MATERIALIZED VIEW public.atom_trending_7d AS
SELECT
    atom_id,
    COUNT(*)        AS vote_count_7d,
    SUM(weight)     AS total_weight_7d
  FROM public.atom_kettle_votes
 WHERE created_at > now() - interval '7 days'
 GROUP BY atom_id
 ORDER BY vote_count_7d DESC
 LIMIT 100;

CREATE UNIQUE INDEX IF NOT EXISTS atom_trending_7d_atom_idx
    ON public.atom_trending_7d (atom_id);

DROP MATERIALIZED VIEW IF EXISTS public.atom_trending_30d;
CREATE MATERIALIZED VIEW public.atom_trending_30d AS
SELECT
    atom_id,
    COUNT(*)        AS vote_count_30d,
    SUM(weight)     AS total_weight_30d
  FROM public.atom_kettle_votes
 WHERE created_at > now() - interval '30 days'
 GROUP BY atom_id
 ORDER BY vote_count_30d DESC
 LIMIT 100;

CREATE UNIQUE INDEX IF NOT EXISTS atom_trending_30d_atom_idx
    ON public.atom_trending_30d (atom_id);


-- =============================================================================
-- BLOCK E — refresh_atom_trending() helper.
-- =============================================================================
-- Refreshes all three materialized views CONCURRENTLY (requires the unique
-- indexes from Block D). Designed to be called by pg_cron */15 * * * *
-- once pg_cron is enabled on the project; for now invoke manually via
-- SELECT public.refresh_atom_trending().
-- =============================================================================

CREATE OR REPLACE FUNCTION public.refresh_atom_trending()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.atom_trending_24h;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.atom_trending_7d;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.atom_trending_30d;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.refresh_atom_trending() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.refresh_atom_trending() TO service_role;

COMMIT;
