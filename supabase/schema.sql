-- ═══════════════════════════════════════════════════════════════════════
-- TheManual.tech · Supabase Schema v1
-- April 22, 2026
--
-- Run this in your Supabase SQL Editor.
-- Safe to re-run — uses IF NOT EXISTS.
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- BEES TABLE
-- Every Bee (user) has a profile row keyed to auth.users.id
-- ───────────────────────────────────────────────────────────────────────
create table if not exists public.bees (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null,
  email text unique not null,
  bling_rank integer not null default 0 check (bling_rank >= 0 and bling_rank <= 32),
  honeycomb_ring integer not null default 0 check (honeycomb_ring >= 0 and honeycomb_ring <= 8),
  action_count integer not null default 0,
  bling_balance numeric(20, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bees_handle_idx on public.bees(handle);
create index if not exists bees_bling_rank_idx on public.bees(bling_rank desc);
create index if not exists bees_ring_idx on public.bees(honeycomb_ring desc);

-- Enforce handle format: lowercase, alphanumeric, underscores, hyphens only, 2-30 chars
alter table public.bees drop constraint if exists handle_format;
alter table public.bees add constraint handle_format
  check (handle ~ '^[a-z0-9_-]{2,30}$');

-- ───────────────────────────────────────────────────────────────────────
-- ATOM CONTRIBUTIONS
-- When Bees add sources, vote on kettle state, or comment on Manual atoms
-- The atoms themselves ship with the frontend; contributions are DB-stored
-- ───────────────────────────────────────────────────────────────────────
create table if not exists public.atom_sources (
  id uuid primary key default gen_random_uuid(),
  atom_id text not null, -- matches id field in atoms.json
  bee_id uuid not null references public.bees(id) on delete cascade,
  source_url text not null,
  source_title text,
  source_type text check (source_type in ('primary', 'secondary', 'rebuttal', 'supporting')),
  authority_tier integer check (authority_tier between 1 and 5),
  note text,
  upvotes integer not null default 0,
  downvotes integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists atom_sources_atom_idx on public.atom_sources(atom_id);
create index if not exists atom_sources_bee_idx on public.atom_sources(bee_id);

-- ───────────────────────────────────────────────────────────────────────
-- ATOM KETTLE VOTES
-- Bees vote on what kettle state an atom should be in.
-- ───────────────────────────────────────────────────────────────────────
create table if not exists public.atom_kettle_votes (
  id uuid primary key default gen_random_uuid(),
  atom_id text not null,
  bee_id uuid not null references public.bees(id) on delete cascade,
  kettle_state text not null check (
    kettle_state in ('Sourced', 'Accepted', 'Contested', 'Emerging', 'Fringe', 'Unsourced')
  ),
  reasoning text,
  created_at timestamptz not null default now(),
  unique (atom_id, bee_id)
);

create index if not exists atom_kettle_atom_idx on public.atom_kettle_votes(atom_id);

-- ───────────────────────────────────────────────────────────────────────
-- ATOM COMMENTS
-- Discussion on specific atoms.
-- ───────────────────────────────────────────────────────────────────────
create table if not exists public.atom_comments (
  id uuid primary key default gen_random_uuid(),
  atom_id text not null,
  bee_id uuid not null references public.bees(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  parent_id uuid references public.atom_comments(id) on delete cascade,
  upvotes integer not null default 0,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create index if not exists atom_comments_atom_idx on public.atom_comments(atom_id);

-- ───────────────────────────────────────────────────────────────────────
-- AUTO-UPDATE updated_at trigger
-- ───────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists bees_updated_at on public.bees;
create trigger bees_updated_at
  before update on public.bees
  for each row
  execute function public.set_updated_at();

-- ───────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- Principle: public read where appropriate, write only your own rows.
-- ───────────────────────────────────────────────────────────────────────

-- Enable RLS on all tables
alter table public.bees enable row level security;
alter table public.atom_sources enable row level security;
alter table public.atom_kettle_votes enable row level security;
alter table public.atom_comments enable row level security;

-- BEES: anyone can read public fields, only owner can update
drop policy if exists "bees_public_read" on public.bees;
create policy "bees_public_read" on public.bees
  for select using (true);

drop policy if exists "bees_insert_self" on public.bees;
create policy "bees_insert_self" on public.bees
  for insert with check (auth.uid() = id);

drop policy if exists "bees_update_self" on public.bees;
create policy "bees_update_self" on public.bees
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ATOM_SOURCES: public read, authenticated bees can insert their own
drop policy if exists "atom_sources_public_read" on public.atom_sources;
create policy "atom_sources_public_read" on public.atom_sources
  for select using (true);

drop policy if exists "atom_sources_insert_own" on public.atom_sources;
create policy "atom_sources_insert_own" on public.atom_sources
  for insert with check (auth.uid() = bee_id);

drop policy if exists "atom_sources_update_own" on public.atom_sources;
create policy "atom_sources_update_own" on public.atom_sources
  for update using (auth.uid() = bee_id) with check (auth.uid() = bee_id);

drop policy if exists "atom_sources_delete_own" on public.atom_sources;
create policy "atom_sources_delete_own" on public.atom_sources
  for delete using (auth.uid() = bee_id);

-- ATOM_KETTLE_VOTES: public read, authenticated bees can vote on their own
drop policy if exists "atom_kettle_public_read" on public.atom_kettle_votes;
create policy "atom_kettle_public_read" on public.atom_kettle_votes
  for select using (true);

drop policy if exists "atom_kettle_insert_own" on public.atom_kettle_votes;
create policy "atom_kettle_insert_own" on public.atom_kettle_votes
  for insert with check (auth.uid() = bee_id);

drop policy if exists "atom_kettle_update_own" on public.atom_kettle_votes;
create policy "atom_kettle_update_own" on public.atom_kettle_votes
  for update using (auth.uid() = bee_id) with check (auth.uid() = bee_id);

-- ATOM_COMMENTS: public read, authenticated bees can comment, only own edits
drop policy if exists "atom_comments_public_read" on public.atom_comments;
create policy "atom_comments_public_read" on public.atom_comments
  for select using (true);

drop policy if exists "atom_comments_insert_own" on public.atom_comments;
create policy "atom_comments_insert_own" on public.atom_comments
  for insert with check (auth.uid() = bee_id);

drop policy if exists "atom_comments_update_own" on public.atom_comments;
create policy "atom_comments_update_own" on public.atom_comments
  for update using (auth.uid() = bee_id) with check (auth.uid() = bee_id);

drop policy if exists "atom_comments_delete_own" on public.atom_comments;
create policy "atom_comments_delete_own" on public.atom_comments
  for delete using (auth.uid() = bee_id);

-- ═══════════════════════════════════════════════════════════════════════
-- END OF SCHEMA v1
-- ═══════════════════════════════════════════════════════════════════════

-- Future surfaces (placeholders for when we build them):
--   forum_threads, forum_posts (INTEL surface)
--   groups, group_memberships (UNITE surface)
--   events, event_rsvps (RULE surface)
--   bazaar_listings, bazaar_offers (BAZAAR surface)
--   messages (COMMS surface)
--   give_campaigns, give_contributions (GIVE surface)
--   etc.
--
-- Each future surface gets its own migration file.
