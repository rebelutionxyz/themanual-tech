-- DB43 -- MAKE workdir CANONICAL: a dispatch must always know its folder
--
-- ROLLBACK: supabase/migrations/_drafts/20260809014029_ops_workdirs_registry_v1_rollback.sql
--           Written FIRST, per the MIGRATION AMENDMENT. It restores from the
--           snapshot table this migration creates in step 1.
--
-- POINTER CORRECTED AFTER THE APPLY, deliberately. apply_migration stamps its
-- own version (DB26): the provisional filename was ...013000, the stamp came
-- back ...014029, and both files were renamed to the stamped version. This ONE
-- comment line therefore differs from the text held in
-- supabase_migrations.schema_migrations, which still names ...013000.
--
-- The catalog is the audit record of what ran and is untouched. The repo file is
-- what a human opens, and a header pointing at a filename that does not exist is
-- actively misleading -- DB39 left exactly that dangling pointer earlier today
-- and it had to be written up as drift. Fixing the pointer and declaring the
-- one-line divergence beats reproducing the trap. Recorded in REPORT.md, DB43 s6.
--
-- ============================================================================
-- THE PROBLEM, MEASURED
-- ============================================================================
-- ops_dispatches.workdir exists but is free text with no default and no
-- constraint. 222 rows carry EIGHT distinct spellings of roughly five places:
--
--   'TheMANUAL.tech'                        156
--   '.'                                      16   <- meaningless without context
--   'TheHoneycomb.games'                     16
--   'atlasJUSTICE.org'                       13
--   'HONEYCOMB (workspace root)'              9   <- prose, not a path
--   'HONEYCOMB'                               8   <- same place, second spelling
--   'honeycomb-workspace/atlasJUSTICE.org'    2   <- root-repo-relative spelling
--   NULL                                      2
--
-- A terminal cannot resolve that without guessing, which is exactly what R2b's
-- CD RULE now asks it to do.
--
-- ============================================================================
-- PATHS ARE RELATIVE, DELIBERATELY
-- ============================================================================
-- rel_path is relative to the workspace root. Absolute paths are machine-local
-- and this table has to survive a different machine. The root itself is '.'.
--
-- ============================================================================
-- WHAT WAS MEASURED ON DISK, NOT INFERRED
-- ============================================================================
-- Every row below was read off the filesystem: the folder exists, and
-- is_git_repo reflects whether it holds a .git. `repo` was parsed out of each
-- .git/config url (final path segment only) rather than guessed from the folder
-- name -- which is how the root turns out to be 'honeycomb-workspace', the very
-- string that produced the legacy 'honeycomb-workspace/atlasJUSTICE.org' value.
--
-- NOTE: atlasJUSTICE.org is NOT its own git repo. It is a folder inside the root
-- repo, despite canon referring to "the repo edition (atlasJUSTICE.org/CLAUDE.md)".
--
-- ============================================================================
-- '.' AND NULL GO TO 'unknown', ON THE DISPATCH'S EXPLICIT RULING
-- ============================================================================
-- 18 rows, all closed. The dispatch said do NOT guess, and it is right that a
-- wrong attribution in a ledger is worse than an honest gap -- so they map to an
-- inactive 'unknown' slug.
--
-- Recorded because it is evidence, not a suggestion to act on: those 16 '.' rows
-- are not homogeneous. 13 are lane='games' TRIV passes and 3 are lane='ops'
-- (OPS28 is titled "MOVE pull-rail to HONEYCOMB root"). A follow-up pass could
-- re-attribute most of them from lane+title. That is a separate, deliberate
-- decision with its own dispatch -- not something to slip into a normalisation.

BEGIN;

-- ============================================================================
-- 1. SNAPSHOT FIRST. Nothing is rewritten until the originals are on disk.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ops_dispatches_workdir_backup_db43 (
  id             uuid PRIMARY KEY,
  workdir_before text          -- nullable ON PURPOSE: two rows really are NULL
);

INSERT INTO public.ops_dispatches_workdir_backup_db43 (id, workdir_before)
SELECT id, workdir FROM public.ops_dispatches
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.ops_dispatches_workdir_backup_db43 IS
  'DB43 pre-normalisation snapshot of ops_dispatches.workdir. The rollback '
  'restores from this by id. Retained deliberately -- it is the only record that '
  'distinguishes the 16 dot-rows from the 2 NULL rows, which both became unknown.';

ALTER TABLE public.ops_dispatches_workdir_backup_db43 ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. THE REGISTRY
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ops_workdirs (
  slug        text PRIMARY KEY,
  rel_path    text    NOT NULL,
  repo        text,
  is_git_repo boolean NOT NULL DEFAULT true,
  notes       text,
  active      boolean NOT NULL DEFAULT true,
  CONSTRAINT ops_workdirs_slug_nonempty     CHECK (length(btrim(slug)) > 0),
  CONSTRAINT ops_workdirs_rel_path_nonempty CHECK (length(btrim(rel_path)) > 0),
  -- A relative path, enforced. Blocks 'C:\...' and '/home/...' from ever being
  -- stored, which is the whole point of the column being relative.
  CONSTRAINT ops_workdirs_rel_path_is_relative
    CHECK (rel_path = '(unknown)' OR (rel_path !~ '^([A-Za-z]:|[\\/])' AND rel_path !~ '\.\.')),
  -- The escape hatch cannot masquerade as a real place.
  CONSTRAINT ops_workdirs_unknown_is_inactive
    CHECK (slug <> 'unknown' OR active = false)
);

