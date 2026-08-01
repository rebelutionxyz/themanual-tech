-- =====================================================================
-- OPS49 - oracle_debit_tokens: the server-side debit path.
--
-- DRAFT, NOT APPLIED. Filed under migrations/_drafts/ because the OPS49
-- dispatch neither NAMES a migration file nor STATES a rollback, and root
-- CLAUDE.md R7 (MIGRATION AMENDMENT) requires both in the dispatch before
-- an apply runs. Question filed as OPS49-Q. To promote, move to:
--   supabase/migrations/20260801170000_oracle_debit_tokens_rpc.sql
-- The rollback for the re-dispatch to quote is at the foot of this file.
--
-- WHAT THIS CLOSES (OPS48 W-1 / OPS49 premise, both re-verified live):
--   atlasoracle-route/index.ts:894 writes the token debit as a DIRECT
--   INSERT with service_role, and :704 reads the balance from a view.
--   Spend-plan-first (TB-1) therefore lives in TypeScript. After this,
--   the RPC owns both the read and the write and the route owns neither.
--
-- APPEND-ONLY IS PRESERVED: exactly one 'debit' row per directive, no
-- UPDATE, no DELETE, no second leg. The plan/purchased split is DERIVED
-- at read time (OPS48 s4b) and returned for display only.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. oracle_token_available - the TB-1 balance, computed correctly.
--
-- THE DISPATCH'S SUGGESTED FORMULA IS WRONG AND MUST NOT BE USED. It says
-- "sum of non-expired grants+purchases minus prior debits". That under-
-- reports every bee who ever had a plan, because the expired grant leaves
-- the sum while the debits it paid for stay behind:
--
--   purchase 100, plan grant 1000 expiring at T, 300 spent during cycle
--   after T:  naive = 100 - 300 = -200      <- wrong, and negative
--             true  = 100                    <- the 300 came out of plan
--
-- Correct attribution, per cycle window [grant.created_at, grant.expires_at):
--   plan_consumed      = LEAST(grant, spent_in_window)
--   purchased_consumed = GREATEST(0, spent_in_window - grant)
-- Only purchased_consumed ever touches the durable balance. Expiry is a
-- read-time predicate: nothing is written when a cycle ends.
--
-- SECURITY INVOKER on purpose: the only grantee is service_role, and
-- oracle_debit_tokens (DEFINER, runs as owner) can read through it. A
-- DEFINER here would be a per-bee balance oracle waiting to be mis-granted.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.oracle_token_available(p_bee uuid)
RETURNS TABLE (plan_available numeric, purchased_available numeric, total_available numeric)
LANGUAGE sql
STABLE
SET search_path = public
AS $fn$
  WITH cycles AS (
    SELECT id, amount_tokens, created_at AS win_start, expires_at AS win_end,
           (expires_at > now()) AS is_active
      FROM oracle_token_ledger
     WHERE bee_id = p_bee AND entry_type = 'grant' AND expires_at IS NOT NULL
  ),
  debits AS (
    SELECT created_at, -amount_tokens AS amt          -- positive magnitude
      FROM oracle_token_ledger
     WHERE bee_id = p_bee AND entry_type = 'debit'
  ),
  per_cycle AS (
    SELECT c.amount_tokens, c.is_active,
           COALESCE((SELECT sum(d.amt) FROM debits d
                      WHERE d.created_at >= c.win_start
                        AND d.created_at <  c.win_end), 0) AS spent_in_cycle
      FROM cycles c
  ),
  attributed AS (
    SELECT is_active, amount_tokens,
           LEAST(amount_tokens, spent_in_cycle)        AS plan_consumed,
           GREATEST(0, spent_in_cycle - amount_tokens) AS purchased_consumed
      FROM per_cycle
  ),
  outside AS (   -- debits belonging to no cycle: fully purchased
    SELECT COALESCE(sum(d.amt), 0) AS amt
      FROM debits d
     WHERE NOT EXISTS (SELECT 1 FROM cycles c
                        WHERE d.created_at >= c.win_start
                          AND d.created_at <  c.win_end)
  ),
  durable_credits AS (   -- purchases, non-plan grants, adjustments (refunds are negative)
    SELECT COALESCE(sum(amount_tokens), 0) AS amt
      FROM oracle_token_ledger
     WHERE bee_id = p_bee
       AND entry_type IN ('purchase','grant','adjustment')
       AND expires_at IS NULL
  ),
  calc AS (
    SELECT
      COALESCE((SELECT sum(a.amount_tokens - a.plan_consumed)
                  FROM attributed a WHERE a.is_active), 0) AS plan_av,
      (SELECT amt FROM durable_credits)
        - COALESCE((SELECT sum(a.purchased_consumed) FROM attributed a), 0)
        - (SELECT amt FROM outside)                        AS purch_av
  )
  SELECT plan_av, purch_av, plan_av + purch_av FROM calc;
$fn$;

