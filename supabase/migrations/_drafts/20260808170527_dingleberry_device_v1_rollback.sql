-- ROLLBACK for 20260808170527_dingleberry_device_v1.sql
--
-- WRITTEN AFTER THE FACT, and that is the whole point of this file. The forward
-- migration was applied directly through the Supabase connection early on 2026-08-08,
-- before the rail workflow was established, so it never got a repo file and never got
-- a rollback. DB42 adopted the applied text back into the repo byte-for-byte
-- (8,533 bytes, matching octet_length(statements[1]) exactly) and wrote this to close
-- the gap. Nothing here has been executed.
--
-- DESTRUCTIVE. Unlike every other rollback in this folder, this one DROPS TABLES.
-- Measured at adoption time (2026-08-09): all four tables held ZERO rows, so running
-- it then would have destroyed nothing. THAT WILL NOT STAY TRUE. These tables are the
-- user-facing device-security rail; the moment a Bee enrolls a device or runs a scan
-- they hold real Bee data. RE-COUNT BEFORE RUNNING:
--
--   select 'devices', count(*) from public.dingleberry_devices
--   union all select 'scans',    count(*) from public.dingleberry_scans
--   union all select 'findings', count(*) from public.dingleberry_findings
--   union all select 'events',   count(*) from public.dingleberry_events;
--
-- Any non-zero count means this stops and asks. Destructive DDL on a table holding
-- real data is never a routine apply (root CLAUDE.md, MIGRATION AMENDMENT).
--
-- DROP ORDER. Routines first, then tables child-before-parent so no FK blocks a drop:
--   findings -> references scans AND devices
--   scans    -> references devices
--   devices  -> references bees (not dropped)
--   events   -> NO foreign keys at all (loose uuid columns), so its position is free.
-- Indexes and policies are dropped implicitly with their tables and are not listed.
-- No CASCADE anywhere: if something outside this migration has come to depend on these
-- tables since, the drop must FAIL and be read, not silently take the dependent with it.
-- Checked at adoption time: no routine outside the three below references these tables.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. The three RPCs. Signatures must match exactly or the DROP is a no-op that
--    IF EXISTS will happily hide.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.dingleberry_scan_start(text, text[], text);
DROP FUNCTION IF EXISTS public.dingleberry_scan_report(uuid, bigint, jsonb, text);
DROP FUNCTION IF EXISTS public.dingleberry_finding_act(uuid, text);

-- ---------------------------------------------------------------------------
-- 2. The four tables, child before parent. No CASCADE.
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.dingleberry_events;
DROP TABLE IF EXISTS public.dingleberry_findings;
DROP TABLE IF EXISTS public.dingleberry_scans;
DROP TABLE IF EXISTS public.dingleberry_devices;

-- ---------------------------------------------------------------------------
-- 3. Assert the rollback landed. Fails closed (HARNESS_SAFETY rule 5).
-- ---------------------------------------------------------------------------
DO $rb$
DECLARE v_left int;
BEGIN
  SELECT count(*) INTO v_left
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind = 'r'
     AND c.relname IN ('dingleberry_devices','dingleberry_scans',
                       'dingleberry_findings','dingleberry_events');
  IF v_left <> 0 THEN
    RAISE EXCEPTION 'ROLLBACK INCOMPLETE: % dingleberry device table(s) still present', v_left;
  END IF;

  SELECT count(*) INTO v_left
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('dingleberry_scan_start','dingleberry_scan_report','dingleberry_finding_act');
  IF v_left <> 0 THEN
    RAISE EXCEPTION 'ROLLBACK INCOMPLETE: % dingleberry device RPC(s) still present', v_left;
  END IF;

  RAISE NOTICE 'dingleberry_device_v1 rollback verified: 4 tables and 3 routines are gone.';
END
$rb$;

COMMIT;
