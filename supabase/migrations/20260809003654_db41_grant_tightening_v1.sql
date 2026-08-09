-- DB41 (b) -- GRANT TIGHTENING: close the hole 20260809002940 left open.
-- Rollback: supabase/migrations/_drafts/20260809003654_db41_grant_tightening_v1_rollback.sql
--           (written BEFORE this migration, per the MIGRATION AMENDMENT)
--
-- WHAT WENT WRONG, STATED PLAINLY. The DB41 migration wrote
--   REVOKE ALL ON FUNCTION ... FROM PUBLIC;
--   GRANT EXECUTE ON FUNCTION ... TO <the roles I meant>;
-- and then verified by structure. proacl came back:
--   {postgres=X, anon=X, authenticated=X, service_role=X}
-- on ALL FIVE routines, and {postgres=arwdDxtm, anon=arwdDxtm, authenticated=arwdDxtm,
-- service_role=arwdDxtm} on the view -- i.e. anon holds INSERT/UPDATE/DELETE on it too.
--
-- The grants are not mine. They come from Supabase's ALTER DEFAULT PRIVILEGES on schema
-- public (pg_default_acl, grantor postgres AND supabase_admin, objtypes f and r), which
-- fire at CREATE time. There was never a PUBLIC (`=X/postgres`) entry, so
-- `REVOKE ... FROM PUBLIC` was the documented no-op: a PUBLIC grant needs REVOKE FROM
-- PUBLIC, a ROLE grant needs REVOKE FROM that role, and blind-revoking the wrong one
-- silently changes nothing. This is the known trap and DB41 walked into it.
--
-- WHY IT MATTERS, ranked honestly:
--   1. REAL HOLE. public.ops_claim_heartbeat has NO authorization gate in its body --
--      by design, it is guarded by its grant list. With anon holding EXECUTE, any holder
--      of the public anon key could heartbeat ANY claimed pass and keep a dead lock alive
--      forever. That is the precise failure DB41 exists to detect, made unfixable from
--      outside. This is the statement that had to ship.
--   2. Wrong but inert. ops_release_stale_claim / ops_auto_release_stale_claims were
--      reachable by anon, but ops_is_rail_admin() refuses anon (role is not service_role,
--      is_platform_admin() is false), so both fail closed at the gate. Verified below.
--   3. Wrong but inert. The view's write grants cannot be exercised -- it is not an
--      auto-updatable view (CTEs and aggregates) -- and anon SELECT returns zero rows,
--      since security_invoker hands it to the ops_dispatches_admin_read policy, which is
--      scoped to the authenticated role. Removed anyway: defense in depth is the point.
--
-- INTENDED FINAL GRANTS:
--   ops_stale_threshold_minutes    authenticated, service_role
--   ops_is_rail_admin              authenticated, service_role
--   ops_claim_heartbeat            service_role ONLY  (terminals reach it as the owner)
--   ops_release_stale_claim        authenticated, service_role  (gate does the rest)
--   ops_auto_release_stale_claims  authenticated, service_role  (gate does the rest)
--   ops_stale_claims (view)        SELECT to authenticated, service_role. Nothing else.
-- postgres is the owner and is unaffected throughout; the rail connects as postgres.

BEGIN;

-- ===========================================================================
-- 1. THE ONE THAT MATTERS -- ungated RPC, so the grant list IS the gate.
-- ===========================================================================
REVOKE EXECUTE ON FUNCTION public.ops_claim_heartbeat(text, text) FROM anon, authenticated;

-- ===========================================================================
-- 2. The gated RPCs and the helpers. anon has no business here even though the
--    gate already refuses it.
-- ===========================================================================
REVOKE EXECUTE ON FUNCTION public.ops_stale_threshold_minutes()                FROM anon;
REVOKE EXECUTE ON FUNCTION public.ops_is_rail_admin()                          FROM anon;
REVOKE EXECUTE ON FUNCTION public.ops_release_stale_claim(text, text)          FROM anon;
REVOKE EXECUTE ON FUNCTION public.ops_auto_release_stale_claims(boolean, text) FROM anon;

-- ===========================================================================
-- 3. The view. Strip anon entirely; keep SELECT only for the two roles that
--    should read it, and drop the write bits default privileges handed out.
-- ===========================================================================
-- REVOKE ALL then re-GRANT, rather than enumerating the write privileges to strip.
-- The first attempt enumerated INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER and
-- the assertion in section 4 caught what the list missed: Postgres 17 adds MAINTAIN,
-- which default privileges had also handed out. Enumerating a privilege set is a bet
-- that the server version has no privilege you have not thought of. REVOKE ALL is not.
REVOKE ALL ON public.ops_stale_claims FROM anon, authenticated, service_role;
GRANT SELECT ON public.ops_stale_claims TO authenticated, service_role;

-- ===========================================================================
-- 4. POSITIVE ASSERTION -- read the grants back and fail closed if any survived.
--    HARNESS_SAFETY rule 5: a check that never runs is not a check that passed.
--    This asserts on proacl itself, which is the thing DB41 got wrong.
-- ===========================================================================
DO $chk$
DECLARE
  v_bad text;
BEGIN
  SELECT string_agg(p.proname || ' -> ' || r.rolname, ', ')
    INTO v_bad
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    CROSS JOIN LATERAL aclexplode(p.proacl) a
    JOIN pg_roles r ON r.oid = a.grantee
   WHERE n.nspname = 'public'
     AND a.privilege_type = 'EXECUTE'
     AND (
          (p.proname = 'ops_claim_heartbeat' AND r.rolname IN ('anon','authenticated'))
       OR (p.proname IN ('ops_stale_threshold_minutes','ops_is_rail_admin',
                         'ops_release_stale_claim','ops_auto_release_stale_claims')
           AND r.rolname = 'anon')
         );
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'DB41b: unintended EXECUTE grants survived: %', v_bad;
  END IF;

  SELECT string_agg(r.rolname || ':' || a.privilege_type, ', ')
    INTO v_bad
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    CROSS JOIN LATERAL aclexplode(c.relacl) a
    JOIN pg_roles r ON r.oid = a.grantee
   WHERE n.nspname = 'public' AND c.relname = 'ops_stale_claims'
     AND r.rolname <> 'postgres'
     AND (r.rolname = 'anon' OR a.privilege_type <> 'SELECT');
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'DB41b: unintended view grants survived: %', v_bad;
  END IF;

  RAISE NOTICE 'DB41b verified: anon is off all five routines and off the view; only SELECT remains.';
END
$chk$;

COMMIT;
