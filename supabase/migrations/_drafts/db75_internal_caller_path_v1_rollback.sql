-- ROLLBACK for db75_internal_caller_path_v1.sql
-- DB75, 2026-08-18. WRITTEN BEFORE THE FORWARD MIGRATION per the MIGRATION AMENDMENT.
--
-- WHAT THE FORWARD MIGRATION DID: made atlasoracle_directives able to hold an
-- INTERNAL (astra-to-engine) directive — one with no Bee, attributed to a
-- caller — so the metered route can record generate-questions / trivia-host
-- traffic that today bypasses it entirely. Three additive changes:
--   1. bee_id  DROP NOT NULL     (an internal directive has no Bee)
--   2. + caller_kind text NOT NULL DEFAULT 'user'  CHECK (user|internal)
--   3. + caller_astra text                          (the true caller label)
--
-- THIS ROLLBACK REVERSES ALL THREE. It is clean ONLY WHILE NO INTERNAL ROW
-- EXISTS — re-imposing bee_id NOT NULL fails if any row has bee_id IS NULL. At
-- apply time that is true (no internal traffic has flowed yet), so the rollback
-- is exact then. The guard below makes the failure loud rather than silent: if
-- internal rows exist, the rollback STOPS and says so, rather than deleting real
-- directive history to force the constraint back on. Deleting audit rows to
-- satisfy a rollback would be the worse error.

DO $db75_rb_guard$
DECLARE v_internal int;
BEGIN
  SELECT count(*) INTO v_internal FROM public.atlasoracle_directives WHERE bee_id IS NULL;
  IF v_internal > 0 THEN
    RAISE EXCEPTION
      'DB75 rollback: % internal directive row(s) have bee_id IS NULL. Restoring NOT NULL would '
      'require deleting real audit history — refusing. Reroute internal callers back to their '
      'direct path and reconcile those rows before rolling the schema back.', v_internal;
  END IF;
END $db75_rb_guard$;

ALTER TABLE public.atlasoracle_directives DROP COLUMN IF EXISTS caller_astra;
ALTER TABLE public.atlasoracle_directives DROP COLUMN IF EXISTS caller_kind;
ALTER TABLE public.atlasoracle_directives ALTER COLUMN bee_id SET NOT NULL;
