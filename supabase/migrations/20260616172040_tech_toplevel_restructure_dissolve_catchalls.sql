-- APPLIED to prod 2026-06-16 via Supabase MCP (apply_migration). PARITY file — verbatim from schema_migrations.
-- version: 20260616172040

-- TECH TOP-LEVEL RESTRUCTURE (Butch, 2026-06-16): dissolve catch-alls, rebalance branches.
-- All subtree path-rewrites via prefix swap. Reversible.

-- 1) Rename "Concepts and issues" -> "Technology & society" (branch + all descendants)
UPDATE atoms
SET path_parts = ARRAY['Tech','Technology & society'] || path_parts[3:],
    path       = array_to_string(ARRAY['Tech','Technology & society'] || path_parts[3:], ' / '),
    name       = CASE WHEN path='Tech / Concepts and issues' THEN 'Technology & society' ELSE name END,
    updated_at = now()
WHERE realm_id='tech' AND (path='Tech / Concepts and issues' OR path LIKE 'Tech / Concepts and issues / %');

-- 2) Dissolve "Other applied sciences": reparent its four remaining leaves to proper homes
UPDATE atoms SET path_parts=ARRAY['Tech','Engineering','Applied physics'],
       path='Tech / Engineering / Applied physics', updated_at=now()
WHERE realm_id='tech' AND path='Tech / Other applied sciences / Applied physics';

UPDATE atoms SET path_parts=ARRAY['Tech','Computing','Library science'],
       path='Tech / Computing / Library science', updated_at=now()
WHERE realm_id='tech' AND path='Tech / Other applied sciences / Library science';

UPDATE atoms SET path_parts=ARRAY['Tech','Technology & society','Sustainability'],
       path='Tech / Technology & society / Sustainability', updated_at=now()
WHERE realm_id='tech' AND path='Tech / Other applied sciences / Sustainability';

UPDATE atoms SET path_parts=ARRAY['Tech','Emerging technologies','Weather modification'],
       path='Tech / Emerging technologies / Weather modification', updated_at=now()
WHERE realm_id='tech' AND path='Tech / Other applied sciences / Weather modification';

-- 2b) Remove the now-empty "Other applied sciences" branch node
DELETE FROM atoms WHERE realm_id='tech' AND path='Tech / Other applied sciences';

-- 3) Rename "Internet and Web" -> "Internet, networking & communications" (branch + descendants)
UPDATE atoms
SET path_parts = ARRAY['Tech','Internet, networking & communications'] || path_parts[3:],
    path       = array_to_string(ARRAY['Tech','Internet, networking & communications'] || path_parts[3:], ' / '),
    name       = CASE WHEN path='Tech / Internet and Web' THEN 'Internet, networking & communications' ELSE name END,
    updated_at = now()
WHERE realm_id='tech' AND (path='Tech / Internet and Web' OR path LIKE 'Tech / Internet and Web / %');

-- 3b) Move Communication technology's surviving children (Signal processing, Telecommunications + subtrees)
--     under the renamed branch (depth unchanged), then drop the empty branch
UPDATE atoms
SET path_parts = ARRAY['Tech','Internet, networking & communications'] || path_parts[3:],
    path       = array_to_string(ARRAY['Tech','Internet, networking & communications'] || path_parts[3:], ' / '),
    updated_at = now()
WHERE realm_id='tech' AND path LIKE 'Tech / Communication technology / %';

DELETE FROM atoms WHERE realm_id='tech' AND path='Tech / Communication technology';

-- 4) Rename Cryptocurrency's generic "Concepts" child -> "Cryptocurrency concepts" (subtree)
UPDATE atoms
SET path_parts = ARRAY['Tech','Cryptocurrency','Cryptocurrency concepts'] || path_parts[4:],
    path       = array_to_string(ARRAY['Tech','Cryptocurrency','Cryptocurrency concepts'] || path_parts[4:], ' / '),
    name       = CASE WHEN path='Tech / Cryptocurrency / Concepts' THEN 'Cryptocurrency concepts' ELSE name END,
    updated_at = now()
WHERE realm_id='tech' AND (path='Tech / Cryptocurrency / Concepts' OR path LIKE 'Tech / Cryptocurrency / Concepts / %');

-- 4b) Nest the whole Cryptocurrency subtree under Computing as "Blockchain & cryptocurrency" (depth +1)
UPDATE atoms
SET path_parts = ARRAY['Tech','Computing','Blockchain & cryptocurrency'] || path_parts[3:],
    path       = array_to_string(ARRAY['Tech','Computing','Blockchain & cryptocurrency'] || path_parts[3:], ' / '),
    depth      = array_length(ARRAY['Tech','Computing','Blockchain & cryptocurrency'] || path_parts[3:], 1),
    name       = CASE WHEN path='Tech / Cryptocurrency' THEN 'Blockchain & cryptocurrency' ELSE name END,
    updated_at = now()
WHERE realm_id='tech' AND (path='Tech / Cryptocurrency' OR path LIKE 'Tech / Cryptocurrency / %');

-- 5) Safety: recompute leaf flags for anything whose child set changed
UPDATE atoms a
SET is_leaf = NOT EXISTS (SELECT 1 FROM atoms c WHERE c.realm_id='tech' AND c.path LIKE a.path || ' / %'),
    updated_at = now()
WHERE a.realm_id='tech'
  AND a.is_leaf <> NOT EXISTS (SELECT 1 FROM atoms c WHERE c.realm_id='tech' AND c.path LIKE a.path || ' / %');
