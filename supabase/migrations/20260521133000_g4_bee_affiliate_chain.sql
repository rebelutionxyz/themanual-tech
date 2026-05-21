-- =============================================================================
-- Migration 20260521133000 — G4: bee_affiliate_chain table + signup hook (Wave 2, step 5)
-- =============================================================================
-- Date:        2026-05-21
-- Author:      Code 2 (Claude Opus 4.7) — supervised by Butch
-- Branch:      feat/bling-v9-ledger
-- Wave:        2.
-- Source:      shared/canon/affiliate-system.md §13 (chain capture at signup)
--              shared/canon/bee-role-hierarchy.md §rank_history (append-only pattern)
--
-- Purpose:
--   The 5-level affiliate chain (L1 Sponsor / L2 Pathfinder / L3 Navigator /
--   L4 Pioneer / L5 Origin) captured immutably at Bee signup. Used by the
--   89-weight affiliate-context distribution in Wave 3 G5.
--
--   - One row per Bee. bee_id PK.
--   - L1–L5 columns nullable: empty chain means the Bee signed up without
--     an invite trail (organic discovery). The capture mechanic in v1 is
--     invite-code-driven; cookieless CAA (per affiliate-system.md §17) lands
--     in a separate session.
--   - captured_at = signup time. captured_via = how the chain was populated
--     ('invite_code', 'aff_id_cookie', 'manual', 'signup_pending' for
--     trigger-created rows awaiting chain population).
--   - CHECK constraint blocks self-sponsorship at any level. NULL handling
--     in CHECK constraints is UNKNOWN = PASS, so empty chains pass cleanly.
--
-- TRIGGER EXTENSION (auth-flow-adjacent — extra care):
--
--   The handle_new_bee_profile() AFTER INSERT trigger on public.bees
--   currently does: `INSERT INTO bee_profiles (bee_id) VALUES (NEW.id)
--                    ON CONFLICT (bee_id) DO NOTHING`.
--
--   This migration extends it to ALSO insert an empty chain row. The
--   extension is wrapped in BEGIN/EXCEPTION so that any failure during
--   chain insertion logs a WARNING but does NOT re-raise — Bee creation
--   must never fail because chain capture errored.
--
--   The original bee_profiles INSERT remains the first statement and is
--   NOT wrapped in EXCEPTION — preserving current semantics for profile
--   creation. Only the new chain-row INSERT is exception-isolated.
--
-- IMMUTABILITY:
--   bee_affiliate_chain rows are immutable for non-service-role callers:
--     - UPDATE blocked unless auth.role() = 'service_role'
--     - DELETE blocked unless auth.role() = 'service_role'
--   This protects the chain from user-side manipulation while letting
--   server-side RPCs (the eventual capture_affiliate_chain RPC) populate
--   the L-IDs after signup.
--
-- BACKFILL:
--   This migration backfills empty chain rows for all currently-existing
--   Bees (the 3 test bees + 4 system Bees = 7 rows expected). System Bees
--   get captured_via='system'; others get 'backfill_pre_chain_table'.
--   This keeps the invariant "every Bee has a chain row" holding from
--   now on, simplifying downstream queries.
--
-- Idempotency:
--   CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS, INSERT...
--   ON CONFLICT DO NOTHING, CREATE OR REPLACE FUNCTION, DROP TRIGGER IF
--   EXISTS + CREATE.
--
-- Blast radius:
--   - New table bee_affiliate_chain (empty post-backfill except for ~7 rows).
--   - New function bee_affiliate_chain_block_user_mutation.
--   - 2 new triggers on bee_affiliate_chain.
--   - handle_new_bee_profile() function REPLACED — but original semantics
--     preserved + extended in exception-safe manner.
--   No DROPs of existing tables. Rollback path drops the new table and
--   restores the original handle_new_bee_profile body (see ROLLBACK).
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_bees_exists boolean;
    v_handle_new_bee_profile_exists boolean;
    v_bees_create_profile_trigger_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema='public' AND table_name='bees'
    ) INTO v_bees_exists;
    IF NOT v_bees_exists THEN
        RAISE EXCEPTION 'Pre-flight failed: public.bees missing.';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='handle_new_bee_profile'
    ) INTO v_handle_new_bee_profile_exists;
    IF NOT v_handle_new_bee_profile_exists THEN
        RAISE EXCEPTION
            'Pre-flight failed: handle_new_bee_profile() function missing — '
            'this migration replaces its body, but expected it to exist.';
    END IF;

    -- Confirm the trigger that fires the function is still attached to bees.
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgrelid='public.bees'::regclass
          AND tgname='bees_create_profile'
          AND NOT tgisinternal
    ) INTO v_bees_create_profile_trigger_exists;
    IF NOT v_bees_create_profile_trigger_exists THEN
        RAISE EXCEPTION
            'Pre-flight failed: bees_create_profile trigger missing on bees. '
            'Extended function would not fire — investigate before applying.';
    END IF;

    RAISE NOTICE 'Pre-flight OK.';
