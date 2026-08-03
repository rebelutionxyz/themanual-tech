-- =============================================================================
-- Migration 20260520120000 — AtlasOracle integration scaffolding
-- =============================================================================
-- Date:        2026-05-20
-- Author:      Code (Claude Opus 4.7) — supervised by Butch
-- Status:      UNAPPLIED. Apply after Butch reviews the SQL. Net-new tables,
--              no existing-table changes, no RLS rewrite on existing tables.
--              Safe to apply during business hours.
-- Source:      AtlasORACLE.to/whitepaper.md
--              AtlasORACLE.to/master_plan/*.md (canon)
--              AtlasOracle Code Handoff Brief (2026-05-20)
--
-- Purpose:
--   Lands the three tables that anchor AtlasOracle's directive-routing layer
--   inside The Manual's spine. AtlasOracle is NOT shipping as a standalone
--   Astra this round — it ships as integration infrastructure that other
--   Astra builds call. Public destination (atlasoracle.to) and the Builder
--   UI are post-Swarm scope.
--
--     atlasoracle_directives     — per-call metadata log. NO content retention.
--                                  Bee-scoped RLS. Lock-8 aligned via
--                                  astra_id NOT NULL + nova_id nullable.
--
--     atlasoracle_provider_pool  — provider catalog with current selection
--                                  weights and drift state. Public-read,
--                                  service-role write.
--
--     atlasoracle_canon_reads    — perf cache for master_plan reads.
--                                  Service-role only. Contents are also
--                                  in canonical Supabase storage; this table
--                                  saves the round-trip.
--
-- Deviations from the brief (documented for Butch's review):
--   * Brief used `astra_slug text` on directives. Migration uses
--     `astra_id uuid NOT NULL REFERENCES astra_registry(id)` to match
--     Lock 8 (20260513110000_lock8_b_per_table_astra_nova_columns.sql)
--     conventions across all content tables.
--   * Brief used `cost_bling numeric(20,2)`. Migration uses `numeric(20,6)`
--     to match Lock 7 BLiNG! precision (20260511100000_lock7_precision_tightening.sql).
--     Bee-facing display continues to round to 0.01 BLiNG!; internal
--     accounting precision is 0.000001 BLiNG! (1 FNU = 0.01 BLiNG!).
--   * Brief did not include nova_id. Migration adds nova_id (nullable) on
--     atlasoracle_directives so a directive issued from inside a Nova can
--     log scoping. Future Nova-specific drift / quota analytics depend on it.
--
-- Dependencies:
--   - astra_registry table MUST exist (Lock 8 A: 20260513100000).
--   - bees table exists (production).
--   - astra_or_nova_status enum need NOT exist for this migration — these
--     tables use boolean `active` / `success` instead of the federation enum.
--
-- Idempotency:
--   - CREATE TABLE IF NOT EXISTS on all three tables.
--   - All CHECK / UNIQUE constraints use DROP-then-ADD for refresh-on-rerun.
--   - Indexes use CREATE INDEX IF NOT EXISTS.
--   - RLS ENABLE is safe to re-run.
--   - Policy creation uses DROP POLICY IF EXISTS + CREATE POLICY.
--   - Seed INSERT uses ON CONFLICT (provider_name) DO NOTHING.
--   Re-applying after a successful first apply is a no-op.
--
-- Permission posture:
--   - atlasoracle_directives: a Bee can SELECT their own rows
--     (USING auth.uid() = bee_id). NO cross-Bee SELECT. INSERT/UPDATE/
--     DELETE through service_role only (Edge Function handles writes).
--   - atlasoracle_provider_pool: SELECT to authenticated (provider catalog
--     is operator information, not anon-public). Writes service_role only.
--   - atlasoracle_canon_reads: service_role only (cache table; no Bee
--     should ever read this directly — readCanon() runs server-side).
--
-- Content-leak posture:
--   * atlasoracle_directives has NO columns for directive prompt text or
--     response text. Only metadata: category, tier, provider, cost, latency,
--     success boolean. If a future schema change adds a content column,
--     that requires a separate plan-mode review.
--
-- House-style notes:
--   * Single BEGIN/COMMIT.
--   * Mirrors Lock 8 A's pre-flight + per-table pattern.
--   * Verification + rollback at end (commented).
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight: confirm astra_registry exists; detect already-applied state.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_astra_registry_exists  boolean;
    v_directives_exists      boolean;
    v_providers_exists       boolean;
    v_canon_reads_exists     boolean;
    v_present_tables         integer;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
         WHERE table_schema='public' AND table_name='astra_registry'
    ) INTO v_astra_registry_exists;

    IF NOT v_astra_registry_exists THEN
        RAISE EXCEPTION
            'Pre-flight failed: astra_registry table is absent. '
            'Lock 8 (A) migration (20260513100000_lock8_a_registries.sql) '
            'must apply first. Apply it, then re-run this migration.';
    END IF;

    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='atlasoracle_directives')    INTO v_directives_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='atlasoracle_provider_pool') INTO v_providers_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='atlasoracle_canon_reads')   INTO v_canon_reads_exists;

    v_present_tables := v_directives_exists::int + v_providers_exists::int + v_canon_reads_exists::int;

    IF v_present_tables = 0 THEN
        RAISE NOTICE 'Pre-flight OK: astra_registry present, no atlasoracle tables yet. Proceeding.';
    ELSIF v_present_tables = 3 THEN
        RAISE NOTICE 'AtlasOracle schema already applied (all three tables present). Idempotent re-run will refresh constraints / indexes / policies / seed rows without other effect.';
    ELSE
        RAISE NOTICE
            'Mixed state: directives=%, providers=%, canon_reads=%. '
            'IF NOT EXISTS guards will fill the gap; review post-apply.',
            v_directives_exists, v_providers_exists, v_canon_reads_exists;
    END IF;
END
$$;


-- =============================================================================
-- BLOCK A — TABLE atlasoracle_directives
-- =============================================================================
-- Per-call metadata log. ONE row per directive routed through AtlasOracle.
-- NO directive text. NO response text. Metadata only.
--
-- Bee-scoped RLS: a Bee can SELECT their own rows; no cross-Bee SELECT.
-- Writes happen only via service_role (Edge Function path).
--
-- Columns:
--   id                  — uuid PK
--   bee_id              — FK to bees (the Bee who issued the directive)
--   astra_id            — FK to astra_registry (which Astra spine issued the call)
--   nova_id             — FK to nova_registry (nullable — set when issued from a Nova)
--   directive_category  — one of 10 routing categories (CHECK enforced)
--   tier                — free | standard | frontier (CHECK enforced)
--   provider_selected   — provider_name string (nullable — null if router failed)
--   cost_bling          — numeric(20,6) — Lock 7 precision
--   latency_ms          — wall-clock latency (nullable on failure)
--   success             — boolean
--   created_at          — log timestamp
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.atlasoracle_directives (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bee_id              uuid NOT NULL REFERENCES public.bees(id),
    astra_id            uuid NOT NULL REFERENCES public.astra_registry(id),
    nova_id             uuid REFERENCES public.nova_registry(id),
    directive_category  text NOT NULL,
    tier                text NOT NULL,
    provider_selected   text,
    cost_bling          numeric(20,6) NOT NULL DEFAULT 0,
    latency_ms          integer,
    success             boolean,
    created_at          timestamptz NOT NULL DEFAULT now()
);

-- Category domain — the ten routing buckets per the brief.
ALTER TABLE public.atlasoracle_directives
    DROP CONSTRAINT IF EXISTS atlasoracle_directives_category_chk;
ALTER TABLE public.atlasoracle_directives
    ADD  CONSTRAINT atlasoracle_directives_category_chk
        CHECK (directive_category IN (
            'scaffold','draft','integrate','refactor','analyze',
            'classify','translate','estimate','correlate','suggest'
        ));

-- Tier domain.
ALTER TABLE public.atlasoracle_directives
    DROP CONSTRAINT IF EXISTS atlasoracle_directives_tier_chk;
ALTER TABLE public.atlasoracle_directives
    ADD  CONSTRAINT atlasoracle_directives_tier_chk
        CHECK (tier IN ('free','standard','frontier'));

-- Bee history lookup index — every "show my AtlasOracle history" query
-- hits this.
CREATE INDEX IF NOT EXISTS atlasoracle_directives_bee_created_idx
    ON public.atlasoracle_directives (bee_id, created_at DESC);

-- Astra-scoped analytics index.
CREATE INDEX IF NOT EXISTS atlasoracle_directives_astra_created_idx
    ON public.atlasoracle_directives (astra_id, created_at DESC);

ALTER TABLE public.atlasoracle_directives ENABLE ROW LEVEL SECURITY;

-- Bee-scoped SELECT — a Bee can read only their own directive history.
DROP POLICY IF EXISTS atlasoracle_directives_select_own ON public.atlasoracle_directives;
CREATE POLICY atlasoracle_directives_select_own
    ON public.atlasoracle_directives
    FOR SELECT
    TO authenticated
    USING (auth.uid() = bee_id);

-- No INSERT / UPDATE / DELETE policies → service_role bypass is the only
-- write path. Edge Function `atlasoracle-route` writes; the Bee never
-- writes this table directly.


-- =============================================================================
-- BLOCK B — TABLE atlasoracle_provider_pool
-- =============================================================================
-- Provider catalog with current selection weights and drift state.
-- Public-read (authenticated), service-role write.
--
-- Columns:
--   id                    — uuid PK
--   provider_name         — unique slug (e.g. 'claude-opus-4-7')
--   provider_category     — frontier | mid-tier | fast | oss | specialized
--   selection_weight      — numeric(5,3), default 1.000 — used by router
--   drift_flag            — boolean — set true when drift detector flags
--   last_drift_check_at   — when drift was last evaluated
--   active                — boolean — soft-disable without deleting
--   created_at            — registration timestamp
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.atlasoracle_provider_pool (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name         text NOT NULL,
    provider_category     text NOT NULL,
    selection_weight      numeric(5,3) NOT NULL DEFAULT 1.000,
    drift_flag            boolean NOT NULL DEFAULT false,
    last_drift_check_at   timestamptz,
    active                boolean NOT NULL DEFAULT true,
    created_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.atlasoracle_provider_pool
    DROP CONSTRAINT IF EXISTS atlasoracle_provider_pool_name_key;
ALTER TABLE public.atlasoracle_provider_pool
    ADD  CONSTRAINT atlasoracle_provider_pool_name_key UNIQUE (provider_name);

ALTER TABLE public.atlasoracle_provider_pool
    DROP CONSTRAINT IF EXISTS atlasoracle_provider_pool_category_chk;
ALTER TABLE public.atlasoracle_provider_pool
    ADD  CONSTRAINT atlasoracle_provider_pool_category_chk
        CHECK (provider_category IN ('frontier','mid-tier','fast','oss','specialized'));

-- Active-provider lookup index (every router selection hits this).
CREATE INDEX IF NOT EXISTS atlasoracle_provider_pool_active_idx
    ON public.atlasoracle_provider_pool (active)
    WHERE active = true;

ALTER TABLE public.atlasoracle_provider_pool ENABLE ROW LEVEL SECURITY;

-- Authenticated read — anyone signed in can see the pool.
DROP POLICY IF EXISTS atlasoracle_provider_pool_select_authenticated ON public.atlasoracle_provider_pool;
CREATE POLICY atlasoracle_provider_pool_select_authenticated
    ON public.atlasoracle_provider_pool
    FOR SELECT
    TO authenticated
    USING (true);

-- No INSERT / UPDATE / DELETE policies → service_role bypass only.


-- =============================================================================
-- BLOCK C — TABLE atlasoracle_canon_reads
-- =============================================================================
-- Perf cache for master_plan reads. Lookup key is (canon_path, canon_hash).
-- Service-role only — no Bee ever reads this directly; readCanon() runs
-- server-side.
--
-- Columns:
--   id            — uuid PK
--   canon_path    — full path of the canon file (e.g.
--                   'honeycomb/platform_thesis.md')
--   canon_hash    — content hash (sha256) — cache invalidates on hash mismatch
--   content       — cached canon text
--   last_read_at  — for LRU eviction analytics
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.atlasoracle_canon_reads (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    canon_path    text NOT NULL,
    canon_hash    text NOT NULL,
    content       text NOT NULL,
    last_read_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.atlasoracle_canon_reads
    DROP CONSTRAINT IF EXISTS atlasoracle_canon_reads_path_hash_key;
ALTER TABLE public.atlasoracle_canon_reads
    ADD  CONSTRAINT atlasoracle_canon_reads_path_hash_key UNIQUE (canon_path, canon_hash);

-- Cache hit-rate analytics: which paths get re-read most.
CREATE INDEX IF NOT EXISTS atlasoracle_canon_reads_path_idx
    ON public.atlasoracle_canon_reads (canon_path);

ALTER TABLE public.atlasoracle_canon_reads ENABLE ROW LEVEL SECURITY;

-- No SELECT / INSERT / UPDATE / DELETE policies → service_role bypass only.
-- RLS enabled with zero policies = deny-all to authenticated/anon.


-- =============================================================================
-- BLOCK D — Seed: 5 placeholder provider rows
-- =============================================================================
-- Per the brief. Real provider config (API endpoints, auth, partner
-- agreements) is a separate, post-Swarm task.
-- =============================================================================

INSERT INTO public.atlasoracle_provider_pool (provider_name, provider_category, selection_weight, active)
VALUES
    ('claude-opus-4-7',   'frontier',  1.000, true),
    ('claude-sonnet-4-6', 'mid-tier',  1.000, true),
    ('claude-haiku-4-5',  'fast',      1.000, true),
    ('groq-mixtral',      'fast',      1.000, true),
    ('oss-llama-3',       'oss',       1.000, true)
ON CONFLICT (provider_name) DO NOTHING;

COMMIT;

-- =============================================================================
-- POST-APPLY VERIFICATION (run separately, do not commit uncommented)
-- =============================================================================
-- -- 1. All three tables exist with RLS enabled:
-- SELECT table_name, row_security
--   FROM information_schema.tables
--  WHERE table_schema = 'public'
--    AND table_name LIKE 'atlasoracle_%'
--  ORDER BY table_name;
--
-- -- 2. Directive RLS policy exists and uses auth.uid() = bee_id:
-- SELECT policyname, qual
--   FROM pg_policies
--  WHERE schemaname = 'public'
--    AND tablename  = 'atlasoracle_directives';
--
-- -- 3. Provider pool seeded with 5 rows:
-- SELECT provider_name, provider_category, active
--   FROM public.atlasoracle_provider_pool
--  ORDER BY provider_category, provider_name;
--
-- -- 4. Canon_reads is deny-all to authenticated (should return 0 rows
-- --    when querying as an authenticated Bee — service-role only sees rows):
-- SELECT count(*) FROM public.atlasoracle_canon_reads;  -- returns 0 as anon/authenticated
-- =============================================================================


-- =============================================================================
-- ROLLBACK (run separately, do not commit uncommented)
-- =============================================================================
-- BEGIN;
--   DROP TABLE IF EXISTS public.atlasoracle_canon_reads;
--   DROP TABLE IF EXISTS public.atlasoracle_directives;
--   DROP TABLE IF EXISTS public.atlasoracle_provider_pool;
-- COMMIT;
-- =============================================================================
