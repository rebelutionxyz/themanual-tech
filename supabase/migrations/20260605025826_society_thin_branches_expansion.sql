-- =====================================================================
-- Migration 20260605025826 — society_thin_branches_expansion
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-05 via apply_migration.
-- The Manual spine · Society realm · 22 atoms NET-INSERTED.
--
-- NOTE: dispatch cites "31 atoms" — the authored VALUES count; 9 were idempotent-
-- skipped (already in the spine), so 22 new rows landed (the atoms sharing this
-- migration's created_at in prod). Sequential replay reproduces the end state.
--
-- Additive + idempotent. type='event', kettle='Accepted'. realm_id='society'.
-- OUTCOME-FAITHFUL reconstruction from prod (no draft existed). No parent flips.
-- =====================================================================

INSERT INTO public.atoms (id, name, path, path_parts, realm_id, realm_name, depth, type, is_leaf, kettle)
SELECT v.id, v.name, v.path, string_to_array(v.path, ' / '),
       'society', 'Society', array_length(string_to_array(v.path, ' / '), 1),
       'event', v.is_leaf, v.kettle
FROM (VALUES
  -- Communication
  ('society-communication-censorship','Censorship','Society / Communication / Censorship',true,'Accepted'),
  ('society-communication-freedom-of-speech','Freedom of speech','Society / Communication / Freedom of speech',true,'Accepted'),
  ('society-communication-mass-communication','Mass communication','Society / Communication / Mass communication',true,'Accepted'),
  ('society-communication-misinformation','Misinformation','Society / Communication / Misinformation',true,'Accepted'),
  ('society-communication-propaganda','Propaganda','Society / Communication / Propaganda',true,'Accepted'),
  -- Demographics
  ('society-demographics-aging-population','Aging population','Society / Demographics / Aging population',true,'Accepted'),
  ('society-demographics-birth-rate','Birth rate','Society / Demographics / Birth rate',true,'Accepted'),
  ('society-demographics-census','Census','Society / Demographics / Census',true,'Accepted'),
  ('society-demographics-death-rate','Death rate','Society / Demographics / Death rate',true,'Accepted'),
  ('society-demographics-life-expectancy','Life expectancy','Society / Demographics / Life expectancy',true,'Accepted'),
  ('society-demographics-migration','Migration','Society / Demographics / Migration',true,'Accepted'),
  ('society-demographics-population','Population','Society / Demographics / Population',true,'Accepted'),
  ('society-demographics-urbanization','Urbanization','Society / Demographics / Urbanization',true,'Accepted'),
  -- Military and security
  ('society-military-and-security-arms-control','Arms control','Society / Military and security / Arms control',true,'Accepted'),
  ('society-military-and-security-cybersecurity','Cybersecurity','Society / Military and security / Cybersecurity',true,'Accepted'),
  ('society-military-and-security-national-security','National security','Society / Military and security / National security',true,'Accepted'),
  ('society-military-and-security-surveillance','Surveillance','Society / Military and security / Surveillance',true,'Accepted'),
  ('society-military-and-security-terrorism','Terrorism','Society / Military and security / Terrorism',true,'Accepted'),
  -- Urban planning
  ('society-urban-planning-gentrification','Gentrification','Society / Urban planning / Gentrification',true,'Accepted'),
  ('society-urban-planning-housing-policy','Housing policy','Society / Urban planning / Housing policy',true,'Accepted'),
  ('society-urban-planning-public-transit','Public transit','Society / Urban planning / Public transit',true,'Accepted'),
  ('society-urban-planning-smart-cities','Smart cities','Society / Urban planning / Smart cities',true,'Accepted')
) AS v(id, name, path, is_leaf, kettle)
WHERE NOT EXISTS (SELECT 1 FROM public.atoms a WHERE a.id = v.id);