END $$;

-- ───────────────────────────────────────────────────────────────────────
-- Block A · Table
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bee_affiliate_chain (
    bee_id            UUID PRIMARY KEY REFERENCES public.bees(id),
    l1_sponsor_id     UUID REFERENCES public.bees(id),
    l2_pathfinder_id  UUID REFERENCES public.bees(id),
    l3_navigator_id   UUID REFERENCES public.bees(id),
    l4_pioneer_id     UUID REFERENCES public.bees(id),
    l5_origin_id      UUID REFERENCES public.bees(id),
    captured_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    captured_via      TEXT,
    CHECK (bee_id NOT IN (
        l1_sponsor_id, l2_pathfinder_id, l3_navigator_id,
        l4_pioneer_id, l5_origin_id
    ))
);

CREATE INDEX IF NOT EXISTS bee_affiliate_chain_l1_idx
    ON public.bee_affiliate_chain(l1_sponsor_id)
    WHERE l1_sponsor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS bee_affiliate_chain_captured_at_idx
    ON public.bee_affiliate_chain(captured_at);

-- ───────────────────────────────────────────────────────────────────────
-- Block B · RLS
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.bee_affiliate_chain ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bee_affiliate_chain_owner_read    ON public.bee_affiliate_chain;
DROP POLICY IF EXISTS bee_affiliate_chain_service_write ON public.bee_affiliate_chain;

CREATE POLICY bee_affiliate_chain_owner_read ON public.bee_affiliate_chain
    FOR SELECT
    USING (
        bee_id = auth.uid()
        OR auth.role() = 'service_role'
    );

CREATE POLICY bee_affiliate_chain_service_write ON public.bee_affiliate_chain
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ───────────────────────────────────────────────────────────────────────
-- Block C · UPDATE/DELETE block trigger (service_role bypass)
-- ───────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bee_affiliate_chain_block_user_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
    IF auth.role() = 'service_role' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    RAISE EXCEPTION
        'bee_affiliate_chain is immutable for users — % blocked. '
        'Only service_role may mutate chain rows (via signup-time capture RPC).',
        TG_OP;
END;
$function$;

DROP TRIGGER IF EXISTS bee_affiliate_chain_no_user_update ON public.bee_affiliate_chain;
DROP TRIGGER IF EXISTS bee_affiliate_chain_no_user_delete ON public.bee_affiliate_chain;

CREATE TRIGGER bee_affiliate_chain_no_user_update
    BEFORE UPDATE ON public.bee_affiliate_chain
    FOR EACH ROW EXECUTE FUNCTION public.bee_affiliate_chain_block_user_mutation();

CREATE TRIGGER bee_affiliate_chain_no_user_delete
    BEFORE DELETE ON public.bee_affiliate_chain
    FOR EACH ROW EXECUTE FUNCTION public.bee_affiliate_chain_block_user_mutation();

