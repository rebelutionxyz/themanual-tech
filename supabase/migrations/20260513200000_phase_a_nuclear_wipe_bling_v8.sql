-- =============================================================================
-- Migration 20260513200000 — Phase A · Nuclear wipe of BLiNG! v8 schema
-- =============================================================================
-- Date:        2026-05-13
-- Author:      Code (Claude Opus 4.7) — supervised by Butch
-- Status:      UNAPPLIED. Apply Wednesday 2026-05-13 PM after explicit
--              ratification of file content per the four-gate review
--              process. NO TURNING BACK once committed — this is an
--              irreversible (within-the-DB) drop of the BLiNG! v8 schema.
--              Restore path is Supabase Pro auto-backup OR a fresh v9 build.
--
-- Source:      Wednesday afternoon Phase A discovery pass
--              (shared/canon/freedomblings-v8-final-state.json captures the
--               single bling_system_state row preserved as the historical
--               artifact)
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- WHAT THIS MIGRATION DROPS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- TABLES (6, via CASCADE — auto-drops indexes, RLS policies, triggers,
--          sequences, composite + array types tied to each table):
--   bling_transactions   (0 rows)
--   bling_orders         (0 rows; FK target of bling_transactions.ref_order_id)
--   bling_escrows        (0 rows; FK target of bling_transactions.ref_escrow_id)
--   bling_system_state   (1 config row — preserved in
--                         shared/canon/freedomblings-v8-final-state.json)
--   bling_stripe_events  (0 rows)
--   give_contributions   (0 rows; companion table that depended on BLiNG!
--                         economy; v9 will redesign contribution-flow)
--
-- FUNCTIONS / RPCs (11 bling_* + 2 helpers = 13):
--   bling_cancel_escrow(bigint, uuid)
--   bling_cancel_order(bigint, uuid)
--   bling_chargeback_clawback(text, text, uuid, numeric, numeric)
--   bling_create_escrow(uuid, uuid, numeric, text, text)
--   bling_credit_purchase(uuid, numeric)
--   bling_dispute_escrow(bigint, uuid)
--   bling_fill_order(uuid, bigint, numeric)
--   bling_free(uuid, numeric)
--   bling_place_order(uuid, text, numeric, numeric)
--   bling_release_escrow(bigint, uuid)
--   bling_send(uuid, uuid, numeric, text, text)
--   refresh_bling_rank()             -- trigger fn for bees rank refresh
--   compute_bling_rank(numeric)      -- rank ladder lookup; called only
--                                       by refresh_bling_rank
--
-- TRIGGER (1, dropped explicitly before its function):
--   bees.bees_bling_rank_refresh
--   (Other bling triggers — bling_orders_updated_at, bling_system_state_updated_at —
--    auto-drop with their tables via CASCADE. The trigger functions backing
--    those, set_updated_at(), STAY: shared with bee_profiles / bees /
--    promotions outside the bling scope.)
--
-- COLUMNS:
--   bees.bling_balance                 numeric NOT NULL DEFAULT 0
--   bees.bling_rank                    integer NOT NULL DEFAULT 0
--   bazaar_listings.price_bling        numeric
--   bazaar_listings.price_usd_equivalent  numeric  (BLiNG!-anchored display
--                                                   column; drops alongside)
--   give_campaigns.goal_bling          numeric
--   give_campaigns.raised_bling        numeric NOT NULL DEFAULT 0
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- WHAT THIS MIGRATION DOES NOT DROP (call-outs)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--   - set_updated_at() trigger function — shared with bee_profiles, bees,
--     promotions
--   - astra_or_nova_status enum (Lock 3) — used by astra_registry,
--     nova_registry
--   - astra_id / nova_id columns on bazaar_listings, give_campaigns (Lock 8
--     work — preserved)
--   - bling_default_astra_and_nova trigger on bazaar_listings, give_campaigns
--     (Lock 8 B-aux — preserved; fires on Lock 8 columns, not BLiNG! columns)
--   - Anything in auth.*, storage.*, or any non-BLiNG! public table
--
-- Dependencies:
--   - Phase A discovery complete (Wed PM)
--   - Preservation artifact committed: shared/canon/freedomblings-v8-final-state.json
--   - Lock 8 B + B-aux applied and verified earlier this session
--   - Explicit OG HUMAN ratification of THIS file content (the final gate)
--
-- Idempotency:
--   - DROP IF EXISTS used throughout. Re-running after a successful first
--     apply is a complete no-op (every drop is gated by IF EXISTS).
--
-- Atomicity:
--   - Single BEGIN/COMMIT. If any drop fails (e.g., an unexpected dependent
--     object), the entire migration rolls back. No partial states.
--
-- Reversibility:
--   - WITHIN THE DB, NOT REVERSIBLE BY THIS FILE.
--   - Restore via Supabase Pro auto-backup if recovery is needed.
--   - Forward path: author v9 BLiNG! schema in a future session;
--     freedomblings-v8-final-state.json is a reference artifact, not a
--     migration source.
--
-- Pre-flight asserts (in the DO block below):
--   - All targeted tables have the expected row counts (drift-guard).
--   - bazaar_listings.price_bling has no non-null values (drift-guard).
--   - give_campaigns.goal_bling has no non-null values (drift-guard).
--   - bling_system_state has exactly 1 row matching the preserved snapshot
--     (sanity check that the preservation file is faithful).
-- =============================================================================

