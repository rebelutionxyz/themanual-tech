-- ═══════════════════════════════════════════════════════════════════════
-- TheManual.tech · Supabase Schema v2 — COMPOSITION & SURFACES
-- April 22, 2026
--
-- Run AFTER schema.sql (v1 which created bees and atom_ tables).
--
-- Core design decisions (locked):
-- 1. Every surface entity has an optional parent_surface + parent_id
--    allowing "anything inside anything" composition
-- 2. Every surface entity can link to Manual atoms via entity_atom_links
-- 3. The Manual stays canonical — entities LINK to atoms, never copy them
-- 4. A `skin` + `pillar_domain` metadata layer allows same DB to serve
--    multiple pillar domains with different presentation
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- SKIN ENUM
-- The 3 visual lenses: HoneyComb (default), Rebelution, AtlasNation
-- ───────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'skin_type') then
    create type skin_type as enum ('honeycomb', 'rebelution', 'atlasnation');
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────────
-- SURFACE ENUM
-- The 19 surfaces, as a type for parent_surface references.
-- ───────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'surface_type') then
    create type surface_type as enum (
      'bling', 'intel', 'unite', 'rule', 'comms', 'give', 'chat', 'pulse',
      'bazaar', 'brand', 'prize', 'promotion', 'manual',
      'secure', 'safe', 'production', 'edu', 'vote', 'legal'
    );
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────────
-- PILLAR CONFIG
-- Each pillar domain registers itself: which surface is default landing,
-- which skin, any domain-specific branding overrides.
-- ───────────────────────────────────────────────────────────────────────
create table if not exists public.pillars (
  id uuid primary key default gen_random_uuid(),
  domain text unique not null,
  name text not null,
  tagline text,
  default_surface surface_type not null default 'manual',
  default_skin skin_type not null default 'honeycomb',
  primary_color text,
  accent_color text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.pillars (domain, name, tagline, default_surface, default_skin)
values
  ('themanual.tech', 'The Manual', 'The sovereign record', 'manual', 'honeycomb'),
  ('freedomblings.com', 'FreedomBLiNGs', 'The BLiNG! economy', 'bling', 'honeycomb'),
  ('rebelution.app', 'RebelUtion', 'Action first', 'unite', 'rebelution'),
  ('fnulnu.xyz', 'FNU LNU', 'First Name Unknown', 'manual', 'honeycomb'),
  ('civilizationoftheuniverse.com', 'Civilization', 'The cosmology', 'manual', 'honeycomb')
on conflict (domain) do nothing;

-- ───────────────────────────────────────────────────────────────────────
-- GROUPS (UNITE surface)
-- ───────────────────────────────────────────────────────────────────────
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null check (char_length(name) between 2 and 80),
  tagline text,
  description text,
  visibility text not null default 'public' check (visibility in ('public', 'private', 'secret')),
  created_by uuid not null references public.bees(id) on delete set null,
  -- composition: a group can live inside another group/event/forum/etc
  parent_surface surface_type,
  parent_id uuid,
  member_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists groups_parent_idx on public.groups(parent_surface, parent_id);
create index if not exists groups_creator_idx on public.groups(created_by);

create table if not exists public.group_memberships (
  group_id uuid not null references public.groups(id) on delete cascade,
  bee_id uuid not null references public.bees(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'moderator', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, bee_id)
);
create index if not exists group_memberships_bee_idx on public.group_memberships(bee_id);

-- ───────────────────────────────────────────────────────────────────────
-- EVENTS (RULE surface)
-- ───────────────────────────────────────────────────────────────────────
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 200),
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location_text text,
  location_coords point,
  is_virtual boolean not null default false,
  virtual_link text,
  created_by uuid not null references public.bees(id) on delete set null,
  -- composition: events can live inside groups, forum threads, chats, etc.
  parent_surface surface_type,
  parent_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists events_starts_at_idx on public.events(starts_at);
create index if not exists events_parent_idx on public.events(parent_surface, parent_id);

create table if not exists public.event_rsvps (
  event_id uuid not null references public.events(id) on delete cascade,
  bee_id uuid not null references public.bees(id) on delete cascade,
  status text not null default 'going' check (status in ('going', 'maybe', 'not_going')),
  created_at timestamptz not null default now(),
  primary key (event_id, bee_id)
);

