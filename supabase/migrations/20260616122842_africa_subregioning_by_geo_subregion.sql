-- APPLIED to prod 2026-06-16 via MCP. PARITY file.
-- 1) Create 6 African subregion nodes (type=region, cloned from the Middle East shape).
INSERT INTO atoms (id,name,path,path_parts,realm_id,realm_name,depth,type,kettle,is_leaf,
  theme_tags,realm_tags,pillar_tags,skin_tags,geo,note,meta,created_at,updated_at,
  canonical_url,canonical_source,band,status)
SELECT
  'geo-'||trim(both '-' from lower(regexp_replace(s.name,'[^a-zA-Z0-9]+','-','g'))),
  s.name,
  'Geography / Countries / '||s.name,
  ARRAY['Geography','Countries',s.name],
  'geography','Geography',3,'region','Accepted',false,
  ARRAY[]::text[],ARRAY['Geography'],ARRAY['MANUAL'],ARRAY['HoneyComb'],
  NULL,NULL,'{}'::jsonb,now(),now(),NULL,NULL,NULL,'live'
FROM (VALUES ('North Africa'),('West Africa'),('East Africa'),
             ('Central Africa'),('Southern Africa'),('Dependencies (Africa)')) AS s(name)
WHERE NOT EXISTS (SELECT 1 FROM atoms a WHERE a.path = 'Geography / Countries / '||s.name);

-- 2) Re-parent African countries + descendants by each country's geo.subregion.
WITH cmap AS (
  SELECT name AS country, geo->>'subregion' AS sub
  FROM atoms
  WHERE realm_id='geography' AND type='country' AND path_parts[3]='Africa'
)
UPDATE atoms a
SET path_parts = (ARRAY['Geography','Countries', c.sub] || a.path_parts[4:]),
    path       = array_to_string(ARRAY['Geography','Countries', c.sub] || a.path_parts[4:], ' / '),
    updated_at = now()
FROM cmap c
WHERE a.realm_id='geography'
  AND a.path_parts[2]='Countries' AND a.path_parts[3]='Africa'
  AND a.path_parts[4] = c.country;

-- 3) Remove the now-childless Africa continent node.
DELETE FROM atoms WHERE id='geo-continent-africa';
