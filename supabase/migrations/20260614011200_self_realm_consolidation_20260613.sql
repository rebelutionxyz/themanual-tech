-- APPLIED to prod 2026-06-13 via MCP. PARITY file.
-- =====================================================================
-- Self realm consolidation (Jun 13 2026)
-- Pointer policy: delete pointer stubs; keep + re-parent canonical.
-- APPLIED to prod via MCP. Code writes the matching parity file to repo.
-- =====================================================================

-- #3 Daily living (pointers): delete the 15 pointer children
delete from atoms
where realm_id='self' and path_parts[2]='Daily living (pointers)'
  and depth>2 and 'pointer'=any(theme_tags);

-- #3: move the 4 canonical -> Self / Life domains
update atoms set
  path='Self / Life domains / '||name,
  path_parts=array['Self','Life domains',name]::text[],
  depth=3
where realm_id='self' and path_parts[2]='Daily living (pointers)' and depth>2;

-- #3: delete the emptied (pointer) container
delete from atoms where id='self-daily-living-pointers';

-- #5 Person: who-am-I trio -> Self / The self
update atoms set
  path='Self / The self / '||name,
  path_parts=array['Self','The self',name]::text[],
  depth=3
where id in ('self-person-identity','self-person-individual','self-person-personal-identity');

-- #5: Character (personal) -> Self / Personality
update atoms set
  path='Self / Personality / '||name,
  path_parts=array['Self','Personality',name]::text[],
  depth=3
where id='self-person-character-personal';

-- #5: Human body is a pointer -> delete
delete from atoms where id='self-person-human-body';

-- #5: trivia -> Reference / Curiosities (repurpose the Curiosities node as the L2)
update atoms set
  realm_id='reference', realm_name='Reference', realm_tags=array['Reference']::text[],
  path='Reference / Curiosities',
  path_parts=array['Reference','Curiosities']::text[], depth=2
where id='self-person-curiosities';

update atoms set
  realm_id='reference', realm_name='Reference', realm_tags=array['Reference']::text[],
  path='Reference / Curiosities / '||name,
  path_parts=array['Reference','Curiosities',name]::text[], depth=3
where id in (
  'self-person-curiosities-bow-tie-wearers',
  'self-person-curiosities-selfie-related-injuries-and-deaths',
  'self-person-curiosities-unusual-deaths',
  'self-person-biography-concept',
  'self-person-eponyms',
  'self-person-eponymous-laws',
  'self-person-disappeared-mysteriously',
  'self-person-human'
);

-- #5: delete the emptied Person container
delete from atoms where id='self-person';

-- #1: Human ecology (canonical) -> Society / Social sciences (L3)
update atoms set
  realm_id='society', realm_name='Society', realm_tags=array['Society']::text[],
  path='Society / Social sciences / Human ecology',
  path_parts=array['Society','Social sciences','Human ecology']::text[], depth=3
where id='self-human-ecology';

-- #2: Spirituality is a pointer -> delete
delete from atoms where id='self-spirituality';

-- #4: Personal timelines -> Self / Life stages; retire the Lists container
update atoms set
  path='Self / Life stages / Personal timelines',
  path_parts=array['Self','Life stages','Personal timelines']::text[], depth=3
where id='self-lists-personal-timelines';

delete from atoms where id='self-lists';

-- Recompute realm atom_counts from truth
update realms r set atom_count = (select count(*) from atoms a where a.realm_id=r.id);
