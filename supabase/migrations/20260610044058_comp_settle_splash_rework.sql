-- SPLASH: instant competition yield, paid at comp_settle (no daily-close wait). Names the reward Bees earn from
-- active head-to-head Bee-Game play, distinct from daily-close Drops/Drips. comp_settle now: (1) practice/casual
-- caps at reserve (was hard_cap); (2) all competition winnings carry lot origin 'splash' + tx type 'splash',
-- with source_type 'splash_source' (Source-funded practice) vs 'splash_pot' (wagered prize pool). Wagered skim &
-- conservation logic byte-unchanged. CHECK gains 'splash'; active_membership_check counts 'splash'.
ALTER TABLE public.bling_transactions DROP CONSTRAINT bling_transactions_type_check;

ALTER TABLE public.bling_transactions ADD CONSTRAINT bling_transactions_type_check CHECK (type = ANY (ARRAY[
  'free','send_debit','send_credit','escrow_hold','escrow_release','escrow_cancel','escrow_dispute',
  'order_reserve','order_fill_debit','order_fill_credit','order_cancel_refund','order_donation','stripe_credit','chargeback',
  'escrow_in','escrow_unlock','newbee_bonus','atlasoracle_escrow_deposit','atlasoracle_escrow_withdraw','atlasoracle_directive','atlasoracle_refund',
  'competition_stake_escrow','competition_stake_refund','competition_source_reward','competition_payout',
  'affiliate','affiliate_clawback','drops','drips','drips_royalty','splash']));

CREATE OR REPLACE FUNCTION public.comp_settle(p_competition_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE v_caller uuid := auth.uid(); v_is_service boolean := (auth.role()='service_role'); v_comp public.competitions%ROWTYPE; v_rec record;
    v_pot numeric(24,6); v_skim numeric(24,6) := 0; v_distributable numeric(24,6) := 0; v_source_in numeric(24,6) := 0;
    v_sum_weights numeric(24,6) := 0; v_allocated numeric(24,6) := 0; v_pay numeric(24,6); v_balance_after numeric(24,6);
    v_total_supply numeric; v_new_total numeric; v_cap numeric; v_top_bee uuid := NULL;
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
        SELECT total_supply, reserve INTO v_total_supply, v_cap FROM public.bling_system_state WHERE id = 1 FOR UPDATE;
        FOR v_rec IN SELECT p.bee_id, COALESCE(sum(a.awarded),0)::numeric(24,6) AS due FROM public.competition_participants p
              LEFT JOIN public.competition_answers a ON a.competition_id=p.competition_id AND a.bee_id=p.bee_id AND a.is_correct=true AND a.forfeit_reason IS NULL
             WHERE p.competition_id=p_competition_id GROUP BY p.bee_id LOOP
            IF v_rec.due > 0 THEN
                v_new_total := v_total_supply + v_rec.due;
                IF v_new_total > v_cap THEN RAISE EXCEPTION 'Splash would exceed reserve'; END IF;
                v_total_supply := v_new_total;
                PERFORM public.lot_credit(v_rec.bee_id, v_rec.due, 'splash', jsonb_build_object('competition_id',p_competition_id,'mode',v_comp.mode));
                SELECT bling_balance INTO v_balance_after FROM public.bees WHERE id=v_rec.bee_id;
                UPDATE public.competition_participants SET payout=v_rec.due WHERE competition_id=p_competition_id AND bee_id=v_rec.bee_id;
                INSERT INTO public.bling_transactions (bee_id,type,amount,balance_after,source_type,source_ref,memo)
                VALUES (v_rec.bee_id,'splash',v_rec.due,v_balance_after,'splash_source',p_competition_id,'Bee Game Splash (Source-funded)');
                v_source_in := v_source_in + v_rec.due;
            END IF;
        END LOOP;
        UPDATE public.bling_system_state SET total_supply = v_total_supply WHERE id=1; v_pot := 0;
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
        IF v_skim > 0 THEN UPDATE public.bling_system_state SET total_supply = greatest(total_supply - v_skim, 0) WHERE id=1; END IF;
    END IF;
    INSERT INTO public.competition_settlements (competition_id, source_in, pot_total, sink_to_source)
    VALUES (p_competition_id, v_source_in, v_pot, v_skim)
    ON CONFLICT (competition_id) DO UPDATE SET source_in=EXCLUDED.source_in, pot_total=EXCLUDED.pot_total, sink_to_source=EXCLUDED.sink_to_source, settled_at=now();
    UPDATE public.competitions SET status='complete', ended_at=now() WHERE id=p_competition_id;
    RETURN jsonb_build_object('ok',true,'competition_id',p_competition_id,'mode',v_comp.mode,'source_in',v_source_in,'pot_total',v_pot,'sink_to_source',v_skim,'distributed',v_allocated);
END; $function$;

CREATE OR REPLACE FUNCTION public.active_membership_check(p_bee_id uuid, p_lookback_days integer DEFAULT 365)
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE v_since TIMESTAMPTZ; v_events_count INT;
BEGIN
  v_since := now() - make_interval(days => p_lookback_days);
  SELECT count(*) INTO v_events_count FROM public.bling_transactions
   WHERE bee_id = p_bee_id AND created_at >= v_since
     AND type IN ('free','newbee_bonus','drops','drips','drips_royalty','send_debit','send_credit',
       'escrow_hold','escrow_release','escrow_cancel','escrow_unlock',
       'competition_stake_escrow','splash',
       'affiliate','affiliate_clawback','atlasoracle_escrow_deposit','atlasoracle_escrow_withdraw');
  RETURN v_events_count >= 10;
END; $function$;
