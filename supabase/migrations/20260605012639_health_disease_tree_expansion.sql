-- =====================================================================
-- Migration 20260605012639 — health_disease_tree_expansion
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-05 via apply_migration.
-- The Manual spine · Health realm · Disease subtree expansion (74 atoms).
--
-- Additive + idempotent (WHERE NOT EXISTS on id). type='event', kettle='Accepted'.
-- Health 183 → 257 (+74). 0 orphans.
--
-- PROVENANCE: no draft .sql existed in the repo for this migration (it was authored
-- inline and applied directly). This file is an OUTCOME-FAITHFUL reconstruction from
-- the applied production state (the 74 inserted atoms + the one parent flip), using
-- the standard derived-column convention:
--   path_parts = string_to_array(path, ' / ');  depth = array_length(path_parts, 1);
--   realm_id = 'health';  realm_name = 'Health'.
-- A fresh replay reproduces the exact end state. (string_to_array splits on ' / ',
-- so names containing '/' — HIV/AIDS, COVID-19 pandemic — stay intact.)
-- =====================================================================

INSERT INTO public.atoms (id, name, path, path_parts, realm_id, realm_name, depth, type, is_leaf, kettle)
SELECT v.id, v.name, v.path,
       string_to_array(v.path, ' / '),
       'health', 'Health',
       array_length(string_to_array(v.path, ' / '), 1),
       'event', v.is_leaf, v.kettle
