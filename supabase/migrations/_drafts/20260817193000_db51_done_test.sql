-- DB51 DONE-TEST — run this AFTER the apply click, not before.
-- READ-ONLY: no DDL, no DML, and it rolls back. It cannot change anything.
--
-- Run exactly as the BEFORE measurement was run:
--   "/c/Program Files/PostgreSQL/17/bin/psql.exe" -h aws-1-us-east-1.pooler.supabase.com \
--     -p 5432 -U postgres.anxmqiehpyznifqgskzc -d postgres -w -v ON_ERROR_STOP=1 -f <this file>
--
-- PASS looks like this, and nothing else:
--   as admin: ops_workdirs visible rows        = 19
--   as admin: ops_dispatch_location rows       = 266   (or the live dispatch count)
--   as anon:  ops_workdirs visible rows        = 0
--   as anon:  ops_dispatch_location            -> permission denied for table ops_dispatches
--
-- If the admin still sees 0, the policy did not land. If anon sees anything but 0
-- and a denial, STOP: the lock was loosened and that is a security regression, not
-- a partial success.

BEGIN;

SELECT set_config('request.jwt.claims',
                  '{"sub":"ab696a36-e3aa-4c78-8137-eb46d3b4e9c6","role":"authenticated"}', true) AS claims_set;

SET LOCAL ROLE authenticated;

SELECT current_user AS acting_as, public.is_platform_admin() AS is_platform_admin;

SELECT 'as admin: ops_dispatches visible rows' AS measurement, count(*) AS rows FROM public.ops_dispatches
UNION ALL
SELECT 'as admin: ops_workdirs visible rows', count(*) FROM public.ops_workdirs
UNION ALL
SELECT 'as admin: ops_dispatch_location rows', count(*) FROM public.ops_dispatch_location;

RESET ROLE;

SELECT set_config('request.jwt.claims', '{"role":"anon"}', true) AS claims_set;

SET LOCAL ROLE anon;

DO $$
DECLARE n bigint;
BEGIN
  BEGIN
    SELECT count(*) INTO n FROM public.ops_workdirs;
    RAISE NOTICE 'as anon: ops_workdirs visible rows = %', n;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'as anon: ops_workdirs -> %', SQLERRM;
  END;
  BEGIN
    SELECT count(*) INTO n FROM public.ops_dispatch_location;
    RAISE NOTICE 'as anon: ops_dispatch_location rows = %', n;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'as anon: ops_dispatch_location -> %', SQLERRM;
  END;
END $$;

RESET ROLE;

-- Writes must STILL be denied. This is checked by READING THE POLICY SET, not by
-- firing a write at production to see it bounce: a write-shaped statement aimed at
-- the live database to prove a guard works is exactly the thing not to do, and the
-- catalog answers the question without one. Expect ONE row, cmd = r (SELECT).
SELECT polname,
       polcmd::text AS cmd,
       coalesce((SELECT string_agg(r.rolname, ',') FROM pg_roles r WHERE r.oid = ANY(pol.polroles)), 'public') AS roles,
       pg_get_expr(polqual, polrelid) AS using_expr
  FROM pg_policy pol
 WHERE polrelid = 'public.ops_workdirs'::regclass
 ORDER BY polname;

-- RLS must still be ON. Expect rls = t.
SELECT relrowsecurity AS rls FROM pg_class WHERE oid = 'public.ops_workdirs'::regclass;

ROLLBACK;
