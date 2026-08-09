-- ROLLBACK for 20260809002940_db41_stale_claim_detection_v1.sql
-- WRITTEN BEFORE THE APPLY, per the MIGRATION AMENDMENT.
--
-- Everything the forward migration creates is NEW. There is no prior definition
-- to restore: ops_dispatches.heartbeat_at did not exist, and neither did
-- ops_stale_threshold_minutes, ops_claim_heartbeat, ops_is_rail_admin,
-- ops_stale_claims, ops_release_stale_claim, ops_auto_release_stale_claims.
-- So this rollback is a clean DROP set, and it is exact.
--
-- WHAT YOU LOSE BY RUNNING IT: dropping heartbeat_at discards every heartbeat
-- recorded so far. That is harmless -- staleness falls back to claimed_at, which
-- is the pre-DB41 behaviour -- but it is not recoverable. The forward migration
-- CHANGES NO EXISTING ROW: the column is nullable with no default, so no dispatch
-- body, status, claimed_by or claimed_at is touched by the apply, and none is
-- touched by this rollback either.
--
-- NOT ROLLED BACK BY THIS FILE: any dated release note that
-- ops_release_stale_claim appended to a dispatch body while the RPC was live.
-- Those notes are audit trail written into ops_dispatches.body and they stay.
-- That is deliberate -- a released claim really did happen, and per the
-- audit-trail rule we do not rewrite history to make the record tidier.
--
-- Two dependent views read ops_dispatches (ops_build_progress, ops_pass_durations).
-- Neither references heartbeat_at, so the DROP COLUMN below needs no CASCADE and
-- must not be given one. If DROP COLUMN ever errors with a dependency, STOP and
-- read it -- something was built on the column after this migration.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. RPCs and view (drop before the column they read)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.ops_auto_release_stale_claims(boolean, text);
DROP FUNCTION IF EXISTS public.ops_release_stale_claim(text, text);
DROP VIEW     IF EXISTS public.ops_stale_claims;
DROP FUNCTION IF EXISTS public.ops_claim_heartbeat(text, text);
DROP FUNCTION IF EXISTS public.ops_is_rail_admin();
DROP FUNCTION IF EXISTS public.ops_stale_threshold_minutes();

-- ---------------------------------------------------------------------------
-- 2. The column. No CASCADE -- see the header.
-- ---------------------------------------------------------------------------
ALTER TABLE public.ops_dispatches DROP COLUMN IF EXISTS heartbeat_at;

-- ---------------------------------------------------------------------------
-- 3. Assert the rollback landed. Fails closed (HARNESS_SAFETY rule 2/5:
--    a check that never runs is not a check that passed).
-- ---------------------------------------------------------------------------
DO $rb$
DECLARE v_left int;
BEGIN
  SELECT count(*) INTO v_left
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='ops_dispatches' AND column_name='heartbeat_at';
  IF v_left <> 0 THEN
    RAISE EXCEPTION 'ROLLBACK INCOMPLETE: ops_dispatches.heartbeat_at still present';
  END IF;

  SELECT count(*) INTO v_left
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname='public'
     AND p.proname IN ('ops_stale_threshold_minutes','ops_claim_heartbeat','ops_is_rail_admin',
                       'ops_release_stale_claim','ops_auto_release_stale_claims');
  IF v_left <> 0 THEN
    RAISE EXCEPTION 'ROLLBACK INCOMPLETE: % DB41 routine(s) still present', v_left;
  END IF;

  SELECT count(*) INTO v_left
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname='public' AND c.relname='ops_stale_claims';
  IF v_left <> 0 THEN
    RAISE EXCEPTION 'ROLLBACK INCOMPLETE: view ops_stale_claims still present';
  END IF;

  RAISE NOTICE 'DB41 rollback verified: column, view and 5 routines are gone.';
END
$rb$;

COMMIT;
