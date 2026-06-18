-- Merge Justice/Activism subtree into the existing Society/Social movements/Activism node.
update atoms set
  realm_id='society', realm_name='Society', realm_tags=array['Society']::text[],
  path_parts = array['Society','Social movements','Activism']::text[] || path_parts[3:array_length(path_parts,1)],
  path = array_to_string(array['Society','Social movements','Activism']::text[] || path_parts[3:array_length(path_parts,1)], ' / '),
  depth = depth + 1
where realm_id='justice' and path_parts[2]='Activism' and depth>=3;

-- remove the now-redundant Justice Activism container (existing node takes its place)
delete from atoms where realm_id='justice' and path_parts[2]='Activism' and depth=2;

update realms r set atom_count=(select count(*) from atoms a where a.realm_id=r.id);
