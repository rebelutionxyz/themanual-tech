-- ROLLBACK for 20260804120000_db29_consumption_select_own.sql
-- DB29, 2026-08-04. Quoted VERBATIM from FRONT20-Q, which stated it beside the
-- fix. It is the exact inverse pair, in inverse order: drop the policy the
-- forward migration created, then revoke the grant it made.
--
-- WHAT RUNNING THIS RESTORES: the 42501 break. Every signed-in Bee goes back to
-- "Balance unavailable -- permission denied for table oracle_token_consumption"
-- on the badge and the /oracle console. It removes no data and moves no money —
-- the forward migration grants only SELECT, so there is nothing written to undo.
--
-- It exists for protocol completeness (R7 requires a stated rollback before an
-- apply), not as a maintenance procedure.

drop policy oracle_token_consumption_select_own on public.oracle_token_consumption;

revoke select on public.oracle_token_consumption from authenticated;
