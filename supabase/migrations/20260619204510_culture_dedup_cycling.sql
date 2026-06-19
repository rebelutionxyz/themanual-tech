-- Culture within-realm dedup: "Cycling" existed both directly under Sports and under Sports/Traveling and racing sports (both empty).
DELETE FROM atoms WHERE realm_id='culture' AND path='Culture / Sports / Cycling';
UPDATE atoms SET path_parts=string_to_array(path,' / '), depth=cardinality(string_to_array(path,' / ')) WHERE realm_id='culture';
