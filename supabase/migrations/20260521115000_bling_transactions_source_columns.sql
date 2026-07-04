-- =============================================================================
-- Migration 20260521115000 — bling_transactions source/counterparty columns (Wave 1, step 1.5)
-- =============================================================================
-- Date:        2026-05-21
-- Author:      Code 2 (Claude Opus 4.7) — supervised by Butch
-- Branch:      feat/bling-v9-ledger
-- Wave:        1 (Stripe surface). Prerequisite for G1 + G2 in this wave.
-- Source:      AtlasORACLE.to/master_plan/bling-ledger-interface.md §6, §10 OQ#1
--              canon/tag-progenitor-reconcile.md §"Implementation notes"
--              shared/canon/cancel-recovery-adr.md (Lock 2 ref shape)
--
-- Purpose:
--   Reconcile the bling-ledger-interface contract with the deployed v9
--   bling_transactions schema. Three additive columns:
--
--     source_type   TEXT — generic source tag (e.g. 'atlasoracle_directive',
--                          'atlasoracle_refund', 'stripe_webhook'). Lets the
--                          ledger record polymorphic call origins without
--                          adding a typed FK column per origin kind.
--
--     source_ref    UUID — polymorphic ref into the originating row (e.g.
--                          atlasoracle_directives.id). Paired with source_type.
--                          NOT a foreign key — referent table varies by
--                          source_type.
--
--     counterparty  TEXT — literal-string counterparty for non-Bee
--                          counterparties (e.g. 'stripe', '@combtreasury',
--                          'reserve'). bling_transactions already has
--                          counterparty_bee_id (uuid FK) for Bee-to-Bee rows;
--                          this is the textual analogue for system flows.
--
-- Why additive, not rename:
--   The v9 fresh schema already uses category / counterparty_bee_id / typed
--   refs (ref_escrow_id, ref_order_id, stripe_event_id). Those stay. This
--   migration adds the bling-ledger-interface columns alongside, preserving
--   every existing column and constraint. No rename churn, no behavioral
--   change for any deployed RPC.
--
-- Idempotency:
--   ADD COLUMN IF NOT EXISTS on all three columns.
--   CREATE INDEX IF NOT EXISTS on the partial index.
--   Safe to re-apply.
--
-- Blast radius:
--   Pure column adds + index. No data mutation. No constraint changes on
--   existing columns. Rollback is `ALTER TABLE ... DROP COLUMN` of the three
--   new columns + `DROP INDEX` (commented at file end).
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight: confirm bling_transactions exists with the v9 columns we
-- expect alongside the new ones. If the table is missing or in an
-- unexpected shape, abort rather than silently widen.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_table_exists boolean;
    v_balance_after_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'bling_transactions'
    ) INTO v_table_exists;

    IF NOT v_table_exists THEN
        RAISE EXCEPTION
            'Pre-flight failed: public.bling_transactions does not exist. '
            'v9 fresh schema migration (20260513202323) appears unapplied — '
            'investigate before adding source columns.';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'bling_transactions'
          AND column_name = 'balance_after'
    ) INTO v_balance_after_exists;

    IF NOT v_balance_after_exists THEN
        RAISE EXCEPTION
            'Pre-flight failed: bling_transactions.balance_after missing. '
            'Schema is in unexpected state.';
    END IF;

    RAISE NOTICE 'Pre-flight OK: bling_transactions present with v9 shape.';
END $$;

-- ───────────────────────────────────────────────────────────────────────
-- Block A · Additive columns. All nullable; existing rows backfill to NULL.
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.bling_transactions
    ADD COLUMN IF NOT EXISTS source_type   TEXT,
    ADD COLUMN IF NOT EXISTS source_ref    UUID,
    ADD COLUMN IF NOT EXISTS counterparty  TEXT;

-- ───────────────────────────────────────────────────────────────────────
-- Block B · Partial index on (source_type, source_ref).
-- Most rows have NULL source_type (existing v9 flows use typed refs);
-- partial index keeps the structure small.
-- ───────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS bling_transactions_source_lookup_idx
    ON public.bling_transactions (source_type, source_ref)
    WHERE source_type IS NOT NULL;

-- ───────────────────────────────────────────────────────────────────────
-- Block C · No CHECK enum on source_type at this stage. Values are
-- populated organically by the RPCs that need them (G1 sets nothing here;
-- G2 sets counterparty='stripe' but not source_type; AtlasOracle directive
-- RPCs will set source_type='atlasoracle_directive' once they ship).
-- Enum-tightening deferred to a follow-up once the surface stabilises.
-- ───────────────────────────────────────────────────────────────────────

COMMIT;

-- =============================================================================
-- VERIFICATION (post-COMMIT — run separately, NOT inside the transaction)
-- =============================================================================
--
-- (1) Three new columns present, nullable, no default:
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--  WHERE table_schema='public' AND table_name='bling_transactions'
--    AND column_name IN ('source_type','source_ref','counterparty')
--  ORDER BY column_name;
-- → 3 rows: counterparty(text|YES|null), source_ref(uuid|YES|null), source_type(text|YES|null)
--
-- (2) Partial index exists:
-- SELECT indexname, indexdef FROM pg_indexes
--  WHERE schemaname='public' AND indexname='bling_transactions_source_lookup_idx';
-- → 1 row with WHERE (source_type IS NOT NULL) in indexdef.
--
-- (3) No existing column or constraint disturbed:
-- SELECT count(*) FROM information_schema.columns
--  WHERE table_schema='public' AND table_name='bling_transactions';
-- → 16 rows (13 pre-existing + 3 new).
--
-- (4) No row mutation:
-- SELECT count(*) FROM public.bling_transactions;
-- → 0 (matches Phase 1 inventory).

-- =============================================================================
-- ROLLBACK (commented — only if reverting this migration intentionally)
-- =============================================================================
-- BEGIN;
-- DROP INDEX IF EXISTS public.bling_transactions_source_lookup_idx;
-- ALTER TABLE public.bling_transactions
--     DROP COLUMN IF EXISTS counterparty,
--     DROP COLUMN IF EXISTS source_ref,
--     DROP COLUMN IF EXISTS source_type;
-- COMMIT;
