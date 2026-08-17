-- DB51 — GIVE THE ADMIN BACK THE WORKDIR REGISTRY (2026-08-17)
-- ROLLBACK: _drafts/20260817193000_db51_ops_workdirs_admin_read_v1_rollback.sql
--
-- THE DEFECT, AND IT IS A HALF-FINISHED FIX RATHER THAN A BAD ONE. On 2026-08-16
-- public.ops_workdirs was found with RLS DISABLED - anyone holding the publishable
-- key could read or rewrite the workdir registry - and
-- 20260816210315_ops_workdirs_enable_rls.sql closed that. It enabled RLS and added
-- no policy. RLS ON with ZERO policies denies EVERY role that does not bypass it,
-- so the registry went invisible to the admin exactly as it went invisible to the
-- attacker. **The lock was right. The missing policy is the defect.** This
-- migration adds the policy and changes nothing else.
--
-- MEASURED, NOT ASSUMED (read-only, role-switched, in a rolled-back transaction):
--
--   role                      ops_dispatches  ops_workdirs  ops_dispatch_location
--   postgres                       266             19               266
--   authenticated admin @butch     266              0                 0
--   anon                        denied (no grant)   0          denied (no grant)
--
-- public.ops_dispatch_location is security_invoker=true and INNER JOINs
-- ops_workdirs, so a zero-row join collapses the whole view: 266 dispatches
-- became 0 locations. That is the dead folder column on /mc.
--
-- THE PREDICATE IS `is_platform_admin()`, NOT `ops_is_rail_admin()` — the dispatch
-- asked which and why, and the answer is the second half of its own instruction:
-- mirror what ops_dispatches already uses. The live policy is
--
--   ops_dispatches_admin_read : FOR SELECT TO authenticated USING (is_platform_admin())
--
-- and this file reproduces that shape exactly, on ops_workdirs. Both functions
-- exist; they are NOT interchangeable, and picking the other one would have
-- widened the lock rather than mirrored it:
--
--   is_platform_admin()  -> EXISTS(SELECT 1 FROM bees WHERE id = auth.uid() AND is_admin)
--                           A strict admin-Bee test. Nothing else passes.
--   ops_is_rail_admin()  -> returns TRUE when request.jwt.claims is absent (a
--                           direct DB connection) or carries role=service_role,
--                           and otherwise falls through to is_platform_admin().
--
-- Both extra TRUE branches are roles that already bypass RLS entirely, so under a
-- policy they buy nothing - but ops_is_rail_admin() answers a broader question
-- than the one this table needs, and **two different admin predicates on one board
-- is a future incident.** One board, one predicate: is_platform_admin().
--
-- READ ONLY, AND THE LOCK IS NOT LOOSENED. FOR SELECT, TO authenticated. No
-- INSERT, UPDATE or DELETE policy - writes to the registry stay service-role only,
-- which is the entire point of the 08-16 lock. No policy for anon: an
-- unauthenticated browser still gets nothing (and today it cannot even reach
-- ops_dispatch_location, for want of a SELECT grant on ops_dispatches). RLS is not
-- disabled on anything. ops_dispatches, ops_reports and the view definition are
-- untouched.
--
-- WHY ADMIN READ IS SAFE: the registry holds slugs, relative paths, repo names,
-- flags and notes. No secrets, no credentials, no tokens. 19 rows.
--
-- ROWS AT RISK: none. A policy grants visibility; it writes nothing.

CREATE POLICY ops_workdirs_admin_read ON public.ops_workdirs
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

COMMENT ON TABLE public.ops_workdirs IS
  'Workdir registry for the ops rail. RLS ON. Admin Bees READ via '
  'ops_workdirs_admin_read (is_platform_admin(), mirroring ops_dispatches_admin_read); '
  'all WRITES are service-role only, by deliberate absence of any write policy. DB51.';