COMMENT ON TABLE public.ops_workdirs IS
  'Canonical registry of workdirs a dispatch may cite. rel_path is relative to '
  'the workspace root so the table survives a different machine. DB43.';

INSERT INTO public.ops_workdirs (slug, rel_path, repo, is_git_repo, notes, active) VALUES
  ('HONEYCOMB',          '.',                  'honeycomb-workspace',       true,
     'The workspace root. A root session stays here -- R2b says a root session never bounces.', true),
  ('TheMANUAL.tech',     'TheMANUAL.tech',     'themanual-tech',            true,
     'Production platform, themanual.tech. Vite + React + Supabase.', true),
  ('TheHoneycomb.games', 'TheHoneycomb.games', 'TheHoneycomb.games',        true,
     'Trivia / games astra.', true),
  ('FreedomBLiNGS.com',  'FreedomBLiNGS.com',  'freedomblings-coming-soon', true,
     'Currency astra landing site.', true),
  ('honeycomb-ops',      'honeycomb-ops',      'honeycomb-ops',             true,
     'Ops tooling repo.', true),
  ('atlasJUSTICE.org',   'atlasJUSTICE.org',   NULL,                        false,
     'NOT its own git repo -- a folder inside the root repo, tracked by honeycomb-workspace.', true),
  ('TheWORKSHOP.to',     'TheWORKSHOP.to',     NULL,                        false,
     'Orchestration system. Folder inside the root repo.', true),
  ('AtlasORACLE.to',     'AtlasORACLE.to',     NULL,                        false,
     'Folder inside the root repo.', true),
  ('AtlasVOTE.org',      'AtlasVOTE.org',      NULL,                        false,
     'Folder inside the root repo.', true),
  ('DingleBERRY.tech',   'DingleBERRY.tech',   NULL,                        false,
     'Security / monitoring astra. Folder inside the root repo.', true),
  ('MiniWAVES.app',      'MiniWAVES.app',      NULL,                        false,
     'Folder inside the root repo.', true),
  ('freedomofthe.press', 'freedomofthe.press', NULL,                        false,
     'Folder inside the root repo.', true),
  ('unknown',            '(unknown)',          NULL,                        false,
     'Escape hatch for 18 closed pre-registry rows whose workdir was ''.'' or NULL. '
     'Not a place. Never cite this in a new dispatch.', false)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 3. NORMALISE -- rows first, constraints after, or the constraints reject them
-- ============================================================================
UPDATE public.ops_dispatches SET workdir = 'HONEYCOMB'
 WHERE workdir = 'HONEYCOMB (workspace root)';

UPDATE public.ops_dispatches SET workdir = 'atlasJUSTICE.org'
 WHERE workdir = 'honeycomb-workspace/atlasJUSTICE.org';

UPDATE public.ops_dispatches SET workdir = 'unknown'
 WHERE workdir = '.' OR workdir IS NULL;

-- ============================================================================
-- 4. CONSTRAIN so it cannot regress
-- ============================================================================
-- No DEFAULT, deliberately. A silent default is how 155 rows of one value and 16
-- rows of '.' happen in the first place -- the author must choose.
--
-- CONSEQUENCE, STATED PLAINLY: after this, every INSERT into ops_dispatches must
-- name a valid slug. Lead queueing tooling that omits workdir will start failing
-- with a NOT NULL violation. That is the intended behaviour of this pass, not a
-- side effect -- but it takes effect the moment this commits.
ALTER TABLE public.ops_dispatches
  ALTER COLUMN workdir SET NOT NULL;

ALTER TABLE public.ops_dispatches
  ADD CONSTRAINT ops_dispatches_workdir_fkey
  FOREIGN KEY (workdir) REFERENCES public.ops_workdirs(slug)
  ON UPDATE CASCADE      -- renaming a slug follows the dispatches
  ON DELETE RESTRICT;    -- a registry row with dispatches behind it cannot vanish

-- The FK needs this to stay cheap on the referencing side.
CREATE INDEX IF NOT EXISTS ops_dispatches_workdir_idx
  ON public.ops_dispatches (workdir);

-- ============================================================================
-- 5. EXPOSE IT -- "where do I work" becomes a lookup, never a guess
-- ============================================================================
-- security_invoker so the underlying ops_dispatches RLS still decides who sees
-- what. Same pattern DB41 used for ops_stale_claims.
CREATE OR REPLACE VIEW public.ops_dispatch_location
WITH (security_invoker = true) AS
SELECT d.pass,
       d.lane,
       d.status,
       d.workdir           AS workdir_slug,
       w.rel_path,
       w.repo,
       w.is_git_repo,
       w.active            AS workdir_active
  FROM public.ops_dispatches d
  JOIN public.ops_workdirs  w ON w.slug = d.workdir;

COMMENT ON VIEW public.ops_dispatch_location IS
  'pass -> workdir slug -> rel_path in one read. DB43, backs the R2b CD RULE.';

-- Read-only, matching ops_dispatches (authenticated=r); RLS on the base table
-- still applies through security_invoker.
GRANT SELECT ON public.ops_workdirs           TO authenticated, service_role;
GRANT SELECT ON public.ops_dispatch_location  TO authenticated, service_role;

COMMIT;
