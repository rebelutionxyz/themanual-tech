-- =====================================================================
-- Migration 20260606115528 — society_corporations_entity_harvest_4_broad
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-06 via apply_migration.
-- The Manual spine · Society realm · entity harvest (corporations broad) · 49 atoms.
-- Additive + idempotent. type='event', kettle='Accepted'. realm_id='society'.
-- New sector parents (is_leaf=false) + members; flip = Companies (defensive).
-- OUTCOME-FAITHFUL reconstruction from prod; derived path_parts/realm_name/depth.
-- =====================================================================

INSERT INTO public.atoms (id, name, path, path_parts, realm_id, realm_name, depth, type, is_leaf, kettle)
SELECT v.id, v.name, v.path, string_to_array(v.path, ' / '),
       'society', 'Society', array_length(string_to_array(v.path, ' / '), 1),
       'event', v.is_leaf, v.kettle
FROM (VALUES
  ('society-economy-and-business-companies-airlines','Airlines','Society / Economy and business / Companies / Airlines',false,'Accepted'),
  ('society-economy-and-business-companies-airlines-american','American Airlines','Society / Economy and business / Companies / Airlines / American Airlines',true,'Accepted'),
  ('society-economy-and-business-companies-airlines-delta','Delta Air Lines','Society / Economy and business / Companies / Airlines / Delta Air Lines',true,'Accepted'),
  ('society-economy-and-business-companies-airlines-united','United Airlines','Society / Economy and business / Companies / Airlines / United Airlines',true,'Accepted'),
  ('society-economy-and-business-companies-automotive','Automotive companies','Society / Economy and business / Companies / Automotive companies',false,'Accepted'),
  ('society-economy-and-business-companies-automotive-ford','Ford','Society / Economy and business / Companies / Automotive companies / Ford',true,'Accepted'),
  ('society-economy-and-business-companies-automotive-gm','General Motors','Society / Economy and business / Companies / Automotive companies / General Motors',true,'Accepted'),
  ('society-economy-and-business-companies-automotive-stellantis','Stellantis','Society / Economy and business / Companies / Automotive companies / Stellantis',true,'Accepted'),
  ('society-economy-and-business-companies-automotive-toyota','Toyota','Society / Economy and business / Companies / Automotive companies / Toyota',true,'Accepted'),
  ('society-economy-and-business-companies-automotive-volkswagen','Volkswagen','Society / Economy and business / Companies / Automotive companies / Volkswagen',true,'Accepted'),
  ('society-economy-and-business-companies-financial-companies','Financial companies','Society / Economy and business / Companies / Financial companies',false,'Accepted'),
  ('society-economy-and-business-companies-financial-companies-bank-of-america','Bank of America','Society / Economy and business / Companies / Financial companies / Bank of America',true,'Accepted'),
  ('society-economy-and-business-companies-financial-companies-citigroup','Citigroup','Society / Economy and business / Companies / Financial companies / Citigroup',true,'Accepted'),
  ('society-economy-and-business-companies-financial-companies-goldman-sachs','Goldman Sachs','Society / Economy and business / Companies / Financial companies / Goldman Sachs',true,'Accepted'),
  ('society-economy-and-business-companies-financial-companies-jpmorgan-chase','JPMorgan Chase','Society / Economy and business / Companies / Financial companies / JPMorgan Chase',true,'Accepted'),
  ('society-economy-and-business-companies-financial-companies-mastercard','Mastercard','Society / Economy and business / Companies / Financial companies / Mastercard',true,'Accepted'),
  ('society-economy-and-business-companies-financial-companies-morgan-stanley','Morgan Stanley','Society / Economy and business / Companies / Financial companies / Morgan Stanley',true,'Accepted'),
  ('society-economy-and-business-companies-financial-companies-paypal','PayPal','Society / Economy and business / Companies / Financial companies / PayPal',true,'Accepted'),
  ('society-economy-and-business-companies-financial-companies-visa','Visa','Society / Economy and business / Companies / Financial companies / Visa',true,'Accepted'),
  ('society-economy-and-business-companies-financial-companies-wells-fargo','Wells Fargo','Society / Economy and business / Companies / Financial companies / Wells Fargo',true,'Accepted'),
  ('society-economy-and-business-companies-food-and-beverage','Food and beverage companies','Society / Economy and business / Companies / Food and beverage companies',false,'Accepted'),
  ('society-economy-and-business-companies-food-and-beverage-kraft-heinz','Kraft Heinz','Society / Economy and business / Companies / Food and beverage companies / Kraft Heinz',true,'Accepted'),
  ('society-economy-and-business-companies-food-and-beverage-mcdonalds','McDonald''s','Society / Economy and business / Companies / Food and beverage companies / McDonald''s',true,'Accepted'),
  ('society-economy-and-business-companies-food-and-beverage-mondelez','Mondelez','Society / Economy and business / Companies / Food and beverage companies / Mondelez',true,'Accepted'),
  ('society-economy-and-business-companies-food-and-beverage-pepsico','PepsiCo','Society / Economy and business / Companies / Food and beverage companies / PepsiCo',true,'Accepted'),
  ('society-economy-and-business-companies-food-and-beverage-procter-gamble','Procter & Gamble','Society / Economy and business / Companies / Food and beverage companies / Procter & Gamble',true,'Accepted'),
  ('society-economy-and-business-companies-food-and-beverage-coca-cola','The Coca-Cola Company','Society / Economy and business / Companies / Food and beverage companies / The Coca-Cola Company',true,'Accepted'),
  ('society-economy-and-business-companies-food-and-beverage-unilever','Unilever','Society / Economy and business / Companies / Food and beverage companies / Unilever',true,'Accepted'),
  ('society-economy-and-business-companies-media-companies','Media companies','Society / Economy and business / Companies / Media companies',false,'Accepted'),
  ('society-economy-and-business-companies-media-companies-comcast','Comcast','Society / Economy and business / Companies / Media companies / Comcast',true,'Accepted'),
  ('society-economy-and-business-companies-media-companies-netflix','Netflix','Society / Economy and business / Companies / Media companies / Netflix',true,'Accepted'),
  ('society-economy-and-business-companies-media-companies-news-corp','News Corp','Society / Economy and business / Companies / Media companies / News Corp',true,'Accepted'),
  ('society-economy-and-business-companies-media-companies-paramount','Paramount','Society / Economy and business / Companies / Media companies / Paramount',true,'Accepted'),
  ('society-economy-and-business-companies-media-companies-disney','The Walt Disney Company','Society / Economy and business / Companies / Media companies / The Walt Disney Company',true,'Accepted'),
  ('society-economy-and-business-companies-media-companies-thomson-reuters','Thomson Reuters','Society / Economy and business / Companies / Media companies / Thomson Reuters',true,'Accepted'),
  ('society-economy-and-business-companies-media-companies-warner-bros-discovery','Warner Bros. Discovery','Society / Economy and business / Companies / Media companies / Warner Bros. Discovery',true,'Accepted'),
  ('society-economy-and-business-companies-retail-companies','Retail companies','Society / Economy and business / Companies / Retail companies',false,'Accepted'),
  ('society-economy-and-business-companies-retail-companies-costco','Costco','Society / Economy and business / Companies / Retail companies / Costco',true,'Accepted'),
  ('society-economy-and-business-companies-retail-companies-cvs','CVS Health','Society / Economy and business / Companies / Retail companies / CVS Health',true,'Accepted'),
  ('society-economy-and-business-companies-retail-companies-ebay','eBay','Society / Economy and business / Companies / Retail companies / eBay',true,'Accepted'),
  ('society-economy-and-business-companies-retail-companies-kroger','Kroger','Society / Economy and business / Companies / Retail companies / Kroger',true,'Accepted'),
  ('society-economy-and-business-companies-retail-companies-target','Target','Society / Economy and business / Companies / Retail companies / Target',true,'Accepted'),
  ('society-economy-and-business-companies-retail-companies-home-depot','The Home Depot','Society / Economy and business / Companies / Retail companies / The Home Depot',true,'Accepted'),
  ('society-economy-and-business-companies-retail-companies-walgreens','Walgreens','Society / Economy and business / Companies / Retail companies / Walgreens',true,'Accepted'),
  ('society-economy-and-business-companies-retail-companies-walmart','Walmart','Society / Economy and business / Companies / Retail companies / Walmart',true,'Accepted'),
  ('society-economy-and-business-companies-telecom-companies','Telecom companies','Society / Economy and business / Companies / Telecom companies',false,'Accepted'),
  ('society-economy-and-business-companies-telecom-companies-att','AT&T','Society / Economy and business / Companies / Telecom companies / AT&T',true,'Accepted'),
  ('society-economy-and-business-companies-telecom-companies-tmobile','T-Mobile','Society / Economy and business / Companies / Telecom companies / T-Mobile',true,'Accepted'),
  ('society-economy-and-business-companies-telecom-companies-verizon','Verizon','Society / Economy and business / Companies / Telecom companies / Verizon',true,'Accepted')
) AS v(id, name, path, is_leaf, kettle)
WHERE NOT EXISTS (SELECT 1 FROM public.atoms a WHERE a.id = v.id);

-- parent flip: Companies (defensive; EXISTS-guarded, no-op if already non-leaf)
UPDATE public.atoms SET is_leaf = false
WHERE id = 'society-economy-and-business-companies'
AND EXISTS (SELECT 1 FROM public.atoms c WHERE c.path LIKE public.atoms.path || ' / %');
