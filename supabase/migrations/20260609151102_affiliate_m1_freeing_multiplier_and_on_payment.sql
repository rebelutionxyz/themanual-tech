-- M1 — affiliate freeing_multiplier config + payment→pool trigger.
-- pool = (amount_cents/100) x freeing_multiplier, freed from the Well via affiliate_distribute.
-- No fiat-to-BLiNG! conversion: fiat goes to the house; this frees a separate reward pool only.

ALTER TABLE public.bling_system_state ADD COLUMN freeing_multiplier numeric NOT NULL DEFAULT 89;

CREATE OR REPLACE FUNCTION public.affiliate_on_payment(
  p_earner_bee_id uuid,
  p_amount_cents  bigint,
  p_trigger       text,
  p_source_ref    uuid       -- pass stripe_events.id (per-event uuid) → per-invoice idempotency
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','public'
AS $$
DECLARE
  v_mult numeric;
  v_pool numeric;
BEGIN
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'amount_cents must be positive';
  END IF;
  IF p_trigger NOT IN ('membership','oracle') THEN
    RAISE EXCEPTION 'invalid affiliate trigger: %', p_trigger;
  END IF;

  SELECT freeing_multiplier INTO v_mult FROM public.bling_system_state WHERE id = 1;
  v_pool := round((p_amount_cents / 100.0) * v_mult, 6);

  IF v_pool <= 0 THEN
    RETURN jsonb_build_object('ok', true, 'pool', 0, 'note', 'zero pool — nothing freed');
  END IF;

  RETURN public.affiliate_distribute(p_earner_bee_id, v_pool, p_trigger, p_source_ref);
END;
$$;

COMMENT ON FUNCTION public.affiliate_on_payment(uuid,bigint,text,uuid) IS
  'Affiliate trigger for recurring membership/oracle fiat payments. pool = (amount_cents/100) x freeing_multiplier, freed from the Well via affiliate_distribute. No fiat-to-BLiNG! conversion. source_ref = stripe_events.id for per-invoice idempotency. Service-role only.';

REVOKE EXECUTE ON FUNCTION public.affiliate_on_payment(uuid,bigint,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.affiliate_on_payment(uuid,bigint,text,uuid) TO service_role;