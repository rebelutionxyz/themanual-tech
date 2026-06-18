-- Justice legal subtrees -> Society / Law (each Justice L2 becomes an L3 under Law).
update atoms set
  realm_id='society', realm_name='Society', realm_tags=array['Society']::text[],
  path_parts = array['Society','Law']::text[] || path_parts[2:array_length(path_parts,1)],
  path = array_to_string(array['Society','Law']::text[] || path_parts[2:array_length(path_parts,1)], ' / '),
  depth = depth + 1
where realm_id='justice' and path_parts[2] in ('Legal Frameworks','Types of Crime','Prosecutions','Evidence');

update realms r set atom_count=(select count(*) from atoms a where a.realm_id=r.id);
