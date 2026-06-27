-- For the 18 companies that exist BOTH flat (depth 4) and in a sector (depth 5),
-- delete the FLAT copy and keep the sector copy (correct categorization).
-- Flat copies are this session's repathed atoms (verified 0 entity_atom_links).
DELETE FROM public.atoms flat
WHERE flat.path LIKE 'Society / Economy and business / Companies / %'
  AND array_length(flat.path_parts,1) = 4          -- flat company (depth 4)
  AND flat.is_leaf = true
  AND EXISTS (
    SELECT 1 FROM public.atoms sect
    WHERE sect.path LIKE 'Society / Economy and business / Companies / % / %'
      AND array_length(sect.path_parts,1) = 5       -- sector company (depth 5)
      AND sect.is_leaf = true
      AND lower(sect.name) = lower(flat.name)
  );
