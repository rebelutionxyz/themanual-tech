-- ROLLBACK for dingleberry_posture_schedule_v1 (DB37, 2026-08-08).
--
-- WRITTEN BEFORE THE APPLY, per the MIGRATION AMENDMENT.
--
-- NOTE -- THIS IS LONGER THAN THE ROLLBACK STATED IN THE DB37 DISPATCH, ON PURPOSE.
-- The dispatch says: unschedule the job, plus DROP whatever wrapper/internal
-- function the pass adds. That is incomplete and would leave production broken:
-- this pass moves the scan BODY into dingleberry_posture_scan_internal() and
-- rewrites the admin-gated public.dingleberry_posture_scan() into a thin caller.
-- Dropping the internal without restoring the original body leaves the gated RPC
-- referencing a function that no longer exists -- it would fail at runtime with
-- 42883 on the next admin scan.
--
-- So LEG 3 below restores public.dingleberry_posture_scan() to its exact
-- pre-DB37 definition, captured verbatim from pg_get_functiondef() during the
-- DB37 pre-flight. Verified: the only difference from the post-DB37 gated
-- wrapper is that this one carries the whole body inline.

BEGIN;

-- LEG 1 -- unschedule the job.
SELECT cron.unschedule('dingleberry_posture_daily');

-- LEG 3 (run BEFORE the drop, so the gated RPC is never left dangling) --
-- restore the original self-contained scan.
CREATE OR REPLACE FUNCTION public.dingleberry_posture_scan()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_run      uuid;
  v_new      int := 0;
  v_resolved int := 0;
  v_open     int := 0;
  v_checks   CONSTANT int := 10;
  v_by_sev   jsonb;
  v_by_astra jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.dingleberry_posture_runs (run_by)
  VALUES (auth.uid())
  RETURNING id INTO v_run;

  WITH found AS (
    SELECT * FROM public.dingleberry_posture_checks()
  ),
  upserted AS (
    INSERT INTO public.dingleberry_posture_findings AS f
      (run_id, astra, check_code, severity, object_schema, object_name, object_type, detail,
       status, first_seen, last_seen)
    SELECT v_run, public.dingleberry_astra_of(n.object_name), n.check_code, n.severity,
           n.object_schema, n.object_name, n.object_type, n.detail,
           'open', now(), now()
      FROM found n
    ON CONFLICT (check_code, object_schema, object_name) DO UPDATE
      SET run_id      = EXCLUDED.run_id,
          last_seen   = now(),
          astra       = CASE WHEN f.status = 'accepted' THEN f.astra       ELSE EXCLUDED.astra       END,
          severity    = CASE WHEN f.status = 'accepted' THEN f.severity    ELSE EXCLUDED.severity    END,
          object_type = CASE WHEN f.status = 'accepted' THEN f.object_type ELSE EXCLUDED.object_type END,
          detail      = CASE WHEN f.status = 'accepted' THEN f.detail      ELSE EXCLUDED.detail      END,
          status      = CASE WHEN f.status = 'accepted' THEN 'accepted'    ELSE 'open'               END,
          resolved_at = CASE WHEN f.status = 'accepted' THEN f.resolved_at ELSE NULL                 END
    RETURNING (xmax = 0) AS was_insert
  )
  SELECT count(*) FILTER (WHERE was_insert) INTO v_new FROM upserted;

  UPDATE public.dingleberry_posture_findings
     SET status = 'resolved', resolved_at = now()
   WHERE status = 'open' AND run_id IS DISTINCT FROM v_run;
  GET DIAGNOSTICS v_resolved = ROW_COUNT;

  SELECT count(*) INTO v_open
    FROM public.dingleberry_posture_findings WHERE status = 'open';

  SELECT COALESCE(jsonb_object_agg(s.severity, s.n), '{}'::jsonb) INTO v_by_sev
    FROM (SELECT severity, count(*) AS n FROM public.dingleberry_posture_findings
           WHERE status = 'open' GROUP BY severity) s;

  SELECT COALESCE(jsonb_object_agg(a.astra, a.n), '{}'::jsonb) INTO v_by_astra
    FROM (SELECT astra, count(*) AS n FROM public.dingleberry_posture_findings
           WHERE status = 'open' GROUP BY astra) a;

  UPDATE public.dingleberry_posture_runs
     SET finished_at = now(), checks_run = v_checks, findings_open = v_open
   WHERE id = v_run;

  RETURN jsonb_build_object(
    'run_id',      v_run,
    'checks_run',  v_checks,
    'open',        v_open,
    'new',         v_new,
    'resolved',    v_resolved,
    'by_severity', v_by_sev,
    'by_astra',    v_by_astra);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.dingleberry_posture_scan() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.dingleberry_posture_scan() TO authenticated, service_role;

-- LEG 2 -- drop what this pass added.
DROP FUNCTION IF EXISTS public.dingleberry_posture_scan_cron();
DROP FUNCTION IF EXISTS public.dingleberry_posture_retention(integer);
DROP FUNCTION IF EXISTS public.dingleberry_posture_scan_internal(uuid);

COMMIT;

-- NOT ROLLED BACK, and cannot be: any rows the retention leg deleted. Retention
-- is a DELETE of runs and resolved findings older than 90 days. If the job has
-- run before this rollback, those rows are gone. Restore from a dump if they
-- matter. Open and accepted findings are never deleted by design, so nothing
-- actionable is lost.
