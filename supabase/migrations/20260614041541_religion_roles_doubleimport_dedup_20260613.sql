-- double-import duplicates (keep Popes[+content], Saints, Founder (religious))
delete from atoms where id in (
  'religion-religious-roles-pope-role',
  'religion-religious-roles-saint-role',
  'religion-religious-roles-founders'
);
update realms r set atom_count=(select count(*) from atoms a where a.realm_id=r.id);
