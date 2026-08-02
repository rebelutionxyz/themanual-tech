-- =====================================================================
-- DRAFT - NOT APPLIED. DB18, 2026-08-02.
--
-- SEPARATE FILE ON PURPOSE. The CHECK
-- (20260802000000_db18_atoms_type_check.sql) is a pure tightening that
-- rejects nothing currently in the table. THIS file changes what
-- happens to writers, so it must be promotable - and rejectable -
-- independently.
--
-- WHAT THIS CLOSES
--   public.atoms.type is `NOT NULL DEFAULT 'event'`. A bulk INSERT that
--   omits the column therefore stamps 'event' on every row it writes,
--   silently and validly.
--
--   That is not hypothetical. Two staged, unrun imports omit `type`:
--     db/imports/_generated_federal_agencies.sql   446 rows
--     db/imports/companies_migration.sql           349 rows
--   Both insert into realm 'society' at depth >= 4, where all 3497
--   existing rows are type='concept'. Run today, 795 agencies and
--   companies land as 'event'. Nothing in the DB or the app would
--   complain, and the CHECK above would not catch it either - 'event'
--   is a legal value, just the wrong one.
--
--   The admin write path does NOT rely on this default:
--   atom_create(p_type) does COALESCE(p_type, v_parent.type), i.e. it
--   inherits the parent's kind. So the default only ever fires for raw
--   INSERTs - which are exactly the bulk imports that should be stating
--   their vocabulary out loud.
--
-- EFFECT OF APPLYING
--   Any INSERT omitting `type` fails loudly with a NOT NULL violation
--   instead of silently becoming 'event'. That is the intent: the two
--   staged imports SHOULD fail until they name their type.
--
-- ORDER OF OPERATIONS IF BOTH ARE PROMOTED
--   Apply the CHECK first, this second. Reversing them is harmless but
--   leaves a window where writes are unconstrained AND unforgiving.
--
-- DO NOT APPLY THIS UNTIL the two staged imports have been amended to
-- name `type` explicitly, or the lead has decided they are abandoned.
-- Applying it earlier does not break production (no runtime path
-- inserts without `type`), but it does convert a silent-wrong into a
-- hard error at import time - which is the point, and should be a
-- deliberate choice, not a surprise.
-- =====================================================================

BEGIN;

ALTER TABLE public.atoms ALTER COLUMN type DROP DEFAULT;

COMMIT;

-- =====================================================================
-- ROLLBACK (verbatim, single statement)
-- =====================================================================
-- ALTER TABLE public.atoms ALTER COLUMN type SET DEFAULT 'event'::text;
-- =====================================================================

-- =====================================================================
-- VERIFY AFTER APPLY (read-only)
-- =====================================================================
-- SELECT column_name, is_nullable, column_default
--   FROM information_schema.columns
--  WHERE table_schema='public' AND table_name='atoms' AND column_name='type';
--   -> expect is_nullable = NO, column_default = NULL
-- =====================================================================
