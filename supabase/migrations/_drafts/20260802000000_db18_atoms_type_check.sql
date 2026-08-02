-- =====================================================================
-- DRAFT - NOT APPLIED. DB18, 2026-08-02.
--
-- Filed under migrations/_drafts/ and NOT at the top of migrations/,
-- because the Supabase CLI globs only the top level. DB18 is an
-- APPLY-NOTHING pass. To promote:
--   move this file to
--     supabase/migrations/20260802000000_db18_atoms_type_check.sql
-- under an explicit MIGRATION AMENDMENT dispatch that names it and
-- states the rollback (the rollback is at the bottom, verbatim).
--
-- WHAT THIS CLOSES
--   public.atoms.type is `text NOT NULL DEFAULT 'event'` with NO CHECK.
--   Every sibling controlled column on this table has one:
--     atoms_kettle_check, atoms_status_check, atoms_band_check,
--     atoms_depth_check. `type` is the hole in that set.
--
--   src/types/manual.ts:18 declares
--     AtomType = 'person' | 'event' | 'document' | 'organization' | 'place'
--   Production, verified 2026-08-02 against the live DB:
--     city 23877 | concept 9860 | admin1 2247 | neighborhood 1055
--     country 249 | event 123 | admin2 18 | continent 7 | region 1
--     total 37437, zero NULL.
--   ONE of the union's five values exists in the data at all, on 123 of
--   37437 rows (0.33%). The other four describe zero atoms.
--
-- DIRECTION: THE DATA IS AUTHORITATIVE.
--   The nine values below ARE the vocabulary. A CHECK written against
--   the TypeScript union would reject 37314 of 37437 rows. This
--   constraint is generated FROM production, and src/types/manual.ts is
--   the thing that gets corrected - see
--   scripts/_drafts/db18/gen-atom-type.mjs.
--
-- WHY NOT PRE-ADD 'organization' / 'person' / 'document' / 'place'
--   Two bulk imports are staged and unrun (see the companion note in
--   REPORT.md): db/imports/_generated_federal_agencies.sql (446 rows)
--   and db/imports/companies_migration.sql (349 rows). Both would
--   plausibly want 'organization'. Speculatively widening the CHECK to
--   cover values nothing writes yet re-creates the exact drift this
--   pass is closing - a vocabulary that claims more than the data
--   holds. Widen it in its own one-line migration on the day those
--   imports run, and make the imports name `type` explicitly.
--
-- MECHANIC THAT IS EASY TO GET WRONG
--   A plain ADD CONSTRAINT takes ACCESS EXCLUSIVE and full-scans the
--   table while holding it. 37437 rows is small, but the two-step
--   NOT VALID -> VALIDATE form holds the exclusive lock only for the
--   catalog write; VALIDATE runs under SHARE UPDATE EXCLUSIVE and does
--   not block reads or writes. Both steps, in order, or the constraint
--   is enforced on new rows only and quietly unproven on old ones.
-- =====================================================================

BEGIN;

-- Pre-flight assertion. If the vocabulary has moved since 2026-08-02
-- this ABORTS the transaction rather than writing a constraint that
-- silently no longer matches the corpus. Do not remove; re-derive.
DO $$
DECLARE v_bad text;
BEGIN
  SELECT string_agg(DISTINCT type, ', ' ORDER BY type) INTO v_bad
    FROM public.atoms
   WHERE type NOT IN ('admin1','admin2','city','concept','continent',
                      'country','event','neighborhood','region');
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION
      'DB18 pre-flight: atoms.type holds values outside the drafted vocabulary: %. Re-derive the CHECK before applying.',
      v_bad;
  END IF;
END $$;

ALTER TABLE public.atoms
  ADD CONSTRAINT atoms_type_check
  CHECK (type = ANY (ARRAY[
    'admin1'::text,
    'admin2'::text,
    'city'::text,
    'concept'::text,
    'continent'::text,
    'country'::text,
    'event'::text,
    'neighborhood'::text,
    'region'::text
  ]))
  NOT VALID;

ALTER TABLE public.atoms VALIDATE CONSTRAINT atoms_type_check;

COMMENT ON COLUMN public.atoms.type IS
  'Atom kind. Vocabulary is enforced by atoms_type_check and is the SOURCE OF TRUTH for the AtomType union in src/types/manual.ts - regenerate that union from this constraint (scripts/gen-atom-type.mjs), never hand-edit it. Geographic values (city, neighborhood, admin1, admin2, country, continent, region) are written by the geo buildout migrations; concept is the default kind for non-geographic taxonomy; event is history-realm occurrences. DB18, 2026-08-02.';

COMMIT;

-- =====================================================================
-- ROLLBACK (verbatim, single statement)
-- =====================================================================
-- ALTER TABLE public.atoms DROP CONSTRAINT atoms_type_check;
--
-- The COMMENT is informational and survives rollback harmlessly; to
-- also revert it: COMMENT ON COLUMN public.atoms.type IS NULL;
-- =====================================================================

-- =====================================================================
-- VERIFY AFTER APPLY (read-only, run separately)
-- =====================================================================
-- SELECT conname, pg_get_constraintdef(oid), convalidated
--   FROM pg_constraint
--  WHERE conrelid = 'public.atoms'::regclass AND conname = 'atoms_type_check';
--   -> expect convalidated = t
--
-- SELECT count(*) FROM public.atoms;               -> expect 37437
-- SELECT count(DISTINCT type) FROM public.atoms;   -> expect 9
-- =====================================================================
