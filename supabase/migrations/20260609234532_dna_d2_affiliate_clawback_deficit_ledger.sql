-- DNA D2 final cluster — affiliate_clawback via the deficit ledger (option A). Closes D2: no balance-writer
-- bypasses jars anymore. bees.bling_deficit is a SEPARATE running-debt ledger (untouched by lot_reconcile_balance,
-- so a recompute can't erase it). lot_debit_tolerant drains available jars FIFO and decrements the cache by what
-- it actually drained (cache stays = Σ active lots >= 0), returning the uncovered shortfall. clawback records that
-- shortfall as deficit and still returns the FULL amount to the Well. Generalized invariant:
-- total_supply = Σ active lots + Σ bling_held + Σ pooled - Σ bling_deficit.
-- NOTE (follow-on, not built): netting bling_deficit against future earnings before they become spendable; whether
-- a standing deficit gates spending. Held branch unchanged (pre-lot staging). Both fns service-role sealed.
ALTER TABLE public.bees ADD COLUMN IF NOT EXISTS bling_deficit numeric(24,6) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.lot_debit_tolerant(p_bee_id uuid, p_amount numeric, p_reason text)
 RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE v_remaining numeric := p_amount; v_lot record; v_take numeric; v_drained numeric := 0;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
  FOR v_lot IN SELECT id, amount_remaining FROM public.bling_lots
      WHERE bee_id = p_bee_id AND status='active' AND amount_remaining > 0 ORDER BY id FOR UPDATE LOOP
    EXIT WHEN v_remaining <= 0;
    v_take := least(v_lot.amount_remaining, v_remaining);
    UPDATE public.bling_lots
       SET amount_remaining = amount_remaining - v_take,
           status = CASE WHEN amount_remaining - v_take = 0 THEN 'spent' ELSE status END
     WHERE id = v_lot.id;
    v_drained := v_drained + v_take; v_remaining := v_remaining - v_take;
  END LOOP;
  IF v_drained > 0 THEN
    UPDATE public.bees SET bling_balance = bling_balance - v_drained WHERE id = p_bee_id;
  END IF;
  RETURN v_remaining;
END; $function$;

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
    UPDATE public.bling_system_state SET total_supply = total_supply - v_returned WHERE id=1;
  END IF;
  RETURN jsonb_build_object('ok',true,'lots_clawed',v_count,'returned_to_well',v_returned,
     'from_held',v_from_held,'from_spendable',v_from_spendable,'lots_into_deficit',v_deficit_lots,'deficit_recorded',v_total_deficit);
END; $function$;

REVOKE EXECUTE ON FUNCTION public.lot_debit_tolerant(uuid,numeric,text) FROM anon, authenticated, PUBLIC;

REVOKE EXECUTE ON FUNCTION public.affiliate_clawback(uuid) FROM anon, authenticated, PUBLIC;
