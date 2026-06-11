-- DNA D2 Competition cluster (paired): comp_join_room stake -> lot_debit('competition_stake') drains jars
-- into the off-shelf prize_pool; comp_settle's three credit points -> lot_credit('competition') — practice
-- Source-reward, wagered payout loop, and rounding remainder. Stakes drain -pot off shelves, settle re-jars
-- +0.95*pot, 5% skim leaves total_supply; supply = Σ lots + Σ pooled holds throughout. Round-trip conservation verified.
CREATE OR REPLACE FUNCTION public.comp_join_room(p_join_code text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE v_caller uuid := auth.uid(); v_comp public.competitions%ROWTYPE; v_balance numeric(24,6); v_balance_after numeric(24,6); v_pid uuid;
BEGIN
    IF v_caller IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
    SELECT * INTO v_comp FROM public.competitions WHERE join_code = upper(p_join_code) FOR UPDATE;
    IF v_comp.id IS NULL THEN RAISE EXCEPTION 'no room with join code %', p_join_code; END IF;
    IF v_comp.status <> 'lobby' THEN RAISE EXCEPTION 'room % is not joinable (status=%)', v_comp.id, v_comp.status; END IF;
    IF EXISTS (SELECT 1 FROM public.competition_participants WHERE competition_id = v_comp.id AND bee_id = v_caller) THEN RAISE EXCEPTION 'already joined this room'; END IF;
    IF v_comp.mode IN ('stake','tournament') THEN
        SELECT bling_balance INTO v_balance FROM public.bees WHERE id = v_caller FOR UPDATE;
        IF v_balance IS NULL THEN RAISE EXCEPTION 'bee % not found', v_caller; END IF;
        IF v_balance < v_comp.stake_amount THEN RAISE EXCEPTION 'insufficient balance to stake (% < %)', v_balance, v_comp.stake_amount; END IF;
        PERFORM public.lot_debit(v_caller, v_comp.stake_amount, 'competition_stake');
        SELECT bling_balance INTO v_balance_after FROM public.bees WHERE id = v_caller;
        UPDATE public.competitions SET prize_pool = prize_pool + v_comp.stake_amount WHERE id = v_comp.id;
        INSERT INTO public.competition_participants (competition_id, bee_id, stake_escrowed) VALUES (v_comp.id, v_caller, v_comp.stake_amount) RETURNING id INTO v_pid;
        INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, source_type, source_ref, memo)
        VALUES (v_caller, 'competition_stake_escrow', -v_comp.stake_amount, v_balance_after, 'competition_stake_escrow', v_comp.id, 'Bee Games stake escrowed');
    ELSE
        INSERT INTO public.competition_participants (competition_id, bee_id) VALUES (v_comp.id, v_caller) RETURNING id INTO v_pid;
    END IF;
    RETURN jsonb_build_object('ok',true,'competition_id',v_comp.id,'participant_id',v_pid,'mode',v_comp.mode,'stake_escrowed',CASE WHEN v_comp.mode IN ('stake','tournament') THEN v_comp.stake_amount ELSE 0 END);
END; $function$;

CREATE OR REPLACE FUNCTION public.comp_settle(p_competition_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE v_caller uuid := auth.uid(); v_is_service boolean := (auth.role()='service_role'); v_comp public.competitions%ROWTYPE; v_rec record;
    v_pot numeric(24,6); v_skim numeric(24,6) := 0; v_distributable numeric(24,6) := 0; v_source_in numeric(24,6) := 0;
    v_sum_weights numeric(24,6) := 0; v_allocated numeric(24,6) := 0; v_pay numeric(24,6); v_balance_after numeric(24,6);
    v_total_supply numeric; v_new_total numeric; v_hard_cap numeric; v_top_bee uuid := NULL;
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
        SELECT total_supply, hard_cap INTO v_total_supply, v_hard_cap FROM public.bling_system_state WHERE id = 1 FOR UPDATE;
        FOR v_rec IN SELECT p.bee_id, COALESCE(sum(a.awarded),0)::numeric(24,6) AS due FROM public.competition_participants p
              LEFT JOIN public.competition_answers a ON a.competition_id=p.competition_id AND a.bee_id=p.bee_id AND a.is_correct=true AND a.forfeit_reason IS NULL
             WHERE p.competition_id=p_competition_id GROUP BY p.bee_id LOOP
            IF v_rec.due > 0 THEN
                v_new_total := v_total_supply + v_rec.due;
                IF v_new_total > v_hard_cap THEN RAISE EXCEPTION 'Source payout would exceed hard cap'; END IF;
                v_total_supply := v_new_total;
                PERFORM public.lot_credit(v_rec.bee_id, v_rec.due, 'competition', jsonb_build_object('competition_id',p_competition_id,'mode',v_comp.mode));
                SELECT bling_balance INTO v_balance_after FROM public.bees WHERE id=v_rec.bee_id;
                UPDATE public.competition_participants SET payout=v_rec.due WHERE competition_id=p_competition_id AND bee_id=v_rec.bee_id;
                INSERT INTO public.bling_transactions (bee_id,type,amount,balance_after,source_type,source_ref,memo)
                VALUES (v_rec.bee_id,'competition_source_reward',v_rec.due,v_balance_after,'competition_source_reward',p_competition_id,'Bee Games reward (Source-funded)');
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
                PERFORM public.lot_credit(v_rec.bee_id, v_pay, 'competition', jsonb_build_object('competition_id',p_competition_id,'mode',v_comp.mode));
                SELECT bling_balance INTO v_balance_after FROM public.bees WHERE id=v_rec.bee_id;
                UPDATE public.competition_participants SET payout=v_pay WHERE competition_id=p_competition_id AND bee_id=v_rec.bee_id;
                INSERT INTO public.bling_transactions (bee_id,type,amount,balance_after,source_type,source_ref,memo)
                VALUES (v_rec.bee_id,'competition_payout',v_pay,v_balance_after,'competition_payout',p_competition_id,'Bee Games prize-pool award');
            END LOOP;
            IF v_allocated <> v_distributable AND v_top_bee IS NOT NULL THEN
                v_pay := v_distributable - v_allocated;
                PERFORM public.lot_credit(v_top_bee, v_pay, 'competition', jsonb_build_object('competition_id',p_competition_id,'mode',v_comp.mode,'remainder',true));
                SELECT bling_balance INTO v_balance_after FROM public.bees WHERE id=v_top_bee;
                UPDATE public.competition_participants SET payout = payout + v_pay WHERE competition_id=p_competition_id AND bee_id=v_top_bee;
                INSERT INTO public.bling_transactions (bee_id,type,amount,balance_after,source_type,source_ref,memo)
                VALUES (v_top_bee,'competition_payout',v_pay,v_balance_after,'competition_payout',p_competition_id,'Bee Games prize-pool award (rounding remainder)');
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
