-- =====================================================================
-- Migration 20260605025853 — science_physics_earth_named_expansion
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-05 via apply_migration.
-- The Manual spine · Science realm · 18 atoms NET-INSERTED.
--
-- NOTE: dispatch cites "24 atoms" — the authored VALUES count; 6 were idempotent-
-- skipped (already in the spine), so 18 new rows landed (the atoms sharing this
-- migration's created_at in prod). Sequential replay reproduces the end state.
--
-- Additive + idempotent. type='event', kettle='Accepted'. realm_id='science'.
-- OUTCOME-FAITHFUL reconstruction from prod (no draft existed); derived
-- path_parts/realm_name/depth from path.
-- =====================================================================

INSERT INTO public.atoms (id, name, path, path_parts, realm_id, realm_name, depth, type, is_leaf, kettle)
SELECT v.id, v.name, v.path, string_to_array(v.path, ' / '),
       'science', 'Science', array_length(string_to_array(v.path, ' / '), 1),
       'event', v.is_leaf, v.kettle
FROM (VALUES
  -- Astronomy and space science / Astronomical phenomena
  ('science-astronomy-and-space-science-astronomical-phenomena-big-bang','Big Bang','Science / Astronomy and space science / Astronomical phenomena / Big Bang',true,'Accepted'),
  ('science-astronomy-and-space-science-astronomical-phenomena-dark-energy','Dark energy','Science / Astronomy and space science / Astronomical phenomena / Dark energy',true,'Accepted'),
  ('science-astronomy-and-space-science-astronomical-phenomena-dark-matter','Dark matter','Science / Astronomy and space science / Astronomical phenomena / Dark matter',true,'Accepted'),
  -- Earth science
  ('science-earth-science-climate-science-climate-change-science','Climate change (science)','Science / Earth science / Climate science / Climate change (science)',true,'Accepted'),
  ('science-earth-science-climate-science-greenhouse-effect','Greenhouse effect','Science / Earth science / Climate science / Greenhouse effect',true,'Accepted'),
  ('science-earth-science-oceanography-ocean-currents','Ocean currents','Science / Earth science / Oceanography / Ocean currents',true,'Accepted'),
  -- Physics / Nuclear physics
  ('science-physics-nuclear-physics-nuclear-fission','Nuclear fission','Science / Physics / Nuclear physics / Nuclear fission',true,'Accepted'),
  ('science-physics-nuclear-physics-nuclear-fusion','Nuclear fusion','Science / Physics / Nuclear physics / Nuclear fusion',true,'Accepted'),
  -- Physics / Particle physics
  ('science-physics-particle-physics-higgs-boson','Higgs boson','Science / Physics / Particle physics / Higgs boson',true,'Accepted'),
  ('science-physics-particle-physics-quarks','Quarks','Science / Physics / Particle physics / Quarks',true,'Accepted'),
  -- Physics / Physics concepts
  ('science-physics-physics-concepts-electromagnetic-spectrum','Electromagnetic spectrum','Science / Physics / Physics concepts / Electromagnetic spectrum',true,'Accepted'),
  ('science-physics-physics-concepts-entropy','Entropy','Science / Physics / Physics concepts / Entropy',true,'Accepted'),
  ('science-physics-physics-concepts-gravity','Gravity','Science / Physics / Physics concepts / Gravity',true,'Accepted'),
  ('science-physics-physics-concepts-thermodynamics','Thermodynamics','Science / Physics / Physics concepts / Thermodynamics',true,'Accepted'),
  -- Physics / Quantum field theory
  ('science-physics-quantum-field-theory-quantum-mechanics','Quantum mechanics','Science / Physics / Quantum field theory / Quantum mechanics',true,'Accepted'),
  ('science-physics-quantum-field-theory-standard-model','Standard Model','Science / Physics / Quantum field theory / Standard Model',true,'Accepted'),
  -- Physics / Relativity
  ('science-physics-relativity-general-relativity','General relativity','Science / Physics / Relativity / General relativity',true,'Accepted'),
  ('science-physics-relativity-special-relativity','Special relativity','Science / Physics / Relativity / Special relativity',true,'Accepted')
) AS v(id, name, path, is_leaf, kettle)
WHERE NOT EXISTS (SELECT 1 FROM public.atoms a WHERE a.id = v.id);

-- parent flip: 'Oceanography' was a leaf; now has children
UPDATE public.atoms SET is_leaf = false
WHERE id = 'science-earth-science-oceanography'
AND EXISTS (SELECT 1 FROM public.atoms c WHERE c.path LIKE public.atoms.path || ' / %');
