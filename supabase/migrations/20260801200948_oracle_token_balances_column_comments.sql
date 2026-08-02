-- Document the OPS49d-flagged semantics: granted_tokens / spent_tokens are LIFETIME sums
-- (expiry-blind by design); only balance_tokens is availability. Prevents the next reader
-- from mistaking lifetime stats for available balances - the exact mistake the 402 gate made.
comment on view public.oracle_token_balances is
  'Per-bee token summary. balance_tokens = ACTUALLY AVAILABLE (expiry-aware, delegates to oracle_token_available()). All other sums are LIFETIME totals, deliberately expiry-blind stats. For plan/purchased availability splits use oracle_token_available(bee_id) directly.';
comment on column public.oracle_token_balances.balance_tokens is
  'Expiry-aware available balance from oracle_token_available(). The ONLY column safe to gate spend on.';
comment on column public.oracle_token_balances.granted_tokens is
  'LIFETIME sum of all grants incl. expired plan grants. Over-reports vs available for any Bee with an expired plan. Stat, not a balance - never gate on this.';
comment on column public.oracle_token_balances.spent_tokens is
  'LIFETIME sum of all debits. Stat, not a balance.';
comment on column public.oracle_token_balances.purchased_tokens is
  'LIFETIME sum of purchase entries. For remaining purchased balance use oracle_token_available().purchased_available.';
