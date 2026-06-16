-- APPLIED to prod 2026-06-16 via Supabase MCP (apply_migration). PARITY file — verbatim from schema_migrations.
-- version: 20260616171754

-- TECH REALM CLEANUP (Butch, 2026-06-16): remove cross-realm-covered duplicates
-- + internal duplicate copies, ahead of top-level reorganization. Reversible.

-- 1) Preserve content: reparent the lone child of the duplicate Rail transport
--    onto the surviving home before that duplicate is removed.
UPDATE atoms
SET path_parts = ARRAY['Tech','Transport technology','Land transport','Rail transport','Famous trains'],
    path       = 'Tech / Transport technology / Land transport / Rail transport / Famous trains',
    depth      = 5,
    updated_at = now()
WHERE realm_id='tech'
  AND path = 'Tech / Transport technology / Rail transport / Famous trains';

-- 2) Cross-realm duplicates already homed in their proper realm
--    (Culture / Geography / Science / Society / Health / History / Philosophy / Human activities)
DELETE FROM atoms
WHERE realm_id='tech' AND path IN (
  'Tech / Construction and built environment / Architecture (applied)',
  'Tech / Construction and built environment / Design (applied)',
  'Tech / Biotechnology / Bioinformatics (applied)',
  'Tech / Agricultural technology / Forestry (applied)',
  'Tech / Other applied sciences / Cartography (applied)',
  'Tech / Other applied sciences / Firefighting (applied)',
  'Tech / Other applied sciences / Forensic science',
  'Tech / Other applied sciences / Futures studies (applied)',
  'Tech / Other applied sciences / Hydrology',
  'Tech / Other applied sciences / Information science',
  'Tech / Other applied sciences / Meteorology (applied)',
  'Tech / Other applied sciences / Prehistoric technology',
  'Tech / Concepts and issues / Posthumanism',
  'Tech / Communication technology / Mass communication'
);

-- 3) Internal duplicate copies — keep the better-nested / content-bearing home of each
DELETE FROM atoms
WHERE realm_id='tech' AND path IN (
  'Tech / Engineering / Civil engineering',                                   -- keep Construction & built environment (7 children)
  'Tech / Engineering / Software engineering',                                -- keep Computing > Software
  'Tech / Energy technology / Fossil fuels',                                  -- keep Energy sources > Fossil fuels
  'Tech / Energy technology / Geothermal energy',                             -- keep Energy sources > Renewable energy
  'Tech / Energy technology / Hydroelectric power',                           -- keep Energy sources > Renewable energy
  'Tech / Energy technology / Nuclear fusion',                                -- keep Energy sources > Nuclear technology
  'Tech / Energy technology / Nuclear power',                                 -- keep Energy sources > Nuclear technology
  'Tech / Emerging technologies / Gene therapy',                              -- keep Biotechnology > Genetic engineering
  'Tech / Internet and Web / World Wide Web / HTTP',                          -- keep Internet and Web > Protocols > HTTP
  'Tech / Military technology / Missiles',                                    -- keep Military technology > Weapons > Missiles
  'Tech / Transport technology / Land transport / Road transport / Tunnels',  -- keep Civil engineering > Tunnels
  'Tech / Transport technology / Rail transport'                              -- keep Land transport > Rail transport (child reparented above)
);

-- 4) Recompute leaf flags for any parent whose child set changed
UPDATE atoms a
SET is_leaf = NOT EXISTS (SELECT 1 FROM atoms c WHERE c.realm_id='tech' AND c.path LIKE a.path || ' / %'),
    updated_at = now()
WHERE a.realm_id='tech'
  AND a.is_leaf <> NOT EXISTS (SELECT 1 FROM atoms c WHERE c.realm_id='tech' AND c.path LIKE a.path || ' / %');
