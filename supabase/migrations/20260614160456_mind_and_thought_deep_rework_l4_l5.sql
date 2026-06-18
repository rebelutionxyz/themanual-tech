-- APPLIED to prod 2026-06-14 via MCP. PARITY file.
-- ============ MIND AND THOUGHT — DEEP PASS (L4/L5) ============

-- (0) Reference parking lot for generic, non-Self concepts
INSERT INTO public.atoms (id,name,path,path_parts,realm_id,realm_name,depth,type,kettle,is_leaf,realm_tags,pillar_tags,skin_tags,status) VALUES
 ('reference-unsorted','Unsorted','Reference / Unsorted',ARRAY['Reference','Unsorted']::text[],'reference','Reference',2,'event','Accepted',false,ARRAY['Reference']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live');

-- (1) Effectiveness / Efficacy / Efficiency are not "thought" -> park in Reference/Unsorted
UPDATE public.atoms SET realm_id='reference', realm_name='Reference', depth=3,
  path=replace(path,'Self / Mind and thought / Qualities of thought / ','Reference / Unsorted / '),
  path_parts=ARRAY['Reference','Unsorted']::text[]||path_parts[4:]
 WHERE path IN ('Self / Mind and thought / Qualities of thought / Effectiveness','Self / Mind and thought / Qualities of thought / Efficacy','Self / Mind and thought / Qualities of thought / Efficiency');

-- (2) Prudence / Frugality are virtues -> Personality / Values & virtues / Virtues (L5)
UPDATE public.atoms SET is_leaf=false WHERE path='Self / Personality / Values & virtues / Virtues';
UPDATE public.atoms SET depth=5,
  path=replace(path,'Self / Mind and thought / Qualities of thought / ','Self / Personality / Values & virtues / Virtues / '),
  path_parts=ARRAY['Self','Personality','Values & virtues','Virtues']::text[]||path_parts[4:]
 WHERE path IN ('Self / Mind and thought / Qualities of thought / Prudence','Self / Mind and thought / Qualities of thought / Frugality');

-- (3) rename Qualities of thought -> Qualities of reasoning (Accuracy, Soundness, Validity remain)
UPDATE public.atoms SET name='Qualities of reasoning', path='Self / Mind and thought / Qualities of reasoning', path_parts=ARRAY['Self','Mind and thought','Qualities of reasoning']::text[]
 WHERE path='Self / Mind and thought / Qualities of thought';
UPDATE public.atoms SET path=replace(path,'Self / Mind and thought / Qualities of thought / ','Self / Mind and thought / Qualities of reasoning / '), path_parts=array_replace(path_parts,'Qualities of thought','Qualities of reasoning')
 WHERE realm_id='self' AND path LIKE 'Self / Mind and thought / Qualities of thought / %';

-- (4) Intelligence & aptitude: add the actual concepts; nest Mensa under High IQ society
INSERT INTO public.atoms (id,name,path,path_parts,realm_id,realm_name,depth,type,kettle,is_leaf,realm_tags,pillar_tags,skin_tags,status) VALUES
 ('self-mnt-intelligence','Intelligence','Self / Mind and thought / Intelligence & aptitude / Intelligence',ARRAY['Self','Mind and thought','Intelligence & aptitude','Intelligence']::text[],'self','Self',4,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live'),
 ('self-mnt-aptitude','Aptitude','Self / Mind and thought / Intelligence & aptitude / Aptitude',ARRAY['Self','Mind and thought','Intelligence & aptitude','Aptitude']::text[],'self','Self',4,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live');
UPDATE public.atoms SET is_leaf=false WHERE path='Self / Mind and thought / Intelligence & aptitude / High IQ society';
UPDATE public.atoms SET depth=5, path='Self / Mind and thought / Intelligence & aptitude / High IQ society / Mensa', path_parts=ARRAY['Self','Mind and thought','Intelligence & aptitude','High IQ society','Mensa']::text[]
 WHERE path='Self / Mind and thought / Intelligence & aptitude / Mensa';

-- (5) Creativity & imagination: flesh out
INSERT INTO public.atoms (id,name,path,path_parts,realm_id,realm_name,depth,type,kettle,is_leaf,realm_tags,pillar_tags,skin_tags,status) VALUES
 ('self-mnt-creativity','Creativity','Self / Mind and thought / Creativity & imagination / Creativity',ARRAY['Self','Mind and thought','Creativity & imagination','Creativity']::text[],'self','Self',4,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live'),
 ('self-mnt-innovation','Innovation','Self / Mind and thought / Creativity & imagination / Innovation',ARRAY['Self','Mind and thought','Creativity & imagination','Innovation']::text[],'self','Self',4,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live'),
 ('self-mnt-inspiration','Inspiration','Self / Mind and thought / Creativity & imagination / Inspiration',ARRAY['Self','Mind and thought','Creativity & imagination','Inspiration']::text[],'self','Self',4,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live');

-- (6) Learning & memory: add Learning + Knowledge; Memory -> types at L5
INSERT INTO public.atoms (id,name,path,path_parts,realm_id,realm_name,depth,type,kettle,is_leaf,realm_tags,pillar_tags,skin_tags,status) VALUES
 ('self-mnt-learning','Learning','Self / Mind and thought / Learning & memory / Learning',ARRAY['Self','Mind and thought','Learning & memory','Learning']::text[],'self','Self',4,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live'),
 ('self-mnt-knowledge','Knowledge','Self / Mind and thought / Learning & memory / Knowledge',ARRAY['Self','Mind and thought','Learning & memory','Knowledge']::text[],'self','Self',4,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live');
UPDATE public.atoms SET is_leaf=false WHERE path='Self / Mind and thought / Learning & memory / Memory';
INSERT INTO public.atoms (id,name,path,path_parts,realm_id,realm_name,depth,type,kettle,is_leaf,realm_tags,pillar_tags,skin_tags,status) VALUES
 ('self-mnt-memory-short-term','Short-term memory','Self / Mind and thought / Learning & memory / Memory / Short-term memory',ARRAY['Self','Mind and thought','Learning & memory','Memory','Short-term memory']::text[],'self','Self',5,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live'),
 ('self-mnt-memory-long-term','Long-term memory','Self / Mind and thought / Learning & memory / Memory / Long-term memory',ARRAY['Self','Mind and thought','Learning & memory','Memory','Long-term memory']::text[],'self','Self',5,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live'),
 ('self-mnt-memory-working','Working memory','Self / Mind and thought / Learning & memory / Memory / Working memory',ARRAY['Self','Mind and thought','Learning & memory','Memory','Working memory']::text[],'self','Self',5,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live');

-- (7) Reasoning & judgment: add core concepts
INSERT INTO public.atoms (id,name,path,path_parts,realm_id,realm_name,depth,type,kettle,is_leaf,realm_tags,pillar_tags,skin_tags,status) VALUES
 ('self-mnt-logic','Logic','Self / Mind and thought / Reasoning & judgment / Logic',ARRAY['Self','Mind and thought','Reasoning & judgment','Logic']::text[],'self','Self',4,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live'),
 ('self-mnt-critical-thinking','Critical thinking','Self / Mind and thought / Reasoning & judgment / Critical thinking',ARRAY['Self','Mind and thought','Reasoning & judgment','Critical thinking']::text[],'self','Self',4,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live'),
 ('self-mnt-judgment','Judgment','Self / Mind and thought / Reasoning & judgment / Judgment',ARRAY['Self','Mind and thought','Reasoning & judgment','Judgment']::text[],'self','Self',4,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live'),
 ('self-mnt-inference','Inference','Self / Mind and thought / Reasoning & judgment / Inference',ARRAY['Self','Mind and thought','Reasoning & judgment','Inference']::text[],'self','Self',4,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live');

-- (8) Thinking errors: give Cognitive bias and Fallacy real L5 exemplars
UPDATE public.atoms SET is_leaf=false WHERE path='Self / Mind and thought / Thinking errors / Cognitive bias';
INSERT INTO public.atoms (id,name,path,path_parts,realm_id,realm_name,depth,type,kettle,is_leaf,realm_tags,pillar_tags,skin_tags,status) VALUES
 ('self-mnt-cogbias-confirmation','Confirmation bias','Self / Mind and thought / Thinking errors / Cognitive bias / Confirmation bias',ARRAY['Self','Mind and thought','Thinking errors','Cognitive bias','Confirmation bias']::text[],'self','Self',5,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live'),
 ('self-mnt-cogbias-anchoring','Anchoring bias','Self / Mind and thought / Thinking errors / Cognitive bias / Anchoring bias',ARRAY['Self','Mind and thought','Thinking errors','Cognitive bias','Anchoring bias']::text[],'self','Self',5,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live'),
 ('self-mnt-cogbias-availability','Availability heuristic','Self / Mind and thought / Thinking errors / Cognitive bias / Availability heuristic',ARRAY['Self','Mind and thought','Thinking errors','Cognitive bias','Availability heuristic']::text[],'self','Self',5,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live'),
 ('self-mnt-cogbias-hindsight','Hindsight bias','Self / Mind and thought / Thinking errors / Cognitive bias / Hindsight bias',ARRAY['Self','Mind and thought','Thinking errors','Cognitive bias','Hindsight bias']::text[],'self','Self',5,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live'),
 ('self-mnt-cogbias-dunning-kruger','Dunning-Kruger effect','Self / Mind and thought / Thinking errors / Cognitive bias / Dunning-Kruger effect',ARRAY['Self','Mind and thought','Thinking errors','Cognitive bias','Dunning-Kruger effect']::text[],'self','Self',5,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live');
UPDATE public.atoms SET is_leaf=false WHERE path='Self / Mind and thought / Thinking errors / Fallacy';
INSERT INTO public.atoms (id,name,path,path_parts,realm_id,realm_name,depth,type,kettle,is_leaf,realm_tags,pillar_tags,skin_tags,status) VALUES
 ('self-mnt-fallacy-ad-hominem','Ad hominem','Self / Mind and thought / Thinking errors / Fallacy / Ad hominem',ARRAY['Self','Mind and thought','Thinking errors','Fallacy','Ad hominem']::text[],'self','Self',5,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live'),
 ('self-mnt-fallacy-straw-man','Straw man','Self / Mind and thought / Thinking errors / Fallacy / Straw man',ARRAY['Self','Mind and thought','Thinking errors','Fallacy','Straw man']::text[],'self','Self',5,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live'),
 ('self-mnt-fallacy-false-dilemma','False dilemma','Self / Mind and thought / Thinking errors / Fallacy / False dilemma',ARRAY['Self','Mind and thought','Thinking errors','Fallacy','False dilemma']::text[],'self','Self',5,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live'),
 ('self-mnt-fallacy-slippery-slope','Slippery slope','Self / Mind and thought / Thinking errors / Fallacy / Slippery slope',ARRAY['Self','Mind and thought','Thinking errors','Fallacy','Slippery slope']::text[],'self','Self',5,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live'),
 ('self-mnt-fallacy-circular','Circular reasoning','Self / Mind and thought / Thinking errors / Fallacy / Circular reasoning',ARRAY['Self','Mind and thought','Thinking errors','Fallacy','Circular reasoning']::text[],'self','Self',5,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live');

-- (9) Perception & attention: add Sensation
INSERT INTO public.atoms (id,name,path,path_parts,realm_id,realm_name,depth,type,kettle,is_leaf,realm_tags,pillar_tags,skin_tags,status) VALUES
 ('self-mnt-sensation','Sensation','Self / Mind and thought / Perception & attention / Sensation',ARRAY['Self','Mind and thought','Perception & attention','Sensation']::text[],'self','Self',4,'event','Accepted',true,ARRAY['Self']::text[],ARRAY['MANUAL']::text[],ARRAY['HoneyComb']::text[],'live');
