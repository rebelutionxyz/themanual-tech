-- Lists Disposition · BATCH 1 of 4 · Container creation
-- Date: 2026-05-19
-- Authorized by: Butch · "Cadence: one checkpoint only" · ORDERS 2026-05-19
-- Scope: INSERT 114 missing intermediate parent containers for the 437 non-destructive moves.
-- Idempotency: ON CONFLICT (id) DO NOTHING — safe to re-run if interrupted.
-- Integrity: full structural check after the INSERT batch. If any check fails, the TX rolls back.

BEGIN;

-- ===== PRE-FLIGHT =====
DO $$
DECLARE
  total_atoms int;
  lists_atoms int;
  lists_refs int;
BEGIN
  SELECT count(*) INTO total_atoms FROM atoms;
  IF total_atoms <> 4897 THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAIL: expected 4897 atoms, found %', total_atoms;
  END IF;

  SELECT count(*) INTO lists_atoms FROM atoms WHERE 'Lists' = ANY(path_parts);
  IF lists_atoms <> 606 THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAIL: expected 606 Lists atoms, found %', lists_atoms;
  END IF;

  -- 0 references on any of the 606 source atoms (verified during planning)
  SELECT
    (SELECT count(*) FROM atom_kettle_votes v JOIN atoms a ON v.atom_id=a.id WHERE 'Lists' = ANY(a.path_parts)) +
    (SELECT count(*) FROM atom_sources v JOIN atoms a ON v.atom_id=a.id WHERE 'Lists' = ANY(a.path_parts)) +
    (SELECT count(*) FROM atom_comments v JOIN atoms a ON v.atom_id=a.id WHERE 'Lists' = ANY(a.path_parts)) +
    (SELECT count(*) FROM entity_atom_links v JOIN atoms a ON v.atom_id=a.id WHERE 'Lists' = ANY(a.path_parts)) +
    (SELECT count(*) FROM promotions v JOIN atoms a ON v.atom_id=a.id WHERE 'Lists' = ANY(a.path_parts))
  INTO lists_refs;
  IF lists_refs <> 0 THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAIL: expected 0 referencing rows on Lists atoms, found %. Investigate before proceeding.', lists_refs;
  END IF;

  RAISE NOTICE 'PRE-FLIGHT OK: 4897 atoms, 606 Lists atoms, 0 FK refs on Lists atoms.';
END$$;

