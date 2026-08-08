-- DB33 leg 2 -- remove the anon / authenticated EXECUTE grants that default
-- privileges put on dingleberry_hash_rate_check.
--
-- WHY: 20260808194223_dingleberry_hash_verdicts_v1.sql ended with
--        REVOKE ALL ON FUNCTION ... FROM PUBLIC;
--        GRANT EXECUTE ON FUNCTION ... TO service_role;
--      That is the correct move against the PUBLIC=X grant Postgres puts on
--      every new function. It is NOT sufficient here. Read back off the catalog
--      immediately after the apply, proacl was:
--
--        {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--
--      This project carries ALTER DEFAULT PRIVILEGES that hand anon and
--      authenticated their OWN role-level EXECUTE grant on new functions in
--      public. A role grant and a PUBLIC grant are different entries; revoking
--      one leaves the other standing. (Same class as the standing note: read
--      proacl first, then revoke from what is actually granted.)
--
-- WHY IT MATTERS: dingleberry_hash_rate_check is SECURITY DEFINER and takes
--      p_bee_id as an argument rather than reading auth.uid(). Left as applied,
--      any authenticated Bee could call it with ANOTHER Bee's uuid and burn that
--      Bee's provider-lookup budget for the minute -- a cheap denial of the
--      malware check on someone else's device scan. The edge function is the
--      only intended caller and it holds the service-role key.
--
-- ROLLBACK: supabase/migrations/_drafts/
--           20260808194402_dingleberry_hash_rate_check_revoke_role_grants_rollback.sql
--           (restores the worse state; exists for protocol completeness only)
--
-- SCOPE: two EXECUTE privileges on one function. No table, no policy, no
--   function body, no other grant is touched. Zero rows at risk.
--
-- NOTE ON AUDIT TRAIL: the forward migration is deliberately NOT edited. It is
--   applied, so its text stands as the record of what ran. This file is the
--   correction, and the pair is the history.

BEGIN;

REVOKE EXECUTE ON FUNCTION public.dingleberry_hash_rate_check(uuid, integer)
  FROM anon, authenticated;

COMMIT;
