-- Society within-realm dedup (Accountability subtree excluded per standing scan rule).
-- Per-country government homonyms intentionally kept (distinct institutions).
UPDATE atoms SET path='Society / Linguistics / Branches of linguistics / Phonetics' || substring(path from length('Society / Linguistics / Phonetics')+1) WHERE realm_id='society' AND path LIKE 'Society / Linguistics / Phonetics / %';
DELETE FROM atoms WHERE realm_id='society' AND path='Society / Linguistics / Phonetics';
UPDATE atoms SET path='Society / Government / Government types / Democracy / Direct democracy' || substring(path from length('Society / Social movements / Activism / Direct democracy')+1) WHERE realm_id='society' AND path LIKE 'Society / Social movements / Activism / Direct democracy / %';
DELETE FROM atoms WHERE realm_id='society' AND path='Society / Social movements / Activism / Direct democracy';
DELETE FROM atoms WHERE realm_id='society' AND path IN (
  'Society / Economy and business / Firms & labour / Companies / Retail',
  'Society / Economy and business / Firms & labour / Trade unions',
  'Society / Law / Legal Frameworks / Civil liberties / Youth rights',
  'Society / Government / Government concepts / Public administration'
);
UPDATE atoms SET path_parts=string_to_array(path,' / '), depth=cardinality(string_to_array(path,' / ')) WHERE realm_id='society';
