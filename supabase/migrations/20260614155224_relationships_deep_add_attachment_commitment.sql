-- APPLIED to prod 2026-06-14 via MCP. PARITY file.
-- Relationships deep pass: add the core missing relationship-science dynamics.
INSERT INTO public.atoms (id,name,path,path_parts,realm_id,realm_name,depth,type,kettle,is_leaf,realm_tags,pillar_tags,skin_tags,status) VALUES
 ('self-relationships-dynamics-attachment','Attachment (psychology)','Self / Relationships / Relationship dynamics / Attachment (psychology)',ARRAY['Self','Relationships','Relationship dynamics','Attachment (psychology)']::text[],'self','Self',4,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live'),
 ('self-relationships-dynamics-commitment','Commitment','Self / Relationships / Relationship dynamics / Commitment',ARRAY['Self','Relationships','Relationship dynamics','Commitment']::text[],'self','Self',4,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live');
