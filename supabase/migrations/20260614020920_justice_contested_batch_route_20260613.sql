-- Contested narratives batch: create hubs, route events/science/CT to neutral homes,
-- delete prior-Claude evaluation scaffolding + dup-redundant atoms. Deferred set stays.

insert into atoms (id,name,path,path_parts,realm_id,realm_name,depth,kettle,is_leaf,theme_tags,realm_tags,pillar_tags,status,created_at,updated_at) values
('history-assassinations','Assassinations','History / Assassinations',array['History','Assassinations']::text[],'history','History',2,'Accepted',false,'{}'::text[],array['History']::text[],array['MANUAL']::text[],'live',now(),now()),
('society-conspiracy-theories','Conspiracy theories','Society / Conspiracy theories',array['Society','Conspiracy theories']::text[],'society','Society',2,'Accepted',false,'{}'::text[],array['Society']::text[],array['MANUAL']::text[],'live',now(),now());

update atoms set realm_id='history',realm_name='History',realm_tags=array['History']::text[],
  name='John F. Kennedy assassination',path='History / Assassinations / John F. Kennedy assassination',
  path_parts=array['History','Assassinations','John F. Kennedy assassination']::text[],depth=3
where id='justice-investigations-contested-narratives-jfk-assassination-alternative-interpretations';
update atoms set realm_id='history',realm_name='History',realm_tags=array['History']::text[],
  name='TWA Flight 800',path='History / Historical events / TWA Flight 800',
  path_parts=array['History','Historical events','TWA Flight 800']::text[],depth=3
where id='justice-investigations-contested-narratives-twa-flight-800-cause';
update atoms set realm_id='history',realm_name='History',realm_tags=array['History']::text[],
  name='January 6 Capitol attack',path='History / Historical events / January 6 Capitol attack',
  path_parts=array['History','Historical events','January 6 Capitol attack']::text[],depth=3
where id='justice-investigations-contested-narratives-january-6-provocateur-and-setup-claims';
update atoms set realm_id='history',realm_name='History',realm_tags=array['History']::text[],
  name='Death of Jeffrey Epstein',path='History / Historical events / Death of Jeffrey Epstein',
  path_parts=array['History','Historical events','Death of Jeffrey Epstein']::text[],depth=3
where id='justice-investigations-contested-narratives-epstein-suicide-vs-homicide';
update atoms set realm_id='history',realm_name='History',realm_tags=array['History']::text[],
  name='Death of Seth Rich',path='History / Historical events / Death of Seth Rich',
  path_parts=array['History','Historical events','Death of Seth Rich']::text[],depth=3
where id='justice-investigations-contested-narratives-seth-rich-death';
update atoms set realm_id='history',realm_name='History',realm_tags=array['History']::text[],
  name='Death of Vince Foster',path='History / Historical events / Death of Vince Foster',
  path_parts=array['History','Historical events','Death of Vince Foster']::text[],depth=3
where id='justice-investigations-contested-narratives-vince-foster-death';

update atoms set realm_id='science',realm_name='Science',realm_tags=array['Science']::text[],
  name='Climate change attribution',path='Science / Earth science / Climate change attribution',
  path_parts=array['Science','Earth science','Climate change attribution']::text[],depth=3
where id='justice-investigations-contested-narratives-climate-change-attribution-dispute';
update atoms set realm_id='health',realm_name='Health',realm_tags=array['Health']::text[],
  name='Origin of COVID-19',path='Health / Public health / Origin of COVID-19',
  path_parts=array['Health','Public health','Origin of COVID-19']::text[],depth=3
where id='justice-investigations-contested-narratives-covid-19-origins-dispute';
update atoms set realm_id='health',realm_name='Health',realm_tags=array['Health']::text[],
  name='Water fluoridation',path='Health / Public health / Water fluoridation',
  path_parts=array['Health','Public health','Water fluoridation']::text[],depth=3
where id='justice-investigations-contested-narratives-fluoride-water-supply-concerns';
update atoms set realm_id='science',realm_name='Science',realm_tags=array['Science']::text[],
  name='Gain-of-function research',path='Science / Biology / Gain-of-function research',
  path_parts=array['Science','Biology','Gain-of-function research']::text[],depth=3
