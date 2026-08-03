-- ═══════════════════════════════════════════════════════════════════════
-- F-1 FIX — EXPLICIT DEBIT ATTRIBUTION replaces time-window arithmetic.
-- Plus the F-3 debt: widen subscriptions_status_check to accept 'paused'.
--
-- Authored by DB23 (2026-08-03) executing the lead ruling in ORACLE_MF v0.48:
-- SHAPE (a) — attribute each debit at debit time to specific credit rows,
-- FIFO by soonest expires_at, plan grants before durable purchases, with the
-- attribution RECORDED. Shape (b), window clamping, was rejected: it silently
-- shortens the earlier paid cycle, and the house pattern is record-not-infer.
--
-- THE DEFECT (OPS67 F-1, battery s5). oracle_token_available attributed a
-- debit to every grant whose window [created_at, expires_at) contained it.
-- When two grant windows OVERLAP — the ordinary re-subscribe, where the paid-for
-- first month is still live as the new cycle opens — one debit was charged
-- against BOTH cycles independently, and the spill was subtracted from the
-- durable balance once per overlapping cycle. Measured: a single 12,000 debit
-- against 20,000 plan + 5,000 pack left a true balance of 13,000 reading as
-- 1,000. 12,000 Tokens destroyed, including durable pack Tokens a plan was
-- never supposed to be able to touch. The error always runs against the Bee.
--
-- THE FIX. A debit is charged exactly once, to named sources, and the record of
-- that charge is a row. Availability becomes credits minus recorded consumption
-- — no time arithmetic anywhere, so overlap is not a case that has to be
-- reasoned about. It is simply not expressible.
--
-- ONE AUTHORITY (dispatch W-9). oracle_token_available is the only definition of
-- what a Bee has. oracle_debit_tokens' sufficiency check calls it rather than
-- computing its own answer, and oracle_token_balances reads it unchanged. The
-- function's signature and return columns are IDENTICAL to the version it
-- replaces, so the view and src/lib/atlasoracle/tokens.ts need no change.
--
-- REPLAY SAFETY (dispatch W-9). oracle_token_ledger_one_debit_per_directive_uidx
-- is untouched and remains the guard: one debit row per directive, forever.
-- Consumption rows are written in the SAME transaction as the debit row they
-- attribute, so a replay that cannot create a debit row cannot create
-- consumption either. oracle_token_consumption_one_per_debit_source_uidx is a
-- second, independent guard on the same property.
--
-- ROLLBACK: 20260803120100_f1_explicit_token_attribution_rollback.sql
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1 · THE ATTRIBUTION RECORD
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.oracle_token_consumption (
  id            uuid primary key default gen_random_uuid(),
  bee_id        uuid        not null references public.bees(id),
  debit_id      uuid        not null references public.oracle_token_ledger(id),
  -- NULL source_id means the durable pool: never-expiring purchases, non-plan
  -- grants and adjustments, taken together. Durable credits are fungible and
  -- never expire, so which purchase a Token came from is economically
  -- meaningless — and the pool legitimately contains NEGATIVE rows (refunds),
  -- which cannot be FIFO-consumed row by row. oracle_refund_token_purchase
  -- already caps refunds against the aggregate purchased_available, so nothing
  -- in the system wants per-purchase attribution.
  source_id     uuid            null references public.oracle_token_ledger(id),
  amount_tokens numeric     not null check (amount_tokens > 0),
  created_at    timestamptz not null default now()
);

comment on table public.oracle_token_consumption is
  'Append-only attribution: which credit row each Oracle Token debit consumed. '
  'Metadata only, no directive content. NULL source_id = the durable pool. '
  'Written only by oracle_debit_tokens; never updated, never deleted. DB23.';

create index if not exists oracle_token_consumption_source_idx
  on public.oracle_token_consumption (source_id) where source_id is not null;
create index if not exists oracle_token_consumption_bee_idx
  on public.oracle_token_consumption (bee_id);
create index if not exists oracle_token_consumption_debit_idx
  on public.oracle_token_consumption (debit_id);

-- NULLS NOT DISTINCT so the durable-pool row (source_id IS NULL) is covered by
-- the guard too. A plain unique index treats every NULL as distinct and would
-- leave exactly the double-charge path this migration exists to close.
create unique index if not exists oracle_token_consumption_one_per_debit_source_uidx
  on public.oracle_token_consumption (debit_id, source_id) nulls not distinct;

