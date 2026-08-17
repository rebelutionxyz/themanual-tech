-- ROLLBACK for 20260817193000_db51_ops_workdirs_admin_read_v1.sql
-- DB51, 2026-08-17. WRITTEN BEFORE THE FORWARD MIGRATION, per the MIGRATION
-- AMENDMENT (root CLAUDE.md R7).
--
-- WHAT RUNNING THIS RESTORES: the state 20260816210315_ops_workdirs_enable_rls.sql
-- left behind - RLS ON with ZERO policies on public.ops_workdirs, which denies
-- every role that does not bypass RLS. The workdir registry goes invisible to the
-- admin again (0 rows), and public.ops_dispatch_location, being
-- security_invoker=true, dies on the ops_workdirs join and returns 0 rows to the
-- admin as well. The folder column on /mc goes dead again.
--
-- IT REMOVES NO DATA AND LOOSENS NOTHING. The forward migration adds one
-- read-only policy; dropping it can only make the table MORE closed. There is no
-- window in which running this exposes anything.
--
-- NOT SYMMETRIC IN ONE DIRECTION ONLY, AND DELIBERATELY SO: the forward migration
-- does not touch grants, RLS enablement, write policies, ops_dispatches,
-- ops_reports, or the ops_dispatch_location view definition, so neither does this.

drop policy if exists ops_workdirs_admin_read on public.ops_workdirs;
