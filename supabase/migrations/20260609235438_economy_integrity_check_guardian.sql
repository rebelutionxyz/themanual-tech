-- Economy integrity guardian. Hard-asserts the jar system's guaranteed invariant: the cache (sum of bee
-- bling_balance) equals the sum of active lots, globally and per-bee, with no invalid lots. This is the
-- corruption detector for the DNA jar substrate — any function that writes balance without a matching jar
-- (or vice versa) trips it. Also returns an informational supply dashboard. NOTE: total_supply counts only
-- BLiNG! freed from the Well; operations_funds (the pre-seeded ops endowment) sits OUTSIDE total_supply, so
-- circulating = well_freed + ops_disbursed. Read-only; admin/service only. Wire to cron for ongoing monitoring.
CREATE OR REPLACE FUNCTION public.economy_integrity_check()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE
  v_supply numeric; v_lots numeric; v_cache numeric; v_held numeric; v_deficit numeric;
  v_pool_comp numeric; v_pool_escrow numeric; v_pool_pots numeric; v_ops numeric;
  v_cache_drift int; v_bad_lots int; v_circulating numeric;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'economy_integrity_check is service-role / admin only';
  END IF;
  SELECT total_supply INTO v_supply FROM public.bling_system_state WHERE id=1;
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

  RETURN jsonb_build_object(
    'ok', (v_cache = v_lots) AND v_cache_drift = 0 AND v_bad_lots = 0,
    'cache_invariant', jsonb_build_object(
      'sum_bee_balances', v_cache, 'sum_active_lots', v_lots,
      'match', v_cache = v_lots, 'bees_with_drift', v_cache_drift, 'invalid_lots', v_bad_lots),
    'supply_dashboard', jsonb_build_object(
      'total_supply_freed_from_well', v_supply,
      'circulating', v_circulating,
      'circulating_breakdown', jsonb_build_object('active_lots', v_lots, 'held', v_held,
        'pooled_competitions', v_pool_comp, 'pooled_escrows', v_pool_escrow, 'pooled_pots', v_pool_pots, 'less_deficit', v_deficit),
      'operations_funds_remaining', v_ops,
      'note', 'circulating = well_freed + ops_disbursed; ops endowment sits outside total_supply'),
    'checked_at', now());
END; $function$;

REVOKE EXECUTE ON FUNCTION public.economy_integrity_check() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.economy_integrity_check() TO authenticated, service_role;
