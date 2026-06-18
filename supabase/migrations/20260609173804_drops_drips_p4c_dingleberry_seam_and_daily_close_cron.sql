-- Drops/Drips piece 4c — DingleBERRY withhold seam + daily-close orchestrator + cron.
-- dingleberry_withhold: marks flagged shares 'withheld' before convert (no-op until DingleBERRY lands).
-- run_daily_close(date=yesterday): withhold -> distribute_drops -> distribute_drips.
-- cron: 00:30 UTC daily, closes the day that just ended. Service-role only; idempotent by job name.

CREATE FUNCTION public.dingleberry_withhold(p_date date)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
BEGIN
  -- DingleBERRY (when active) marks ring/cluster/velocity-flagged pending rows status='withheld' here,
  -- caught in the earn->convert window so no BLiNG! ever leaves. Currently nothing flagged.
  RETURN jsonb_build_object('ok',true,'date',p_date,'withheld',0,'note','DingleBERRY inactive');
END; $$;
REVOKE EXECUTE ON FUNCTION public.dingleberry_withhold(date) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.dingleberry_withhold(date) TO service_role;

CREATE FUNCTION public.run_daily_close(p_date date DEFAULT (now() AT TIME ZONE 'UTC' - interval '1 day')::date)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE v_db jsonb; v_drops jsonb; v_drips jsonb;
BEGIN
  v_db    := public.dingleberry_withhold(p_date);
  v_drops := public.distribute_drops(p_date);
  v_drips := public.distribute_drips(p_date);
  RETURN jsonb_build_object('date',p_date,'dingleberry',v_db,'drops',v_drops,'drips',v_drips);
END; $$;
REVOKE EXECUTE ON FUNCTION public.run_daily_close(date) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.run_daily_close(date) TO service_role;

SELECT cron.schedule('drops-drips-daily-close','30 0 * * *',$$SELECT public.run_daily_close();$$);