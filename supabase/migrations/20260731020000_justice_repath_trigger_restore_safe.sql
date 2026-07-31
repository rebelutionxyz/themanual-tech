-- 20260731020000_justice_repath_trigger_restore_safe.sql
-- OPS31 — apply of the OPS30-Q §4 fix, verbatim.
--
-- DEFECT: justice_dockets_repath_children_trg does not survive a pg_dump restore.
-- Its WHEN clause resolves public.=(ltree,ltree) at CREATE TRIGGER time, and every
-- pg_dump emits `SELECT pg_catalog.set_config('search_path', '', false);` at the top
-- (the CVE-2018-1058 hardening), so the operator is not visible and the statement
-- errors:
--     ERROR:  operator does not exist: public.ltree = public.ltree
-- The trigger is therefore silently absent from every restored snapshot.
-- The trigger FUNCTION is not at fault and is not touched here — it already carries
-- SET search_path TO 'public', 'pg_temp' and is already schema-qualified inside.
--
-- FIX: compare the canonical text rendering. text operators resolve through
-- pg_catalog, which is always implicitly in scope even when search_path is empty.
-- ltree's text rendering is canonical, so ::text comparison is equivalent to ltree
-- equality for every non-NULL pair, and IS DISTINCT FROM keeps the NULL behaviour
-- byte for byte (value->NULL still fires; NULL->NULL still does not).
-- Semantics verified 4/4 in OPS30 §3.
--
-- Both statements are in ONE transaction: between the DROP and the CREATE there is
-- otherwise a window in which a concurrent UPDATE ... SET path would not cascade.
--
-- ROLLBACK (exact) — OPS30-Q §4:
--   BEGIN;
--   DROP TRIGGER IF EXISTS justice_dockets_repath_children_trg ON public.justice_dockets;
--   CREATE TRIGGER justice_dockets_repath_children_trg
--     AFTER UPDATE ON public.justice_dockets
--     FOR EACH ROW WHEN (new.path IS DISTINCT FROM old.path)
--     EXECUTE FUNCTION public.justice_dockets_repath_children();
--   COMMIT;

BEGIN;

DROP TRIGGER IF EXISTS justice_dockets_repath_children_trg ON public.justice_dockets;

CREATE TRIGGER justice_dockets_repath_children_trg
  AFTER UPDATE ON public.justice_dockets
  FOR EACH ROW WHEN (new.path::text IS DISTINCT FROM old.path::text)
  EXECUTE FUNCTION public.justice_dockets_repath_children();

COMMIT;