alter table public.oracle_token_consumption enable row level security;

-- Deny-all by construction: RLS on, zero permissive policies. The SECURITY
-- DEFINER routines below run as the owner and are the only writers.
-- The explicit REVOKEs matter and are not redundant: Supabase default
-- privileges auto-grant to anon/authenticated at CREATE time, so revoking
-- PUBLIC alone leaves those grants standing (the bee_follows_v1a lesson).
revoke all on public.oracle_token_consumption from public;
revoke all on public.oracle_token_consumption from anon;
revoke all on public.oracle_token_consumption from authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 2 · BACKFILL — replay existing history under the new rule
-- ─────────────────────────────────────────────────────────────────────────
-- Every debit already in the ledger needs its attribution, or availability
-- would change the moment the new function goes live. The replay is FIFO by
-- expiry in ledger order, evaluated AS AT each debit's own created_at: a grant
-- that had not opened yet, or had already lapsed, was not spendable then and is
-- not attributable now.
--
-- This deliberately does NOT reproduce the old function's answers. The old
-- answers were wrong in the overlap case; reproducing them would preserve the
-- defect. Where a balance moves, it moves toward the truth, and the report
-- records every movement.

do $backfill$
declare
  d          record;
  g          record;
  v_remaining numeric;
  v_take      numeric;
  v_rows      integer := 0;
begin
  for d in
    select l.id, l.bee_id, l.created_at, -l.amount_tokens as amount
      from public.oracle_token_ledger l
     where l.entry_type = 'debit'
       and not exists (select 1 from public.oracle_token_consumption c
                        where c.debit_id = l.id)
     order by l.bee_id, l.created_at, l.id
  loop
    v_remaining := d.amount;

    for g in
      select l.id,
             l.amount_tokens
               - coalesce((select sum(c.amount_tokens)
                             from public.oracle_token_consumption c
                            where c.source_id = l.id), 0) as remaining
        from public.oracle_token_ledger l
       where l.bee_id     = d.bee_id
         and l.entry_type = 'grant'
         and l.expires_at is not null
         and l.created_at <= d.created_at
         and l.expires_at >  d.created_at
       order by l.expires_at, l.created_at, l.id
    loop
      exit when v_remaining <= 0;
      v_take := least(g.remaining, v_remaining);
      if v_take > 0 then
        insert into public.oracle_token_consumption (bee_id, debit_id, source_id, amount_tokens)
        values (d.bee_id, d.id, g.id, v_take);
        v_remaining := v_remaining - v_take;
        v_rows := v_rows + 1;
      end if;
    end loop;

    if v_remaining > 0 then
      insert into public.oracle_token_consumption (bee_id, debit_id, source_id, amount_tokens)
      values (d.bee_id, d.id, null, v_remaining);
      v_rows := v_rows + 1;
    end if;
  end loop;

  raise notice 'DB23 backfill: % consumption rows written', v_rows;
end
$backfill$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3 · THE AUTHORITY — availability is credits minus recorded consumption
-- ─────────────────────────────────────────────────────────────────────────
-- Signature and return columns are unchanged from the version this replaces,
-- so oracle_token_balances and oracle_refund_token_purchase keep working
-- without being touched.

create or replace function public.oracle_token_available(p_bee uuid)
returns table(plan_available numeric, purchased_available numeric, total_available numeric)
language sql
stable
set search_path to 'public'
as $function$
  with live_grants as (
    -- Expiring plan grants still inside their promised window. A lapsed grant's
    -- unconsumed remainder simply stops counting — the same write-off the old
    -- function performed, now without the time arithmetic.
    select l.id, l.amount_tokens
      from oracle_token_ledger l
     where l.bee_id = p_bee
       and l.entry_type = 'grant'
       and l.expires_at is not null
       and l.expires_at > now()
  ),
  plan_calc as (
    select coalesce(sum(
             greatest(0, g.amount_tokens
                         - coalesce((select sum(c.amount_tokens)
                                       from oracle_token_consumption c
                                      where c.source_id = g.id), 0))
           ), 0) as amt
      from live_grants g
  ),
  durable_credits as (
    select coalesce(sum(l.amount_tokens), 0) as amt
      from oracle_token_ledger l
     where l.bee_id = p_bee
       and l.entry_type in ('purchase','grant','adjustment')
       and l.expires_at is null
  ),
  durable_spent as (
    select coalesce(sum(c.amount_tokens), 0) as amt
      from oracle_token_consumption c
     where c.bee_id = p_bee
       and c.source_id is null
  ),
  calc as (
    select (select amt from plan_calc) as plan_av,
           (select amt from durable_credits) - (select amt from durable_spent) as purch_av
  )
  select plan_av, purch_av, plan_av + purch_av from calc;
