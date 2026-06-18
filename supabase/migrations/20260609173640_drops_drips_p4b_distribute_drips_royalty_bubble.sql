-- Drops/Drips piece 4b — Drips distributor + §6 Manual Royalty bubble (atom-scoped).
-- drips_ledger gains atom_id; record_drip gains p_atom_id; atom_ancestor_sourcers walks the taxonomy tree;
-- distribute_drips: pro-rata the Drips pool, then per row — non-atom Drip = 100% creator; atom Drip = 80
-- creator / 13 ancestor-sourcers (x0.618 decay, <=3 levels) / 5 tag->treasury / 2 residual->treasury, with
-- fnu(system bee)->treasury redirect and residual absorbing rounding (exact conservation). Service-role only.

ALTER TABLE public.drips_ledger ADD COLUMN atom_id text REFERENCES public.atoms(id);

DROP FUNCTION public.record_drip(uuid,text,uuid,uuid);
CREATE FUNCTION public.record_drip(p_creator_bee_id uuid, p_signal text, p_engager_bee_id uuid, p_source_ref uuid, p_atom_id text DEFAULT NULL)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE v_w numeric; v_scope text; v_mult numeric; v_level int; v_lic numeric; v_n int; v_decay numeric;
        v_today date := (now() AT TIME ZONE 'UTC')::date; v_share numeric; v_key text; v_rc int;
BEGIN
  IF p_engager_bee_id IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','no_engager'); END IF;
  IF p_engager_bee_id = p_creator_bee_id THEN RETURN jsonb_build_object('ok',false,'reason','self_engagement'); END IF;
  SELECT weight,dedup_scope INTO v_w,v_scope FROM public.drips_signal_weight WHERE signal=p_signal;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','unknown_signal'); END IF;
  SELECT COALESCE(bling_rank,1) INTO v_level FROM public.bees WHERE id=p_creator_bee_id;
  IF v_level IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','unknown_creator'); END IF;
  v_level := LEAST(GREATEST(v_level,1),33);
  SELECT multiplier INTO v_mult FROM public.rank_multiplier WHERE rank_level=v_level; v_mult := COALESCE(v_mult,1.0);
  v_lic := public.drip_legitimacy(p_engager_bee_id);
  SELECT count(*) INTO v_n FROM public.drips_ledger
    WHERE engager_bee_id=p_engager_bee_id AND creator_bee_id=p_creator_bee_id AND earned_on=v_today AND weighted_share>0;
  v_decay := power(0.618, v_n);
  v_share := round(v_w*v_mult*v_lic*v_decay,4);
  v_key := CASE WHEN v_scope='permanent'
    THEN 'drip:'||p_signal||':'||p_engager_bee_id::text||':'||COALESCE(p_source_ref::text,p_atom_id,'none')
    ELSE 'drip:'||p_signal||':'||p_engager_bee_id::text||':'||COALESCE(p_source_ref::text,p_atom_id,'none')||':'||v_today::text END;
  INSERT INTO public.drips_ledger (creator_bee_id,signal,engager_bee_id,source_ref,atom_id,weight,rank_multiplier,legitimacy_factor,weighted_share,earned_on,dedup_key)
    VALUES (p_creator_bee_id,p_signal,p_engager_bee_id,p_source_ref,p_atom_id,v_w,v_mult,v_lic,v_share,v_today,v_key) ON CONFLICT (dedup_key) DO NOTHING;
  GET DIAGNOSTICS v_rc = ROW_COUNT;
  RETURN jsonb_build_object('ok',true,'recorded',v_rc=1,'weighted_share',v_share,'decay',round(v_decay,4),'legitimacy',v_lic,'rank_mult',v_mult);
