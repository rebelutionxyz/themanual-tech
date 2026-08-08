-- DB32 -- DINGLEBERRY PLATFORM POSTURE SCAN v1
--
-- The platform half of DingleBERRY. Unlike the device scan, this one is real
-- from day one: every check reads the live Postgres catalog, so it needs no
-- agent, no sample data, and nothing here is a mock.
--
-- ROLLBACK: supabase/migrations/_drafts/
--           20260808210000_dingleberry_posture_scan_v1_rollback.sql
--           Written FIRST, before this file. Additive-only pass: two tables,
--           four functions, one view. No existing object is altered, no DML is
--           issued against any pre-existing table. Rows at risk: 0.
--
-- PRE-FLIGHT (read off production 2026-08-08, before the apply):
--   public schema: 186 base tables, 17 views, 3 materialized views, 277
--   SECURITY DEFINER functions. No object named dingleberry_posture_* exists.
--   Admin gate: public.is_platform_admin() -- STABLE SECURITY DEFINER, pinned
--   search_path, EXISTS(bees WHERE id=auth.uid() AND is_admin). Same function
--   the ops_dispatches_admin_read policy uses, which is what the dispatch meant
--   by "mirror the ops_dispatches admin read policy".
--   pg_default_acl: anon=X/postgres and authenticated=X/postgres on FUNCTIONS,
--   anon=arwdDxtm/postgres on RELATIONS. Every object created below therefore
--   arrives already granted to anon; every one of them is explicitly revoked at
--   the foot of this file. This is Amendment 2's finding, applied to our own
--   objects rather than only reported about other people's.
--
-- CALIBRATION -- what was measured before any check shipped, and what changed:
--   P01   0 hits    P02  13 hits    P03   0 hits (DB31 + DB34 took)
--   P04   1 hit     P05   0 hits    P06  41 hits    P07   3 hits    P08  0 hits
--
--   P06 -- the dispatch's rule returned 56. 15 of those were TRIGGER functions,
--   which PostgREST cannot call at all: an anon EXECUTE grant on a function
--   returning `trigger` is inert. Excluding prorettype = trigger drops the count
--   to 41 real, reachable RPCs without hiding a single reachable one. DEVIATION,
--   recorded in REPORT.md.
--
--   P08 -- the amendment's redefinition was measured and REJECTED, because its
--   second leg is inverted. It says to flag a write grant when "RLS is on but
--   there is no policy covering that command". Under RLS, a command with no
--   permissive policy is DENIED -- that is the protected state, and it is this
--   project's house pattern (grant broadly, write only through SECDEF RPCs).
--   Measured: that rule flags 128 of 186 tables, i.e. it fires hardest exactly
--   where the platform is safest, and would have buried the first scan the way
--   the amendment was written to prevent.
--   P08 SHIPS AS: a write grant to anon/authenticated combined with a PERMISSIVE
--   policy for that same command and role whose USING and WITH CHECK are both
--   unconditionally TRUE. That is the actual open door. It returns 0 today. The
--   detector was rehearsed against a deliberately-open table inside
--   BEGIN ... ROLLBACK to prove it fires; output verbatim in REPORT.md.
--   DEVIATION from the amendment, recorded in REPORT.md.
--
-- Nothing in this pass auto-fixes anything. The scanner reports; humans and
-- dispatches remediate.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. TABLES
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.dingleberry_posture_runs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  checks_run    int NOT NULL DEFAULT 0,
  findings_open int NOT NULL DEFAULT 0,
  run_by        uuid
);

COMMENT ON TABLE public.dingleberry_posture_runs IS
  'DB32: one row per platform posture scan. Written only by dingleberry_posture_scan().';

