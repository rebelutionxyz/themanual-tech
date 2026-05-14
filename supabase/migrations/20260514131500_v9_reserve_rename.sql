-- =============================================================================
-- Migration 20260514131500 — #V9-RESERVE-RENAME — minimal bling_system_state COMMENT
-- =============================================================================
-- Date:     2026-05-14
-- Author:   Code 2 (Claude) — supervised by Butch
--
-- Why:
--   The prior v9 migration installed a table COMMENT on
--   public.bling_system_state that enumerated wallet allocations.
--   Wallet allocations belong in the MMF white paper (§5.1), not in
--   the database catalog. This migration replaces the COMMENT with a
--   minimal description of what the table actually tracks. Wallet
--   balances live in bees.bling_balance — the COMMENT points there.
--
-- Scope:
--   Single object: public.bling_system_state table-level COMMENT.
--   No structural change. No data change. No grant change.
-- =============================================================================

BEGIN;

COMMENT ON TABLE public.bling_system_state IS
'BLiNG! economy singleton. Tracks bonding curve config, supply (total freed from curve), fee config. Wallet balances live in bees.bling_balance.';

COMMIT;

-- =============================================================================
-- Verification — run AFTER apply (outside this transaction):
--   SELECT obj_description('public.bling_system_state'::regclass);
-- Expected:
--   • Matches the new minimal COMMENT body above.
--   • Does NOT contain 'Emergency Reserve for Humanity'.
--   • Does NOT enumerate any wallet allocations (no '10T', '1T', '22B',
--     '150B', '50B', '333,222,111', or pool names).
-- =============================================================================
