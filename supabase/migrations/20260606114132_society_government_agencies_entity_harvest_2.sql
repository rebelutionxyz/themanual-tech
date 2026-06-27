-- =====================================================================
-- Migration 20260606114132 — society_government_agencies_entity_harvest_2
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-06 via apply_migration.
-- The Manual spine · Society realm · entity harvest (gov agencies) · 31 atoms.
-- Additive + idempotent. type='event', kettle='Accepted'. realm_id='society'.
-- OUTCOME-FAITHFUL reconstruction from prod; derived path_parts/realm_name/depth.
-- ('Levels of government' is a NEW parent here; flip is US Federal agencies.)
-- =====================================================================

INSERT INTO public.atoms (id, name, path, path_parts, realm_id, realm_name, depth, type, is_leaf, kettle)
SELECT v.id, v.name, v.path, string_to_array(v.path, ' / '),
       'society', 'Society', array_length(string_to_array(v.path, ' / '), 1),
       'event', v.is_leaf, v.kettle
FROM (VALUES
  -- Levels of government (new parent + children)
  ('society-government-levels-of-government','Levels of government','Society / Government / Levels of government',false,'Accepted'),
  ('society-government-levels-of-government-global','Global governance','Society / Government / Levels of government / Global governance',true,'Accepted'),
  ('society-government-levels-of-government-international','International government','Society / Government / Levels of government / International government',true,'Accepted'),
  ('society-government-levels-of-government-local','Local government','Society / Government / Levels of government / Local government',true,'Accepted'),
  ('society-government-levels-of-government-national','National government','Society / Government / Levels of government / National government',true,'Accepted'),
  ('society-government-levels-of-government-state','State government','Society / Government / Levels of government / State government',true,'Accepted'),
  -- United States / Federal agencies
  ('society-government-united-states-federal-agencies-atf','Bureau of Alcohol, Tobacco, Firearms and Explosives (ATF)','Society / Government / United States / Federal agencies / Bureau of Alcohol, Tobacco, Firearms and Explosives (ATF)',true,'Accepted'),
  ('society-government-united-states-federal-agencies-cdc','Centers for Disease Control and Prevention (CDC)','Society / Government / United States / Federal agencies / Centers for Disease Control and Prevention (CDC)',true,'Accepted'),
  ('society-government-united-states-federal-agencies-cia','Central Intelligence Agency (CIA)','Society / Government / United States / Federal agencies / Central Intelligence Agency (CIA)',true,'Accepted'),
  ('society-government-united-states-federal-agencies-atf-dod','Department of Defense (DoD)','Society / Government / United States / Federal agencies / Department of Defense (DoD)',true,'Accepted'),
  ('society-government-united-states-federal-agencies-ed','Department of Education','Society / Government / United States / Federal agencies / Department of Education',true,'Accepted'),
  ('society-government-united-states-federal-agencies-doe-energy','Department of Energy','Society / Government / United States / Federal agencies / Department of Energy',true,'Accepted'),
  ('society-government-united-states-federal-agencies-hhs','Department of Health and Human Services (HHS)','Society / Government / United States / Federal agencies / Department of Health and Human Services (HHS)',true,'Accepted'),
  ('society-government-united-states-federal-agencies-dhs','Department of Homeland Security (DHS)','Society / Government / United States / Federal agencies / Department of Homeland Security (DHS)',true,'Accepted'),
  ('society-government-united-states-federal-agencies-doj','Department of Justice (DOJ)','Society / Government / United States / Federal agencies / Department of Justice (DOJ)',true,'Accepted'),
  ('society-government-united-states-federal-agencies-state-dept','Department of State','Society / Government / United States / Federal agencies / Department of State',true,'Accepted'),
  ('society-government-united-states-federal-agencies-treasury','Department of the Treasury','Society / Government / United States / Federal agencies / Department of the Treasury',true,'Accepted'),
  ('society-government-united-states-federal-agencies-dea','Drug Enforcement Administration (DEA)','Society / Government / United States / Federal agencies / Drug Enforcement Administration (DEA)',true,'Accepted'),
  ('society-government-united-states-federal-agencies-fbi','Federal Bureau of Investigation (FBI)','Society / Government / United States / Federal agencies / Federal Bureau of Investigation (FBI)',true,'Accepted'),
  ('society-government-united-states-federal-agencies-fcc','Federal Communications Commission (FCC)','Society / Government / United States / Federal agencies / Federal Communications Commission (FCC)',true,'Accepted'),
  ('society-government-united-states-federal-agencies-fema','Federal Emergency Management Agency (FEMA)','Society / Government / United States / Federal agencies / Federal Emergency Management Agency (FEMA)',true,'Accepted'),
  ('society-government-united-states-federal-agencies-fed','Federal Reserve System','Society / Government / United States / Federal agencies / Federal Reserve System',true,'Accepted'),
  ('society-government-united-states-federal-agencies-fda','Food and Drug Administration (FDA)','Society / Government / United States / Federal agencies / Food and Drug Administration (FDA)',true,'Accepted'),
  ('society-government-united-states-federal-agencies-irs','Internal Revenue Service (IRS)','Society / Government / United States / Federal agencies / Internal Revenue Service (IRS)',true,'Accepted'),
  ('society-government-united-states-federal-agencies-nasa','National Aeronautics and Space Administration (NASA)','Society / Government / United States / Federal agencies / National Aeronautics and Space Administration (NASA)',true,'Accepted'),
  ('society-government-united-states-federal-agencies-nih','National Institutes of Health (NIH)','Society / Government / United States / Federal agencies / National Institutes of Health (NIH)',true,'Accepted'),
  ('society-government-united-states-federal-agencies-nsa','National Security Agency (NSA)','Society / Government / United States / Federal agencies / National Security Agency (NSA)',true,'Accepted'),
  ('society-government-united-states-federal-agencies-dni','Office of the Director of National Intelligence (ODNI)','Society / Government / United States / Federal agencies / Office of the Director of National Intelligence (ODNI)',true,'Accepted'),
  ('society-government-united-states-federal-agencies-sec','Securities and Exchange Commission (SEC)','Society / Government / United States / Federal agencies / Securities and Exchange Commission (SEC)',true,'Accepted'),
  ('society-government-united-states-federal-agencies-tsa','Transportation Security Administration (TSA)','Society / Government / United States / Federal agencies / Transportation Security Administration (TSA)',true,'Accepted'),
  ('society-government-united-states-federal-agencies-usaid','USAID','Society / Government / United States / Federal agencies / USAID',true,'Accepted')
) AS v(id, name, path, is_leaf, kettle)
WHERE NOT EXISTS (SELECT 1 FROM public.atoms a WHERE a.id = v.id);

-- parent flip: US Federal agencies
UPDATE public.atoms SET is_leaf = false
WHERE id = 'society-government-united-states-federal-agencies'
AND EXISTS (SELECT 1 FROM public.atoms c WHERE c.path LIKE public.atoms.path || ' / %');
