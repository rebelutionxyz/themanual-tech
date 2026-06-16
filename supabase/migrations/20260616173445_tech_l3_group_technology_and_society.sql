-- APPLIED to prod 2026-06-16 via Supabase MCP (apply_migration). PARITY file — verbatim from schema_migrations.
-- version: 20260616173445

-- L3 (Butch, 2026-06-16): give "Technology & society" sub-structure (32 flat -> 3 groups).
-- New group nodes clone realm/tag/kettle/band/status from the branch node for consistency.

INSERT INTO atoms (id,name,path,path_parts,realm_id,realm_name,depth,type,kettle,is_leaf,theme_tags,realm_tags,pillar_tags,skin_tags,geo,note,meta,canonical_url,canonical_source,band,status)
SELECT 'tech-concepts-and-issues-theory-and-dynamics','Theory & dynamics',
       'Tech / Technology & society / Theory & dynamics',
       ARRAY['Tech','Technology & society','Theory & dynamics'],
       realm_id,realm_name,3,'concept',kettle,false,theme_tags,realm_tags,pillar_tags,skin_tags,
       NULL,NULL,'{}'::jsonb,NULL,NULL,band,status
FROM atoms WHERE id='tech-concepts-and-issues';

INSERT INTO atoms (id,name,path,path_parts,realm_id,realm_name,depth,type,kettle,is_leaf,theme_tags,realm_tags,pillar_tags,skin_tags,geo,note,meta,canonical_url,canonical_source,band,status)
SELECT 'tech-concepts-and-issues-society-economy-and-impact','Society, economy & impact',
       'Tech / Technology & society / Society, economy & impact',
       ARRAY['Tech','Technology & society','Society, economy & impact'],
       realm_id,realm_name,3,'concept',kettle,false,theme_tags,realm_tags,pillar_tags,skin_tags,
       NULL,NULL,'{}'::jsonb,NULL,NULL,band,status
FROM atoms WHERE id='tech-concepts-and-issues';

INSERT INTO atoms (id,name,path,path_parts,realm_id,realm_name,depth,type,kettle,is_leaf,theme_tags,realm_tags,pillar_tags,skin_tags,geo,note,meta,canonical_url,canonical_source,band,status)
SELECT 'tech-concepts-and-issues-futures-and-transhumanism','Futures & transhumanism',
       'Tech / Technology & society / Futures & transhumanism',
       ARRAY['Tech','Technology & society','Futures & transhumanism'],
       realm_id,realm_name,3,'concept',kettle,false,theme_tags,realm_tags,pillar_tags,skin_tags,
       NULL,NULL,'{}'::jsonb,NULL,NULL,band,status
FROM atoms WHERE id='tech-concepts-and-issues';

-- Reparent the 32 items (depth 3 -> 4) into their groups
UPDATE atoms
SET path_parts = ARRAY['Tech','Technology & society','Theory & dynamics', path_parts[3]],
    path = 'Tech / Technology & society / Theory & dynamics / ' || path_parts[3],
    depth = 4, updated_at = now()
WHERE realm_id='tech' AND depth=3 AND path_parts[2]='Technology & society'
  AND path_parts[3] IN ('Applied science','Technology (concept)','High technology','Industry (tech)',
    'Research and development','Innovation','Diffusion of innovations','Technological diffusion',
    'Technological convergence','Technological evolution','Technological determinism','Technology lifecycle',
    'Technology tree','Technology acceptance model');

UPDATE atoms
SET path_parts = ARRAY['Tech','Technology & society','Society, economy & impact', path_parts[3]],
    path = 'Tech / Technology & society / Society, economy & impact / ' || path_parts[3],
    depth = 4, updated_at = now()
WHERE realm_id='tech' AND depth=3 AND path_parts[2]='Technology & society'
  AND path_parts[3] IN ('Appropriate technology','Knowledge economy','Technocapitalism','Persuasion technology',
    'Pollution (tech impact)','Sustainability','Technology transfer','Strategy of technology',
    'Superpowers (technological)','Precautionary principle','Technology assessment','Technocriticism');

UPDATE atoms
SET path_parts = ARRAY['Tech','Technology & society','Futures & transhumanism', path_parts[3]],
    path = 'Tech / Technology & society / Futures & transhumanism / ' || path_parts[3],
    depth = 4, updated_at = now()
WHERE realm_id='tech' AND depth=3 AND path_parts[2]='Technology & society'
  AND path_parts[3] IN ('Accelerating change','Technological singularity','Transhumanism (tech)',
    'Techno-progressivism','Technorealism','Doomsday device');

-- Safety: recompute leaf flags
UPDATE atoms a
SET is_leaf = NOT EXISTS (SELECT 1 FROM atoms c WHERE c.realm_id='tech' AND c.path LIKE a.path || ' / %'),
    updated_at = now()
WHERE a.realm_id='tech'
  AND a.is_leaf <> NOT EXISTS (SELECT 1 FROM atoms c WHERE c.realm_id='tech' AND c.path LIKE a.path || ' / %');
