-- ROLLBACK for 20260808194402_dingleberry_hash_rate_check_revoke_role_grants.sql
-- (DB33 leg 2). Written BEFORE the forward migration was applied.
--
-- This RESTORES THE WORSE STATE. It exists so the amendment's "rollback stated
-- first" requirement is met literally, not because anyone should run it: the
-- grants it re-adds let any authenticated Bee spend another Bee's malware-lookup
-- budget. If the forward migration ever needs undoing, the real question is why
-- something other than the edge function is calling this function.
--
-- BLAST RADIUS: two EXECUTE privileges on one function. No rows, no DDL.

BEGIN;

GRANT EXECUTE ON FUNCTION public.dingleberry_hash_rate_check(uuid, integer)
  TO anon, authenticated;

COMMIT;
