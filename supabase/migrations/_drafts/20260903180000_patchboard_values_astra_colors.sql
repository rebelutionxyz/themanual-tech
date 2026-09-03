-- PATCHBOARD VALUES — astra colours on the Patchboard.
-- Owner ruling 2026-09-03: "All colors can be changed in the patchboard for all
-- astras", and the Bee level "can also be turned on and off for each level in
-- the patchboard - like all settings."
--
-- PROPOSE-FIRST. NOT APPLIED. This sits in _drafts alongside the rest of the
-- PATCHBOARD1 db lane, which has not landed either: as of this writing NEITHER
-- patchboard_settings NOR patchboard_switches NOR patchboard_providers exists in
-- the live database. The frontend resolver is floor-safe and reads code defaults,
-- so nothing is broken today -- but nothing persists either. Apply the
-- PATCHBOARD1 migrations first; this one is meaningless without them.
--
-- WHY A SECOND TABLE INSTEAD OF REUSING patchboard_settings:
-- a switch carries a boolean, a colour carries a value. Widening `enabled` to
-- jsonb would make every existing switch read nullable-and-typeless for the sake
-- of one value type. patchboard_values is the sibling table for keys whose answer
-- is not yes/no; astra_colors is its first tenant, and the two share the same
-- scope encoding so the resolver logic is the same shape in both.

create table if not exists public.patchboard_values (
  id          uuid primary key default gen_random_uuid(),
  value_key   text not null,
  -- SCOPE IS ENCODED BY CARDINALITY, exactly as patchboard_settings does it
  -- (patchboard-pattern 8.2), so the resolver folds both tables identically:
  --   (bee_id, astra_id) -> this Bee's override for this astra
  --   (bee_id, null)     -> this Bee's platform-wide preference
  --   (null,   astra_id) -> that astra's value (Master admin OR its Director;
  --                         authority is an RLS/RPC question, not a row shape)
  --   (null,   null)     -> the Master baseline across every astra
  bee_id      uuid references public.bees (id) on delete cascade,
  astra_id    uuid references public.astra_registry (id) on delete cascade,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.bees (id),
  -- One row per (key, scope). Nulls do not collide in a plain unique index, so
  -- the scope pairs are pinned by three partial uniques plus the full one.
  constraint patchboard_values_value_obj check (jsonb_typeof(value) = 'object')
);

create unique index if not exists patchboard_values_bee_astra_uq
  on public.patchboard_values (value_key, bee_id, astra_id)
  where bee_id is not null and astra_id is not null;
create unique index if not exists patchboard_values_bee_platform_uq
  on public.patchboard_values (value_key, bee_id)
  where bee_id is not null and astra_id is null;
create unique index if not exists patchboard_values_astra_uq
  on public.patchboard_values (value_key, astra_id)
  where bee_id is null and astra_id is not null;
create unique index if not exists patchboard_values_master_uq
  on public.patchboard_values (value_key)
  where bee_id is null and astra_id is null;

create index if not exists patchboard_values_key_bee_idx
  on public.patchboard_values (value_key, bee_id);

comment on table public.patchboard_values is
  'Patchboard values (MMF 36) for keys whose answer is not a boolean. Scope is encoded by (bee_id, astra_id) cardinality, same as patchboard_settings. First tenant: value_key=astra_colors, holding {accent, accentDim, accentBg, displayFace}. The FLOOR when no row matches is src/lib/shell/astraTokens.ts, not a row here - a missing row means the code default holds.';

alter table public.patchboard_values enable row level security;

-- READ: a Bee reads the non-Bee scopes (Astra + Master defaults) and their own
-- rows, and nobody else's. Colour is not secret, but a Bee's personal overrides
-- are theirs; there is no reason for one Bee's palette to be readable by another.
create policy patchboard_values_read_scoped on public.patchboard_values
  for select to authenticated
  using (bee_id is null or bee_id = public.current_bee_id());

-- READ (anon): the shared scopes only, so a logged-out visitor still gets the
-- astra's real colours rather than the code floor.
create policy patchboard_values_read_anon on public.patchboard_values
  for select to anon
  using (bee_id is null);

-- WRITE: none. Deliberately no insert/update/delete policy — writes go through
-- SECURITY DEFINER RPCs (patchboard_set_value / patchboard_clear_value, to be
-- written with the PATCHBOARD1 write lane) so the three authority rules live in
-- one auditable place rather than in a policy expression:
--   bee scope   -> the Bee themselves, and only while astra_colors.bee_override
--                  resolves ON for them
--   astra scope -> that astra's Director, or a platform admin
--   master      -> platform admin only
-- A level's enable switch is checked at WRITE time as well as at read time, so a
-- switched-off level cannot quietly accumulate rows that spring to life later.

-- THE THREE LEVEL SWITCHES. Ordinary soft switches, so they default ON via
-- registry.systemDefaultFor() and the owner's "all colors can be changed for all
-- astras" holds with no rows at all. Seeding them explicitly at Master scope
-- makes them visible in the Patchboard admin UI instead of implicit.
-- Uncomment once patchboard_settings exists:
--
-- insert into public.patchboard_settings (switch_key, bee_id, astra_id, enabled)
-- values ('astra_colors.bee_override',    null, null, true),
--        ('astra_colors.astra_override',  null, null, true),
--        ('astra_colors.master_override', null, null, true)
-- on conflict do nothing;
