-- =====================================================================
-- Migration 20260605023946 — history_periods_civilizations_events_expansion
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-05 via apply_migration.
-- The Manual spine · History realm · 35 atoms.
--
-- Additive + idempotent. type='event', kettle='Accepted'. realm_id='history'.
-- OUTCOME-FAITHFUL reconstruction from prod (no draft existed); derived
-- path_parts/realm_name/depth from path. No parent flips (all parents pre-existed
-- with children).
-- =====================================================================

INSERT INTO public.atoms (id, name, path, path_parts, realm_id, realm_name, depth, type, is_leaf, kettle)
SELECT v.id, v.name, v.path, string_to_array(v.path, ' / '),
       'history', 'History', array_length(string_to_array(v.path, ' / '), 1),
       'event', v.is_leaf, v.kettle
FROM (VALUES
  -- Ancient civilizations
  ('history-ancient-civilizations-ancient-japan','Ancient Japan','History / Ancient civilizations / Ancient Japan',true,'Accepted'),
  ('history-ancient-civilizations-ancient-persia','Ancient Persia','History / Ancient civilizations / Ancient Persia',true,'Accepted'),
  ('history-ancient-civilizations-aztec-empire','Aztec Empire','History / Ancient civilizations / Aztec Empire',true,'Accepted'),
  ('history-ancient-civilizations-carthage','Carthage','History / Ancient civilizations / Carthage',true,'Accepted'),
  ('history-ancient-civilizations-inca-empire','Inca Empire','History / Ancient civilizations / Inca Empire',true,'Accepted'),
  ('history-ancient-civilizations-indus-valley-civilization','Indus Valley civilization','History / Ancient civilizations / Indus Valley civilization',true,'Accepted'),
  ('history-ancient-civilizations-maya-civilization','Maya civilization','History / Ancient civilizations / Maya civilization',true,'Accepted'),
  ('history-ancient-civilizations-phoenicia','Phoenicia','History / Ancient civilizations / Phoenicia',true,'Accepted'),
  -- Historical events
  ('history-historical-events-abolition-of-slavery','Abolition of slavery','History / Historical events / Abolition of slavery',true,'Accepted'),
  ('history-historical-events-columbian-exchange','Columbian exchange','History / Historical events / Columbian exchange',true,'Accepted'),
  ('history-historical-events-fall-of-the-berlin-wall','Fall of the Berlin Wall','History / Historical events / Fall of the Berlin Wall',true,'Accepted'),
  ('history-historical-events-fall-of-the-soviet-union','Fall of the Soviet Union','History / Historical events / Fall of the Soviet Union',true,'Accepted'),
  ('history-historical-events-fall-of-rome','Fall of the Western Roman Empire','History / Historical events / Fall of the Western Roman Empire',true,'Accepted'),
  ('history-historical-events-industrial-revolution-event','Industrial Revolution (event)','History / Historical events / Industrial Revolution (event)',true,'Accepted'),
  ('history-historical-events-moon-landing','Moon landing','History / Historical events / Moon landing',true,'Accepted'),
  ('history-historical-events-partition-of-india','Partition of India','History / Historical events / Partition of India',true,'Accepted'),
  ('history-historical-events-protestant-reformation','Protestant Reformation','History / Historical events / Protestant Reformation',true,'Accepted'),
  ('history-historical-events-september-11-attacks','September 11 attacks','History / Historical events / September 11 attacks',true,'Accepted'),
  ('history-historical-events-holocaust','The Holocaust','History / Historical events / The Holocaust',true,'Accepted'),
  -- Historical states
  ('history-historical-states-austria-hungary','Austria-Hungary','History / Historical states / Austria-Hungary',true,'Accepted'),
  ('history-historical-states-british-empire','British Empire','History / Historical states / British Empire',true,'Accepted'),
  ('history-historical-states-holy-roman-empire','Holy Roman Empire','History / Historical states / Holy Roman Empire',true,'Accepted'),
  ('history-historical-states-mongol-empire','Mongol Empire','History / Historical states / Mongol Empire',true,'Accepted'),
  ('history-historical-states-qing-dynasty','Qing dynasty','History / Historical states / Qing dynasty',true,'Accepted'),
  ('history-historical-states-yugoslavia','Yugoslavia','History / Historical states / Yugoslavia',true,'Accepted'),
  -- Periods
  ('history-periods-classical-antiquity','Classical antiquity','History / Periods / Classical antiquity',true,'Accepted'),
  ('history-periods-contemporary-history','Contemporary history','History / Periods / Contemporary history',true,'Accepted'),
  ('history-periods-digital-age','Digital Age','History / Periods / Digital Age',true,'Accepted'),
  ('history-periods-gilded-age','Gilded Age','History / Periods / Gilded Age',true,'Accepted'),
  ('history-periods-industrial-revolution','Industrial Revolution','History / Periods / Industrial Revolution',true,'Accepted'),
  ('history-periods-interwar-period','Interwar period','History / Periods / Interwar period',true,'Accepted'),
  ('history-periods-middle-ages','Middle Ages','History / Periods / Middle Ages',true,'Accepted'),
  ('history-periods-reformation','Reformation','History / Periods / Reformation',true,'Accepted'),
  ('history-periods-renaissance','Renaissance','History / Periods / Renaissance',true,'Accepted'),
  ('history-periods-victorian-era','Victorian era','History / Periods / Victorian era',true,'Accepted')
) AS v(id, name, path, is_leaf, kettle)
WHERE NOT EXISTS (SELECT 1 FROM public.atoms a WHERE a.id = v.id);