CREATE TABLE IF NOT EXISTS public.dingleberry_posture_findings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          uuid REFERENCES public.dingleberry_posture_runs(id),
  astra           text NOT NULL,
  check_code      text NOT NULL,
  severity        text NOT NULL CHECK (severity IN ('critical','high','medium','low','info')),
  object_schema   text NOT NULL,
  object_name     text NOT NULL,
  object_type     text,
  detail          text NOT NULL,
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','accepted')),
  first_seen      timestamptz NOT NULL DEFAULT now(),
  last_seen       timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,
  accepted_reason text,
  UNIQUE (check_code, object_schema, object_name)
);

COMMENT ON TABLE public.dingleberry_posture_findings IS
  'DB32: current posture finding per (check_code, object). Identity is the object, not the run - so first_seen is the age of the defect and resolved_at is the receipt for a remediation.';

CREATE INDEX IF NOT EXISTS dingleberry_posture_findings_open_idx
  ON public.dingleberry_posture_findings (astra, severity) WHERE status = 'open';

ALTER TABLE public.dingleberry_posture_runs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dingleberry_posture_findings ENABLE ROW LEVEL SECURITY;

-- Admin-only read, mirroring ops_dispatches_admin_read. No client write policy
-- exists on either table by design: the scan RPC owns every write.
DROP POLICY IF EXISTS dingleberry_posture_runs_admin_read ON public.dingleberry_posture_runs;
CREATE POLICY dingleberry_posture_runs_admin_read
  ON public.dingleberry_posture_runs FOR SELECT TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS dingleberry_posture_findings_admin_read ON public.dingleberry_posture_findings;