-- ===== INSERT 114 missing intermediate containers =====
INSERT INTO atoms (id, name, path, path_parts, realm_id, realm_name, depth, type, kettle, is_leaf, theme_tags, realm_tags, pillar_tags, skin_tags, meta, created_at, updated_at) VALUES
  ('culture-games-tabletop-games', 'Tabletop games', 'Culture / Games / Tabletop games', ARRAY['Culture','Games','Tabletop games']::text[], 'culture', 'Culture', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-gastronomy-materials', 'Materials', 'Culture / Gastronomy / Materials', ARRAY['Culture','Gastronomy','Materials']::text[], 'culture', 'Culture', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-literature-books', 'Books', 'Culture / Literature / Books', ARRAY['Culture','Literature','Books']::text[], 'culture', 'Culture', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-literature-electronic-literature', 'Electronic literature', 'Culture / Literature / Electronic literature', ARRAY['Culture','Literature','Electronic literature']::text[], 'culture', 'Culture', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-literature-fiction-comics', 'Comics', 'Culture / Literature / Fiction / Comics', ARRAY['Culture','Literature','Fiction','Comics']::text[], 'culture', 'Culture', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-literature-fiction-comics-comic-books', 'Comic books', 'Culture / Literature / Fiction / Comics / Comic books', ARRAY['Culture','Literature','Fiction','Comics','Comic books']::text[], 'culture', 'Culture', 5, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-literature-fiction-comics-comic-books-dc-comics', 'DC Comics', 'Culture / Literature / Fiction / Comics / Comic books / DC Comics', ARRAY['Culture','Literature','Fiction','Comics','Comic books','DC Comics']::text[], 'culture', 'Culture', 6, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-literature-fiction-comics-comic-books-dc-comics-justice-league', 'Justice League', 'Culture / Literature / Fiction / Comics / Comic books / DC Comics / Justice League', ARRAY['Culture','Literature','Fiction','Comics','Comic books','DC Comics','Justice League']::text[], 'culture', 'Culture', 7, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-literature-fiction-comics-comic-books-dc-comics-legion-of-super-heroes', 'Legion of Super-Heroes', 'Culture / Literature / Fiction / Comics / Comic books / DC Comics / Legion of Super-Heroes', ARRAY['Culture','Literature','Fiction','Comics','Comic books','DC Comics','Legion of Super-Heroes']::text[], 'culture', 'Culture', 7, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-literature-fiction-comics-comic-books-dc-comics-superman', 'Superman', 'Culture / Literature / Fiction / Comics / Comic books / DC Comics / Superman', ARRAY['Culture','Literature','Fiction','Comics','Comic books','DC Comics','Superman']::text[], 'culture', 'Culture', 7, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-literature-fiction-comics-comic-books-marvel-comics', 'Marvel Comics', 'Culture / Literature / Fiction / Comics / Comic books / Marvel Comics', ARRAY['Culture','Literature','Fiction','Comics','Comic books','Marvel Comics']::text[], 'culture', 'Culture', 6, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-literature-fiction-comics-manga', 'Manga', 'Culture / Literature / Fiction / Comics / Manga', ARRAY['Culture','Literature','Fiction','Comics','Manga']::text[], 'culture', 'Culture', 5, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-literature-fiction-fictional-places', 'Fictional places', 'Culture / Literature / Fiction / Fictional places', ARRAY['Culture','Literature','Fiction','Fictional places']::text[], 'culture', 'Culture', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-literature-fiction-genres', 'Genres', 'Culture / Literature / Fiction / Genres', ARRAY['Culture','Literature','Fiction','Genres']::text[], 'culture', 'Culture', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-literature-fiction-major-themes', 'Major themes', 'Culture / Literature / Fiction / Major themes', ARRAY['Culture','Literature','Fiction','Major themes']::text[], 'culture', 'Culture', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-literature-fictional-characters', 'Fictional characters', 'Culture / Literature / Fictional characters', ARRAY['Culture','Literature','Fictional characters']::text[], 'culture', 'Culture', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-mass-media-broadcast-media-television-programs', 'Programs', 'Culture / Mass media / Broadcast media / Television / Programs', ARRAY['Culture','Mass media','Broadcast media','Television','Programs']::text[], 'culture', 'Culture', 5, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-mass-media-broadcast-media-television-stations', 'Stations', 'Culture / Mass media / Broadcast media / Television / Stations', ARRAY['Culture','Mass media','Broadcast media','Television','Stations']::text[], 'culture', 'Culture', 5, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-mass-media-film-and-cinema-films', 'Films', 'Culture / Mass media / Film and cinema / Films', ARRAY['Culture','Mass media','Film and cinema','Films']::text[], 'culture', 'Culture', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-mass-media-film-and-cinema-religious-portrayals', 'Religious portrayals', 'Culture / Mass media / Film and cinema / Religious portrayals', ARRAY['Culture','Mass media','Film and cinema','Religious portrayals']::text[], 'culture', 'Culture', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-mass-media-print-media-magazines', 'Magazines', 'Culture / Mass media / Print media / Magazines', ARRAY['Culture','Mass media','Print media','Magazines']::text[], 'culture', 'Culture', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-performing-arts-music-electronic-music', 'Electronic music', 'Culture / Performing arts / Music / Electronic music', ARRAY['Culture','Performing arts','Music','Electronic music']::text[], 'culture', 'Culture', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-performing-arts-music-musicians-and-groups', 'Musicians and groups', 'Culture / Performing arts / Music / Musicians and groups', ARRAY['Culture','Performing arts','Music','Musicians and groups']::text[], 'culture', 'Culture', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-performing-arts-music-musicians-and-groups-bands', 'Bands', 'Culture / Performing arts / Music / Musicians and groups / Bands', ARRAY['Culture','Performing arts','Music','Musicians and groups','Bands']::text[], 'culture', 'Culture', 5, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-performing-arts-music-musicians-and-groups-composers', 'Composers', 'Culture / Performing arts / Music / Musicians and groups / Composers', ARRAY['Culture','Performing arts','Music','Musicians and groups','Composers']::text[], 'culture', 'Culture', 5, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-performing-arts-music-musicians-and-groups-musicians', 'Musicians', 'Culture / Performing arts / Music / Musicians and groups / Musicians', ARRAY['Culture','Performing arts','Music','Musicians and groups','Musicians']::text[], 'culture', 'Culture', 5, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-performing-arts-music-songs-and-compositions', 'Songs and compositions', 'Culture / Performing arts / Music / Songs and compositions', ARRAY['Culture','Performing arts','Music','Songs and compositions']::text[], 'culture', 'Culture', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-performing-arts-music-songs-and-compositions-by-composer', 'By composer', 'Culture / Performing arts / Music / Songs and compositions / By composer', ARRAY['Culture','Performing arts','Music','Songs and compositions','By composer']::text[], 'culture', 'Culture', 5, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-performing-arts-music-video-game-music', 'Video game music', 'Culture / Performing arts / Music / Video game music', ARRAY['Culture','Performing arts','Music','Video game music']::text[], 'culture', 'Culture', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-sports-ball-games-association-football-clubs', 'Clubs', 'Culture / Sports / Ball games / Association football / Clubs', ARRAY['Culture','Sports','Ball games','Association football','Clubs']::text[], 'culture', 'Culture', 5, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-sports-ball-games-association-football-national-teams', 'National teams', 'Culture / Sports / Ball games / Association football / National teams', ARRAY['Culture','Sports','Ball games','Association football','National teams']::text[], 'culture', 'Culture', 5, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-sports-ball-games-baseball-awards', 'Awards', 'Culture / Sports / Ball games / Baseball / Awards', ARRAY['Culture','Sports','Ball games','Baseball','Awards']::text[], 'culture', 'Culture', 5, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-sports-ball-games-baseball-awards-al-gold-glove-winners', 'AL Gold Glove Winners', 'Culture / Sports / Ball games / Baseball / Awards / AL Gold Glove Winners', ARRAY['Culture','Sports','Ball games','Baseball','Awards','AL Gold Glove Winners']::text[], 'culture', 'Culture', 6, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-sports-ball-games-baseball-awards-nl-gold-glove-winners', 'NL Gold Glove Winners', 'Culture / Sports / Ball games / Baseball / Awards / NL Gold Glove Winners', ARRAY['Culture','Sports','Ball games','Baseball','Awards','NL Gold Glove Winners']::text[], 'culture', 'Culture', 6, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-sports-combat-sports-martial-arts-judo', 'Judo', 'Culture / Sports / Combat sports / Martial arts / Judo', ARRAY['Culture','Sports','Combat sports','Martial arts','Judo']::text[], 'culture', 'Culture', 5, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-sports-cycling', 'Cycling', 'Culture / Sports / Cycling', ARRAY['Culture','Sports','Cycling']::text[], 'culture', 'Culture', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-sports-notable-athletes', 'Notable athletes', 'Culture / Sports / Notable athletes', ARRAY['Culture','Sports','Notable athletes']::text[], 'culture', 'Culture', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-sports-sports-leagues', 'Sports leagues', 'Culture / Sports / Sports leagues', ARRAY['Culture','Sports','Sports leagues']::text[], 'culture', 'Culture', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-sports-winter-sports', 'Winter sports', 'Culture / Sports / Winter sports', ARRAY['Culture','Sports','Winter sports']::text[], 'culture', 'Culture', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('culture-sports-winter-sports-skiing', 'Skiing', 'Culture / Sports / Winter sports / Skiing', ARRAY['Culture','Sports','Winter sports','Skiing']::text[], 'culture', 'Culture', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('health-substances-psychiatric-drugs', 'Psychiatric drugs', 'Health / Substances / Psychiatric drugs', ARRAY['Health','Substances','Psychiatric drugs']::text[], 'health', 'Health', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('history-ancient-civilizations-roman', 'Roman', 'History / Ancient civilizations / Roman', ARRAY['History','Ancient civilizations','Roman']::text[], 'history', 'History', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('history-ancient-civilizations-roman-britain', 'Britain', 'History / Ancient civilizations / Roman / Britain', ARRAY['History','Ancient civilizations','Roman','Britain']::text[], 'history', 'History', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('history-historians', 'Historians', 'History / Historians', ARRAY['History','Historians']::text[], 'history', 'History', 2, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('history-historical-events-disasters', 'Disasters', 'History / Historical events / Disasters', ARRAY['History','Historical events','Disasters']::text[], 'history', 'History', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('history-historical-events-english-reformation', 'English Reformation', 'History / Historical events / English Reformation', ARRAY['History','Historical events','English Reformation']::text[], 'history', 'History', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('history-historical-events-natural-disasters', 'Natural disasters', 'History / Historical events / Natural disasters', ARRAY['History','Historical events','Natural disasters']::text[], 'history', 'History', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('math-branches-of-mathematics-pure-mathematics', 'Pure mathematics', 'Math / Branches of mathematics / Pure mathematics', ARRAY['Math','Branches of mathematics','Pure mathematics']::text[], 'math', 'Math', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('religion-concepts-sacred-architecture', 'Sacred architecture', 'Religion / Concepts / Sacred architecture', ARRAY['Religion','Concepts','Sacred architecture']::text[], 'religion', 'Religion', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('religion-major-religions-christianity', 'Christianity', 'Religion / Major religions / Christianity', ARRAY['Religion','Major religions','Christianity']::text[], 'religion', 'Religion', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('religion-religious-roles-patriarchs', 'Patriarchs', 'Religion / Religious roles / Patriarchs', ARRAY['Religion','Religious roles','Patriarchs']::text[], 'religion', 'Religion', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('religion-sacred-texts-bible', 'Bible', 'Religion / Sacred texts / Bible', ARRAY['Religion','Sacred texts','Bible']::text[], 'religion', 'Religion', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('science-astronomy-and-space-science-space-exploration', 'Space exploration', 'Science / Astronomy and space science / Space exploration', ARRAY['Science','Astronomy and space science','Space exploration']::text[], 'science', 'Science', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('science-biology-botany', 'Botany', 'Science / Biology / Botany', ARRAY['Science','Biology','Botany']::text[], 'science', 'Science', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('science-biology-botany-plant-pathology', 'Plant pathology', 'Science / Biology / Botany / Plant pathology', ARRAY['Science','Biology','Botany','Plant pathology']::text[], 'science', 'Science', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('science-biology-botany-species', 'Species', 'Science / Biology / Botany / Species', ARRAY['Science','Biology','Botany','Species']::text[], 'science', 'Science', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('science-biology-conservation', 'Conservation', 'Science / Biology / Conservation', ARRAY['Science','Biology','Conservation']::text[], 'science', 'Science', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('science-biology-ecology', 'Ecology', 'Science / Biology / Ecology', ARRAY['Science','Biology','Ecology']::text[], 'science', 'Science', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('science-biology-ethology', 'Ethology', 'Science / Biology / Ethology', ARRAY['Science','Biology','Ethology']::text[], 'science', 'Science', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('science-biology-genetics', 'Genetics', 'Science / Biology / Genetics', ARRAY['Science','Biology','Genetics']::text[], 'science', 'Science', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('science-biology-taxonomy', 'Taxonomy', 'Science / Biology / Taxonomy', ARRAY['Science','Biology','Taxonomy']::text[], 'science', 'Science', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('science-biology-zoology', 'Zoology', 'Science / Biology / Zoology', ARRAY['Science','Biology','Zoology']::text[], 'science', 'Science', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('science-biology-zoology-birds', 'Birds', 'Science / Biology / Zoology / Birds', ARRAY['Science','Biology','Zoology','Birds']::text[], 'science', 'Science', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('science-biology-zoology-fish', 'Fish', 'Science / Biology / Zoology / Fish', ARRAY['Science','Biology','Zoology','Fish']::text[], 'science', 'Science', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('science-biology-zoology-fish-by-region', 'By region', 'Science / Biology / Zoology / Fish / By region', ARRAY['Science','Biology','Zoology','Fish','By region']::text[], 'science', 'Science', 5, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('science-biology-zoology-insects', 'Insects', 'Science / Biology / Zoology / Insects', ARRAY['Science','Biology','Zoology','Insects']::text[], 'science', 'Science', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('science-biology-zoology-insects-by-region', 'By region', 'Science / Biology / Zoology / Insects / By region', ARRAY['Science','Biology','Zoology','Insects','By region']::text[], 'science', 'Science', 5, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('science-biology-zoology-mammals', 'Mammals', 'Science / Biology / Zoology / Mammals', ARRAY['Science','Biology','Zoology','Mammals']::text[], 'science', 'Science', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('science-biology-zoology-paleontology', 'Paleontology', 'Science / Biology / Zoology / Paleontology', ARRAY['Science','Biology','Zoology','Paleontology']::text[], 'science', 'Science', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('science-chemistry-biochemistry', 'Biochemistry', 'Science / Chemistry / Biochemistry', ARRAY['Science','Chemistry','Biochemistry']::text[], 'science', 'Science', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('science-chemistry-electrochemistry', 'Electrochemistry', 'Science / Chemistry / Electrochemistry', ARRAY['Science','Chemistry','Electrochemistry']::text[], 'science', 'Science', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('science-chemistry-elements', 'Elements', 'Science / Chemistry / Elements', ARRAY['Science','Chemistry','Elements']::text[], 'science', 'Science', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('science-chemistry-elements-isotopes', 'Isotopes', 'Science / Chemistry / Elements / Isotopes', ARRAY['Science','Chemistry','Elements','Isotopes']::text[], 'science', 'Science', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('science-chemistry-organic-chemistry', 'Organic chemistry', 'Science / Chemistry / Organic chemistry', ARRAY['Science','Chemistry','Organic chemistry']::text[], 'science', 'Science', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('science-chemistry-thermodynamics', 'Thermodynamics', 'Science / Chemistry / Thermodynamics', ARRAY['Science','Chemistry','Thermodynamics']::text[], 'science', 'Science', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('science-physics-electromagnetism', 'Electromagnetism', 'Science / Physics / Electromagnetism', ARRAY['Science','Physics','Electromagnetism']::text[], 'science', 'Science', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('science-physics-nuclear-physics', 'Nuclear physics', 'Science / Physics / Nuclear physics', ARRAY['Science','Physics','Nuclear physics']::text[], 'science', 'Science', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('science-physics-particle-physics', 'Particle physics', 'Science / Physics / Particle physics', ARRAY['Science','Physics','Particle physics']::text[], 'science', 'Science', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('science-physics-quantum-field-theory', 'Quantum field theory', 'Science / Physics / Quantum field theory', ARRAY['Science','Physics','Quantum field theory']::text[], 'science', 'Science', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('science-physics-relativity', 'Relativity', 'Science / Physics / Relativity', ARRAY['Science','Physics','Relativity']::text[], 'science', 'Science', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('society-economy-and-business-companies', 'Companies', 'Society / Economy and business / Companies', ARRAY['Society','Economy and business','Companies']::text[], 'society', 'Society', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('society-economy-and-business-economists', 'Economists', 'Society / Economy and business / Economists', ARRAY['Society','Economy and business','Economists']::text[], 'society', 'Society', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('society-economy-and-business-finance-european-sovereign-debt-crisis', 'European sovereign-debt crisis', 'Society / Economy and business / Finance / European sovereign-debt crisis', ARRAY['Society','Economy and business','Finance','European sovereign-debt crisis']::text[], 'society', 'Society', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('society-economy-and-business-retail', 'Retail', 'Society / Economy and business / Retail', ARRAY['Society','Economy and business','Retail']::text[], 'society', 'Society', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('society-government-foreign-policy', 'Foreign policy', 'Society / Government / Foreign policy', ARRAY['Society','Government','Foreign policy']::text[], 'society', 'Society', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('society-government-international-organizations', 'International organizations', 'Society / Government / International organizations', ARRAY['Society','Government','International organizations']::text[], 'society', 'Society', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('society-government-international-organizations-categories-un', 'UN', 'Society / Government / International organizations (categories) / UN', ARRAY['Society','Government','International organizations (categories)','UN']::text[], 'society', 'Society', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('society-government-international-organizations-un', 'UN', 'Society / Government / International organizations / UN', ARRAY['Society','Government','International organizations','UN']::text[], 'society', 'Society', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('society-government-national-symbols', 'National symbols', 'Society / Government / National symbols', ARRAY['Society','Government','National symbols']::text[], 'society', 'Society', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('society-government-united-states', 'United States', 'Society / Government / United States', ARRAY['Society','Government','United States']::text[], 'society', 'Society', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('society-government-united-states-congress', 'Congress', 'Society / Government / United States / Congress', ARRAY['Society','Government','United States','Congress']::text[], 'society', 'Society', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('society-linguistics-phonetics', 'Phonetics', 'Society / Linguistics / Phonetics', ARRAY['Society','Linguistics','Phonetics']::text[], 'society', 'Society', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('society-politics-political-parties', 'Political parties', 'Society / Politics / Political parties', ARRAY['Society','Politics','Political parties']::text[], 'society', 'Society', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('society-social-institutions-professional-bodies', 'Professional bodies', 'Society / Social institutions / Professional bodies', ARRAY['Society','Social institutions','Professional bodies']::text[], 'society', 'Society', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('society-social-movements-lgbt', 'LGBT', 'Society / Social movements / LGBT', ARRAY['Society','Social movements','LGBT']::text[], 'society', 'Society', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('society-social-movements-labor', 'Labor', 'Society / Social movements / Labor', ARRAY['Society','Social movements','Labor']::text[], 'society', 'Society', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('society-social-movements-suffragists', 'Suffragists', 'Society / Social movements / Suffragists', ARRAY['Society','Social movements','Suffragists']::text[], 'society', 'Society', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('society-social-movements-women', 'Women', 'Society / Social movements / Women', ARRAY['Society','Social movements','Women']::text[], 'society', 'Society', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('society-social-sciences-psychology', 'Psychology', 'Society / Social sciences / Psychology', ARRAY['Society','Social sciences','Psychology']::text[], 'society', 'Society', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('tech-computing-character-encoding', 'Character encoding', 'Tech / Computing / Character encoding', ARRAY['Tech','Computing','Character encoding']::text[], 'tech', 'Tech', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('tech-computing-file-formats', 'File formats', 'Tech / Computing / File formats', ARRAY['Tech','Computing','File formats']::text[], 'tech', 'Tech', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('tech-computing-software-accessibility', 'Accessibility', 'Tech / Computing / Software / Accessibility', ARRAY['Tech','Computing','Software','Accessibility']::text[], 'tech', 'Tech', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('tech-computing-software-software-engineering', 'Software engineering', 'Tech / Computing / Software / Software engineering', ARRAY['Tech','Computing','Software','Software engineering']::text[], 'tech', 'Tech', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('tech-computing-software-web-development', 'Web development', 'Tech / Computing / Software / Web development', ARRAY['Tech','Computing','Software','Web development']::text[], 'tech', 'Tech', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('tech-construction-and-built-environment-civil-engineering', 'Civil engineering', 'Tech / Construction and built environment / Civil engineering', ARRAY['Tech','Construction and built environment','Civil engineering']::text[], 'tech', 'Tech', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('tech-construction-and-built-environment-civil-engineering-bridges', 'Bridges', 'Tech / Construction and built environment / Civil engineering / Bridges', ARRAY['Tech','Construction and built environment','Civil engineering','Bridges']::text[], 'tech', 'Tech', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('tech-construction-and-built-environment-civil-engineering-tunnels', 'Tunnels', 'Tech / Construction and built environment / Civil engineering / Tunnels', ARRAY['Tech','Construction and built environment','Civil engineering','Tunnels']::text[], 'tech', 'Tech', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('tech-construction-and-built-environment-heritage-registers', 'Heritage registers', 'Tech / Construction and built environment / Heritage registers', ARRAY['Tech','Construction and built environment','Heritage registers']::text[], 'tech', 'Tech', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('tech-internet-and-web-protocols', 'Protocols', 'Tech / Internet and Web / Protocols', ARRAY['Tech','Internet and Web','Protocols']::text[], 'tech', 'Tech', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('tech-internet-and-web-protocols-http', 'HTTP', 'Tech / Internet and Web / Protocols / HTTP', ARRAY['Tech','Internet and Web','Protocols','HTTP']::text[], 'tech', 'Tech', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('tech-transport-technology-aircraft', 'Aircraft', 'Tech / Transport technology / Aircraft', ARRAY['Tech','Transport technology','Aircraft']::text[], 'tech', 'Tech', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('tech-transport-technology-aircraft-airports', 'Airports', 'Tech / Transport technology / Aircraft / Airports', ARRAY['Tech','Transport technology','Aircraft','Airports']::text[], 'tech', 'Tech', 4, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('tech-transport-technology-maritime', 'Maritime', 'Tech / Transport technology / Maritime', ARRAY['Tech','Transport technology','Maritime']::text[], 'tech', 'Tech', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now()),
  ('tech-transport-technology-rail-transport', 'Rail transport', 'Tech / Transport technology / Rail transport', ARRAY['Tech','Transport technology','Rail transport']::text[], 'tech', 'Tech', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now())
ON CONFLICT (id) DO NOTHING;

-- ===== POST-BATCH INTEGRITY CHECK =====
DO $$
DECLARE
  new_total int;
  delta int;
  leaf_with_children int;
  depth_mismatch int;
  skipped_level int;
  dup_id int;
BEGIN
  SELECT count(*) INTO new_total FROM atoms;
  delta := new_total - 4897;
  IF delta <> 114 THEN
    RAISE EXCEPTION 'BATCH-1 FAIL: row delta expected +114, found %', delta;
  END IF;

  -- 0 leaf-with-children: no atom flagged is_leaf=true while having a deeper child
  SELECT count(*) INTO leaf_with_children FROM atoms p
  WHERE p.is_leaf = true AND EXISTS (
    SELECT 1 FROM atoms c
    WHERE c.depth > p.depth
      AND c.path_parts[1:p.depth] = p.path_parts
  );
  IF leaf_with_children <> 0 THEN
    RAISE EXCEPTION 'BATCH-1 FAIL: leaf-with-children = %', leaf_with_children;
  END IF;

  -- 0 depth mismatch
  SELECT count(*) INTO depth_mismatch FROM atoms WHERE depth <> array_length(path_parts, 1);
  IF depth_mismatch <> 0 THEN
    RAISE EXCEPTION 'BATCH-1 FAIL: depth-mismatch = %', depth_mismatch;
  END IF;

  -- 0 skipped-level: every atom at depth N>1 has a parent at depth N-1 with matching prefix
  SELECT count(*) INTO skipped_level FROM atoms a
  WHERE a.depth > 1 AND NOT EXISTS (
    SELECT 1 FROM atoms p
    WHERE p.path = array_to_string(a.path_parts[1:a.depth-1], ' / ')
  );
  IF skipped_level <> 0 THEN
    RAISE EXCEPTION 'BATCH-1 FAIL: skipped-level = %', skipped_level;
  END IF;

  -- 0 dup id (structurally guaranteed by PK but verify)
  SELECT count(*) INTO dup_id FROM (SELECT id FROM atoms GROUP BY id HAVING count(*) > 1) x;
  IF dup_id <> 0 THEN
    RAISE EXCEPTION 'BATCH-1 FAIL: dup-id = %', dup_id;
  END IF;

  RAISE NOTICE 'BATCH-1 OK: +% rows · 0 leaf-with-children · 0 depth-mismatch · 0 skipped-level · 0 dup-id', delta;
END$$;

COMMIT;
-- BATCH 1 report: +114 atoms · structural integrity preserved.
