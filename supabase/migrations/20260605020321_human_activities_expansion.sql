-- =====================================================================
-- Migration 20260605020321 — human_activities_expansion
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-05 via apply_migration.
-- The Manual spine · Human activities realm · 30 atoms.
--
-- Additive + idempotent. type='event', kettle='Accepted'.
-- realm_id = 'human_activities' (UNDERSCORE — FK to realms; the atom-id slug uses
-- 'human-activities-' with a hyphen, but the realm_id is underscored).
-- realm_name = 'Human activities'. Derived path_parts/depth from path.
-- OUTCOME-FAITHFUL reconstruction from prod (no draft existed).
-- =====================================================================

INSERT INTO public.atoms (id, name, path, path_parts, realm_id, realm_name, depth, type, is_leaf, kettle)
SELECT v.id, v.name, v.path, string_to_array(v.path, ' / '),
       'human_activities', 'Human activities', array_length(string_to_array(v.path, ' / '), 1),
       'event', v.is_leaf, v.kettle
FROM (VALUES
  -- Business and trade
  ('human-activities-business-and-trade-banking','Banking','Human activities / Business and trade / Banking',true,'Accepted'),
  ('human-activities-business-and-trade-e-commerce','E-commerce','Human activities / Business and trade / E-commerce',true,'Accepted'),
  ('human-activities-business-and-trade-entrepreneurship','Entrepreneurship','Human activities / Business and trade / Entrepreneurship',true,'Accepted'),
  ('human-activities-business-and-trade-retail','Retail','Human activities / Business and trade / Retail',true,'Accepted'),
  ('human-activities-business-and-trade-supply-chain','Supply chain','Human activities / Business and trade / Supply chain',true,'Accepted'),
  -- Communication
  ('human-activities-communication-advertising','Advertising','Human activities / Communication / Advertising',true,'Accepted'),
  ('human-activities-communication-broadcasting','Broadcasting','Human activities / Communication / Broadcasting',true,'Accepted'),
  ('human-activities-communication-public-speaking','Public speaking','Human activities / Communication / Public speaking',true,'Accepted'),
  ('human-activities-communication-social-media','Social media','Human activities / Communication / Social media',true,'Accepted'),
  ('human-activities-communication-translation','Translation','Human activities / Communication / Translation',true,'Accepted'),
  -- Construction (pre-existing leaf — flipped below)
  ('human-activities-construction-architecture','Architecture','Human activities / Construction / Architecture',true,'Accepted'),
  ('human-activities-construction-building-construction','Building construction','Human activities / Construction / Building construction',true,'Accepted'),
  ('human-activities-construction-carpentry','Carpentry','Human activities / Construction / Carpentry',true,'Accepted'),
  ('human-activities-construction-civil-engineering','Civil engineering','Human activities / Construction / Civil engineering',true,'Accepted'),
  ('human-activities-construction-electrical-work','Electrical work','Human activities / Construction / Electrical work',true,'Accepted'),
  ('human-activities-construction-infrastructure','Infrastructure','Human activities / Construction / Infrastructure',true,'Accepted'),
  ('human-activities-construction-plumbing','Plumbing','Human activities / Construction / Plumbing',true,'Accepted'),
  ('human-activities-construction-renovation','Renovation','Human activities / Construction / Renovation',true,'Accepted'),
  -- Transport and travel
  ('human-activities-transport-and-travel-cycling','Cycling','Human activities / Transport and travel / Cycling',true,'Accepted'),
  ('human-activities-transport-and-travel-driving','Driving','Human activities / Transport and travel / Driving',true,'Accepted'),
  ('human-activities-transport-and-travel-rail-transport','Rail transport','Human activities / Transport and travel / Rail transport',true,'Accepted'),
  ('human-activities-transport-and-travel-shipping','Shipping','Human activities / Transport and travel / Shipping',true,'Accepted'),
  ('human-activities-transport-and-travel-tourism','Tourism','Human activities / Transport and travel / Tourism',true,'Accepted'),
  ('human-activities-transport-and-travel-walking','Walking','Human activities / Transport and travel / Walking',true,'Accepted'),
  -- Work and occupations
  ('human-activities-work-and-occupations-entrepreneurship','Entrepreneurship','Human activities / Work and occupations / Entrepreneurship',true,'Accepted'),
  ('human-activities-work-and-occupations-gig-economy','Gig economy','Human activities / Work and occupations / Gig economy',true,'Accepted'),
  ('human-activities-work-and-occupations-labor-unions','Labor unions','Human activities / Work and occupations / Labor unions',true,'Accepted'),
  ('human-activities-work-and-occupations-remote-work','Remote work','Human activities / Work and occupations / Remote work',true,'Accepted'),
  ('human-activities-work-and-occupations-skilled-trades','Skilled trades','Human activities / Work and occupations / Skilled trades',true,'Accepted'),
  ('human-activities-work-and-occupations-volunteering','Volunteering','Human activities / Work and occupations / Volunteering',true,'Accepted')
) AS v(id, name, path, is_leaf, kettle)
WHERE NOT EXISTS (SELECT 1 FROM public.atoms a WHERE a.id = v.id);

-- parent flip: 'Construction' was a leaf; now has children
UPDATE public.atoms SET is_leaf = false
WHERE id = 'human-activities-construction'
AND EXISTS (SELECT 1 FROM public.atoms c WHERE c.path LIKE public.atoms.path || ' / %');
