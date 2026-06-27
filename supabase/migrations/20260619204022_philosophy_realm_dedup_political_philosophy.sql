-- Philosophy within-realm dedup: "Political philosophy" existed as both a top-level L2 and a node under Schools/Western philosophy.
UPDATE atoms SET path='Philosophy / Political philosophy / Neothink (Mark Hamilton)' WHERE realm_id='philosophy' AND path='Philosophy / Schools / Western philosophy / Political philosophy / Neothink (Mark Hamilton)';
DELETE FROM atoms WHERE realm_id='philosophy' AND path='Philosophy / Schools / Western philosophy / Political philosophy';
UPDATE atoms SET path_parts=string_to_array(path,' / '), depth=cardinality(string_to_array(path,' / ')) WHERE realm_id='philosophy';
