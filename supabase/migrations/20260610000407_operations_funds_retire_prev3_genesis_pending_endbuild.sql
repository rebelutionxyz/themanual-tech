-- Retire the pre-Economy-v3 operations_funds genesis seed (200B, seeded 2026-05-15, predating the June v3
-- "nothing pre-seeded; entire cap unfreed in the Well" lock). Zero all seven war-chests (current + genesis)
-- so the prod state is v3-clean: total_supply=0 and nothing pre-seeded. Fund ROWS are preserved as placeholders.
--
-- FUNDING PLAN (canon, not executed here): operations_funds will be funded at a clean target of
-- 222,111,111,111 BLiNG! ("222B 111M 111K 111"), freed FROM the Royal Jelly Treasury (the Well) near
-- END-OF-BUILD, once the final Astra count is locked — the allocation scales with the constellation size,
-- which continues to grow. The remainder of the cap stays in the Well/reserve. Until then, issue_newbee_bonus
-- returns FALSE (no fund balance) — the newbee fund must be seeded before NewBEE bonuses can issue at launch.
UPDATE public.operations_funds SET current_balance = 0, genesis_balance = 0, updated_at = now();
