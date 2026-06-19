-- History within-realm dedup: four periods appeared both as flat top-level Periods entries (childless) and nested in their proper chronological parent.
DELETE FROM atoms WHERE realm_id='history' AND path IN (
  'History / Periods / Classical antiquity',
  'History / Periods / Contemporary history',
  'History / Periods / Middle Ages',
  'History / Periods / Renaissance'
);
UPDATE atoms SET path_parts=string_to_array(path,' / '), depth=cardinality(string_to_array(path,' / ')) WHERE realm_id='history';
