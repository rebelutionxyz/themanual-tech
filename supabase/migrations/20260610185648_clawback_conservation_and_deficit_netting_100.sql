-- CLAWBACK CONSERVATION FIX + 100% DEFICIT NETTING (locked Jun 10 2026)
-- 1. affiliate_clawback: returned BLiNG! refills the Well (sink-to-source) —
--    required under the drain-model conservation CHECK.
-- 2. lot_credit: 100% deficit netting — a Bee carrying bling_deficit repays the
--    Well from every incoming credit before any lot is cut. Repaid portion is a
--    supply→reserve return; deficit is self-extinguishing. New tx type
--    'deficit_repayment' added to the bling_transactions type CHECK.

ALTER TABLE public.bling_transactions DROP CONSTRAINT bling_transactions_type_check;

ALTER TABLE public.bling_transactions ADD CONSTRAINT bling_transactions_type_check
  CHECK (type = ANY (ARRAY['free','send_debit','send_credit','escrow_hold','escrow_release','escrow_cancel','escrow_dispute','order_reserve','order_fill_debit','order_fill_credit','order_cancel_refund','order_donation','stripe_credit','chargeback','escrow_in','escrow_unlock','newbee_bonus','atlasoracle_escrow_deposit','atlasoracle_escrow_withdraw','atlasoracle_directive','atlasoracle_refund','competition_stake_escrow','competition_stake_refund','competition_source_reward','competition_payout','affiliate','affiliate_clawback','drops','drips','drips_royalty','splash','deficit_repayment']));

CREATE OR REPLACE FUNCTION public.affiliate_clawback(p_source_ref uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE r record; v_from_held numeric := 0; v_from_spendable numeric := 0; v_returned numeric := 0;
  v_count int := 0; v_deficit_lots int := 0; v_bal numeric; v_shortfall numeric; v_total_deficit numeric := 0;
BEGIN
  PERFORM 1 FROM public.bling_system_state WHERE id=1 FOR UPDATE;
  FOR r IN SELECT id, bee_id, amount, tier, status FROM public.affiliate_holds
           WHERE source_ref = p_source_ref AND status IN ('held','released') FOR UPDATE LOOP
    IF r.status = 'held' THEN
      UPDATE public.bees SET bling_held = bling_held - r.amount WHERE id = r.bee_id;
      v_from_held := v_from_held + r.amount;
    ELSE
      v_shortfall := public.lot_debit_tolerant(r.bee_id, r.amount, 'affiliate_clawback');
      IF v_shortfall > 0 THEN
        UPDATE public.bees SET bling_deficit = bling_deficit + v_shortfall WHERE id = r.bee_id;
        v_deficit_lots := v_deficit_lots + 1; v_total_deficit := v_total_deficit + v_shortfall;
      END IF;
      SELECT bling_balance INTO v_bal FROM public.bees WHERE id = r.bee_id;
      INSERT INTO public.bling_transactions (bee_id,type,amount,balance_after,counterparty_bee_id,category,source_type,source_ref,memo)
      VALUES (r.bee_id,'affiliate_clawback',-r.amount,v_bal,NULL,'affiliate_'||r.tier||'_clawback','affiliate',p_source_ref,
              'Affiliate '||r.tier||' clawed back'||CASE WHEN v_shortfall>0 THEN ' (deficit +'||v_shortfall||')' ELSE '' END);
      v_from_spendable := v_from_spendable + r.amount;
    END IF;
    UPDATE public.affiliate_holds SET status='clawed' WHERE id = r.id;
    v_returned := v_returned + r.amount; v_count := v_count + 1;
  END LOOP;
  IF v_returned > 0 THEN
    UPDATE public.bling_system_state
       SET total_supply = total_supply - v_returned,
           reserve      = reserve + v_returned
     WHERE id=1;
  END IF;
  RETURN jsonb_build_object('ok',true,'lots_clawed',v_count,'returned_to_well',v_returned,
     'from_held',v_from_held,'from_spendable',v_from_spendable,'lots_into_deficit',v_deficit_lots,'deficit_recorded',v_total_deficit);
END; $function$;

CREATE OR REPLACE FUNCTION public.lot_credit(p_bee_id uuid, p_amount numeric, p_origin text, p_dna jsonb DEFAULT '{}'::jsonb, p_vintage text DEFAULT NULL::text, p_sealed_multiplier numeric DEFAULT NULL::numeric)
 RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_id bigint; v_vintage text := COALESCE(p_vintage, to_char(now(),'YYYY'));
        v_deficit numeric; v_repay numeric := 0; v_net numeric;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'lot_credit: amount must be > 0'; END IF;
  IF p_origin IS NULL OR length(btrim(p_origin))=0 THEN RAISE EXCEPTION 'lot_credit: origin required'; END IF;
  SELECT bling_deficit INTO v_deficit FROM public.bees WHERE id = p_bee_id FOR UPDATE;
  IF COALESCE(v_deficit,0) > 0 THEN
    v_repay := LEAST(v_deficit, p_amount);
    UPDATE public.bees SET bling_deficit = bling_deficit - v_repay WHERE id = p_bee_id;
    UPDATE public.bling_system_state
       SET total_supply = total_supply - v_repay, reserve = reserve + v_repay WHERE id=1;
    INSERT INTO public.bling_transactions (bee_id,type,amount,balance_after,category,source_type,memo)
    VALUES (p_bee_id,'deficit_repayment',-v_repay,
            (SELECT bling_balance FROM public.bees WHERE id=p_bee_id),
            'deficit_netting',p_origin,'Deficit repaid from incoming '||p_origin||' (100% netting)');
  END IF;
  v_net := p_amount - v_repay;
  IF v_net <= 0 THEN RETURN NULL; END IF;
  INSERT INTO public.bling_lots (bee_id, amount_original, amount_remaining, origin, vintage, dna, sealed_multiplier)
  VALUES (p_bee_id, v_net, v_net, p_origin, v_vintage, COALESCE(p_dna,'{}'::jsonb), p_sealed_multiplier)
  RETURNING id INTO v_id;
  UPDATE public.bees SET bling_balance = bling_balance + v_net WHERE id = p_bee_id;
  RETURN v_id;
END; $function$;
