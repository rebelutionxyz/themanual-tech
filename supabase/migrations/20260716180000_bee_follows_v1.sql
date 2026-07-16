-- ═══════════════════════════════════════════════════════════════════════
-- bee_follows_v1 — Bee → Bee follow graph (INTEL "Following" + future feeds)
--
-- Proposed 2026-07-16 (Intel menu completion session). Conventions per
-- TheMANUAL.tech/CLAUDE.md: RLS on, writes via SECDEF RPCs only, REVOKE
-- PUBLIC + auth.uid() guards (v9 hardening pattern), timestamptz defaults.
--
-- Feed usage: Following = forum_threads WHERE created_by IN (my follows).
-- Client reads its own edges directly (RLS-scoped); mutations via RPCs.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.bee_follows (
  follower_bee_id uuid not null references public.bees(id) on delete cascade,
  followed_bee_id uuid not null references public.bees(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_bee_id, followed_bee_id),
  constraint bee_follows_no_self check (follower_bee_id <> followed_bee_id)
);

comment on table public.bee_follows is
  'Bee→Bee follow edges. Source for INTEL Following feed (threads by followed authors). Writes only via bee_follow()/bee_unfollow(); RLS limits reads to edges you are on. bee_follows_v1 2026-07-16.';

-- Reverse lookup (followers-of-a-bee counts, future notifications fanout).
create index if not exists bee_follows_followed_idx
  on public.bee_follows (followed_bee_id);

alter table public.bee_follows enable row level security;

-- Read: only edges you are on (your Following list / your followers).
-- No INSERT/UPDATE/DELETE policies → direct writes denied; RPCs only.
drop policy if exists bee_follows_read_own on public.bee_follows;
create policy bee_follows_read_own on public.bee_follows
  for select using (follower_bee_id = auth.uid() or followed_bee_id = auth.uid());

-- ── follow ────────────────────────────────────────────────────────────
create or replace function public.bee_follow(p_followed uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_inserted boolean := false;
begin
  if v_me is null then
    raise exception 'auth required';
  end if;
  if p_followed is null or p_followed = v_me then
    raise exception 'invalid follow target';
  end if;
  if not exists (select 1 from bees where id = p_followed) then
    raise exception 'no such bee';
  end if;

  insert into bee_follows (follower_bee_id, followed_bee_id)
  values (v_me, p_followed)
  on conflict (follower_bee_id, followed_bee_id) do nothing;
  v_inserted := found;

  -- One notification on the first follow only (no re-follow spam).
  -- Direct insert matches house style (trg_forum_post_reply_notify);
  -- failure never blocks the follow itself.
  if v_inserted then
    begin
      insert into notifications
        (recipient_bee_id, actor_bee_id, type, entity_type, entity_id, title)
      select p_followed, v_me, 'follow', 'bee', v_me::text,
             '@' || coalesce(handle, 'a Bee') || ' is now following you'
        from bees where id = v_me;
    exception when others then
      raise warning 'follow notify failed: %', sqlerrm;
    end;
  end if;

  return jsonb_build_object('ok', true, 'following', true);
end
$$;

-- ── unfollow ──────────────────────────────────────────────────────────
create or replace function public.bee_unfollow(p_followed uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'auth required';
  end if;
  delete from bee_follows
   where follower_bee_id = v_me and followed_bee_id = p_followed;
  return jsonb_build_object('ok', true, 'following', false);
end
$$;

-- v9 hardening: no PUBLIC execute; signed-in Bees only.
revoke all on function public.bee_follow(uuid) from public;
revoke all on function public.bee_unfollow(uuid) from public;
grant execute on function public.bee_follow(uuid) to authenticated;
grant execute on function public.bee_unfollow(uuid) to authenticated;
