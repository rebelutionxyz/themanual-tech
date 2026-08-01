-- =====================================================================
-- DRAFT - NOT APPLIED. DB14, 2026-08-01.
--
-- Deliberately filed under migrations/_drafts/ and NOT at the top of
-- migrations/, because the Supabase CLI globs only the top level. A file
-- named correctly and sitting in the applied directory is one `db push`
-- away from being live, and DB14 is an APPLY-NOTHING pass. To promote:
--   move this file to  supabase/migrations/20260801130000_db14_narrow_bees_column_exposure.sql
-- under an explicit MIGRATION AMENDMENT dispatch that names it and states
-- the rollback (the rollback is at the bottom of this file, verbatim).
--
-- WHAT THIS CLOSES
--   public.bees today: RLS enabled, policy bees_public_read = USING (true)
--   to PUBLIC, and roles anon + authenticated hold table-level SELECT.
--   Verified functionally 2026-08-01 with the deployed anon key:
--   18/18 rows readable anonymously, including 18 emails, 18 is_admin
--   flags, 18 balances and 1 stripe_customer_id.
--
-- WHY COLUMN GRANTS AND NOT AN RLS CHANGE
--   Narrowing the ROW predicate would break every handle lookup, because
--   those legitimately read OTHER bees' rows. The data that must not leave
--   is column-shaped, not row-shaped, so the grant layer is the right one.
--
-- MECHANIC THAT IS EASY TO GET WRONG
--   A column-level REVOKE is a no-op while the role still holds
--   table-level SELECT. The table grant must be revoked FIRST, then the
--   permitted columns granted back. Both steps or neither.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- STEP 1 - anon. DATABASE-ONLY. Breaks no known call site.
--
-- Evidence for "breaks nothing": the only anon-reachable reads of bees
-- found anywhere are (a) TheHoneycomb.games trivia signUp handle
-- pre-check, which selects id filtered by handle, and (b) the nine
-- SECURITY INVOKER functions below, which need id/handle/name/avatar_url.
-- All of those columns are granted back.
-- ---------------------------------------------------------------------
REVOKE SELECT ON public.bees FROM anon;

GRANT SELECT (
  id, handle, name, avatar_url, bio,
  honeycomb_ring, action_count, bling_rank,
  created_at, updated_at
) ON public.bees TO anon;

-- ---------------------------------------------------------------------
-- STEP 2 - authenticated. REQUIRES THE CLIENT CHANGE IN STEP 3 FIRST.
--
-- This is the quiet half: today ANY signed-up account can read EVERY
-- bee's email. RLS is row-level and cannot express "your own row only"
-- at column granularity, so the sensitive columns come out of the table
-- grant entirely and are served self-scoped by bees_me() below.
--
-- DO NOT APPLY STEP 2 BEFORE THE SEAM REFACTOR IS DEPLOYED. Seven live
-- call sites read email / is_admin / bling_deficit self-scoped and will
-- 403 the moment this runs. They are listed in the DB14 report.
-- ---------------------------------------------------------------------
REVOKE SELECT ON public.bees FROM authenticated;

GRANT SELECT (
  id, handle, name, avatar_url, bio,
  honeycomb_ring, action_count, bling_rank,
  created_at, updated_at
) ON public.bees TO authenticated;

-- ---------------------------------------------------------------------
-- STEP 3 - the self-scoped accessor that replaces those reads.
--
-- SECURITY DEFINER so it is unaffected by the grants above; scoped to
-- auth.uid() so it can only ever return the caller's own row. Numerics
-- cross as text to match the existing client string discipline
-- (bling_deficit can exceed 2^53 - see src/lib/freedomblings/standing.ts).
--
-- stripe_customer_id is deliberately NOT returned. Nothing in any client
-- reads it and it has no business reaching a browser.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bees_me()
RETURNS TABLE (
  id                uuid,
  handle            text,
  email             text,
  name              text,
  avatar_url        text,
  bio               text,
  honeycomb_ring    integer,
  action_count      integer,
  bling_rank        integer,
  bling_balance     text,
  bling_held        text,
  bling_deficit     text,
  is_admin          boolean,
  created_at        timestamptz,
  updated_at        timestamptz,
  handle_changed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id, b.handle, b.email, b.name, b.avatar_url, b.bio,
         b.honeycomb_ring, b.action_count, b.bling_rank,
         b.bling_balance::text, b.bling_held::text, b.bling_deficit::text,
         b.is_admin, b.created_at, b.updated_at, b.handle_changed_at
    FROM public.bees b
   WHERE b.id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.bees_me() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bees_me() TO authenticated;

COMMIT;


-- =====================================================================
-- ROLLBACK - exact, and safe to run at any point after the above.
--
-- Re-granting table-level SELECT supersedes the column grants, so the
-- column grants are dropped first to leave the catalog exactly as found.
-- Run the whole block; it is idempotent.
-- =====================================================================
-- BEGIN;
--
-- REVOKE SELECT (
--   id, handle, name, avatar_url, bio,
--   honeycomb_ring, action_count, bling_rank,
--   created_at, updated_at
-- ) ON public.bees FROM anon;
--
-- REVOKE SELECT (
--   id, handle, name, avatar_url, bio,
--   honeycomb_ring, action_count, bling_rank,
--   created_at, updated_at
-- ) ON public.bees FROM authenticated;
--
-- GRANT SELECT ON public.bees TO anon;
-- GRANT SELECT ON public.bees TO authenticated;
--
-- DROP FUNCTION IF EXISTS public.bees_me();
--
-- COMMIT;
--
-- POST-ROLLBACK VERIFICATION
--   SELECT grantee, privilege_type FROM information_schema.role_table_grants
--    WHERE table_schema='public' AND table_name='bees'
--      AND grantee IN ('anon','authenticated') AND privilege_type='SELECT';
--   -- expect 2 rows
--   SELECT count(*) FROM information_schema.column_privileges
--    WHERE table_schema='public' AND table_name='bees'
--      AND grantee IN ('anon','authenticated') AND privilege_type='SELECT';
--   -- expect 34 (17 columns x 2 roles, implied by the table grant)
-- =====================================================================
