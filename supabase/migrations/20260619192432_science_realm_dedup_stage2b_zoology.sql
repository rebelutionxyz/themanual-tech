-- Science dedup stage 2b (B convention): dissolve promoted Zoology container, untangle from Life forms.
UPDATE atoms SET path='Science / Biology / Life forms / Kingdom Animalia / Vertebrates / Fish / By region' || substring(path from length('Science / Biology / Zoology / Fish / By region')+1) WHERE realm_id='science' AND path LIKE 'Science / Biology / Zoology / Fish / By region%';
UPDATE atoms SET path='Science / Biology / Life forms / Kingdom Animalia / Invertebrates / Arthropods / Insects / By region' || substring(path from length('Science / Biology / Zoology / Insects / By region')+1) WHERE realm_id='science' AND path LIKE 'Science / Biology / Zoology / Insects / By region%';
UPDATE atoms SET path='Science / Biology / Branches of biology / Paleontology / Dinosaur species' WHERE realm_id='science' AND path='Science / Biology / Zoology / Paleontology / Dinosaur species';
UPDATE atoms SET path='Science / Biology / Branches of biology / Zoology / Ethology / Feeding behaviours' WHERE realm_id='science' AND path='Science / Biology / Ethology / Feeding behaviours';
DELETE FROM atoms WHERE realm_id='science' AND path='Science / Biology / Zoology / Birds / By region';
DELETE FROM atoms WHERE realm_id='science' AND path='Science / Biology / Zoology / Mammals / By region';
DELETE FROM atoms WHERE realm_id='science' AND path='Science / Biology / Zoology / Birds';
DELETE FROM atoms WHERE realm_id='science' AND path='Science / Biology / Zoology / Mammals';
DELETE FROM atoms WHERE realm_id='science' AND path='Science / Biology / Zoology / Domesticated animals';
DELETE FROM atoms WHERE realm_id='science' AND path='Science / Biology / Zoology / Fish';
DELETE FROM atoms WHERE realm_id='science' AND path='Science / Biology / Zoology / Insects';
DELETE FROM atoms WHERE realm_id='science' AND path='Science / Biology / Zoology / Paleontology';
DELETE FROM atoms WHERE realm_id='science' AND path='Science / Biology / Ethology';
DELETE FROM atoms WHERE realm_id='science' AND path='Science / Biology / Zoology';
UPDATE atoms SET path_parts=string_to_array(path,' / '), depth=cardinality(string_to_array(path,' / ')) WHERE realm_id='science';