-- ───────────────────────────────────────────────────────────────────────
-- Block D · Extend handle_new_bee_profile() to also insert empty chain row.
-- Exception-isolated: chain insert failure must NOT fail Bee creation.
-- ───────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_bee_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
    -- Original behavior: create bee_profiles row.
    INSERT INTO public.bee_profiles (bee_id)
        VALUES (NEW.id)
        ON CONFLICT (bee_id) DO NOTHING;

    -- Extension: create empty bee_affiliate_chain row. Exception-isolated:
    -- if this fails, log a WARNING and continue. Bee creation must not fail
    -- because chain capture errored.
    BEGIN
        INSERT INTO public.bee_affiliate_chain (bee_id, captured_via)
            VALUES (NEW.id, 'signup_pending')
            ON CONFLICT (bee_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING
            'bee_affiliate_chain insert failed for bee %: % — continuing.',
            NEW.id, SQLERRM;
    END;

    RETURN NEW;
END;
$function$;

-- ───────────────────────────────────────────────────────────────────────
-- Block E · Backfill empty chain rows for existing Bees so the
-- "every Bee has a chain row" invariant holds from now on.
-- System Bees get captured_via='system'; others get 'backfill_pre_chain_table'.
-- ───────────────────────────────────────────────────────────────────────
INSERT INTO public.bee_affiliate_chain (bee_id, captured_via)
SELECT
    b.id,
    CASE
        WHEN b.handle IN ('combtreasury','honeypot','annualparty','themanual_board')
            THEN 'system'
        ELSE 'backfill_pre_chain_table'
    END AS captured_via
FROM public.bees b
ON CONFLICT (bee_id) DO NOTHING;

COMMIT;

-- =============================================================================
-- VERIFICATION (post-COMMIT — run separately, NOT inside the transaction)
-- =============================================================================
--
-- (1) Table + columns + constraints:
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns
--  WHERE table_schema='public' AND table_name='bee_affiliate_chain'
--  ORDER BY ordinal_position;
-- → 8 rows: bee_id(uuid|NO), l1..l5(uuid|YES), captured_at(timestamptz|NO),
--           captured_via(text|YES).
-- SELECT conname, pg_get_constraintdef(c.oid)
--   FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
--   JOIN pg_namespace n ON n.oid=t.relnamespace
--  WHERE n.nspname='public' AND t.relname='bee_affiliate_chain'
--  ORDER BY conname;
-- → PK on bee_id, 6 FKs (bee_id + l1..l5 → bees.id), 1 CHECK no-self-sponsor.
--
-- (2) RLS + 2 user-mutation triggers + 2 policies:
-- SELECT relrowsecurity FROM pg_class
--  WHERE relname='bee_affiliate_chain' AND relnamespace='public'::regnamespace;
-- → t.
-- SELECT tgname FROM pg_trigger
--  WHERE tgrelid='public.bee_affiliate_chain'::regclass AND NOT tgisinternal
--  ORDER BY tgname;
-- → bee_affiliate_chain_no_user_delete, bee_affiliate_chain_no_user_update.
--
-- (3) handle_new_bee_profile extended:
-- SELECT
--   (pg_get_functiondef('public.handle_new_bee_profile()'::regprocedure)
--      LIKE '%bee_affiliate_chain%') AS extended,
--   (pg_get_functiondef('public.handle_new_bee_profile()'::regprocedure)
--      LIKE '%EXCEPTION WHEN OTHERS%') AS has_exception_block;
-- → both true.
--
-- (4) Backfill populated rows for all existing Bees:
-- SELECT count(*) AS chain_rows, (SELECT count(*) FROM public.bees) AS bees;
-- → chain_rows == bees.
-- SELECT captured_via, count(*) FROM public.bee_affiliate_chain
--  GROUP BY captured_via ORDER BY captured_via;
-- → 'system' (4 rows: 4 system Bees), 'backfill_pre_chain_table' (3 test Bees).

-- =============================================================================
-- ROLLBACK (commented — restores original handle_new_bee_profile body)
-- =============================================================================
-- BEGIN;
-- DROP TABLE IF EXISTS public.bee_affiliate_chain CASCADE;
-- DROP FUNCTION IF EXISTS public.bee_affiliate_chain_block_user_mutation();
-- -- Restore original handle_new_bee_profile body:
-- CREATE OR REPLACE FUNCTION public.handle_new_bee_profile()
-- RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
-- SET search_path = public, pg_temp
-- AS $$
-- BEGIN
--     INSERT INTO public.bee_profiles (bee_id)
--         VALUES (NEW.id) ON CONFLICT (bee_id) DO NOTHING;
--     RETURN NEW;
-- END;
-- $$;
-- COMMIT;
