-- DB41 -- STALE CLAIM DETECTION: a dead lock should not look like work.
-- Rollback: supabase/migrations/_drafts/20260809002940_db41_stale_claim_detection_v1_rollback.sql
--           (written BEFORE this migration, per the MIGRATION AMENDMENT)
--
-- WHY. On 2026-08-08 three passes (DB38, DB39, DB40) sat 'claimed' by sessions that
-- had ended. DB40 lost its API connection mid-flight; DB38 and DB39 filed question
-- reports and died waiting on rulings. Those claims were dead locks, not work. They
-- blocked SWEEP1's board-quiet gate and made the board read busy while nothing ran.
-- The owner had to notice by eye. Nothing in the rail detected it. This fixes that.
--
-- THE DESIGN CONSTRAINT, STATED ONCE SO IT IS NOT LOST: a FALSE POSITIVE IS WORSE
-- THAN A STUCK LOCK. Releasing a genuinely mid-flight pass puts two terminals on the
-- same work, the same tree and the same database. So:
--   * the primary mechanism is a HEARTBEAT, not a timer. A pass that is thinking hard
--     for 40 minutes and says so is never stale.
--   * the view FLAGS. It never mutates anything.
--   * release is an explicit admin call that REQUIRES a written reason and leaves the
--     reason on the row.
--   * auto-release exists but is off by default, needs an explicit boolean, and only
--     fires at 3x the threshold -- a bar no genuine pass in the recorded history has
--     ever crossed (see MEASUREMENT below).
--
-- MEASUREMENT (public.ops_pass_durations, 2026-08-09, n=201 rows, 168 not flagged
-- suspect; 'suspect' = a -Q question was filed or the pass closed in under 2 minutes,
-- neither of which is a real work duration). Minutes from claimed_at to first report:
--     min 2.3 | p50 11.4 | p90 29.9 | p95 48.9 | p99 120.0 | max 227.2 | mean 17.6
-- THRESHOLD CHOSEN: 120 minutes.
--   * 2.45x p95, and exactly p99 -- only 2 of 168 clean passes (FRONT21 at 227.2 and
--     OPS15 at 216.8) ever ran longer, i.e. ~1.2%. Both would merely be FLAGGED, and
--     both would have been spared entirely had they heartbeat once.
--   * the auto-release bar, 3x = 360 minutes, sits ABOVE the all-time maximum clean
--     duration of 227.2. So auto-release would not have fired on a single genuine pass
--     in the entire recorded history of the rail. That is the property that makes the
--     optional automation defensible at all.
--   * the sample is large enough to be meaningful (168 clean observations across four
--     lanes and four effort tags), so this is a measured number, not a guessed one.
-- The threshold lives in ONE place, public.ops_stale_threshold_minutes(), so revising
-- it after real traffic is a one-function change, not a hunt through view bodies.
--
-- NOT IN THIS PASS, deliberately, per the dispatch: no cron wiring. Detection first,
-- automation later, once the threshold has been watched against real traffic.

BEGIN;

-- ===========================================================================
-- 1. THE COLUMN
--    Nullable, no default -- so this is a catalog-only change: no table rewrite,
--    no existing row touched. Staleness falls back to claimed_at when a terminal
--    has never called the heartbeat, which is exactly the pre-DB41 behaviour.
-- ===========================================================================
ALTER TABLE public.ops_dispatches ADD COLUMN IF NOT EXISTS heartbeat_at timestamptz;

COMMENT ON COLUMN public.ops_dispatches.heartbeat_at IS
  'Last liveness ping from the session holding this claim, set by ops_claim_heartbeat(). '
  'NULL means the holder has never pinged, and staleness then measures from claimed_at. '
  'Cleared on release so a re-queued row cannot inherit a stale ping.';

-- ===========================================================================
-- 2. THE THRESHOLD -- single source of truth for the view and both RPCs.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.ops_stale_threshold_minutes()
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  -- 120 min = p99 of 168 clean pass durations, 2.45x p95. See the migration header.
  SELECT 120;
$function$;

COMMENT ON FUNCTION public.ops_stale_threshold_minutes() IS
  'Minutes of silence after which a claimed dispatch is FLAGGED stale. Measured, not guessed: '
  'p99 of 168 clean pass durations (p95 48.9, max 227.2). Auto-release fires only at 3x this.';

REVOKE ALL ON FUNCTION public.ops_stale_threshold_minutes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ops_stale_threshold_minutes() TO authenticated, service_role;

