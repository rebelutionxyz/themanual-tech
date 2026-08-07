-- ═══════════════════════════════════════════════════════════════════════
-- F-2 FIX — SPLIT THE CACHE BUCKETS. Cache CREATION stops being billed at the
-- cache-READ rate.
--
-- Authored by DB27 (2026-08-03) executing OPS64 finding 3c / design F-2.
--
-- THE DEFECT (OPS64 §3c). Anthropic reports two disjoint cache buckets at two
-- different prices:
--
--   cache_read_input_tokens      0.1x  base input   <- route charges 0.1x. correct
--   cache_creation_input_tokens  1.25x base input   <- route charges 0.1x. 12.5x LOW
--
-- The route sums them into one `cached` number before pricing, so two different
-- tariffs are billed as one. The summing line itself is careful about the right
-- thing — the buckets ARE disjoint, and OPS15 lost ~10x by getting that wrong —
-- it just prices them identically afterwards.
--
-- MAGNITUDE, at the observed 2,256-token canon prefix:
--   claude-opus-5    correct write leg 1.25 x 12,500 = 15,625; charged 1,250
--                    -> 32.43 Oracle Tokens missed per cache-creation event
--   claude-sonnet-5  correct write leg 1.25 x  9,000 = 11,250; charged   900
--                    -> 23.36 Oracle Tokens missed per cache-creation event
--
-- For scale: directive 468f0f7f was charged 58.446 in total; a missed write leg
-- on it is 32.43. Directive d37a7032 was charged 6.2468; the miss is 23.36 —
-- nearly four times the entire debit. Live since 2026-07-27, every paid
-- directive since. It is a MARGIN leak, not a Bee-facing overcharge: the
-- direction is safe, the size is not.
--
-- THE SECOND HALF OF THE FINDING: the schema makes the leak unauditable.
-- atlasoracle_directives stores only the summed `cached_tokens`, so no query can
-- tell a write from a read after the fact. This migration fixes that going
-- forward. It CANNOT fix it backwards.
--
-- NO BACKFILL OF PAST DEBITS — deliberate, per OPS64 F-2. Corrections in an
-- append-only ledger are reversing entries, not edits, and the write/read split
-- for the eight existing debits is genuinely unrecoverable: the information was
-- never stored. cache_write_tokens is therefore NULL for every pre-existing
-- directive row, and NULL here means "unknown", not "zero". Any future revenue
-- query must treat it that way.
--
-- RATE BACKFILL IS SAFE AND IS NOT A REPRICING. cache_write_per_m is set to
-- 1.25 x input_tokens_per_m on every row, active and inactive alike, because
-- 1.25x is Anthropic's published write premium and not a pricing decision this
-- migration is entitled to make. It restores the v0.28 margin rule in a
-- dimension nobody was checking (per-cache-tier rather than per-model) rather
-- than changing the card. Inactive placeholder rows are backfilled too so rate
-- history stays re-derivable — a debit must always be re-checkable against the
-- rate row that was live when it happened.
--
-- NULLABLE, WITH A DELIBERATE FALLBACK. The column is nullable and the router
-- falls back to input_tokens_per_m when it is absent. Over-charging on a missing
-- rate is the safe direction and matches the existing
-- `cached_input_per_m ?? input_tokens_per_m` precedent already in the route.
--
-- ROUTER COUPLING — READ THIS BEFORE APPLYING. This migration is INERT on its
-- own: adding nullable columns changes no behaviour and breaks nothing. The
-- deployed atlasoracle-route (v23) does not select or write either column and is
-- unaffected. The accounting fix ships as a SEPARATE deploy under the DEPLOY
-- AMENDMENT. Apply order is therefore migration FIRST, deploy SECOND — the
-- reverse order would 503 every paid directive on a failed rate lookup.
--
-- ROLLBACK: supabase/migrations/_drafts/20260803160000_f2_cache_write_split_rollback.sql
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. oracle_model_rates gains the cache-write tariff ───
ALTER TABLE public.oracle_model_rates
  ADD COLUMN IF NOT EXISTS cache_write_per_m numeric(20,6);

COMMENT ON COLUMN public.oracle_model_rates.cache_write_per_m IS
  'Oracle Tokens per 1M cache_creation_input_tokens (Anthropic 5-min ephemeral '
  'TTL, 1.25x base input). NULL = not configured; the router falls back to '
  'input_tokens_per_m, which over-charges slightly and is the safe direction '
  'for a missing rate. Added by DB27 executing OPS64 F-2: cache CREATION was '
  'billed at the cache-READ rate, a 12.5x under-charge live since 2026-07-27.';

-- Backfill at Anthropic's published 1.25x write premium. Every row, active and
-- inactive, so rate history stays re-derivable.
UPDATE public.oracle_model_rates
   SET cache_write_per_m = ROUND(1.25 * input_tokens_per_m, 6)
 WHERE cache_write_per_m IS NULL;

-- ─── 2. Widen the non-negative CHECK to cover the new column ───
-- Same shape as the existing clauses: NULL is allowed, negative is not.
ALTER TABLE public.oracle_model_rates
  DROP CONSTRAINT IF EXISTS oracle_model_rates_nonneg_chk;

ALTER TABLE public.oracle_model_rates
  ADD CONSTRAINT oracle_model_rates_nonneg_chk CHECK (
    input_tokens_per_m  >= 0::numeric
    AND output_tokens_per_m >= 0::numeric
    AND (cached_input_per_m IS NULL OR cached_input_per_m >= 0::numeric)
    AND (cache_write_per_m  IS NULL OR cache_write_per_m  >= 0::numeric)
  );

-- ─── 3. atlasoracle_directives gains the auditable split ───
ALTER TABLE public.atlasoracle_directives
  ADD COLUMN IF NOT EXISTS cache_write_tokens integer;

COMMENT ON COLUMN public.atlasoracle_directives.cache_write_tokens IS
  'Anthropic cache_creation_input_tokens for this directive, stored separately '
  'so the write/read split is auditable. NULL means UNKNOWN, not zero: every '
  'directive served before DB27 (2026-08-03) has an unrecoverable split, '
  'because only the summed cached_tokens was ever stored. cached_tokens remains '
  'the SUM of both buckets and is unchanged, so existing readers are unaffected.';

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════
-- POST-APPLY VERIFICATION — verify BY STRUCTURE (v0.24 C-2), not by assumption:
--
--   SELECT column_name, data_type, numeric_precision, numeric_scale, is_nullable
--     FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='oracle_model_rates'
--      AND column_name='cache_write_per_m';
--   -- expect: numeric, 20, 6, YES
--
--   SELECT column_name, data_type, is_nullable
--     FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='atlasoracle_directives'
--      AND column_name='cache_write_tokens';
--   -- expect: integer, YES
--
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--    WHERE conname='oracle_model_rates_nonneg_chk';
--   -- expect the 4-clause form including cache_write_per_m
--
--   SELECT model_name, active, input_tokens_per_m, cached_input_per_m,
--          cache_write_per_m,
--          ROUND(cache_write_per_m / NULLIF(input_tokens_per_m,0), 4) AS premium
--     FROM public.oracle_model_rates ORDER BY model_name, effective_from;
--   -- expect premium = 1.2500 on every non-zero row; opus 15625, sonnet 11250,
--   -- haiku 0, llama 0
--
--   SELECT count(*) FILTER (WHERE cache_write_tokens IS NOT NULL)
--     FROM public.atlasoracle_directives;
--   -- expect 0 — no backfill, by design
-- ═══════════════════════════════════════════════════════════════════════
