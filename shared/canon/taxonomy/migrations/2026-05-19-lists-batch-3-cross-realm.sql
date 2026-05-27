-- Lists Disposition · BATCH 3 · CROSS_REALM (35 atoms)
-- Date: 2026-05-19

-- ===== PRE-FLIGHT =====
DO $$
DECLARE total_atoms int; expected_sources int;
BEGIN
  SELECT count(*) INTO total_atoms FROM atoms;
  IF total_atoms <> 5011 THEN
    RAISE EXCEPTION 'BATCH-3 PRE-FLIGHT FAIL: expected 5011 atoms, found %', total_atoms;
  END IF;

  SELECT count(*) INTO expected_sources FROM atoms WHERE id IN ('culture-literature-lists-scientific-journals','history-lists-foreign-policy-doctrines','history-lists-musical-events-historical','history-lists-scientific-discoveries','history-lists-space-shuttle-missions','history-lists-strikes','history-lists-tariffs','history-lists-un-peacekeeping-missions','history-lists-united-states-supreme-court-cases','human-activities-lists-battles-by-casualties','human-activities-lists-environmental-disasters-list','human-activities-lists-greenhouse-gas-emissions-top-contributors','human-activities-lists-greenhouse-gases-ipcc-list','human-activities-lists-methods-of-capital-punishment','human-activities-lists-mudras','human-activities-lists-wars-by-death-toll','religion-lists-dramatic-portrayals-of-jesus-christ','religion-lists-monasteries-dissolved-by-henry-viii','science-lists-causes-of-death','science-lists-earth-sciences-lists-birthstones','self-lists-association-footballer-playing-deaths','self-lists-cyclist-race-deaths','self-lists-entertainer-deaths-while-performing','self-lists-political-self-immolations','self-lists-terms-for-men','society-lists-diagnostic-classification-and-rating-scales','society-lists-emoticons','society-lists-fictional-psychiatrists','society-lists-youth-rights-list','tech-lists-landings-on-extraterrestrial-bodies','tech-lists-military-weapons-list','tech-lists-solar-system-probes','tech-lists-terrorist-groups','tech-lists-terrorist-incidents','tech-lists-wwii-weapons');
  IF expected_sources <> 35 THEN
    RAISE EXCEPTION 'BATCH-3 PRE-FLIGHT FAIL: expected 35 source atoms, found %', expected_sources;
  END IF;

  RAISE NOTICE 'BATCH-3 PRE-FLIGHT OK';
END$$;

