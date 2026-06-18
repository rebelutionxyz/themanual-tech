-- DNA D2 cluster A1: route the two simple freeing functions through lot_credit (jars born),
-- preserving total_supply accounting + bling_transactions. Balance now maintained by the primitive.
CREATE OR REPLACE FUNCTION public.bling_free(p_bee_id uuid, p_amount numeric)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE
    v_caller uuid := auth.uid();
    v_free_active boolean; v_total_supply numeric; v_hard_cap numeric;
    v_new_total numeric; v_balance_after numeric; v_tx_id bigint;
BEGIN
    IF v_caller IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
    IF v_caller <> p_bee_id THEN RAISE EXCEPTION 'caller % may not FREE BLiNG! into bee %', v_caller, p_bee_id; END IF;
    IF p_amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
    SELECT free_active, total_supply, hard_cap INTO v_free_active, v_total_supply, v_hard_cap
      FROM public.bling_system_state WHERE id=1 FOR UPDATE;
    IF NOT v_free_active THEN RAISE EXCEPTION 'FREE issuance paused (free_active=false)'; END IF;
    v_new_total := v_total_supply + p_amount;
    IF v_new_total > v_hard_cap THEN RAISE EXCEPTION 'would exceed hard cap (% > %)', v_new_total, v_hard_cap; END IF;
    UPDATE public.bling_system_state SET total_supply = v_new_total WHERE id=1;
    PERFORM public.lot_credit(p_bee_id, p_amount, 'free');
    SELECT bling_balance INTO v_balance_after FROM public.bees WHERE id=p_bee_id;
    IF v_balance_after IS NULL THEN RAISE EXCEPTION 'bee % not found', p_bee_id; END IF;
    INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, memo)
    VALUES (p_bee_id, 'free', p_amount, v_balance_after, 'FREE from Source (Economy v3 flat faucet)')
    RETURNING id INTO v_tx_id;
    RETURN jsonb_build_object('ok',true,'tx_id',v_tx_id,'balance_after',v_balance_after,
        'new_total_supply',v_new_total,'well_remaining', v_hard_cap - v_new_total);
END; $function$;

CREATE OR REPLACE FUNCTION public.issue_newbee_bonus(p_bee_id uuid)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE
  v_bonus_amount CONSTANT NUMERIC(20,6) := 2500;
  v_fund_balance NUMERIC(20,6); v_already BOOLEAN; v_new_balance NUMERIC(20,6);
BEGIN
  SELECT current_balance INTO v_fund_balance FROM public.operations_funds WHERE fund_name='newbee' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'operations_funds row for ''newbee'' not found'; END IF;
  IF v_fund_balance < v_bonus_amount THEN RETURN FALSE; END IF;
  SELECT EXISTS (SELECT 1 FROM public.bling_transactions WHERE bee_id=p_bee_id AND type='newbee_bonus') INTO v_already;
  IF v_already THEN RETURN FALSE; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.bees WHERE id=p_bee_id) THEN RAISE EXCEPTION 'no bees row for %', p_bee_id; END IF;
  PERFORM public.lot_credit(p_bee_id, v_bonus_amount, 'newbee');
  SELECT bling_balance INTO v_new_balance FROM public.bees WHERE id=p_bee_id;
  UPDATE public.bees SET updated_at=now() WHERE id=p_bee_id;
  INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, currency_type, category, origin_restricted)
  VALUES (p_bee_id, 'newbee_bonus', v_bonus_amount, v_new_balance, 'BLiNG', 'welcome', TRUE);
  UPDATE public.operations_funds SET current_balance=current_balance - v_bonus_amount, last_disbursement_at=now(), updated_at=now() WHERE fund_name='newbee';
  RETURN TRUE;
END; $function$;
