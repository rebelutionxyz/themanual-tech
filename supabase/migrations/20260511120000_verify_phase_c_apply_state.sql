-- =============================================================================
-- Migration 20260511120000 — Verify Phase C apply state (DIAGNOSTIC ONLY)
-- =============================================================================
-- Date:        2026-05-11
-- Author:      Code (Claude Opus 4.7) — supervised by Butch
-- Status:      DIAGNOSTIC. This file modifies NO schema. It is the Monday-morning
--              5-minute opener, intended to resolve Open #SCH-5 before chaining
--              the day's schema-changing migrations.
-- Source:      shared/canon/schema-state-current.md §"Open questions" #SCH-5
--              shared/canon/monday-2026-05-11-prep-scope.md §3 (item 0)
--              shared/canon/monday-2026-05-11-prep-scope.md §7 (drift flags)
--
-- Purpose:
--   The Phase C foundations migration (20260508120000_phase_c_schema_foundations.sql)
--   carries an `UNAPPLIED` header, but commit 7eb71fa says "Phase C closed."
--   Before chaining today's schema migrations (Lock 7, Lock 3, chargeback,
--   bling_cancel_order), confirm the current production state of every
--   Phase C deliverable plus the precondition state of today's targets.
--
--   Eight checks, each emitting a single RAISE NOTICE line. No abort, no
--   schema change. Run, read the notices, decide what to apply next.
--
--     Phase C foundations (B-1, B-2, B-3 — migration 20260508120000):
--       1. public.bee_profiles table existence
--       2. public.promotions   table existence
--       3. public.bees.is_admin column existence
--
--     Phase C B-4 / Saturday callsite fix (migrations 20260508120100 +
--                                          20260509120000):
--       4. public.bling_free  function existence (post-rename)
--       5. public.bling_mint  function existence (should be GONE post-rename)
--       6. public.bling_credit_purchase body still references bling_mint
--          (true ⇒ Saturday's callsite-fix is unapplied; false ⇒ applied)
--
--     Today's target preconditions (Lock 7 + Lock 3):
--       7. public.bees.bling_balance numeric_scale (3 ⇒ pre-Lock-7;
--                                                   6 ⇒ post-Lock-7)
--       8. public.astra_or_nova_status enum existence (false ⇒ pre-Lock-3;
--                                                       true ⇒ post-Lock-3)
--          plus public.bling_transactions.currency_type column existence
--          (paired with #8 — both should be in the same state).
--
-- Idempotency:
--   The migration is read-only. Re-running it any number of times produces
--   the same notices and changes nothing.
--
-- House-style notes:
--   * No BEGIN/COMMIT around the DO block — diagnostic-only; no transaction
--     boundary needed. Adding BEGIN/COMMIT here would imply schema mutation
--     where there is none.
--   * Output is via RAISE NOTICE so it appears in psql / Supabase Studio
--     SQL editor / supabase db log. No table is written.
--   * If a migration runner refuses to "apply" a no-op file, run the DO
--     block directly in the SQL editor instead. The file lives in
--     supabase/migrations/ so it ships with the repo, not because it must
--     be tracked in supabase_migrations.schema_migrations.
-- =============================================================================

DO $$
DECLARE
    -- Phase C foundations probes
    v_bee_profiles_exists  boolean;
    v_promotions_exists    boolean;
    v_is_admin_exists      boolean;

    -- Phase C B-4 / Saturday callsite fix probes
    v_bling_free_exists       boolean;
    v_bling_mint_exists       boolean;
    v_credit_purchase_calls_mint boolean;

    -- Today's Lock 7 + Lock 3 precondition probes
    v_balance_scale          integer;
    v_astra_status_exists    boolean;
    v_currency_type_exists   boolean;
BEGIN
    -- ──────────────────────────────────────────────────────────────────
    -- Phase C foundations (migration 20260508120000)
    -- ──────────────────────────────────────────────────────────────────
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'bee_profiles'
    ) INTO v_bee_profiles_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'promotions'
    ) INTO v_promotions_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'bees' AND column_name = 'is_admin'
    ) INTO v_is_admin_exists;

    RAISE NOTICE '────────────────────────────────────────────────────────────────';
    RAISE NOTICE 'Phase C foundations (#SCH-5):';
    RAISE NOTICE '  bee_profiles table   : %', CASE WHEN v_bee_profiles_exists THEN 'PRESENT' ELSE 'ABSENT'  END;
    RAISE NOTICE '  promotions   table   : %', CASE WHEN v_promotions_exists   THEN 'PRESENT' ELSE 'ABSENT'  END;
    RAISE NOTICE '  bees.is_admin column : %', CASE WHEN v_is_admin_exists     THEN 'PRESENT' ELSE 'ABSENT'  END;
    RAISE NOTICE '  → If all PRESENT: migration 20260508120000 is effectively APPLIED. Flip the header.';
    RAISE NOTICE '  → If any ABSENT:  apply 20260508120000_phase_c_schema_foundations.sql first.';

    -- ──────────────────────────────────────────────────────────────────
    -- Phase C B-4 (rename) + Saturday callsite fix
    -- ──────────────────────────────────────────────────────────────────
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'bling_free'
          AND pg_get_function_identity_arguments(p.oid) = 'p_bee_id uuid, p_amount numeric'
    ) INTO v_bling_free_exists;

    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'bling_mint'
          AND pg_get_function_identity_arguments(p.oid) = 'p_bee_id uuid, p_amount numeric'
    ) INTO v_bling_mint_exists;

    -- "Does bling_credit_purchase body still call bling_mint by name?"
    -- The Saturday callsite-fix migration (20260509120000) rewrites this body
    -- to call bling_free. If the body still says public.bling_mint(, the fix
    -- is unapplied and any Stripe traffic that falls into the curve-FREE
    -- branch will raise 'function public.bling_mint(uuid, numeric) does not exist'.
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'bling_credit_purchase'
          AND p.prosrc LIKE '%public.bling_mint(%'
    ) INTO v_credit_purchase_calls_mint;

    RAISE NOTICE '────────────────────────────────────────────────────────────────';
    RAISE NOTICE 'Rename + callsite fix (migrations 20260508120100 + 20260509120000):';
    RAISE NOTICE '  bling_free(uuid, numeric) function    : %', CASE WHEN v_bling_free_exists      THEN 'PRESENT' ELSE 'ABSENT'  END;
    RAISE NOTICE '  bling_mint(uuid, numeric) function    : %', CASE WHEN v_bling_mint_exists      THEN 'PRESENT (unexpected!)' ELSE 'ABSENT (expected)' END;
    RAISE NOTICE '  bling_credit_purchase body calls bling_mint : %', CASE WHEN v_credit_purchase_calls_mint THEN 'YES — Saturday fix UNAPPLIED' ELSE 'NO — Saturday fix APPLIED' END;
    RAISE NOTICE '  → bling_free PRESENT + bling_mint ABSENT + body calls NO  ⇒ rename + Saturday fix both APPLIED.';
    RAISE NOTICE '  → bling_free PRESENT + bling_mint ABSENT + body calls YES ⇒ apply 20260509120000_phase_c_b4_credit_purchase_callsite_fix.sql.';
    RAISE NOTICE '  → bling_free ABSENT  + bling_mint PRESENT                   ⇒ apply 20260508120100_phase_c_b4_bling_rename.sql first.';

    -- ──────────────────────────────────────────────────────────────────
    -- Today's Lock 7 + Lock 3 precondition state
    -- ──────────────────────────────────────────────────────────────────
    SELECT numeric_scale INTO v_balance_scale
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'bees'
      AND column_name  = 'bling_balance';

    SELECT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'astra_or_nova_status'
          AND typnamespace = 'public'::regnamespace
    ) INTO v_astra_status_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'bling_transactions'
          AND column_name  = 'currency_type'
    ) INTO v_currency_type_exists;

    RAISE NOTICE '────────────────────────────────────────────────────────────────';
    RAISE NOTICE 'Today''s preconditions (Lock 7 / Lock 3):';
    RAISE NOTICE '  bees.bling_balance numeric_scale       : %', COALESCE(v_balance_scale::text, 'COLUMN MISSING');
    RAISE NOTICE '    → 3 ⇒ pre-Lock-7  (apply 20260511100000_lock7_precision_tightening.sql)';
    RAISE NOTICE '    → 6 ⇒ post-Lock-7 (skip Lock 7 migration)';
    RAISE NOTICE '  astra_or_nova_status enum              : %', CASE WHEN v_astra_status_exists  THEN 'PRESENT' ELSE 'ABSENT'  END;
    RAISE NOTICE '  bling_transactions.currency_type column: %', CASE WHEN v_currency_type_exists THEN 'PRESENT' ELSE 'ABSENT'  END;
    RAISE NOTICE '    → both ABSENT  ⇒ pre-Lock-3 (apply 20260511110000_lock3_discriminators.sql)';
    RAISE NOTICE '    → both PRESENT ⇒ post-Lock-3 (skip Lock 3 migration)';
    RAISE NOTICE '    → mixed        ⇒ unexpected; investigate before applying anything else.';

    RAISE NOTICE '────────────────────────────────────────────────────────────────';
    RAISE NOTICE 'Diagnostic complete. No schema modified.';
