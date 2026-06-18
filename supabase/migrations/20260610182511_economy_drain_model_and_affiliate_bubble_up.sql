-- ECONOMY DRAIN MODEL (ratified Jun 10 2026, supersedes the Jun 10 04:00 ceiling lock)
-- Reserve becomes a true draining balance: every freeing decrements it, every
-- sink-to-source refills it. Conservation invariant, enforced by CHECK and guardian:
--   reserve + treasury + total_supply = hard_cap, always.
-- Plus AFFILIATE VACANCY BUBBLE-UP (ratified): pool redistributes over OCCUPIED
-- levels by Fibonacci weights (5/3/2/1/1 renormalized); treasury only on a fully
-- empty chain; rounding remainder to the nearest occupied level.

-- ===== constraint swap: ceiling → drain conservation (with true-up) =====
ALTER TABLE public.bling_system_state DROP CONSTRAINT bling_system_state_reserve_treasury_cap;

UPDATE public.bling_system_state SET reserve = reserve - total_supply WHERE id=1 AND total_supply > 0;

ALTER TABLE public.bling_system_state
  ADD CONSTRAINT bling_system_state_conservation CHECK (reserve + treasury + total_supply = hard_cap);

-- ===== affiliate_distribute: drain + bubble-up =====
CREATE OR REPLACE FUNCTION public.affiliate_distribute(p_earner_bee_id uuid, p_pool_amount numeric, p_trigger text, p_source_ref uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE
    v_free boolean; v_total numeric; v_reserve numeric;
    v_l1 uuid; v_l2 uuid; v_l3 uuid; v_l4 uuid; v_l5 uuid;
    v_treasury uuid; v_paid jsonb := '[]'::jsonb;
    v_to_uplines numeric := 0; v_treasury_share numeric := 0;
    v_tiers int[] := '{}'; v_ups uuid[] := '{}'; v_ws numeric[] := '{}'; v_shares numeric[] := '{}';
    v_sumw numeric := 0; v_alloc numeric := 0; v_n int; i int;
    v_releases timestamptz;
BEGIN
    IF p_pool_amount <= 0 THEN RAISE EXCEPTION 'pool must be positive'; END IF;
    PERFORM 1 FROM public.affiliate_holds WHERE source_ref = p_source_ref LIMIT 1;
    IF FOUND THEN RAISE EXCEPTION 'cascade already distributed for event %', p_source_ref; END IF;
    SELECT id INTO v_treasury FROM public.bees WHERE handle='combtreasury';
    IF v_treasury IS NULL THEN RAISE EXCEPTION 'combtreasury bee missing'; END IF;
    SELECT free_active,total_supply,reserve INTO v_free,v_total,v_reserve
      FROM public.bling_system_state WHERE id=1 FOR UPDATE;
    IF NOT v_free THEN RAISE EXCEPTION 'FREE issuance paused'; END IF;
    IF p_pool_amount > v_reserve THEN RAISE EXCEPTION 'pool would exceed reserve'; END IF;
    UPDATE public.bling_system_state
       SET total_supply = v_total + p_pool_amount,
           reserve      = v_reserve - p_pool_amount
     WHERE id=1;
    SELECT l1_sponsor_id,l2_pathfinder_id,l3_navigator_id,l4_pioneer_id,l5_origin_id
      INTO v_l1,v_l2,v_l3,v_l4,v_l5
      FROM public.bee_affiliate_chain WHERE bee_id=p_earner_bee_id;
    v_releases := now() + interval '60 days';
    IF v_l1 IS NOT NULL THEN v_tiers:=v_tiers||1; v_ups:=v_ups||v_l1; v_ws:=v_ws||5::numeric; END IF;
    IF v_l2 IS NOT NULL THEN v_tiers:=v_tiers||2; v_ups:=v_ups||v_l2; v_ws:=v_ws||3::numeric; END IF;
    IF v_l3 IS NOT NULL THEN v_tiers:=v_tiers||3; v_ups:=v_ups||v_l3; v_ws:=v_ws||2::numeric; END IF;
    IF v_l4 IS NOT NULL THEN v_tiers:=v_tiers||4; v_ups:=v_ups||v_l4; v_ws:=v_ws||1::numeric; END IF;
    IF v_l5 IS NOT NULL THEN v_tiers:=v_tiers||5; v_ups:=v_ups||v_l5; v_ws:=v_ws||1::numeric; END IF;
    v_n := COALESCE(array_length(v_ups,1),0);
    IF v_n = 0 THEN
      v_treasury_share := p_pool_amount;
      UPDATE public.bees SET bling_held = bling_held + v_treasury_share WHERE id=v_treasury;
      INSERT INTO public.affiliate_holds (bee_id,amount,tier,trigger,source_ref,releases_at)
        VALUES (v_treasury, v_treasury_share, 'treasury', p_trigger, p_source_ref, v_releases);
    ELSE
      FOR i IN 1..v_n LOOP v_sumw := v_sumw + v_ws[i]; END LOOP;
      FOR i IN 1..v_n LOOP
        v_shares := v_shares || round(p_pool_amount * v_ws[i] / v_sumw, 6);
        v_alloc := v_alloc + v_shares[i];
      END LOOP;
      v_shares[1] := v_shares[1] + (p_pool_amount - v_alloc);
      FOR i IN 1..v_n LOOP
        CONTINUE WHEN v_shares[i] <= 0;
        UPDATE public.bees SET bling_held = bling_held + v_shares[i] WHERE id=v_ups[i];
        INSERT INTO public.affiliate_holds (bee_id,amount,tier,trigger,source_ref,releases_at)
          VALUES (v_ups[i], v_shares[i], 'l'||v_tiers[i], p_trigger, p_source_ref, v_releases);
        v_to_uplines := v_to_uplines + v_shares[i];
        v_paid := v_paid || jsonb_build_object('tier',v_tiers[i],'bee',v_ups[i],'amount',v_shares[i],'held_until',v_releases);
      END LOOP;
    END IF;
    RETURN jsonb_build_object('ok',true,'pool',p_pool_amount,'to_uplines_held',v_to_uplines,
              'to_treasury_held',v_treasury_share,'releases_at',v_releases,'paid',v_paid,
              'vacancy_rule','bubble_up','well_remaining',v_reserve - p_pool_amount);
END; $function$;

-- ===== issue_newbee_bonus: drain =====
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
  IF v_bonus_amount > v_reserve THEN RAISE EXCEPTION 'NewBEE bonus would exceed reserve'; END IF;
  UPDATE public.bling_system_state
     SET total_supply = total_supply + v_bonus_amount,
         reserve      = reserve - v_bonus_amount
   WHERE id=1;
  PERFORM public.lot_credit(p_bee_id, v_bonus_amount, 'newbee');
  SELECT bling_balance INTO v_new_balance FROM public.bees WHERE id=p_bee_id;
  UPDATE public.bees SET updated_at=now() WHERE id=p_bee_id;
  INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, currency_type, category, origin_restricted)
  VALUES (p_bee_id, 'newbee_bonus', v_bonus_amount, v_new_balance, 'BLiNG', 'welcome', TRUE);
  RETURN TRUE;
