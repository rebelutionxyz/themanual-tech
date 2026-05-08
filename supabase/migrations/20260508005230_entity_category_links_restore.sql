-- Restore entity_category_links semantic columns dropped during the Apr 25 taxonomy
-- rebuild (supabase/02_create_new_taxonomy.sql), and add the missing INSERT/DELETE
-- policies that schema-v5-categories.sql originally specified.
--
-- Code 18 / MMF Open #16 sub-issue. Mirrors Code 16's pattern for entity_atom_links
-- (commit 82cea0c, migration 20260508002832).
--
-- Path 2 (right path) — restore design intent rather than strip semantics from intel.ts.
--
-- Idempotent: safe to re-apply. Targets a 0-row table; no data backfill needed.
--
-- Notes
-- -----
-- The rebuild renamed columns (source_surface/source_id/category_path
-- → entity_type/entity_id/category_key). We keep the rebuild's column names;
-- we restore only created_by and the missing policies.
--
-- link_type is intentionally NOT added — schema-v5-categories.sql's original
-- did not have one. Category links are flat tags (distinct from semantic
-- atom links, which carry reference/evidence/rebuttal/context/pinned types).

ALTER TABLE public.entity_category_links
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- INSERT: any authenticated bee may create a link. Per Code 16 kickoff spec:
-- WITH CHECK enforces only auth.uid() IS NOT NULL — code is responsible for
-- setting created_by to auth.uid(). NOTE: schema-v5-categories.sql's original
-- was tighter (auth.uid() = created_by). Open #17 may tighten both tables together later.
DROP POLICY IF EXISTS entity_category_links_insert_authenticated ON public.entity_category_links;
CREATE POLICY entity_category_links_insert_authenticated
  ON public.entity_category_links
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- DELETE: only the creator can remove their own links.
DROP POLICY IF EXISTS entity_category_links_delete_own ON public.entity_category_links;
CREATE POLICY entity_category_links_delete_own
  ON public.entity_category_links
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- No UPDATE policy by design: category links are immutable once created.
-- To "change" a link, delete and re-create.