$function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4 · THE DEBIT — attribute at debit time, record it, then report it
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.oracle_debit_tokens(
  p_bee uuid, p_directive uuid, p_amount_tokens numeric, p_memo text default null::text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  v_plan  numeric; v_purch numeric; v_total numeric;
  v_plan_part numeric := 0; v_purch_part numeric := 0;
  v_remaining numeric; v_take numeric;
  v_id uuid; v_existing uuid;
  g record;
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

  -- Sufficiency is read from the SAME authority the balance is read from.
  -- Two definitions of "what this Bee has" is how F-1 stayed invisible: the
  -- debit RPC reported from_plan 12000 / from_purchased 0 while the balance
  -- function billed the pack anyway.
  SELECT a.plan_available, a.purchased_available, a.total_available
    INTO v_plan, v_purch, v_total
    FROM oracle_token_available(p_bee) a;

  IF v_total < p_amount_tokens THEN
    RAISE EXCEPTION 'insufficient tokens: need %, available %', p_amount_tokens, v_total
      USING ERRCODE = 'check_violation';
  END IF;

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

  -- ATTRIBUTION. FIFO by soonest expiry across live plan grants, then the
  -- durable pool. Written in this transaction, alongside the debit row it
  -- explains, so the two can never disagree.
  v_remaining := p_amount_tokens;

  FOR g IN
    SELECT l.id,
           l.amount_tokens
             - COALESCE((SELECT sum(c.amount_tokens) FROM oracle_token_consumption c
                          WHERE c.source_id = l.id), 0) AS remaining
      FROM oracle_token_ledger l
     WHERE l.bee_id = p_bee
       AND l.entry_type = 'grant'
       AND l.expires_at IS NOT NULL
       AND l.expires_at > now()
     ORDER BY l.expires_at, l.created_at, l.id
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_take := LEAST(g.remaining, v_remaining);
    IF v_take > 0 THEN
      INSERT INTO oracle_token_consumption (bee_id, debit_id, source_id, amount_tokens)
      VALUES (p_bee, v_id, g.id, v_take);
      v_remaining  := v_remaining - v_take;
      v_plan_part  := v_plan_part + v_take;
    END IF;
  END LOOP;

  IF v_remaining > 0 THEN
    INSERT INTO oracle_token_consumption (bee_id, debit_id, source_id, amount_tokens)
    VALUES (p_bee, v_id, NULL, v_remaining);
    v_purch_part := v_remaining;
  END IF;

  SELECT a.plan_available, a.purchased_available, a.total_available
    INTO v_plan, v_purch, v_total
    FROM oracle_token_available(p_bee) a;

  -- from_plan / from_purchased are now the RECORDED split, not a re-derived
  -- guess. They sum to p_amount_tokens by construction.
  RETURN jsonb_build_object(
    'debited', true, 'duplicate', false, 'ledger_id', v_id,
    'amount_tokens', p_amount_tokens,
    'from_plan', v_plan_part, 'from_purchased', v_purch_part,
    'plan_available', v_plan, 'purchased_available', v_purch,
    'total_available', v_total);
END $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 5 · F-3 DEBT — subscriptions_status_check accepts 'paused'
-- ─────────────────────────────────────────────────────────────────────────
-- Stripe emits `paused` under pause_collection. The CHECK refused it, so
-- subscription_sync threw on every delivery and Stripe retried forever
-- (OPS67 F-3, battery s7). The source fix acks unknown statuses; the schema
-- should stop refusing a status Stripe legitimately sends.

alter table public.subscriptions drop constraint if exists subscriptions_status_check;
alter table public.subscriptions add constraint subscriptions_status_check
  check (status = any (array[
    'active','past_due','canceled','incomplete','incomplete_expired',
    'trialing','unpaid','paused'
  ]));