END; $function$;

-- ===== distribute_drops: drain =====
CREATE OR REPLACE FUNCTION public.distribute_drops(p_date date)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE v_pool numeric; v_sigma numeric; v_active boolean; v_supply numeric; v_reserve numeric;
        v_freed numeric := 0; v_rows int := 0; r record; v_amt numeric; v_bal numeric;
BEGIN
  SELECT drops_pool INTO v_pool FROM public.thermostat_daily_pools();
  IF v_pool IS NULL OR v_pool <= 0 THEN RETURN jsonb_build_object('ok',true,'date',p_date,'pool',COALESCE(v_pool,0),'note','no pool','rows',0,'freed',0); END IF;
  SELECT COALESCE(sum(weighted_share),0) INTO v_sigma FROM public.drops_ledger WHERE earned_on=p_date AND status='pending' AND weighted_share>0;
  IF v_sigma <= 0 THEN RETURN jsonb_build_object('ok',true,'date',p_date,'pool',v_pool,'note','no shares','rows',0,'freed',0); END IF;
  SELECT free_active,total_supply,reserve INTO v_active,v_supply,v_reserve FROM public.bling_system_state WHERE id=1 FOR UPDATE;
  IF NOT v_active THEN RETURN jsonb_build_object('ok',false,'reason','freeing_inactive'); END IF;
  IF v_pool > v_reserve THEN RETURN jsonb_build_object('ok',false,'reason','reserve_exceeded'); END IF;
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
  IF v_freed > 0 THEN
    UPDATE public.bling_system_state SET total_supply = total_supply + v_freed, reserve = reserve - v_freed WHERE id=1;
  END IF;
  RETURN jsonb_build_object('ok',true,'date',p_date,'pool',v_pool,'rows',v_rows,'freed',v_freed);
