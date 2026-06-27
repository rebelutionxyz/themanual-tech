-- Affiliate hold layer, piece 2: affiliate_distribute now credits HELD lots, not spendable balance.
-- Same freeing-from-Well, same 5/3/2/1/1 cascade, same empty-slot→treasury residual, same idempotency
-- (now keyed on affiliate_holds.source_ref). Credits land in bees.bling_held + an affiliate_holds lot
-- with a 60-day releases_at. No bling_transactions row at distribute — that posts at maturation, so the
-- spendable ledger's balance_after never lies. No fiat conversion anywhere.
CREATE OR REPLACE FUNCTION public.affiliate_distribute(p_earner_bee_id uuid, p_pool_amount numeric, p_trigger text, p_source_ref uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
    v_free boolean; v_total numeric; v_cap numeric;
    v_l1 uuid; v_l2 uuid; v_l3 uuid; v_l4 uuid; v_l5 uuid;
    v_treasury uuid; v_paid jsonb := '[]'::jsonb;
    v_to_uplines numeric := 0; v_treasury_share numeric;
    r record; v_share numeric; v_releases timestamptz;
BEGIN
    IF p_pool_amount <= 0 THEN RAISE EXCEPTION 'pool must be positive'; END IF;

    PERFORM 1 FROM public.affiliate_holds WHERE source_ref = p_source_ref LIMIT 1;
    IF FOUND THEN RAISE EXCEPTION 'cascade already distributed for event %', p_source_ref; END IF;

    SELECT id INTO v_treasury FROM public.bees WHERE handle='combtreasury';
    IF v_treasury IS NULL THEN RAISE EXCEPTION 'combtreasury bee missing'; END IF;

    SELECT free_active,total_supply,hard_cap INTO v_free,v_total,v_cap
      FROM public.bling_system_state WHERE id=1 FOR UPDATE;
    IF NOT v_free THEN RAISE EXCEPTION 'FREE issuance paused'; END IF;
    IF v_total + p_pool_amount > v_cap THEN RAISE EXCEPTION 'pool would exceed hard cap'; END IF;
    UPDATE public.bling_system_state SET total_supply = v_total + p_pool_amount WHERE id=1;

    SELECT l1_sponsor_id,l2_pathfinder_id,l3_navigator_id,l4_pioneer_id,l5_origin_id
      INTO v_l1,v_l2,v_l3,v_l4,v_l5
      FROM public.bee_affiliate_chain WHERE bee_id=p_earner_bee_id;

    v_releases := now() + interval '60 days';

    FOR r IN
      SELECT 1 tier, v_l1 up, 5::numeric w
      UNION ALL SELECT 2, v_l2, 3
      UNION ALL SELECT 3, v_l3, 2
      UNION ALL SELECT 4, v_l4, 1
      UNION ALL SELECT 5, v_l5, 1
      ORDER BY tier
    LOOP
      CONTINUE WHEN r.up IS NULL;
      v_share := round(p_pool_amount * r.w / 12.0, 6);
      CONTINUE WHEN v_share <= 0;
      UPDATE public.bees SET bling_held = bling_held + v_share WHERE id=r.up;
      INSERT INTO public.affiliate_holds (bee_id,amount,tier,trigger,source_ref,releases_at)
        VALUES (r.up, v_share, 'l'||r.tier, p_trigger, p_source_ref, v_releases);
      v_to_uplines := v_to_uplines + v_share;
      v_paid := v_paid || jsonb_build_object('tier',r.tier,'bee',r.up,'amount',v_share,'held_until',v_releases);
    END LOOP;

    v_treasury_share := p_pool_amount - v_to_uplines;
    IF v_treasury_share > 0 THEN
      UPDATE public.bees SET bling_held = bling_held + v_treasury_share WHERE id=v_treasury;
      INSERT INTO public.affiliate_holds (bee_id,amount,tier,trigger,source_ref,releases_at)
        VALUES (v_treasury, v_treasury_share, 'treasury', p_trigger, p_source_ref, v_releases);
    END IF;

    RETURN jsonb_build_object('ok',true,'pool',p_pool_amount,'to_uplines_held',v_to_uplines,
              'to_treasury_held',v_treasury_share,'releases_at',v_releases,'paid',v_paid,
              'well_remaining',v_cap-(v_total+p_pool_amount));
END; $function$;

REVOKE EXECUTE ON FUNCTION public.affiliate_distribute(uuid,numeric,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.affiliate_distribute(uuid,numeric,text,uuid) TO service_role;