CREATE POLICY dingleberry_posture_findings_admin_read
  ON public.dingleberry_posture_findings FOR SELECT TO authenticated
  USING (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- 2. ASTRA ATTRIBUTION -- one helper, one mapping table, no repeated CASE
-- ---------------------------------------------------------------------------
-- Longest matching prefix wins, so 'elections_' beats 'election' and
-- 'atlasoracle_' beats a shorter neighbour. Unmatched -> 'platform'.
--
-- CANONICAL-SLUG CROSS-CHECK (dispatch section 2 asked for it; here is the
-- result rather than a silent rewrite): the mapping targets below are the
-- app's ROUTE-level astra names. They do NOT all appear in either canonical
-- registry, and the two registries do not agree with each other -- the DB table
-- public.astra_registry carries 28 slugs, src/lib/astra-catalog.ts carries 40.
-- Targets absent from BOTH: trivia, elections, intel, give, rule, unite,
-- manual, here24, studio, missioncontrol, core. Targets present in the front
-- catalog under a different slug: intel=forum, rule=events, unite=groups,
-- manual=themanual, here24=atlasoracle, elections=voting.
-- The dispatch's names are shipped VERBATIM because the follow-on DingleBERRY
-- Command Center pass renders routes, and because attribution is a label, not
-- a foreign key -- changing it later is a one-line edit to this function.
-- The registry divergence is reported to the lead as a finding of this pass.
CREATE OR REPLACE FUNCTION public.dingleberry_astra_of(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'pg_catalog', 'public'
AS $fn$
  SELECT COALESCE(
    (SELECT m.astra
       FROM (VALUES
              ('comms_',        'comms'),
              ('justice_',      'justice'),
              ('pulse_',        'pulse'),
              ('bazaar_',       'bazaar'),
              ('press_',        'press'),
              ('trivia_',       'trivia'),
              ('election',      'elections'),
              ('bling_',        'freedomblings'),
              ('drops_',        'freedomblings'),
              ('forum_',        'intel'),
              ('give_',         'give'),
              ('event_',        'rule'),
              ('group_',        'unite'),
              ('atom_',         'manual'),
              ('manual_',       'manual'),
              ('atlasoracle_',  'here24'),
              ('oracle_',       'here24'),
              ('games_',        'gaming'),
              ('media_',        'studio'),
              ('ops_',          'missioncontrol'),
              ('dingleberry_',  'dingleberry'),
              ('bee_',          'core'),
              ('bees',          'core')
            ) AS m(prefix, astra)
      WHERE p_name LIKE m.prefix || '%'
      ORDER BY length(m.prefix) DESC
      LIMIT 1),
    'platform');
$fn$;

COMMENT ON FUNCTION public.dingleberry_astra_of(text) IS
  'DB32: maps an object name to a route-level astra by longest name prefix. Single source of the mapping - do not inline it anywhere else.';

-- ---------------------------------------------------------------------------
-- 3. THE CHECKS -- catalog-driven, defined once, consumed by the scan RPC
-- ---------------------------------------------------------------------------
-- SECURITY INVOKER on purpose. The catalogs it reads are world-readable, so it
-- needs no elevation, and adding another SECURITY DEFINER surface here would
-- be a scanner that manufactures its own P05/P06 findings. It is revoked from
-- anon and authenticated at the foot of this file; only the definer RPCs below
-- (running as owner) call it.
CREATE OR REPLACE FUNCTION public.dingleberry_posture_checks()
RETURNS TABLE (
  check_code    text,
  severity      text,
  object_schema text,
  object_name   text,
  object_type   text,
  detail        text
)
LANGUAGE sql
STABLE
SET search_path TO 'pg_catalog', 'public'
AS $fn$

-- P01 rls_disabled [critical]
SELECT 'P01', 'critical', 'public', c.relname, 'table',
       'RLS is not enabled on public.' || c.relname ||
       ', so any role holding a grant reads and writes every row unfiltered. Fix: ALTER TABLE public.' ||
       c.relname || ' ENABLE ROW LEVEL SECURITY; then add the policies the surface needs.'
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND NOT c.relrowsecurity

UNION ALL

-- P02 rls_no_policy [medium] -- often a deliberate lock, hence medium
SELECT 'P02', 'medium', 'public', c.relname, 'table',
       'RLS is enabled on public.' || c.relname ||
       ' but no policy exists, so every non-superuser read and write is denied and the table is reachable only through SECURITY DEFINER code. Fix: confirm the lock is intentional; if a surface needs to read it, add an explicit SELECT policy.'
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND c.relrowsecurity
   AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid)

UNION ALL

-- P03 view_write_grant [high]
SELECT 'P03', 'high', 'public', c.relname, 'view',
       'View public.' || c.relname || ' grants ' || g.privs || ' to ' || g.roles ||
       '. A public read surface must carry no write grants - they are one CREATE OR REPLACE or one INSTEAD OF trigger away from live. Fix: REVOKE INSERT, UPDATE, DELETE ON public.' ||
       c.relname || ' FROM ' || g.roles || ';'
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN LATERAL (
        SELECT string_agg(DISTINCT a.privilege_type, ', ' ORDER BY a.privilege_type) AS privs,
               string_agg(DISTINCT r.rolname,         ', ' ORDER BY r.rolname)        AS roles
          FROM aclexplode(c.relacl) a JOIN pg_roles r ON r.oid = a.grantee
         WHERE r.rolname IN ('anon','authenticated')
           AND a.privilege_type IN ('INSERT','UPDATE','DELETE')) g
 WHERE n.nspname = 'public' AND c.relkind = 'v' AND g.privs IS NOT NULL

UNION ALL

-- P04 secdef_view [high]
SELECT 'P04', 'high', 'public', c.relname, 'view',
       'View public.' || c.relname ||
       ' is not marked security_invoker, so it runs with its owner''s privileges and bypasses RLS on every base table it reads. Fix: ALTER VIEW public.' ||
       c.relname || ' SET (security_invoker = true); or, if definer behaviour is the point (a deliberate redaction boundary), record it with dingleberry_posture_accept().'
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind = 'v'
   AND COALESCE((SELECT o.option_value FROM pg_options_to_table(c.reloptions) o
                  WHERE o.option_name = 'security_invoker'), 'false') NOT IN ('true','on')

UNION ALL

-- P05 fn_mutable_path [medium]
SELECT 'P05', 'medium', 'public',
       p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', 'function',
       'SECURITY DEFINER function public.' || p.proname ||
       ' has no pinned search_path, so a caller-controlled search_path can redirect the objects its body resolves. Fix: ALTER FUNCTION public.' ||
       p.proname || '(' || pg_get_function_identity_arguments(p.oid) ||
       ') SET search_path TO ''pg_catalog'', ''public'';'
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.prokind = 'f' AND p.prosecdef
   AND NOT COALESCE(array_to_string(p.proconfig, ',') LIKE '%search_path=%', false)

UNION ALL

-- P06 anon_secdef_unguarded [high] -- REVIEW-flavored, never auto-remediate.
-- Trigger-returning functions are excluded: PostgREST cannot call them, so an
-- anon EXECUTE grant on one is inert. See the CALIBRATION block above.
SELECT 'P06', 'high', 'public',
       p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', 'function',
       'REVIEW: SECURITY DEFINER function public.' || p.proname || ' is EXECUTE-able by ' || g.roles ||
       ' and its body references neither auth.uid() nor auth.role(), so it may do privileged work on behalf of a caller it never identified. It may legitimately delegate its guard to a helper - read the body before acting. If the grant is wrong: REVOKE EXECUTE ON FUNCTION public.' ||
       p.proname || '(' || pg_get_function_identity_arguments(p.oid) ||
       ') FROM anon, authenticated;  -- REVOKE ... FROM PUBLIC does NOT work on this project, see finding N02.'
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  CROSS JOIN LATERAL (
        SELECT string_agg(DISTINCT r.rolname, ', ' ORDER BY r.rolname) AS roles
          FROM aclexplode(p.proacl) a JOIN pg_roles r ON r.oid = a.grantee
         WHERE a.privilege_type = 'EXECUTE' AND r.rolname IN ('anon','authenticated')) g
 WHERE n.nspname = 'public' AND p.prokind = 'f' AND p.prosecdef
   AND p.prorettype <> 'pg_catalog.trigger'::regtype
   AND EXISTS (SELECT 1 FROM aclexplode(p.proacl) a JOIN pg_roles r ON r.oid = a.grantee
                WHERE a.privilege_type = 'EXECUTE' AND r.rolname = 'anon')
   AND p.prosrc !~* 'auth\.uid\(\)'
   AND p.prosrc !~* 'auth\.role\(\)'

UNION ALL

-- P07 matview_in_api [low]
SELECT 'P07', 'low', 'public', c.relname, 'matview',
       'Materialized view public.' || c.relname || ' is SELECT-able by ' || g.roles ||
       '. Materialized views do not enforce RLS, so every stored row is exposed to that role. Fix: revoke the grant and serve it through a filtering view or RPC, or confirm the whole contents are public and accept the finding.'
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN LATERAL (
        SELECT string_agg(DISTINCT r.rolname, ', ' ORDER BY r.rolname) AS roles
          FROM aclexplode(c.relacl) a JOIN pg_roles r ON r.oid = a.grantee
         WHERE r.rolname IN ('anon','authenticated') AND a.privilege_type = 'SELECT') g
 WHERE n.nspname = 'public' AND c.relkind = 'm' AND g.roles IS NOT NULL

UNION ALL

-- P08 table_write_grant [high] -- the OPEN DOOR only. See CALIBRATION above.
SELECT 'P08', 'high', 'public', x.relname, 'table',
       'Table public.' || x.relname ||
       ' pairs a write grant with an unconditionally TRUE permissive policy for the same command and role: ' ||
       x.offenders ||
       '. Any holder of that grant can write any row. Fix: scope the policy predicate to the owning bee, or revoke the grant and route the write through a SECURITY DEFINER RPC.'
  FROM (
    SELECT c.relname,
           string_agg(DISTINCT r.rolname || ' ' || a.privilege_type || ' via policy "' || p.polname || '"',
                      '; ') AS offenders
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      CROSS JOIN LATERAL aclexplode(c.relacl) a
      JOIN pg_roles r ON r.oid = a.grantee
      JOIN pg_policy p ON p.polrelid = c.oid
     WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND c.relrowsecurity
       AND r.rolname IN ('anon','authenticated')
       AND a.privilege_type IN ('INSERT','UPDATE','DELETE')
       AND p.polpermissive
       AND (p.polcmd = '*' OR p.polcmd = CASE a.privilege_type
                                           WHEN 'INSERT' THEN 'a'
                                           WHEN 'UPDATE' THEN 'w'
                                           WHEN 'DELETE' THEN 'd' END)
       AND (p.polroles = '{0}'::oid[]
            OR EXISTS (SELECT 1 FROM pg_roles rr
                        WHERE rr.oid = ANY (p.polroles) AND rr.rolname = r.rolname))
       AND COALESCE(pg_get_expr(p.polqual,      p.polrelid), 'true') = 'true'
       AND COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), 'true') = 'true'
     GROUP BY c.relname) x

