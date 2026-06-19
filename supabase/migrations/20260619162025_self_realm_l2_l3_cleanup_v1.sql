-- Self realm L2/L3 cleanup v1
-- 8 L2 -> 7, 40 L3 -> 35. Renames/moves only touch path/name/path_parts (ids frozen).
-- Drops 6 emptied container nodes (cascades 2 system-seed sourcer rows). Depths unchanged.

-- PHASE A: rename L2 "Mind and thought" -> "Mind & thought"
UPDATE atoms SET path = 'Self / Mind & thought' || substring(path from length('Self / Mind and thought')+1)
WHERE realm_id='self' AND path LIKE 'Self / Mind and thought%';
UPDATE atoms SET name='Mind & thought' WHERE realm_id='self' AND id='self-mind-and-thought';

-- PHASE B: Mind & thought internals
UPDATE atoms SET name='Foundations of mind', path='Self / Mind & thought / Foundations of mind'
WHERE realm_id='self' AND path='Self / Mind & thought / Mind & cognition';
UPDATE atoms SET path='Self / Mind & thought / Foundations of mind' || substring(path from length('Self / Mind & thought / Mind & cognition')+1)
WHERE realm_id='self' AND path LIKE 'Self / Mind & thought / Mind & cognition / %';
UPDATE atoms SET path='Self / Mind & thought / Reasoning & judgment / ' || name
WHERE realm_id='self' AND path LIKE 'Self / Mind & thought / Qualities of reasoning / %';
DELETE FROM atoms WHERE realm_id='self' AND path='Self / Mind & thought / Qualities of reasoning';

-- PHASE C: Personality
UPDATE atoms SET path='Self / The self / Self & persona'
WHERE realm_id='self' AND path='Self / Personality / Self & persona';
UPDATE atoms SET path='Self / The self / Self & persona / ' || name
WHERE realm_id='self' AND path LIKE 'Self / Personality / Self & persona / %';
UPDATE atoms SET name='Character, values & virtues', path='Self / Personality / Character, values & virtues'
WHERE realm_id='self' AND path='Self / Personality / Character';
UPDATE atoms SET path='Self / Personality / Character, values & virtues / ' || name
WHERE realm_id='self' AND path LIKE 'Self / Personality / Character / %';
UPDATE atoms SET path='Self / Personality / Character, values & virtues / Values'
WHERE realm_id='self' AND path='Self / Personality / Values & virtues / Values';
UPDATE atoms SET path='Self / Personality / Character, values & virtues / Virtues' || substring(path from length('Self / Personality / Values & virtues / Virtues')+1)
WHERE realm_id='self' AND path LIKE 'Self / Personality / Values & virtues / Virtues%';
DELETE FROM atoms WHERE realm_id='self' AND path='Self / Personality / Values & virtues';

-- PHASE D: The self
UPDATE atoms SET path='Self / The self / Nature of the self / ' || name
WHERE realm_id='self' AND path LIKE 'Self / The self / Disciplinary perspectives / %';
DELETE FROM atoms WHERE realm_id='self' AND path='Self / The self / Disciplinary perspectives';

-- PHASE E: Life stages + Life domains -> "Life course & domains"
UPDATE atoms SET name='Life course & domains', path='Self / Life course & domains'
WHERE realm_id='self' AND path='Self / Life domains';
UPDATE atoms SET name='Life spheres & quality of life', path='Self / Life course & domains / Life spheres & quality of life'
WHERE realm_id='self' AND path='Self / Life domains / Spheres of life';
UPDATE atoms SET path='Self / Life course & domains / Life spheres & quality of life / ' || name
WHERE realm_id='self' AND path LIKE 'Self / Life domains / Spheres of life / %';
UPDATE atoms SET path='Self / Life course & domains / Life spheres & quality of life / ' || name
WHERE realm_id='self' AND path LIKE 'Self / Life domains / Quality of life & balance / %';
DELETE FROM atoms WHERE realm_id='self' AND path='Self / Life domains / Quality of life & balance';
UPDATE atoms SET name='Life stages & development', path='Self / Life course & domains / Life stages & development'
WHERE realm_id='self' AND path='Self / Life stages / Stages of life';
UPDATE atoms SET path='Self / Life course & domains / Life stages & development / ' || name
WHERE realm_id='self' AND path LIKE 'Self / Life stages / Stages of life / %';
UPDATE atoms SET path='Self / Life course & domains / Life stages & development / ' || name
WHERE realm_id='self' AND path LIKE 'Self / Life stages / The life course / %';
DELETE FROM atoms WHERE realm_id='self' AND path='Self / Life stages / The life course';
DELETE FROM atoms WHERE realm_id='self' AND path='Self / Life stages';

-- PHASE F: Love homonym rename
UPDATE atoms SET name='Love (relationship)', path='Self / Relationships / Relationship dynamics / Love (relationship)'
WHERE realm_id='self' AND path='Self / Relationships / Relationship dynamics / Love';

-- PHASE G: recompute path_parts (depths unchanged)
UPDATE atoms SET path_parts = string_to_array(path, ' / ') WHERE realm_id='self';
