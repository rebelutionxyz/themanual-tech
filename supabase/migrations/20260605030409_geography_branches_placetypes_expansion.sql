-- =====================================================================
-- Migration 20260605030409 — geography_branches_placetypes_expansion
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-05 via apply_migration.
-- The Manual spine · Geography realm · 31 atoms.
-- Additive + idempotent. type='event', kettle='Accepted'. realm_id='geography'.
-- OUTCOME-FAITHFUL reconstruction from prod; derived path_parts/realm_name/depth.
-- =====================================================================

INSERT INTO public.atoms (id, name, path, path_parts, realm_id, realm_name, depth, type, is_leaf, kettle)
SELECT v.id, v.name, v.path, string_to_array(v.path, ' / '),
       'geography', 'Geography', array_length(string_to_array(v.path, ' / '), 1),
       'event', v.is_leaf, v.kettle
FROM (VALUES
  ('geography-branches-human-geography-cultural-geography','Cultural geography','Geography / Branches / Human geography / Cultural geography',true,'Accepted'),
  ('geography-branches-human-geography-economic-geography','Economic geography','Geography / Branches / Human geography / Economic geography',true,'Accepted'),
  ('geography-branches-human-geography-political-geography','Political geography','Geography / Branches / Human geography / Political geography',true,'Accepted'),
  ('geography-branches-human-geography-population-geography','Population geography','Geography / Branches / Human geography / Population geography',true,'Accepted'),
  ('geography-branches-human-geography-urban-geography','Urban geography','Geography / Branches / Human geography / Urban geography',true,'Accepted'),
  ('geography-branches-physical-geography-biogeography','Biogeography','Geography / Branches / Physical geography / Biogeography',true,'Accepted'),
  ('geography-branches-physical-geography-climatology','Climatology','Geography / Branches / Physical geography / Climatology',true,'Accepted'),
  ('geography-branches-physical-geography-geomorphology','Geomorphology','Geography / Branches / Physical geography / Geomorphology',true,'Accepted'),
  ('geography-branches-physical-geography-glaciology','Glaciology','Geography / Branches / Physical geography / Glaciology',true,'Accepted'),
  ('geography-branches-physical-geography-hydrology','Hydrology','Geography / Branches / Physical geography / Hydrology',true,'Accepted'),
  ('geography-branches-physical-geography-oceanography','Oceanography','Geography / Branches / Physical geography / Oceanography',true,'Accepted'),
  ('geography-branches-technical-geography-cartography','Cartography','Geography / Branches / Technical geography / Cartography',true,'Accepted'),
  ('geography-branches-technical-geography-geodesy','Geodesy','Geography / Branches / Technical geography / Geodesy',true,'Accepted'),
  ('geography-branches-technical-geography-gis','GIS','Geography / Branches / Technical geography / GIS',true,'Accepted'),
  ('geography-branches-technical-geography-remote-sensing','Remote sensing','Geography / Branches / Technical geography / Remote sensing',true,'Accepted'),
  ('geography-concepts-biome','Biome','Geography / Concepts / Biome',true,'Accepted'),
  ('geography-concepts-border','Border','Geography / Concepts / Border',true,'Accepted'),
  ('geography-concepts-continent','Continent','Geography / Concepts / Continent',true,'Accepted'),
  ('geography-concepts-ecosystem','Ecosystem','Geography / Concepts / Ecosystem',true,'Accepted'),
  ('geography-concepts-latitude-and-longitude','Latitude and longitude','Geography / Concepts / Latitude and longitude',true,'Accepted'),
  ('geography-concepts-time-zone','Time zone','Geography / Concepts / Time zone',true,'Accepted'),
  ('geography-place-types-natural-features-deserts','Deserts','Geography / Place types / Natural features / Deserts',true,'Accepted'),
  ('geography-place-types-natural-features-forests','Forests','Geography / Place types / Natural features / Forests',true,'Accepted'),
  ('geography-place-types-natural-features-islands','Islands','Geography / Place types / Natural features / Islands',true,'Accepted'),
  ('geography-place-types-natural-features-lakes','Lakes','Geography / Place types / Natural features / Lakes',true,'Accepted'),
  ('geography-place-types-natural-features-mountains','Mountains','Geography / Place types / Natural features / Mountains',true,'Accepted'),
  ('geography-place-types-natural-features-oceans','Oceans','Geography / Place types / Natural features / Oceans',true,'Accepted'),
  ('geography-place-types-natural-features-plains','Plains','Geography / Place types / Natural features / Plains',true,'Accepted'),
  ('geography-place-types-natural-features-rivers','Rivers','Geography / Place types / Natural features / Rivers',true,'Accepted'),
  ('geography-place-types-natural-features-valleys','Valleys','Geography / Place types / Natural features / Valleys',true,'Accepted'),
  ('geography-place-types-natural-features-volcanoes','Volcanoes','Geography / Place types / Natural features / Volcanoes',true,'Accepted')
) AS v(id, name, path, is_leaf, kettle)
WHERE NOT EXISTS (SELECT 1 FROM public.atoms a WHERE a.id = v.id);

-- parent flips: pre-existing leaf branches that gained their first children here
UPDATE public.atoms SET is_leaf = false
WHERE id IN (
  'geography-branches-human-geography',
  'geography-branches-physical-geography',
  'geography-branches-technical-geography'
)
AND EXISTS (SELECT 1 FROM public.atoms c WHERE c.path LIKE public.atoms.path || ' / %');
