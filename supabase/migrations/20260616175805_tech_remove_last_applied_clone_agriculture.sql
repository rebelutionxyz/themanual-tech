-- APPLIED to prod 2026-06-16 via Supabase MCP (apply_migration). PARITY file — verbatim from schema_migrations.
-- version: 20260616175805

-- L3 finish (Butch, 2026-06-16): remove the last lingering "(applied)" clone.
-- "Agriculture (applied)" is redundant within the Agricultural technology branch and
-- the practice is already homed at Human activities > Agriculture and food production.
DELETE FROM atoms
WHERE realm_id='tech' AND path='Tech / Agricultural technology / Agriculture (applied)';
