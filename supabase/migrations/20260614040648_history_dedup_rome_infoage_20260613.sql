-- redundant standalone Ancient Rome leaf; promote the real 'Roman' node to 'Ancient Rome'
delete from atoms where id='history-ancient-civilizations-ancient-rome';
update atoms set path_parts[3]='Ancient Rome',
  path = replace(path, 'Ancient civilizations / Roman', 'Ancient civilizations / Ancient Rome')
where realm_id='history' and path_parts[2]='Ancient civilizations' and path_parts[3]='Roman';
update atoms set name='Ancient Rome' where id='history-ancient-civilizations-roman';

-- Digital Age = Information Age (keep the standard umbrella term)
delete from atoms where id='history-periods-digital-age';

update realms r set atom_count=(select count(*) from atoms a where a.realm_id=r.id);
