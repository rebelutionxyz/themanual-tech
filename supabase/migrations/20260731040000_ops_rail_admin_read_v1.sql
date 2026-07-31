-- OPS34 — /mc web board. Butch ruling 2026-07-31: "wide step titles and progress bar."
--
-- WIDE = a signed-in PLATFORM ADMIN can read the rail in the browser. Everyone
-- else — including a signed-in non-admin Bee, and every anonymous visitor — sees
-- nothing. Not a filtered subset: nothing.
--
-- WHY WIDE IS SAFE TODAY, AND THE CONDITION ON IT:
--   The admin set is ONE person. Granting a second bees.is_admin hands that
--   person every dispatch body and every report on the rail. Revisit this
--   migration the day a second admin exists. See OPS34's report for the
--   admin-count check.
--
-- SELECT ONLY. No INSERT/UPDATE/DELETE/TRUNCATE is granted anywhere here. The
-- board is a viewer; claiming stays in the terminals where R2 puts it.
--
-- ops_messages is DELIBERATELY NOT IN SCOPE (least privilege). If a UI needs it,
-- that is a new ruling, not an extension of this one.
--
-- ROLLBACK is at the foot of this file.

BEGIN;

-- ── 1. anon is denied everywhere, explicitly, not by default ────────────────
-- Supabase blankets `GRANT ALL ... TO anon` over the public schema. DB11 proved
-- tonight that trusting the default is how a view ends up handing anon write
-- access. Revoke rather than assume, on the base tables AND on the OPS33 views.
REVOKE ALL ON public.ops_dispatches      FROM anon;
REVOKE ALL ON public.ops_reports         FROM anon;
REVOKE ALL ON public.ops_build_steps     FROM anon;
REVOKE ALL ON public.ops_build_progress  FROM anon;
REVOKE ALL ON public.ops_pass_durations  FROM anon;
REVOKE ALL ON public.ops_effort_stats    FROM anon;
REVOKE ALL ON public.ops_build_rollup    FROM anon;
REVOKE ALL ON public.ops_build_honeycomb FROM anon;

-- The views are security_invoker=true (OPS34-Q verified all five), so they read
-- the base tables AS THE CALLER and cannot become a bypass. Authenticated needs
-- them readable; the base-table policies below are what actually gate the rows.
REVOKE ALL     ON public.ops_build_progress  FROM authenticated;
REVOKE ALL     ON public.ops_pass_durations  FROM authenticated;
REVOKE ALL     ON public.ops_effort_stats    FROM authenticated;
REVOKE ALL     ON public.ops_build_rollup    FROM authenticated;
REVOKE ALL     ON public.ops_build_honeycomb FROM authenticated;
GRANT  SELECT  ON public.ops_build_progress  TO authenticated;
GRANT  SELECT  ON public.ops_pass_durations  TO authenticated;
GRANT  SELECT  ON public.ops_effort_stats    TO authenticated;
GRANT  SELECT  ON public.ops_build_rollup    TO authenticated;
GRANT  SELECT  ON public.ops_build_honeycomb TO authenticated;

-- ── 2. SELECT-only for authenticated on the two base tables ────────────────
-- ops_build_steps already carries SELECT to authenticated; stated here so the
-- migration is a complete description of the end state.
GRANT SELECT ON public.ops_dispatches  TO authenticated;
GRANT SELECT ON public.ops_reports     TO authenticated;
GRANT SELECT ON public.ops_build_steps TO authenticated;

-- ── 3. RLS policies: admin-only, mirroring ops_build_steps_admin_read ───────
-- RLS is already ENABLED on all three with zero policies (= deny all). Adding a
-- SELECT policy is the entire change; no policy is added for any write command,
-- so writes stay impossible for authenticated regardless of grants.
CREATE POLICY ops_dispatches_admin_read ON public.ops_dispatches
  FOR SELECT TO authenticated USING (public.is_platform_admin());

CREATE POLICY ops_reports_admin_read ON public.ops_reports
  FOR SELECT TO authenticated USING (public.is_platform_admin());

COMMIT;

-- ── ROLLBACK ────────────────────────────────────────────────────────────────
-- BEGIN;
--   DROP POLICY IF EXISTS ops_dispatches_admin_read ON public.ops_dispatches;
--   DROP POLICY IF EXISTS ops_reports_admin_read    ON public.ops_reports;
--   REVOKE SELECT ON public.ops_dispatches  FROM authenticated;
--   REVOKE SELECT ON public.ops_reports     FROM authenticated;
--   -- ops_build_steps keeps its pre-existing authenticated SELECT grant.
--   -- The anon REVOKEs above are deliberately NOT undone: restoring a blanket
--   -- anon grant on rail tables would be a regression, not a rollback.
-- COMMIT;
