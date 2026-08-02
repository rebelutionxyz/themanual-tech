-- ============================================================================
-- 20260801220100_oracle_token_plans_grant_refund.sql
--
-- OPS50. Plan canon (Scout / Oracle / Sovereign), the per-cycle grant path, and
-- the refund path. Depends on 20260801220000 (packs + purchase) for the
-- adjustment idempotency index, and on 20260801164907 (ledger.expires_at) and
-- 20260801164922 (subscriptions tier CHECK widen), both already applied.
--
-- TB-1 (plan / purchased buckets): a plan grant is a 'grant' row with
-- expires_at = the cycle end. oracle_token_available already spends plan first
-- and stops counting a grant the instant now() passes expires_at -- expiry
-- performs ZERO writes and needs no scheduled job. Nothing in this file changes
-- that; it only writes the grant rows that mechanism reads.
--
-- W-9: the grant guarantee is oracle_token_ledger_one_grant_per_invoice_uidx,
-- keyed on the Stripe INVOICE id. Not the subscription id -- a subscription
-- grants every cycle, so keying on it would credit cycle 1 and silently refuse
-- every renewal. One invoice = one cycle = one grant.
--
-- W-10: user-facing strings say "Tokens", never "Oracle Tokens".
-- LANGUAGE FIREWALL: display_name reaches the Stripe Checkout page.
-- ============================================================================
BEGIN;

