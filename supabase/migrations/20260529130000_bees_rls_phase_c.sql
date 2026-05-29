-- =============================================================================
-- Migration 20260529130000 — bees RLS lockdown, PHASE C (BREAKING)
-- =============================================================================
-- Status:  UNAPPLIED. Butch reviews + applies via Supabase tooling.
-- ⚠ APPLY ORDER: this is the LAST step. Apply ONLY after:
--     1. Phase A (20260529120000) is applied, AND
--     2. The Phase B frontend (callers repointed to bees_public / RPCs) is
--        DEPLOYED to production.
--   Applying this before the Phase B deploy WILL break INTEL author handles,
--   HQ Active Bees / Admin Actions, and the public-facing kettle-vote feed.
--
-- What it does: removes anon's ability to read the bees table at all, and
-- restricts authenticated reads to the caller's OWN row. This closes the
-- email/bling_balance/is_admin exposure that `bees_public_read USING(true)`
-- left open. Public reads now flow through the bees_public view (safe columns,
-- owner-run) and the self/admin SECURITY DEFINER RPCs from Phase A — all of
-- which bypass these revokes because they run as the function/view owner.
--
-- Untouched: bees_insert_self + bees_update_self policies remain, so signup
-- (auth.tsx) and profile edits (ProfileSection) keep working.
-- =============================================================================

BEGIN;

-- 1. Remove the permissive public-read policy (row-level USING(true) exposed
--    every column to anon/authenticated for all rows).
DROP POLICY IF EXISTS "bees_public_read" ON public.bees;

-- 2. Authenticated bees may read ONLY their own row.
DROP POLICY IF EXISTS bees_self_select ON public.bees;
CREATE POLICY bees_self_select ON public.bees
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- 3. anon loses direct table SELECT entirely (it reads via bees_public).
REVOKE SELECT ON public.bees FROM anon;

COMMIT;

-- =============================================================================
-- SMOKE TESTS (run AFTER apply)
-- =============================================================================
-- As anon (anon key, no session):
--   SELECT email FROM public.bees LIMIT 1;            -- ERROR: permission denied
--   SELECT id, handle FROM public.bees_public LIMIT 1;-- OK (safe columns)
-- As authenticated bee A:
--   SELECT email FROM public.bees WHERE id != auth.uid(); -- 0 rows (RLS hides others)
--   SELECT * FROM public.bees WHERE id = auth.uid();       -- OK (own row, all cols)
--   SELECT public.my_bling_balance();                      -- A's balance
--   SELECT public.am_i_admin();                            -- A's admin flag
-- As non-admin:   SELECT * FROM public.list_bees_admin();  -- ERROR 'admin only'
-- As admin:       SELECT * FROM public.list_bees_admin(5,0);-- up to 5 rows
-- Regression:     sign up a new bee + edit a profile bio   -- still works
--                 (insert/update policies untouched).
-- =============================================================================
-- ROLLBACK (reference only — restores the prior permissive posture)
-- =============================================================================
-- BEGIN;
-- GRANT SELECT ON public.bees TO anon;
-- DROP POLICY IF EXISTS bees_self_select ON public.bees;
-- DROP POLICY IF EXISTS "bees_public_read" ON public.bees;
-- CREATE POLICY "bees_public_read" ON public.bees FOR SELECT USING (true);
-- COMMIT;
