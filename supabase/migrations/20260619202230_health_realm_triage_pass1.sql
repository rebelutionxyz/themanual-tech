-- Health within-realm triage pass 1.
-- Park misplaced Aging + Death in Reference/Unsorted (realm_tags = candidate homes for later sorting).
-- Nest Psychiatric drugs (+child) under Pharmaceutical drugs. Consolidate empty diagnostic stub into Diagnostic frameworks.
-- Remove vague empty leaves (Psychological adjustment, generic Safety, Disorders). Collapse lay synonym "Poor nutrition" into Malnutrition.
UPDATE atoms SET realm_id='reference', realm_name='Reference', realm_tags='{Self,Science}', path='Reference / Unsorted / Aging' WHERE realm_id='health' AND path='Health / Illness / Aging';
UPDATE atoms SET realm_id='reference', realm_name='Reference', realm_tags='{Religion,Philosophy,Science,Self}', path='Reference / Unsorted / Death' WHERE realm_id='health' AND path='Health / Illness / Death';
UPDATE atoms SET path='Health / Substances / Pharmaceutical drugs / Psychiatric drugs' || substring(path from length('Health / Substances / Psychiatric drugs')+1) WHERE realm_id='health' AND path LIKE 'Health / Substances / Psychiatric drugs%';
DELETE FROM atoms WHERE realm_id='health' AND path='Health / Mental health / Diagnostic classification and rating scales';
DELETE FROM atoms WHERE realm_id='health' AND path='Health / Mental health / Psychological adjustment';
DELETE FROM atoms WHERE realm_id='health' AND path='Health / Public health / Safety';
DELETE FROM atoms WHERE realm_id='health' AND path='Health / Illness / Disorders';
DELETE FROM atoms WHERE realm_id='health' AND path='Health / Nutrition / Poor nutrition';
UPDATE atoms SET path_parts=string_to_array(path,' / '), depth=cardinality(string_to_array(path,' / ')) WHERE realm_id='health';
