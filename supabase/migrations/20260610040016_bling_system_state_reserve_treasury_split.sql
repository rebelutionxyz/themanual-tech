-- Make the cap's Reserve/Treasury split first-class. Per the locked model: the RESERVE is the sole well from
-- which BLiNG! is freed (only via Drops, Drips, Affiliate perks); the TREASURY is a protected carve-out, never
-- freed by earning, funded into operations near end-of-build. hard_cap stays the total Sacred Sum (= reserve + treasury).
ALTER TABLE public.bling_system_state ADD COLUMN reserve numeric(24,6), ADD COLUMN treasury numeric(24,6);

UPDATE public.bling_system_state SET reserve = 111222000000000000, treasury = 333333222111 WHERE id=1;

ALTER TABLE public.bling_system_state ALTER COLUMN reserve SET NOT NULL, ALTER COLUMN treasury SET NOT NULL;

ALTER TABLE public.bling_system_state ADD CONSTRAINT bling_system_state_reserve_treasury_cap CHECK (reserve + treasury = hard_cap);
