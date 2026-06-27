-- redundant standalone Climbing (already exists under Climbing sports)
delete from atoms where id='culture-sports-climbing';

-- merge Ice and winter sports into Winter sports, then drop the redundant node
update atoms set
  path_parts = array['Culture','Sports','Winter sports']::text[] || path_parts[4:array_length(path_parts,1)],
  path = array_to_string(array['Culture','Sports','Winter sports']::text[] || path_parts[4:array_length(path_parts,1)], ' / ')
where realm_id='culture' and path_parts[2]='Sports' and path_parts[3]='Ice and winter sports' and depth>=4;
delete from atoms where id='culture-sports-ice-and-winter-sports';

update realms r set atom_count=(select count(*) from atoms a where a.realm_id=r.id);
