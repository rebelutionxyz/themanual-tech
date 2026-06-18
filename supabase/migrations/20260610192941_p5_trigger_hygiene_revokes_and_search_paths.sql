-- P5 hygiene (advisor sweep Jun 10): trigger fns should not be REST-callable;
-- pin search_paths on the two new helpers.
REVOKE EXECUTE ON FUNCTION public.trg_drops_thread_original() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.trg_drops_drips_reply() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.trg_drops_escrow_complete() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.trg_drops_bazaar_offer() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.trg_drips_emoji_react() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.trg_drips_saved() FROM PUBLIC, anon, authenticated;

ALTER FUNCTION public.ref_for(text, text) SET search_path = 'pg_catalog','public','extensions';

ALTER FUNCTION public.resolve_content_creator(text) SET search_path = 'pg_catalog','public';
