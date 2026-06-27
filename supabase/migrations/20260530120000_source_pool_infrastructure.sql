-- =============================================================================
-- Migration 20260530120000 — The Source pool infrastructure (FOUNDATIONAL)
-- =============================================================================
-- Date:    2026-05-30
-- Author:  Code (Claude Opus 4.8) — supervised by Butch (OG HUMAN)
-- Source:  SINK 1 dispatch — Premium Handle Claims / closed-loop economy
--          (May 30 economy-architecture lock).
--
-- Purpose: The closed-loop substrate every sink reuses. A sink debits BLiNG!
--          from a Bee and returns it to The Source pool via
--          increment_source_pool(); rising Source liquidity feeds the faucet
--          thermostat downstream.
--
--          Sink spend → Bee balance debited → increment_source_pool() →
--          Source liquidity rises → faucet generosity rises.
--
-- Status:  UNAPPLIED. Butch reviews + applies via Supabase tooling. DO NOT
--          auto-apply (DDL on production = Plan Mode gate).
--
-- Hardening applied beyond the raw dispatch spec (all additive, non-breaking):
--   * SECURITY DEFINER functions pin `SET search_path = public, pg_temp`
--     (bare DEFINER functions are a privilege-escalation vector).
--   * RLS enabled on source_pool_state + source_pool_events per the
--     platform rule "RLS on every table, no exceptions". Both tables are
--     reached ONLY through the SECURITY DEFINER RPCs below (which bypass
--     RLS); no direct grants, no policies => direct table access is denied.
--   * get_source_pool_balance() is SECURITY DEFINER so the public balance
--     read survives RLS being enabled (the dispatch granted it to anon).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. source_pool_state — single-row ledger of current Source liquidity.
--    The id=1 CHECK + PK enforces exactly one row.
-- ---------------------------------------------------------------------------
CREATE TABLE public.source_pool_state (
    id              int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    current_balance numeric(28,8) NOT NULL,
    last_updated    timestamptz DEFAULT now()
);

INSERT INTO public.source_pool_state (id, current_balance)
    VALUES (1, 99200000000000)   -- 99.2T initial Source
    ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. source_pool_events — append-only audit of every Source increment.
-- ---------------------------------------------------------------------------
CREATE TABLE public.source_pool_events (
    id          bigserial PRIMARY KEY,
    event_type  text NOT NULL,           -- 'handle_claim_sink', 'tip_sink' (future), ...
    bee_id      uuid REFERENCES public.bees(id),
    amount      numeric(28,8) NOT NULL,
    metadata    jsonb,
    occurred_at timestamptz DEFAULT now()
);

-- RLS: enabled, no policies, no direct grants. Only the SECURITY DEFINER
-- RPCs below touch these tables.
ALTER TABLE public.source_pool_state  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_pool_events ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3. increment_source_pool() — the canonical Source-refill path. Platform
--    code only (no GRANT to anon/authenticated); invoked from sink RPCs via
--    PERFORM. SECURITY DEFINER so it writes through RLS.
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.increment_source_pool(
    p_amount     numeric(28,8),
    p_event_type text,
    p_bee_id     uuid DEFAULT NULL,
    p_metadata   jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
    UPDATE public.source_pool_state
       SET current_balance = current_balance + p_amount,
           last_updated    = now()
     WHERE id = 1;

    INSERT INTO public.source_pool_events (event_type, bee_id, amount, metadata)
        VALUES (p_event_type, p_bee_id, p_amount, p_metadata);
END
$function$;

REVOKE EXECUTE ON FUNCTION public.increment_source_pool(numeric, text, uuid, jsonb)
    FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. get_source_pool_balance() — public read of current Source liquidity.
--    SECURITY DEFINER so the read survives RLS on source_pool_state.
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.get_source_pool_balance()
    RETURNS numeric
    LANGUAGE sql
    SECURITY DEFINER
    SET search_path = public, pg_temp
    STABLE
AS $function$
    SELECT current_balance FROM public.source_pool_state WHERE id = 1;
$function$;

GRANT EXECUTE ON FUNCTION public.get_source_pool_balance() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. my_bling_balance() — canonical self-balance read path. Lockdown-safe via
--    SECURITY DEFINER. Used by all sink frontends. Matches the RPC defined in
--    the parked chore/bees-rls-lockdown-v2 branch — that branch's Phase A
--    migration must be updated to CREATE OR REPLACE when it eventually merges.
--    Defined here with CREATE OR REPLACE so either branch can land in either
--    order without breaking (identical body, last-apply wins).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_bling_balance()
    RETURNS numeric
    LANGUAGE sql
    SECURITY DEFINER
    STABLE
    SET search_path = public
AS $function$
    SELECT bling_balance FROM bees WHERE id = auth.uid();
$function$;

GRANT EXECUTE ON FUNCTION public.my_bling_balance() TO authenticated;

COMMIT;

-- =============================================================================
-- SMOKE TESTS (run AFTER apply; safe — read-only except the rolled-back block)
-- =============================================================================
-- -- 5a. Source seeded at 99.2T:
-- SELECT get_source_pool_balance();           -- expect 99200000000000.00000000
--
-- -- 5b. increment is platform-only (should FAIL for a normal role):
-- --     (run as authenticated) SELECT increment_source_pool(1,'x');  -- permission denied
--
-- -- 5c. round-trip in a rolled-back tx:
-- BEGIN;
--   SELECT increment_source_pool(500, 'smoke_test', NULL, '{"t":1}'::jsonb);
--   SELECT current_balance FROM source_pool_state WHERE id=1;   -- 99200000000500
--   SELECT event_type, amount FROM source_pool_events ORDER BY id DESC LIMIT 1;
-- ROLLBACK;
-- =============================================================================