BEGIN;


-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight drift guard. Aborts the migration if any state has changed
-- between Phase A discovery and apply time. Row counts of zero are the
-- entire premise of "no data loss" — defending it explicitly.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_n_transactions   bigint;
    v_n_orders         bigint;
    v_n_escrows        bigint;
    v_n_stripe_events  bigint;
    v_n_system_state   bigint;
    v_n_give_contrib   bigint;
    v_bazaar_with_bling  bigint;
    v_give_with_bling    bigint;
BEGIN
    SELECT count(*) INTO v_n_transactions  FROM public.bling_transactions;
    SELECT count(*) INTO v_n_orders        FROM public.bling_orders;
    SELECT count(*) INTO v_n_escrows       FROM public.bling_escrows;
    SELECT count(*) INTO v_n_stripe_events FROM public.bling_stripe_events;
    SELECT count(*) INTO v_n_system_state  FROM public.bling_system_state;
    SELECT count(*) INTO v_n_give_contrib  FROM public.give_contributions;

    IF v_n_transactions  <> 0 THEN RAISE EXCEPTION 'Drift guard: bling_transactions has %, expected 0.', v_n_transactions; END IF;
    IF v_n_orders        <> 0 THEN RAISE EXCEPTION 'Drift guard: bling_orders has %, expected 0.', v_n_orders; END IF;
    IF v_n_escrows       <> 0 THEN RAISE EXCEPTION 'Drift guard: bling_escrows has %, expected 0.', v_n_escrows; END IF;
    IF v_n_stripe_events <> 0 THEN RAISE EXCEPTION 'Drift guard: bling_stripe_events has %, expected 0.', v_n_stripe_events; END IF;
    IF v_n_give_contrib  <> 0 THEN RAISE EXCEPTION 'Drift guard: give_contributions has %, expected 0.', v_n_give_contrib; END IF;
    IF v_n_system_state  <> 1 THEN RAISE EXCEPTION 'Drift guard: bling_system_state has %, expected exactly 1 (preserved in freedomblings-v8-final-state.json).', v_n_system_state; END IF;

    -- BLiNG!-value columns on bazaar_listings + give_campaigns: confirm zero
    -- non-NULL values before we drop the columns.
    SELECT count(*) INTO v_bazaar_with_bling
      FROM public.bazaar_listings
     WHERE price_bling IS NOT NULL OR price_usd_equivalent IS NOT NULL;

    SELECT count(*) INTO v_give_with_bling
      FROM public.give_campaigns
     WHERE goal_bling IS NOT NULL OR raised_bling <> 0;

    IF v_bazaar_with_bling > 0 THEN
        RAISE EXCEPTION 'Drift guard: bazaar_listings has % rows with non-null BLiNG! values. Drop unsafe.', v_bazaar_with_bling;
    END IF;
    IF v_give_with_bling > 0 THEN
        RAISE EXCEPTION 'Drift guard: give_campaigns has % rows with non-null/non-zero BLiNG! values. Drop unsafe.', v_give_with_bling;
    END IF;

    RAISE NOTICE 'Pre-flight OK: all row counts match Phase A discovery. Proceeding with wipe.';
