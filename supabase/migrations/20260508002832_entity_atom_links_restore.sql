-- Restore entity_atom_links semantic columns dropped during the Apr 25 taxonomy
-- rebuild (supabase/02_create_new_taxonomy.sql), and add the missing INSERT/DELETE
-- policies that schema-v2-surfaces.sql originally specified.
--
-- Code 15 diagnostic: shared/notes/audits/audit-entity-atom-links-2026-05-07.md
-- Path 2 (right path) — restore design intent rather than strip semantics from intel.ts.
--
-- Idempotent: safe to re-apply. Targets a 0-row table; no data backfill needed.

ALTER TABLE public.entity_atom_links
  ADD COLUMN IF NOT EXISTS link_type TEXT NOT NULL DEFAULT 'reference';

ALTER TABLE public.entity_atom_links
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- link_type domain matches schema-v2-surfaces.sql's original CHECK constraint.
ALTER TABLE public.entity_atom_links
  DROP CONSTRAINT IF EXISTS entity_atom_links_link_type_check;
ALTER TABLE public.entity_atom_links
  ADD CONSTRAINT entity_atom_links_link_type_check
  CHECK (link_type IN ('reference', 'evidence', 'rebuttal', 'context', 'pinned'));

-- INSERT: any authenticated bee may create a link. Per kickoff spec: WITH CHECK
-- enforces only that auth.uid() IS NOT NULL — code is responsible for setting
-- created_by to auth.uid(). NOTE: schema-v2-surfaces.sql's original was tighter
-- (auth.uid() = created_by) — see Code 16 deviation flag.
DROP POLICY IF EXISTS entity_atom_links_insert_authenticated ON public.entity_atom_links;
CREATE POLICY entity_atom_links_insert_authenticated
  ON public.entity_atom_links
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- DELETE: only the creator can remove their own links.
DROP POLICY IF EXISTS entity_atom_links_delete_own ON public.entity_atom_links;
CREATE POLICY entity_atom_links_delete_own
  ON public.entity_atom_links
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- No UPDATE policy by design: atom links are immutable once created.
-- To "change" a link, delete and re-create.
