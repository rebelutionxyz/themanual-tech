-- Default PUBLIC execute grant exposes mutators to anon (gate blocks them, but don't expose the endpoint).
-- is_platform_admin keeps anon execute (the atoms read policy calls it for anonymous readers).
REVOKE EXECUTE ON FUNCTION public.atom_create(text,text,text,text,text) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.atom_update(text,text,text[],text,text) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.atom_set_status(text,text) FROM PUBLIC, anon;
