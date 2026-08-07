-- ═══════════════════════════════════════════════════════════════════════
-- DB23 FOLLOW-UP — restore the Bee-facing balance read.  NOT APPLIED.
--
-- Drafted by FRONT20 (2026-08-03) after finding the badge live in the running
-- app showing "Balance unavailable -- permission denied for table
-- oracle_token_consumption". Filed as FRONT20-Q; applying it is a schema edit
-- and is outside FRONT20's hard limits. It needs its own dispatch.
--
-- THE REGRESSION. DB23's migration (applied to production as version
-- 20260803143034) made oracle_token_available read the new
-- oracle_token_consumption table. That function is LANGUAGE sql STABLE and
-- INVOKER-rights (prosecdef = false), and oracle_token_balances is
-- security_invoker=true by design (FRONT17 verified exactly that, because an
-- owner-rights view would hand every Bee the whole table). So the balance read
-- executes as the signed-in Bee -- who has no grant on the new table and faces
-- RLS with zero policies.
--
--   BEGIN; SET LOCAL ROLE authenticated;
--   SELECT * FROM oracle_token_available(...);
--   -- 42501 / permission denied for table oracle_token_consumption
--
-- BLAST RADIUS, measured: display only. oracle_debit_tokens and
-- oracle_refund_token_purchase are SECURITY DEFINER and still work, and
-- service_role reads the balance fine (4936.744400 for the largest holder), so
-- the router, the edge functions and every money movement are unaffected. What
-- is broken is what a Bee SEES: the badge pill and the /oracle console.
--
-- THE FIX. Mirror what oracle_token_ledger already does -- grant SELECT to
-- authenticated and let a select-own RLS policy scope it. anon stays denied,
-- which is correct: the badge self-hides for signed-out visitors.
--
-- THE FIX THAT WAS REJECTED: making oracle_token_available SECURITY DEFINER.
-- It takes p_bee as a parameter and returns that Bee's balance, so owner-rights
-- would let any signed-in Bee read ANY Bee's balance by passing another uuid.
-- That trades a visible failure for a silent data leak.
--
-- ROLLBACK:
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
