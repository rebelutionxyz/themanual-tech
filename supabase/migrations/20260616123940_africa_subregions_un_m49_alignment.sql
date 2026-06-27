-- APPLIED to prod 2026-06-16 via MCP. PARITY file.
-- 1) Create the 4 UN M49-named region nodes (Southern Africa already exists, correct name).
INSERT INTO atoms (id,name,path,path_parts,realm_id,realm_name,depth,type,kettle,is_leaf,
  theme_tags,realm_tags,pillar_tags,skin_tags,geo,note,meta,created_at,updated_at,
  canonical_url,canonical_source,band,status)
SELECT
  'geo-'||trim(both '-' from lower(regexp_replace(s.name,'[^a-zA-Z0-9]+','-','g'))),
  s.name, 'Geography / Countries / '||s.name, ARRAY['Geography','Countries',s.name],
  'geography','Geography',3,'region','Accepted',false,
  ARRAY[]::text[],ARRAY['Geography'],ARRAY['MANUAL'],ARRAY['HoneyComb'],
  NULL,NULL,'{}'::jsonb,now(),now(),NULL,NULL,NULL,'live'
FROM (VALUES ('Northern Africa'),('Eastern Africa'),('Western Africa'),('Middle Africa')) AS s(name)
WHERE NOT EXISTS (SELECT 1 FROM atoms a WHERE a.path = 'Geography / Countries / '||s.name);

-- 2) Remap every African country (+ descendants) to its UN M49 subregion.
WITH m(country, sub) AS (VALUES
  ('Algeria','Northern Africa'),('Angola','Middle Africa'),('Benin','Western Africa'),
  ('Botswana','Southern Africa'),('Burkina Faso','Western Africa'),('Burundi','Eastern Africa'),
  ('Cameroon','Middle Africa'),('Cape Verde','Western Africa'),('Central African Republic','Middle Africa'),
  ('Chad','Middle Africa'),('Comoros','Eastern Africa'),('Democratic Republic of the Congo','Middle Africa'),
  ('Djibouti','Eastern Africa'),('Egypt','Northern Africa'),('Equatorial Guinea','Middle Africa'),
  ('Eritrea','Eastern Africa'),('Eswatini','Southern Africa'),('Ethiopia','Eastern Africa'),
  ('Gabon','Middle Africa'),('Gambia','Western Africa'),('Ghana','Western Africa'),
  ('Guinea','Western Africa'),('Guinea-Bissau','Western Africa'),('Ivory Coast','Western Africa'),
  ('Kenya','Eastern Africa'),('Lesotho','Southern Africa'),('Liberia','Western Africa'),
  ('Libya','Northern Africa'),('Madagascar','Eastern Africa'),('Malawi','Eastern Africa'),
  ('Mali','Western Africa'),('Mauritania','Western Africa'),('Mauritius','Eastern Africa'),
  ('Mayotte','Eastern Africa'),('Morocco','Northern Africa'),('Mozambique','Eastern Africa'),
  ('Namibia','Southern Africa'),('Niger','Western Africa'),('Nigeria','Western Africa'),
  ('Puntland','Eastern Africa'),('Republic of the Congo','Middle Africa'),('Rwanda','Eastern Africa'),
  ('Sahrawi Arab Democratic Republic','Northern Africa'),('Saint Helena','Western Africa'),
  ('São Tomé and Príncipe','Middle Africa'),('Senegal','Western Africa'),('Seychelles','Eastern Africa'),
  ('Sierra Leone','Western Africa'),('Somalia','Eastern Africa'),('Somaliland','Eastern Africa'),
  ('South Africa','Southern Africa'),('South Sudan','Eastern Africa'),('Sudan','Northern Africa'),
  ('Tanzania','Eastern Africa'),('Togo','Western Africa'),('Tunisia','Northern Africa'),
  ('Uganda','Eastern Africa'),('Western Sahara','Northern Africa'),('Zambia','Eastern Africa'),
  ('Zimbabwe','Eastern Africa')
)
UPDATE atoms a
SET path_parts = ARRAY['Geography','Countries', m.sub] || a.path_parts[4:],
    path       = array_to_string(ARRAY['Geography','Countries', m.sub] || a.path_parts[4:], ' / '),
    geo        = CASE WHEN a.type='country'
                      THEN coalesce(a.geo,'{}'::jsonb) || jsonb_build_object('subregion', m.sub)
                      ELSE a.geo END,
    updated_at = now()
FROM m
WHERE a.realm_id='geography' AND a.path_parts[2]='Countries'
  AND a.path_parts[3] IN ('North Africa','East Africa','West Africa','Central Africa',
                          'Southern Africa','Dependencies (Africa)')
  AND a.path_parts[4] = m.country;

-- 3) Delete the 5 superseded region nodes (keep Southern Africa).
DELETE FROM atoms WHERE realm_id='geography' AND type='region'
  AND name IN ('North Africa','East Africa','West Africa','Central Africa','Dependencies (Africa)');
