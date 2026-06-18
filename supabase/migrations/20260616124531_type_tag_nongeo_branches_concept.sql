-- APPLIED to prod 2026-06-16 via MCP. PARITY file.
-- All structural (non-leaf) nodes across the 12 knowledge realms are concepts.
-- Leaves left as-is for now (handled in a reviewed follow-up: concept default + event/entity carve-outs).
UPDATE atoms
SET type='concept', updated_at=now()
WHERE realm_id <> 'geography'
  AND is_leaf = false
  AND type = 'event';
