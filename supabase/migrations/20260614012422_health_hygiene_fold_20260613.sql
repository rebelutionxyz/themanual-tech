-- Health finish: fold Hygiene's 4 atoms into Self-care, retire the Hygiene L2.
update atoms set
  path='Health / Self-care / '||name,
  path_parts=array['Health','Self-care',name]::text[],
  depth=3
where id in ('health-hygiene-cleaning','health-hygiene-cleanliness',
             'health-hygiene-occupational-hygiene','health-hygiene-oral-hygiene');
delete from atoms where id='health-hygiene';
update realms r set atom_count=(select count(*) from atoms a where a.realm_id=r.id) where r.id='health';
