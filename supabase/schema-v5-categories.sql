-- schema-v5-categories.sql
-- Multi-category tagging for posts (threads + replies)
-- Categories are non-leaf branches in the Manual taxonomy (L2, L3, L4, L5).
-- Distinct from entity_atom_links which targets specific atoms.

create table if not exists entity_category_links (
  id           uuid primary key default gen_random_uuid(),
  source_surface text not null,                -- 'intel', 'bazaar', etc.
  source_id    text not null,                  -- forum_threads.id or forum_posts.id
  category_path text not null,                 -- full path, e.g. "Power / INVESTIGATE / 9/11"
  created_by   uuid not null,
  created_at   timestamptz not null default now(),
  unique(source_surface, source_id, category_path)
);

create index if not exists idx_category_links_source
  on entity_category_links(source_surface, source_id);
create index if not exists idx_category_links_path
  on entity_category_links(category_path);

-- RLS: readable by anyone, insertable by authenticated users for their own rows
alter table entity_category_links enable row level security;

create policy "category_links_read_all"
  on entity_category_links for select
  using (true);

create policy "category_links_insert_own"
  on entity_category_links for insert
  with check (created_by = auth.uid());

create policy "category_links_delete_own"
  on entity_category_links for delete
  using (created_by = auth.uid());
