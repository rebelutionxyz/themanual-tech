-- DB21: close the loaded gun on public.bee_keys.
--
-- FINDING (DB19 #2): policy bee_keys_public_read USING (true) + table-wide SELECT
-- granted to anon/authenticated makes encrypted_secret_key and backup_kdf readable
-- by ANY caller. All 16 rows are NULL today and no client writes those columns, so
-- nothing leaks yet. The day E2EE key backup ships, every Bee's wrapped private key
-- becomes world-readable with no code change and no error.
--
-- WHY GRANTS AND NOT A POLICY EDIT: RLS is row-level only. A policy cannot hide a
-- column, so no rewrite of bee_keys_public_read can fix this finding. Column-level
-- GRANT is the mechanism. Same shape as 20260801154515 (bees anon narrowing).
--
-- WHY THE POLICY SURVIVES: public read of device keys is load-bearing. src/lib/e2ee.ts
-- reads bee_keys at three sites -- ensurePublished (public_key), fetchMemberDeviceKeys
-- (bee_id, device_id, public_key) and computeSafetyNumber (bee_id, public_key). Every
-- Bee must be able to read every other Bee's PUBLIC device keys to seal messages to
-- them. That is E2EE working as designed; the secret columns riding along is the bug.
--
-- WHY authenticated TOO: a logged-in Bee reading every other Bee's wrapped private key
-- is the same hole. No client seam blocks it here -- all three callers name their
-- columns explicitly and none names a secret column.
--
-- Writers are unaffected: bee_register_key and bee_publish_key are SECURITY DEFINER
-- owned by postgres.
revoke select on public.bee_keys from anon, authenticated;
grant select (bee_id, device_id, public_key, key_algo, created_at, updated_at)
  on public.bee_keys to anon, authenticated;

-- ROLLBACK (verbatim, restores relacl to arwdDxtm and attacl to NULL):
--   revoke select (bee_id, device_id, public_key, key_algo, created_at, updated_at)
--     on public.bee_keys from anon, authenticated;
--   grant select on public.bee_keys to anon, authenticated;
