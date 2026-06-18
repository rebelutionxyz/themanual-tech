-- Real subjects buried under framing -> their subject homes. Strip framing, drop framed children.
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],is_leaf=true,
  name='Project Stargate',path='Society / Military and security / Project Stargate',
  path_parts=array['Society','Military and security','Project Stargate']::text[],depth=3
where id='justice-investigations-contested-narratives-fringe-claims-category-project-stargate';
delete from atoms where id='justice-investigations-contested-narratives-fringe-claims-category-project-stargate-remote-viewing-operational-effectiveness';

update atoms set realm_id='history',realm_name='History',realm_tags=array['History']::text[],is_leaf=true,
  name='Sandy Hook Elementary School shooting',path='History / Historical events / Sandy Hook Elementary School shooting',
  path_parts=array['History','Historical events','Sandy Hook Elementary School shooting']::text[],depth=3
where id='justice-investigations-contested-narratives-sandy-hook';
delete from atoms where id='justice-investigations-contested-narratives-sandy-hook-mass-shootings-false-flag-interpretations';

update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],is_leaf=true,
  name='Build Back Better',path='Society / Government / Build Back Better',
  path_parts=array['Society','Government','Build Back Better']::text[],depth=3
where id='justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-build-back-better';
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],is_leaf=true,depth=3,
  name='Great Reset',path='Society / Government / Great Reset',
  path_parts=array['Society','Government','Great Reset']::text[]
where id='justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-build-back-better-great-reset-as-coordinated-agenda';

update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],is_leaf=true,
  name='Pact for the Future',path='Society / Government / Pact for the Future',
  path_parts=array['Society','Government','Pact for the Future']::text[],depth=3
where id='justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-pact-for-the-future';
delete from atoms where id='justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-pact-for-the-future-emergency-platform-as-global-takeover';

update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],is_leaf=true,
  name='Mind control',path='Society / Military and security / Mind control',
  path_parts=array['Society','Military and security','Mind control']::text[],depth=3
where id='justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-mind-control';
delete from atoms where id='justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-mind-control-psyop-infrastructure';

update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],is_leaf=true,
  name='Eugenics',path='Society / Social sciences / Eugenics',
  path_parts=array['Society','Social sciences','Eugenics']::text[],depth=3
where id='justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-eugenics-agenda-continuation-depopulation-thesis';

update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],is_leaf=true,
  name='Internment camps',path='Society / Military and security / Internment camps',
  path_parts=array['Society','Military and security','Internment camps']::text[],depth=3
where id='justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-internment-camps-as-standby-infrastructure';

delete from atoms where id='justice-investigations-contested-narratives-occult-satanism-in-power-allegations';

update realms r set atom_count=(select count(*) from atoms a where a.realm_id=r.id);
