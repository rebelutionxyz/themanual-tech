-- Member/subscription lifecycle spine: the RPC the Stripe membership/oracle webhook (F5/F6) calls.
-- Upserts the subscription by stripe_subscription_id, transitions status, and on a genuine paid period
-- fires affiliate_on_payment (pool = cents/100 * freeing_multiplier) cascading to the payer's UPLINE.
-- Idempotent on p_invoice_ref so webhook retries cannot double-pay the affiliate cascade.
-- FIAT FIREWALL: records fiat-for-service (membership|oracle); the payer is NEVER credited BLiNG! for fiat —
-- BLiNG! is freed only as the upline's affiliate reward (Path A intact). Service-role only.
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_stripe_sub_uk ON public.subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.subscription_sync(
  p_bee_id uuid, p_product_type text, p_tier text,
  p_stripe_subscription_id text, p_stripe_customer_id text,
  p_status text, p_current_period_end timestamptz,
  p_invoice_amount_cents bigint DEFAULT NULL, p_invoice_ref uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE v_sub_id uuid; v_affiliate jsonb := NULL;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'subscription_sync is service-role / admin only';
  END IF;
  IF p_bee_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.bees WHERE id = p_bee_id) THEN
    RAISE EXCEPTION 'bee % not found', p_bee_id;
  END IF;
  IF p_product_type NOT IN ('membership','oracle') THEN
    RAISE EXCEPTION 'invalid product_type %', p_product_type;
  END IF;
  IF p_stripe_subscription_id IS NULL THEN
    RAISE EXCEPTION 'stripe_subscription_id required';
  END IF;

  INSERT INTO public.subscriptions (bee_id, product_type, tier, stripe_subscription_id, stripe_customer_id, status, current_period_end)
  VALUES (p_bee_id, p_product_type, p_tier, p_stripe_subscription_id, p_stripe_customer_id, p_status, p_current_period_end)
  ON CONFLICT (stripe_subscription_id) DO UPDATE
    SET status = EXCLUDED.status, tier = EXCLUDED.tier, stripe_customer_id = EXCLUDED.stripe_customer_id,
        current_period_end = EXCLUDED.current_period_end, updated_at = now()
  RETURNING id INTO v_sub_id;

  IF p_invoice_amount_cents IS NOT NULL AND p_invoice_amount_cents > 0
     AND p_status IN ('active','trialing') AND p_invoice_ref IS NOT NULL THEN
     IF NOT EXISTS (SELECT 1 FROM public.affiliate_holds WHERE source_ref = p_invoice_ref) THEN
        v_affiliate := public.affiliate_on_payment(p_bee_id, p_invoice_amount_cents, p_product_type, p_invoice_ref);
     ELSE
        v_affiliate := jsonb_build_object('ok', true, 'note', 'invoice already processed — affiliate skipped (idempotent)');
     END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'subscription_id', v_sub_id, 'status', p_status,
     'product_type', p_product_type, 'tier', p_tier, 'affiliate', v_affiliate);
END; $function$;

REVOKE EXECUTE ON FUNCTION public.subscription_sync(uuid,text,text,text,text,text,timestamptz,bigint,uuid) FROM anon, authenticated, PUBLIC;
