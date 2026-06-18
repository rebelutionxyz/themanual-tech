-- APPLIED to prod 2026-06-17 via Supabase MCP (apply_migration). PARITY file.
-- Owner-scoped read RPC for the Lineage surface. The chain is owner-read only,
-- so downline keeper-counts need a SECURITY DEFINER reverse-lookup. Returns the
-- caller's downline per level, own upline handles, lineage size, and affiliate
-- BLiNG! freed (held+matured). Economy numerics ::text (2^53 wire discipline).
CREATE OR REPLACE FUNCTION public.affiliate_lineage()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public'
AS $fn$
DECLARE
  v_me uuid := auth.uid();
  v_l1 int; v_l2 int; v_l3 int; v_l4 int; v_l5 int;
  v_freed numeric(24,6);
  v_up1 text; v_up2 text; v_up3 text; v_up4 text; v_up5 text;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  SELECT
    count(*) FILTER (WHERE l1_sponsor_id    = v_me),
    count(*) FILTER (WHERE l2_pathfinder_id = v_me),
    count(*) FILTER (WHERE l3_navigator_id  = v_me),
    count(*) FILTER (WHERE l4_pioneer_id    = v_me),
    count(*) FILTER (WHERE l5_origin_id     = v_me)
  INTO v_l1, v_l2, v_l3, v_l4, v_l5
  FROM public.bee_affiliate_chain;
  SELECT
    (SELECT handle FROM public.bees WHERE id = c.l1_sponsor_id),
    (SELECT handle FROM public.bees WHERE id = c.l2_pathfinder_id),
    (SELECT handle FROM public.bees WHERE id = c.l3_navigator_id),
    (SELECT handle FROM public.bees WHERE id = c.l4_pioneer_id),
    (SELECT handle FROM public.bees WHERE id = c.l5_origin_id)
  INTO v_up1, v_up2, v_up3, v_up4, v_up5
  FROM public.bee_affiliate_chain c WHERE c.bee_id = v_me;
  SELECT COALESCE(sum(amount),0) INTO v_freed
  FROM public.affiliate_holds
  WHERE bee_id = v_me AND status IN ('held','released');
  RETURN jsonb_build_object(
    'lineage_size', v_l1 + v_l2 + v_l3 + v_l4 + v_l5,
    'freed_total',  v_freed::text,
    'levels', jsonb_build_array(
      jsonb_build_object('level',1,'downline',v_l1,'upline_handle',v_up1),
      jsonb_build_object('level',2,'downline',v_l2,'upline_handle',v_up2),
      jsonb_build_object('level',3,'downline',v_l3,'upline_handle',v_up3),
      jsonb_build_object('level',4,'downline',v_l4,'upline_handle',v_up4),
      jsonb_build_object('level',5,'downline',v_l5,'upline_handle',v_up5)
    )
  );
END;
$fn$;
REVOKE ALL ON FUNCTION public.affiliate_lineage() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.affiliate_lineage() TO authenticated;
