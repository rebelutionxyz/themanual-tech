-- ═══════════════════════════════════════════════════════════════════════
-- PROFILE4 · 0001_profile_nodes — the profile patchboard node layer
--
-- PROPOSE-FIRST (SQL_AUTONOMY v1.1 + the PROFILE4 dispatch: "do NOT stamp the
-- shared ledger"). This file is authored, NOT applied. A controlled MIGRATE_SWEEP
-- or the owner applies db/proposals/*.sql in one serialized run, pairs each into
-- supabase/migrations/, and stamps ONCE. DO NOT run apply_migration on this.
--
-- ROLLBACK: db/proposals/0001_profile_nodes_rollback.sql (drops both tables +
-- their policies/grants). Stated first per the MIGRATION AMENDMENT.
--
-- WHAT / WHY (PROFILE_SPEC v0.1 "PATCHBOARD LAW OF THE PROFILE" + PATCHBOARD_NODES
-- v1). Every public profile element is a switchable node. The base patchboard
-- storage (patchboard_switches / patchboard_node_values) is NOT yet applied to
-- this DB, so PROFILE4 ships a SELF-CONTAINED profile node layer that merges into
-- the patchboard2 catalog when it lands (same source_kind/value model). Nothing
-- is hardcoded in the app: section visibility, tab order, share-my-votes, the
-- contact method, the ad slot and the tip rails all read from these rows.
--
-- Conventions: RLS on; bees.id = auth.uid() (bee_follows_v1); timestamptz
-- defaults; named-role grants (REVOKE PUBLIC stance); idempotent DDL.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Catalog: the census of profile nodes + their default + sensitivity ──────
-- Public-read reference data (no bee rows). value_type documents the jsonb
-- shape stored in profile_nodes.value. default_value is the platform default
-- when a Bee has set no override; sensitive=true means "private until switched
-- on" (PROFILE_SPEC v0.1 conservative posture).
create table if not exists public.profile_node_catalog (
  node_key    text primary key,
  category    text not null,                       -- section | layout | privacy | contact | ads | tips
  value_type  text not null
    check (value_type in ('bool', 'enum', 'array', 'number', 'string')),
  default_value jsonb not null,
  sensitive   boolean not null default true,
  label       text not null,
  description text,
  created_at  timestamptz not null default now()
);

comment on table public.profile_node_catalog is
  'Census of profile patchboard nodes (PROFILE_SPEC v0.1 + PATCHBOARD_NODES v1). Reference data; per-Bee overrides live in profile_nodes. Merges into the patchboard2 catalog when it lands. PROFILE4 2026-08-22.';

-- ── Per-Bee overrides ───────────────────────────────────────────────────────
create table if not exists public.profile_nodes (
  bee_id     uuid not null references public.bees(id) on delete cascade,
  node_key   text not null references public.profile_node_catalog(node_key) on delete cascade,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (bee_id, node_key)
);

comment on table public.profile_nodes is
  'Per-Bee profile node overrides. Effective value = this row if present, else profile_node_catalog.default_value. Public-read (the profile renders from it); owner-write. PROFILE4 2026-08-22.';

create index if not exists profile_nodes_bee_idx on public.profile_nodes (bee_id);

-- ── Seed the census (PROFILE_SPEC v0.1 element list + v0.2/v0.3/v0.4 additions).
-- Default posture is conservative: sections default OFF (private until switched
-- on). A few structural nodes default ON (activity feed, contact method 'none',
-- empty tab order = app default). Nothing here prices anything (ECONOMY_MORNING).
insert into public.profile_node_catalog (node_key, category, value_type, default_value, sensitive, label, description) values
  ('section.followers',      'section', 'bool',  'false',  true,  'Show followers',      'Followers list + count on the public profile.'),
  ('section.following',      'section', 'bool',  'false',  true,  'Show following',      'Following list + count.'),
  ('section.friends',        'section', 'bool',  'false',  true,  'Show friends',        'Friends (mutual) list + count.'),
  ('section.connections',    'section', 'bool',  'false',  true,  'Show connections',    'Connections (mutual) list + count.'),
  ('section.contacts',       'section', 'bool',  'false',  true,  'Show contacts',       'Contacts (one-way, private by default).'),
  ('section.groups',         'section', 'bool',  'false',  true,  'Show groups',         'Groups the Bee belongs to.'),
  ('section.events',         'section', 'bool',  'false',  true,  'Show events',         'Events hosted / going.'),
  ('section.activity',       'section', 'bool',  'true',   false, 'Show activity',       'Constellation activity feed (astra dots; votes are count-only).'),
  ('section.listings',       'section', 'bool',  'false',  true,  'Show listings',       'BAZAAR listings offered.'),
  ('section.images',         'section', 'bool',  'false',  true,  'Show images',         'Public image galleries (media_collections, vault-fed).'),
  ('section.videos',         'section', 'bool',  'false',  true,  'Show videos',         'Public video galleries (vault opt-in).'),
  ('section.campaigns',      'section', 'bool',  'false',  true,  'Show campaigns',      'FUND campaigns.'),
  ('section.petitions',      'section', 'bool',  'false',  true,  'Show petitions',      'Petitions started / signed.'),
  ('section.investigations', 'section', 'bool',  'false',  true,  'Show investigations', 'JUSTICE investigations.'),
  ('section.watching',       'section', 'bool',  'false',  true,  'Show watching',       'Ballots + dockets followed (Bookmarked).'),
  ('section.memberships',    'section', 'bool',  'false',  true,  'Show memberships',    'Memberships held.'),
  ('section.rank',           'section', 'bool',  'true',   false, 'Show rank',           'The rank shelf (BLiNG!/civic/streaks — earned, never bought).'),
  ('section.badges',         'section', 'bool',  'false',  true,  'Show badges',         'Badges (reserved — badge system is its own design session).'),
  ('ads.slot_enabled',       'ads',     'bool',  'false',  true,  'Ad slot',             'The user-curated ad slot (DEPTH_SLATE D7). Off by default; the USER curates + earns.'),
  ('ads.approved',           'ads',     'array', '[]',     true,  'Approved ads',        'Ad ids the user approved to show on their slot.'),
  ('tips.rail_bling',        'tips',    'bool',  'true',   false, 'BLiNG! tip rail',     'Accept BLiNG! tips (internal, gold rail).'),
  ('tips.rail_usd',          'tips',    'bool',  'false',  true,  'USD tip rail',        'Accept USD tips (CURRENCY_LAW v1.3 allowlist #4 — LIVE money owner-gated at the money walk).'),
  ('tips.bling_back_enabled','tips',    'bool',  'false',  true,  'Tipper BLiNG!-back',  'Tippers earn BLiNG! for tipping (profile-scope switch; rates are patchboard config).'),
  ('privacy.share_my_votes', 'privacy', 'bool',  'false',  true,  'Share my votes',      'Show ballot CHOICES in activity. Off = count-only. Ballot is SECRET BY DEFAULT.'),
  ('contact.method',         'contact', 'enum',  '"none"', true,  'Contact method',      'How the public may contact: message | email | none.'),
  ('layout.tab_order',       'layout',  'array', '[]',     false, 'Tab order',           'Ordered tab-id array; empty = the default order. Owner reorders via drag.')
on conflict (node_key) do nothing;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.profile_node_catalog enable row level security;
alter table public.profile_nodes        enable row level security;

-- Catalog: world-readable reference data; no client writes (seeded by migration).
drop policy if exists profile_node_catalog_read on public.profile_node_catalog;
create policy profile_node_catalog_read on public.profile_node_catalog
  for select using (true);

-- profile_nodes: world-readable (the public profile renders from it); a Bee
-- writes only its own rows. Effective privacy is expressed in the VALUES
-- (a section switched off simply is not rendered), not by hiding the row —
-- so the owner's own client can show the toggle state.
drop policy if exists profile_nodes_read on public.profile_nodes;
create policy profile_nodes_read on public.profile_nodes
  for select using (true);

drop policy if exists profile_nodes_insert_own on public.profile_nodes;
create policy profile_nodes_insert_own on public.profile_nodes
  for insert with check (bee_id = auth.uid());

drop policy if exists profile_nodes_update_own on public.profile_nodes;
create policy profile_nodes_update_own on public.profile_nodes
  for update using (bee_id = auth.uid()) with check (bee_id = auth.uid());

drop policy if exists profile_nodes_delete_own on public.profile_nodes;
create policy profile_nodes_delete_own on public.profile_nodes
  for delete using (bee_id = auth.uid());

-- ── Grants (named roles; REVOKE PUBLIC stance) ──────────────────────────────
revoke all on public.profile_node_catalog from public;
revoke all on public.profile_nodes        from public;
grant select on public.profile_node_catalog to anon, authenticated;
grant select on public.profile_nodes        to anon, authenticated;
grant insert, update, delete on public.profile_nodes to authenticated;

-- ── Effective-value resolver (bee override → catalog default). SECURITY
-- INVOKER: it only reads public-readable rows, so no elevation is needed. ──────
create or replace function public.profile_node_effective(p_bee uuid, p_key text)
returns jsonb
language sql stable security invoker set search_path = public
as $$
  select coalesce(
    (select n.value from public.profile_nodes n
      where n.bee_id = p_bee and n.node_key = p_key),
    (select c.default_value from public.profile_node_catalog c
      where c.node_key = p_key)
  );
$$;

revoke all on function public.profile_node_effective(uuid, text) from public;
grant execute on function public.profile_node_effective(uuid, text) to anon, authenticated;