FROM (VALUES

  -- ===== Autoimmune disease (new parent) =====
  ('health-illness-disease-autoimmune-disease','Autoimmune disease','Health / Illness / Disease / Autoimmune disease',false,'Accepted'),
  ('health-illness-disease-autoimmune-disease-celiac-disease','Celiac disease','Health / Illness / Disease / Autoimmune disease / Celiac disease',true,'Accepted'),
  ('health-illness-disease-autoimmune-disease-lupus','Lupus','Health / Illness / Disease / Autoimmune disease / Lupus',true,'Accepted'),
  ('health-illness-disease-autoimmune-disease-multiple-sclerosis','Multiple sclerosis','Health / Illness / Disease / Autoimmune disease / Multiple sclerosis',true,'Accepted'),
  ('health-illness-disease-autoimmune-disease-rheumatoid-arthritis','Rheumatoid arthritis','Health / Illness / Disease / Autoimmune disease / Rheumatoid arthritis',true,'Accepted'),

  -- ===== Blood disorders =====
  ('health-illness-disease-blood-disorders','Blood disorders','Health / Illness / Disease / Blood disorders',true,'Accepted'),

  -- ===== Cancer (new parent) =====
  ('health-illness-disease-cancer','Cancer','Health / Illness / Disease / Cancer',false,'Accepted'),
  ('health-illness-disease-cancer-brain-tumor','Brain tumor','Health / Illness / Disease / Cancer / Brain tumor',true,'Accepted'),
  ('health-illness-disease-cancer-breast-cancer','Breast cancer','Health / Illness / Disease / Cancer / Breast cancer',true,'Accepted'),
  ('health-illness-disease-cancer-colorectal-cancer','Colorectal cancer','Health / Illness / Disease / Cancer / Colorectal cancer',true,'Accepted'),
  ('health-illness-disease-cancer-leukemia','Leukemia','Health / Illness / Disease / Cancer / Leukemia',true,'Accepted'),
  ('health-illness-disease-cancer-liver-cancer','Liver cancer','Health / Illness / Disease / Cancer / Liver cancer',true,'Accepted'),
  ('health-illness-disease-cancer-lung-cancer','Lung cancer','Health / Illness / Disease / Cancer / Lung cancer',true,'Accepted'),
  ('health-illness-disease-cancer-lymphoma','Lymphoma','Health / Illness / Disease / Cancer / Lymphoma',true,'Accepted'),
  ('health-illness-disease-cancer-melanoma','Melanoma','Health / Illness / Disease / Cancer / Melanoma',true,'Accepted'),
  ('health-illness-disease-cancer-ovarian-cancer','Ovarian cancer','Health / Illness / Disease / Cancer / Ovarian cancer',true,'Accepted'),
  ('health-illness-disease-cancer-pancreatic-cancer','Pancreatic cancer','Health / Illness / Disease / Cancer / Pancreatic cancer',true,'Accepted'),
  ('health-illness-disease-cancer-prostate-cancer','Prostate cancer','Health / Illness / Disease / Cancer / Prostate cancer',true,'Accepted'),

  -- ===== Cardiovascular disease (new parent) =====
  ('health-illness-disease-cardiovascular-disease','Cardiovascular disease','Health / Illness / Disease / Cardiovascular disease',false,'Accepted'),
  ('health-illness-disease-cardiovascular-disease-arrhythmia','Arrhythmia','Health / Illness / Disease / Cardiovascular disease / Arrhythmia',true,'Accepted'),
  ('health-illness-disease-cardiovascular-disease-atherosclerosis','Atherosclerosis','Health / Illness / Disease / Cardiovascular disease / Atherosclerosis',true,'Accepted'),
  ('health-illness-disease-cardiovascular-disease-heart-attack','Heart attack','Health / Illness / Disease / Cardiovascular disease / Heart attack',true,'Accepted'),
  ('health-illness-disease-cardiovascular-disease-heart-failure','Heart failure','Health / Illness / Disease / Cardiovascular disease / Heart failure',true,'Accepted'),
  ('health-illness-disease-cardiovascular-disease-hypertension','Hypertension','Health / Illness / Disease / Cardiovascular disease / Hypertension',true,'Accepted'),
  ('health-illness-disease-cardiovascular-disease-stroke','Stroke','Health / Illness / Disease / Cardiovascular disease / Stroke',true,'Accepted'),

  -- ===== single-node disease categories =====
  ('health-illness-disease-digestive-disease','Digestive disease','Health / Illness / Disease / Digestive disease',true,'Accepted'),
  ('health-illness-disease-endocrine-disease','Endocrine disease','Health / Illness / Disease / Endocrine disease',true,'Accepted'),
  ('health-illness-disease-eye-disease','Eye disease','Health / Illness / Disease / Eye disease',true,'Accepted'),

  -- ===== Infectious disease → Bacterial diseases (new parent under pre-existing Infectious disease) =====
  ('health-illness-disease-infectious-disease-bacterial-diseases','Bacterial diseases','Health / Illness / Disease / Infectious disease / Bacterial diseases',false,'Accepted'),
  ('health-illness-disease-infectious-disease-bacterial-diseases-anthrax','Anthrax','Health / Illness / Disease / Infectious disease / Bacterial diseases / Anthrax',true,'Accepted'),
  ('health-illness-disease-infectious-disease-bacterial-diseases-cholera','Cholera','Health / Illness / Disease / Infectious disease / Bacterial diseases / Cholera',true,'Accepted'),
  ('health-illness-disease-infectious-disease-bacterial-diseases-leprosy','Leprosy','Health / Illness / Disease / Infectious disease / Bacterial diseases / Leprosy',true,'Accepted'),
  ('health-illness-disease-infectious-disease-bacterial-diseases-lyme-disease','Lyme disease','Health / Illness / Disease / Infectious disease / Bacterial diseases / Lyme disease',true,'Accepted'),
  ('health-illness-disease-infectious-disease-bacterial-diseases-plague','Plague','Health / Illness / Disease / Infectious disease / Bacterial diseases / Plague',true,'Accepted'),
  ('health-illness-disease-infectious-disease-bacterial-diseases-salmonellosis','Salmonellosis','Health / Illness / Disease / Infectious disease / Bacterial diseases / Salmonellosis',true,'Accepted'),
  ('health-illness-disease-infectious-disease-bacterial-diseases-syphilis','Syphilis','Health / Illness / Disease / Infectious disease / Bacterial diseases / Syphilis',true,'Accepted'),
  ('health-illness-disease-infectious-disease-bacterial-diseases-tetanus','Tetanus','Health / Illness / Disease / Infectious disease / Bacterial diseases / Tetanus',true,'Accepted'),
  ('health-illness-disease-infectious-disease-bacterial-diseases-tuberculosis','Tuberculosis','Health / Illness / Disease / Infectious disease / Bacterial diseases / Tuberculosis',true,'Accepted'),

  -- ===== Infectious disease → Fungal / Parasitic / Prion (leaf categories) =====
  ('health-illness-disease-infectious-disease-fungal-diseases','Fungal diseases','Health / Illness / Disease / Infectious disease / Fungal diseases',true,'Accepted'),
  ('health-illness-disease-infectious-disease-parasitic-diseases','Parasitic diseases','Health / Illness / Disease / Infectious disease / Parasitic diseases',true,'Accepted'),
  ('health-illness-disease-infectious-disease-prion-diseases','Prion diseases','Health / Illness / Disease / Infectious disease / Prion diseases',true,'Accepted'),

  -- ===== Infectious disease → Pandemics and epidemics (new parent) =====
  ('health-illness-disease-infectious-disease-pandemics-and-epidemics','Pandemics and epidemics','Health / Illness / Disease / Infectious disease / Pandemics and epidemics',false,'Accepted'),
  ('health-illness-disease-infectious-disease-pandemics-and-epidemics-1918-flu','1918 influenza pandemic','Health / Illness / Disease / Infectious disease / Pandemics and epidemics / 1918 influenza pandemic',true,'Accepted'),
  ('health-illness-disease-infectious-disease-pandemics-and-epidemics-black-death','Black Death','Health / Illness / Disease / Infectious disease / Pandemics and epidemics / Black Death',true,'Accepted'),
  ('health-illness-disease-infectious-disease-pandemics-and-epidemics-covid-19-pandemic','COVID-19 pandemic','Health / Illness / Disease / Infectious disease / Pandemics and epidemics / COVID-19 pandemic',true,'Accepted'),
  ('health-illness-disease-infectious-disease-pandemics-and-epidemics-hiv-aids-pandemic','HIV/AIDS pandemic','Health / Illness / Disease / Infectious disease / Pandemics and epidemics / HIV/AIDS pandemic',true,'Accepted'),

  -- ===== Infectious disease → Viral diseases (new parent) =====
  ('health-illness-disease-infectious-disease-viral-diseases','Viral diseases','Health / Illness / Disease / Infectious disease / Viral diseases',false,'Accepted'),
  ('health-illness-disease-infectious-disease-viral-diseases-covid-19','COVID-19','Health / Illness / Disease / Infectious disease / Viral diseases / COVID-19',true,'Accepted'),
  ('health-illness-disease-infectious-disease-viral-diseases-dengue','Dengue','Health / Illness / Disease / Infectious disease / Viral diseases / Dengue',true,'Accepted'),
  ('health-illness-disease-infectious-disease-viral-diseases-disease-x','Disease X','Health / Illness / Disease / Infectious disease / Viral diseases / Disease X',true,'Accepted'),
  ('health-illness-disease-infectious-disease-viral-diseases-ebola','Ebola','Health / Illness / Disease / Infectious disease / Viral diseases / Ebola',true,'Accepted'),
  ('health-illness-disease-infectious-disease-viral-diseases-hantavirus','Hantavirus','Health / Illness / Disease / Infectious disease / Viral diseases / Hantavirus',true,'Accepted'),
  ('health-illness-disease-infectious-disease-viral-diseases-hepatitis','Hepatitis','Health / Illness / Disease / Infectious disease / Viral diseases / Hepatitis',true,'Accepted'),
  ('health-illness-disease-infectious-disease-viral-diseases-hiv-aids','HIV/AIDS','Health / Illness / Disease / Infectious disease / Viral diseases / HIV/AIDS',true,'Accepted'),
  ('health-illness-disease-infectious-disease-viral-diseases-influenza','Influenza','Health / Illness / Disease / Infectious disease / Viral diseases / Influenza',true,'Accepted'),
  ('health-illness-disease-infectious-disease-viral-diseases-marburg','Marburg virus disease','Health / Illness / Disease / Infectious disease / Viral diseases / Marburg virus disease',true,'Accepted'),
  ('health-illness-disease-infectious-disease-viral-diseases-measles','Measles','Health / Illness / Disease / Infectious disease / Viral diseases / Measles',true,'Accepted'),
  ('health-illness-disease-infectious-disease-viral-diseases-mpox','Mpox (monkeypox)','Health / Illness / Disease / Infectious disease / Viral diseases / Mpox (monkeypox)',true,'Accepted'),
  ('health-illness-disease-infectious-disease-viral-diseases-nipah-virus','Nipah virus','Health / Illness / Disease / Infectious disease / Viral diseases / Nipah virus',true,'Accepted'),
  ('health-illness-disease-infectious-disease-viral-diseases-norovirus','Norovirus','Health / Illness / Disease / Infectious disease / Viral diseases / Norovirus',true,'Accepted'),
  ('health-illness-disease-infectious-disease-viral-diseases-polio','Polio','Health / Illness / Disease / Infectious disease / Viral diseases / Polio',true,'Accepted'),
  ('health-illness-disease-infectious-disease-viral-diseases-rabies','Rabies','Health / Illness / Disease / Infectious disease / Viral diseases / Rabies',true,'Accepted'),
  ('health-illness-disease-infectious-disease-viral-diseases-rsv','RSV','Health / Illness / Disease / Infectious disease / Viral diseases / RSV',true,'Accepted'),
  ('health-illness-disease-infectious-disease-viral-diseases-smallpox','Smallpox','Health / Illness / Disease / Infectious disease / Viral diseases / Smallpox',true,'Accepted'),
  ('health-illness-disease-infectious-disease-viral-diseases-west-nile-virus','West Nile virus','Health / Illness / Disease / Infectious disease / Viral diseases / West Nile virus',true,'Accepted'),
  ('health-illness-disease-infectious-disease-viral-diseases-yellow-fever','Yellow fever','Health / Illness / Disease / Infectious disease / Viral diseases / Yellow fever',true,'Accepted'),
  ('health-illness-disease-infectious-disease-viral-diseases-zika','Zika virus','Health / Illness / Disease / Infectious disease / Viral diseases / Zika virus',true,'Accepted'),

  -- ===== remaining single-node disease categories =====
  ('health-illness-disease-kidney-disease','Kidney disease','Health / Illness / Disease / Kidney disease',true,'Accepted'),
  ('health-illness-disease-musculoskeletal-disease','Musculoskeletal disease','Health / Illness / Disease / Musculoskeletal disease',true,'Accepted'),

  -- ===== Respiratory disease (new parent) =====
  ('health-illness-disease-respiratory-disease','Respiratory disease','Health / Illness / Disease / Respiratory disease',false,'Accepted'),
  ('health-illness-disease-respiratory-disease-asthma','Asthma','Health / Illness / Disease / Respiratory disease / Asthma',true,'Accepted'),
  ('health-illness-disease-respiratory-disease-copd','COPD','Health / Illness / Disease / Respiratory disease / COPD',true,'Accepted'),
  ('health-illness-disease-respiratory-disease-pneumonia','Pneumonia','Health / Illness / Disease / Respiratory disease / Pneumonia',true,'Accepted'),

  ('health-illness-disease-skin-disease','Skin disease','Health / Illness / Disease / Skin disease',true,'Accepted')

) AS v(id, name, path, is_leaf, kettle)
WHERE NOT EXISTS (SELECT 1 FROM public.atoms a WHERE a.id = v.id);

-- ---- parent flip: 'Infectious disease' was a leaf; now has children ----
UPDATE public.atoms SET is_leaf = false
WHERE id = 'health-illness-disease-infectious-disease'
AND EXISTS (SELECT 1 FROM public.atoms c WHERE c.path LIKE public.atoms.path || ' / %');