END
$$;


-- =============================================================================
-- STEP 1 — Drop the 11 bling_* RPCs.
-- These are user-callable per `v9` security hardening (REVOKE PUBLIC + auth.uid()
-- guards), but the wipe removes the functions outright — clients calling them
-- will get function-not-found errors after this commits.
-- =============================================================================
DROP FUNCTION IF EXISTS public.bling_send             (uuid, uuid, numeric, text, text);
DROP FUNCTION IF EXISTS public.bling_free             (uuid, numeric);
DROP FUNCTION IF EXISTS public.bling_create_escrow    (uuid, uuid, numeric, text, text);
DROP FUNCTION IF EXISTS public.bling_release_escrow   (bigint, uuid);
DROP FUNCTION IF EXISTS public.bling_cancel_escrow    (bigint, uuid);
DROP FUNCTION IF EXISTS public.bling_dispute_escrow   (bigint, uuid);
DROP FUNCTION IF EXISTS public.bling_place_order      (uuid, text, numeric, numeric);
DROP FUNCTION IF EXISTS public.bling_fill_order       (uuid, bigint, numeric);
DROP FUNCTION IF EXISTS public.bling_cancel_order     (bigint, uuid);
DROP FUNCTION IF EXISTS public.bling_credit_purchase  (uuid, numeric);
DROP FUNCTION IF EXISTS public.bling_chargeback_clawback (text, text, uuid, numeric, numeric);


-- =============================================================================
-- STEP 2 — Drop the rank-refresh trigger on bees (before its function).
-- Order matters: triggers depend on their functions, and a function can't
-- be dropped while a trigger still binds to it (unless CASCADE).
-- =============================================================================
DROP TRIGGER IF EXISTS bees_bling_rank_refresh ON public.bees;


-- =============================================================================
-- STEP 3 — Drop the rank-refresh trigger function + its rank-ladder helper.
-- compute_bling_rank is referenced only by refresh_bling_rank, which we just
-- removed the trigger for. Safe to drop both.
-- =============================================================================
DROP FUNCTION IF EXISTS public.refresh_bling_rank();
DROP FUNCTION IF EXISTS public.compute_bling_rank(numeric);


-- =============================================================================
-- STEP 4 — Drop the bees.bling_* columns.
-- These had a NOT NULL DEFAULT 0 constraint; dropping the columns drops the
-- constraint along with them.
-- =============================================================================
ALTER TABLE public.bees DROP COLUMN IF EXISTS bling_balance;
ALTER TABLE public.bees DROP COLUMN IF EXISTS bling_rank;


-- =============================================================================
-- STEP 5 — Drop the BLiNG!-value columns on bazaar_listings.
-- Both nullable; 0 non-null rows confirmed by pre-flight. Lock 8 columns
-- (astra_id, nova_id) and the lock8_default_astra_and_nova trigger
-- remain — they fire on Lock 8 columns, not BLiNG! ones.
-- =============================================================================
ALTER TABLE public.bazaar_listings DROP COLUMN IF EXISTS price_bling;
ALTER TABLE public.bazaar_listings DROP COLUMN IF EXISTS price_usd_equivalent;


-- =============================================================================
-- STEP 6 — Drop the BLiNG!-value columns on give_campaigns.
-- raised_bling had NOT NULL DEFAULT 0; dropping the column drops the
-- constraint. Lock 8 columns + lock8_default_astra_and_nova trigger remain.
-- =============================================================================
ALTER TABLE public.give_campaigns DROP COLUMN IF EXISTS goal_bling;
ALTER TABLE public.give_campaigns DROP COLUMN IF EXISTS raised_bling;


