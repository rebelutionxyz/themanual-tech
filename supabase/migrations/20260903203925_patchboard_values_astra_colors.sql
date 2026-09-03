-- PATCHBOARD VALUES — astra colours on the Patchboard.
-- Owner ruling 2026-09-03: "All colors can be changed in the patchboard for all
-- astras", and the Bee level "can also be turned on and off for each level in
-- the patchboard - like all settings."
--
-- STATUS: promoted 2026-09-03 for apply under PATCHBOARD_DB2 (named dispatch,
-- pre-flight recorded in TheMANUAL.tech/REPORT.md, rollback authored first at
-- supabase/migrations/_drafts/20260903210000_patchboard_values_astra_colors_rollback.sql,
-- ask-gated human click). patchboard_settings/patchboard_switches/patchboard_providers
-- (PATCHBOARD1) are live (PATCHBOARD_DB1, applied 2026-09-03), so the switch
-- checks below and the seed block resolve against real rows, not the code floor.
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
  using (bee_id is null or bee_id = auth.uid());

-- READ (anon): the shared scopes only, so a logged-out visitor still gets the
-- astra's real colours rather than the code floor.
create policy patchboard_values_read_anon on public.patchboard_values
  for select to anon
  using (bee_id is null);

-- WRITE: none. Deliberately no insert/update/delete policy — writes go through
-- SECURITY DEFINER RPCs (patchboard_set_value / patchboard_clear_value, below)
-- so the three authority rules live in one auditable place rather than in a
-- policy expression:
--   bee scope   -> the Bee themselves, and only while astra_colors.bee_override
--                  resolves ON for them
--   astra scope -> that astra's Director, or a platform admin
--   master      -> platform admin only
-- A level's enable switch is checked at WRITE (set) time, so a switched-off
-- level cannot quietly accumulate rows that spring to life later. Clearing an
-- existing value is always allowed regardless of the switch — removing an
-- override can never cause the accumulation problem the switch guards against.

-- ── Write RPCs ────────────────────────────────────────────────────────────
create or replace function public.patchboard_set_value(
  p_value_key text, p_bee_id uuid, p_astra_id uuid, p_value jsonb
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if jsonb_typeof(p_value) is distinct from 'object' then
    raise exception 'value must be a jsonb object';
  end if;

  if p_bee_id is not null then
    if auth.uid() is null or auth.uid() <> p_bee_id then
      raise exception 'may only set your own values';
    end if;
    if not public.get_effective_switch_state(p_bee_id, p_astra_id, 'astra_colors.bee_override') then
      raise exception 'bee-level overrides are switched off';
    end if;
  elsif p_astra_id is not null then
    if not (
      public.is_platform_admin()
      or exists (
        select 1 from public.astra_registry
         where id = p_astra_id and director_bee_id = auth.uid()
      )
    ) then
      raise exception 'astra director or admin required';
    end if;
    if not public.get_effective_switch_state(null, p_astra_id, 'astra_colors.astra_override') then
      raise exception 'astra-level overrides are switched off';
    end if;
  else
    if not public.is_platform_admin() then
      raise exception 'admin required';
    end if;
    if not public.get_effective_switch_state(null, null, 'astra_colors.master_override') then
      raise exception 'master-level overrides are switched off';
    end if;
  end if;

  if p_bee_id is not null and p_astra_id is not null then
    insert into public.patchboard_values (value_key, bee_id, astra_id, value, updated_by)
    values (p_value_key, p_bee_id, p_astra_id, p_value, auth.uid())
    on conflict (value_key, bee_id, astra_id) where bee_id is not null and astra_id is not null
      do update set value = excluded.value, updated_at = now(), updated_by = auth.uid();
  elsif p_bee_id is not null then
    insert into public.patchboard_values (value_key, bee_id, astra_id, value, updated_by)
    values (p_value_key, p_bee_id, null, p_value, auth.uid())
    on conflict (value_key, bee_id) where bee_id is not null and astra_id is null
      do update set value = excluded.value, updated_at = now(), updated_by = auth.uid();
  elsif p_astra_id is not null then
    insert into public.patchboard_values (value_key, bee_id, astra_id, value, updated_by)
    values (p_value_key, null, p_astra_id, p_value, auth.uid())
    on conflict (value_key, astra_id) where bee_id is null and astra_id is not null
      do update set value = excluded.value, updated_at = now(), updated_by = auth.uid();
  else
    insert into public.patchboard_values (value_key, bee_id, astra_id, value, updated_by)
    values (p_value_key, null, null, p_value, auth.uid())
    on conflict (value_key) where bee_id is null and astra_id is null
      do update set value = excluded.value, updated_at = now(), updated_by = auth.uid();
  end if;
end $$;

comment on function public.patchboard_set_value(text, uuid, uuid, jsonb) is
  'Sets a Patchboard value at the (bee_id, astra_id)-encoded scope. Authority: bee scope = that Bee only, while bee_override resolves ON; astra scope = that astra''s Director or a platform admin, while astra_override resolves ON; master scope = platform admin only, while master_override resolves ON.';

create or replace function public.patchboard_clear_value(
  p_value_key text, p_bee_id uuid, p_astra_id uuid
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_bee_id is not null then
    if auth.uid() is null or auth.uid() <> p_bee_id then
      raise exception 'may only clear your own values';
    end if;
  elsif p_astra_id is not null then
    if not (
      public.is_platform_admin()
      or exists (
        select 1 from public.astra_registry
         where id = p_astra_id and director_bee_id = auth.uid()
      )
    ) then
      raise exception 'astra director or admin required';
    end if;
  else
    if not public.is_platform_admin() then
      raise exception 'admin required';
    end if;
  end if;

  delete from public.patchboard_values
   where value_key = p_value_key
     and bee_id is not distinct from p_bee_id
     and astra_id is not distinct from p_astra_id;
end $$;

comment on function public.patchboard_clear_value(text, uuid, uuid) is
  'Clears a Patchboard value at the (bee_id, astra_id)-encoded scope. Same authority as patchboard_set_value, but never gated by the level switch - removing an override cannot cause the accumulation problem the switch guards against.';

revoke all on function public.patchboard_set_value(text, uuid, uuid, jsonb) from public;
grant execute on function public.patchboard_set_value(text, uuid, uuid, jsonb) to authenticated;
revoke all on function public.patchboard_clear_value(text, uuid, uuid) from public;
grant execute on function public.patchboard_clear_value(text, uuid, uuid) to authenticated;

-- THE THREE LEVEL SWITCHES. Ordinary soft switches, so they default ON via
-- registry.systemDefaultFor() and the owner's "all colors can be changed for all
-- astras" holds with no rows at all. Seeding them explicitly at Master scope
-- makes them visible in the Patchboard admin UI instead of implicit.
-- patchboard_settings is live (PATCHBOARD_DB1) so this now applies cleanly.
insert into public.patchboard_settings (switch_key, bee_id, astra_id, enabled)
values ('astra_colors.bee_override',    null, null, true),
       ('astra_colors.astra_override',  null, null, true),
       ('astra_colors.master_override', null, null, true)
on conflict (switch_key, bee_id, astra_id) do nothing;
