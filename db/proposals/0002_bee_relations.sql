-- ═══════════════════════════════════════════════════════════════════════
-- PROFILE4 · 0002_bee_relations — distinct social-graph relation types
--
-- PROPOSE-FIRST (SQL_AUTONOMY v1.1 + dispatch: do NOT stamp the ledger). Authored,
-- NOT applied. ROLLBACK: db/proposals/0002_bee_relations_rollback.sql.
--
-- WHAT / WHY (PROFILE_SPEC v0.1 "SOCIAL GRAPH (all patchboard-gated, per-relation)").
-- FOLLOW already exists (public.bee_follows, one-way) and is UNCHANGED. This adds
-- the other relation types as DISTINCT edges:
--   subscribe   one-way creator-content relation (immediate).
--   contact     one-way, PRIVATE to the owner (an address book; the target does
--               not see it).
--   friend      MUTUAL — a request the target accepts (pending → accepted).
--   connection  MUTUAL — same request/accept shape as friend.
-- Writes go through SECDEF RPCs only (no direct-write policies), mirroring
-- bee_follow/bee_unfollow. Public COUNTS come from a SECDEF function so RLS can
-- stay strict on the rows while the profile still shows a number.
--
-- Conventions: RLS on; bees.id = auth.uid(); SECDEF writes; named-role grants.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.bee_relations (
  from_bee_id   uuid not null references public.bees(id) on delete cascade,
  to_bee_id     uuid not null references public.bees(id) on delete cascade,
  relation_type text not null
    check (relation_type in ('friend', 'connection', 'contact', 'subscribe')),
  status        text not null default 'accepted'
    check (status in ('pending', 'accepted')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (from_bee_id, to_bee_id, relation_type),
  constraint bee_relations_no_self check (from_bee_id <> to_bee_id)
);

comment on table public.bee_relations is
  'Distinct Bee↔Bee relations beyond follow: subscribe (one-way), contact (one-way, private), friend/connection (mutual, request→accept). Writes only via bee_relation_* RPCs. PROFILE4 2026-08-22.';

-- Reverse lookups: subscribers-of / requests-to a Bee.
create index if not exists bee_relations_to_idx
  on public.bee_relations (to_bee_id, relation_type, status);

alter table public.bee_relations enable row level security;

-- Read: an edge is visible to its endpoints — EXCEPT a contact, which is
-- private to the owner (from_bee) only.
drop policy if exists bee_relations_read on public.bee_relations;
create policy bee_relations_read on public.bee_relations
  for select using (
    from_bee_id = auth.uid()
    or (to_bee_id = auth.uid() and relation_type <> 'contact')
  );

-- No INSERT/UPDATE/DELETE policies → direct writes denied; RPCs only.

-- ── request / create an edge ────────────────────────────────────────────────
create or replace function public.bee_relation_request(p_to uuid, p_type text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_status text;
begin
  if v_me is null then
    raise exception 'auth required';
  end if;
  if p_to is null or p_to = v_me then
    raise exception 'invalid relation target';
  end if;
  if p_type not in ('friend', 'connection', 'contact', 'subscribe') then
    raise exception 'invalid relation type';
  end if;
  if not exists (select 1 from bees where id = p_to) then
    raise exception 'no such bee';
  end if;

  -- Mutual types open pending; one-way types are immediate.
  v_status := case when p_type in ('friend', 'connection') then 'pending' else 'accepted' end;

  insert into bee_relations (from_bee_id, to_bee_id, relation_type, status)
  values (v_me, p_to, p_type, v_status)
  on conflict (from_bee_id, to_bee_id, relation_type) do nothing;

  -- Best-effort notify (never blocks the write), mirroring bee_follow().
  begin
    insert into notifications
      (recipient_bee_id, actor_bee_id, type, entity_type, entity_id, title)
    select p_to, v_me, p_type, 'bee', v_me::text,
           '@' || coalesce(handle, 'a Bee') ||
           case when v_status = 'pending' then ' sent you a ' || p_type || ' request'
                when p_type = 'subscribe' then ' subscribed to you'
                else ' added you as a ' || p_type end
      from bees where id = v_me;
  exception when others then
    raise warning 'relation notify failed: %', sqlerrm;
  end;

  return jsonb_build_object('ok', true, 'type', p_type, 'status', v_status);
end
$$;

-- ── accept a pending mutual request (caller is the target) ──────────────────
create or replace function public.bee_relation_accept(p_from uuid, p_type text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'auth required';
  end if;
  if p_type not in ('friend', 'connection') then
    raise exception 'only friend/connection requests are accepted';
  end if;

  update bee_relations
     set status = 'accepted', updated_at = now()
   where from_bee_id = p_from and to_bee_id = v_me
     and relation_type = p_type and status = 'pending';

  if not found then
    raise exception 'no pending % request from that bee', p_type;
  end if;
  return jsonb_build_object('ok', true, 'type', p_type, 'status', 'accepted');
end
$$;

-- ── remove an edge (either direction the caller is on) ──────────────────────
create or replace function public.bee_relation_remove(p_other uuid, p_type text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'auth required';
  end if;
  delete from bee_relations
   where relation_type = p_type
     and ( (from_bee_id = v_me and to_bee_id = p_other)
        or (to_bee_id = v_me and from_bee_id = p_other) );
  return jsonb_build_object('ok', true, 'type', p_type, 'removed', true);
end
$$;

-- ── public count of accepted relations for a Bee ────────────────────────────
-- friend/connection: accepted edges on either side. subscribe: subscribers
-- (edges pointing TO the bee). contact: private — returns a count ONLY to the
-- owner, else 0. Lets the profile show counts without loosening row RLS.
create or replace function public.bee_relation_count(p_bee uuid, p_type text)
returns integer
language plpgsql stable security definer set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_n integer;
begin
  if p_type in ('friend', 'connection') then
    select count(*) into v_n from bee_relations
     where relation_type = p_type and status = 'accepted'
       and (from_bee_id = p_bee or to_bee_id = p_bee);
  elsif p_type = 'subscribe' then
    select count(*) into v_n from bee_relations
     where relation_type = 'subscribe' and to_bee_id = p_bee;
  elsif p_type = 'contact' then
    if v_me is null or v_me <> p_bee then
      return 0;                       -- contacts are private to the owner
    end if;
    select count(*) into v_n from bee_relations
     where relation_type = 'contact' and from_bee_id = p_bee;
  else
    raise exception 'invalid relation type';
  end if;
  return coalesce(v_n, 0);
end
$$;

-- ── Grants (named roles; REVOKE PUBLIC + anon-execute stance from v9) ────────
revoke all on public.bee_relations from public;
grant select on public.bee_relations to authenticated;   -- rows still RLS-scoped

revoke all on function public.bee_relation_request(uuid, text) from public;
revoke all on function public.bee_relation_accept(uuid, text)  from public;
revoke all on function public.bee_relation_remove(uuid, text)  from public;
revoke all on function public.bee_relation_count(uuid, text)   from public;
revoke execute on function public.bee_relation_request(uuid, text) from anon;
revoke execute on function public.bee_relation_accept(uuid, text)  from anon;
revoke execute on function public.bee_relation_remove(uuid, text)  from anon;
grant execute on function public.bee_relation_request(uuid, text) to authenticated;
grant execute on function public.bee_relation_accept(uuid, text)  to authenticated;
grant execute on function public.bee_relation_remove(uuid, text)  to authenticated;
-- Counts are public (a signed-out visitor sees them); contact is guarded inside.
grant execute on function public.bee_relation_count(uuid, text) to anon, authenticated;