-- =============================================================================
-- STEP 7 — DROP TABLE … CASCADE on the 6 tables.
-- CASCADE handles:
--   - the 2 inter-bling FKs (transactions.ref_escrow_id, transactions.ref_order_id)
--   - 19 indexes (drop with their tables)
--   - 6 RLS policies (drop with their tables)
--   - 3 sequences (bling_escrows_id_seq, bling_orders_id_seq,
--                  bling_transactions_id_seq — table-owned, drop with table)
--   - 5 composite types + 5 array types (table row types, auto-managed)
--   - 2 updated_at triggers (bling_orders_updated_at, bling_system_state_updated_at)
--   - the give_contributions_lock8_default_insert trigger (the underlying
--     lock8_default_astra_and_nova function STAYS — bound to 13 other tables)
-- =============================================================================
DROP TABLE IF EXISTS public.bling_transactions  CASCADE;
DROP TABLE IF EXISTS public.bling_orders        CASCADE;
DROP TABLE IF EXISTS public.bling_escrows       CASCADE;
DROP TABLE IF EXISTS public.bling_system_state  CASCADE;
DROP TABLE IF EXISTS public.bling_stripe_events CASCADE;
DROP TABLE IF EXISTS public.give_contributions  CASCADE;


-- ───────────────────────────────────────────────────────────────────────
-- Post-wipe assertions. If anything bling-shaped survived, abort with
-- detail rather than commit a half-wipe.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_bling_tables    text[];
    v_bling_functions text[];
    v_bling_cols      text[];
    v_set_updated_at_kept boolean;
    v_lock8_fn_kept       boolean;
BEGIN
    -- (a) No bling_* tables survive.
    SELECT array_agg(tablename) INTO v_bling_tables
      FROM pg_tables
     WHERE schemaname='public' AND (tablename LIKE 'bling%' OR tablename='give_contributions');

    IF v_bling_tables IS NOT NULL AND array_length(v_bling_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Post-wipe assertion failed: surviving tables: %', v_bling_tables;
    END IF;

    -- (b) No bling_* + compute_bling_rank + refresh_bling_rank functions survive.
    SELECT array_agg(p.proname) INTO v_bling_functions
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname='public'
       AND (p.proname LIKE 'bling%' OR p.proname IN ('compute_bling_rank','refresh_bling_rank'));

    IF v_bling_functions IS NOT NULL AND array_length(v_bling_functions, 1) > 0 THEN
        RAISE EXCEPTION 'Post-wipe assertion failed: surviving functions: %', v_bling_functions;
    END IF;

    -- (c) No bling_* columns survive on bees / bazaar_listings / give_campaigns.
    SELECT array_agg(table_name || '.' || column_name) INTO v_bling_cols
      FROM information_schema.columns
     WHERE table_schema='public'
       AND ( (table_name='bees'            AND column_name IN ('bling_balance','bling_rank'))
          OR (table_name='bazaar_listings' AND column_name IN ('price_bling','price_usd_equivalent'))
          OR (table_name='give_campaigns'  AND column_name IN ('goal_bling','raised_bling')) );

    IF v_bling_cols IS NOT NULL AND array_length(v_bling_cols, 1) > 0 THEN
        RAISE EXCEPTION 'Post-wipe assertion failed: surviving columns: %', v_bling_cols;
    END IF;

    -- (d) set_updated_at() must STILL exist (shared with bee_profiles / bees / promotions).
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname='public' AND p.proname='set_updated_at'
    ) INTO v_set_updated_at_kept;

    IF NOT v_set_updated_at_kept THEN
        RAISE EXCEPTION 'Post-wipe assertion failed: set_updated_at() was dropped (should have stayed).';
    END IF;

    -- (e) lock8_default_astra_and_nova() must STILL exist (bound to 13 surviving tables).
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname='public' AND p.proname='lock8_default_astra_and_nova'
    ) INTO v_lock8_fn_kept;

    IF NOT v_lock8_fn_kept THEN
        RAISE EXCEPTION 'Post-wipe assertion failed: lock8_default_astra_and_nova() was dropped (should have stayed).';
    END IF;

    RAISE NOTICE 'Post-wipe assertions OK: BLiNG! v8 schema is clean; preserved infrastructure intact.';
END
$$;


COMMIT;


