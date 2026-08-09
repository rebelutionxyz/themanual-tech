-- ROLLBACK for ops_workdirs_registry_v1 (DB43, 2026-08-08).
--
-- WRITTEN BEFORE THE APPLY, per the MIGRATION AMENDMENT.
--
-- This one is NOT a pure catalog revert: the forward migration REWRITES 29 rows
-- of ops_dispatches.workdir. Dropping the table and the constraints would leave
-- those rewrites in place, and they are not reconstructible by rule -- '.' and
-- NULL both normalise to 'unknown', so nothing in the post-state distinguishes
-- them.
--
-- That is why the forward migration snapshots (id, workdir_before) into
-- public.ops_dispatches_workdir_backup_db43 BEFORE touching a single row. This
-- rollback restores from that snapshot by id, exactly, and only then drops it.
--
-- ORDER MATTERS:
--   1. constraints off  -- the restored values ('.', NULL, the two long strings)
--                          violate both the FK and the NOT NULL, so they must go
--                          first or every UPDATE below fails.
--   2. restore rows     -- from the snapshot, by id.
--   3. drop the view    -- depends on ops_workdirs.
--   4. drop ops_workdirs.
--   5. drop the snapshot -- last, so a failure anywhere above leaves the only
--                           copy of the original values still on disk.
--
-- DATA LOST ON ROLLBACK: nothing from ops_dispatches. The registry rows
-- themselves are lost, but they are a re-derivable inventory of folders, not a
-- ledger.
--
-- IF THE SNAPSHOT IS MISSING, STOP. Do not run steps 3-5 and then hand-repair
-- the 29 rows from memory. The before/after mapping is also recorded in
-- REPORT.md under DB43 section 4, which is the paper backup.

BEGIN;

-- 1. Constraints off, in dependency order.
ALTER TABLE public.ops_dispatches
  DROP CONSTRAINT IF EXISTS ops_dispatches_workdir_fkey;
ALTER TABLE public.ops_dispatches
  ALTER COLUMN workdir DROP NOT NULL;

-- 2. Restore every row this migration touched, by id.
UPDATE public.ops_dispatches d
   SET workdir = b.workdir_before
  FROM public.ops_dispatches_workdir_backup_db43 b
 WHERE d.id = b.id;

-- 3. The view depends on ops_workdirs.
DROP VIEW IF EXISTS public.ops_dispatch_location;

-- 4. The registry.
DROP TABLE IF EXISTS public.ops_workdirs;

-- 5. The snapshot, last.
DROP TABLE IF EXISTS public.ops_dispatches_workdir_backup_db43;

COMMIT;

-- VERIFY AFTER ROLLBACK (expected values are the pre-DB43 measurement):
--   SELECT coalesce(quote_literal(workdir),'NULL') AS w, count(*)
--     FROM public.ops_dispatches GROUP BY workdir ORDER BY 2 DESC;
--   -- 'TheMANUAL.tech' 156 | '.' 16 | 'TheHoneycomb.games' 16 |
--   -- 'atlasJUSTICE.org' 13 | 'HONEYCOMB (workspace root)' 9 | 'HONEYCOMB' 8 |
--   -- 'honeycomb-workspace/atlasJUSTICE.org' 2 | NULL 2      (222 rows total)
