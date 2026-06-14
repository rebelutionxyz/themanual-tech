-- APPLIED to prod 2026-06-14 via MCP. PARITY file.
-- Personality deep pass: Big Five is a MODEL, not the trait construct. Move it
-- from Traits & temperament into Theories & type systems, make it a parent, and
-- give it its canonical five-factor (OCEAN) children at L5.

-- 1) relocate Big Five -> Theories & type systems, flip to parent
UPDATE public.atoms SET is_leaf=false,
  path='Self / Personality / Theories & type systems / Big Five personality traits',
  path_parts=ARRAY['Self','Personality','Theories & type systems','Big Five personality traits']::text[]
 WHERE path='Self / Personality / Traits & temperament / Big Five personality traits';

-- 2) the five factors as L5
INSERT INTO public.atoms (id,name,path,path_parts,realm_id,realm_name,depth,type,kettle,is_leaf,realm_tags,pillar_tags,skin_tags,status) VALUES
 ('self-personality-bigfive-openness','Openness to experience','Self / Personality / Theories & type systems / Big Five personality traits / Openness to experience',ARRAY['Self','Personality','Theories & type systems','Big Five personality traits','Openness to experience']::text[],'self','Self',5,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live'),
 ('self-personality-bigfive-conscientiousness','Conscientiousness','Self / Personality / Theories & type systems / Big Five personality traits / Conscientiousness',ARRAY['Self','Personality','Theories & type systems','Big Five personality traits','Conscientiousness']::text[],'self','Self',5,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live'),
 ('self-personality-bigfive-extraversion','Extraversion','Self / Personality / Theories & type systems / Big Five personality traits / Extraversion',ARRAY['Self','Personality','Theories & type systems','Big Five personality traits','Extraversion']::text[],'self','Self',5,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live'),
 ('self-personality-bigfive-agreeableness','Agreeableness','Self / Personality / Theories & type systems / Big Five personality traits / Agreeableness',ARRAY['Self','Personality','Theories & type systems','Big Five personality traits','Agreeableness']::text[],'self','Self',5,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live'),
 ('self-personality-bigfive-neuroticism','Neuroticism','Self / Personality / Theories & type systems / Big Five personality traits / Neuroticism',ARRAY['Self','Personality','Theories & type systems','Big Five personality traits','Neuroticism']::text[],'self','Self',5,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live');
