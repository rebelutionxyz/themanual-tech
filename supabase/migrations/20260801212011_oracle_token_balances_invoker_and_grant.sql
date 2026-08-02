-- OPS49d finding: OPS49c's CREATE OR REPLACE VIEW silently reset security_invoker=true, and the
-- new view body calls oracle_token_available() which authenticated could not EXECUTE. Net effect:
-- every signed-in read of oracle_token_balances errored (chip broken) - failing closed only by
-- accident, since restoring the grant WITHOUT invoker would leak all bees' balances to any
-- authenticated reader. Both halves together, atomically:
alter view public.oracle_token_balances set (security_invoker = true);
grant execute on function public.oracle_token_available(uuid) to authenticated;
-- Invoker semantics + invoker-rights SQL function = the ledger is read under the CALLER's RLS,
-- so each Bee computes only their own balance. service_role (the 402 gate / route) bypasses and
-- was never affected. anon deliberately NOT granted (fails closed).
-- Dry-run proof 2026-08-01: authenticated SELECT errors before, succeeds after, reloptions restored.
-- LESSON (view-replacement checklist): CREATE OR REPLACE VIEW resets reloptions and drops comments;
-- any future replace of this view must restate security_invoker=true and re-apply column comments.