END; $function$;

-- ===== distribute_drips: drain =====
CREATE OR REPLACE FUNCTION public.distribute_drips(p_date date)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE
  c_fnu uuid := '00000000-0000-0000-0000-000000facade'; c_treasury uuid := '00000000-0000-0000-0000-000000000bee';
  v_pool numeric; v_sigma numeric; v_active boolean; v_supply numeric; v_reserve numeric;
  v_freed numeric := 0; v_rows int := 0; r record;
  v_d numeric; v_creator numeric; v_tag numeric; v_residual numeric; v_ppool numeric;
  v_treasury numeric; v_sumw numeric; v_anc record; v_amt numeric; v_bal numeric; v_recip uuid; v_anctot numeric;
BEGIN
  SELECT drips_pool INTO v_pool FROM public.thermostat_daily_pools();
  IF v_pool IS NULL OR v_pool <= 0 THEN RETURN jsonb_build_object('ok',true,'pool',COALESCE(v_pool,0),'freed',0); END IF;
  SELECT COALESCE(sum(weighted_share),0) INTO v_sigma FROM public.drips_ledger WHERE earned_on=p_date AND status='pending' AND weighted_share>0;
  IF v_sigma <= 0 THEN RETURN jsonb_build_object('ok',true,'pool',v_pool,'freed',0); END IF;
  SELECT free_active,total_supply,reserve INTO v_active,v_supply,v_reserve FROM public.bling_system_state WHERE id=1 FOR UPDATE;
  IF NOT v_active THEN RETURN jsonb_build_object('ok',false,'reason','freeing_inactive'); END IF;
  IF v_pool > v_reserve THEN RETURN jsonb_build_object('ok',false,'reason','reserve_exceeded'); END IF;
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
  IF v_freed > 0 THEN
    UPDATE public.bling_system_state SET total_supply = total_supply + v_freed, reserve = reserve - v_freed WHERE id=1;
  END IF;
  RETURN jsonb_build_object('ok',true,'pool',v_pool,'rows',v_rows,'freed',v_freed);
END; $function$;

