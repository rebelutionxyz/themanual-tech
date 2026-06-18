-- Justice / Contested narratives — category (1): extract real-policy atoms,
-- strip conspiracy framing, re-home to canonical realms. Clean leaves only.
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  name='Central bank digital currency', path='Society / Economy and business / Central bank digital currency',
  path_parts=array['Society','Economy and business','Central bank digital currency']::text[], depth=3
where id='justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-cbdc-as-financial-control-mechanism';
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  name='Carbon credit', path='Society / Economy and business / Carbon credit',
  path_parts=array['Society','Economy and business','Carbon credit']::text[], depth=3
where id='justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-carbon-credit-system-as-control-mechanism';
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  name='Universal basic income', path='Society / Economy and business / Universal basic income',
  path_parts=array['Society','Economy and business','Universal basic income']::text[], depth=3
where id='justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-universal-basic-income-as-control-hook';
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  name='15-minute city', path='Society / Urban planning / 15-minute city',
  path_parts=array['Society','Urban planning','15-minute city']::text[], depth=3
where id='justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-15-minute-city-as-soft-confinement';
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  name='Smart city', path='Society / Urban planning / Smart city',
  path_parts=array['Society','Urban planning','Smart city']::text[], depth=3
where id='justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-smart-city-as-surveillance-grid';
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  name='Social credit system', path='Society / Government / Social credit system',
  path_parts=array['Society','Government','Social credit system']::text[], depth=3
where id='justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-social-credit-system-as-behavior-control';
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  name='Martial law', path='Society / Government / Martial law',
  path_parts=array['Society','Government','Martial law']::text[], depth=3
where id='justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-martial-law-as-activation-pathway';
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  name='UN Agenda 2030', path='Society / Government / UN Agenda 2030',
  path_parts=array['Society','Government','UN Agenda 2030']::text[], depth=3
where id='justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-un-agenda-2030-as-global-control-plan';
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  name='Agenda 21', path='Society / Government / Agenda 21',
  path_parts=array['Society','Government','Agenda 21']::text[], depth=3
where id='justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-un-agenda-21-as-sovereignty-erosion';
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  name='Surveillance state', path='Society / Politics / Surveillance state',
  path_parts=array['Society','Politics','Surveillance state']::text[], depth=3
where id='justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-surveillance-state-expansion';
update atoms set realm_id='society',realm_name='Society',realm_tags=array['Society']::text[],
  name='Regime change', path='Society / Politics / Regime change',
  path_parts=array['Society','Politics','Regime change']::text[], depth=3
where id='justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-regime-change-as-systemic-policy';
update atoms set realm_id='health',realm_name='Health',realm_tags=array['Health']::text[],
  name='Vaccine passport', path='Health / Public health / Vaccine passport',
  path_parts=array['Health','Public health','Vaccine passport']::text[], depth=3
where id='justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-vaccine-passports-as-control-infrastructure';
update atoms set realm_id='science',realm_name='Science',realm_tags=array['Science']::text[],
  name='Weather modification', path='Science / Earth science / Weather modification',
  path_parts=array['Science','Earth science','Weather modification']::text[], depth=3
where id='justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-weather-modification-as-weapon';
-- Technocracy already canonical (Society/Government/Government types) -> delete framed dup
delete from atoms
where id='justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-technocracy-as-governance-model';
-- recompute affected realm counts
update realms r set atom_count=(select count(*) from atoms a where a.realm_id=r.id)
where r.id in ('justice','society','health','science');