END
$$;


-- =============================================================================
-- HOW TO READ THE OUTPUT
-- =============================================================================
-- The DO block above emits ~20 NOTICE lines. The shape Monday morning expects:
--
--   Phase C foundations (#SCH-5):
--     bee_profiles table   : PRESENT   ← all three should be PRESENT if
--     promotions   table   : PRESENT     "Phase C closed" (commit 7eb71fa)
--     bees.is_admin column : PRESENT     reflects production state
--
--   Rename + callsite fix:
--     bling_free  function : PRESENT
--     bling_mint  function : ABSENT (expected)
--     bling_credit_purchase body calls bling_mint : YES — Saturday fix UNAPPLIED
--                                                ↑
--                                  Expected on Monday morning. Apply
--                                  20260509120000 next; the diagnostic
--                                  flips to "NO — APPLIED" after.
--
--   Today's preconditions:
--     bling_balance scale : 3        ← apply 20260511100000 next
--     astra_or_nova_status: ABSENT   ← apply 20260511110000 next
--     currency_type column: ABSENT   ←     (paired with the enum)
--
-- If any line says "(unexpected!)" — STOP. Investigate before chaining
-- anything else. The diagnostic only reads; the next step is to read
-- pg_proc / pg_type / information_schema by hand and figure out why state
-- diverged from the migration history.


-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- This migration is read-only. There is nothing to roll back.
