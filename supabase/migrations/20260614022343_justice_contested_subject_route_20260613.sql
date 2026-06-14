-- Dissolve the Conspiracy-theories hub; place every atom by SUBJECT, not truth-value.
-- Re-route hub -> subject homes
update atoms set realm_id='science',realm_name='Science',realm_tags=array['Science']::text[],
  name='Flat Earth',path='Science / Earth science / Flat Earth',
  path_parts=array['Science','Earth science','Flat Earth']::text[],depth=3
where id='justice-investigations-contested-narratives-fringe-claims-category-flat-earth';
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  name='QAnon',path='Society / Social movements / QAnon',
  path_parts=array['Society','Social movements','QAnon']::text[],depth=3
where id='justice-investigations-contested-narratives-qanon-movement-and-drops';
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  name='Great Replacement',path='Society / Demographics / Great Replacement',
  path_parts=array['Society','Demographics','Great Replacement']::text[],depth=3
where id='justice-investigations-contested-narratives-fringe-claims-category-great-replacement-theory-framing';
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  name='Kalergi Plan',path='Society / Demographics / Kalergi Plan',
  path_parts=array['Society','Demographics','Kalergi Plan']::text[],depth=3
where id='justice-investigations-contested-narratives-fringe-claims-category-kalergi-plan';
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  name='Project Lockstep',path='Society / Social sciences / Futures studies / Project Lockstep',
  path_parts=array['Society','Social sciences','Futures studies','Project Lockstep']::text[],depth=4
where id='justice-investigations-contested-narratives-fringe-claims-category-project-lockstep-claim';
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  name='Project Looking Glass',path='Society / Military and security / Project Looking Glass',
  path_parts=array['Society','Military and security','Project Looking Glass']::text[],depth=3
where id='justice-investigations-contested-narratives-fringe-claims-category-project-looking-glass-claim';
update atoms set realm_id='history',realm_name='History',realm_tags=array['History']::text[],
  name='Tartarian Empire',path='History / Historical states / Tartarian Empire',
  path_parts=array['History','Historical states','Tartarian Empire']::text[],depth=3
where id='justice-investigations-contested-narratives-fringe-claims-category-tartarian-empire-hypothesis';
-- 3 genuinely-ambiguous -> back to the deferred pile under Contested narratives
update atoms set realm_id='justice',realm_name='Justice',realm_tags=array['Justice']::text[],
  name='Pizzagate',path='Justice / Investigations / Contested narratives / Pizzagate',
  path_parts=array['Justice','Investigations','Contested narratives','Pizzagate']::text[],depth=4
where id='justice-investigations-contested-narratives-fringe-claims-category-pizzagate-claim-set';
update atoms set realm_id='justice',realm_name='Justice',realm_tags=array['Justice']::text[],
  name='Crisis actor',path='Justice / Investigations / Contested narratives / Crisis actor',
  path_parts=array['Justice','Investigations','Contested narratives','Crisis actor']::text[],depth=4
where id='justice-investigations-contested-narratives-fringe-claims-category-crisis-actor-allegations-general-pattern';
update atoms set realm_id='justice',realm_name='Justice',realm_tags=array['Justice']::text[],
  name='Project Blue Beam',path='Justice / Investigations / Contested narratives / Project Blue Beam',
  path_parts=array['Justice','Investigations','Contested narratives','Project Blue Beam']::text[],depth=4
where id='justice-investigations-contested-narratives-fringe-claims-category-project-blue-beam-claim';
-- delete the now-empty hub
delete from atoms where id='society-conspiracy-theories';

-- Concepts: dedup (already canonical in Philosophy) + place the rest
delete from atoms where id='justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-transhumanism-agenda-theological-framing';
delete from atoms where id='justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-scientism-as-religion-replacement';
delete from atoms where id='justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-usury-debt-as-control-mechanism';
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  name='Usury',path='Society / Economy and business / Usury',
  path_parts=array['Society','Economy and business','Usury']::text[],depth=3
where id='justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-usury';
update atoms set realm_id='health',realm_name='Health',realm_tags=array['Health']::text[],
  name='Disease X',path='Health / Public health / Disease X',
  path_parts=array['Health','Public health','Disease X']::text[],depth=3
where id='justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-disease-x-as-engineered-pandemic-preparation';
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  name='WEF Young Global Leaders',path='Society / Government / WEF Young Global Leaders',
  path_parts=array['Society','Government','WEF Young Global Leaders']::text[],depth=3
where id='justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-wef-young-global-leaders-as-influence-network';

-- Religious concepts -> Religion
delete from atoms where id='justice-investigations-contested-narratives-fringe-claims-category-nephilim-modern-giants';
update atoms set realm_id='religion',realm_name='Religion',realm_tags=array['Religion']::text[],
  name='Nephilim',path='Religion / Beings / Nephilim',
  path_parts=array['Religion','Beings','Nephilim']::text[],depth=3
where id='justice-investigations-contested-narratives-fringe-claims-category-nephilim';
update atoms set realm_id='religion',realm_name='Religion',realm_tags=array['Religion']::text[],
  name='Image of the Beast',path='Religion / Concepts / Image of the Beast',
  path_parts=array['Religion','Concepts','Image of the Beast']::text[],depth=3
where id='justice-investigations-contested-narratives-fringe-claims-category-image-of-the-beast';
update atoms set realm_id='religion',realm_name='Religion',realm_tags=array['Religion']::text[],
  name='Mark of the Beast',path='Religion / Concepts / Mark of the Beast',
  path_parts=array['Religion','Concepts','Mark of the Beast']::text[],depth=3
where id='justice-investigations-contested-narratives-fringe-claims-category-image-of-the-beast-mark-of-the-beast-transhumanist-application';

update realms r set atom_count=(select count(*) from atoms a where a.realm_id=r.id);
