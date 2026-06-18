-- NewBEE welcome bonus now FREES from the Reserve (per directive) instead of drawing the (now-zeroed)
-- operations_funds Treasury pool. It is a proper reserve-freeing path: checks free_active, caps at reserve,
-- increments total_supply, births a 'newbee' jar via lot_credit. Once-per-bee guard preserved. No fiat, no Treasury.
CREATE OR REPLACE FUNCTION public.issue_newbee_bonus(p_bee_id uuid)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE
  v_bonus_amount CONSTANT NUMERIC(20,6) := 2500;
  v_already BOOLEAN; v_new_balance NUMERIC(20,6);
  v_free_active boolean; v_total_supply numeric; v_reserve numeric;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.bling_transactions WHERE bee_id=p_bee_id AND type='newbee_bonus') INTO v_already;
  IF v_already THEN RETURN FALSE; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.bees WHERE id=p_bee_id) THEN RAISE EXCEPTION 'no bees row for %', p_bee_id; END IF;
  SELECT free_active, total_supply, reserve INTO v_free_active, v_total_supply, v_reserve
    FROM public.bling_system_state WHERE id=1 FOR UPDATE;
  IF NOT v_free_active THEN RETURN FALSE; END IF;
  IF v_total_supply + v_bonus_amount > v_reserve THEN RAISE EXCEPTION 'NewBEE bonus would exceed reserve'; END IF;
  UPDATE public.bling_system_state SET total_supply = total_supply + v_bonus_amount WHERE id=1;
  PERFORM public.lot_credit(p_bee_id, v_bonus_amount, 'newbee');
  SELECT bling_balance INTO v_new_balance FROM public.bees WHERE id=p_bee_id;
  UPDATE public.bees SET updated_at=now() WHERE id=p_bee_id;
  INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, currency_type, category, origin_restricted)
  VALUES (p_bee_id, 'newbee_bonus', v_bonus_amount, v_new_balance, 'BLiNG', 'welcome', TRUE);
  RETURN TRUE;
END; $function$;
