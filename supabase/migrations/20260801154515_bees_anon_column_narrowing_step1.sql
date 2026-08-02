-- DB14 step 1: close the LOUD half of the bees PII exposure — anon-only, no client change.
-- Revokes anon's table-wide SELECT (which exposed email, is_admin, bling_*, stripe_customer_id)
-- and grants back only the 10 public columns. Verified against live schema + dry-run 2026-08-01.
-- The 'authenticated' half (step 2) is deliberately NOT here — it needs the client seam first.
revoke select on public.bees from anon;
grant select (id, handle, name, avatar_url, bio,
              honeycomb_ring, action_count, bling_rank,
              created_at, updated_at) on public.bees to anon;
