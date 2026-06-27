-- Science dedup stage 2a (B convention): Genetics merge + Relativity/QFT relocation into Branches of physics.
UPDATE atoms SET path='Science / Biology / Branches of biology / Genetics / Gene families' WHERE realm_id='science' AND path='Science / Biology / Genetics / Gene families';
DELETE FROM atoms WHERE realm_id='science' AND path='Science / Biology / Genetics';
UPDATE atoms SET path='Science / Physics / Branches of physics / Relativity' || substring(path from length('Science / Physics / Relativity')+1) WHERE realm_id='science' AND path LIKE 'Science / Physics / Relativity%';
UPDATE atoms SET path='Science / Physics / Branches of physics / Quantum field theory' || substring(path from length('Science / Physics / Quantum field theory')+1) WHERE realm_id='science' AND path LIKE 'Science / Physics / Quantum field theory%';
UPDATE atoms SET path_parts=string_to_array(path,' / '), depth=cardinality(string_to_array(path,' / ')) WHERE realm_id='science';
