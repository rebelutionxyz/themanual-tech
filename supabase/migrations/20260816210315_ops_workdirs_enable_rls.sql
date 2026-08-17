-- Close the RLS gap the Supabase advisor flagged 2026-08-16: ops_workdirs was the
-- only rail table without RLS, leaving it readable/writable to anon+authenticated.
-- Deny-all (RLS on, zero policies) matches ops_reports / ops_dispatches / ops_docs:
-- rail tables are invisible to app clients by design; service_role bypasses RLS.
ALTER TABLE public.ops_workdirs ENABLE ROW LEVEL SECURITY;