-- ===== UPDATES =====
UPDATE atoms SET id='science-scientific-method-and-meta-science-scientific-journals', name='Scientific journals', path='Science / Scientific method and meta-science / Scientific journals', path_parts=ARRAY['Science','Scientific method and meta-science','Scientific journals']::text[], depth=3, realm_id='science', realm_name='Science', updated_at=now() WHERE id='culture-literature-lists-scientific-journals';
UPDATE atoms SET id='society-government-foreign-policy-doctrines', name='Doctrines', path='Society / Government / Foreign policy / Doctrines', path_parts=ARRAY['Society','Government','Foreign policy','Doctrines']::text[], depth=4, realm_id='society', realm_name='Society', updated_at=now() WHERE id='history-lists-foreign-policy-doctrines';
UPDATE atoms SET id='culture-performing-arts-music-historical-musical-events', name='Historical musical events', path='Culture / Performing arts / Music / Historical musical events', path_parts=ARRAY['Culture','Performing arts','Music','Historical musical events']::text[], depth=4, realm_id='culture', realm_name='Culture', updated_at=now() WHERE id='history-lists-musical-events-historical';
UPDATE atoms SET id='science-scientific-method-and-meta-science-history-of-science-scientific-discoveries', name='Scientific discoveries', path='Science / Scientific method and meta-science / History of science / Scientific discoveries', path_parts=ARRAY['Science','Scientific method and meta-science','History of science','Scientific discoveries']::text[], depth=4, realm_id='science', realm_name='Science', updated_at=now() WHERE id='history-lists-scientific-discoveries';
UPDATE atoms SET id='science-astronomy-and-space-science-space-exploration-space-shuttle-missions', name='Space Shuttle missions', path='Science / Astronomy and space science / Space exploration / Space Shuttle missions', path_parts=ARRAY['Science','Astronomy and space science','Space exploration','Space Shuttle missions']::text[], depth=4, realm_id='science', realm_name='Science', updated_at=now() WHERE id='history-lists-space-shuttle-missions';
UPDATE atoms SET id='society-social-movements-strikes', name='Strikes', path='Society / Social movements / Strikes', path_parts=ARRAY['Society','Social movements','Strikes']::text[], depth=3, realm_id='society', realm_name='Society', updated_at=now() WHERE id='history-lists-strikes';
UPDATE atoms SET id='society-economy-and-business-tariffs', name='Tariffs', path='Society / Economy and business / Tariffs', path_parts=ARRAY['Society','Economy and business','Tariffs']::text[], depth=3, realm_id='society', realm_name='Society', updated_at=now() WHERE id='history-lists-tariffs';
UPDATE atoms SET id='society-government-international-organizations-categories-un-peacekeeping-missions', name='Peacekeeping missions', path='Society / Government / International organizations (categories) / UN / Peacekeeping missions', path_parts=ARRAY['Society','Government','International organizations (categories)','UN','Peacekeeping missions']::text[], depth=5, realm_id='society', realm_name='Society', updated_at=now() WHERE id='history-lists-un-peacekeeping-missions';
UPDATE atoms SET id='society-law-united-states-supreme-court-cases', name='United States Supreme Court cases', path='Society / Law / United States Supreme Court cases', path_parts=ARRAY['Society','Law','United States Supreme Court cases']::text[], depth=3, realm_id='society', realm_name='Society', updated_at=now() WHERE id='history-lists-united-states-supreme-court-cases';
UPDATE atoms SET id='history-military-history-battles-by-casualties', name='Battles by casualties', path='History / Military history / Battles by casualties', path_parts=ARRAY['History','Military history','Battles by casualties']::text[], depth=3, realm_id='history', realm_name='History', updated_at=now() WHERE id='human-activities-lists-battles-by-casualties';
UPDATE atoms SET id='history-historical-events-environmental-disasters', name='Environmental disasters', path='History / Historical events / Environmental disasters', path_parts=ARRAY['History','Historical events','Environmental disasters']::text[], depth=3, realm_id='history', realm_name='History', updated_at=now() WHERE id='human-activities-lists-environmental-disasters-list';
UPDATE atoms SET id='science-earth-science-climate-science-greenhouse-gas-emissions-top-contributors', name='Greenhouse gas emissions, top contributors', path='Science / Earth science / Climate science / Greenhouse gas emissions, top contributors', path_parts=ARRAY['Science','Earth science','Climate science','Greenhouse gas emissions, top contributors']::text[], depth=4, realm_id='science', realm_name='Science', updated_at=now() WHERE id='human-activities-lists-greenhouse-gas-emissions-top-contributors';
UPDATE atoms SET id='science-earth-science-climate-science-greenhouse-gases-ipcc-list', name='Greenhouse gases (IPCC list)', path='Science / Earth science / Climate science / Greenhouse gases (IPCC list)', path_parts=ARRAY['Science','Earth science','Climate science','Greenhouse gases (IPCC list)']::text[], depth=4, realm_id='science', realm_name='Science', updated_at=now() WHERE id='human-activities-lists-greenhouse-gases-ipcc-list';
UPDATE atoms SET id='justice-prosecutions-methods-of-capital-punishment', name='Methods of capital punishment', path='Justice / Prosecutions / Methods of capital punishment', path_parts=ARRAY['Justice','Prosecutions','Methods of capital punishment']::text[], depth=3, realm_id='justice', realm_name='Justice', updated_at=now() WHERE id='human-activities-lists-methods-of-capital-punishment';
UPDATE atoms SET id='religion-concepts-mudras', name='Mudras', path='Religion / Concepts / Mudras', path_parts=ARRAY['Religion','Concepts','Mudras']::text[], depth=3, realm_id='religion', realm_name='Religion', updated_at=now() WHERE id='human-activities-lists-mudras';
UPDATE atoms SET id='history-wars-by-death-toll', name='By death toll', path='History / Wars / By death toll', path_parts=ARRAY['History','Wars','By death toll']::text[], depth=3, realm_id='history', realm_name='History', updated_at=now() WHERE id='human-activities-lists-wars-by-death-toll';
UPDATE atoms SET id='culture-mass-media-film-and-cinema-religious-portrayals-jesus-christ', name='Jesus Christ', path='Culture / Mass media / Film and cinema / Religious portrayals / Jesus Christ', path_parts=ARRAY['Culture','Mass media','Film and cinema','Religious portrayals','Jesus Christ']::text[], depth=5, realm_id='culture', realm_name='Culture', updated_at=now() WHERE id='religion-lists-dramatic-portrayals-of-jesus-christ';
UPDATE atoms SET id='history-historical-events-english-reformation-monasteries-dissolved-by-henry-viii', name='Monasteries dissolved by Henry VIII', path='History / Historical events / English Reformation / Monasteries dissolved by Henry VIII', path_parts=ARRAY['History','Historical events','English Reformation','Monasteries dissolved by Henry VIII']::text[], depth=4, realm_id='history', realm_name='History', updated_at=now() WHERE id='religion-lists-monasteries-dissolved-by-henry-viii';
UPDATE atoms SET id='health-public-health-causes-of-death', name='Causes of death', path='Health / Public health / Causes of death', path_parts=ARRAY['Health','Public health','Causes of death']::text[], depth=3, realm_id='health', realm_name='Health', updated_at=now() WHERE id='science-lists-causes-of-death';
UPDATE atoms SET id='culture-gastronomy-materials-birthstones', name='Birthstones', path='Culture / Gastronomy / Materials / Birthstones', path_parts=ARRAY['Culture','Gastronomy','Materials','Birthstones']::text[], depth=4, realm_id='culture', realm_name='Culture', updated_at=now() WHERE id='science-lists-earth-sciences-lists-birthstones';
UPDATE atoms SET id='culture-sports-ball-games-association-football-notable-deaths', name='Notable deaths', path='Culture / Sports / Ball games / Association football / Notable deaths', path_parts=ARRAY['Culture','Sports','Ball games','Association football','Notable deaths']::text[], depth=5, realm_id='culture', realm_name='Culture', updated_at=now() WHERE id='self-lists-association-footballer-playing-deaths';
UPDATE atoms SET id='culture-sports-cycling-notable-deaths', name='Notable deaths', path='Culture / Sports / Cycling / Notable deaths', path_parts=ARRAY['Culture','Sports','Cycling','Notable deaths']::text[], depth=4, realm_id='culture', realm_name='Culture', updated_at=now() WHERE id='self-lists-cyclist-race-deaths';
UPDATE atoms SET id='culture-performing-arts-notable-on-stage-deaths', name='Notable on-stage deaths', path='Culture / Performing arts / Notable on-stage deaths', path_parts=ARRAY['Culture','Performing arts','Notable on-stage deaths']::text[], depth=3, realm_id='culture', realm_name='Culture', updated_at=now() WHERE id='self-lists-entertainer-deaths-while-performing';
UPDATE atoms SET id='history-historical-events-political-self-immolations', name='Political self-immolations', path='History / Historical events / Political self-immolations', path_parts=ARRAY['History','Historical events','Political self-immolations']::text[], depth=3, realm_id='history', realm_name='History', updated_at=now() WHERE id='self-lists-political-self-immolations';
UPDATE atoms SET id='society-linguistics-terms-for-men', name='Terms for men', path='Society / Linguistics / Terms for men', path_parts=ARRAY['Society','Linguistics','Terms for men']::text[], depth=3, realm_id='society', realm_name='Society', updated_at=now() WHERE id='self-lists-terms-for-men';
UPDATE atoms SET id='health-mental-health-diagnostic-classification-and-rating-scales', name='Diagnostic classification and rating scales', path='Health / Mental health / Diagnostic classification and rating scales', path_parts=ARRAY['Health','Mental health','Diagnostic classification and rating scales']::text[], depth=3, realm_id='health', realm_name='Health', updated_at=now() WHERE id='society-lists-diagnostic-classification-and-rating-scales';
UPDATE atoms SET id='tech-internet-and-web-emoticons', name='Emoticons', path='Tech / Internet and Web / Emoticons', path_parts=ARRAY['Tech','Internet and Web','Emoticons']::text[], depth=3, realm_id='tech', realm_name='Tech', updated_at=now() WHERE id='society-lists-emoticons';
UPDATE atoms SET id='culture-literature-fictional-characters-fictional-psychiatrists', name='Fictional psychiatrists', path='Culture / Literature / Fictional characters / Fictional psychiatrists', path_parts=ARRAY['Culture','Literature','Fictional characters','Fictional psychiatrists']::text[], depth=4, realm_id='culture', realm_name='Culture', updated_at=now() WHERE id='society-lists-fictional-psychiatrists';
UPDATE atoms SET id='justice-legal-frameworks-civil-liberties-youth-rights', name='Youth rights', path='Justice / Legal Frameworks / Civil liberties / Youth rights', path_parts=ARRAY['Justice','Legal Frameworks','Civil liberties','Youth rights']::text[], depth=4, realm_id='justice', realm_name='Justice', updated_at=now() WHERE id='society-lists-youth-rights-list';
UPDATE atoms SET id='science-astronomy-and-space-science-space-exploration-landings-on-extraterrestrial-bodies', name='Landings on extraterrestrial bodies', path='Science / Astronomy and space science / Space exploration / Landings on extraterrestrial bodies', path_parts=ARRAY['Science','Astronomy and space science','Space exploration','Landings on extraterrestrial bodies']::text[], depth=4, realm_id='science', realm_name='Science', updated_at=now() WHERE id='tech-lists-landings-on-extraterrestrial-bodies';
UPDATE atoms SET id='society-military-and-security-weapons', name='Weapons', path='Society / Military and security / Weapons', path_parts=ARRAY['Society','Military and security','Weapons']::text[], depth=3, realm_id='society', realm_name='Society', updated_at=now() WHERE id='tech-lists-military-weapons-list';
UPDATE atoms SET id='science-astronomy-and-space-science-space-exploration-solar-system-probes', name='Solar System probes', path='Science / Astronomy and space science / Space exploration / Solar System probes', path_parts=ARRAY['Science','Astronomy and space science','Space exploration','Solar System probes']::text[], depth=4, realm_id='science', realm_name='Science', updated_at=now() WHERE id='tech-lists-solar-system-probes';
UPDATE atoms SET id='society-military-and-security-terrorist-groups', name='Terrorist groups', path='Society / Military and security / Terrorist groups', path_parts=ARRAY['Society','Military and security','Terrorist groups']::text[], depth=3, realm_id='society', realm_name='Society', updated_at=now() WHERE id='tech-lists-terrorist-groups';
UPDATE atoms SET id='history-historical-events-terrorist-incidents', name='Terrorist incidents', path='History / Historical events / Terrorist incidents', path_parts=ARRAY['History','Historical events','Terrorist incidents']::text[], depth=3, realm_id='history', realm_name='History', updated_at=now() WHERE id='tech-lists-terrorist-incidents';
UPDATE atoms SET id='history-wars-world-war-ii-weapons', name='Weapons', path='History / Wars / World War II / Weapons', path_parts=ARRAY['History','Wars','World War II','Weapons']::text[], depth=4, realm_id='history', realm_name='History', updated_at=now() WHERE id='tech-lists-wwii-weapons';

