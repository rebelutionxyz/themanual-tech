-- Affiliate hold layer, piece 3b: daily maturation job. Releases held lots whose 60-day clock
-- has elapsed (held → spendable, posts the ledger row). Idempotent by job name (re-runs replace).
SELECT cron.schedule(
  'affiliate-release-matured',
  '0 9 * * *',                                  -- daily 09:00 UTC (off-peak)
  $$SELECT public.affiliate_release_matured();$$
);