REVOKE ALL ON FUNCTION public.oracle_token_available(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.oracle_token_available(uuid) TO service_role;


-- ---------------------------------------------------------------------
-- 2. oracle_debit_tokens - the ONLY debit path.
--
-- Idempotent per directive (W-9): the pre-check under an advisory lock
-- returns duplicate:true, and the partial unique index is the backstop
-- that holds even if the lock is ever removed.
--
-- THE ADVISORY LOCK IS NOT DECORATION. Without it two concurrent
-- directives for one bee both read available=100 and both debit 100,
-- overdrawing. That is the check-then-act shape OPS38 P3 flagged. The
-- lock is per-bee and transaction-scoped, so it serialises one bee's
-- debits and nothing else.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.oracle_debit_tokens(
  p_bee            uuid,
  p_directive      uuid,
  p_amount_tokens  numeric,
  p_memo           text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_plan  numeric; v_purch numeric; v_total numeric;
  v_plan_part numeric; v_purch_part numeric;
  v_id uuid; v_existing uuid;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'oracle_debit_tokens is service-role / admin only';
  END IF;
  IF p_bee IS NULL OR p_directive IS NULL THEN
    RAISE EXCEPTION 'bee and directive are both required';
  END IF;
  IF p_amount_tokens IS NULL OR p_amount_tokens <= 0 THEN
    RAISE EXCEPTION 'amount_tokens must be > 0 (got %)', p_amount_tokens;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_bee::text, 0));

  SELECT id INTO v_existing
    FROM oracle_token_ledger
   WHERE entry_type = 'debit' AND directive_id = p_directive;

  IF v_existing IS NOT NULL THEN
    SELECT a.plan_available, a.purchased_available, a.total_available
      INTO v_plan, v_purch, v_total
      FROM oracle_token_available(p_bee) a;
    RETURN jsonb_build_object(
      'debited', false, 'duplicate', true, 'ledger_id', v_existing,
      'plan_available', v_plan, 'purchased_available', v_purch,
      'total_available', v_total);
  END IF;

  SELECT a.plan_available, a.purchased_available, a.total_available
    INTO v_plan, v_purch, v_total
    FROM oracle_token_available(p_bee) a;

  IF v_total < p_amount_tokens THEN
    RAISE EXCEPTION 'insufficient tokens: need %, available %', p_amount_tokens, v_total
      USING ERRCODE = 'check_violation';
  END IF;

  -- Display split only. Plan tokens are spent first by construction, so
  -- this is a report of what the single debit row consumed, not a second row.
  v_plan_part  := LEAST(v_plan, p_amount_tokens);
  v_purch_part := p_amount_tokens - v_plan_part;

  INSERT INTO oracle_token_ledger
    (bee_id, entry_type, amount_tokens, directive_id, memo)
  VALUES
    (p_bee, 'debit', -p_amount_tokens, p_directive, p_memo)
  ON CONFLICT (directive_id) WHERE (entry_type = 'debit' AND directive_id IS NOT NULL)
  DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    -- Lost a race the lock should have prevented. The index held anyway.
    SELECT id INTO v_existing FROM oracle_token_ledger
     WHERE entry_type = 'debit' AND directive_id = p_directive;
    SELECT a.plan_available, a.purchased_available, a.total_available
      INTO v_plan, v_purch, v_total FROM oracle_token_available(p_bee) a;
    RETURN jsonb_build_object(
      'debited', false, 'duplicate', true, 'ledger_id', v_existing,
      'plan_available', v_plan, 'purchased_available', v_purch,
      'total_available', v_total);
  END IF;

  SELECT a.plan_available, a.purchased_available, a.total_available
    INTO v_plan, v_purch, v_total
    FROM oracle_token_available(p_bee) a;

  RETURN jsonb_build_object(
    'debited', true, 'duplicate', false, 'ledger_id', v_id,
    'amount_tokens', p_amount_tokens,
    'from_plan', v_plan_part, 'from_purchased', v_purch_part,
    'plan_available', v_plan, 'purchased_available', v_purch,
    'total_available', v_total);
END $fn$;

REVOKE ALL ON FUNCTION public.oracle_debit_tokens(uuid,uuid,numeric,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.oracle_debit_tokens(uuid,uuid,numeric,text) TO service_role;

COMMIT;


-- =====================================================================
-- ROLLBACK - exact. Quote this in the re-dispatch (R7).
-- =====================================================================
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.oracle_debit_tokens(uuid,uuid,numeric,text);
-- DROP FUNCTION IF EXISTS public.oracle_token_available(uuid);
-- COMMIT;
--
-- SAFE AT ANY TIME, AND THAT IS NOT AN ACCIDENT: this migration creates
-- two functions and writes no rows, alters no table, and drops nothing.
-- Rolling back cannot lose data. The ONLY ordering constraint is with the
-- route: if the edge function has already been deployed calling
-- oracle_debit_tokens, dropping it makes every paid directive fail its
-- debit. Roll the route back FIRST, then the functions.
--
-- POST-ROLLBACK VERIFICATION
--   SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--    WHERE n.nspname='public' AND proname IN ('oracle_debit_tokens','oracle_token_available');
--   -- expect 0 rows
-- =====================================================================
