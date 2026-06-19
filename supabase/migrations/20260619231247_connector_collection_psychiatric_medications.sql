insert into atom_collections (slug, name, description) values
 ('psychiatric-medications','Psychiatric medications','Cross-cutting view of the drug classes used to treat psychiatric conditions. Each drug''s canonical home is its pharmacological class; this collection gathers those classes in one place, replacing the former Psychiatric drugs grouping.');
insert into atom_collection_members (collection_id, atom_id, ordinal, note)
select c.id, m.atom_id, m.ordinal, null
from atom_collections c
cross join (values
  ('health-substances-pharmaceutical-drugs-antidepressants', 1),
  ('health-substances-pharmaceutical-drugs-antipsychotics', 2),
  ('health-substances-pharmaceutical-drugs-mood-stabilizers', 3)
) as m(atom_id, ordinal)
where c.slug='psychiatric-medications';
