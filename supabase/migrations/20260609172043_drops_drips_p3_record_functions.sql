-- Drops/Drips piece 3 — the record functions (logic core).
-- floor-cap column; drip_legitimacy seam (1.0 now, real §5.2 heuristic swaps in later, paired w/ DingleBERRY);
-- record_drop (action yield, rank-mult snapshot, floor cap, idempotent) and record_drip (signal yield,
-- legitimacy x golden-ratio pairwise-decay x rank-mult, self-engagement guard, scope-keyed dedup).
-- Both SERVICE-ROLE ONLY: callable only from trusted server paths/triggers, never directly by users.

ALTER TABLE public.drops_action_weight ADD COLUMN daily_cap int;   -- NULL = uncapped
UPDATE public.drops_action_weight SET daily_cap = 20 WHERE is_floor;  -- interim floor cap, tunable

CREATE FUNCTION public.drip_legitimacy(p_engager_bee_id uuid)
 RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$ SELECT 1.0::numeric; $$;   -- §5.2 seam — real standing/flagged heuristic plugs in here (fast-follow w/ DingleBERRY)
REVOKE EXECUTE ON FUNCTION public.drip_legitimacy(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.drip_legitimacy(uuid) TO service_role;

CREATE FUNCTION public.record_drop(p_bee_id uuid, p_action text, p_source_ref uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE v_w numeric; v_floor boolean; v_cap int; v_mult numeric; v_level int;
        v_today date := (now() AT TIME ZONE 'UTC')::date; v_n int; v_share numeric; v_capped boolean := false; v_key text; v_rc int;
BEGIN
  SELECT weight,is_floor,daily_cap INTO v_w,v_floor,v_cap FROM public.drops_action_weight WHERE action=p_action;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','unknown_action'); END IF;
  SELECT COALESCE(bling_rank,1) INTO v_level FROM public.bees WHERE id=p_bee_id;
  IF v_level IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','unknown_bee'); END IF;
  v_level := LEAST(GREATEST(v_level,1),33);
  SELECT multiplier INTO v_mult FROM public.rank_multiplier WHERE rank_level=v_level; v_mult := COALESCE(v_mult,1.0);
  IF v_floor AND v_cap IS NOT NULL THEN
    SELECT count(*) INTO v_n FROM public.drops_ledger
      WHERE bee_id=p_bee_id AND action=p_action AND earned_on=v_today AND weighted_share>0;
    IF v_n >= v_cap THEN v_capped := true; END IF;
  END IF;
  v_share := CASE WHEN v_capped THEN 0 ELSE round(v_w*v_mult,4) END;
  v_key := 'drop:'||p_action||':'||p_bee_id::text||':'||COALESCE(p_source_ref::text,'none');
  INSERT INTO public.drops_ledger (bee_id,action,source_ref,weight,rank_multiplier,weighted_share,earned_on,dedup_key)
    VALUES (p_bee_id,p_action,p_source_ref,v_w,v_mult,v_share,v_today,v_key) ON CONFLICT (dedup_key) DO NOTHING;
  GET DIAGNOSTICS v_rc = ROW_COUNT;
  RETURN jsonb_build_object('ok',true,'recorded',v_rc=1,'weighted_share',v_share,'capped',v_capped,'rank_mult',v_mult);
END; $$;
REVOKE EXECUTE ON FUNCTION public.record_drop(uuid,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.record_drop(uuid,text,uuid) TO service_role;

CREATE FUNCTION public.record_drip(p_creator_bee_id uuid, p_signal text, p_engager_bee_id uuid, p_source_ref uuid)
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
    THEN 'drip:'||p_signal||':'||p_engager_bee_id::text||':'||COALESCE(p_source_ref::text,'none')
    ELSE 'drip:'||p_signal||':'||p_engager_bee_id::text||':'||COALESCE(p_source_ref::text,'none')||':'||v_today::text END;
  INSERT INTO public.drips_ledger (creator_bee_id,signal,engager_bee_id,source_ref,weight,rank_multiplier,legitimacy_factor,weighted_share,earned_on,dedup_key)
    VALUES (p_creator_bee_id,p_signal,p_engager_bee_id,p_source_ref,v_w,v_mult,v_lic,v_share,v_today,v_key) ON CONFLICT (dedup_key) DO NOTHING;
  GET DIAGNOSTICS v_rc = ROW_COUNT;
  RETURN jsonb_build_object('ok',true,'recorded',v_rc=1,'weighted_share',v_share,'decay',round(v_decay,4),'legitimacy',v_lic,'rank_mult',v_mult);
END; $$;
REVOKE EXECUTE ON FUNCTION public.record_drip(uuid,text,uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.record_drip(uuid,text,uuid,uuid) TO service_role;