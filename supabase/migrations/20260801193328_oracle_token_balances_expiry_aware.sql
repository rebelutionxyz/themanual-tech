-- OPS49c: fix the expiry-blind oracle_token_balances view (the live 402 gate reads it).
-- balance_tokens becomes the expiry-aware truth from oracle_token_available() so the gate and the
-- debit RPC can never disagree. All other columns keep their lifetime-sum semantics and the column
-- shape is IDENTICAL (bee_id, balance_tokens, purchased_tokens, granted_tokens, spent_tokens,
-- entry_count, last_entry_at) so existing callers are untouched.
-- Dry-run proof 2026-08-01: fixture w/ expired grant -> old formula 150, fn truth 50, new view 50.
-- ROLLBACK: recreate the previous naive-sum view (definition preserved in ops_reports OPS49c-LEAD).
create or replace view public.oracle_token_balances as
with sums as (
  select bee_id,
         sum(amount_tokens) filter (where entry_type='purchase')  as purchased_tokens,
         sum(amount_tokens) filter (where entry_type='grant')     as granted_tokens,
         -sum(amount_tokens) filter (where entry_type='debit')    as spent_tokens,
         count(*) as entry_count,
         max(created_at) as last_entry_at
    from oracle_token_ledger group by bee_id
)
select s.bee_id, a.total_available as balance_tokens,
       s.purchased_tokens, s.granted_tokens, s.spent_tokens, s.entry_count, s.last_entry_at
  from sums s cross join lateral public.oracle_token_available(s.bee_id) a;