-- ===== comp_settle: drain on splash, sink refills the Well =====
CREATE OR REPLACE FUNCTION public.comp_settle(p_competition_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE v_caller uuid := auth.uid(); v_is_service boolean := (auth.role()='service_role'); v_comp public.competitions%ROWTYPE; v_rec record;
    v_pot numeric(24,6); v_skim numeric(24,6) := 0; v_distributable numeric(24,6) := 0; v_source_in numeric(24,6) := 0;
    v_sum_weights numeric(24,6) := 0; v_allocated numeric(24,6) := 0; v_pay numeric(24,6); v_balance_after numeric(24,6);
    v_total_supply numeric; v_reserve numeric; v_top_bee uuid := NULL;
BEGIN
    SELECT * INTO v_comp FROM public.competitions WHERE id = p_competition_id FOR UPDATE;
    IF v_comp.id IS NULL THEN RAISE EXCEPTION 'competition % not found', p_competition_id; END IF;
    IF NOT v_is_service AND v_caller IS DISTINCT FROM v_comp.host_bee_id THEN RAISE EXCEPTION 'only the host or engine may settle'; END IF;
    IF v_comp.status = 'complete' THEN RAISE EXCEPTION 'competition % already settled', p_competition_id; END IF;
    IF v_comp.status NOT IN ('active','settling') THEN RAISE EXCEPTION 'cannot settle in status %', v_comp.status; END IF;
    UPDATE public.competitions SET status = 'settling' WHERE id = p_competition_id;
    FOR v_rec IN SELECT * FROM public.comp_leaderboard(p_competition_id) LOOP
        UPDATE public.competition_participants SET final_rank = v_rec.final_rank WHERE competition_id = p_competition_id AND bee_id = v_rec.bee_id;
    END LOOP;
    IF v_comp.mode IN ('practice','casual') THEN
        SELECT total_supply, reserve INTO v_total_supply, v_reserve FROM public.bling_system_state WHERE id = 1 FOR UPDATE;
        FOR v_rec IN SELECT p.bee_id, COALESCE(sum(a.awarded),0)::numeric(24,6) AS due FROM public.competition_participants p
              LEFT JOIN public.competition_answers a ON a.competition_id=p.competition_id AND a.bee_id=p.bee_id AND a.is_correct=true AND a.forfeit_reason IS NULL
             WHERE p.competition_id=p_competition_id GROUP BY p.bee_id LOOP
            IF v_rec.due > 0 THEN
                IF v_rec.due > v_reserve THEN RAISE EXCEPTION 'Splash would exceed reserve'; END IF;
                v_reserve := v_reserve - v_rec.due;
                v_total_supply := v_total_supply + v_rec.due;
                PERFORM public.lot_credit(v_rec.bee_id, v_rec.due, 'splash', jsonb_build_object('competition_id',p_competition_id,'mode',v_comp.mode));
                SELECT bling_balance INTO v_balance_after FROM public.bees WHERE id=v_rec.bee_id;
                UPDATE public.competition_participants SET payout=v_rec.due WHERE competition_id=p_competition_id AND bee_id=v_rec.bee_id;
                INSERT INTO public.bling_transactions (bee_id,type,amount,balance_after,source_type,source_ref,memo)
                VALUES (v_rec.bee_id,'splash',v_rec.due,v_balance_after,'splash_source',p_competition_id,'Bee Game Splash (Source-funded)');
                v_source_in := v_source_in + v_rec.due;
            END IF;
        END LOOP;
        UPDATE public.bling_system_state SET total_supply = v_total_supply, reserve = v_reserve WHERE id=1; v_pot := 0;
    ELSE
        v_pot := v_comp.prize_pool; v_skim := round(v_pot*0.05,6); v_distributable := v_pot - v_skim;
        SELECT COALESCE(sum(public.fib_speed_multiplier(final_rank)),0) INTO v_sum_weights FROM public.competition_participants WHERE competition_id=p_competition_id AND forfeited=false AND final_rank IS NOT NULL;
        IF v_sum_weights > 0 AND v_distributable > 0 THEN
            FOR v_rec IN SELECT bee_id, final_rank FROM public.competition_participants WHERE competition_id=p_competition_id AND forfeited=false AND final_rank IS NOT NULL ORDER BY final_rank ASC LOOP
                v_pay := round(v_distributable * public.fib_speed_multiplier(v_rec.final_rank) / v_sum_weights, 6); v_allocated := v_allocated + v_pay;
                IF v_top_bee IS NULL THEN v_top_bee := v_rec.bee_id; END IF;
                PERFORM public.lot_credit(v_rec.bee_id, v_pay, 'splash', jsonb_build_object('competition_id',p_competition_id,'mode',v_comp.mode));
                SELECT bling_balance INTO v_balance_after FROM public.bees WHERE id=v_rec.bee_id;
                UPDATE public.competition_participants SET payout=v_pay WHERE competition_id=p_competition_id AND bee_id=v_rec.bee_id;
                INSERT INTO public.bling_transactions (bee_id,type,amount,balance_after,source_type,source_ref,memo)
                VALUES (v_rec.bee_id,'splash',v_pay,v_balance_after,'splash_pot',p_competition_id,'Bee Game Splash (prize pool)');
            END LOOP;
            IF v_allocated <> v_distributable AND v_top_bee IS NOT NULL THEN
                v_pay := v_distributable - v_allocated;
                PERFORM public.lot_credit(v_top_bee, v_pay, 'splash', jsonb_build_object('competition_id',p_competition_id,'mode',v_comp.mode,'remainder',true));
                SELECT bling_balance INTO v_balance_after FROM public.bees WHERE id=v_top_bee;
                UPDATE public.competition_participants SET payout = payout + v_pay WHERE competition_id=p_competition_id AND bee_id=v_top_bee;
                INSERT INTO public.bling_transactions (bee_id,type,amount,balance_after,source_type,source_ref,memo)
                VALUES (v_top_bee,'splash',v_pay,v_balance_after,'splash_pot',p_competition_id,'Bee Game Splash (prize pool, rounding remainder)');
                v_allocated := v_distributable;
            END IF;
        ELSE v_skim := v_pot; v_distributable := 0; END IF;
        IF v_skim > 0 THEN
            UPDATE public.bling_system_state
               SET reserve      = reserve + least(total_supply, v_skim),
                   total_supply = greatest(total_supply - v_skim, 0)
             WHERE id=1;
        END IF;
    END IF;
    INSERT INTO public.competition_settlements (competition_id, source_in, pot_total, sink_to_source)
    VALUES (p_competition_id, v_source_in, v_pot, v_skim)
    ON CONFLICT (competition_id) DO UPDATE SET source_in=EXCLUDED.source_in, pot_total=EXCLUDED.pot_total, sink_to_source=EXCLUDED.sink_to_source, settled_at=now();
    UPDATE public.competitions SET status='complete', ended_at=now() WHERE id=p_competition_id;
    RETURN jsonb_build_object('ok',true,'competition_id',p_competition_id,'mode',v_comp.mode,'source_in',v_source_in,'pot_total',v_pot,'sink_to_source',v_skim,'distributed',v_allocated);
END; $function$;

-- ===== guardian: conservation invariant folded into ok =====
CREATE OR REPLACE FUNCTION public.economy_integrity_check()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE
  v_supply numeric; v_lots numeric; v_cache numeric; v_held numeric; v_deficit numeric;
  v_pool_comp numeric; v_pool_escrow numeric; v_pool_pots numeric; v_ops numeric;
  v_cache_drift int; v_bad_lots int; v_circulating numeric;
  v_reserve numeric; v_treasury numeric; v_hard_cap numeric; v_conservation boolean;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'economy_integrity_check is service-role / admin only';
  END IF;
  SELECT total_supply, reserve, treasury, hard_cap INTO v_supply, v_reserve, v_treasury, v_hard_cap
    FROM public.bling_system_state WHERE id=1;
  SELECT COALESCE(sum(amount_remaining),0) INTO v_lots FROM public.bling_lots WHERE status='active';
  SELECT COALESCE(sum(bling_balance),0), COALESCE(sum(bling_held),0), COALESCE(sum(bling_deficit),0)
    INTO v_cache, v_held, v_deficit FROM public.bees;
  SELECT COALESCE(sum(prize_pool),0) INTO v_pool_comp FROM public.competitions WHERE status <> 'complete';
  SELECT COALESCE(sum(amount),0) INTO v_pool_escrow FROM public.bling_escrows WHERE status='held';
  SELECT COALESCE(sum(balance),0) INTO v_pool_pots FROM public.bling_pots;
  SELECT COALESCE(sum(current_balance),0) INTO v_ops FROM public.operations_funds;

  SELECT count(*) INTO v_cache_drift FROM (
    SELECT b.id FROM public.bees b
    LEFT JOIN (SELECT bee_id, sum(amount_remaining) s FROM public.bling_lots WHERE status='active' GROUP BY bee_id) l ON l.bee_id=b.id
    WHERE b.bling_balance <> COALESCE(l.s,0)
  ) d;
  SELECT count(*) INTO v_bad_lots FROM public.bling_lots
    WHERE status='active' AND (amount_remaining < 0 OR amount_remaining > amount_original);

  v_circulating := v_lots + v_held + v_pool_comp + v_pool_escrow + v_pool_pots - v_deficit;
  v_conservation := (v_reserve + v_treasury + v_supply = v_hard_cap);

  RETURN jsonb_build_object(
    'ok', (v_cache = v_lots) AND v_cache_drift = 0 AND v_bad_lots = 0 AND v_conservation,
    'cache_invariant', jsonb_build_object(
      'sum_bee_balances', v_cache, 'sum_active_lots', v_lots,
      'match', v_cache = v_lots, 'bees_with_drift', v_cache_drift, 'invalid_lots', v_bad_lots),
    'conservation_invariant', jsonb_build_object(
      'reserve_well_remaining', v_reserve, 'treasury', v_treasury, 'total_supply_freed', v_supply,
      'hard_cap', v_hard_cap, 'match', v_conservation,
      'note', 'drain model: reserve + treasury + total_supply = hard_cap, always'),
    'supply_dashboard', jsonb_build_object(
      'total_supply_freed_from_well', v_supply,
      'circulating', v_circulating,
      'circulating_breakdown', jsonb_build_object('active_lots', v_lots, 'held', v_held,
        'pooled_competitions', v_pool_comp, 'pooled_escrows', v_pool_escrow, 'pooled_pots', v_pool_pots, 'less_deficit', v_deficit),
      'operations_funds_remaining', v_ops,
      'note', 'circulating = well_freed + ops_disbursed; ops endowment sits outside total_supply'),
    'checked_at', now());
END; $function$;
