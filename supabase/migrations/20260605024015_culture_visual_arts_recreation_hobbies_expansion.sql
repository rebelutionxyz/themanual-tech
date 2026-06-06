-- =====================================================================
-- Migration 20260605024015 — culture_visual_arts_recreation_hobbies_expansion
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-05 via apply_migration.
-- The Manual spine · Culture realm · 29 atoms.
--
-- Additive + idempotent. type='event', kettle='Accepted'. realm_id='culture'.
-- OUTCOME-FAITHFUL reconstruction from prod (no draft existed); derived
-- path_parts/realm_name/depth from path. 'Art movements' is a NEW parent
-- (is_leaf=false); other parents pre-existed with children, so no flips.
-- =====================================================================

INSERT INTO public.atoms (id, name, path, path_parts, realm_id, realm_name, depth, type, is_leaf, kettle)
SELECT v.id, v.name, v.path, string_to_array(v.path, ' / '),
       'culture', 'Culture', array_length(string_to_array(v.path, ' / '), 1),
       'event', v.is_leaf, v.kettle
FROM (VALUES
  -- Collecting and hobbies
  ('culture-collecting-and-hobbies-antiques','Antiques','Culture / Collecting and hobbies / Antiques',true,'Accepted'),
  ('culture-collecting-and-hobbies-gardening-hobby','Gardening (hobby)','Culture / Collecting and hobbies / Gardening (hobby)',true,'Accepted'),
  ('culture-collecting-and-hobbies-model-building','Model building','Culture / Collecting and hobbies / Model building',true,'Accepted'),
  ('culture-collecting-and-hobbies-philately','Philately (stamps)','Culture / Collecting and hobbies / Philately (stamps)',true,'Accepted'),
  ('culture-collecting-and-hobbies-trading-cards','Trading cards','Culture / Collecting and hobbies / Trading cards',true,'Accepted'),
  ('culture-collecting-and-hobbies-vinyl-records','Vinyl records','Culture / Collecting and hobbies / Vinyl records',true,'Accepted'),
  -- Literature
  ('culture-literature-drama-literature','Drama (literature)','Culture / Literature / Drama (literature)',true,'Accepted'),
  ('culture-literature-mythology-and-folklore','Mythology and folklore','Culture / Literature / Mythology and folklore',true,'Accepted'),
  ('culture-literature-non-fiction','Non-fiction','Culture / Literature / Non-fiction',true,'Accepted'),
  -- Recreation and entertainment
  ('culture-recreation-and-entertainment-amusement-parks','Amusement parks','Culture / Recreation and entertainment / Amusement parks',true,'Accepted'),
  ('culture-recreation-and-entertainment-comedy','Comedy','Culture / Recreation and entertainment / Comedy',true,'Accepted'),
  ('culture-recreation-and-entertainment-gambling','Gambling','Culture / Recreation and entertainment / Gambling',true,'Accepted'),
  ('culture-recreation-and-entertainment-nightlife','Nightlife','Culture / Recreation and entertainment / Nightlife',true,'Accepted'),
  ('culture-recreation-and-entertainment-outdoor-recreation','Outdoor recreation','Culture / Recreation and entertainment / Outdoor recreation',true,'Accepted'),
  ('culture-recreation-and-entertainment-theme-events','Theme events','Culture / Recreation and entertainment / Theme events',true,'Accepted'),
  -- Visual arts / Art movements (new parent + children)
  ('culture-visual-arts-art-movements','Art movements','Culture / Visual arts / Art movements',false,'Accepted'),
  ('culture-visual-arts-art-movements-abstract-art','Abstract art','Culture / Visual arts / Art movements / Abstract art',true,'Accepted'),
  ('culture-visual-arts-art-movements-baroque','Baroque','Culture / Visual arts / Art movements / Baroque',true,'Accepted'),
  ('culture-visual-arts-art-movements-cubism','Cubism','Culture / Visual arts / Art movements / Cubism',true,'Accepted'),
  ('culture-visual-arts-art-movements-expressionism','Expressionism','Culture / Visual arts / Art movements / Expressionism',true,'Accepted'),
  ('culture-visual-arts-art-movements-impressionism','Impressionism','Culture / Visual arts / Art movements / Impressionism',true,'Accepted'),
  ('culture-visual-arts-art-movements-pop-art','Pop art','Culture / Visual arts / Art movements / Pop art',true,'Accepted'),
  ('culture-visual-arts-art-movements-realism','Realism','Culture / Visual arts / Art movements / Realism',true,'Accepted'),
  ('culture-visual-arts-art-movements-renaissance-art','Renaissance art','Culture / Visual arts / Art movements / Renaissance art',true,'Accepted'),
  ('culture-visual-arts-art-movements-romanticism','Romanticism','Culture / Visual arts / Art movements / Romanticism',true,'Accepted'),
  ('culture-visual-arts-art-movements-surrealism','Surrealism','Culture / Visual arts / Art movements / Surrealism',true,'Accepted'),
  ('culture-visual-arts-digital-art','Digital art','Culture / Visual arts / Digital art',true,'Accepted'),
  ('culture-visual-arts-illustration','Illustration','Culture / Visual arts / Illustration',true,'Accepted'),
  ('culture-visual-arts-printmaking','Printmaking','Culture / Visual arts / Printmaking',true,'Accepted')
) AS v(id, name, path, is_leaf, kettle)
WHERE NOT EXISTS (SELECT 1 FROM public.atoms a WHERE a.id = v.id);
