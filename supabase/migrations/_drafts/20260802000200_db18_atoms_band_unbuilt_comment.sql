-- =====================================================================
-- DRAFT - NOT APPLIED. DB18 / OPS54 R15, 2026-08-02.
--
-- COMMENT ONLY. No DDL, no data touched, no constraint changed. This is
-- the cheapest possible artefact and exists solely so the next schema
-- audit does not spend a second pass rediscovering the same nothing.
--
-- WHAT WAS FOUND
--   public.atoms.band is `text NULL` with
--     atoms_band_check = CHECK (band IS NULL OR band IN
--                               ('commons','hub','nova','facet'))
--   Verified 2026-08-02: count(band) = 0 across all 37437 rows. Every
--   row is NULL. The constraint has never rejected anything because
--   nothing has ever been written.
--
--   The existing comment (from the 2026-06-09 design walk) reads:
--     "Four-axis classification (commons|hub|nova|facet) gating which
--      surfaces an atom instantiates. NULL = unclassified."
--   That describes the DESIGN accurately and the STATE misleadingly.
--   "NULL = unclassified" reads as "some are classified, these are
--   not". Zero are classified. The mechanism is unbuilt, not
--   under-populated - atom_create/atom_update accept p_band and would
--   write it, but no caller passes one and no read path consults it.
--
-- WHY A COMMENT AND NOT A DROP
--   The column is free (NULL storage), the CHECK is correct, and the
--   band design is live canon. Dropping it would cost a migration to
--   put back. The defect is documentation, so the fix is documentation.
-- =====================================================================

BEGIN;

COMMENT ON COLUMN public.atoms.band IS
  'Four-axis classification (commons|hub|nova|facet) gating which surfaces an atom instantiates. Design walk 2026-06-09. UNBUILT AS OF 2026-08-02: all 37437 rows are NULL, no write path populates it (atom_create/atom_update accept p_band but no caller passes one) and no read path consults it. Treat a NULL here as "the mechanism has not shipped", not as "this atom is unclassified". DB18 / OPS54 R15.';

COMMIT;

-- =====================================================================
-- ROLLBACK (verbatim, restores the 2026-06-09 comment exactly)
-- =====================================================================
-- COMMENT ON COLUMN public.atoms.band IS
--   'Four-axis classification (commons|hub|nova|facet) gating which surfaces an atom instantiates. NULL = unclassified. Design walk 2026-06-09.';
-- =====================================================================
