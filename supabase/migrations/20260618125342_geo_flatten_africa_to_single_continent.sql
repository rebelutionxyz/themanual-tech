-- 1. New Africa continent node (sibling of Asia/Europe/North America/Oceania/South America)
INSERT INTO atoms (id,name,path,path_parts,realm_id,realm_name,depth,type,kettle,
  is_leaf,theme_tags,realm_tags,pillar_tags,skin_tags,geo,note,meta,status,created_at,updated_at)
VALUES ('geo-continent-africa','Africa','Geography / Countries / Africa',
  ARRAY['Geography','Countries','Africa'],'geography','Geography',3,'continent','Accepted',
  false,'{}',ARRAY['Geography'],ARRAY['MANUAL'],ARRAY['HoneyComb'],NULL,NULL,'{}'::jsonb,'live',now(),now());

-- 2. Preserve UN sub-region as a meta facet on every atom under the 5 regions (before scaffolding is gone)
UPDATE atoms SET meta = meta || jsonb_build_object('un_subregion', path_parts[3]), updated_at = now()
WHERE realm_id='geography' AND depth>=4 AND path_parts[1]='Geography' AND path_parts[2]='Countries'
  AND path_parts[3] IN ('Eastern Africa','Middle Africa','Northern Africa','Southern Africa','Western Africa');

-- 3. Re-parent descendants to Africa (depth-preserving: only path segment 3 changes)
UPDATE atoms SET
  path_parts = path_parts[1:2] || ARRAY['Africa'] || path_parts[4:array_length(path_parts,1)],
  path = array_to_string(path_parts[1:2] || ARRAY['Africa'] || path_parts[4:array_length(path_parts,1)],' / '),
  updated_at = now()
WHERE realm_id='geography' AND depth>=4 AND path_parts[1]='Geography' AND path_parts[2]='Countries'
  AND path_parts[3] IN ('Eastern Africa','Middle Africa','Northern Africa','Southern Africa','Western Africa');

-- 4. Remove the now-empty region scaffolding
DELETE FROM atoms WHERE id IN
  ('geo-eastern-africa','geo-middle-africa','geo-northern-africa','geo-southern-africa','geo-western-africa');