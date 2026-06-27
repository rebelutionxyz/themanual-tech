-- =====================================================================
-- Migration 20260605025802 — tech_thin_branches_expansion
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-05 via apply_migration.
-- The Manual spine · Tech realm · 31 atoms.
--
-- Additive + idempotent. type='event', kettle='Accepted'. realm_id='tech'.
-- OUTCOME-FAITHFUL reconstruction from prod (no draft existed); derived
-- path_parts/realm_name/depth from path.
-- =====================================================================

INSERT INTO public.atoms (id, name, path, path_parts, realm_id, realm_name, depth, type, is_leaf, kettle)
SELECT v.id, v.name, v.path, string_to_array(v.path, ' / '),
       'tech', 'Tech', array_length(string_to_array(v.path, ' / '), 1),
       'event', v.is_leaf, v.kettle
FROM (VALUES
  -- Agricultural technology
  ('tech-agricultural-technology-hydroponics','Hydroponics','Tech / Agricultural technology / Hydroponics',true,'Accepted'),
  ('tech-agricultural-technology-irrigation-systems','Irrigation systems','Tech / Agricultural technology / Irrigation systems',true,'Accepted'),
  ('tech-agricultural-technology-precision-agriculture','Precision agriculture','Tech / Agricultural technology / Precision agriculture',true,'Accepted'),
  ('tech-agricultural-technology-vertical-farming','Vertical farming','Tech / Agricultural technology / Vertical farming',true,'Accepted'),
  -- Artificial intelligence / AI fields
  ('tech-artificial-intelligence-ai-fields-generative-ai-text-to-image','Text-to-image generation','Tech / Artificial intelligence / AI fields / Generative AI / Text-to-image generation',true,'Accepted'),
  ('tech-artificial-intelligence-ai-fields-large-language-models-prompt-engineering','Prompt engineering','Tech / Artificial intelligence / AI fields / Large language models / Prompt engineering',true,'Accepted'),
  ('tech-artificial-intelligence-ai-fields-large-language-models-transformer-architecture','Transformer architecture','Tech / Artificial intelligence / AI fields / Large language models / Transformer architecture',true,'Accepted'),
  ('tech-artificial-intelligence-ai-fields-neural-networks','Neural networks','Tech / Artificial intelligence / AI fields / Neural networks',true,'Accepted'),
  -- Biotechnology
  ('tech-biotechnology-cloning','Cloning','Tech / Biotechnology / Cloning',true,'Accepted'),
  ('tech-biotechnology-fermentation','Fermentation','Tech / Biotechnology / Fermentation',true,'Accepted'),
  ('tech-biotechnology-genetic-engineering-crispr','CRISPR','Tech / Biotechnology / Genetic engineering / CRISPR',true,'Accepted'),
  ('tech-biotechnology-genetic-engineering-gene-therapy','Gene therapy','Tech / Biotechnology / Genetic engineering / Gene therapy',true,'Accepted'),
  ('tech-biotechnology-genetic-engineering-gmos','Genetically modified organisms','Tech / Biotechnology / Genetic engineering / Genetically modified organisms',true,'Accepted'),
  ('tech-biotechnology-medical-biotech-monoclonal-antibodies','Monoclonal antibodies','Tech / Biotechnology / Medical biotech / Monoclonal antibodies',true,'Accepted'),
  ('tech-biotechnology-medical-biotech-stem-cell-therapy','Stem cell therapy','Tech / Biotechnology / Medical biotech / Stem cell therapy',true,'Accepted'),
  ('tech-biotechnology-medical-biotech-vaccines','Vaccines','Tech / Biotechnology / Medical biotech / Vaccines',true,'Accepted'),
  -- Energy technology
  ('tech-energy-technology-battery-storage','Battery storage','Tech / Energy technology / Battery storage',true,'Accepted'),
  ('tech-energy-technology-fossil-fuels','Fossil fuels','Tech / Energy technology / Fossil fuels',true,'Accepted'),
  ('tech-energy-technology-geothermal-energy','Geothermal energy','Tech / Energy technology / Geothermal energy',true,'Accepted'),
  ('tech-energy-technology-hydroelectric-power','Hydroelectric power','Tech / Energy technology / Hydroelectric power',true,'Accepted'),
  ('tech-energy-technology-nuclear-fusion','Nuclear fusion','Tech / Energy technology / Nuclear fusion',true,'Accepted'),
  ('tech-energy-technology-nuclear-power','Nuclear power','Tech / Energy technology / Nuclear power',true,'Accepted'),
  ('tech-energy-technology-solar-power','Solar power','Tech / Energy technology / Solar power',true,'Accepted'),
  ('tech-energy-technology-wind-power','Wind power','Tech / Energy technology / Wind power',true,'Accepted'),
  -- Health technology
  ('tech-health-technology-medical-devices-pacemaker','Pacemaker','Tech / Health technology / Medical devices / Pacemaker',true,'Accepted'),
  ('tech-health-technology-medical-devices-prosthetics','Prosthetics','Tech / Health technology / Medical devices / Prosthetics',true,'Accepted'),
  ('tech-health-technology-medical-imaging-ct-scan','CT scan','Tech / Health technology / Medical imaging / CT scan',true,'Accepted'),
  ('tech-health-technology-medical-imaging-mri','MRI','Tech / Health technology / Medical imaging / MRI',true,'Accepted'),
  ('tech-health-technology-medical-imaging-ultrasound','Ultrasound','Tech / Health technology / Medical imaging / Ultrasound',true,'Accepted'),
  ('tech-health-technology-medical-imaging-x-ray','X-ray','Tech / Health technology / Medical imaging / X-ray',true,'Accepted'),
  ('tech-health-technology-wearable-health-tech','Wearable health tech','Tech / Health technology / Wearable health tech',true,'Accepted')
) AS v(id, name, path, is_leaf, kettle)
WHERE NOT EXISTS (SELECT 1 FROM public.atoms a WHERE a.id = v.id);

-- parent flips: pre-existing thin (leaf) branches that gained their first children here
UPDATE public.atoms SET is_leaf = false
WHERE id IN (
  'tech-artificial-intelligence-ai-fields-generative-ai',
  'tech-artificial-intelligence-ai-fields-large-language-models',
  'tech-biotechnology-genetic-engineering',
  'tech-biotechnology-medical-biotech',
  'tech-health-technology-medical-devices',
  'tech-health-technology-medical-imaging'
)
AND EXISTS (SELECT 1 FROM public.atoms c WHERE c.path LIKE public.atoms.path || ' / %');
