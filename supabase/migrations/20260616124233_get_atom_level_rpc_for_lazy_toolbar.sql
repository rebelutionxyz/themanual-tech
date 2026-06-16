-- APPLIED to prod 2026-06-16 via MCP. PARITY file.
-- Lazy tree loader: NULL parent -> the 13 realm roots; else a node's DIRECT children only.
-- Light columns only (no geo/meta/tag-arrays), so each call is a few KB.
CREATE OR REPLACE FUNCTION public.get_atom_level(parent_path text DEFAULT NULL)
RETURNS TABLE(id text, name text, path text, type text, is_leaf boolean, depth int)
LANGUAGE sql STABLE
AS $$
  WITH p AS (SELECT string_to_array(parent_path, ' / ') AS pp)
  SELECT a.id, a.name, a.path, a.type, a.is_leaf, a.depth
  FROM atoms a, p
  WHERE a.depth = coalesce(array_length(p.pp,1),0) + 1
    AND (parent_path IS NULL OR a.path_parts[1:array_length(p.pp,1)] = p.pp)
  ORDER BY a.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_atom_level(text) TO anon, authenticated;
