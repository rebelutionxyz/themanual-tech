-- Affiliate hold layer, piece 3a: admit affiliate ledger types + the maturation function.
-- Adds 'affiliate' (maturation release) and 'affiliate_clawback' (M2) to the type CHECK — fixes the
-- latent gap where the original engine inserted type='affiliate' against a CHECK that didn't allow it.

ALTER TABLE public.bling_transactions DROP CONSTRAINT bling_transactions_type_check;
ALTER TABLE public.bling_transactions ADD CONSTRAINT bling_transactions_type_check
  CHECK (type = ANY (ARRAY['free','send_debit','send_credit','escrow_hold','escrow_release','escrow_cancel',
    'escrow_dispute','order_reserve','order_fill_debit','order_fill_credit','order_cancel_refund','order_donation',
    'stripe_credit','chargeback','escrow_in','escrow_unlock','newbee_bonus','atlasoracle_escrow_deposit',
    'atlasoracle_escrow_withdraw','atlasoracle_directive','atlasoracle_refund','competition_stake_escrow',
    'competition_stake_refund','competition_source_reward','competition_payout','affiliate','affiliate_clawback']));

CREATE OR REPLACE FUNCTION public.affiliate_release_matured()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE r record; v_count int := 0; v_total numeric := 0; v_bal numeric;
BEGIN
  FOR r IN
    SELECT id, bee_id, amount, tier, source_ref
    FROM public.affiliate_holds
    WHERE status='held' AND releases_at <= now()
    ORDER BY releases_at, id
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.bees
      SET bling_held = bling_held - r.amount,
          bling_balance = bling_balance + r.amount
      WHERE id = r.bee_id
      RETURNING bling_balance INTO v_bal;
    INSERT INTO public.bling_transactions
      (bee_id,type,amount,balance_after,counterparty_bee_id,category,source_type,source_ref,memo)
    VALUES (r.bee_id,'affiliate',r.amount,v_bal,NULL,'affiliate_'||r.tier||'_released',
            'affiliate',r.source_ref,'Affiliate '||r.tier||' matured — 60-day hold released');
    UPDATE public.affiliate_holds SET status='released' WHERE id = r.id;
    v_count := v_count + 1; v_total := v_total + r.amount;
  END LOOP;
  RETURN jsonb_build_object('ok',true,'released_lots',v_count,'released_amount',v_total);
END; $function$;
REVOKE EXECUTE ON FUNCTION public.affiliate_release_matured() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.affiliate_release_matured() TO service_role;