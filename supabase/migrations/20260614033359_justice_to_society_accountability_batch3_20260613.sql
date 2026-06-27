-- New Accountability domain in Society + its Investigations hub
insert into atoms (id,name,path,path_parts,realm_id,realm_name,depth,kettle,is_leaf,theme_tags,realm_tags,pillar_tags,status,created_at,updated_at) values
('society-accountability','Accountability','Society / Accountability',array['Society','Accountability']::text[],'society','Society',2,'Accepted',false,'{}'::text[],array['Society']::text[],array['MANUAL']::text[],'live',now(),now()),
('society-accountability-investigations','Investigations','Society / Accountability / Investigations',array['Society','Accountability','Investigations']::text[],'society','Society',3,'Accepted',false,'{}'::text[],array['Society']::text[],array['MANUAL']::text[],'live',now(),now());

-- Patterns -> Accountability / Patterns
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  path_parts = array['Society','Accountability']::text[] || path_parts[2:array_length(path_parts,1)],
  path = array_to_string(array['Society','Accountability']::text[] || path_parts[2:array_length(path_parts,1)], ' / '),
  depth = depth + 1
where realm_id='justice' and path_parts[2]='Patterns';

-- Progress -> Accountability / Progress
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  path_parts = array['Society','Accountability']::text[] || path_parts[2:array_length(path_parts,1)],
  path = array_to_string(array['Society','Accountability']::text[] || path_parts[2:array_length(path_parts,1)], ' / '),
  depth = depth + 1
where realm_id='justice' and path_parts[2]='Progress';

-- Investigations (clean, excluding the parked Contested narratives) -> Accountability / Investigations
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  path_parts = array['Society','Accountability','Investigations']::text[] || path_parts[3:array_length(path_parts,1)],
  path = array_to_string(array['Society','Accountability','Investigations']::text[] || path_parts[3:array_length(path_parts,1)], ' / '),
  depth = depth + 1
where realm_id='justice' and path_parts[2]='Investigations' and path_parts[3] <> 'Contested narratives' and depth>=3;

-- peel the 3 misfiled whistleblower/journalism lists out of Law/Evidence into Accountability/Investigations
update atoms set
  path_parts = array['Society','Accountability','Investigations']::text[] || path_parts[4:array_length(path_parts,1)],
  path = array_to_string(array['Society','Accountability','Investigations']::text[] || path_parts[4:array_length(path_parts,1)], ' / ')
where realm_id='society' and path_parts[2]='Law' and path_parts[3]='Evidence'
  and name in ('Notable whistleblowers','Investigative journalism outlets','Whistleblower support organizations');

-- delete the empty Movements pointer stub
delete from atoms where realm_id='justice' and path_parts[2]='Movements (pointer)';

update realms r set atom_count=(select count(*) from atoms a where a.realm_id=r.id);
