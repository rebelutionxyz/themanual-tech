-- =============================================================================
-- Migration 20260511110000 — Lock 3 discriminators (astra_or_nova_status enum + currency_type)
-- =============================================================================
-- Date:        2026-05-11
-- Author:      Code (Claude Opus 4.7) — supervised by Butch
-- Status:      UNAPPLIED. Apply Monday 2026-05-11 after Lock 7 precision tightening.
-- Source:      shared/canon/federation-tier-1-scoping.md §"Lock 3 — Two non-precluding schema discriminators"
--              shared/canon/schema-state-current.md §4
--              shared/canon/monday-2026-05-11-prep-scope.md §2a/§2b
--
-- Purpose:
--   Adds the two non-precluding tier-1 federation discriminators per Lock 3
--   of the federation tier-1 scoping doc. Neither discriminator is consumed
--   by any tier-1 RPC; they exist so that future Board-of-Astras (Lock 5)
--   and DiGiTs (Lock 6) work can land as additive features instead of
--   backfill migrations on a populated ledger.
--
--     3a — public.astra_or_nova_status enum, three labels:
--          'active' | 'archived' | 'off_grid'
--          Default value 'active' applied at column-add time by Lock 8's
--          astra_registry / nova_registry; this migration only creates the
--          type. Lock 8 is a separate migration with its own apply window.
--
--     3b — public.bling_transactions.currency_type column:
--          TEXT NOT NULL DEFAULT 'BLING' with a CHECK constraint pinning
--          the namespace to 'BLING' or 'DIGIT_<id>'. The CHECK uses
--          ESCAPE '\' so the underscore in DIGIT_ is treated literally,
--          not as a wildcard.
--
--          A partial index on currency_type WHERE currency_type <> 'BLING'
--          keeps reads cheap once DiGiTs exist (most rows will remain
--          'BLING'; partial index only carries the DiGiT minority).
--
--   No RPC bodies change in this migration. Existing bling_send / bling_free /
--   bling_fill_order / bling_credit_purchase INSERTs into bling_transactions
--   omit currency_type and pick up the 'BLING' default. DiGiT-aware RPCs
--   land at BLiNG! build day or later.
--
-- Idempotency:
--   Pre-flight DO block checks pg_type for 'astra_or_nova_status' and
--   information_schema.columns for bling_transactions.currency_type:
--     both absent          → migration unapplied, proceed.
--     both present         → migration already applied, RAISE NOTICE
--                            and short-circuit (the rest of the migration
--                            uses CREATE TYPE / ADD COLUMN / ADD CONSTRAINT
--                            patterns that are themselves idempotent under
--                            IF NOT EXISTS / DROP-IF-EXISTS guards below).
--     mixed state          → unexpected, raise exception. Investigate
--                            before proceeding.
--
-- House-style notes:
--   * Single BEGIN/COMMIT.
--   * CREATE TYPE … IF NOT EXISTS is not supported in Postgres for ENUM types,
--     so the type creation is wrapped in a DO block that probes pg_type first.
--   * ADD COLUMN IF NOT EXISTS makes the column add idempotent. The CHECK
--     constraint is dropped-then-added under DROP IF EXISTS to allow
--     re-running this migration to refresh the constraint shape.
--   * Partial index uses CREATE INDEX IF NOT EXISTS for idempotency.
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight: detect already-applied state, abort on mixed state.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_enum_exists    boolean;
    v_column_exists  boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'astra_or_nova_status'
          AND typnamespace = 'public'::regnamespace
    ) INTO v_enum_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'bling_transactions'
          AND column_name  = 'currency_type'
    ) INTO v_column_exists;

    IF v_enum_exists AND v_column_exists THEN
        RAISE NOTICE
            'Lock 3 already applied (astra_or_nova_status enum + currency_type column both present). '
            'Idempotent re-run will refresh the CHECK constraint and partial index without other effect.';
    ELSIF NOT v_enum_exists AND NOT v_column_exists THEN
        RAISE NOTICE 'Pre-flight OK: neither Lock 3 artifact present. Proceeding.';
    ELSE
        RAISE EXCEPTION
            'Pre-flight failed: Lock 3 is in mixed state (enum exists: %, column exists: %). '
            'Investigate before proceeding.',
            v_enum_exists, v_column_exists;
    END IF;
END
$$;

-- ───────────────────────────────────────────────────────────────────────
-- Lock 3a · astra_or_nova_status enum
-- 'active' default; 'archived' for retired Astras / Novas; 'off_grid' for
-- Lock 9.6 Tier 3 (operator-managed, severed from freedomblings.com).
-- Consumed by Lock 8's astra_registry.status and nova_registry.status —
-- not in this migration; this migration only ships the type.
-- ───────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'astra_or_nova_status'
          AND typnamespace = 'public'::regnamespace
    ) THEN
        CREATE TYPE public.astra_or_nova_status AS ENUM ('active', 'archived', 'off_grid');
    END IF;
