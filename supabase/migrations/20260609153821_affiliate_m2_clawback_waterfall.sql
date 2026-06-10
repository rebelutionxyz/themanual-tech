-- M2 — affiliate_clawback: refund/dispute reversal, deficit-tolerant 3-tier waterfall.
-- Per source_ref, reverse every cascade lot: held lots return from bling_held (clean); matured lots
-- claw from bling_balance and may go negative (deficit). All clawed BLiNG! returns to the Well
-- (total_supply decrement). Idempotent (only held|released lots; marks 'clawed'). Service-role only.
CREATE OR REPLACE FUNCTION public.affiliate_clawback(p_source_ref uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE
  r record;
  v_from_held numeric := 0; v_from_spendable numeric := 0; v_returned numeric := 0;
  v_count int := 0; v_deficit_lots int := 0; v_bal numeric;
BEGIN
  PERFORM 1 FROM public.bling_system_state WHERE id=1 FOR UPDATE;

  FOR r IN
    SELECT id, bee_id, amount, tier, status
    FROM public.affiliate_holds
    WHERE source_ref = p_source_ref AND status IN ('held','released')
    FOR UPDATE
  LOOP
    IF r.status = 'held' THEN
      UPDATE public.bees SET bling_held = bling_held - r.amount WHERE id = r.bee_id;
      v_from_held := v_from_held + r.amount;
    ELSE
      UPDATE public.bees SET bling_balance = bling_balance - r.amount
        WHERE id = r.bee_id RETURNING bling_balance INTO v_bal;
      INSERT INTO public.bling_transactions
        (bee_id,type,amount,balance_after,counterparty_bee_id,category,source_type,source_ref,memo)
      VALUES (r.bee_id,'affiliate_clawback',-r.amount,v_bal,NULL,'affiliate_'||r.tier||'_clawback',
              'affiliate',p_source_ref,'Affiliate '||r.tier||' clawed back — refund/dispute');
      v_from_spendable := v_from_spendable + r.amount;
      IF v_bal < 0 THEN v_deficit_lots := v_deficit_lots + 1; END IF;
    END IF;
    UPDATE public.affiliate_holds SET status='clawed' WHERE id = r.id;
    v_returned := v_returned + r.amount; v_count := v_count + 1;
  END LOOP;

  IF v_returned > 0 THEN
    UPDATE public.bling_system_state SET total_supply = total_supply - v_returned WHERE id=1;
  END IF;

  RETURN jsonb_build_object('ok',true,'lots_clawed',v_count,'returned_to_well',v_returned,
     'from_held',v_from_held,'from_spendable',v_from_spendable,'lots_into_deficit',v_deficit_lots);
END; $function$;
REVOKE EXECUTE ON FUNCTION public.affiliate_clawback(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.affiliate_clawback(uuid) TO service_role;