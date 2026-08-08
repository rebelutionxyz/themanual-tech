-- DB37 -- PUT THE POSTURE SCAN ON A SCHEDULE
--
-- DB32 built dingleberry_posture_scan() and ran it once. A scan that runs once is
-- a snapshot, not a control. This file makes it daily.
--
-- ROLLBACK: supabase/migrations/_drafts/
--           20260808210000_dingleberry_posture_schedule_v1_rollback.sql
--           Written first. It is DELIBERATELY LONGER than the rollback stated in
--           the dispatch -- see its header. Dropping the internal function without
--           restoring the original scan body would leave the gated RPC dangling.
--
-- ============================================================================
-- HOW THE NO-JWT PROBLEM IS SOLVED: split, not weaken.
-- ============================================================================
-- dingleberry_posture_scan() is SECURITY DEFINER and gates on
-- public.is_platform_admin(), which resolves auth.uid(). A pg_cron job has no
-- JWT, so auth.uid() is NULL and the gate correctly refuses it.
--
-- The dispatch offered two shapes. This file takes the SECOND: the scan body
-- moves into public.dingleberry_posture_scan_internal(p_run_by uuid), and BOTH
-- callers go through it --
--
--   dingleberry_posture_scan()      admin-gated, unchanged gate, passes auth.uid()
--   dingleberry_posture_scan_cron() no gate, never granted to a client role,
--                                   passes NULL, callable only by postgres/service_role
--
-- Chosen over a service-role-only wrapper because a wrapper duplicates a 60-line
-- body, and two copies of a security scan drift. The gate is not weakened,
-- softened, or bypassed -- it stays exactly where it was, on exactly the function
-- clients call.
--
-- run_by is nullable with no FK (verified in pre-flight), so a cron run records
-- run_by = NULL, which is the honest value: nobody ran it, the schedule did.
--
-- ============================================================================
-- EXECUTE GRANTS: read proacl back, do not trust the REVOKE.
-- ============================================================================
-- This project has ALTER DEFAULT PRIVILEGES handing anon and authenticated their
-- own ROLE-LEVEL EXECUTE on new functions in public. REVOKE ... FROM PUBLIC does
-- NOT remove a role-level grant (DB33's finding, institutionalized into DB32's
-- P05/P06). Both new functions therefore revoke from PUBLIC *and* from anon and
-- authenticated by name, and the pass verifies by reading pg_proc.proacl back
-- rather than by assuming the revoke worked.
--
-- ============================================================================
-- SCHEDULE: 08:20 UTC daily, job name dingleberry_posture_daily.
-- ============================================================================
-- 08:20 UTC = 04:20 ET / 01:20 PT -- the genuine traffic trough for a US-centric
-- platform. Existing daily jobs sit at 00:30 (drops-drips), 01:00 (economy
-- integrity) and 09:00 (affiliate release), so this collides with none of them.
-- The :20 offset keeps it off the top of the hour, where press-tick (*/15),
-- comms-disappear (*/5) and comms-stale-room (*/30) all coincide.
--
-- ============================================================================
-- RETENTION: inside the same job. One job, not two.
-- ============================================================================
-- The dispatch left this to the pass. One job, because retention should prune
-- against the freshest scan result and because one schedule is one thing to
-- reason about and one thing to unschedule.
--
-- ORDER IS LOAD-BEARING. dingleberry_posture_findings.run_id is a FOREIGN KEY to
-- dingleberry_posture_runs(id) with NO ON DELETE action (verified in pre-flight),
-- so deleting a run that any surviving finding still points at raises 23503.
-- Retention therefore deletes resolved findings FIRST, then deletes only those
-- old runs that no surviving finding references (NOT EXISTS guard).
--
-- OPEN AND ACCEPTED FINDINGS ARE NEVER DELETED. Open findings have their run_id
-- refreshed by every scan, so they never pin an old run. An ACCEPTED finding that
-- the checks no longer detect keeps its old run_id forever -- the NOT EXISTS guard
-- deliberately keeps that run alive rather than orphaning the acceptance record.

BEGIN;

-- ============================================================================
-- 1. THE INTERNAL SCAN -- the DB32 body verbatim, minus the gate, plus a caller arg.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.dingleberry_posture_scan_internal(p_run_by uuid DEFAULT NULL)
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
  INSERT INTO public.dingleberry_posture_runs (run_by)
  VALUES (p_run_by)
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

REVOKE EXECUTE ON FUNCTION public.dingleberry_posture_scan_internal(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.dingleberry_posture_scan_internal(uuid) TO service_role;

-- ============================================================================
-- 2. THE GATED RPC -- same gate, same name, same signature, same grants. Body is
--    now one line. Clients cannot tell the difference.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.dingleberry_posture_scan()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN public.dingleberry_posture_scan_internal(auth.uid());
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.dingleberry_posture_scan() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.dingleberry_posture_scan() TO authenticated, service_role;

-- ============================================================================
-- 3. RETENTION -- 90 days. Open and accepted survive forever.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.dingleberry_posture_retention(p_days integer DEFAULT 90)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_cutoff        timestamptz := now() - make_interval(days => p_days);
  v_findings_gone int := 0;
  v_runs_gone     int := 0;
BEGIN
  -- Resolved findings only. status='open' and status='accepted' are untouchable.
  DELETE FROM public.dingleberry_posture_findings
   WHERE status = 'resolved'
     AND resolved_at IS NOT NULL
     AND resolved_at < v_cutoff;
  GET DIAGNOSTICS v_findings_gone = ROW_COUNT;

  -- Runs second, and only those nothing points at. The FK has no ON DELETE, so
  -- an unguarded delete here raises 23503 the moment one accepted finding still
  -- references an old run.
  DELETE FROM public.dingleberry_posture_runs r
   WHERE r.started_at < v_cutoff
     AND NOT EXISTS (SELECT 1 FROM public.dingleberry_posture_findings f
                      WHERE f.run_id = r.id);
  GET DIAGNOSTICS v_runs_gone = ROW_COUNT;

  RETURN jsonb_build_object(
    'cutoff',           v_cutoff,
    'findings_deleted', v_findings_gone,
    'runs_deleted',     v_runs_gone);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.dingleberry_posture_retention(integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.dingleberry_posture_retention(integer) TO service_role;

-- ============================================================================
-- 4. THE CRON ENTRY POINT -- scan, then prune. What the job actually calls.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.dingleberry_posture_scan_cron()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_scan      jsonb;
  v_retention jsonb;
BEGIN
  v_scan      := public.dingleberry_posture_scan_internal(NULL);
  v_retention := public.dingleberry_posture_retention(90);
  RETURN jsonb_build_object('scan', v_scan, 'retention', v_retention);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.dingleberry_posture_scan_cron() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.dingleberry_posture_scan_cron() TO service_role;

COMMIT;

-- ============================================================================
-- 5. THE SCHEDULE -- outside the transaction; cron.schedule commits its own row.
-- ============================================================================
SELECT cron.schedule('dingleberry_posture_daily', '20 8 * * *',
                     'SELECT public.dingleberry_posture_scan_cron();');
