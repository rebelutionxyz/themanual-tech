-- exact duplicate
delete from atoms where id='society-social-movements-feminism-social-movement';

-- tuck the 3 rescued lists under their proper Investigations parents
update atoms set depth=5,
  path_parts=array['Society','Accountability','Investigations','Investigative journalism','Investigative journalism outlets']::text[],
  path='Society / Accountability / Investigations / Investigative journalism / Investigative journalism outlets'
where id='justice-evidence-investigative-journalism-outlets';

update atoms set depth=5,
  path_parts=array['Society','Accountability','Investigations','Whistleblowing','Notable whistleblowers']::text[],
  path='Society / Accountability / Investigations / Whistleblowing / Notable whistleblowers'
where id='justice-evidence-notable-whistleblowers';

update atoms set depth=5,
  path_parts=array['Society','Accountability','Investigations','Whistleblowing','Whistleblower support organizations']::text[],
  path='Society / Accountability / Investigations / Whistleblowing / Whistleblower support organizations'
where id='justice-evidence-whistleblower-support-organizations';

update realms r set atom_count=(select count(*) from atoms a where a.realm_id=r.id);
