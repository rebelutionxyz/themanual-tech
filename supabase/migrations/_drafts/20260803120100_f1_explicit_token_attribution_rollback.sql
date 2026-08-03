-- ═══════════════════════════════════════════════════════════════════════
-- ROLLBACK for 20260803120000_f1_explicit_token_attribution.sql  (DB23, W-6)
--
-- Restores oracle_token_available and oracle_debit_tokens to the bodies that
-- were live in production immediately before the fix — captured verbatim from
-- pg_get_functiondef() on 2026-08-03, not retyped from memory — drops the
-- attribution table, and narrows subscriptions_status_check back.
--
-- READ THIS BEFORE RUNNING IT. Rolling back REINSTATES F-1: the balance
-- function returns to attributing debits by time window, and any Bee holding
-- two overlapping grants is silently robbed again. It is a safety valve for a
-- bad apply, not a way to undo the fix on purpose.
--
-- The narrowing in step 4 FAILS if any subscriptions row is sitting at
-- 'paused' — correctly, because dropping the value while a row holds it would
-- leave the table violating its own CHECK. Resolve those rows first.
-- ═══════════════════════════════════════════════════════════════════════

-- 1 · restore the pre-DB23 balance authority (time-window attribution)

create or replace function public.oracle_token_available(p_bee uuid)
returns table(plan_available numeric, purchased_available numeric, total_available numeric)
language sql
stable
set search_path to 'public'
as $function$
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
$function$;

-- 2 · restore the pre-DB23 debit RPC (display-split, writes no attribution)

create or replace function public.oracle_debit_tokens(
  p_bee uuid, p_directive uuid, p_amount_tokens numeric, p_memo text default null::text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
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
END $function$;

-- 3 · drop the attribution structure
--     Dropped only after both functions above no longer reference it.

drop index if exists public.oracle_token_consumption_one_per_debit_source_uidx;
drop table if exists public.oracle_token_consumption;

-- 4 · narrow subscriptions_status_check back (fails if a row holds 'paused')

alter table public.subscriptions drop constraint if exists subscriptions_status_check;
alter table public.subscriptions add constraint subscriptions_status_check
  check (status = any (array[
    'active','past_due','canceled','incomplete','incomplete_expired',
    'trialing','unpaid'
  ]));
