-- ROLLBACK for H24_BYOK1 · 0004_byok_keys. Drop RPCs then the table.
--
-- CAVEAT: dropping public.bee_byok_keys does NOT cascade into vault.secrets
-- (the FK cascade direction is vault.secrets -> bee_byok_keys, not the
-- reverse). Any vault secret named 'byok:%' left behind after this rollback
-- is orphaned and should be cleaned up by hand:
--   select id, name from vault.secrets where name like 'byok:%';
-- before deleting the rows below, if this proposal was ever applied and used.
drop function if exists public.byok_key_read_raw(uuid, text);
drop function if exists public.byok_key_revoke(text);
drop function if exists public.byok_key_store(uuid, text, text);
drop table if exists public.bee_byok_keys;
