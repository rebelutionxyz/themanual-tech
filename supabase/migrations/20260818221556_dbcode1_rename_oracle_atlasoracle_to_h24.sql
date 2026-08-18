-- DBCODE1 FORWARD — rename atlasoracle_/oracle_ schema objects to h24_. Metadata-only, no data movement.
-- Runs as ONE transaction (apply_migration wraps it). Coordinate apply with FRONTCODE1 in the same push.
-- Generated mechanically from the live catalog defs; see the DBCODE1 proposal doc.

-- 1. TABLES
ALTER TABLE public.atlasoracle_canon_reads RENAME TO h24_canon_reads;
ALTER TABLE public.atlasoracle_directives RENAME TO h24_directives;
ALTER TABLE public.atlasoracle_provider_pool RENAME TO h24_provider_pool;
ALTER TABLE public.oracle_model_rates RENAME TO h24_model_rates;
ALTER TABLE public.oracle_token_consumption RENAME TO h24_token_consumption;
ALTER TABLE public.oracle_token_ledger RENAME TO h24_token_ledger;
ALTER TABLE public.oracle_token_packs RENAME TO h24_token_packs;
ALTER TABLE public.oracle_token_plans RENAME TO h24_token_plans;

-- 2. VIEW (its stored query auto-follows the table/function renames by OID)
ALTER VIEW public.oracle_token_balances RENAME TO h24_token_balances;

-- 3. FUNCTIONS — rename all (OID/grants/deps preserved), then recreate the 6 with renamed-object refs.
ALTER FUNCTION public.atlasoracle_check_rate_caps(p_bee_id uuid, p_tier text) RENAME TO h24_check_rate_caps;
ALTER FUNCTION public.atlasoracle_credit(p_bee_id uuid, p_amount numeric, p_source_ref uuid, p_original_debit bigint) RENAME TO h24_credit;
ALTER FUNCTION public.atlasoracle_debit(p_bee_id uuid, p_amount numeric, p_source_ref uuid) RENAME TO h24_debit;
ALTER FUNCTION public.atlasoracle_deposit_to_escrow(p_amount numeric) RENAME TO h24_deposit_to_escrow;
ALTER FUNCTION public.atlasoracle_get_escrow_balance(p_bee_id uuid) RENAME TO h24_get_escrow_balance;
ALTER FUNCTION public.atlasoracle_withdraw_from_escrow(p_amount numeric) RENAME TO h24_withdraw_from_escrow;
ALTER FUNCTION public.oracle_credit_token_purchase(p_bee_id uuid, p_pack_code text, p_payment_ref text, p_amount_cents integer, p_method text) RENAME TO h24_credit_token_purchase;
ALTER FUNCTION public.oracle_debit_tokens(p_bee uuid, p_directive uuid, p_amount_tokens numeric, p_memo text) RENAME TO h24_debit_tokens;
ALTER FUNCTION public.oracle_grant_plan_tokens(p_bee_id uuid, p_plan_tier text, p_invoice_ref text, p_period_end timestamp with time zone, p_amount_cents integer) RENAME TO h24_grant_plan_tokens;
ALTER FUNCTION public.oracle_refund_token_purchase(p_payment_ref text, p_refund_ref text, p_max_tokens numeric, p_memo text) RENAME TO h24_refund_token_purchase;
ALTER FUNCTION public.oracle_token_available(p_bee uuid) RENAME TO h24_token_available;

--    Escrow group (5): rename only — bodies carry no renamed-object ref, and their string-literal
--    DATA tags ('atlasoracle_escrow*', 'atlasoracle_refund', 'atlasoracle_directive') MUST stay (existing rows hold them).
--    The 6 below are recreated with object identifiers swapped; entry_type/plan_tier/pack_code DATA values are untouched.

