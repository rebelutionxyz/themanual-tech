-- schema-v6-reactions-saves-shares.sql
-- Universal Post Phase 1: 5 reactions + save/bookmark + share with tracking
-- Applies to threads and reply posts across any surface (intel, bazaar, etc.)

-- ═══════════════════════════════════════════════════════════════════
-- REACTIONS — 5 locked types: honey, fire, thinking, warning, check
-- ═══════════════════════════════════════════════════════════════════

create table if not exists entity_reactions (
  id             uuid primary key default gen_random_uuid(),
  source_surface text not null,                   -- 'intel', 'bazaar', etc.
  source_id      text not null,                   -- thread_id or post_id
  source_kind    text not null check (source_kind in ('thread', 'post')),
  reaction       text not null check (reaction in ('honey','fire','thinking','warning','check')),
  bee_id         uuid not null,
  created_at     timestamptz not null default now(),
  unique(source_id, reaction, bee_id)
);

create index if not exists idx_reactions_source
  on entity_reactions(source_surface, source_id);
create index if not exists idx_reactions_bee
  on entity_reactions(bee_id);

alter table entity_reactions enable row level security;

create policy "reactions_read_all"
  on entity_reactions for select
  using (true);

create policy "reactions_insert_own"
  on entity_reactions for insert
  with check (bee_id = auth.uid());

create policy "reactions_delete_own"
  on entity_reactions for delete
  using (bee_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════
-- SAVES — Bee bookmarks (one per Bee per thread)
-- ═══════════════════════════════════════════════════════════════════

create table if not exists entity_saves (
  id             uuid primary key default gen_random_uuid(),
  source_surface text not null,
  source_id      text not null,                   -- thread_id (currently threads only)
  bee_id         uuid not null,
  created_at     timestamptz not null default now(),
  unique(source_id, bee_id)
);

create index if not exists idx_saves_bee
  on entity_saves(bee_id, created_at desc);
create index if not exists idx_saves_source
  on entity_saves(source_surface, source_id);

alter table entity_saves enable row level security;

create policy "saves_read_own"
  on entity_saves for select
  using (bee_id = auth.uid());

create policy "saves_insert_own"
  on entity_saves for insert
  with check (bee_id = auth.uid());

create policy "saves_delete_own"
  on entity_saves for delete
  using (bee_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════
-- SHARES — Tracks share link creation for future affiliate attribution
-- (Per Universal Post Architecture: Fibonacci weights, 30-day window)
-- ═══════════════════════════════════════════════════════════════════

create table if not exists entity_shares (
  id             uuid primary key default gen_random_uuid(),
  source_surface text not null,
  source_id      text not null,
  shared_by      uuid not null,                   -- Bee who generated the link
  share_token    text not null unique,            -- short unique token for URL
  created_at     timestamptz not null default now()
);

create index if not exists idx_shares_source
  on entity_shares(source_surface, source_id);
create index if not exists idx_shares_sharer
  on entity_shares(shared_by);

alter table entity_shares enable row level security;

create policy "shares_read_all"
  on entity_shares for select
  using (true);

create policy "shares_insert_own"
  on entity_shares for insert
  with check (shared_by = auth.uid());
