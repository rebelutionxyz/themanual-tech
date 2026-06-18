-- APPLIED to prod 2026-06-14 via MCP. PARITY file.
-- Identity attributes deep pass: turn the umbrella concepts into proper parents.
-- Specific orientations are TYPES of "Sexual orientation"; specific gender
-- identities are TYPES of "Gender identity". Express that at L5.

-- Sexual orientation -> parent
UPDATE public.atoms SET is_leaf=false WHERE path='Self / Identity attributes / Sexuality / Sexual orientation';
UPDATE public.atoms SET depth=5, path='Self / Identity attributes / Sexuality / Sexual orientation / Homosexuality', path_parts=ARRAY['Self','Identity attributes','Sexuality','Sexual orientation','Homosexuality']::text[]
 WHERE path='Self / Identity attributes / Sexuality / Homosexuality';
INSERT INTO public.atoms (id,name,path,path_parts,realm_id,realm_name,depth,type,kettle,is_leaf,realm_tags,pillar_tags,skin_tags,status) VALUES
 ('self-identity-sexorient-heterosexuality','Heterosexuality','Self / Identity attributes / Sexuality / Sexual orientation / Heterosexuality',ARRAY['Self','Identity attributes','Sexuality','Sexual orientation','Heterosexuality']::text[],'self','Self',5,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live'),
 ('self-identity-sexorient-bisexuality','Bisexuality','Self / Identity attributes / Sexuality / Sexual orientation / Bisexuality',ARRAY['Self','Identity attributes','Sexuality','Sexual orientation','Bisexuality']::text[],'self','Self',5,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live'),
 ('self-identity-sexorient-asexuality','Asexuality','Self / Identity attributes / Sexuality / Sexual orientation / Asexuality',ARRAY['Self','Identity attributes','Sexuality','Sexual orientation','Asexuality']::text[],'self','Self',5,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live');

-- Gender identity -> parent
UPDATE public.atoms SET is_leaf=false WHERE path='Self / Identity attributes / Sex & gender / Gender identity';
INSERT INTO public.atoms (id,name,path,path_parts,realm_id,realm_name,depth,type,kettle,is_leaf,realm_tags,pillar_tags,skin_tags,status) VALUES
 ('self-identity-genderid-cisgender','Cisgender','Self / Identity attributes / Sex & gender / Gender identity / Cisgender',ARRAY['Self','Identity attributes','Sex & gender','Gender identity','Cisgender']::text[],'self','Self',5,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live'),
 ('self-identity-genderid-transgender','Transgender','Self / Identity attributes / Sex & gender / Gender identity / Transgender',ARRAY['Self','Identity attributes','Sex & gender','Gender identity','Transgender']::text[],'self','Self',5,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live'),
 ('self-identity-genderid-nonbinary','Non-binary gender','Self / Identity attributes / Sex & gender / Gender identity / Non-binary gender',ARRAY['Self','Identity attributes','Sex & gender','Gender identity','Non-binary gender']::text[],'self','Self',5,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live');
