-- HONEYCOMB connector mechanism. Implements the locked cross-realm doctrine:
-- ONE canonical atom per referent (single home in atoms); surfaced elsewhere via aliases; gathered into cross-cutting views via collections.
create table public.atom_aliases (
  id uuid primary key default gen_random_uuid(),
  atom_id text not null references public.atoms(id) on delete cascade,
  alias_path text not null,
  alias_realm_id text not null,
  alias_realm_name text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index atom_aliases_atom_path_uq on public.atom_aliases (atom_id, alias_path);
create index atom_aliases_atom_idx on public.atom_aliases (atom_id);
create index atom_aliases_realm_idx on public.atom_aliases (alias_realm_id);
alter table public.atom_aliases enable row level security;
create policy atom_aliases_read on public.atom_aliases for select using (
  exists (select 1 from public.atoms a where a.id = atom_aliases.atom_id and a.status = 'live') or is_platform_admin()
);
create table public.atom_collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  status text not null default 'live',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.atom_collections enable row level security;
create policy atom_collections_read on public.atom_collections for select using (
  status = 'live' or is_platform_admin()
);
create table public.atom_collection_members (
  collection_id uuid not null references public.atom_collections(id) on delete cascade,
  atom_id text not null references public.atoms(id) on delete cascade,
  ordinal int,
  note text,
  created_at timestamptz not null default now(),
  primary key (collection_id, atom_id)
);
create index acm_atom_idx on public.atom_collection_members (atom_id);
alter table public.atom_collection_members enable row level security;
create policy atom_collection_members_read on public.atom_collection_members for select using (
  (exists (select 1 from public.atom_collections c where c.id = atom_collection_members.collection_id and c.status = 'live')
   and exists (select 1 from public.atoms a where a.id = atom_collection_members.atom_id and a.status = 'live'))
  or is_platform_admin()
);
