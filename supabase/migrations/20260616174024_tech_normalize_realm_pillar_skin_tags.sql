-- APPLIED to prod 2026-06-16 via Supabase MCP (apply_migration). PARITY file — verbatim from schema_migrations.
-- version: 20260616174024

-- L3 hygiene (Butch, 2026-06-16): normalize realm/pillar/skin tags across the Tech realm.
-- Convention: realm_tags=['Tech'], pillar_tags=['MANUAL'], skin_tags=['HoneyComb'] (mirrors realm_id).
-- Fixes ~42 untagged atoms (multi-session build oversight) + 6 with stale Math/Reference realm tags.
UPDATE atoms
SET realm_tags  = ARRAY['Tech'],
    pillar_tags = ARRAY['MANUAL'],
    skin_tags   = ARRAY['HoneyComb'],
    updated_at  = now()
WHERE realm_id='tech'
  AND ( realm_tags  IS DISTINCT FROM ARRAY['Tech']
     OR pillar_tags IS DISTINCT FROM ARRAY['MANUAL']
     OR skin_tags   IS DISTINCT FROM ARRAY['HoneyComb'] );
