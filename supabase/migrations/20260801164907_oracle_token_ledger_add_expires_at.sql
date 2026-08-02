-- OPS48 deliverable 2: the ONE column that enables plan/purchased token buckets.
-- NULL = never expires (every existing row + every purchase). NOT NULL = a plan grant for the
-- cycle ending at that instant. No new entry_type, no CHECK change. Existing 5 grant rows (comps/
-- seeds) stay NULL and never start expiring. Append-only preserved.
ALTER TABLE public.oracle_token_ledger ADD COLUMN expires_at timestamptz;
COMMENT ON COLUMN public.oracle_token_ledger.expires_at IS
  'NULL=never expires (purchases, comps). NOT NULL=plan grant expiring at cycle reset. Read-time predicate for spend-plan-first; no scheduled job.';
