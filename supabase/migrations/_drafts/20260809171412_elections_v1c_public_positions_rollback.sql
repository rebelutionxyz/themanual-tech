-- ROLLBACK for 20260809171412_elections_v1c_public_positions
--
-- Written FIRST, per the MIGRATION AMENDMENT -- this text was recorded in
-- ops_dispatches pass DB44 before the apply ran. Saved to disk by DB45.
--
-- Destructive: drops the table and every row in it. election_positions is
-- actor-side only and holds no Bee ballot data, but check for live rows before
-- running this against production.

begin;
drop table if exists public.election_positions;
commit;
