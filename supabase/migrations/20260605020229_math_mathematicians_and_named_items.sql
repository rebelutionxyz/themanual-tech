-- =====================================================================
-- Migration 20260605020229 — math_mathematicians_and_named_items
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-05 via apply_migration.
-- The Manual spine · Math realm · 35 atoms.
--
-- Additive + idempotent. type='event', kettle='Accepted'. realm_id='math'.
-- OUTCOME-FAITHFUL reconstruction from prod (no draft existed); derived
-- path_parts/realm_name/depth from path. Apostrophes escaped per SQL.
-- =====================================================================

INSERT INTO public.atoms (id, name, path, path_parts, realm_id, realm_name, depth, type, is_leaf, kettle)
SELECT v.id, v.name, v.path, string_to_array(v.path, ' / '),
       'math', 'Math', array_length(string_to_array(v.path, ' / '), 1),
       'event', v.is_leaf, v.kettle
FROM (VALUES
  -- Concepts / Numbers (leaves under pre-existing Numbers — flipped below)
  ('math-concepts-numbers-e','e (Euler''s number)','Math / Concepts / Numbers / e (Euler''s number)',true,'Accepted'),
  ('math-concepts-numbers-golden-ratio','Golden ratio','Math / Concepts / Numbers / Golden ratio',true,'Accepted'),
  ('math-concepts-numbers-imaginary-unit','Imaginary unit','Math / Concepts / Numbers / Imaginary unit',true,'Accepted'),
  ('math-concepts-numbers-infinity','Infinity','Math / Concepts / Numbers / Infinity',true,'Accepted'),
  ('math-concepts-numbers-pi','Pi','Math / Concepts / Numbers / Pi',true,'Accepted'),
  -- Concepts / Theorems
  ('math-concepts-theorems-fermats-last-theorem','Fermat''s Last Theorem','Math / Concepts / Theorems / Fermat''s Last Theorem',true,'Accepted'),
  ('math-concepts-theorems-fundamental-theorem-of-calculus','Fundamental theorem of calculus','Math / Concepts / Theorems / Fundamental theorem of calculus',true,'Accepted'),
  ('math-concepts-theorems-godels-incompleteness-theorems','Gödel''s incompleteness theorems','Math / Concepts / Theorems / Gödel''s incompleteness theorems',true,'Accepted'),
  ('math-concepts-theorems-pythagorean-theorem','Pythagorean theorem','Math / Concepts / Theorems / Pythagorean theorem',true,'Accepted'),
  -- Mathematical statements / Conjectures
  ('math-mathematical-statements-conjectures-collatz-conjecture','Collatz conjecture','Math / Mathematical statements / Conjectures / Collatz conjecture',true,'Accepted'),
  ('math-mathematical-statements-conjectures-goldbach-conjecture','Goldbach''s conjecture','Math / Mathematical statements / Conjectures / Goldbach''s conjecture',true,'Accepted'),
  ('math-mathematical-statements-conjectures-p-versus-np','P versus NP problem','Math / Mathematical statements / Conjectures / P versus NP problem',true,'Accepted'),
  ('math-mathematical-statements-conjectures-riemann-hypothesis','Riemann hypothesis','Math / Mathematical statements / Conjectures / Riemann hypothesis',true,'Accepted'),
  -- Mathematicians (new tree: parent + Ancient/Classical/Modern parents)
  ('math-mathematicians','Mathematicians','Math / Mathematicians',false,'Accepted'),
  ('math-mathematicians-ancient','Ancient mathematicians','Math / Mathematicians / Ancient mathematicians',false,'Accepted'),
  ('math-mathematicians-ancient-al-khwarizmi','Al-Khwarizmi','Math / Mathematicians / Ancient mathematicians / Al-Khwarizmi',true,'Accepted'),
  ('math-mathematicians-ancient-archimedes','Archimedes','Math / Mathematicians / Ancient mathematicians / Archimedes',true,'Accepted'),
  ('math-mathematicians-ancient-euclid','Euclid','Math / Mathematicians / Ancient mathematicians / Euclid',true,'Accepted'),
  ('math-mathematicians-ancient-pythagoras','Pythagoras','Math / Mathematicians / Ancient mathematicians / Pythagoras',true,'Accepted'),
  ('math-mathematicians-classical','Classical mathematicians','Math / Mathematicians / Classical mathematicians',false,'Accepted'),
  ('math-mathematicians-classical-pascal','Blaise Pascal','Math / Mathematicians / Classical mathematicians / Blaise Pascal',true,'Accepted'),
  ('math-mathematicians-classical-gauss','Carl Friedrich Gauss','Math / Mathematicians / Classical mathematicians / Carl Friedrich Gauss',true,'Accepted'),
  ('math-mathematicians-classical-leibniz','Gottfried Leibniz','Math / Mathematicians / Classical mathematicians / Gottfried Leibniz',true,'Accepted'),
  ('math-mathematicians-classical-newton','Isaac Newton','Math / Mathematicians / Classical mathematicians / Isaac Newton',true,'Accepted'),
  ('math-mathematicians-classical-euler','Leonhard Euler','Math / Mathematicians / Classical mathematicians / Leonhard Euler',true,'Accepted'),
  ('math-mathematicians-classical-fermat','Pierre de Fermat','Math / Mathematicians / Classical mathematicians / Pierre de Fermat',true,'Accepted'),
  ('math-mathematicians-modern','Modern mathematicians','Math / Mathematicians / Modern mathematicians',false,'Accepted'),
  ('math-mathematicians-modern-turing','Alan Turing','Math / Mathematicians / Modern mathematicians / Alan Turing',true,'Accepted'),
  ('math-mathematicians-modern-riemann','Bernhard Riemann','Math / Mathematicians / Modern mathematicians / Bernhard Riemann',true,'Accepted'),
  ('math-mathematicians-modern-noether','Emmy Noether','Math / Mathematicians / Modern mathematicians / Emmy Noether',true,'Accepted'),
  ('math-mathematicians-modern-cantor','Georg Cantor','Math / Mathematicians / Modern mathematicians / Georg Cantor',true,'Accepted'),
  ('math-mathematicians-modern-von-neumann','John von Neumann','Math / Mathematicians / Modern mathematicians / John von Neumann',true,'Accepted'),
  ('math-mathematicians-modern-godel','Kurt Gödel','Math / Mathematicians / Modern mathematicians / Kurt Gödel',true,'Accepted'),
  ('math-mathematicians-modern-erdos','Paul Erdős','Math / Mathematicians / Modern mathematicians / Paul Erdős',true,'Accepted'),
  ('math-mathematicians-modern-ramanujan','Srinivasa Ramanujan','Math / Mathematicians / Modern mathematicians / Srinivasa Ramanujan',true,'Accepted')
) AS v(id, name, path, is_leaf, kettle)
WHERE NOT EXISTS (SELECT 1 FROM public.atoms a WHERE a.id = v.id);

-- parent flip: 'Numbers' was a leaf; now has children
UPDATE public.atoms SET is_leaf = false
WHERE id = 'math-concepts-numbers'
AND EXISTS (SELECT 1 FROM public.atoms c WHERE c.path LIKE public.atoms.path || ' / %');
