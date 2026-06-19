-- Math within-realm tidy: relocate Theorems to Mathematical statements; drop two vague empty catch-alls; dedup Prime numbers.
UPDATE atoms SET path='Math / Mathematical statements / Theorems' || substring(path from length('Math / Concepts / Theorems')+1) WHERE realm_id='math' AND path LIKE 'Math / Concepts / Theorems%';
DELETE FROM atoms WHERE realm_id='math' AND path='Math / Concepts / General concepts';
DELETE FROM atoms WHERE realm_id='math' AND path='Math / Mathematical objects / Mathematical examples';
DELETE FROM atoms WHERE realm_id='math' AND path='Math / Branches of mathematics / Number theory / Prime numbers';
UPDATE atoms SET path_parts=string_to_array(path,' / '), depth=cardinality(string_to_array(path,' / ')) WHERE realm_id='math';
