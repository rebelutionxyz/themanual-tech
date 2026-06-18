-- DNA D2 Affiliate (maturation half): affiliate_release_matured moves a hold from bling_held -> spendable.
-- The held leg stays (pre-lot staging, Call 3); the spendable leg becomes lot_credit(origin 'affiliate', {tier, source_ref})
-- — a jar born at the 60-day maturation. Supply-neutral; bling_transactions + hold->released preserved.
-- NOTE: affiliate_clawback is intentionally NOT included here — its deficit-tolerant 'released' branch needs a
-- deficit-handling policy decision (bling_lots forbids negative amounts), tracked separately. Not launch-blocking.
CREATE OR REPLACE FUNCTION public.affiliate_release_matured()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public' AS $function$
DECLARE r record; v_count int := 0; v_total numeric := 0; v_bal numeric;
BEGIN
  FOR r IN SELECT id, bee_id, amount, tier, source_ref FROM public.affiliate_holds
    WHERE status='held' AND releases_at <= now() ORDER BY releases_at, id FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.bees SET bling_held = bling_held - r.amount WHERE id = r.bee_id;
    PERFORM public.lot_credit(r.bee_id, r.amount, 'affiliate', jsonb_build_object('tier',r.tier,'source_ref',r.source_ref));
    SELECT bling_balance INTO v_bal FROM public.bees WHERE id = r.bee_id;
    INSERT INTO public.bling_transactions (bee_id,type,amount,balance_after,counterparty_bee_id,category,source_type,source_ref,memo)
    VALUES (r.bee_id,'affiliate',r.amount,v_bal,NULL,'affiliate_'||r.tier||'_released','affiliate',r.source_ref,'Affiliate '||r.tier||' matured — 60-day hold released');
    UPDATE public.affiliate_holds SET status='released' WHERE id = r.id;
    v_count := v_count + 1; v_total := v_total + r.amount;
  END LOOP;
  RETURN jsonb_build_object('ok',true,'released_lots',v_count,'released_amount',v_total);
END; $function$;
