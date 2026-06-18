-- DNA D2 cluster A2: route the Drops/Drips daily-close freeing through lot_credit. distribute_drops:
-- one credit -> 'drop'. distribute_drips: the §6 bubble's four credit points -> 'drip' (creator) /
-- 'drip_royalty' (ancestors + treasury sweep). Split arithmetic, total_supply, ledger->converted, and
-- all bling_transactions preserved exactly; only balance-writes become jars. Conservation verified: supply = Σ active lots.
CREATE OR REPLACE FUNCTION public.distribute_drops(p_date date)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE v_pool numeric; v_sigma numeric; v_active boolean; v_supply numeric; v_cap numeric;
        v_freed numeric := 0; v_rows int := 0; r record; v_amt numeric; v_bal numeric;
BEGIN
  SELECT drops_pool INTO v_pool FROM public.thermostat_daily_pools();
  IF v_pool IS NULL OR v_pool <= 0 THEN RETURN jsonb_build_object('ok',true,'date',p_date,'pool',COALESCE(v_pool,0),'note','no pool','rows',0,'freed',0); END IF;
  SELECT COALESCE(sum(weighted_share),0) INTO v_sigma FROM public.drops_ledger WHERE earned_on=p_date AND status='pending' AND weighted_share>0;
  IF v_sigma <= 0 THEN RETURN jsonb_build_object('ok',true,'date',p_date,'pool',v_pool,'note','no shares','rows',0,'freed',0); END IF;
  SELECT free_active,total_supply,hard_cap INTO v_active,v_supply,v_cap FROM public.bling_system_state WHERE id=1 FOR UPDATE;
  IF NOT v_active THEN RETURN jsonb_build_object('ok',false,'reason','freeing_inactive'); END IF;
  IF v_supply + v_pool > v_cap THEN RETURN jsonb_build_object('ok',false,'reason','hard_cap_exceeded'); END IF;
  FOR r IN SELECT id,bee_id,action,weighted_share FROM public.drops_ledger WHERE earned_on=p_date AND status='pending' AND weighted_share>0 ORDER BY id FOR UPDATE LOOP
    v_amt := round(v_pool * r.weighted_share / v_sigma, 6);
    IF v_amt > 0 THEN
      PERFORM public.lot_credit(r.bee_id, v_amt, 'drop', jsonb_build_object('action', r.action));
      SELECT bling_balance INTO v_bal FROM public.bees WHERE id=r.bee_id;
      INSERT INTO public.bling_transactions (bee_id,type,amount,balance_after,category,source_type,memo)
        VALUES (r.bee_id,'drops',v_amt,v_bal,'drops_'||r.action,'drops_close','Drops '||p_date||' #'||r.id);
      v_freed := v_freed + v_amt;
    END IF;
    UPDATE public.drops_ledger SET status='converted' WHERE id=r.id; v_rows := v_rows + 1;
  END LOOP;
  IF v_freed > 0 THEN UPDATE public.bling_system_state SET total_supply = total_supply + v_freed WHERE id=1; END IF;
  RETURN jsonb_build_object('ok',true,'date',p_date,'pool',v_pool,'rows',v_rows,'freed',v_freed);
END; $function$;

CREATE OR REPLACE FUNCTION public.distribute_drips(p_date date)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE
  c_fnu uuid := '00000000-0000-0000-0000-000000facade'; c_treasury uuid := '00000000-0000-0000-0000-000000000bee';
  v_pool numeric; v_sigma numeric; v_active boolean; v_supply numeric; v_cap numeric;
  v_freed numeric := 0; v_rows int := 0; r record;
  v_d numeric; v_creator numeric; v_tag numeric; v_residual numeric; v_ppool numeric;
  v_treasury numeric; v_sumw numeric; v_anc record; v_amt numeric; v_bal numeric; v_recip uuid; v_anctot numeric;
