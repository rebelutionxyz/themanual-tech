-- APPLIED to prod 2026-06-14 via MCP. PARITY file.
-- Life domains deep pass: add the central wellbeing concepts.
INSERT INTO public.atoms (id,name,path,path_parts,realm_id,realm_name,depth,type,kettle,is_leaf,realm_tags,pillar_tags,skin_tags,status) VALUES
 ('self-life-domains-quality-wellbeing','Well-being','Self / Life domains / Quality of life & balance / Well-being',ARRAY['Self','Life domains','Quality of life & balance','Well-being']::text[],'self','Self',4,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live'),
 ('self-life-domains-quality-life-satisfaction','Life satisfaction','Self / Life domains / Quality of life & balance / Life satisfaction',ARRAY['Self','Life domains','Quality of life & balance','Life satisfaction']::text[],'self','Self',4,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live');
