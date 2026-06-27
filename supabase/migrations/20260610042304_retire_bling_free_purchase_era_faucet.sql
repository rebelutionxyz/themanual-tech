-- Retire bling_free: a vestigial purchase-era primitive (self-free into your own account up to cap) from the
-- dropped buy-BLiNG! era (bling_credit_purchase / order book / bonding curve), orphaned by Path A. Nothing calls
-- it, and it was executable by 'authenticated' — i.e. a live self-serve mint backdoor. Removed entirely.
DROP FUNCTION IF EXISTS public.bling_free(uuid, numeric);