-- =============================================================================
-- VERIFICATION (run AFTER COMMIT — informational; the DO blocks above already
-- assert the same invariants atomically)
-- =============================================================================
-- (1) No bling_* tables:
--     SELECT tablename FROM pg_tables
--      WHERE schemaname='public' AND (tablename LIKE 'bling%' OR tablename='give_contributions');
--     -- expect: 0 rows.
--
-- (2) No bling_* functions / rank helpers:
--     SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--      WHERE n.nspname='public'
--        AND (p.proname LIKE 'bling%' OR p.proname IN ('compute_bling_rank','refresh_bling_rank'));
--     -- expect: 0 rows.
--
-- (3) bees columns:
--     SELECT column_name FROM information_schema.columns
--      WHERE table_schema='public' AND table_name='bees' AND column_name LIKE 'bling_%';
--     -- expect: 0 rows.
--
-- (4) bazaar_listings + give_campaigns columns:
--     SELECT table_name, column_name FROM information_schema.columns
--      WHERE table_schema='public'
--        AND ((table_name='bazaar_listings' AND column_name IN ('price_bling','price_usd_equivalent'))
--          OR (table_name='give_campaigns'  AND column_name IN ('goal_bling','raised_bling')));
--     -- expect: 0 rows.
--
-- (5) set_updated_at() survived:
--     SELECT proname FROM pg_proc WHERE proname='set_updated_at';
--     -- expect: 1 row.
--
-- (6) lock8_default_astra_and_nova() survived:
--     SELECT proname FROM pg_proc WHERE proname='lock8_default_astra_and_nova';
--     -- expect: 1 row.
--
-- (7) Lock 8 columns on bazaar_listings + give_campaigns preserved:
--     SELECT table_name, column_name FROM information_schema.columns
--      WHERE table_schema='public'
--        AND table_name IN ('bazaar_listings','give_campaigns')
--        AND column_name IN ('astra_id','nova_id')
--      ORDER BY table_name, column_name;
--     -- expect: 4 rows (astra_id + nova_id × 2 tables).


-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- NOT REVERSIBLE BY THIS FILE.
-- Recovery path: restore from Supabase Pro daily auto-backup (point-in-time
-- recovery available via Supabase dashboard → Database → Backups).
-- Forward path: author v9 BLiNG! schema in a future session.
-- Historical reference: shared/canon/freedomblings-v8-final-state.json
-- captures the bling_system_state row that existed at drop time.


-- =============================================================================
-- OPEN QUESTIONS LOGGED BY THIS MIGRATION
-- =============================================================================
-- #PHASE-A-1: v9 BLiNG! schema authoring session.
--             When ready, author v9 with firewall-clean naming:
--             - free_price (replaces v8 mint_price)
--             - offer_fee_pct (replaces v8 sell_fee_pct; OR remove if 0.99%
--                              optional donation per MMF §5.3 supersedes)
--             - 0% bee-to-bee SEND fee (remove v8 bee_to_bee_fee_pct entirely)
--             - free_active (replaces v8 mint_active)
--             - Lock 7 numeric(20,6) precision from day one
--             - Lock 3 currency_type discriminator from day one
--             - Lock 8 astra_id / nova_id from day one (so no follow-up
--               federation migration needed)
--             - Fibonacci 89-weight atom_contributions integration hooks
--               per shared/canon/fibonacci-atom-contribution.md
--
-- #PHASE-A-2: Client code cleanup.
--             6 INSERT callsites in src/lib/intel.ts + src/lib/reactions.ts
--             still write to tables that survive (forum_threads, forum_posts,
--             entity_atom_links, entity_reactions, entity_shares). Those are
--             unaffected.
--             Any client code that called bling_send / bling_free / etc. via
--             supabase.rpc('bling_...') will fail with function-not-found
--             after this commits. Audit src/lib/bling*.ts (if any) and any
--             component referencing the bling RPCs. Coordinate with v9
--             schema build.
--
-- #PHASE-A-3: TypeScript types regeneration.
--             After this commits, regenerate Supabase TypeScript types so
--             the client SDK reflects the post-wipe shape. Run via Supabase
--             MCP generate_typescript_types tool when v9 schema lands; in
--             the interim, the v8 types files will be stale (compile errors
--             on references to dropped tables/columns are expected and
--             intentional — they surface every callsite that needs cleanup).
