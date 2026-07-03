-- Geography: Montana pilot-market neighborhood build-out — Billings 6 · Missoula 8 · Bozeman 7 · Great Falls 6 · Helena 5 · Butte 4 (36 atoms).
-- Demand-driven exception to the top-35 population ladder: TheTRIVIA.app Montana pilot home turf.
-- Parent city atoms flip is_leaf=false. Same shape as batches 01-04.
INSERT INTO public.atoms (id, name, path, path_parts, depth, realm_id, realm_name, type, kettle, band, status, is_leaf, pillar_tags, skin_tags, realm_tags, geo)
SELECT v.id, v.name, v.path, string_to_array(v.path,' / '), array_length(string_to_array(v.path,' / '),1),
       'geography','Geography','neighborhood','Accepted',NULL,'live', true,
       ARRAY['MANUAL'], ARRAY['HoneyComb'], ARRAY['Geography'],
       jsonb_build_object('type','neighborhood','regionName',v.name,
         'parentCity',(string_to_array(v.path,' / '))[array_length(string_to_array(v.path,' / '),1)-1],
         'parentRegion',(string_to_array(v.path,' / '))[5],
         'parentCountry','US')
FROM (VALUES
  ('geo-us-bil-downtown','Downtown','Geography / Countries / North America / United States / Montana / Billings / Downtown'),
  ('geo-us-bil-billings-heights','Billings Heights','Geography / Countries / North America / United States / Montana / Billings / Billings Heights'),
  ('geo-us-bil-west-end','West End','Geography / Countries / North America / United States / Montana / Billings / West End'),
  ('geo-us-bil-south-side','South Side','Geography / Countries / North America / United States / Montana / Billings / South Side'),
  ('geo-us-bil-central-billings','Central Billings','Geography / Countries / North America / United States / Montana / Billings / Central Billings'),
  ('geo-us-bil-north-park','North Park','Geography / Countries / North America / United States / Montana / Billings / North Park'),
  ('geo-us-mso-downtown','Downtown','Geography / Countries / North America / United States / Montana / Missoula / Downtown'),
  ('geo-us-mso-university-district','University District','Geography / Countries / North America / United States / Montana / Missoula / University District'),
  ('geo-us-mso-rattlesnake','Rattlesnake','Geography / Countries / North America / United States / Montana / Missoula / Rattlesnake'),
  ('geo-us-mso-northside','Northside','Geography / Countries / North America / United States / Montana / Missoula / Northside'),
  ('geo-us-mso-westside','Westside','Geography / Countries / North America / United States / Montana / Missoula / Westside'),
  ('geo-us-mso-franklin-to-the-fort','Franklin to the Fort','Geography / Countries / North America / United States / Montana / Missoula / Franklin to the Fort'),
  ('geo-us-mso-south-hills','South Hills','Geography / Countries / North America / United States / Montana / Missoula / South Hills'),
  ('geo-us-mso-grant-creek','Grant Creek','Geography / Countries / North America / United States / Montana / Missoula / Grant Creek'),
  ('geo-us-boz-downtown','Downtown','Geography / Countries / North America / United States / Montana / Bozeman / Downtown'),
  ('geo-us-boz-midtown','Midtown','Geography / Countries / North America / United States / Montana / Bozeman / Midtown'),
  ('geo-us-boz-northeast','Northeast','Geography / Countries / North America / United States / Montana / Bozeman / Northeast'),
  ('geo-us-boz-bon-ton','Bon Ton','Geography / Countries / North America / United States / Montana / Bozeman / Bon Ton'),
  ('geo-us-boz-cooper-park','Cooper Park','Geography / Countries / North America / United States / Montana / Bozeman / Cooper Park'),
  ('geo-us-boz-university','University','Geography / Countries / North America / United States / Montana / Bozeman / University'),
  ('geo-us-boz-story-mill-district','Story Mill District','Geography / Countries / North America / United States / Montana / Bozeman / Story Mill District'),
  ('geo-us-gtf-downtown','Downtown','Geography / Countries / North America / United States / Montana / Great Falls / Downtown'),
  ('geo-us-gtf-riverview','Riverview','Geography / Countries / North America / United States / Montana / Great Falls / Riverview'),
  ('geo-us-gtf-fox-farm','Fox Farm','Geography / Countries / North America / United States / Montana / Great Falls / Fox Farm'),
  ('geo-us-gtf-westside','Westside','Geography / Countries / North America / United States / Montana / Great Falls / Westside'),
  ('geo-us-gtf-sunnyside','Sunnyside','Geography / Countries / North America / United States / Montana / Great Falls / Sunnyside'),
  ('geo-us-gtf-skyline','Skyline','Geography / Countries / North America / United States / Montana / Great Falls / Skyline'),
  ('geo-us-hln-downtown','Downtown','Geography / Countries / North America / United States / Montana / Helena / Downtown'),
  ('geo-us-hln-westside','Westside','Geography / Countries / North America / United States / Montana / Helena / Westside'),
  ('geo-us-hln-sixth-ward','Sixth Ward','Geography / Countries / North America / United States / Montana / Helena / Sixth Ward'),
  ('geo-us-hln-railroad-district','Railroad District','Geography / Countries / North America / United States / Montana / Helena / Railroad District'),
  ('geo-us-hln-south-hills','South Hills','Geography / Countries / North America / United States / Montana / Helena / South Hills'),
  ('geo-us-btm-uptown','Uptown','Geography / Countries / North America / United States / Montana / Butte / Uptown'),
  ('geo-us-btm-the-flats','The Flats','Geography / Countries / North America / United States / Montana / Butte / The Flats'),
  ('geo-us-btm-centerville','Centerville','Geography / Countries / North America / United States / Montana / Butte / Centerville'),
  ('geo-us-btm-east-side','East Side','Geography / Countries / North America / United States / Montana / Butte / East Side')
) AS v(id, name, path);

UPDATE public.atoms SET is_leaf = false
WHERE id IN ('geo-us-city-billings-mt','geo-us-city-missoula-mt','geo-us-city-bozeman-mt','geo-us-city-great-falls-mt','geo-us-city-helena-mt','geo-us-city-butte-mt');