-- ===========================================================================
-- 3. THE GATE
--    is_platform_admin() is auth.uid()-based, so it is FALSE on a direct database
--    connection -- which is how the lead and every terminal actually reach the rail.
--    Gating on it alone would lock out the only people who need these RPCs. So the
--    gate admits three identities and refuses everything else:
--      a) a direct DB connection (no request.jwt.claims) -- the rail itself. Anyone
--         holding those credentials can UPDATE ops_dispatches by hand anyway, so
--         refusing them here would buy nothing.
--      b) service_role -- the server-side identity, same argument.
--      c) an admin Bee through PostgREST, via is_platform_admin().
--    A plain authenticated Bee and anon are REFUSED. That is the case that matters.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.ops_is_rail_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_claims text;
BEGIN
  v_claims := nullif(current_setting('request.jwt.claims', true), '');
  IF v_claims IS NULL THEN
    RETURN true;                                        -- (a) direct DB connection
  END IF;
  IF coalesce(v_claims::json ->> 'role', '') = 'service_role' THEN
    RETURN true;                                        -- (b) server-side identity
  END IF;
  RETURN public.is_platform_admin();                    -- (c) admin Bee, else false
EXCEPTION WHEN others THEN
  -- Malformed claims must not become an open door. Fail closed.
  RETURN public.is_platform_admin();
END
$function$;

COMMENT ON FUNCTION public.ops_is_rail_admin() IS
  'Authorization gate for the stale-claim RPCs: true for a direct DB connection, for '
  'service_role, or for an admin Bee. False for anon and for a non-admin authenticated Bee.';

REVOKE ALL ON FUNCTION public.ops_is_rail_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ops_is_rail_admin() TO authenticated, service_role;

-- ===========================================================================
-- 4. THE HEARTBEAT -- the real fix.
--    A terminal calls this every few minutes and after each significant step.
--    p_session is OPTIONAL but recommended: pass the same id R2 wrote to claimed_by
--    and the call refuses to ping a pass someone else holds.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.ops_claim_heartbeat(p_pass text, p_session text DEFAULT NULL)
 RETURNS timestamptz
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_status  text;
  v_holder  text;
  v_beat    timestamptz;
BEGIN
  IF p_pass IS NULL OR btrim(p_pass) = '' THEN
    RAISE EXCEPTION 'ops_claim_heartbeat: p_pass is required';
  END IF;

  SELECT status, claimed_by INTO v_status, v_holder
    FROM public.ops_dispatches WHERE pass = p_pass;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ops_claim_heartbeat: no dispatch with pass %', p_pass;
  END IF;
  IF v_status IS DISTINCT FROM 'claimed' THEN
    RAISE EXCEPTION 'ops_claim_heartbeat: pass % is %, not claimed', p_pass, v_status;
  END IF;
  IF p_session IS NOT NULL AND v_holder IS DISTINCT FROM p_session THEN
    RAISE EXCEPTION 'ops_claim_heartbeat: pass % is held by %, not %',
      p_pass, coalesce(v_holder, '(null)'), p_session;
  END IF;

  UPDATE public.ops_dispatches
     SET heartbeat_at = now()
   WHERE pass = p_pass AND status = 'claimed'
  RETURNING heartbeat_at INTO v_beat;

  RETURN v_beat;
END
$function$;

COMMENT ON FUNCTION public.ops_claim_heartbeat(text, text) IS
  'Liveness ping from the session holding a claimed pass. Call every few minutes and after '
  'each significant step; a heartbeating pass is never flagged stale. Pass p_session to refuse '
  'pinging a claim you do not hold.';