-- ---------------------------------------------------------------------------
-- (1) Plan canon, server-side. Client names a plan_tier, NEVER an amount.
--     Prices + allowances are ORACLE_MF v0.27 s1 (Butch, 2026-08-01):
--       SCOUT     $9/mo  -> 10,000 Tokens/mo
--       ORACLE    $29/mo -> 40,000 Tokens/mo
--       SOVEREIGN $99/mo -> 150,000 Tokens/mo
--     NO BAND GATE: every tier reaches every model band. The allowance limits
--     usage, not a permission check. Tiers order by sort_order, not by name.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.oracle_token_plans (
  plan_tier         text PRIMARY KEY CHECK (plan_tier IN ('scout','oracle','sovereign')),
  usd_cents         integer NOT NULL CHECK (usd_cents >= 100),
  tokens_per_cycle  numeric NOT NULL CHECK (tokens_per_cycle > 0),
  display_name      text NOT NULL,
  sort_order        integer NOT NULL,
  active            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.oracle_token_plans
  (plan_tier, usd_cents, tokens_per_cycle, display_name, sort_order) VALUES
  ('scout',      900,  10000, 'Scout',     1),   -- 1,111 Tokens / USD
  ('oracle',    2900,  40000, 'Oracle',    2),   -- 1,379 Tokens / USD
  ('sovereign', 9900, 150000, 'Sovereign', 3)    -- 1,515 Tokens / USD
ON CONFLICT (plan_tier) DO NOTHING;

ALTER TABLE public.oracle_token_plans ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.oracle_token_plans FROM anon, authenticated;
GRANT SELECT ON public.oracle_token_plans TO anon, authenticated, service_role;

DROP POLICY IF EXISTS oracle_token_plans_public_read ON public.oracle_token_plans;
CREATE POLICY oracle_token_plans_public_read ON public.oracle_token_plans
  FOR SELECT USING (active = true);

-- ---------------------------------------------------------------------------
-- (2) ONE GRANT PER INVOICE. The expires_at IS NOT NULL term keeps the five
--     legacy 'grant' rows out of the index -- two of them carry a non-NULL
--     payment_ref (prose seed notes), and all five have expires_at NULL.
--     Verified live by OPS50, not assumed.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS oracle_token_ledger_one_grant_per_invoice_uidx
  ON public.oracle_token_ledger (payment_ref)
  WHERE (entry_type = 'grant' AND expires_at IS NOT NULL AND payment_ref IS NOT NULL);

-- ---------------------------------------------------------------------------
-- (3) At most one live oracle subscription per Bee. The existing
--     subscriptions_one_active_per_product covers status='active' only; this
--     adds 'trialing', which is the window a double-submit would land in.
--     Cheap second guard for the OPS38 P1 double-checkout exposure (the Stripe
--     Idempotency-Key header is the real fix -- see oracle-checkout).
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_active_oracle_per_bee_uidx
  ON public.subscriptions (bee_id)
  WHERE (product_type = 'oracle' AND status IN ('active','trialing'));

-- ---------------------------------------------------------------------------
-- (4) oracle_grant_plan_tokens -- the ONLY way plan Tokens are granted.
--
--     NO AMOUNT EQUALITY CHECK, and that is deliberate: unlike a pack, a
--     subscription invoice legitimately differs from the sticker price
--     (proration on upgrade, coupons, tax, partial first cycle). Refusing a
--     mismatch would refuse real renewals. The allowance comes from canon
--     (oracle_token_plans), the invoice amount is recorded in the memo only.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.oracle_grant_plan_tokens(
  p_bee_id       uuid,
  p_plan_tier    text,
  p_invoice_ref  text,
  p_period_end   timestamptz,
  p_amount_cents integer DEFAULT NULL
) RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_plan public.oracle_token_plans; v_id uuid; v_existing uuid;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'oracle_grant_plan_tokens is service-role / admin only';
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

  SELECT * INTO v_plan FROM oracle_token_plans WHERE plan_tier = p_plan_tier AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown or inactive plan %', p_plan_tier; END IF;

  BEGIN
    INSERT INTO oracle_token_ledger
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
    SELECT id INTO v_existing FROM oracle_token_ledger
     WHERE entry_type = 'grant' AND expires_at IS NOT NULL AND payment_ref = p_invoice_ref;
    RETURN jsonb_build_object('granted', false, 'duplicate', true,
                              'ledger_id', v_existing, 'invoice_ref', p_invoice_ref);
  END;

  RETURN jsonb_build_object('granted', true, 'duplicate', false,
                            'ledger_id', v_id, 'tokens', v_plan.tokens_per_cycle,
                            'plan_tier', p_plan_tier, 'expires_at', p_period_end);
END $function$;

REVOKE ALL ON FUNCTION public.oracle_grant_plan_tokens(uuid,text,text,timestamptz,integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.oracle_grant_plan_tokens(uuid,text,text,timestamptz,integer)
  TO service_role;

-- ---------------------------------------------------------------------------
-- (5) oracle_refund_token_purchase -- the ONE place the refund ruling lands.
--
--     ORACLE_MF v0.26 s2 (Butch): refund the UNSPENT pack balance only; the
--     spent portion is not refundable. The clamp is the whole ruling:
--
--       refund_tokens = GREATEST(0, LEAST(cap, purchased_available_now))
--
--     GREATEST(0, ...) is why no allow-negative machinery exists: the reversal
--     can never exceed what is actually there, so purchased_available can never
--     go below zero. If the ruling is ever reversed to allow-negative, delete
--     the GREATEST(0, ...) wrapper and NOTHING else in the design moves.
--
--     p_max_tokens exists for PARTIAL Stripe refunds. The ledger does not store
--     the charge amount, so the caller -- which has both the charge total and
--     the refunded amount -- computes the proportional cap and passes it. NULL
--     means a full refund of the original purchase.
--
--     Plan tokens are never refundable (they expire anyway), so this function
--     only ever targets entry_type='purchase'.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.oracle_refund_token_purchase(
  p_payment_ref text,
  p_refund_ref  text,
  p_max_tokens  numeric DEFAULT NULL,
  p_memo        text    DEFAULT NULL
) RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_purchase public.oracle_token_ledger;
  v_purch_av numeric;
  v_cap      numeric;
  v_refund   numeric;
  v_id       uuid;
  v_existing uuid;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'oracle_refund_token_purchase is service-role / admin only';
  END IF;
  IF p_refund_ref IS NULL OR btrim(p_refund_ref) = '' THEN
    RAISE EXCEPTION 'refund_ref required';   -- without it the unique guard does not apply
  END IF;

  SELECT * INTO v_purchase FROM oracle_token_ledger
   WHERE entry_type = 'purchase' AND payment_ref = p_payment_ref;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no purchase found for payment_ref %', p_payment_ref;
  END IF;

  -- Same per-bee advisory lock oracle_debit_tokens takes, so a refund and a
  -- concurrent directive debit cannot both read the same availability.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_purchase.bee_id::text, 0));

  -- Short-circuit a replay BEFORE computing anything: the index would catch it
  -- anyway, but returning the original row is the honest answer.
  SELECT id INTO v_existing FROM oracle_token_ledger
   WHERE entry_type = 'adjustment' AND payment_ref = p_refund_ref;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('refunded', false, 'duplicate', true,
                              'ledger_id', v_existing, 'refund_ref', p_refund_ref);
  END IF;

  SELECT a.purchased_available INTO v_purch_av
    FROM oracle_token_available(v_purchase.bee_id) a;

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
    INSERT INTO oracle_token_ledger
      (bee_id, entry_type, amount_tokens, payment_ref, payment_method, memo)
    VALUES
      (v_purchase.bee_id, 'adjustment', -v_refund, p_refund_ref, 'stripe',
       COALESCE(p_memo, 'refund of ' || p_payment_ref || ' -- unspent balance only'))
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT id INTO v_existing FROM oracle_token_ledger
     WHERE entry_type = 'adjustment' AND payment_ref = p_refund_ref;
    RETURN jsonb_build_object('refunded', false, 'duplicate', true,
                              'ledger_id', v_existing, 'refund_ref', p_refund_ref);
  END;

  SELECT a.purchased_available INTO v_purch_av
    FROM oracle_token_available(v_purchase.bee_id) a;

  RETURN jsonb_build_object('refunded', true, 'duplicate', false,
                            'ledger_id', v_id, 'tokens_reversed', v_refund,
                            'payment_ref', p_payment_ref, 'refund_ref', p_refund_ref,
                            'purchased_available', v_purch_av);
END $function$;

REVOKE ALL ON FUNCTION public.oracle_refund_token_purchase(text,text,numeric,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.oracle_refund_token_purchase(text,text,numeric,text)
  TO service_role;

COMMIT;
