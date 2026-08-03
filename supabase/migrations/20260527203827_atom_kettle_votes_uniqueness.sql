-- =============================================================================
-- Migration 20260527210000 — atom_kettle_votes uniqueness fix
-- =============================================================================
-- Date:    2026-05-27
-- Author:  Code (Claude Opus 4.7) — supervised by Butch (OG HUMAN)
-- Source:  Spine-v1 follow-up dispatch (OG HUMAN locked Option C — UPSERT)
--
-- Purpose:
--   One vote per Bee per atom; latest tier classification wins. Companion to
--   the kettle-vote Edge Function's INSERT → UPSERT change in the same
--   commit. Bees can change their mind as evidence develops (atom moves
--   from Emerging to Accepted, etc.).
--
-- Pre-flight:
--   Detect duplicate (atom_id, bee_id) rows. Keep highest-id row (latest
--   created via the bigserial sequence). Delete the rest. RAISE NOTICE
--   with dedup count.
--
-- Production state at apply time: atom_kettle_votes is empty (0 rows). The
-- pre-flight dedup is preserved for correctness on any future re-apply
-- against a table that has accumulated duplicates.
-- =============================================================================

BEGIN;

DO $$
DECLARE
    v_dup_count integer;
    v_deleted   integer;
BEGIN
    SELECT count(*) INTO v_dup_count
      FROM (
          SELECT atom_id, bee_id
            FROM public.atom_kettle_votes
           GROUP BY 1, 2
          HAVING count(*) > 1
      ) d;

    IF v_dup_count = 0 THEN
        RAISE NOTICE 'No duplicate (atom_id, bee_id) pairs found — clean apply.';
    ELSE
        RAISE NOTICE 'Found % duplicate (atom_id, bee_id) pairs — deduplicating, keep highest id.', v_dup_count;
        WITH ranked AS (
            SELECT id,
                   row_number() OVER (
                       PARTITION BY atom_id, bee_id
                       ORDER BY id DESC
                   ) AS rn
              FROM public.atom_kettle_votes
        )
        DELETE FROM public.atom_kettle_votes
         WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
        GET DIAGNOSTICS v_deleted = ROW_COUNT;
        RAISE NOTICE 'Deleted % duplicate vote rows.', v_deleted;
    END IF;
END
$$;

ALTER TABLE public.atom_kettle_votes
    DROP CONSTRAINT IF EXISTS atom_kettle_votes_unique_per_bee;
ALTER TABLE public.atom_kettle_votes
    ADD  CONSTRAINT atom_kettle_votes_unique_per_bee
    UNIQUE (atom_id, bee_id);

COMMIT;
