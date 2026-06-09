-- Move the 90 "Global notable" companies flat under "Companies" (depth 5 -> 4),
-- then delete the two junk folder nodes (Global notable, Global 2000).
-- Verified: 0 entity_atom_links reference these ids; 0 slug collisions with existing companies.

-- 1. Repath the 90 leaves: drop the "global-notable" segment everywhere.
UPDATE public.atoms
SET
  id   = 'society-economy-and-business-companies-' || replace(id, 'society-economy-and-business-companies-global-notable-', ''),
  path = 'Society / Economy and business / Companies / ' || name,
  path_parts = string_to_array('Society / Economy and business / Companies / ' || name, ' / '),
  depth = 4
WHERE path LIKE 'Society / Economy and business / Companies / Global notable / %';

-- 2. Delete the now-empty junk folders.
DELETE FROM public.atoms WHERE id = 'society-economy-and-business-companies-global-notable';
DELETE FROM public.atoms WHERE id = 'society-economy-and-business-companies-global-2000';
