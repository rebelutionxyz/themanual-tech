-- DB16 / OPS38 draft A -- press_payments replay-safety, part 1 of 2.
--
-- Enforces at most one payment row per Stripe external_ref. This is the
-- structural half of the fix: without it, draft B's ON CONFLICT has no arbiter
-- index and every call to press_record_payment would raise.
--
-- Built CONCURRENTLY, so this statement CANNOT run inside a transaction block
-- and its supabase_migrations.schema_migrations row is written immediately
-- after, in the same psql session (see DB16 report).
--
-- Apply order: A before B. B before A makes every call raise.
--
-- ROLLBACK:
--   DROP INDEX CONCURRENTLY public.press_payments_stripe_ref_uidx;
--   (restore draft B's predecessor definition BEFORE dropping this index)

CREATE UNIQUE INDEX CONCURRENTLY press_payments_stripe_ref_uidx
  ON public.press_payments (external_ref)
  WHERE method = 'stripe' AND external_ref IS NOT NULL;