REVOKE ALL ON FUNCTION public.ops_claim_heartbeat(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ops_claim_heartbeat(text, text) TO service_role;

-- ===========================================================================
-- 5. THE VIEW -- flags, never mutates.
--    security_invoker=true + SELECT to authenticated means the ops_dispatches RLS
--    policy (ops_dispatches_admin_read, USING is_platform_admin()) does the gating,
--    matching every other ops_* view. Admin-read only, by construction.
--
--    Silence measures from greatest(heartbeat, claimed_at): a heartbeat left behind
--    by an earlier claim can therefore never make a freshly claimed row look stale.
-- ===========================================================================
CREATE OR REPLACE VIEW public.ops_stale_claims
WITH (security_invoker = true) AS
WITH t AS (SELECT public.ops_stale_threshold_minutes() AS mins),
     r AS (
       SELECT regexp_replace(pass, '-Q$', '') AS base_pass,
              bool_or(pass NOT LIKE '%-Q')    AS report_exists,
              bool_or(pass LIKE '%-Q')        AS question_filed
         FROM public.ops_reports
        GROUP BY regexp_replace(pass, '-Q$', '')
     )
SELECT d.pass,
       d.lane,
       d.title,
       d.claimed_by,
       d.claimed_at,
       d.heartbeat_at,
       round(EXTRACT(epoch FROM now() - greatest(coalesce(d.heartbeat_at, d.claimed_at), d.claimed_at)) / 60.0, 1)
         AS minutes_silent,
       t.mins AS threshold_minutes,
       coalesce(r.report_exists, false)  AS report_exists,
       coalesce(r.question_filed, false) AS question_filed,
       CASE
         WHEN coalesce(r.question_filed, false)
           THEN 'AWAITING RULING - a -Q report is filed. Answer it. Do NOT release blind.'
         WHEN coalesce(r.report_exists, false)
           THEN 'REPORT FILED, DISPATCH STILL OPEN - R3 half-ran. Close it, do not re-run the work.'
         WHEN EXTRACT(epoch FROM now() - greatest(coalesce(d.heartbeat_at, d.claimed_at), d.claimed_at)) / 60.0
              >= 3 * t.mins
           THEN 'RELEASE CANDIDATE - silent past 3x threshold, no report. Confirm the window is dead, then release with a reason.'
         ELSE 'INVESTIGATE - past threshold with no heartbeat. Ask the window before touching it.'
       END AS suggested_action
  FROM public.ops_dispatches d
 CROSS JOIN t
  LEFT JOIN r ON r.base_pass = d.pass
 WHERE d.status = 'claimed'
   AND d.claimed_at IS NOT NULL
   AND EXTRACT(epoch FROM now() - greatest(coalesce(d.heartbeat_at, d.claimed_at), d.claimed_at)) / 60.0
       >= t.mins;

COMMENT ON VIEW public.ops_stale_claims IS
  'Claimed dispatches silent past ops_stale_threshold_minutes(). Read-only flagging surface; '
  'admin-gated through the ops_dispatches RLS policy via security_invoker. Presence here is a '
  'SUSPICION, not a verdict -- suggested_action says what to check first.';

REVOKE ALL ON public.ops_stale_claims FROM PUBLIC;
GRANT SELECT ON public.ops_stale_claims TO authenticated, service_role;

-- ===========================================================================
-- 6. THE RELEASE -- explicit, admin-gated, reason mandatory, self-documenting.
--    The note appended to body is the same shape the lead wrote by hand on
--    2026-08-08. The row carries its own history; nothing is released silently.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.ops_release_stale_claim(p_pass text, p_reason text)
 RETURNS TABLE (pass text, lane text, was_claimed_by text, minutes_silent numeric, note text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_holder text;
  v_status text;
  v_silent numeric;
  v_note   text;
BEGIN
  IF NOT public.ops_is_rail_admin() THEN
    RAISE EXCEPTION 'ops_release_stale_claim: admin only';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'ops_release_stale_claim: a non-empty reason is required';
  END IF;

  SELECT d.status, d.claimed_by,
         round(EXTRACT(epoch FROM now() - greatest(coalesce(d.heartbeat_at, d.claimed_at), d.claimed_at)) / 60.0, 1)
    INTO v_status, v_holder, v_silent
    FROM public.ops_dispatches d WHERE d.pass = p_pass;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ops_release_stale_claim: no dispatch with pass %', p_pass;
  END IF;
  IF v_status IS DISTINCT FROM 'claimed' THEN
    RAISE EXCEPTION 'ops_release_stale_claim: pass % is %, not claimed', p_pass, v_status;
  END IF;

  v_note := format(
    E'\n\n[RAIL %s] CLAIM RELEASED by ops_release_stale_claim. Held by %s, silent %s min (threshold %s). Reason: %s',
    to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC',
    coalesce(v_holder, '(no session id)'),
    v_silent,
    public.ops_stale_threshold_minutes(),
    btrim(p_reason));

  UPDATE public.ops_dispatches d
     SET status       = 'queued',
         claimed_by   = NULL,
         claimed_at   = NULL,
         heartbeat_at = NULL,
         body         = d.body || v_note
   WHERE d.pass = p_pass AND d.status = 'claimed';

  IF NOT FOUND THEN
    -- Someone closed or re-claimed it between the read and the write.
    RAISE EXCEPTION 'ops_release_stale_claim: pass % changed under us, nothing released', p_pass;
  END IF;

  RETURN QUERY SELECT p_pass, d.lane, v_holder, v_silent, v_note
                 FROM public.ops_dispatches d WHERE d.pass = p_pass;
END
$function$;

COMMENT ON FUNCTION public.ops_release_stale_claim(text, text) IS
  'Admin-only. Returns a dead claim to queued, clears holder/claim/heartbeat, and APPENDS a dated '
  'note to the dispatch body recording that it was released and why. Reason is mandatory.';

REVOKE ALL ON FUNCTION public.ops_release_stale_claim(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ops_release_stale_claim(text, text) TO authenticated, service_role;

-- ===========================================================================
-- 7. OPTIONAL AUTO-RELEASE -- OFF unless p_execute is passed true.
--    Fires only past 3x the threshold (360 min), a bar no clean pass in the whole
--    recorded history has crossed. The default call is a DRY RUN that reports what
--    it would have done and changes nothing. Every real action goes through
--    ops_release_stale_claim, so every real action leaves its note on the row.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.ops_auto_release_stale_claims(
  p_execute boolean DEFAULT false,
  p_reason  text    DEFAULT NULL)
 RETURNS TABLE (pass text, lane text, was_claimed_by text, minutes_silent numeric, action text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_bar    numeric := 3 * public.ops_stale_threshold_minutes();
  v_reason text    := coalesce(nullif(btrim(coalesce(p_reason, '')), ''),
                               'auto-release: silent past 3x the stale threshold, no report filed');
  rec      record;
BEGIN
  IF NOT public.ops_is_rail_admin() THEN
    RAISE EXCEPTION 'ops_auto_release_stale_claims: admin only';
  END IF;

  FOR rec IN
    SELECT d.pass AS p, d.lane AS l, d.claimed_by AS who,
           round(EXTRACT(epoch FROM now() - greatest(coalesce(d.heartbeat_at, d.claimed_at), d.claimed_at)) / 60.0, 1) AS silent
      FROM public.ops_dispatches d
     WHERE d.status = 'claimed'
       AND d.claimed_at IS NOT NULL
       AND EXTRACT(epoch FROM now() - greatest(coalesce(d.heartbeat_at, d.claimed_at), d.claimed_at)) / 60.0 >= v_bar
     ORDER BY d.claimed_at
  LOOP
    IF p_execute THEN
      PERFORM public.ops_release_stale_claim(rec.p, v_reason);
      RAISE NOTICE 'ops_auto_release_stale_claims: released % (silent % min)', rec.p, rec.silent;
      RETURN QUERY SELECT rec.p, rec.l, rec.who, rec.silent, 'RELEASED'::text;
    ELSE
      RETURN QUERY SELECT rec.p, rec.l, rec.who, rec.silent, 'WOULD RELEASE (dry run)'::text;
    END IF;
  END LOOP;
END
$function$;

COMMENT ON FUNCTION public.ops_auto_release_stale_claims(boolean, text) IS
  'Admin-only. DRY RUN by default -- pass p_execute => true to actually release. Only touches '
  'claims silent past 3x ops_stale_threshold_minutes(). Not wired to cron: DB41 is detection first.';

REVOKE ALL ON FUNCTION public.ops_auto_release_stale_claims(boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ops_auto_release_stale_claims(boolean, text) TO authenticated, service_role;

-- ===========================================================================
-- 8. POSITIVE ASSERTION that the apply landed (HARNESS_SAFETY rule 5: a check
--    that never runs is indistinguishable from a check that passed).
-- ===========================================================================
DO $chk$
DECLARE v_n int;
BEGIN
  SELECT count(*) INTO v_n FROM information_schema.columns
   WHERE table_schema='public' AND table_name='ops_dispatches' AND column_name='heartbeat_at';
  IF v_n <> 1 THEN RAISE EXCEPTION 'DB41: heartbeat_at missing'; END IF;

  SELECT count(*) INTO v_n FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname IN
     ('ops_stale_threshold_minutes','ops_is_rail_admin','ops_claim_heartbeat',
      'ops_release_stale_claim','ops_auto_release_stale_claims');
  IF v_n <> 5 THEN RAISE EXCEPTION 'DB41: expected 5 routines, found %', v_n; END IF;

  SELECT count(*) INTO v_n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname='ops_stale_claims' AND c.relkind='v'
     AND 'security_invoker=true' = ANY(c.reloptions);
  IF v_n <> 1 THEN RAISE EXCEPTION 'DB41: ops_stale_claims missing or not security_invoker'; END IF;

  RAISE NOTICE 'DB41 apply verified: 1 column, 5 routines, 1 security_invoker view.';
END
$chk$;

COMMIT;
