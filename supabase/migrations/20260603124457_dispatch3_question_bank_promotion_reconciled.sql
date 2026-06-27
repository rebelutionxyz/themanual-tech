-- =============================================================================
-- Migration 20260603124457 — dispatch3_question_bank_promotion_reconciled
-- =============================================================================
-- BACKFILL of the version already APPLIED to production (anxmqiehpyznifqgskzc).
-- Repo-parity reconstruction: function bodies are verbatim from the live catalog
-- (pg_get_functiondef, 2026-06-03); column/grants reflect live state.
-- Supersedes the earlier local draft 20260602140000_question_bank_provenance_promotion.sql
-- (removed — that draft differed: it added an index + extended the public view +
--  used similarity 0.55 + a RAISE NOTICE drip stub; none of that is in prod).
--
-- Adds: question_bank.source_atom_id (atom provenance), exec_similarity_check
-- (pg_trgm near-dup), drip_award_stub (Sourcer Drips placeholder, no-op), and
-- question_bank_promote (admin-gated validated->live; house admin-gate pattern).
-- NOTE: question_bank_public is intentionally NOT modified here (prod view is the
-- original 7-column form without source_atom_id).
-- =============================================================================

BEGIN;

-- Provenance link from an atom-grounded question to its atom.
ALTER TABLE public.question_bank
    ADD COLUMN IF NOT EXISTS source_atom_id text REFERENCES public.atoms(id) ON DELETE SET NULL;

-- pg_trgm near-duplicate detector (0.7 threshold). Used by generate-questions.
CREATE OR REPLACE FUNCTION public.exec_similarity_check(p_realm text, p_prompt text)
RETURNS TABLE(is_duplicate boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.question_bank qb
    WHERE qb.realm = p_realm AND similarity(qb.prompt, p_prompt) > 0.7
  );
$function$;
REVOKE EXECUTE ON FUNCTION public.exec_similarity_check(text,text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.exec_similarity_check(text,text) TO authenticated, service_role;

-- Sourcer Drips hook — no-op stub (full economy later).
CREATE OR REPLACE FUNCTION public.drip_award_stub(p_bee_id uuid, p_question_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public'
AS $function$ BEGIN RETURN; END; $function$;
REVOKE EXECUTE ON FUNCTION public.drip_award_stub(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.drip_award_stub(uuid,uuid) TO service_role;

-- Promotion gate: validated -> live. Admin-only (house gate: service_role bypass).
CREATE OR REPLACE FUNCTION public.question_bank_promote(p_question_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE v_is_admin boolean; v_status text; v_source text; v_creator uuid;
BEGIN
  IF auth.role() = 'service_role' THEN NULL;
  ELSE
    SELECT is_admin INTO v_is_admin FROM public.bees WHERE id = auth.uid();
    IF v_is_admin IS NOT TRUE THEN RAISE EXCEPTION 'unauthorized: platform admin required'; END IF;
  END IF;

  SELECT status, source, creator_bee_id INTO v_status, v_source, v_creator
    FROM public.question_bank WHERE id = p_question_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'question % not found', p_question_id; END IF;
  IF v_status <> 'validated' THEN
    RAISE EXCEPTION 'only validated questions can be promoted (current status=%)', v_status;
  END IF;

  UPDATE public.question_bank SET status = 'live' WHERE id = p_question_id;
  IF v_source = 'sourcer' AND v_creator IS NOT NULL THEN
    PERFORM public.drip_award_stub(v_creator, p_question_id);
  END IF;
  RETURN jsonb_build_object('ok', true, 'question_id', p_question_id, 'status', 'live');
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.question_bank_promote(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.question_bank_promote(uuid) TO authenticated, service_role;

COMMIT;