-- ───────────────────────────────────────────────────────────────────────
-- FORUM (INTEL surface)
-- ───────────────────────────────────────────────────────────────────────
create table if not exists public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 300),
  body text not null,
  created_by uuid not null references public.bees(id) on delete set null,
  -- composition: forum thread can live inside a group, event, chat, etc.
  parent_surface surface_type,
  parent_id uuid,
  reply_count integer not null default 0,
  last_activity_at timestamptz not null default now(),
  is_locked boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists forum_threads_last_activity_idx on public.forum_threads(last_activity_at desc);
create index if not exists forum_threads_parent_idx on public.forum_threads(parent_surface, parent_id);

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.forum_threads(id) on delete cascade,
  bee_id uuid not null references public.bees(id) on delete set null,
  body text not null check (char_length(body) between 1 and 20000),
  parent_post_id uuid references public.forum_posts(id) on delete cascade,
  upvotes integer not null default 0,
  downvotes integer not null default 0,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index if not exists forum_posts_thread_idx on public.forum_posts(thread_id, created_at);

-- ───────────────────────────────────────────────────────────────────────
-- MESSAGES (COMMS surface)
-- ───────────────────────────────────────────────────────────────────────
create table if not exists public.message_threads (
  id uuid primary key default gen_random_uuid(),
  -- nullable for group comms threads
  parent_surface surface_type,
  parent_id uuid,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create index if not exists message_threads_last_idx on public.message_threads(last_message_at desc);

create table if not exists public.message_participants (
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  bee_id uuid not null references public.bees(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (thread_id, bee_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  bee_id uuid not null references public.bees(id) on delete set null,
  body text not null check (char_length(body) between 1 and 10000),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index if not exists messages_thread_idx on public.messages(thread_id, created_at);

-- ───────────────────────────────────────────────────────────────────────
-- CHATS (CHAT surface — live video rooms)
-- ───────────────────────────────────────────────────────────────────────
create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  topic text,
  is_live boolean not null default false,
  max_participants integer not null default 10,
  created_by uuid not null references public.bees(id) on delete set null,
  parent_surface surface_type,
  parent_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists chat_rooms_live_idx on public.chat_rooms(is_live) where is_live;
create index if not exists chat_rooms_parent_idx on public.chat_rooms(parent_surface, parent_id);

-- ───────────────────────────────────────────────────────────────────────
-- BAZAAR LISTINGS
-- ───────────────────────────────────────────────────────────────────────
create table if not exists public.bazaar_listings (
  id uuid primary key default gen_random_uuid(),
  offered_by uuid not null references public.bees(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 200),
  description text,
  listing_type text not null check (listing_type in ('offer', 'wanted', 'auction', 'raffle')),
  category text,
  price_bling numeric(20, 2),
  price_usd_equivalent numeric(10, 2),
  condition text check (condition in ('new', 'used', 'service', 'digital')),
  status text not null default 'active' check (status in ('active', 'pending', 'fulfilled', 'cancelled')),
  parent_surface surface_type,
  parent_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bazaar_status_idx on public.bazaar_listings(status, created_at desc);
create index if not exists bazaar_parent_idx on public.bazaar_listings(parent_surface, parent_id);

-- ───────────────────────────────────────────────────────────────────────
-- GIVE CAMPAIGNS (Crowdfunding)
-- ───────────────────────────────────────────────────────────────────────
create table if not exists public.give_campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  goal_bling numeric(20, 2),
  raised_bling numeric(20, 2) not null default 0,
  created_by uuid not null references public.bees(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'fulfilled', 'cancelled')),
  parent_surface surface_type,
  parent_id uuid,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.give_contributions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.give_campaigns(id) on delete cascade,
  bee_id uuid not null references public.bees(id) on delete set null,
  amount_bling numeric(20, 2) not null check (amount_bling > 0),
  message text,
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists give_contributions_campaign_idx on public.give_contributions(campaign_id);

-- ───────────────────────────────────────────────────────────────────────
-- UNIVERSAL ATOM LINKS
-- Any entity (group, event, thread, post, message, listing, campaign)
-- can link to Manual atoms. This is the composition-to-Manual bridge.
-- ───────────────────────────────────────────────────────────────────────
create table if not exists public.entity_atom_links (
  id uuid primary key default gen_random_uuid(),
  source_surface surface_type not null,
  source_id uuid not null,
  atom_id text not null,
  link_type text not null default 'reference' check (
    link_type in ('reference', 'evidence', 'rebuttal', 'context', 'pinned')
  ),
  created_by uuid not null references public.bees(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists atom_links_source_idx on public.entity_atom_links(source_surface, source_id);
create index if not exists atom_links_atom_idx on public.entity_atom_links(atom_id);
create unique index if not exists atom_links_unique_idx on public.entity_atom_links(source_surface, source_id, atom_id, link_type);

-- ───────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- Pattern: everyone can read public content, authenticated Bees can
-- create/edit their own.
-- ───────────────────────────────────────────────────────────────────────
alter table public.pillars enable row level security;
alter table public.groups enable row level security;
alter table public.group_memberships enable row level security;
alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.forum_threads enable row level security;
alter table public.forum_posts enable row level security;
alter table public.message_threads enable row level security;
alter table public.message_participants enable row level security;
alter table public.messages enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.bazaar_listings enable row level security;
alter table public.give_campaigns enable row level security;
alter table public.give_contributions enable row level security;
alter table public.entity_atom_links enable row level security;

-- Pillars: public read, admin-only write (for now only service role)
drop policy if exists "pillars_public_read" on public.pillars;
create policy "pillars_public_read" on public.pillars for select using (true);

-- Helper: generic "public read, owner write" policies
-- Groups
drop policy if exists "groups_public_read" on public.groups;
create policy "groups_public_read" on public.groups for select
  using (visibility = 'public' or exists (
    select 1 from public.group_memberships m where m.group_id = id and m.bee_id = auth.uid()
  ));
drop policy if exists "groups_insert_own" on public.groups;
create policy "groups_insert_own" on public.groups for insert
  with check (auth.uid() = created_by);
drop policy if exists "groups_update_owner" on public.groups;
create policy "groups_update_owner" on public.groups for update
  using (auth.uid() = created_by) with check (auth.uid() = created_by);

-- Group memberships
drop policy if exists "group_memberships_public_read" on public.group_memberships;
create policy "group_memberships_public_read" on public.group_memberships for select using (true);
drop policy if exists "group_memberships_self_join" on public.group_memberships;
create policy "group_memberships_self_join" on public.group_memberships for insert
  with check (auth.uid() = bee_id);
drop policy if exists "group_memberships_self_leave" on public.group_memberships;
create policy "group_memberships_self_leave" on public.group_memberships for delete
  using (auth.uid() = bee_id);

-- Events
drop policy if exists "events_public_read" on public.events;
create policy "events_public_read" on public.events for select using (true);
drop policy if exists "events_insert_own" on public.events;
create policy "events_insert_own" on public.events for insert with check (auth.uid() = created_by);
drop policy if exists "events_update_own" on public.events;
create policy "events_update_own" on public.events for update using (auth.uid() = created_by);

-- Event RSVPs
drop policy if exists "rsvps_public_read" on public.event_rsvps;
create policy "rsvps_public_read" on public.event_rsvps for select using (true);
drop policy if exists "rsvps_self" on public.event_rsvps;
create policy "rsvps_self" on public.event_rsvps for insert with check (auth.uid() = bee_id);
drop policy if exists "rsvps_self_update" on public.event_rsvps;
create policy "rsvps_self_update" on public.event_rsvps for update using (auth.uid() = bee_id);

-- Forum threads
drop policy if exists "forum_threads_public_read" on public.forum_threads;
create policy "forum_threads_public_read" on public.forum_threads for select using (true);
drop policy if exists "forum_threads_insert_own" on public.forum_threads;
create policy "forum_threads_insert_own" on public.forum_threads for insert with check (auth.uid() = created_by);
drop policy if exists "forum_threads_update_own" on public.forum_threads;
create policy "forum_threads_update_own" on public.forum_threads for update using (auth.uid() = created_by);

-- Forum posts
drop policy if exists "forum_posts_public_read" on public.forum_posts;
create policy "forum_posts_public_read" on public.forum_posts for select using (true);
drop policy if exists "forum_posts_insert_own" on public.forum_posts;
create policy "forum_posts_insert_own" on public.forum_posts for insert with check (auth.uid() = bee_id);
drop policy if exists "forum_posts_update_own" on public.forum_posts;
create policy "forum_posts_update_own" on public.forum_posts for update using (auth.uid() = bee_id);

-- Message threads (only participants can read)
drop policy if exists "message_threads_participant_read" on public.message_threads;
create policy "message_threads_participant_read" on public.message_threads for select
  using (exists (
    select 1 from public.message_participants p where p.thread_id = id and p.bee_id = auth.uid()
  ));

-- Message participants
drop policy if exists "participants_read_own" on public.message_participants;
create policy "participants_read_own" on public.message_participants for select
  using (auth.uid() = bee_id or exists (
    select 1 from public.message_participants p where p.thread_id = thread_id and p.bee_id = auth.uid()
  ));

-- Messages
drop policy if exists "messages_participant_read" on public.messages;
create policy "messages_participant_read" on public.messages for select
  using (exists (
    select 1 from public.message_participants p where p.thread_id = thread_id and p.bee_id = auth.uid()
  ));
drop policy if exists "messages_participant_write" on public.messages;
create policy "messages_participant_write" on public.messages for insert
  with check (auth.uid() = bee_id and exists (
    select 1 from public.message_participants p where p.thread_id = thread_id and p.bee_id = auth.uid()
  ));

-- Chat rooms
drop policy if exists "chat_rooms_public_read" on public.chat_rooms;
create policy "chat_rooms_public_read" on public.chat_rooms for select using (true);
drop policy if exists "chat_rooms_insert_own" on public.chat_rooms;
create policy "chat_rooms_insert_own" on public.chat_rooms for insert with check (auth.uid() = created_by);

-- Bazaar
drop policy if exists "bazaar_public_read" on public.bazaar_listings;
create policy "bazaar_public_read" on public.bazaar_listings for select using (true);
drop policy if exists "bazaar_insert_own" on public.bazaar_listings;
create policy "bazaar_insert_own" on public.bazaar_listings for insert with check (auth.uid() = offered_by);
drop policy if exists "bazaar_update_own" on public.bazaar_listings;
create policy "bazaar_update_own" on public.bazaar_listings for update using (auth.uid() = offered_by);

-- Give campaigns
drop policy if exists "give_public_read" on public.give_campaigns;
create policy "give_public_read" on public.give_campaigns for select using (true);
drop policy if exists "give_insert_own" on public.give_campaigns;
create policy "give_insert_own" on public.give_campaigns for insert with check (auth.uid() = created_by);
drop policy if exists "give_update_own" on public.give_campaigns;
create policy "give_update_own" on public.give_campaigns for update using (auth.uid() = created_by);

-- Give contributions
drop policy if exists "give_contribs_read_all" on public.give_contributions;
create policy "give_contribs_read_all" on public.give_contributions for select using (true);
drop policy if exists "give_contribs_insert_self" on public.give_contributions;
create policy "give_contribs_insert_self" on public.give_contributions for insert with check (auth.uid() = bee_id);

-- Entity atom links (anyone can read, creator can write)
drop policy if exists "atom_links_public_read" on public.entity_atom_links;
create policy "atom_links_public_read" on public.entity_atom_links for select using (true);
drop policy if exists "atom_links_insert_own" on public.entity_atom_links;
create policy "atom_links_insert_own" on public.entity_atom_links for insert with check (auth.uid() = created_by);
drop policy if exists "atom_links_delete_own" on public.entity_atom_links;
create policy "atom_links_delete_own" on public.entity_atom_links for delete using (auth.uid() = created_by);

-- ═══════════════════════════════════════════════════════════════════════
-- END OF SCHEMA v2
-- 15 new tables + composition via parent_surface/parent_id
-- + universal atom linking via entity_atom_links
-- ═══════════════════════════════════════════════════════════════════════