-- h24_check_rate_caps
CREATE OR REPLACE FUNCTION public.h24_check_rate_caps(p_bee_id uuid, p_tier text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
    v_now timestamptz := now();
    v_t_min  integer; v_t_hour integer; v_t_day  integer;
    v_c_min  integer; v_c_hour integer; v_c_day  integer;
    v_tier_per_min  integer; v_tier_per_hour integer; v_tier_per_day  integer;
    v_combined_per_min  constant integer := 5;
    v_combined_per_hour constant integer := 40;
    v_combined_per_day  constant integer := 250;
    v_caps_hit       text[] := array[]::text[];
    v_retry_seconds  integer := 0;
begin
    if auth.uid() is not null and auth.uid() is distinct from p_bee_id then
        raise exception 'forbidden: may only query own rate caps';
    end if;

    if p_tier not in ('free', 'standard', 'frontier') then
        raise exception 'invalid tier: %', p_tier;
    end if;

    if p_tier = 'free' then
        v_tier_per_min := 2; v_tier_per_hour := 10; v_tier_per_day := 50;
    elsif p_tier = 'standard' then
        v_tier_per_min := 3; v_tier_per_hour := 30; v_tier_per_day := 200;
    else
        v_tier_per_min := 1; v_tier_per_hour := 5;  v_tier_per_day := 20;
    end if;

    select
        count(*) filter (where created_at >= v_now - interval '1 minute'),
        count(*) filter (where created_at >= v_now - interval '1 hour'),
        count(*) filter (where created_at >= v_now - interval '1 day')
      into v_t_min, v_t_hour, v_t_day
      from public.h24_directives
     where bee_id = p_bee_id and tier = p_tier;

    select
        count(*) filter (where created_at >= v_now - interval '1 minute'),
        count(*) filter (where created_at >= v_now - interval '1 hour'),
        count(*) filter (where created_at >= v_now - interval '1 day')
      into v_c_min, v_c_hour, v_c_day
      from public.h24_directives
     where bee_id = p_bee_id;

    if v_t_min >= v_tier_per_min then
        v_caps_hit := array_append(v_caps_hit, 'tier_per_minute');
        v_retry_seconds := greatest(v_retry_seconds, 60);
    end if;
    if v_t_hour >= v_tier_per_hour then
        v_caps_hit := array_append(v_caps_hit, 'tier_per_hour');
        v_retry_seconds := greatest(v_retry_seconds, 3600);
    end if;
    if v_t_day >= v_tier_per_day then
        v_caps_hit := array_append(v_caps_hit, 'tier_per_day');
        v_retry_seconds := greatest(v_retry_seconds, 86400);
    end if;
    if v_c_min >= v_combined_per_min then
        v_caps_hit := array_append(v_caps_hit, 'combined_per_minute');
        v_retry_seconds := greatest(v_retry_seconds, 60);
    end if;
    if v_c_hour >= v_combined_per_hour then
        v_caps_hit := array_append(v_caps_hit, 'combined_per_hour');
        v_retry_seconds := greatest(v_retry_seconds, 3600);
    end if;
    if v_c_day >= v_combined_per_day then
        v_caps_hit := array_append(v_caps_hit, 'combined_per_day');
        v_retry_seconds := greatest(v_retry_seconds, 86400);
    end if;

    return jsonb_build_object(
        'allowed',              array_length(v_caps_hit, 1) is null,
        'retry_after_seconds',  v_retry_seconds,
        'caps_hit',             to_jsonb(v_caps_hit),
        'counts', jsonb_build_object(
            'tier_per_minute',     v_t_min,
            'tier_per_hour',       v_t_hour,
            'tier_per_day',        v_t_day,
            'combined_per_minute', v_c_min,
            'combined_per_hour',   v_c_hour,
            'combined_per_day',    v_c_day
        ),
        'thresholds', jsonb_build_object(
            'tier_per_minute',     v_tier_per_min,
            'tier_per_hour',       v_tier_per_hour,
            'tier_per_day',        v_tier_per_day,
            'combined_per_minute', v_combined_per_min,
            'combined_per_hour',   v_combined_per_hour,
            'combined_per_day',    v_combined_per_day
        )
    );
end;
$function$;

-- h24_credit_token_purchase
CREATE OR REPLACE FUNCTION public.h24_credit_token_purchase(p_bee_id uuid, p_pack_code text, p_payment_ref text, p_amount_cents integer, p_method text DEFAULT 'stripe'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_pack public.h24_token_packs; v_id uuid; v_existing uuid;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'h24_credit_token_purchase is service-role / admin only';
  END IF;
  IF p_payment_ref IS NULL OR btrim(p_payment_ref) = '' THEN
    RAISE EXCEPTION 'payment_ref required';   -- without it the unique guard does not apply
  END IF;
  IF NOT EXISTS (SELECT 1 FROM bees WHERE id = p_bee_id) THEN
    RAISE EXCEPTION 'bee % not found', p_bee_id;
  END IF;

  SELECT * INTO v_pack FROM h24_token_packs WHERE pack_code = p_pack_code AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown or inactive pack %', p_pack_code; END IF;

  -- Stripe is the source of truth for WHETHER money moved; this table is the
  -- source of truth for HOW MUCH. A mismatch is refused, never absorbed.
  IF p_amount_cents IS DISTINCT FROM v_pack.usd_cents THEN
    RAISE EXCEPTION 'amount % does not match pack % (%)',
      p_amount_cents, p_pack_code, v_pack.usd_cents;
  END IF;

  BEGIN
    INSERT INTO h24_token_ledger
      (bee_id, entry_type, amount_tokens, payment_ref, payment_method, memo)
    VALUES
      (p_bee_id, 'purchase', v_pack.tokens, p_payment_ref, p_method,
       'pack ' || p_pack_code || ' @ '
         || btrim(to_char(v_pack.usd_cents / 100.0, 'FM999999990.00')) || ' USD')
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    -- The guard fired. Already credited. NOT an error -- tell the caller to stop.
    SELECT id INTO v_existing FROM h24_token_ledger
     WHERE entry_type = 'purchase' AND payment_ref = p_payment_ref;
    RETURN jsonb_build_object('credited', false, 'duplicate', true,
                              'ledger_id', v_existing, 'payment_ref', p_payment_ref);
  END;

  RETURN jsonb_build_object('credited', true, 'duplicate', false,
                            'ledger_id', v_id, 'tokens', v_pack.tokens,
                            'pack_code', p_pack_code);
END $function$;

-- h24_debit_tokens
CREATE OR REPLACE FUNCTION public.h24_debit_tokens(p_bee uuid, p_directive uuid, p_amount_tokens numeric, p_memo text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_plan  numeric; v_purch numeric; v_total numeric;
  v_plan_part numeric := 0; v_purch_part numeric := 0;
  v_remaining numeric; v_take numeric;
  v_id uuid; v_existing uuid;
  g record;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'h24_debit_tokens is service-role / admin only';
  END IF;
  IF p_bee IS NULL OR p_directive IS NULL THEN
    RAISE EXCEPTION 'bee and directive are both required';
  END IF;
  IF p_amount_tokens IS NULL OR p_amount_tokens <= 0 THEN
    RAISE EXCEPTION 'amount_tokens must be > 0 (got %)', p_amount_tokens;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_bee::text, 0));

  SELECT id INTO v_existing
    FROM h24_token_ledger
   WHERE entry_type = 'debit' AND directive_id = p_directive;

  IF v_existing IS NOT NULL THEN
    SELECT a.plan_available, a.purchased_available, a.total_available
      INTO v_plan, v_purch, v_total
      FROM h24_token_available(p_bee) a;
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
    FROM h24_token_available(p_bee) a;

  IF v_total < p_amount_tokens THEN
    RAISE EXCEPTION 'insufficient tokens: need %, available %', p_amount_tokens, v_total
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO h24_token_ledger
    (bee_id, entry_type, amount_tokens, directive_id, memo)
  VALUES
    (p_bee, 'debit', -p_amount_tokens, p_directive, p_memo)
  ON CONFLICT (directive_id) WHERE (entry_type = 'debit' AND directive_id IS NOT NULL)
  DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    -- Lost a race the lock should have prevented. The index held anyway.
    SELECT id INTO v_existing FROM h24_token_ledger
     WHERE entry_type = 'debit' AND directive_id = p_directive;
    SELECT a.plan_available, a.purchased_available, a.total_available
      INTO v_plan, v_purch, v_total FROM h24_token_available(p_bee) a;
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
             - COALESCE((SELECT sum(c.amount_tokens) FROM h24_token_consumption c
                          WHERE c.source_id = l.id), 0) AS remaining
      FROM h24_token_ledger l
     WHERE l.bee_id = p_bee
       AND l.entry_type = 'grant'
       AND l.expires_at IS NOT NULL
       AND l.expires_at > now()
     ORDER BY l.expires_at, l.created_at, l.id
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_take := LEAST(g.remaining, v_remaining);
    IF v_take > 0 THEN
      INSERT INTO h24_token_consumption (bee_id, debit_id, source_id, amount_tokens)
      VALUES (p_bee, v_id, g.id, v_take);
      v_remaining  := v_remaining - v_take;
      v_plan_part  := v_plan_part + v_take;
    END IF;
  END LOOP;

  IF v_remaining > 0 THEN
    INSERT INTO h24_token_consumption (bee_id, debit_id, source_id, amount_tokens)
    VALUES (p_bee, v_id, NULL, v_remaining);
    v_purch_part := v_remaining;
  END IF;

  SELECT a.plan_available, a.purchased_available, a.total_available
    INTO v_plan, v_purch, v_total
    FROM h24_token_available(p_bee) a;

  -- from_plan / from_purchased are now the RECORDED split, not a re-derived
  -- guess. They sum to p_amount_tokens by construction.
  RETURN jsonb_build_object(
    'debited', true, 'duplicate', false, 'ledger_id', v_id,
    'amount_tokens', p_amount_tokens,
    'from_plan', v_plan_part, 'from_purchased', v_purch_part,
    'plan_available', v_plan, 'purchased_available', v_purch,
    'total_available', v_total);
END $function$;

-- h24_grant_plan_tokens
CREATE OR REPLACE FUNCTION public.h24_grant_plan_tokens(p_bee_id uuid, p_plan_tier text, p_invoice_ref text, p_period_end timestamp with time zone, p_amount_cents integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_plan public.h24_token_plans; v_id uuid; v_existing uuid;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'h24_grant_plan_tokens is service-role / admin only';
  END IF;
  IF p_invoice_ref IS NULL OR btrim(p_invoice_ref) = '' THEN
    RAISE EXCEPTION 'invoice_ref required';   -- without it the unique guard does not apply
  END IF;
  IF p_period_end IS NULL THEN
    RAISE EXCEPTION 'period_end required -- it IS the expiry of this cycle grant';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM bees WHERE id = p_bee_id) THEN
    RAISE EXCEPTION 'bee % not found', p_bee_id;
  END IF;

  SELECT * INTO v_plan FROM h24_token_plans WHERE plan_tier = p_plan_tier AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown or inactive plan %', p_plan_tier; END IF;

  BEGIN
    INSERT INTO h24_token_ledger
      (bee_id, entry_type, amount_tokens, payment_ref, payment_method, memo, expires_at)
    VALUES
      (p_bee_id, 'grant', v_plan.tokens_per_cycle, p_invoice_ref, 'stripe',
       'plan ' || p_plan_tier || ' cycle grant'
         || CASE WHEN p_amount_cents IS NULL THEN ''
                 ELSE ' @ ' || btrim(to_char(p_amount_cents / 100.0, 'FM999999990.00'))
                            || ' USD' END,
       p_period_end)
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT id INTO v_existing FROM h24_token_ledger
     WHERE entry_type = 'grant' AND expires_at IS NOT NULL AND payment_ref = p_invoice_ref;
    RETURN jsonb_build_object('granted', false, 'duplicate', true,
                              'ledger_id', v_existing, 'invoice_ref', p_invoice_ref);
  END;

  RETURN jsonb_build_object('granted', true, 'duplicate', false,
                            'ledger_id', v_id, 'tokens', v_plan.tokens_per_cycle,
                            'plan_tier', p_plan_tier, 'expires_at', p_period_end);
END $function$;

-- h24_refund_token_purchase
CREATE OR REPLACE FUNCTION public.h24_refund_token_purchase(p_payment_ref text, p_refund_ref text, p_max_tokens numeric DEFAULT NULL::numeric, p_memo text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_purchase public.h24_token_ledger;
  v_purch_av numeric;
  v_cap      numeric;
  v_refund   numeric;
  v_id       uuid;
  v_existing uuid;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'h24_refund_token_purchase is service-role / admin only';
  END IF;
  IF p_refund_ref IS NULL OR btrim(p_refund_ref) = '' THEN
    RAISE EXCEPTION 'refund_ref required';   -- without it the unique guard does not apply
  END IF;

  SELECT * INTO v_purchase FROM h24_token_ledger
   WHERE entry_type = 'purchase' AND payment_ref = p_payment_ref;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no purchase found for payment_ref %', p_payment_ref;
  END IF;

  -- Same per-bee advisory lock h24_debit_tokens takes, so a refund and a
  -- concurrent directive debit cannot both read the same availability.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_purchase.bee_id::text, 0));

  -- Short-circuit a replay BEFORE computing anything: the index would catch it
  -- anyway, but returning the original row is the honest answer.
  SELECT id INTO v_existing FROM h24_token_ledger
   WHERE entry_type = 'adjustment' AND payment_ref = p_refund_ref;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('refunded', false, 'duplicate', true,
                              'ledger_id', v_existing, 'refund_ref', p_refund_ref);
  END IF;

  SELECT a.purchased_available INTO v_purch_av
    FROM h24_token_available(v_purchase.bee_id) a;

  v_cap    := COALESCE(p_max_tokens, v_purchase.amount_tokens);
  v_refund := GREATEST(0, LEAST(v_cap, COALESCE(v_purch_av, 0)));

  IF v_refund = 0 THEN
    -- Nothing unspent to return. amount_sign_chk forbids a zero adjustment, so
    -- there is no row to write -- and none is needed. The money side of the
    -- refund is Stripe's; the token side is simply zero.
    RETURN jsonb_build_object('refunded', false, 'duplicate', false,
                              'tokens_reversed', 0,
                              'reason', 'nothing unspent remains',
                              'purchased_available', COALESCE(v_purch_av, 0));
  END IF;

  BEGIN
    INSERT INTO h24_token_ledger
      (bee_id, entry_type, amount_tokens, payment_ref, payment_method, memo)
    VALUES
      (v_purchase.bee_id, 'adjustment', -v_refund, p_refund_ref, 'stripe',
       COALESCE(p_memo, 'refund of ' || p_payment_ref || ' -- unspent balance only'))
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT id INTO v_existing FROM h24_token_ledger
     WHERE entry_type = 'adjustment' AND payment_ref = p_refund_ref;
    RETURN jsonb_build_object('refunded', false, 'duplicate', true,
                              'ledger_id', v_existing, 'refund_ref', p_refund_ref);
  END;

  SELECT a.purchased_available INTO v_purch_av
    FROM h24_token_available(v_purchase.bee_id) a;

  RETURN jsonb_build_object('refunded', true, 'duplicate', false,
                            'ledger_id', v_id, 'tokens_reversed', v_refund,
                            'payment_ref', p_payment_ref, 'refund_ref', p_refund_ref,
                            'purchased_available', v_purch_av);