UNION ALL

-- N01 house_grant_posture [info] -- ONE row for the project, not one per table.
SELECT 'N01', 'info', 'public', 'project', 'project',
       'House posture note: ' ||
       (SELECT count(DISTINCT c.relname)
          FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relkind IN ('r','p')
           AND EXISTS (SELECT 1 FROM aclexplode(c.relacl) a JOIN pg_roles r ON r.oid = a.grantee
                        WHERE r.rolname IN ('anon','authenticated')
                          AND a.privilege_type IN ('INSERT','UPDATE','DELETE')))::text ||
       ' of ' ||
       (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relkind IN ('r','p'))::text ||
       ' public base tables grant INSERT/UPDATE/DELETE to anon or authenticated. On this project that is the stock Supabase grant posture, not a defect list: the platform grants broadly and RLS is the real control, which is why P08 flags only the tables where a policy actually leaves the door open. TRUNCATE is granted the same way and is NOT RLS-protected; it is not reachable through PostgREST today, so it is a latent grant rather than an open door.'

UNION ALL

-- N02 default_privileges_trap [info] -- the DB33 lesson, recorded permanently.
SELECT 'N02', 'info', 'public', 'project-default-privileges', 'project',
       'ALTER DEFAULT PRIVILEGES on this project hands anon and authenticated their OWN role-level EXECUTE grant on every newly created function (pg_default_acl shows anon=X/postgres, authenticated=X/postgres). REVOKE EXECUTE ON FUNCTION x FROM PUBLIC therefore does NOT remove it - the revoke reports success and the function stays callable by any Bee. Always revoke from the named roles: REVOKE EXECUTE ON FUNCTION x FROM anon, authenticated. Found the hard way in DB33, on a SECURITY DEFINER function taking p_bee_id, where it let one Bee burn another Bee''s rate budget. Recorded here so no future pass has to rediscover it.'