-- ===== POST-BATCH INTEGRITY CHECK =====
DO $$
DECLARE
  new_total int; delta int;
  leaf_with_children int; depth_mismatch int; skipped_level int; dup_id int;
BEGIN
  SELECT count(*) INTO new_total FROM atoms;
  delta := new_total - 5011;
  IF delta <> 0 THEN
    RAISE EXCEPTION 'BATCH-3 FAIL: row delta expected 0, found %', delta;
  END IF;

  SELECT count(*) INTO leaf_with_children FROM atoms p
  WHERE p.is_leaf=true AND EXISTS (
    SELECT 1 FROM atoms c WHERE c.depth>p.depth AND c.path_parts[1:p.depth]=p.path_parts
  );
  IF leaf_with_children <> 0 THEN RAISE EXCEPTION 'BATCH-3 FAIL: leaf-with-children=%', leaf_with_children; END IF;

  SELECT count(*) INTO depth_mismatch FROM atoms WHERE depth <> array_length(path_parts,1);
  IF depth_mismatch <> 0 THEN RAISE EXCEPTION 'BATCH-3 FAIL: depth-mismatch=%', depth_mismatch; END IF;

  SELECT count(*) INTO skipped_level FROM atoms a
  WHERE a.depth > 1 AND NOT EXISTS (
    SELECT 1 FROM atoms p WHERE p.path=array_to_string(a.path_parts[1:a.depth-1], ' / ')
  );
  IF skipped_level <> 0 THEN RAISE EXCEPTION 'BATCH-3 FAIL: skipped-level=%', skipped_level; END IF;

  SELECT count(*) INTO dup_id FROM (SELECT id FROM atoms GROUP BY id HAVING count(*)>1) x;
  IF dup_id <> 0 THEN RAISE EXCEPTION 'BATCH-3 FAIL: dup-id=%', dup_id; END IF;

  RAISE NOTICE 'BATCH-3 OK: 0 row delta, integrity preserved';
END$$;
