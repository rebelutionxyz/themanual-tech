-- =====================================================================
-- Migration 20260606195105 — question_bank_public_security_invoker
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-06 via apply_migration.
-- Clears the SECURITY DEFINER view ERROR lint on question_bank_public WITHOUT
-- leaking the answer key.
--
-- security_invoker=on makes the view respect the caller's RLS. To keep live
-- questions publicly readable we add a live-read RLS policy on question_bank;
-- to keep the answer key safe we move base-table SELECT for anon/authenticated
-- to a COLUMN grant of the 8 safe view columns only (correct_idx and
-- accepted_answers are NOT granted). Those remain reachable solely via
-- SECURITY DEFINER RPCs (comp_submit_answer) and service_role (generate-questions).
--
-- Verified rollback-wrapped pre-apply: anon reads 10/10 live rows via the view;
-- has_column_privilege(anon, correct_idx)=false, accepted_answers=false,
-- prompt=true. Frontend has no direct correct_idx / question_bank reads (grep-clean).
-- BEHAVIOR CHANGE: admins/creators no longer read correct_idx/accepted_answers via
-- the table directly — only via RPC. (No such direct reader exists in src today.)
-- =====================================================================

ALTER VIEW public.question_bank_public SET (security_invoker = on);

REVOKE SELECT ON public.question_bank FROM anon, authenticated;
GRANT SELECT (id, realm, prompt, choices, difficulty, status, source_atom_id, created_at)
  ON public.question_bank TO anon, authenticated;

DROP POLICY IF EXISTS question_bank_live_public_read ON public.question_bank;
CREATE POLICY question_bank_live_public_read ON public.question_bank
  FOR SELECT TO anon, authenticated USING (status = 'live');
