-- ROLLBACK for 20260903214559_my_bling_balance_rpc.sql
-- Restores the pre-existing state: no function. HandleSettingsPage and the
-- shell header go back to showing "—" for BLiNG.
DROP FUNCTION IF EXISTS public.my_bling_balance();