BEGIN
  SELECT drips_pool INTO v_pool FROM public.thermostat_daily_pools();
  IF v_pool IS NULL OR v_pool <= 0 THEN RETURN jsonb_build_object('ok',true,'pool',COALESCE(v_pool,0),'freed',0); END IF;
  SELECT COALESCE(sum(weighted_share),0) INTO v_sigma FROM public.drips_ledger WHERE earned_on=p_date AND status='pending' AND weighted_share>0;
  IF v_sigma <= 0 THEN RETURN jsonb_build_object('ok',true,'pool',v_pool,'freed',0); END IF;
  SELECT free_active,total_supply,hard_cap INTO v_active,v_supply,v_cap FROM public.bling_system_state WHERE id=1 FOR UPDATE;
  IF NOT v_active THEN RETURN jsonb_build_object('ok',false,'reason','freeing_inactive'); END IF;
  IF v_supply + v_pool > v_cap THEN RETURN jsonb_build_object('ok',false,'reason','hard_cap_exceeded'); END IF;
  FOR r IN SELECT id,creator_bee_id,atom_id,weighted_share FROM public.drips_ledger WHERE earned_on=p_date AND status='pending' AND weighted_share>0 ORDER BY id FOR UPDATE LOOP
    v_d := round(v_pool * r.weighted_share / v_sigma, 6); v_treasury := 0;
    IF r.atom_id IS NULL THEN
      v_recip := CASE WHEN r.creator_bee_id=c_fnu THEN c_treasury ELSE r.creator_bee_id END;
      IF v_recip=c_treasury THEN v_treasury := v_d;
      ELSE PERFORM public.lot_credit(v_recip, v_d, 'drip', '{}'::jsonb); SELECT bling_balance INTO v_bal FROM public.bees WHERE id=v_recip;
           INSERT INTO public.bling_transactions (bee_id,type,amount,balance_after,category,source_type,memo) VALUES (v_recip,'drips',v_d,v_bal,'drips_creator','drips_close','Drips '||p_date||' #'||r.id||' no-lineage'); END IF;
    ELSE
      v_creator := round(v_d*0.80,6); v_ppool := v_d*0.13; v_tag := round(v_d*0.05,6); v_anctot := 0;
      v_recip := CASE WHEN r.creator_bee_id=c_fnu THEN c_treasury ELSE r.creator_bee_id END;
      IF v_recip=c_treasury THEN v_treasury := v_treasury + v_creator;
      ELSE PERFORM public.lot_credit(v_recip, v_creator, 'drip', jsonb_build_object('atom_id',r.atom_id,'role','creator')); SELECT bling_balance INTO v_bal FROM public.bees WHERE id=v_recip;
           INSERT INTO public.bling_transactions (bee_id,type,amount,balance_after,category,source_type,memo) VALUES (v_recip,'drips',v_creator,v_bal,'drips_creator','drips_close','Drips '||p_date||' #'||r.id||' atom 80%'); END IF;
      SELECT COALESCE(sum(power(0.618, level-1)),0) INTO v_sumw FROM public.atom_ancestor_sourcers(r.atom_id,3);
      IF v_sumw > 0 THEN
        FOR v_anc IN SELECT level,bee_id FROM public.atom_ancestor_sourcers(r.atom_id,3) LOOP
          v_amt := round(v_ppool * power(0.618, v_anc.level-1) / v_sumw, 6); v_anctot := v_anctot + v_amt;
          IF v_amt > 0 THEN
            v_recip := CASE WHEN v_anc.bee_id=c_fnu THEN c_treasury ELSE v_anc.bee_id END;
            IF v_recip=c_treasury THEN v_treasury := v_treasury + v_amt;
            ELSE PERFORM public.lot_credit(v_recip, v_amt, 'drip_royalty', jsonb_build_object('atom_id',r.atom_id,'role','ancestor','level',v_anc.level)); SELECT bling_balance INTO v_bal FROM public.bees WHERE id=v_recip;
                 INSERT INTO public.bling_transactions (bee_id,type,amount,balance_after,category,source_type,memo) VALUES (v_recip,'drips_royalty',v_amt,v_bal,'drips_parent_l'||v_anc.level,'drips_close','Drips '||p_date||' #'||r.id||' L'||v_anc.level); END IF;
          END IF;
        END LOOP;
      END IF;
      v_residual := v_d - v_creator - v_anctot - v_tag; v_treasury := v_treasury + v_tag + v_residual;
    END IF;
    IF v_treasury > 0 THEN
      PERFORM public.lot_credit(c_treasury, v_treasury, 'drip_royalty', jsonb_build_object('atom_id',r.atom_id,'role','treasury')); SELECT bling_balance INTO v_bal FROM public.bees WHERE id=c_treasury;
      INSERT INTO public.bling_transactions (bee_id,type,amount,balance_after,category,source_type,memo) VALUES (c_treasury,'drips_royalty',v_treasury,v_bal,'drips_unattributed','drips_close','Drips '||p_date||' #'||r.id||' treasury'); END IF;
    UPDATE public.drips_ledger SET status='converted' WHERE id=r.id; v_freed := v_freed + v_d; v_rows := v_rows + 1;
  END LOOP;
  IF v_freed > 0 THEN UPDATE public.bling_system_state SET total_supply = total_supply + v_freed WHERE id=1; END IF;
  RETURN jsonb_build_object('ok',true,'pool',v_pool,'rows',v_rows,'freed',v_freed);
END; $function$;
