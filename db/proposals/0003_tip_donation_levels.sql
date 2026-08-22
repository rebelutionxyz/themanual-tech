-- ═══════════════════════════════════════════════════════════════════════
-- PROFILE4 · 0003_tip_donation_levels — creator tip reward tiers
--
-- PROPOSE-FIRST (SQL_AUTONOMY v1.1 + dispatch: do NOT stamp the ledger). Authored,
-- NOT applied. ROLLBACK: db/proposals/0003_tip_donation_levels_rollback.sql.
--
-- WHAT / WHY (PROFILE_SPEC v0.3 "TIP TAB" + v0.4 "TIP CHECKOUT / LEVEL MAXES").
-- Donation levels a Bee defines: amount + reward of any kind + optional BLiNG!
-- reward + a MAX count ("3 of 25 left"). Unlimited count per Bee, each edit/
-- deletable. The tip RAILS and the tipper-BLiNG!-back SWITCH are profile_nodes
-- (tips.rail_bling / tips.rail_usd / tips.bling_back_enabled in 0001) — NOT
-- duplicated here. A platform-scope tipper-BLiNG!-back switch belongs to the
-- patchboard2 master catalog when it lands.
--
-- Currency: CURRENCY_LAW v1.3 confirms tips accept USD + BLiNG! (+ configured
-- cryptos). `currency` is the tier's denomination; LIVE money movement stays
-- OWNER-GATED at the money walk (this table is CONFIG only — no settlement).
-- `amount` / `bling_back` use numeric(20,6) (BLiNG! precision, CLAUDE.md);
-- for a fiat/crypto tier the value is that currency's major unit. Settlement
-- precision (cents / atomic) is resolved at the money walk, not here.
--
-- Conventions: RLS on; bees.id = auth.uid(); named-role grants.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.tip_donation_levels (
  id            uuid primary key default gen_random_uuid(),
  bee_id        uuid not null references public.bees(id) on delete cascade,
  position      integer not null default 0,
  currency      text not null default 'BLING'
    check (char_length(currency) between 2 and 12),
  amount        numeric(20,6) not null check (amount > 0),
  reward_kind   text,
  reward_desc   text,
  bling_back    numeric(20,6) not null default 0 check (bling_back >= 0),
  max_count     integer check (max_count is null or max_count > 0),
  claimed_count integer not null default 0 check (claimed_count >= 0),
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.tip_donation_levels is
  'Creator tip reward tiers (PROFILE_SPEC v0.3/v0.4): amount + reward + optional BLiNG!-back + max_count. CONFIG only — no settlement; live money is owner-gated at the money walk. Rails/back-switch live in profile_nodes. PROFILE4 2026-08-22.';

create index if not exists tip_donation_levels_bee_idx
  on public.tip_donation_levels (bee_id, position);

alter table public.tip_donation_levels enable row level security;

-- Public-read (tippers see the tiers); a Bee writes only its own tiers.
drop policy if exists tip_levels_read on public.tip_donation_levels;
create policy tip_levels_read on public.tip_donation_levels
  for select using (true);

drop policy if exists tip_levels_insert_own on public.tip_donation_levels;
create policy tip_levels_insert_own on public.tip_donation_levels
  for insert with check (bee_id = auth.uid());

drop policy if exists tip_levels_update_own on public.tip_donation_levels;
create policy tip_levels_update_own on public.tip_donation_levels
  for update using (bee_id = auth.uid()) with check (bee_id = auth.uid());

drop policy if exists tip_levels_delete_own on public.tip_donation_levels;
create policy tip_levels_delete_own on public.tip_donation_levels
  for delete using (bee_id = auth.uid());

-- Grants (named roles; REVOKE PUBLIC stance).
revoke all on public.tip_donation_levels from public;
grant select on public.tip_donation_levels to anon, authenticated;
grant insert, update, delete on public.tip_donation_levels to authenticated;
