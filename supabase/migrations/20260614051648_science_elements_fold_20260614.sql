-- Best-practice fold: one canonical elements home.
-- Isotopes (+ Stable) -> under Chemical elements; drop redundant sort-views; retire Elements wrapper.
update atoms set
  path_parts = array['Science','Chemistry','Chemical elements']::text[] || path_parts[4:array_length(path_parts,1)],
  path = array_to_string(array['Science','Chemistry','Chemical elements']::text[] || path_parts[4:array_length(path_parts,1)], ' / ')
where realm_id='science' and path_parts[2]='Chemistry' and path_parts[3]='Elements' and path_parts[4]='Isotopes';

delete from atoms where id in (
  'science-chemistry-elements-by-atomic-number',
  'science-chemistry-elements-by-symbol',
  'science-chemistry-elements'
);

update realms r set atom_count=(select count(*) from atoms a where a.realm_id=r.id) where r.id='science';