END
$$;

-- ───────────────────────────────────────────────────────────────────────
-- Lock 3b · bling_transactions.currency_type
-- TEXT, NOT NULL, default 'BLING' so existing rows + existing RPC INSERTs
-- (which omit currency_type) stay valid without migration churn.
-- CHECK constraint pins the namespace: either literally 'BLING', or matches
-- the LIKE pattern 'DIGIT\_%' under ESCAPE '\' (so DIGIT_<id> is required;
-- bare 'DIGIT' or 'DIGITX' are rejected).
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.bling_transactions
    ADD COLUMN IF NOT EXISTS currency_type TEXT NOT NULL DEFAULT 'BLING';

ALTER TABLE public.bling_transactions
    DROP CONSTRAINT IF EXISTS bling_tx_currency_type_chk;

ALTER TABLE public.bling_transactions
    ADD  CONSTRAINT bling_tx_currency_type_chk
        CHECK (currency_type = 'BLING' OR currency_type LIKE 'DIGIT\_%' ESCAPE '\');

-- Partial index: only carries non-'BLING' rows. Keeps the index small
-- until DiGiTs exist; useful for "list all transactions in DiGiT_<id>"
-- read patterns when DiGiTs ship.
CREATE INDEX IF NOT EXISTS bling_tx_currency_type_idx
    ON public.bling_transactions (currency_type)
    WHERE currency_type <> 'BLING';


COMMIT;


-- =============================================================================
-- VERIFICATION (run AFTER COMMIT)
-- =============================================================================
-- (1) astra_or_nova_status enum exists with the expected three labels:
--     SELECT enumlabel
--     FROM pg_enum
--     JOIN pg_type t ON t.oid = enumtypid
--     WHERE t.typname = 'astra_or_nova_status'
--     ORDER BY enumsortorder;
--     -- expect: active, archived, off_grid
--
-- (2) currency_type column exists with the expected default and NOT NULL:
--     SELECT column_name, data_type, is_nullable, column_default
--     FROM information_schema.columns
--     WHERE table_schema = 'public'
--       AND table_name   = 'bling_transactions'
--       AND column_name  = 'currency_type';
--     -- expect: text, NO, 'BLING'::text
--
-- (3) CHECK constraint exists and rejects non-'BLING' / non-'DIGIT_<id>' values:
--     SELECT pg_get_constraintdef(c.oid)
--     FROM pg_constraint c
--     JOIN pg_class t ON t.oid = c.conrelid
--     WHERE t.relname = 'bling_transactions' AND c.conname = 'bling_tx_currency_type_chk';
--     -- expect: CHECK constraint def including 'BLING' and 'DIGIT\_%' ESCAPE '\'.
--
-- (4) Partial index exists:
--     SELECT indexdef
--     FROM pg_indexes
--     WHERE schemaname = 'public'
--       AND indexname  = 'bling_tx_currency_type_idx';
--     -- expect: CREATE INDEX … WHERE (currency_type <> 'BLING')
--
-- (5) Existing rows all carry currency_type = 'BLING' (fresh-default case):
--     SELECT currency_type, count(*)
--     FROM public.bling_transactions
--     GROUP BY currency_type;
--     -- expect: single row { 'BLING', N } where N = total tx count.
--
-- (6) Negative test (run on branch DB):
--     INSERT INTO public.bling_transactions (bee_id, type, amount, currency_type)
--     VALUES ('00000000-0000-0000-0000-000000000bee', 'sent', 1, 'DIGIT');
--     -- expect: ERROR  new row violates check constraint "bling_tx_currency_type_chk"
--     INSERT INTO public.bling_transactions (bee_id, type, amount, currency_type)
--     VALUES ('00000000-0000-0000-0000-000000000bee', 'sent', 1, 'DIGIT_acme');
--     -- expect: insert succeeds (well-formed namespace).


-- =============================================================================
-- ROLLBACK (commented out — for reference)
-- =============================================================================
-- BEGIN;
-- DROP INDEX IF EXISTS public.bling_tx_currency_type_idx;
-- ALTER TABLE public.bling_transactions DROP CONSTRAINT IF EXISTS bling_tx_currency_type_chk;
-- ALTER TABLE public.bling_transactions DROP COLUMN IF EXISTS currency_type;
-- DROP TYPE IF EXISTS public.astra_or_nova_status;
-- COMMIT;
--
-- ⚠ Rolling back the enum drop will fail if any subsequent migration
-- (Lock 8) has already added astra_registry.status / nova_registry.status
-- columns of this enum type. Drop those first, or use DROP TYPE … CASCADE
-- with explicit awareness of what cascades.
