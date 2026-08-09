-- ROLLBACK for 20260809003654_db41_grant_tightening_v1.sql
-- WRITTEN BEFORE THE APPLY, per the MIGRATION AMENDMENT.
--
-- The forward migration removes grants that NOBODY intended and that the earlier
-- DB41 migration failed to remove. Prior state was read from proacl BEFORE the
-- forward apply and is reproduced exactly below:
--
--   all five ops_* routines : {postgres=X, anon=X, authenticated=X, service_role=X}
--   view ops_stale_claims   : {postgres=arwdDxtm, anon=arwdDxtm,
--                              authenticated=arwdDxtm, service_role=arwdDxtm}
--
-- Those grants came from Supabase's ALTER DEFAULT PRIVILEGES on schema public
-- (pg_default_acl, grantor postgres and supabase_admin, objtype f/r), NOT from any
-- statement in the DB41 migration. DB41's `REVOKE ALL ... FROM PUBLIC` was the
-- documented no-op: there was no PUBLIC (`=X/postgres`) entry to revoke.
--
-- READ THIS BEFORE RUNNING. Restoring these grants RE-OPENS the hole:
-- public.ops_claim_heartbeat carries NO authorization gate of its own -- it is
-- guarded by its grant list alone. Granting it back to anon lets any holder of the
-- public anon key keep a DEAD claim alive forever, which defeats the entire point
-- of DB41. Roll this back only to restore the pre-remediation state for forensics,
-- never as a fix.

BEGIN;

-- ---------------------------------------------------------------------------
-- Exact inverse of the forward REVOKEs.
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.ops_stale_threshold_minutes()                 TO anon;
GRANT EXECUTE ON FUNCTION public.ops_is_rail_admin()                           TO anon;
GRANT EXECUTE ON FUNCTION public.ops_claim_heartbeat(text, text)               TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ops_release_stale_claim(text, text)           TO anon;
GRANT EXECUTE ON FUNCTION public.ops_auto_release_stale_claims(boolean, text)  TO anon;

-- Prior state on the view was the full default-privilege set (arwdDxtm, plus MAINTAIN
-- on PG17) for all three roles. GRANT ALL restores exactly that without enumerating a
-- privilege list -- enumerating is what made the first forward attempt fail.
GRANT ALL ON public.ops_stale_claims TO anon, authenticated, service_role;

COMMIT;
