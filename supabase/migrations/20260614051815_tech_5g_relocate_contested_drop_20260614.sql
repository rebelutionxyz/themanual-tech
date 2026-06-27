-- 5G subject -> proper telecom home (was misfiled in Computing/Computing and society)
update atoms set is_leaf=false
  where id='tech-communication-technology-telecommunications-wireless-cellular-networks';
update atoms set
  name='5G',
  path='Tech / Communication technology / Telecommunications / Wireless / Cellular networks / 5G',
  path_parts=array['Tech','Communication technology','Telecommunications','Wireless','Cellular networks','5G']::text[],
  depth=6, is_leaf=true
where id='tech-computing-computing-and-society-5g-mobile-network-technology';

-- conspiracy-framed held copy is redundant (subject now homed; health angle = investigation layer)
delete from atoms where id='justice-investigations-contested-narratives-5g-health-and-population-concerns';

update realms r set atom_count=(select count(*) from atoms a where a.realm_id=r.id) where r.id in ('tech','justice');