where id='justice-investigations-contested-narratives-gain-of-function-research-safety-dispute';
update atoms set realm_id='health',realm_name='Health',realm_tags=array['Health']::text[],
  name='Vaccine safety',path='Health / Public health / Vaccine safety',
  path_parts=array['Health','Public health','Vaccine safety']::text[],depth=3
where id='justice-investigations-contested-narratives-vaccine-safety-specific-concerns';
update atoms set realm_id='science',realm_name='Science',realm_tags=array['Science']::text[],
  name='Adrenochrome',path='Science / Chemistry / Adrenochrome',
  path_parts=array['Science','Chemistry','Adrenochrome']::text[],depth=3
where id='justice-investigations-contested-narratives-fringe-claims-category-adrenochrome-harvesting-claim';

update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  name='Flat Earth',path='Society / Conspiracy theories / Flat Earth',
  path_parts=array['Society','Conspiracy theories','Flat Earth']::text[],depth=3
where id='justice-investigations-contested-narratives-fringe-claims-category-flat-earth';
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  name='QAnon',path='Society / Conspiracy theories / QAnon',
  path_parts=array['Society','Conspiracy theories','QAnon']::text[],depth=3
where id='justice-investigations-contested-narratives-qanon-movement-and-drops';
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  name='Tartarian Empire (pseudohistory)',path='Society / Conspiracy theories / Tartarian Empire (pseudohistory)',
  path_parts=array['Society','Conspiracy theories','Tartarian Empire (pseudohistory)']::text[],depth=3
where id='justice-investigations-contested-narratives-fringe-claims-category-tartarian-empire-hypothesis';
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  name='Project Blue Beam',path='Society / Conspiracy theories / Project Blue Beam',
  path_parts=array['Society','Conspiracy theories','Project Blue Beam']::text[],depth=3
where id='justice-investigations-contested-narratives-fringe-claims-category-project-blue-beam-claim';
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  name='Pizzagate conspiracy theory',path='Society / Conspiracy theories / Pizzagate conspiracy theory',
  path_parts=array['Society','Conspiracy theories','Pizzagate conspiracy theory']::text[],depth=3
where id='justice-investigations-contested-narratives-fringe-claims-category-pizzagate-claim-set';
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  name='Great Replacement',path='Society / Conspiracy theories / Great Replacement',
  path_parts=array['Society','Conspiracy theories','Great Replacement']::text[],depth=3
where id='justice-investigations-contested-narratives-fringe-claims-category-great-replacement-theory-framing';
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  name='Kalergi Plan',path='Society / Conspiracy theories / Kalergi Plan',
  path_parts=array['Society','Conspiracy theories','Kalergi Plan']::text[],depth=3
where id='justice-investigations-contested-narratives-fringe-claims-category-kalergi-plan';
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  name='Crisis actor',path='Society / Conspiracy theories / Crisis actor',
  path_parts=array['Society','Conspiracy theories','Crisis actor']::text[],depth=3
where id='justice-investigations-contested-narratives-fringe-claims-category-crisis-actor-allegations-general-pattern';
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  name='Project Lockstep',path='Society / Conspiracy theories / Project Lockstep',
  path_parts=array['Society','Conspiracy theories','Project Lockstep']::text[],depth=3
where id='justice-investigations-contested-narratives-fringe-claims-category-project-lockstep-claim';
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  name='Project Looking Glass',path='Society / Conspiracy theories / Project Looking Glass',
  path_parts=array['Society','Conspiracy theories','Project Looking Glass']::text[],depth=3
where id='justice-investigations-contested-narratives-fringe-claims-category-project-looking-glass-claim';

update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  name='Deep underground military base',path='Society / Military and security / Deep underground military base',
  path_parts=array['Society','Military and security','Deep underground military base']::text[],depth=3
where id='justice-investigations-contested-narratives-fringe-claims-category-deep-underground-military-base-dumb-networks';

delete from atoms
where realm_id='justice' and path_parts[2]='Investigations' and path_parts[3]='Contested narratives'
  and path_parts[4] in (
    'Common patterns in contested narratives','Framework for evaluating contested narratives',
    'Red flags in narratives','Contested narrative (concept)','Alternative media gatekeeping (pattern)',
    '9/11 alternative interpretations','Intentional weather modification claims'
  );

update realms r set atom_count=(select count(*) from atoms a where a.realm_id=r.id);
