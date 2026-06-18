-- Drops/Drips piece 4a — the Drops daily distributor.
-- At close: pro-rata split of the Drops pool across the day's pending weighted shares; free-from-Well
-- (free_active + hard_cap guards, total_supply bump = exact sum credited); credit doers; post type='drops';
-- mark ledger rows converted. Idempotent (re-run finds no pending rows). Service-role only.
-- Pool sourced from thermostat_daily_pools() (0 today → no-op until the Thermostat/config sets it).
CREATE FUNCTION public.distribute_drops(p_date date)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE v_pool numeric; v_sigma numeric; v_active boolean; v_supply numeric; v_cap numeric;
        v_freed numeric := 0; v_rows int := 0; r record; v_amt numeric; v_bal numeric;
BEGIN
  SELECT drops_pool INTO v_pool FROM public.thermostat_daily_pools();
  IF v_pool IS NULL OR v_pool <= 0 THEN
    RETURN jsonb_build_object('ok',true,'date',p_date,'pool',COALESCE(v_pool,0),'note','no pool — nothing freed','rows',0,'freed',0);
  END IF;
  SELECT COALESCE(sum(weighted_share),0) INTO v_sigma
    FROM public.drops_ledger WHERE earned_on=p_date AND status='pending' AND weighted_share>0;
  IF v_sigma <= 0 THEN
    RETURN jsonb_build_object('ok',true,'date',p_date,'pool',v_pool,'note','no shares — nothing freed','rows',0,'freed',0);
  END IF;
  SELECT free_active,total_supply,hard_cap INTO v_active,v_supply,v_cap FROM public.bling_system_state WHERE id=1 FOR UPDATE;
  IF NOT v_active THEN RETURN jsonb_build_object('ok',false,'reason','freeing_inactive'); END IF;
  IF v_supply + v_pool > v_cap THEN RETURN jsonb_build_object('ok',false,'reason','hard_cap_exceeded'); END IF;

  FOR r IN SELECT id,bee_id,action,weighted_share FROM public.drops_ledger
           WHERE earned_on=p_date AND status='pending' AND weighted_share>0 ORDER BY id FOR UPDATE
  LOOP
    v_amt := round(v_pool * r.weighted_share / v_sigma, 6);
    IF v_amt > 0 THEN
      UPDATE public.bees SET bling_balance = bling_balance + v_amt WHERE id=r.bee_id RETURNING bling_balance INTO v_bal;
      INSERT INTO public.bling_transactions (bee_id,type,amount,balance_after,category,source_type,memo)
        VALUES (r.bee_id,'drops',v_amt,v_bal,'drops_'||r.action,'drops_close','Drops close '||p_date||' #'||r.id||' ('||r.action||')');
      v_freed := v_freed + v_amt;
    END IF;
    UPDATE public.drops_ledger SET status='converted' WHERE id=r.id;
    v_rows := v_rows + 1;
  END LOOP;

  IF v_freed > 0 THEN UPDATE public.bling_system_state SET total_supply = total_supply + v_freed WHERE id=1; END IF;
  RETURN jsonb_build_object('ok',true,'date',p_date,'pool',v_pool,'sum_shares',v_sigma,'rows',v_rows,'freed',v_freed);
END; $$;
REVOKE EXECUTE ON FUNCTION public.distribute_drops(date) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.distribute_drops(date) TO service_role;