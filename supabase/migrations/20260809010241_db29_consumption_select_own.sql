-- ═══════════════════════════════════════════════════════════════════════
-- DB29 — restore the Bee-facing balance read broken by DB23.  NOT APPLIED.
--
-- The two statements below are quoted VERBATIM from FRONT20-Q, which wrote and
-- rollback-proved them. Nothing here is new work: DB29 places them in a
-- migration file, re-verifies least privilege, and rehearses them again inside a
-- transaction that ends in ROLLBACK.
--
-- THE REGRESSION. DB23 (applied to production as version 20260803143034) pointed
-- the INVOKER-rights oracle_token_available (prosecdef = false) at the new
-- oracle_token_consumption table, which it created with RLS on, ZERO policies,
-- and no grant to authenticated. So the balance read executes as the signed-in
-- Bee and dies at 42501. Verified again by DB29 before writing this file:
--
--     has_table_privilege('authenticated','public.oracle_token_consumption','SELECT') = f
--     rls_enabled = t, policy_count = 0
--
-- BLAST RADIUS, measured: DISPLAY ONLY. oracle_debit_tokens and
-- oracle_refund_token_purchase are SECURITY DEFINER and unaffected; service_role
-- reads the balance fine. No Token is mis-counted. What is broken is what a Bee
-- SEES — the badge pill and the /oracle console — for every signed-in Bee.
--
-- WHY THIS SHAPE. It mirrors oracle_token_ledger exactly, which already carries
-- the identical pair (grant SELECT to authenticated + policy
-- oracle_token_ledger_select_own USING (auth.uid() = bee_id)). Same table shape,
-- same reader, same scoping — so this introduces no new pattern.
--
-- THE FIX THAT WAS REJECTED (FRONT20-Q, recorded so it is not proposed later):
-- making oracle_token_available SECURITY DEFINER. It takes p_bee as a parameter
-- and returns that Bee's balance, so owner-rights would let any signed-in Bee
-- read ANY Bee's balance by passing another uuid. That trades a visible failure
-- for a silent data leak.
--
-- ROLLBACK: _drafts/20260804120000_db29_consumption_select_own_rollback.sql
--   drop policy oracle_token_consumption_select_own on public.oracle_token_consumption;
--   revoke select on public.oracle_token_consumption from authenticated;
-- ═══════════════════════════════════════════════════════════════════════

grant select on public.oracle_token_consumption to authenticated;

create policy oracle_token_consumption_select_own
  on public.oracle_token_consumption
  for select
  to authenticated
  using (auth.uid() = bee_id);

-- Deliberately NOT granted: insert, update, delete (writes stay inside the
-- SECURITY DEFINER routines), and every privilege for anon.
