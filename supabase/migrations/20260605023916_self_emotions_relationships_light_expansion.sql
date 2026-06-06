-- =====================================================================
-- Migration 20260605023916 — self_emotions_relationships_light_expansion
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-05 via apply_migration.
-- The Manual spine · Self realm · 20 atoms NET-INSERTED.
--
-- NOTE: dispatch cites "21 atoms" — the authored VALUES count; 1 was idempotent-
-- skipped (already in the spine), so 20 new rows landed (the atoms sharing this
-- migration's created_at in prod). Sequential replay reproduces the end state.
--
-- Additive + idempotent. type='event', kettle='Accepted'. realm_id='self'.
-- OUTCOME-FAITHFUL reconstruction from prod (no draft existed); derived
-- path_parts/realm_name/depth from path.
-- =====================================================================

INSERT INTO public.atoms (id, name, path, path_parts, realm_id, realm_name, depth, type, is_leaf, kettle)
SELECT v.id, v.name, v.path, string_to_array(v.path, ' / '),
       'self', 'Self', array_length(string_to_array(v.path, ' / '), 1),
       'event', v.is_leaf, v.kettle
FROM (VALUES
  -- Mind and thought / Emotion (leaves under pre-existing Emotion — flipped below)
  ('self-mind-and-thought-emotion-anger','Anger','Self / Mind and thought / Emotion / Anger',true,'Accepted'),
  ('self-mind-and-thought-emotion-disgust','Disgust','Self / Mind and thought / Emotion / Disgust',true,'Accepted'),
  ('self-mind-and-thought-emotion-empathy','Empathy','Self / Mind and thought / Emotion / Empathy',true,'Accepted'),
  ('self-mind-and-thought-emotion-envy','Envy','Self / Mind and thought / Emotion / Envy',true,'Accepted'),
  ('self-mind-and-thought-emotion-fear','Fear','Self / Mind and thought / Emotion / Fear',true,'Accepted'),
  ('self-mind-and-thought-emotion-gratitude','Gratitude','Self / Mind and thought / Emotion / Gratitude',true,'Accepted'),
  ('self-mind-and-thought-emotion-guilt','Guilt','Self / Mind and thought / Emotion / Guilt',true,'Accepted'),
  ('self-mind-and-thought-emotion-joy','Joy','Self / Mind and thought / Emotion / Joy',true,'Accepted'),
  ('self-mind-and-thought-emotion-love-emotion','Love (emotion)','Self / Mind and thought / Emotion / Love (emotion)',true,'Accepted'),
  ('self-mind-and-thought-emotion-pride','Pride','Self / Mind and thought / Emotion / Pride',true,'Accepted'),
  ('self-mind-and-thought-emotion-sadness','Sadness','Self / Mind and thought / Emotion / Sadness',true,'Accepted'),
  ('self-mind-and-thought-emotion-shame','Shame','Self / Mind and thought / Emotion / Shame',true,'Accepted'),
  ('self-mind-and-thought-emotion-surprise','Surprise','Self / Mind and thought / Emotion / Surprise',true,'Accepted'),
  -- Relationships
  ('self-relationships-communication-interpersonal','Communication (interpersonal)','Self / Relationships / Communication (interpersonal)',true,'Accepted'),
  ('self-relationships-dating','Dating','Self / Relationships / Dating',true,'Accepted'),
  ('self-relationships-family-divorce','Divorce','Self / Relationships / Family / Divorce',true,'Accepted'),
  ('self-relationships-family-marriage','Marriage','Self / Relationships / Family / Marriage',true,'Accepted'),
  ('self-relationships-family-parenthood','Parenthood','Self / Relationships / Family / Parenthood',true,'Accepted'),
  ('self-relationships-family-siblings','Siblings','Self / Relationships / Family / Siblings',true,'Accepted'),
  ('self-relationships-trust','Trust','Self / Relationships / Trust',true,'Accepted')
) AS v(id, name, path, is_leaf, kettle)
WHERE NOT EXISTS (SELECT 1 FROM public.atoms a WHERE a.id = v.id);

-- parent flip: 'Emotion' was a leaf; now has children
UPDATE public.atoms SET is_leaf = false
WHERE id = 'self-mind-and-thought-emotion'
AND EXISTS (SELECT 1 FROM public.atoms c WHERE c.path LIKE public.atoms.path || ' / %');