$fn$;

COMMENT ON FUNCTION public.dingleberry_posture_checks() IS
  'DB32: the check catalog. Every platform posture check is defined here exactly once; dingleberry_posture_scan() consumes it. SECURITY INVOKER by design - the catalogs are world-readable and a second definer surface would only manufacture its own findings.';

-- ---------------------------------------------------------------------------
-- 4. THE RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.dingleberry_posture_scan()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $fn$
DECLARE
  v_run      uuid;
  v_new      int := 0;
  v_resolved int := 0;
  v_open     int := 0;
  v_checks   CONSTANT int := 10;  -- P01..P08 + N01 + N02, one per branch of dingleberry_posture_checks()
  v_by_sev   jsonb;
  v_by_astra jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.dingleberry_posture_runs (run_by)
  VALUES (auth.uid())
  RETURNING id INTO v_run;

  -- UPSERT on the object identity. An 'accepted' finding is bumped (run_id,
  -- last_seen) and otherwise left exactly as the admin left it.
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

  -- Anything previously open that this run did not re-emit is remediated.
  -- This is where a fix earns its receipt. 'accepted' rows are never touched.
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
$fn$;

COMMENT ON FUNCTION public.dingleberry_posture_scan() IS
  'DB32: run every platform posture check, upsert findings by object identity, resolve anything that has been fixed. Admin only. Returns the run summary.';

