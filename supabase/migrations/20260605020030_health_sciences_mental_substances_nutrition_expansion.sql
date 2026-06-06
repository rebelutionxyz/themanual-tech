-- =====================================================================
-- Migration 20260605020030 — health_sciences_mental_substances_nutrition_expansion
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-05 via apply_migration.
-- The Manual spine · Health realm (batch 2b) · 57 atoms.
--
-- Additive + idempotent (WHERE NOT EXISTS on id). type='event', kettle='Accepted'.
-- OUTCOME-FAITHFUL reconstruction from applied prod state (no draft existed):
--   path_parts = string_to_array(path,' / ');  depth = array_length(path_parts,1);
--   realm_id = 'health';  realm_name = 'Health'.
-- =====================================================================

INSERT INTO public.atoms (id, name, path, path_parts, realm_id, realm_name, depth, type, is_leaf, kettle)
SELECT v.id, v.name, v.path, string_to_array(v.path, ' / '),
       'health', 'Health', array_length(string_to_array(v.path, ' / '), 1),
       'event', v.is_leaf, v.kettle
FROM (VALUES
  -- Health sciences
  ('health-health-sciences-bacteriology','Bacteriology','Health / Health sciences / Bacteriology',true,'Accepted'),
  ('health-health-sciences-biochemistry','Biochemistry','Health / Health sciences / Biochemistry',true,'Accepted'),
  ('health-health-sciences-biomedical-science','Biomedical science','Health / Health sciences / Biomedical science',true,'Accepted'),
  ('health-health-sciences-embryology','Embryology','Health / Health sciences / Embryology',true,'Accepted'),
  ('health-health-sciences-histology','Histology','Health / Health sciences / Histology',true,'Accepted'),
  ('health-health-sciences-immunology','Immunology','Health / Health sciences / Immunology',true,'Accepted'),
  ('health-health-sciences-microbiology','Microbiology','Health / Health sciences / Microbiology',true,'Accepted'),
  ('health-health-sciences-neuroscience','Neuroscience','Health / Health sciences / Neuroscience',true,'Accepted'),
  ('health-health-sciences-pharmacology','Pharmacology','Health / Health sciences / Pharmacology',true,'Accepted'),
  ('health-health-sciences-physiology','Physiology','Health / Health sciences / Physiology',true,'Accepted'),
  ('health-health-sciences-radiology','Radiology','Health / Health sciences / Radiology',true,'Accepted'),
  ('health-health-sciences-toxicology','Toxicology','Health / Health sciences / Toxicology',true,'Accepted'),
  ('health-health-sciences-virology','Virology','Health / Health sciences / Virology',true,'Accepted'),
  -- Mental health
  ('health-mental-health-adhd','ADHD','Health / Mental health / ADHD',true,'Accepted'),
  ('health-mental-health-anxiety-disorders','Anxiety disorders','Health / Mental health / Anxiety disorders',true,'Accepted'),
  ('health-mental-health-dissociative-disorders','Dissociative disorders','Health / Mental health / Dissociative disorders',true,'Accepted'),
  ('health-mental-health-ocd','OCD','Health / Mental health / OCD',true,'Accepted'),
  ('health-mental-health-panic-disorder','Panic disorder','Health / Mental health / Panic disorder',true,'Accepted'),
  ('health-mental-health-personality-disorders','Personality disorders','Health / Mental health / Personality disorders',true,'Accepted'),
  ('health-mental-health-phobias','Phobias','Health / Mental health / Phobias',true,'Accepted'),
  ('health-mental-health-ptsd','PTSD','Health / Mental health / PTSD',true,'Accepted'),
  ('health-mental-health-schizophrenia','Schizophrenia','Health / Mental health / Schizophrenia',true,'Accepted'),
  -- Nutrition / Dietary supplements / Minerals
  ('health-nutrition-dietary-supplements-minerals-calcium','Calcium','Health / Nutrition / Dietary supplements / Minerals / Calcium',true,'Accepted'),
  ('health-nutrition-dietary-supplements-minerals-iodine','Iodine','Health / Nutrition / Dietary supplements / Minerals / Iodine',true,'Accepted'),
  ('health-nutrition-dietary-supplements-minerals-iron','Iron','Health / Nutrition / Dietary supplements / Minerals / Iron',true,'Accepted'),
  ('health-nutrition-dietary-supplements-minerals-magnesium','Magnesium','Health / Nutrition / Dietary supplements / Minerals / Magnesium',true,'Accepted'),
  ('health-nutrition-dietary-supplements-minerals-potassium','Potassium','Health / Nutrition / Dietary supplements / Minerals / Potassium',true,'Accepted'),
  ('health-nutrition-dietary-supplements-minerals-selenium','Selenium','Health / Nutrition / Dietary supplements / Minerals / Selenium',true,'Accepted'),
  ('health-nutrition-dietary-supplements-minerals-sodium','Sodium','Health / Nutrition / Dietary supplements / Minerals / Sodium',true,'Accepted'),
  ('health-nutrition-dietary-supplements-minerals-zinc','Zinc','Health / Nutrition / Dietary supplements / Minerals / Zinc',true,'Accepted'),
  -- Nutrition / Dietary supplements / Vitamins
  ('health-nutrition-dietary-supplements-vitamins-vitamin-a','Vitamin A','Health / Nutrition / Dietary supplements / Vitamins / Vitamin A',true,'Accepted'),
  ('health-nutrition-dietary-supplements-vitamins-vitamin-c','Vitamin C','Health / Nutrition / Dietary supplements / Vitamins / Vitamin C',true,'Accepted'),
  ('health-nutrition-dietary-supplements-vitamins-vitamin-d','Vitamin D','Health / Nutrition / Dietary supplements / Vitamins / Vitamin D',true,'Accepted'),
  ('health-nutrition-dietary-supplements-vitamins-vitamin-e','Vitamin E','Health / Nutrition / Dietary supplements / Vitamins / Vitamin E',true,'Accepted'),
  ('health-nutrition-dietary-supplements-vitamins-vitamin-k','Vitamin K','Health / Nutrition / Dietary supplements / Vitamins / Vitamin K',true,'Accepted'),
  -- Substances / Recreational drugs (new parent categories is_leaf=false)
  ('health-substances-recreational-drugs-depressants','Depressants','Health / Substances / Recreational drugs / Depressants',false,'Accepted'),
  ('health-substances-recreational-drugs-depressants-barbiturates','Barbiturates','Health / Substances / Recreational drugs / Depressants / Barbiturates',true,'Accepted'),
  ('health-substances-recreational-drugs-depressants-benzodiazepines','Benzodiazepines','Health / Substances / Recreational drugs / Depressants / Benzodiazepines',true,'Accepted'),
  ('health-substances-recreational-drugs-dissociatives','Dissociatives','Health / Substances / Recreational drugs / Dissociatives',false,'Accepted'),
  ('health-substances-recreational-drugs-dissociatives-ketamine','Ketamine','Health / Substances / Recreational drugs / Dissociatives / Ketamine',true,'Accepted'),
  ('health-substances-recreational-drugs-dissociatives-pcp','PCP','Health / Substances / Recreational drugs / Dissociatives / PCP',true,'Accepted'),
  ('health-substances-recreational-drugs-inhalants','Inhalants','Health / Substances / Recreational drugs / Inhalants',true,'Accepted'),
  ('health-substances-recreational-drugs-opioids','Opioids','Health / Substances / Recreational drugs / Opioids',false,'Accepted'),
  ('health-substances-recreational-drugs-opioids-fentanyl','Fentanyl','Health / Substances / Recreational drugs / Opioids / Fentanyl',true,'Accepted'),
  ('health-substances-recreational-drugs-opioids-heroin','Heroin','Health / Substances / Recreational drugs / Opioids / Heroin',true,'Accepted'),
  ('health-substances-recreational-drugs-opioids-morphine','Morphine','Health / Substances / Recreational drugs / Opioids / Morphine',true,'Accepted'),
  ('health-substances-recreational-drugs-opioids-oxycodone','Oxycodone','Health / Substances / Recreational drugs / Opioids / Oxycodone',true,'Accepted'),
  ('health-substances-recreational-drugs-psychedelics','Psychedelics','Health / Substances / Recreational drugs / Psychedelics',false,'Accepted'),
  ('health-substances-recreational-drugs-psychedelics-dmt','DMT','Health / Substances / Recreational drugs / Psychedelics / DMT',true,'Accepted'),
  ('health-substances-recreational-drugs-psychedelics-lsd','LSD','Health / Substances / Recreational drugs / Psychedelics / LSD',true,'Accepted'),
  ('health-substances-recreational-drugs-psychedelics-mescaline','Mescaline','Health / Substances / Recreational drugs / Psychedelics / Mescaline',true,'Accepted'),
  ('health-substances-recreational-drugs-psychedelics-psilocybin','Psilocybin','Health / Substances / Recreational drugs / Psychedelics / Psilocybin',true,'Accepted'),
  ('health-substances-recreational-drugs-stimulants','Stimulants','Health / Substances / Recreational drugs / Stimulants',false,'Accepted'),
  ('health-substances-recreational-drugs-stimulants-amphetamine','Amphetamine','Health / Substances / Recreational drugs / Stimulants / Amphetamine',true,'Accepted'),
  ('health-substances-recreational-drugs-stimulants-cocaine','Cocaine','Health / Substances / Recreational drugs / Stimulants / Cocaine',true,'Accepted'),
  ('health-substances-recreational-drugs-stimulants-mdma','MDMA','Health / Substances / Recreational drugs / Stimulants / MDMA',true,'Accepted'),
  ('health-substances-recreational-drugs-stimulants-methamphetamine','Methamphetamine','Health / Substances / Recreational drugs / Stimulants / Methamphetamine',true,'Accepted')
) AS v(id, name, path, is_leaf, kettle)
WHERE NOT EXISTS (SELECT 1 FROM public.atoms a WHERE a.id = v.id);

-- parent flips: pre-existing leaves that gained their first children here
UPDATE public.atoms SET is_leaf = false
WHERE id IN (
  'health-nutrition-dietary-supplements-minerals',
  'health-substances-recreational-drugs'
)
AND EXISTS (SELECT 1 FROM public.atoms c WHERE c.path LIKE public.atoms.path || ' / %');
