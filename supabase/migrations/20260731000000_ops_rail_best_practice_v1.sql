-- ============================================================================
-- OPS41 — rail best practice v1. Butch-authorized 2026-07-31.
--
-- ADDITIVE + ONE CORRECTIVE RENAME. No existing column is altered or dropped;
-- the claim's WHERE clause and its FOR UPDATE SKIP LOCKED are untouched.
--
-- STEP 1  resolve the OPS9 pass-id collision by RENAME (history is the point)
-- STEP 2  enforce pass uniqueness, which is what makes after_pass name-matching
--         provably safe: exactly one row can satisfy a gate
-- STEP 3  claimed_by — the rail records WHICH terminal holds a pass
-- ============================================================================

-- ─────────────────────────────────────────────────── STEP 1: the collision
-- Two dispatches carried pass 'OPS9', both status done:
--   a100a9c0… 11:21:04Z  "OPS9 — REWRITTEN: repo recon…"   <- the real OPS9, KEEPS the id
--   2ae422fc… 11:57:02Z  "SWEEP — boot-block tail"          <- the intruder, RENAMED
--
-- The collision is TWO-LAYER and the dispatch only named one: public.ops_reports
-- also holds two rows at pass 'OPS9' — the sweep's report (12:05:39Z) and the
-- recon's (13:47:08Z). Renaming the dispatch alone would leave the sweep's
-- report attributed to the recon pass, which is the exact mis-attribution this
-- pass exists to end. So the report moves with its dispatch.

UPDATE public.ops_dispatches
   SET pass  = 'OPS9-SWEEP',
       title = title || '  [pass id renamed OPS9 -> OPS9-SWEEP by OPS41, 2026-07-31:'
                     || ' collided with the 11:21Z repo-recon OPS9; renamed, never deleted,'
                     || ' to unblock the uniqueness index]'
 WHERE id = '2ae422fc-d14d-4e3a-a8fa-92f2d791d6c2'
   AND pass = 'OPS9';

UPDATE public.ops_reports
   SET pass = 'OPS9-SWEEP'
 WHERE pass = 'OPS9'
   AND title LIKE 'SWEEP%';

-- ─────────────────────────────────────────────────── STEP 2: uniqueness
-- Shape is the dispatch's, deliberately: a live pass id can never collide, and a
-- cancelled one may be recycled. NOTE FOR THE LEAD (argued in the report, not
-- silently changed): 'cancelled' is NOT in ops_dispatches_status_check, whose
-- members are queued/claimed/done/superseded. So this exclusion is currently
-- INERT — it matches every row. It is kept as written because it is
-- forward-compatible and harmless; the rail's actual recycle state is
-- 'superseded'.
CREATE UNIQUE INDEX ops_dispatches_pass_uidx
  ON public.ops_dispatches (pass)
  WHERE status <> 'cancelled';

-- ─────────────────────────────────────────────────── STEP 3: claimed_by
-- Nullable and undefaulted ON PURPOSE: an older wrapper that supplies no
-- identifier must still claim successfully. A missing identifier NEVER fails a
-- claim — it just leaves the column NULL, which reads as "unknown terminal".
ALTER TABLE public.ops_dispatches ADD COLUMN claimed_by text;

COMMENT ON COLUMN public.ops_dispatches.claimed_by IS
  'Which terminal holds this pass. Populated by the canonical claim from the '
  'spawner-supplied session tag (OPS32 window tag, e.g. "MC3 · TheHoneycomb.games") '
  'via env MC_SESSION. NULL = claimed by a wrapper that supplies no identifier; '
  'never a claim failure.';
