update atoms set
  path_parts = array['Tech','Transport technology','Maritime transport']::text[] || path_parts[4:array_length(path_parts,1)],
  path = array_to_string(array['Tech','Transport technology','Maritime transport']::text[] || path_parts[4:array_length(path_parts,1)], ' / ')
where realm_id='tech' and path_parts[2]='Transport technology' and path_parts[3]='Maritime' and depth>=4;
delete from atoms where id='tech-transport-technology-maritime';
update realms r set atom_count=(select count(*) from atoms a where a.realm_id=r.id);
