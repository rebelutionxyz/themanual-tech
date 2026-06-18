-- APPLIED to prod 2026-06-16 via MCP. PARITY file.
-- England's counties were mis-typed as 'city' (they sit at the admin2 level under England=admin1).
-- Identifiable by id; the 8 real English cities (geo-uk-city-*) are untouched.
UPDATE atoms SET type='admin2', updated_at=now()
WHERE realm_id='geography' AND type='city'
  AND id LIKE '%subdivisions-england-counties-%';
