-- Human activities within-realm dedup: "Broadcasting" existed both as an empty direct child of Communication and as a developed node under Telecommunicating.
DELETE FROM atoms WHERE realm_id='human_activities' AND path='Human activities / Communication / Broadcasting';
UPDATE atoms SET path_parts=string_to_array(path,' / '), depth=cardinality(string_to_array(path,' / ')) WHERE realm_id='human_activities';
