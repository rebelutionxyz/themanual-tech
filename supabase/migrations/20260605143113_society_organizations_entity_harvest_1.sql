-- =====================================================================
-- Migration 20260605143113 — society_organizations_entity_harvest_1
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-05 via apply_migration.
-- The Manual spine · Society realm · entity harvest (orgs) · 46 atoms.
-- Additive + idempotent. type='event', kettle='Accepted'. realm_id='society'.
-- OUTCOME-FAITHFUL reconstruction from prod; derived path_parts/realm_name/depth.
-- =====================================================================

INSERT INTO public.atoms (id, name, path, path_parts, realm_id, realm_name, depth, type, is_leaf, kettle)
SELECT v.id, v.name, v.path, string_to_array(v.path, ' / '),
       'society', 'Society', array_length(string_to_array(v.path, ' / '), 1),
       'event', v.is_leaf, v.kettle
FROM (VALUES
  -- Economy and business / Companies (asset managers)
  ('society-economy-and-business-companies-blackrock','BlackRock','Society / Economy and business / Companies / BlackRock',true,'Accepted'),
  ('society-economy-and-business-companies-blackstone','Blackstone','Society / Economy and business / Companies / Blackstone',true,'Accepted'),
  ('society-economy-and-business-companies-fidelity','Fidelity Investments','Society / Economy and business / Companies / Fidelity Investments',true,'Accepted'),
  ('society-economy-and-business-companies-state-street','State Street Corporation','Society / Economy and business / Companies / State Street Corporation',true,'Accepted'),
  ('society-economy-and-business-companies-vanguard','The Vanguard Group','Society / Economy and business / Companies / The Vanguard Group',true,'Accepted'),
  -- International organizations (categories) / Intergovernmental organizations
  ('society-government-international-organizations-categories-intergovernmental-organizations-asean','ASEAN','Society / Government / International organizations (categories) / Intergovernmental organizations / ASEAN',true,'Accepted'),
  ('society-government-international-organizations-categories-intergovernmental-organizations-bis','Bank for International Settlements (BIS)','Society / Government / International organizations (categories) / Intergovernmental organizations / Bank for International Settlements (BIS)',true,'Accepted'),
  ('society-government-international-organizations-categories-intergovernmental-organizations-brics','BRICS','Society / Government / International organizations (categories) / Intergovernmental organizations / BRICS',true,'Accepted'),
  ('society-government-international-organizations-categories-intergovernmental-organizations-imf','International Monetary Fund (IMF)','Society / Government / International organizations (categories) / Intergovernmental organizations / International Monetary Fund (IMF)',true,'Accepted'),
  ('society-government-international-organizations-categories-intergovernmental-organizations-interpol','Interpol','Society / Government / International organizations (categories) / Intergovernmental organizations / Interpol',true,'Accepted'),
  ('society-government-international-organizations-categories-intergovernmental-organizations-nato','NATO','Society / Government / International organizations (categories) / Intergovernmental organizations / NATO',true,'Accepted'),
  ('society-government-international-organizations-categories-intergovernmental-organizations-oecd','OECD','Society / Government / International organizations (categories) / Intergovernmental organizations / OECD',true,'Accepted'),
  ('society-government-international-organizations-categories-intergovernmental-organizations-opcw','OPCW','Society / Government / International organizations (categories) / Intergovernmental organizations / OPCW',true,'Accepted'),
  ('society-government-international-organizations-categories-intergovernmental-organizations-opec','OPEC','Society / Government / International organizations (categories) / Intergovernmental organizations / OPEC',true,'Accepted'),
  ('society-government-international-organizations-categories-intergovernmental-organizations-world-bank','World Bank Group','Society / Government / International organizations (categories) / Intergovernmental organizations / World Bank Group',true,'Accepted'),
  ('society-government-international-organizations-categories-intergovernmental-organizations-wto','World Trade Organization (WTO)','Society / Government / International organizations (categories) / Intergovernmental organizations / World Trade Organization (WTO)',true,'Accepted'),
  -- International organizations (categories) / Transnational policy coordination bodies
  ('society-government-international-organizations-categories-transnational-policy-coordination-bodies-bilderberg','Bilderberg Meeting','Society / Government / International organizations (categories) / Transnational policy coordination bodies / Bilderberg Meeting',true,'Accepted'),
  ('society-government-international-organizations-categories-transnational-policy-coordination-bodies-g20','G20','Society / Government / International organizations (categories) / Transnational policy coordination bodies / G20',true,'Accepted'),
  ('society-government-international-organizations-categories-transnational-policy-coordination-bodies-g7','G7','Society / Government / International organizations (categories) / Transnational policy coordination bodies / G7',true,'Accepted'),
  ('society-government-international-organizations-categories-transnational-policy-coordination-bodies-trilateral','Trilateral Commission','Society / Government / International organizations (categories) / Transnational policy coordination bodies / Trilateral Commission',true,'Accepted'),
  ('society-government-international-organizations-categories-transnational-policy-coordination-bodies-wef','World Economic Forum (WEF)','Society / Government / International organizations (categories) / Transnational policy coordination bodies / World Economic Forum (WEF)',true,'Accepted'),
  -- International organizations / UN
  ('society-government-international-organizations-un-fao','FAO','Society / Government / International organizations / UN / FAO',true,'Accepted'),
  ('society-government-international-organizations-un-iaea','IAEA','Society / Government / International organizations / UN / IAEA',true,'Accepted'),
  ('society-government-international-organizations-un-icj','International Court of Justice (ICJ)','Society / Government / International organizations / UN / International Court of Justice (ICJ)',true,'Accepted'),
  ('society-government-international-organizations-un-ilo','International Labour Organization (ILO)','Society / Government / International organizations / UN / International Labour Organization (ILO)',true,'Accepted'),
  ('society-government-international-organizations-un-unaids','UNAIDS','Society / Government / International organizations / UN / UNAIDS',true,'Accepted'),
  ('society-government-international-organizations-un-unctad','UNCTAD','Society / Government / International organizations / UN / UNCTAD',true,'Accepted'),
  ('society-government-international-organizations-un-undp','UNDP','Society / Government / International organizations / UN / UNDP',true,'Accepted'),
  ('society-government-international-organizations-un-unep','UNEP','Society / Government / International organizations / UN / UNEP',true,'Accepted'),
  ('society-government-international-organizations-un-unesco','UNESCO','Society / Government / International organizations / UN / UNESCO',true,'Accepted'),
  ('society-government-international-organizations-un-unfpa','UNFPA','Society / Government / International organizations / UN / UNFPA',true,'Accepted'),
  ('society-government-international-organizations-un-unhcr','UNHCR','Society / Government / International organizations / UN / UNHCR',true,'Accepted'),
  ('society-government-international-organizations-un-unicef','UNICEF','Society / Government / International organizations / UN / UNICEF',true,'Accepted'),
  ('society-government-international-organizations-un-unodc','UNODC','Society / Government / International organizations / UN / UNODC',true,'Accepted'),
  ('society-government-international-organizations-un-wfp','World Food Programme (WFP)','Society / Government / International organizations / UN / World Food Programme (WFP)',true,'Accepted'),
  ('society-government-international-organizations-un-who','World Health Organization (WHO)','Society / Government / International organizations / UN / World Health Organization (WHO)',true,'Accepted'),
  -- Social institutions / Civic, fraternal, service, professional organizations (foundations)
  ('society-social-institutions-civic-fraternal-service-professional-organizations-gates-foundation','Bill & Melinda Gates Foundation','Society / Social institutions / Civic, fraternal, service, professional organizations / Bill & Melinda Gates Foundation',true,'Accepted'),
  ('society-social-institutions-civic-fraternal-service-professional-organizations-carnegie-foundation','Carnegie Foundation','Society / Social institutions / Civic, fraternal, service, professional organizations / Carnegie Foundation',true,'Accepted'),
  ('society-social-institutions-civic-fraternal-service-professional-organizations-ford-foundation','Ford Foundation','Society / Social institutions / Civic, fraternal, service, professional organizations / Ford Foundation',true,'Accepted'),
  ('society-social-institutions-civic-fraternal-service-professional-organizations-open-society','Open Society Foundations','Society / Social institutions / Civic, fraternal, service, professional organizations / Open Society Foundations',true,'Accepted'),
  ('society-social-institutions-civic-fraternal-service-professional-organizations-rockefeller-foundation','Rockefeller Foundation','Society / Social institutions / Civic, fraternal, service, professional organizations / Rockefeller Foundation',true,'Accepted'),
  -- Social institutions / Think tanks
  ('society-social-institutions-think-tanks-atlantic-council','Atlantic Council','Society / Social institutions / Think tanks / Atlantic Council',true,'Accepted'),
  ('society-social-institutions-think-tanks-brookings','Brookings Institution','Society / Social institutions / Think tanks / Brookings Institution',true,'Accepted'),
  ('society-social-institutions-think-tanks-club-of-rome','Club of Rome','Society / Social institutions / Think tanks / Club of Rome',true,'Accepted'),
  ('society-social-institutions-think-tanks-cfr','Council on Foreign Relations','Society / Social institutions / Think tanks / Council on Foreign Relations',true,'Accepted'),
  ('society-social-institutions-think-tanks-rand','RAND Corporation','Society / Social institutions / Think tanks / RAND Corporation',true,'Accepted')
) AS v(id, name, path, is_leaf, kettle)
WHERE NOT EXISTS (SELECT 1 FROM public.atoms a WHERE a.id = v.id);

-- parent flips (per dispatch; EXISTS-guarded so already-non-leaf parents no-op)
UPDATE public.atoms SET is_leaf = false
WHERE id IN (
  'society-government-international-organizations-un',
  'society-government-international-organizations-categories-intergovernmental-organizations',
  'society-government-international-organizations-categories-transnational-policy-coordination-bodies',
  'society-social-institutions-think-tanks',
  'society-social-institutions-civic-fraternal-service-professional-organizations',
  'society-economy-and-business-companies'
)
AND EXISTS (SELECT 1 FROM public.atoms c WHERE c.path LIKE public.atoms.path || ' / %');
