-- ============================================================
-- COMMUNITY INSTANCE LAYER v1  (ATLAS_FURBO1, SQL_AUTONOMY v1, 2026-08-20)
--
-- The generic, SHARED instance layer for gated hives over the existing HONEYCOMB
-- community engines (groups / forum / events / profiles). Atlas Furbo (men-only,
-- this pass) and Sis Amore (women-only, SIS_AMORE1) BOTH use these tables — each
-- is one row in community_instances, NOT a fork of the engines. Additive-only:
-- nothing here touches the built bling_* core or any existing table's semantics.
--
-- Coordination note: authored idempotent (CREATE ... IF NOT EXISTS) so a race
-- with SIS_AMORE1 is safe — whichever twin applies first defines the shape and
-- the other shares it. Neither had applied it at author time (verified).
--
-- ROLLBACK (authored first, per SQL_AUTONOMY). Reverses this migration exactly:
--   drop table if exists public.instance_bubble_up      cascade;
--   drop table if exists public.instance_store_listings cascade;
--   drop table if exists public.instance_memberships    cascade;
--   drop table if exists public.community_instances     cascade;
-- (Also full file: atlas-furbo/db/proposals/0001_community_instances_v1_rollback.sql)
-- ============================================================

-- ---------------- The instance registry ----------------
create table if not exists public.community_instances (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  tagline     text,
  gender_gate text not null default 'none' check (gender_gate in ('men','women','none')),
  brand       jsonb not null default '{}'::jsonb,
  store_url   text,
  created_at  timestamptz not null default now()
);

-- ---------------- The membership WALL ----------------
create table if not exists public.instance_memberships (
  instance_id uuid not null references public.community_instances(id) on delete cascade,
  bee_id      uuid not null references auth.users(id) on delete cascade,
  status      text not null default 'pending'
                check (status in ('invited','pending','verified','member','declined')),
  invite_code text,
  invited_by  uuid references auth.users(id),
  verified_at timestamptz,
  created_at  timestamptz not null default now(),
  primary key (instance_id, bee_id)
);
create index if not exists instance_memberships_bee_idx on public.instance_memberships(bee_id);

-- ---------------- The brand store (Etzy fiat merch) ----------------
create table if not exists public.instance_store_listings (
  id              uuid primary key default gen_random_uuid(),
  instance_id     uuid not null references public.community_instances(id) on delete cascade,
  title           text not null,
  blurb           text,
  price_usd_cents bigint not null default 0 check (price_usd_cents >= 0),
  image_label     text,
  external_url    text,
  status          text not null default 'active' check (status in ('active','hidden')),
  created_at      timestamptz not null default now()
);
create index if not exists instance_store_instance_idx on public.instance_store_listings(instance_id);

-- ---------------- Bubble-up (one-way surfacing permission) ----------------
create table if not exists public.instance_bubble_up (
  id            uuid primary key default gen_random_uuid(),
  instance_id   uuid not null references public.community_instances(id) on delete cascade,
  bee_id        uuid not null references auth.users(id) on delete cascade,
  source_engine text not null check (source_engine in ('group','forum_thread','event','listing')),
  source_id     uuid,
  title         text not null,
  target_tld    text not null,
  bubble_up     boolean not null default false,   -- default PRIVATE; one-way up
  bubbled_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists instance_bubble_up_surfaced_idx
  on public.instance_bubble_up(target_tld) where bubble_up = true;

-- ============================================================
-- RLS — on every table (SQL_AUTONOMY). Grants to NAMED roles, never PUBLIC.
-- ============================================================
alter table public.community_instances    enable row level security;
alter table public.instance_memberships   enable row level security;
alter table public.instance_store_listings enable row level security;
alter table public.instance_bubble_up      enable row level security;

-- Instances: the registry + brand are public (the wall is public-facing).
drop policy if exists ci_read on public.community_instances;
create policy ci_read on public.community_instances for select using (true);

-- Memberships: a Bee sees ONLY their own row; may APPLY (insert pending) and
-- re-apply (update to pending). Promotion to verified/member is a service-role
-- action (bypasses RLS) — a member can NEVER self-promote (the update check
-- pins status to 'pending').
drop policy if exists im_read_own on public.instance_memberships;
create policy im_read_own on public.instance_memberships for select using (bee_id = auth.uid());
drop policy if exists im_insert_own on public.instance_memberships;
create policy im_insert_own on public.instance_memberships for insert
  with check (bee_id = auth.uid() and status = 'pending');
drop policy if exists im_update_own on public.instance_memberships;
create policy im_update_own on public.instance_memberships for update
  using (bee_id = auth.uid()) with check (bee_id = auth.uid() and status = 'pending');

-- Store: public reads active listings; writes are service-role only (no policy).
drop policy if exists sl_read on public.instance_store_listings;
create policy sl_read on public.instance_store_listings for select using (status = 'active');

-- Bubble-up: a Bee reads/writes their OWN rows; anyone reads SURFACED rows
-- (bubble_up = true) — that is the whole point, the surfaced content is public
-- UP. Nothing here lets a rebelution face write down into the hive.
drop policy if exists bu_read_own on public.instance_bubble_up;
create policy bu_read_own on public.instance_bubble_up for select using (bee_id = auth.uid());
drop policy if exists bu_read_surfaced on public.instance_bubble_up;
create policy bu_read_surfaced on public.instance_bubble_up for select using (bubble_up = true);
drop policy if exists bu_write_own on public.instance_bubble_up;
create policy bu_write_own on public.instance_bubble_up for all
  using (bee_id = auth.uid()) with check (bee_id = auth.uid());

-- Grants to named roles (never PUBLIC). RLS gates the rows.
grant select on public.community_instances    to anon, authenticated;
grant select on public.instance_store_listings to anon, authenticated;
grant select on public.instance_bubble_up      to anon, authenticated;
grant select, insert, update on public.instance_memberships to authenticated;
grant insert, update, delete on public.instance_bubble_up    to authenticated;

-- ---------------- Seed: the Atlas Furbo instance row (config, idempotent) ----------------
insert into public.community_instances (slug, name, tagline, gender_gate, store_url)
values ('atlas-furbo', 'Atlas Furbo',
        'The Brotherhood - a men-only hive under Atlas Nation.', 'men', null)
on conflict (slug) do nothing;
