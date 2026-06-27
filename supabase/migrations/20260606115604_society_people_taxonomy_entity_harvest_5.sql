-- =====================================================================
-- Migration 20260606115604 — society_people_taxonomy_entity_harvest_5
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-06 via apply_migration.
-- The Manual spine · Society realm · entity harvest (People taxonomy) · 45 atoms.
-- Additive + idempotent. type='event', kettle='Accepted'. realm_id='society'.
-- The entire 'Society / People' branch is NEW (parent + sub-branches is_leaf=false);
-- no flips. OUTCOME-FAITHFUL reconstruction from prod.
-- =====================================================================

INSERT INTO public.atoms (id, name, path, path_parts, realm_id, realm_name, depth, type, is_leaf, kettle)
SELECT v.id, v.name, v.path, string_to_array(v.path, ' / '),
       'society', 'Society', array_length(string_to_array(v.path, ' / '), 1),
       'event', v.is_leaf, v.kettle
FROM (VALUES
  ('society-people','People','Society / People',false,'Accepted'),
  ('society-people-business-leaders','Business leaders','Society / People / Business leaders',false,'Accepted'),
  ('society-people-business-leaders-soros-a','Alexander Soros','Society / People / Business leaders / Alexander Soros',true,'Accepted'),
  ('society-people-business-leaders-gates','Bill Gates','Society / People / Business leaders / Bill Gates',true,'Accepted'),
  ('society-people-business-leaders-musk','Elon Musk','Society / People / Business leaders / Elon Musk',true,'Accepted'),
  ('society-people-business-leaders-soros','George Soros','Society / People / Business leaders / George Soros',true,'Accepted'),
  ('society-people-business-leaders-dimon','Jamie Dimon','Society / People / Business leaders / Jamie Dimon',true,'Accepted'),
  ('society-people-business-leaders-bezos','Jeff Bezos','Society / People / Business leaders / Jeff Bezos',true,'Accepted'),
  ('society-people-business-leaders-schwab','Klaus Schwab','Society / People / Business leaders / Klaus Schwab',true,'Accepted'),
  ('society-people-business-leaders-fink','Larry Fink','Society / People / Business leaders / Larry Fink',true,'Accepted'),
  ('society-people-business-leaders-zuckerberg','Mark Zuckerberg','Society / People / Business leaders / Mark Zuckerberg',true,'Accepted'),
  ('society-people-business-leaders-thiel','Peter Thiel','Society / People / Business leaders / Peter Thiel',true,'Accepted'),
  ('society-people-business-leaders-buffett','Warren Buffett','Society / People / Business leaders / Warren Buffett',true,'Accepted'),
  ('society-people-financial-dynasties','Financial dynasties and families','Society / People / Financial dynasties and families',false,'Accepted'),
  ('society-people-financial-dynasties-rockefeller','Rockefeller family','Society / People / Financial dynasties and families / Rockefeller family',true,'Accepted'),
  ('society-people-financial-dynasties-rothschild','Rothschild family','Society / People / Financial dynasties and families / Rothschild family',true,'Accepted'),
  ('society-people-government-officials','Government officials and appointees','Society / People / Government officials and appointees',false,'Accepted'),
  ('society-people-government-officials-mayorkas','Alejandro Mayorkas','Society / People / Government officials and appointees / Alejandro Mayorkas',true,'Accepted'),
  ('society-people-government-officials-fauci','Anthony Fauci','Society / People / Government officials and appointees / Anthony Fauci',true,'Accepted'),
  ('society-people-government-officials-clinton-h','Hillary Clinton','Society / People / Government officials and appointees / Hillary Clinton',true,'Accepted'),
  ('society-people-government-officials-kerry','John Kerry','Society / People / Government officials and appointees / John Kerry',true,'Accepted'),
  ('society-people-government-officials-tedros','Tedros Adhanom Ghebreyesus','Society / People / Government officials and appointees / Tedros Adhanom Ghebreyesus',true,'Accepted'),
  ('society-people-heads-of-state-and-government','Heads of state and government','Society / People / Heads of state and government',false,'Accepted'),
  ('society-people-heads-of-state-and-government-obama','Barack Obama','Society / People / Heads of state and government / Barack Obama',true,'Accepted'),
  ('society-people-heads-of-state-and-government-netanyahu','Benjamin Netanyahu','Society / People / Heads of state and government / Benjamin Netanyahu',true,'Accepted'),
  ('society-people-heads-of-state-and-government-clinton-b','Bill Clinton','Society / People / Heads of state and government / Bill Clinton',true,'Accepted'),
  ('society-people-heads-of-state-and-government-trump','Donald Trump','Society / People / Heads of state and government / Donald Trump',true,'Accepted'),
  ('society-people-heads-of-state-and-government-bush-gw','George W. Bush','Society / People / Heads of state and government / George W. Bush',true,'Accepted'),
  ('society-people-heads-of-state-and-government-biden','Joe Biden','Society / People / Heads of state and government / Joe Biden',true,'Accepted'),
  ('society-people-heads-of-state-and-government-trudeau','Justin Trudeau','Society / People / Heads of state and government / Justin Trudeau',true,'Accepted'),
  ('society-people-heads-of-state-and-government-putin','Vladimir Putin','Society / People / Heads of state and government / Vladimir Putin',true,'Accepted'),
  ('society-people-heads-of-state-and-government-zelensky','Volodymyr Zelensky','Society / People / Heads of state and government / Volodymyr Zelensky',true,'Accepted'),
  ('society-people-heads-of-state-and-government-xi','Xi Jinping','Society / People / Heads of state and government / Xi Jinping',true,'Accepted'),
  ('society-people-media-and-influencers','Media figures and influencers','Society / People / Media figures and influencers',false,'Accepted'),
  ('society-people-media-and-influencers-jones','Alex Jones','Society / People / Media figures and influencers / Alex Jones',true,'Accepted'),
  ('society-people-media-and-influencers-rogan','Joe Rogan','Society / People / Media figures and influencers / Joe Rogan',true,'Accepted'),
  ('society-people-media-and-influencers-stone','Roger Stone','Society / People / Media figures and influencers / Roger Stone',true,'Accepted'),
  ('society-people-media-and-influencers-bannon','Steve Bannon','Society / People / Media figures and influencers / Steve Bannon',true,'Accepted'),
  ('society-people-media-and-influencers-carlson','Tucker Carlson','Society / People / Media figures and influencers / Tucker Carlson',true,'Accepted'),
  ('society-people-political-figures','Political figures and candidates','Society / People / Political figures and candidates',false,'Accepted'),
  ('society-people-political-figures-vance','JD Vance','Society / People / Political figures and candidates / JD Vance',true,'Accepted'),
  ('society-people-political-figures-rfk-jr','Robert F. Kennedy Jr.','Society / People / Political figures and candidates / Robert F. Kennedy Jr.',true,'Accepted'),
  ('society-people-public-intellectuals','Public intellectuals and commentators','Society / People / Public intellectuals and commentators',false,'Accepted'),
  ('society-people-public-intellectuals-ramaswamy','Vivek Ramaswamy','Society / People / Public intellectuals and commentators / Vivek Ramaswamy',true,'Accepted'),
  ('society-people-public-intellectuals-harari','Yuval Noah Harari','Society / People / Public intellectuals and commentators / Yuval Noah Harari',true,'Accepted')
) AS v(id, name, path, is_leaf, kettle)
WHERE NOT EXISTS (SELECT 1 FROM public.atoms a WHERE a.id = v.id);
