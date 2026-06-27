-- =====================================================================
-- Migration 20260606114209 — society_corporations_entity_harvest_3
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-06 via apply_migration.
-- The Manual spine · Society realm · entity harvest (corporations) · 35 atoms.
-- Additive + idempotent. type='event', kettle='Accepted'. realm_id='society'.
-- Sector parents (Agriculture/Defense/Energy/Pharma/Technology) are NEW nodes
-- (is_leaf=false), not flips. OUTCOME-FAITHFUL reconstruction from prod.
-- =====================================================================

INSERT INTO public.atoms (id, name, path, path_parts, realm_id, realm_name, depth, type, is_leaf, kettle)
SELECT v.id, v.name, v.path, string_to_array(v.path, ' / '),
       'society', 'Society', array_length(string_to_array(v.path, ' / '), 1),
       'event', v.is_leaf, v.kettle
FROM (VALUES
  ('society-economy-and-business-companies-agriculture','Agriculture companies','Society / Economy and business / Companies / Agriculture companies',false,'Accepted'),
  ('society-economy-and-business-companies-agriculture-cargill','Cargill','Society / Economy and business / Companies / Agriculture companies / Cargill',true,'Accepted'),
  ('society-economy-and-business-companies-agriculture-monsanto-bayer','Monsanto (Bayer)','Society / Economy and business / Companies / Agriculture companies / Monsanto (Bayer)',true,'Accepted'),
  ('society-economy-and-business-companies-agriculture-nestle','Nestlé','Society / Economy and business / Companies / Agriculture companies / Nestlé',true,'Accepted'),
  ('society-economy-and-business-companies-agriculture-tyson','Tyson Foods','Society / Economy and business / Companies / Agriculture companies / Tyson Foods',true,'Accepted'),
  ('society-economy-and-business-companies-defense','Defense contractors','Society / Economy and business / Companies / Defense contractors',false,'Accepted'),
  ('society-economy-and-business-companies-defense-boeing','Boeing','Society / Economy and business / Companies / Defense contractors / Boeing',true,'Accepted'),
  ('society-economy-and-business-companies-defense-general-dynamics','General Dynamics','Society / Economy and business / Companies / Defense contractors / General Dynamics',true,'Accepted'),
  ('society-economy-and-business-companies-defense-lockheed','Lockheed Martin','Society / Economy and business / Companies / Defense contractors / Lockheed Martin',true,'Accepted'),
  ('society-economy-and-business-companies-defense-northrop','Northrop Grumman','Society / Economy and business / Companies / Defense contractors / Northrop Grumman',true,'Accepted'),
  ('society-economy-and-business-companies-defense-raytheon','RTX (Raytheon)','Society / Economy and business / Companies / Defense contractors / RTX (Raytheon)',true,'Accepted'),
  ('society-economy-and-business-companies-energy','Energy companies','Society / Economy and business / Companies / Energy companies',false,'Accepted'),
  ('society-economy-and-business-companies-energy-bp','BP','Society / Economy and business / Companies / Energy companies / BP',true,'Accepted'),
  ('society-economy-and-business-companies-energy-chevron','Chevron','Society / Economy and business / Companies / Energy companies / Chevron',true,'Accepted'),
  ('society-economy-and-business-companies-energy-exxonmobil','ExxonMobil','Society / Economy and business / Companies / Energy companies / ExxonMobil',true,'Accepted'),
  ('society-economy-and-business-companies-energy-shell','Shell','Society / Economy and business / Companies / Energy companies / Shell',true,'Accepted'),
  ('society-economy-and-business-companies-pharmaceutical','Pharmaceutical companies','Society / Economy and business / Companies / Pharmaceutical companies',false,'Accepted'),
  ('society-economy-and-business-companies-pharmaceutical-astrazeneca','AstraZeneca','Society / Economy and business / Companies / Pharmaceutical companies / AstraZeneca',true,'Accepted'),
  ('society-economy-and-business-companies-pharmaceutical-bayer','Bayer','Society / Economy and business / Companies / Pharmaceutical companies / Bayer',true,'Accepted'),
  ('society-economy-and-business-companies-pharmaceutical-jnj','Johnson & Johnson','Society / Economy and business / Companies / Pharmaceutical companies / Johnson & Johnson',true,'Accepted'),
  ('society-economy-and-business-companies-pharmaceutical-merck','Merck','Society / Economy and business / Companies / Pharmaceutical companies / Merck',true,'Accepted'),
  ('society-economy-and-business-companies-pharmaceutical-moderna','Moderna','Society / Economy and business / Companies / Pharmaceutical companies / Moderna',true,'Accepted'),
  ('society-economy-and-business-companies-pharmaceutical-novartis','Novartis','Society / Economy and business / Companies / Pharmaceutical companies / Novartis',true,'Accepted'),
  ('society-economy-and-business-companies-pharmaceutical-pfizer','Pfizer','Society / Economy and business / Companies / Pharmaceutical companies / Pfizer',true,'Accepted'),
  ('society-economy-and-business-companies-technology','Technology companies','Society / Economy and business / Companies / Technology companies',false,'Accepted'),
  ('society-economy-and-business-companies-technology-alphabet','Alphabet (Google)','Society / Economy and business / Companies / Technology companies / Alphabet (Google)',true,'Accepted'),
  ('society-economy-and-business-companies-technology-amazon','Amazon','Society / Economy and business / Companies / Technology companies / Amazon',true,'Accepted'),
  ('society-economy-and-business-companies-technology-apple','Apple','Society / Economy and business / Companies / Technology companies / Apple',true,'Accepted'),
  ('society-economy-and-business-companies-technology-meta','Meta','Society / Economy and business / Companies / Technology companies / Meta',true,'Accepted'),
  ('society-economy-and-business-companies-technology-microsoft','Microsoft','Society / Economy and business / Companies / Technology companies / Microsoft',true,'Accepted'),
  ('society-economy-and-business-companies-technology-nvidia','Nvidia','Society / Economy and business / Companies / Technology companies / Nvidia',true,'Accepted'),
  ('society-economy-and-business-companies-technology-openai','OpenAI','Society / Economy and business / Companies / Technology companies / OpenAI',true,'Accepted'),
  ('society-economy-and-business-companies-technology-palantir','Palantir','Society / Economy and business / Companies / Technology companies / Palantir',true,'Accepted'),
  ('society-economy-and-business-companies-technology-tesla','Tesla','Society / Economy and business / Companies / Technology companies / Tesla',true,'Accepted'),
  ('society-economy-and-business-companies-technology-x','X (Twitter)','Society / Economy and business / Companies / Technology companies / X (Twitter)',true,'Accepted')
) AS v(id, name, path, is_leaf, kettle)
WHERE NOT EXISTS (SELECT 1 FROM public.atoms a WHERE a.id = v.id);
