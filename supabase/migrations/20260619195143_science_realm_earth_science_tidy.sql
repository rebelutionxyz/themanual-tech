-- Science Earth-science tidy: relocate misplaced topic + drop two redundant childless stubs.
UPDATE atoms SET path='Science / Earth science / Climate science / Climate change attribution' WHERE realm_id='science' AND path='Science / Earth science / Climate change attribution';
DELETE FROM atoms WHERE realm_id='science' AND path='Science / Earth science / Climate science / Climate change (science)';
DELETE FROM atoms WHERE realm_id='science' AND path='Science / Earth science / Geology / Tectonic plates';
UPDATE atoms SET path_parts=string_to_array(path,' / '), depth=cardinality(string_to_array(path,' / ')) WHERE realm_id='science';