END $function$;

-- h24_token_available
CREATE OR REPLACE FUNCTION public.h24_token_available(p_bee uuid)
 RETURNS TABLE(plan_available numeric, purchased_available numeric, total_available numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  with live_grants as (
    -- Expiring plan grants still inside their promised window. A lapsed grant's
    -- unconsumed remainder simply stops counting — the same write-off the old
    -- function performed, now without the time arithmetic.
    select l.id, l.amount_tokens
      from h24_token_ledger l
     where l.bee_id = p_bee
       and l.entry_type = 'grant'
       and l.expires_at is not null
       and l.expires_at > now()
  ),
  plan_calc as (
    select coalesce(sum(
             greatest(0, g.amount_tokens
                         - coalesce((select sum(c.amount_tokens)
                                       from h24_token_consumption c
                                      where c.source_id = g.id), 0))
           ), 0) as amt
      from live_grants g
  ),
  durable_credits as (
    select coalesce(sum(l.amount_tokens), 0) as amt
      from h24_token_ledger l
     where l.bee_id = p_bee
       and l.entry_type in ('purchase','grant','adjustment')
       and l.expires_at is null
  ),
  durable_spent as (
    select coalesce(sum(c.amount_tokens), 0) as amt
      from h24_token_consumption c
     where c.bee_id = p_bee
       and c.source_id is null
  ),
  calc as (
    select (select amt from plan_calc) as plan_av,
           (select amt from durable_credits) - (select amt from durable_spent) as purch_av
  )
  select plan_av, purch_av, plan_av + purch_av from calc;
$function$;

-- 4. CONSTRAINTS (on the renamed tables)
ALTER TABLE public.h24_canon_reads RENAME CONSTRAINT atlasoracle_canon_reads_pkey TO h24_canon_reads_pkey;
ALTER TABLE public.h24_canon_reads RENAME CONSTRAINT atlasoracle_canon_reads_path_hash_key TO h24_canon_reads_path_hash_key;
ALTER TABLE public.h24_directives RENAME CONSTRAINT atlasoracle_directives_category_chk TO h24_directives_category_chk;
ALTER TABLE public.h24_directives RENAME CONSTRAINT atlasoracle_directives_status_chk TO h24_directives_status_chk;
ALTER TABLE public.h24_directives RENAME CONSTRAINT atlasoracle_directives_tier_chk TO h24_directives_tier_chk;
ALTER TABLE public.h24_directives RENAME CONSTRAINT atlasoracle_directives_astra_id_fkey TO h24_directives_astra_id_fkey;
ALTER TABLE public.h24_directives RENAME CONSTRAINT atlasoracle_directives_bee_id_fkey TO h24_directives_bee_id_fkey;
ALTER TABLE public.h24_directives RENAME CONSTRAINT atlasoracle_directives_nova_id_fkey TO h24_directives_nova_id_fkey;
ALTER TABLE public.h24_directives RENAME CONSTRAINT atlasoracle_directives_pkey TO h24_directives_pkey;
ALTER TABLE public.h24_provider_pool RENAME CONSTRAINT atlasoracle_provider_pool_category_chk TO h24_provider_pool_category_chk;
ALTER TABLE public.h24_provider_pool RENAME CONSTRAINT atlasoracle_provider_pool_pkey TO h24_provider_pool_pkey;
ALTER TABLE public.h24_provider_pool RENAME CONSTRAINT atlasoracle_provider_pool_name_key TO h24_provider_pool_name_key;
ALTER TABLE public.h24_model_rates RENAME CONSTRAINT oracle_model_rates_nonneg_chk TO h24_model_rates_nonneg_chk;
ALTER TABLE public.h24_model_rates RENAME CONSTRAINT oracle_model_rates_pkey TO h24_model_rates_pkey;
ALTER TABLE public.h24_token_consumption RENAME CONSTRAINT oracle_token_consumption_amount_tokens_check TO h24_token_consumption_amount_tokens_check;
ALTER TABLE public.h24_token_consumption RENAME CONSTRAINT oracle_token_consumption_bee_id_fkey TO h24_token_consumption_bee_id_fkey;
ALTER TABLE public.h24_token_consumption RENAME CONSTRAINT oracle_token_consumption_debit_id_fkey TO h24_token_consumption_debit_id_fkey;
ALTER TABLE public.h24_token_consumption RENAME CONSTRAINT oracle_token_consumption_source_id_fkey TO h24_token_consumption_source_id_fkey;
ALTER TABLE public.h24_token_consumption RENAME CONSTRAINT oracle_token_consumption_pkey TO h24_token_consumption_pkey;
ALTER TABLE public.h24_token_ledger RENAME CONSTRAINT oracle_token_ledger_amount_sign_chk TO h24_token_ledger_amount_sign_chk;
ALTER TABLE public.h24_token_ledger RENAME CONSTRAINT oracle_token_ledger_entry_type_chk TO h24_token_ledger_entry_type_chk;
ALTER TABLE public.h24_token_ledger RENAME CONSTRAINT oracle_token_ledger_bee_id_fkey TO h24_token_ledger_bee_id_fkey;
ALTER TABLE public.h24_token_ledger RENAME CONSTRAINT oracle_token_ledger_directive_id_fkey TO h24_token_ledger_directive_id_fkey;
ALTER TABLE public.h24_token_ledger RENAME CONSTRAINT oracle_token_ledger_pkey TO h24_token_ledger_pkey;
ALTER TABLE public.h24_token_packs RENAME CONSTRAINT oracle_token_packs_pack_code_check TO h24_token_packs_pack_code_check;
ALTER TABLE public.h24_token_packs RENAME CONSTRAINT oracle_token_packs_tokens_check TO h24_token_packs_tokens_check;
ALTER TABLE public.h24_token_packs RENAME CONSTRAINT oracle_token_packs_usd_cents_check TO h24_token_packs_usd_cents_check;
ALTER TABLE public.h24_token_packs RENAME CONSTRAINT oracle_token_packs_pkey TO h24_token_packs_pkey;
ALTER TABLE public.h24_token_plans RENAME CONSTRAINT oracle_token_plans_plan_tier_check TO h24_token_plans_plan_tier_check;
ALTER TABLE public.h24_token_plans RENAME CONSTRAINT oracle_token_plans_tokens_per_cycle_check TO h24_token_plans_tokens_per_cycle_check;
ALTER TABLE public.h24_token_plans RENAME CONSTRAINT oracle_token_plans_usd_cents_check TO h24_token_plans_usd_cents_check;
ALTER TABLE public.h24_token_plans RENAME CONSTRAINT oracle_token_plans_pkey TO h24_token_plans_pkey;

-- 5. STANDALONE INDEXES
ALTER INDEX public.atlasoracle_canon_reads_path_idx RENAME TO h24_canon_reads_path_idx;
ALTER INDEX public.atlasoracle_directives_astra_created_idx RENAME TO h24_directives_astra_created_idx;
ALTER INDEX public.atlasoracle_directives_bee_created_idx RENAME TO h24_directives_bee_created_idx;
ALTER INDEX public.atlasoracle_provider_pool_active_idx RENAME TO h24_provider_pool_active_idx;
ALTER INDEX public.oracle_model_rates_active_idx RENAME TO h24_model_rates_active_idx;
ALTER INDEX public.oracle_model_rates_model_effective_uidx RENAME TO h24_model_rates_model_effective_uidx;
ALTER INDEX public.oracle_model_rates_one_active_per_model RENAME TO h24_model_rates_one_active_per_model;
ALTER INDEX public.oracle_token_consumption_bee_idx RENAME TO h24_token_consumption_bee_idx;
ALTER INDEX public.oracle_token_consumption_debit_idx RENAME TO h24_token_consumption_debit_idx;
ALTER INDEX public.oracle_token_consumption_one_per_debit_source_uidx RENAME TO h24_token_consumption_one_per_debit_source_uidx;
ALTER INDEX public.oracle_token_consumption_source_idx RENAME TO h24_token_consumption_source_idx;
ALTER INDEX public.oracle_token_ledger_bee_created_idx RENAME TO h24_token_ledger_bee_created_idx;
ALTER INDEX public.oracle_token_ledger_directive_idx RENAME TO h24_token_ledger_directive_idx;
ALTER INDEX public.oracle_token_ledger_one_adjustment_per_refund_uidx RENAME TO h24_token_ledger_one_adjustment_per_refund_uidx;
ALTER INDEX public.oracle_token_ledger_one_debit_per_directive_uidx RENAME TO h24_token_ledger_one_debit_per_directive_uidx;
ALTER INDEX public.oracle_token_ledger_one_grant_per_invoice_uidx RENAME TO h24_token_ledger_one_grant_per_invoice_uidx;
ALTER INDEX public.oracle_token_ledger_one_purchase_per_payment_uidx RENAME TO h24_token_ledger_one_purchase_per_payment_uidx;

-- 6. POLICIES (on the renamed tables)
ALTER POLICY atlasoracle_directives_select_own ON public.h24_directives RENAME TO h24_directives_select_own;
ALTER POLICY atlasoracle_provider_pool_select_authenticated ON public.h24_provider_pool RENAME TO h24_provider_pool_select_authenticated;
ALTER POLICY oracle_model_rates_select_authenticated ON public.h24_model_rates RENAME TO h24_model_rates_select_authenticated;
ALTER POLICY oracle_token_consumption_select_own ON public.h24_token_consumption RENAME TO h24_token_consumption_select_own;
ALTER POLICY oracle_token_ledger_select_own ON public.h24_token_ledger RENAME TO h24_token_ledger_select_own;
ALTER POLICY oracle_token_packs_public_read ON public.h24_token_packs RENAME TO h24_token_packs_public_read;
ALTER POLICY oracle_token_plans_public_read ON public.h24_token_plans RENAME TO h24_token_plans_public_read;

-- 7. VERIFICATION — no atlasoracle_/oracle_ object may remain (fails the migration if any does)
DO $v$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace
   WHERE ns.nspname='public' AND (c.relname LIKE 'atlasoracle\_%' OR c.relname LIKE 'oracle\_%') AND c.relkind IN ('r','v','S');
  IF n>0 THEN RAISE EXCEPTION 'DBCODE1: % relation(s) still atlasoracle_/oracle_ named', n; END IF;
  SELECT count(*) INTO n FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace
   WHERE ns.nspname='public' AND (p.proname LIKE 'atlasoracle\_%' OR p.proname LIKE 'oracle\_%');
  IF n>0 THEN RAISE EXCEPTION 'DBCODE1: % function(s) still atlasoracle_/oracle_ named', n; END IF;
END $v$;
