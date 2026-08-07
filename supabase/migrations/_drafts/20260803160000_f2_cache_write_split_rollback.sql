-- ═══════════════════════════════════════════════════════════════════════
-- ROLLBACK for 20260803163000_f2_cache_write_split.sql
--
-- Authored by DB27 (2026-08-03), WRITTEN BEFORE the forward migration per the
-- reconciliation discipline and R7's MIGRATION AMENDMENT.
--
-- WHAT IT UNDOES. The forward migration adds two nullable columns and widens
-- one CHECK constraint. Nothing is dropped, renamed, or rewritten by the
-- forward migration, and no data is altered outside the two new columns, so
-- this rollback is a clean structural reversal with NO data loss for anything
-- that existed before the apply.
--
-- WHAT IT DOES DESTROY. Any `cache_write_per_m` rate values and any
-- `cache_write_tokens` counts recorded AFTER the forward migration ran. That is
-- unavoidable — the columns are the only place those values live. If directives
-- have been served between apply and rollback, their cache-write split becomes
-- unrecoverable again, exactly as it is for the eight pre-existing debits.
-- Ledger rows are NOT touched: no debit is reversed, adjusted, or deleted here.
-- A Bee charged under the corrected rate stays charged; correcting that would
-- be a reversing entry, not a rollback.
--
-- ORDER. Reverse of the forward migration: directives column, then the rate
-- constraint, then the rate column. The constraint is restored to its exact
-- pre-migration definition before the column it references is dropped.
--
-- SAFETY. Idempotent (IF EXISTS throughout) and transactional — psql wraps a
-- single -f invocation per statement, so this file is written to be safe to run
-- twice. Verified against the pre-migration catalog captured in REPORT.md.
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. atlasoracle_directives.cache_write_tokens ───
ALTER TABLE public.atlasoracle_directives
  DROP COLUMN IF EXISTS cache_write_tokens;

-- ─── 2. Restore the ORIGINAL oracle_model_rates CHECK constraint ───
-- Pre-migration definition, verbatim from pg_catalog on 2026-08-03:
--   CHECK (input_tokens_per_m >= 0::numeric
--          AND output_tokens_per_m >= 0::numeric
--          AND (cached_input_per_m IS NULL OR cached_input_per_m >= 0::numeric))
ALTER TABLE public.oracle_model_rates
  DROP CONSTRAINT IF EXISTS oracle_model_rates_nonneg_chk;

ALTER TABLE public.oracle_model_rates
  ADD CONSTRAINT oracle_model_rates_nonneg_chk CHECK (
    input_tokens_per_m  >= 0::numeric
    AND output_tokens_per_m >= 0::numeric
    AND (cached_input_per_m IS NULL OR cached_input_per_m >= 0::numeric)
  );

-- ─── 3. oracle_model_rates.cache_write_per_m ───
ALTER TABLE public.oracle_model_rates
  DROP COLUMN IF EXISTS cache_write_per_m;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════
-- POST-ROLLBACK VERIFICATION (run these, do not assume):
--
--   SELECT column_name FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='oracle_model_rates'
--      AND column_name='cache_write_per_m';           -- expect 0 rows
--
--   SELECT column_name FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='atlasoracle_directives'
--      AND column_name='cache_write_tokens';          -- expect 0 rows
--
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--    WHERE conname='oracle_model_rates_nonneg_chk';   -- expect the 3-clause form
--
-- THE ROUTER MUST BE ROLLED BACK TOO. The deployed atlasoracle-route selects
-- cache_write_per_m and writes cache_write_tokens. Rolling back this migration
-- while the new route is live will fail the rate lookup and 503 every paid
-- directive. Roll the function back to its prior version FIRST, or in the same
-- window. This ordering is the single most important line in this file.
-- ═══════════════════════════════════════════════════════════════════════