CREATE OR REPLACE FUNCTION public.dingleberry_posture_accept(p_finding_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $fn$
DECLARE
  v_row public.dingleberry_posture_findings;
  v_by  uuid := auth.uid();
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'a written reason is required to accept a posture finding';
  END IF;

  UPDATE public.dingleberry_posture_findings
     SET status = 'accepted', accepted_reason = btrim(p_reason), resolved_at = NULL
   WHERE id = p_finding_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'posture finding not found: %', p_finding_id;
  END IF;

  RETURN jsonb_build_object(
    'id',              v_row.id,
    'check_code',      v_row.check_code,
    'object_name',     v_row.object_name,
    'astra',           v_row.astra,
    'status',          v_row.status,
    'accepted_reason', v_row.accepted_reason,
    'accepted_by',     v_by);
END;
$fn$;

COMMENT ON FUNCTION public.dingleberry_posture_accept(uuid, text) IS
  'DB32: mark a posture finding as a known, written-down exception. Admin only, reason required. The finding stays visible with its reason instead of being hidden or nagging forever.';

-- ---------------------------------------------------------------------------
-- 5. READ SURFACE (no UI in this pass)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.dingleberry_posture_by_astra
WITH (security_invoker = true) AS
SELECT f.astra,
       count(*) FILTER (WHERE f.status = 'open')                                AS open_total,
       count(*) FILTER (WHERE f.status = 'open' AND f.severity = 'critical')    AS open_critical,
       count(*) FILTER (WHERE f.status = 'open' AND f.severity = 'high')        AS open_high,
       count(*) FILTER (WHERE f.status = 'open' AND f.severity = 'medium')      AS open_medium,
       count(*) FILTER (WHERE f.status = 'open' AND f.severity = 'low')         AS open_low,
       count(*) FILTER (WHERE f.status = 'open' AND f.severity = 'info')        AS open_info,
       count(*) FILTER (WHERE f.status = 'accepted')                            AS accepted_total,
       count(*) FILTER (WHERE f.status = 'resolved')                            AS resolved_total,
       (ARRAY_AGG(f.severity ORDER BY CASE f.severity
                                        WHEN 'critical' THEN 1
                                        WHEN 'high'     THEN 2
                                        WHEN 'medium'   THEN 3
                                        WHEN 'low'      THEN 4
                                        ELSE 5 END)
        FILTER (WHERE f.status = 'open'))[1]                                    AS worst_severity,
       max(f.last_seen)                                                         AS last_scanned
  FROM public.dingleberry_posture_findings f
 GROUP BY f.astra;

COMMENT ON VIEW public.dingleberry_posture_by_astra IS
  'DB32: per-astra posture rollup. security_invoker=true, so the admin-only RLS on dingleberry_posture_findings is what gates it. The DingleBERRY Command Center renders this in a follow-on front pass.';

-- ---------------------------------------------------------------------------
-- 6. GRANTS -- explicit, role-level, because ALTER DEFAULT PRIVILEGES on this
--    project already granted anon and authenticated everything above (N02).
--    REVOKE ... FROM PUBLIC would be a silent no-op here.
-- ---------------------------------------------------------------------------

REVOKE ALL ON public.dingleberry_posture_runs        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.dingleberry_posture_findings    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.dingleberry_posture_by_astra    FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.dingleberry_posture_runs      TO authenticated;
GRANT SELECT ON public.dingleberry_posture_findings  TO authenticated;
GRANT SELECT ON public.dingleberry_posture_by_astra  TO authenticated;

REVOKE ALL ON FUNCTION public.dingleberry_astra_of(text)                 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dingleberry_posture_checks()               FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dingleberry_posture_scan()                 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dingleberry_posture_accept(uuid, text)     FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.dingleberry_posture_scan()              TO authenticated;
GRANT EXECUTE ON FUNCTION public.dingleberry_posture_accept(uuid, text)  TO authenticated;

COMMIT;
