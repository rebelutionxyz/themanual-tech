-- ROLLBACK for 20260903202124_patchboard1_revoke_anon_from_write_rpcs.sql
-- Restores the anon EXECUTE grant the project's ALTER DEFAULT PRIVILEGES had
-- given these five write RPCs. Only meaningful if you are also rolling back
-- 20260903202047; on its own it re-opens a grant the function bodies still
-- reject, so there is no reason to run it alone.
GRANT EXECUTE ON FUNCTION public.patchboard_set_bee_switch(text, uuid, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.patchboard_set_master_switch(text, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.patchboard_set_use(text, uuid, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.patchboard_connect_begin(text) TO anon;
GRANT EXECUTE ON FUNCTION public.patchboard_disconnect(text) TO anon;