END; $$;
REVOKE EXECUTE ON FUNCTION public.record_drip(uuid,text,uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.record_drip(uuid,text,uuid,uuid,text) TO service_role;

CREATE FUNCTION public.atom_ancestor_sourcers(p_atom_id text, p_levels int DEFAULT 3)
 RETURNS TABLE(level int, bee_id uuid) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE v_parts text[]; v_depth int; i int; v_anc text; v_src uuid;
BEGIN
  SELECT path_parts,depth INTO v_parts,v_depth FROM public.atoms WHERE id=p_atom_id;
  IF NOT FOUND THEN RETURN; END IF;
  FOR i IN 1..p_levels LOOP
    EXIT WHEN v_depth - i < 1;
    SELECT a.id INTO v_anc FROM public.atoms a WHERE a.path_parts = v_parts[1:(v_depth-i)] LIMIT 1;
    IF v_anc IS NULL THEN CONTINUE; END IF;
    SELECT c.bee_id INTO v_src FROM public.atom_contributions c WHERE c.atom_id=v_anc AND c.role='sourcer' LIMIT 1;
    IF v_src IS NOT NULL THEN level:=i; bee_id:=v_src; RETURN NEXT; END IF;
  END LOOP;
  RETURN;
END; $$;
REVOKE EXECUTE ON FUNCTION public.atom_ancestor_sourcers(text,int) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.atom_ancestor_sourcers(text,int) TO service_role;

CREATE FUNCTION public.distribute_drips(p_date date)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE
  c_fnu uuid := '00000000-0000-0000-0000-000000facade';
  c_treasury uuid := '00000000-0000-0000-0000-000000000bee';
  v_pool numeric; v_sigma numeric; v_active boolean; v_supply numeric; v_cap numeric;
  v_freed numeric := 0; v_rows int := 0; r record;
  v_d numeric; v_creator numeric; v_tag numeric; v_residual numeric; v_ppool numeric;
  v_treasury numeric; v_sumw numeric; v_anc record; v_amt numeric; v_bal numeric; v_recip uuid; v_anctot numeric;
BEGIN
  SELECT drips_pool INTO v_pool FROM public.thermostat_daily_pools();
  IF v_pool IS NULL OR v_pool <= 0 THEN RETURN jsonb_build_object('ok',true,'date',p_date,'pool',COALESCE(v_pool,0),'note','no pool','rows',0,'freed',0); END IF;
  SELECT COALESCE(sum(weighted_share),0) INTO v_sigma FROM public.drips_ledger WHERE earned_on=p_date AND status='pending' AND weighted_share>0;
  IF v_sigma <= 0 THEN RETURN jsonb_build_object('ok',true,'date',p_date,'pool',v_pool,'note','no shares','rows',0,'freed',0); END IF;
  SELECT free_active,total_supply,hard_cap INTO v_active,v_supply,v_cap FROM public.bling_system_state WHERE id=1 FOR UPDATE;
  IF NOT v_active THEN RETURN jsonb_build_object('ok',false,'reason','freeing_inactive'); END IF;
  IF v_supply + v_pool > v_cap THEN RETURN jsonb_build_object('ok',false,'reason','hard_cap_exceeded'); END IF;

  FOR r IN SELECT id,creator_bee_id,atom_id,weighted_share FROM public.drips_ledger
           WHERE earned_on=p_date AND status='pending' AND weighted_share>0 ORDER BY id FOR UPDATE
  LOOP
    v_d := round(v_pool * r.weighted_share / v_sigma, 6); v_treasury := 0;
    IF r.atom_id IS NULL THEN
      v_recip := CASE WHEN r.creator_bee_id=c_fnu THEN c_treasury ELSE r.creator_bee_id END;
      IF v_recip=c_treasury THEN v_treasury := v_d;
      ELSE UPDATE public.bees SET bling_balance=bling_balance+v_d WHERE id=v_recip RETURNING bling_balance INTO v_bal;
           INSERT INTO public.bling_transactions (bee_id,type,amount,balance_after,category,source_type,memo)
             VALUES (v_recip,'drips',v_d,v_bal,'drips_creator','drips_close','Drips '||p_date||' #'||r.id||' no-lineage'); END IF;
    ELSE
      v_creator := round(v_d*0.80,6); v_ppool := v_d*0.13; v_tag := round(v_d*0.05,6); v_anctot := 0;
      v_recip := CASE WHEN r.creator_bee_id=c_fnu THEN c_treasury ELSE r.creator_bee_id END;
      IF v_recip=c_treasury THEN v_treasury := v_treasury + v_creator;
      ELSE UPDATE public.bees SET bling_balance=bling_balance+v_creator WHERE id=v_recip RETURNING bling_balance INTO v_bal;
           INSERT INTO public.bling_transactions (bee_id,type,amount,balance_after,category,source_type,memo)
             VALUES (v_recip,'drips',v_creator,v_bal,'drips_creator','drips_close','Drips '||p_date||' #'||r.id||' atom 80%'); END IF;
      SELECT COALESCE(sum(power(0.618, level-1)),0) INTO v_sumw FROM public.atom_ancestor_sourcers(r.atom_id,3);
      IF v_sumw > 0 THEN
        FOR v_anc IN SELECT level,bee_id FROM public.atom_ancestor_sourcers(r.atom_id,3) LOOP
          v_amt := round(v_ppool * power(0.618, v_anc.level-1) / v_sumw, 6); v_anctot := v_anctot + v_amt;
          IF v_amt > 0 THEN
            v_recip := CASE WHEN v_anc.bee_id=c_fnu THEN c_treasury ELSE v_anc.bee_id END;
            IF v_recip=c_treasury THEN v_treasury := v_treasury + v_amt;
            ELSE UPDATE public.bees SET bling_balance=bling_balance+v_amt WHERE id=v_recip RETURNING bling_balance INTO v_bal;
                 INSERT INTO public.bling_transactions (bee_id,type,amount,balance_after,category,source_type,memo)
                   VALUES (v_recip,'drips_royalty',v_amt,v_bal,'drips_parent_l'||v_anc.level,'drips_close','Drips '||p_date||' #'||r.id||' parent L'||v_anc.level); END IF;
          END IF;
        END LOOP;
      END IF;
      v_residual := v_d - v_creator - v_anctot - v_tag;
      v_treasury := v_treasury + v_tag + v_residual;
    END IF;
    IF v_treasury > 0 THEN
      UPDATE public.bees SET bling_balance=bling_balance+v_treasury WHERE id=c_treasury RETURNING bling_balance INTO v_bal;
      INSERT INTO public.bling_transactions (bee_id,type,amount,balance_after,category,source_type,memo)
        VALUES (c_treasury,'drips_royalty',v_treasury,v_bal,'drips_unattributed','drips_close','Drips '||p_date||' #'||r.id||' treasury(tag+residual+system)');
    END IF;
    UPDATE public.drips_ledger SET status='converted' WHERE id=r.id;
    v_freed := v_freed + v_d; v_rows := v_rows + 1;
  END LOOP;
  IF v_freed > 0 THEN UPDATE public.bling_system_state SET total_supply = total_supply + v_freed WHERE id=1; END IF;
  RETURN jsonb_build_object('ok',true,'date',p_date,'pool',v_pool,'sum_shares',v_sigma,'rows',v_rows,'freed',v_freed);
END; $$;
REVOKE EXECUTE ON FUNCTION public.distribute_drips(date) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.distribute_drips(date) TO service_role;