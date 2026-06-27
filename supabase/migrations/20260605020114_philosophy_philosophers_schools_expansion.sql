-- =====================================================================
-- Migration 20260605020114 — philosophy_philosophers_schools_expansion
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-05 via apply_migration.
-- The Manual spine · Philosophy realm · 44 atoms NET-INSERTED.
--
-- NOTE: the dispatch cites "56 atoms" — that was the authored VALUES count; the
-- idempotent guard skipped 12 that already existed, so 44 new rows landed (the
-- atoms sharing this migration's created_at in prod). This reconstruction captures
-- those 44; the 12 pre-existing already live in the spine from earlier migrations,
-- so a sequential replay reproduces the same end state.
--
-- Additive + idempotent. type='event', kettle='Accepted'. realm_id='philosophy'.
-- Derived: path_parts/realm_name/depth from path.
-- =====================================================================

INSERT INTO public.atoms (id, name, path, path_parts, realm_id, realm_name, depth, type, is_leaf, kettle)
SELECT v.id, v.name, v.path, string_to_array(v.path, ' / '),
       'philosophy', 'Philosophy', array_length(string_to_array(v.path, ' / '), 1),
       'event', v.is_leaf, v.kettle
FROM (VALUES
  -- Concepts
  ('philosophy-concepts-consciousness','Consciousness','Philosophy / Concepts / Consciousness',true,'Accepted'),
  ('philosophy-concepts-existence','Existence','Philosophy / Concepts / Existence',true,'Accepted'),
  ('philosophy-concepts-free-will','Free will','Philosophy / Concepts / Free will',true,'Accepted'),
  ('philosophy-concepts-identity','Identity','Philosophy / Concepts / Identity',true,'Accepted'),
  ('philosophy-concepts-knowledge','Knowledge','Philosophy / Concepts / Knowledge',true,'Accepted'),
  ('philosophy-concepts-morality','Morality','Philosophy / Concepts / Morality',true,'Accepted'),
  -- Philosophers / Ancient Greek (new parent)
  ('philosophy-philosophers-ancient-greek','Ancient Greek philosophers','Philosophy / Philosophers / Ancient Greek philosophers',false,'Accepted'),
  ('philosophy-philosophers-ancient-greek-aristotle','Aristotle','Philosophy / Philosophers / Ancient Greek philosophers / Aristotle',true,'Accepted'),
  ('philosophy-philosophers-ancient-greek-diogenes','Diogenes','Philosophy / Philosophers / Ancient Greek philosophers / Diogenes',true,'Accepted'),
  ('philosophy-philosophers-ancient-greek-epicurus','Epicurus','Philosophy / Philosophers / Ancient Greek philosophers / Epicurus',true,'Accepted'),
  ('philosophy-philosophers-ancient-greek-heraclitus','Heraclitus','Philosophy / Philosophers / Ancient Greek philosophers / Heraclitus',true,'Accepted'),
  ('philosophy-philosophers-ancient-greek-plato','Plato','Philosophy / Philosophers / Ancient Greek philosophers / Plato',true,'Accepted'),
  ('philosophy-philosophers-ancient-greek-pythagoras','Pythagoras','Philosophy / Philosophers / Ancient Greek philosophers / Pythagoras',true,'Accepted'),
  ('philosophy-philosophers-ancient-greek-socrates','Socrates','Philosophy / Philosophers / Ancient Greek philosophers / Socrates',true,'Accepted'),
  -- Philosophers / Contemporary (new parent)
  ('philosophy-philosophers-contemporary','Contemporary philosophers','Philosophy / Philosophers / Contemporary philosophers',false,'Accepted'),
  ('philosophy-philosophers-contemporary-camus','Albert Camus','Philosophy / Philosophers / Contemporary philosophers / Albert Camus',true,'Accepted'),
  ('philosophy-philosophers-contemporary-russell','Bertrand Russell','Philosophy / Philosophers / Contemporary philosophers / Bertrand Russell',true,'Accepted'),
  ('philosophy-philosophers-contemporary-arendt','Hannah Arendt','Philosophy / Philosophers / Contemporary philosophers / Hannah Arendt',true,'Accepted'),
  ('philosophy-philosophers-contemporary-sartre','Jean-Paul Sartre','Philosophy / Philosophers / Contemporary philosophers / Jean-Paul Sartre',true,'Accepted'),
  ('philosophy-philosophers-contemporary-wittgenstein','Ludwig Wittgenstein','Philosophy / Philosophers / Contemporary philosophers / Ludwig Wittgenstein',true,'Accepted'),
  ('philosophy-philosophers-contemporary-foucault','Michel Foucault','Philosophy / Philosophers / Contemporary philosophers / Michel Foucault',true,'Accepted'),
  -- Philosophers / Eastern (new parent)
  ('philosophy-philosophers-eastern','Eastern philosophers','Philosophy / Philosophers / Eastern philosophers',false,'Accepted'),
  ('philosophy-philosophers-eastern-confucius','Confucius','Philosophy / Philosophers / Eastern philosophers / Confucius',true,'Accepted'),
  ('philosophy-philosophers-eastern-buddha','Gautama Buddha','Philosophy / Philosophers / Eastern philosophers / Gautama Buddha',true,'Accepted'),
  ('philosophy-philosophers-eastern-laozi','Laozi','Philosophy / Philosophers / Eastern philosophers / Laozi',true,'Accepted'),
  ('philosophy-philosophers-eastern-sun-tzu','Sun Tzu','Philosophy / Philosophers / Eastern philosophers / Sun Tzu',true,'Accepted'),
  -- Philosophers / Modern Western (new parent)
  ('philosophy-philosophers-modern-western','Modern Western philosophers','Philosophy / Philosophers / Modern Western philosophers',false,'Accepted'),
  ('philosophy-philosophers-modern-western-schopenhauer','Arthur Schopenhauer','Philosophy / Philosophers / Modern Western philosophers / Arthur Schopenhauer',true,'Accepted'),
  ('philosophy-philosophers-modern-western-spinoza','Baruch Spinoza','Philosophy / Philosophers / Modern Western philosophers / Baruch Spinoza',true,'Accepted'),
  ('philosophy-philosophers-modern-western-hume','David Hume','Philosophy / Philosophers / Modern Western philosophers / David Hume',true,'Accepted'),
  ('philosophy-philosophers-modern-western-nietzsche','Friedrich Nietzsche','Philosophy / Philosophers / Modern Western philosophers / Friedrich Nietzsche',true,'Accepted'),
  ('philosophy-philosophers-modern-western-hegel','G.W.F. Hegel','Philosophy / Philosophers / Modern Western philosophers / G.W.F. Hegel',true,'Accepted'),
  ('philosophy-philosophers-modern-western-kant','Immanuel Kant','Philosophy / Philosophers / Modern Western philosophers / Immanuel Kant',true,'Accepted'),
  ('philosophy-philosophers-modern-western-locke','John Locke','Philosophy / Philosophers / Modern Western philosophers / John Locke',true,'Accepted'),
  ('philosophy-philosophers-modern-western-marx','Karl Marx','Philosophy / Philosophers / Modern Western philosophers / Karl Marx',true,'Accepted'),
  ('philosophy-philosophers-modern-western-descartes','René Descartes','Philosophy / Philosophers / Modern Western philosophers / René Descartes',true,'Accepted'),
  -- Philosophers / Roman (new parent)
  ('philosophy-philosophers-roman','Roman philosophers','Philosophy / Philosophers / Roman philosophers',false,'Accepted'),
  ('philosophy-philosophers-roman-cicero','Cicero','Philosophy / Philosophers / Roman philosophers / Cicero',true,'Accepted'),
  ('philosophy-philosophers-roman-epictetus','Epictetus','Philosophy / Philosophers / Roman philosophers / Epictetus',true,'Accepted'),
  ('philosophy-philosophers-roman-marcus-aurelius','Marcus Aurelius','Philosophy / Philosophers / Roman philosophers / Marcus Aurelius',true,'Accepted'),
  ('philosophy-philosophers-roman-seneca','Seneca','Philosophy / Philosophers / Roman philosophers / Seneca',true,'Accepted'),
  -- Schools (leaves under pre-existing Eastern/Western philosophy)
  ('philosophy-schools-eastern-philosophy-buddhism-philosophy','Buddhism (philosophy)','Philosophy / Schools / Eastern philosophy / Buddhism (philosophy)',true,'Accepted'),
  ('philosophy-schools-eastern-philosophy-legalism','Legalism','Philosophy / Schools / Eastern philosophy / Legalism',true,'Accepted'),
  ('philosophy-schools-western-philosophy-cynicism','Cynicism','Philosophy / Schools / Western philosophy / Cynicism',true,'Accepted')
) AS v(id, name, path, is_leaf, kettle)
WHERE NOT EXISTS (SELECT 1 FROM public.atoms a WHERE a.id = v.id);

-- parent flip: 'Philosophers' was a leaf; now has children
UPDATE public.atoms SET is_leaf = false
WHERE id = 'philosophy-philosophers'
AND EXISTS (SELECT 1 FROM public.atoms c WHERE c.path LIKE public.atoms.path || ' / %');
