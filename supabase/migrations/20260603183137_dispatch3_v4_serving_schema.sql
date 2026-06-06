-- =============================================================================
-- Migration 20260603183137 — dispatch3_v4_serving_schema
-- =============================================================================
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-03 via apply_migration.
-- Additive / non-breaking. Unblocks Sunday seeding (time_frame / topical /
-- answer_format tagging) and the Dispatch-#2 serve-filter fields (city,
-- no_repeat_scope). Existing multiple-choice rows satisfy the shape check.
--
-- question_bank: adds time_frame, topical, expires_at, answer_format,
--   accepted_answers; relaxes choices/correct_idx to NULL; constrains
--   answer_format and enforces the per-format shape (MC/true_false need
--   choices+correct_idx; write_in/numeric need accepted_answers).
-- competitions: adds city + no_repeat_scope (competition|user|city).
-- =============================================================================

ALTER TABLE public.question_bank
  ADD COLUMN IF NOT EXISTS time_frame text,
  ADD COLUMN IF NOT EXISTS topical boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS answer_format text NOT NULL DEFAULT 'multiple_choice',
  ADD COLUMN IF NOT EXISTS accepted_answers jsonb;
ALTER TABLE public.question_bank ALTER COLUMN choices DROP NOT NULL;
ALTER TABLE public.question_bank ALTER COLUMN correct_idx DROP NOT NULL;
ALTER TABLE public.question_bank
  ADD CONSTRAINT question_bank_answer_format_check
    CHECK (answer_format IN ('multiple_choice','true_false','write_in','numeric'));
ALTER TABLE public.question_bank
  ADD CONSTRAINT question_bank_format_shape_check CHECK (
    (answer_format IN ('multiple_choice','true_false') AND choices IS NOT NULL AND correct_idx IS NOT NULL)
    OR (answer_format IN ('write_in','numeric') AND accepted_answers IS NOT NULL));
ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS no_repeat_scope text NOT NULL DEFAULT 'user';
ALTER TABLE public.competitions
  ADD CONSTRAINT competitions_no_repeat_scope_check
    CHECK (no_repeat_scope IN ('competition','user','city'));
CREATE INDEX IF NOT EXISTS question_bank_topical_expires_idx
  ON public.question_bank(expires_at) WHERE topical;
CREATE INDEX IF NOT EXISTS question_bank_time_frame_idx
  ON public.question_bank(time_frame) WHERE time_frame IS NOT NULL;
CREATE INDEX IF NOT EXISTS competitions_city_idx
  ON public.competitions(city) WHERE city IS NOT NULL;
