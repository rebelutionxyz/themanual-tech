-- ============================================================================
-- GAMEMATCH1 — the shared VS-WORLD layer (GAMES WAVE 2 Phase 1).
--   Lobby / matchmaking + open seats, async turn engine, per-game ELO ladder,
--   and the AI-seat primitive's persistence path. Every wave-2 game mounts this
--   for VS-WORLD and (same code path) solo-vs-AI play.
--
-- AUTHORITY: SQL_AUTONOMY v1 (owner 2026-08-20) — a DEPTH-wave code applies its
--   own ADDITIVE schema via execute_sql. Retained discipline honored here:
--     * ADDITIVE ONLY — four NEW `games_*` tables + new RPCs. No built table's
--       semantics touched; NOTHING under bling_* / fee_schedule / drops-drips /
--       stripe_events / subscriptions / fiat_operating_ledger read or written.
--     * ROLLBACK FIRST — stated in the block immediately below, before the apply.
--     * RLS on every new table; writes funnel through SECURITY DEFINER RPCs only.
--       Table-level write grants are REVOKED from the named roles anon +
--       authenticated (not PUBLIC), fixing — for these new tables — the broad
--       anon-write caution GAMESENGINE1 flagged on the older games_* tables.
--     * LEDGER + REPO PAIRING — this file lives under supabase/migrations/ and the
--       final statement records its version in supabase_migrations.schema_migrations.
--     * VERIFY AFTER — objects read back via information_schema, recorded in REPORT.
--   BACKUP LINE: no same-day pre-session backup exists (recorded in REPORT before
--   this apply). Mitigated by additive-only: the rollback is DROP of brand-new,
--   empty objects; no existing row is altered, so there is nothing to restore.
--
-- PRIMITIVES LAW (CONCEPTS v2 / GAMESENGINE1): one engine, one settlement path.
--   A `games_matches` row is the PLAY/TURN substrate — how a game is played move
--   by move. It is NOT a second pot: when a match is staked it mounts the existing
--   `competitions` session via `competition_id`, and settlement still flows through
--   `competition_settlements` (propose-first, DEPTH rails). Casual/solo play needs
--   no competition row at all.
--
-- CURRENCY_LAW v1 (BLiNG-only for games): this layer stores NO money. Stakes are
--   the competition's concern, propose-first; nothing here denominates value.
--
-- BUS: turn/lifecycle notices emit onto the DEPTH_BUS1 astra bus via
--   astra_emit_event(...). That function is NOT applied yet (bus is propose-first),
--   so every emit here is BEST-EFFORT inside an exception guard — a missing bus
--   never fails a move. The emit shape follows docs/astra-events-bus.md (astra
--   slug 'games'; event_type 'match.created' | 'match.started' | 'match.finished').
--
-- AI LICENSE LAW: the AI opponent is hand-rolled (generic minimax, src/lib/engine/
--   ai-seat.ts). No GPL engine, no stockfish.js. The DB only PERSISTS AI moves
--   (a participant submits them for the AI seat); it computes none.
--
-- ============================================================================
-- ROLLBACK (run ONLY to reverse this migration — reverses cleanly; all objects
-- are new and empty at apply time):
--
--   begin;
--   drop function if exists public.games_match_finish(uuid, text, smallint);
--   drop function if exists public.games_match_move(uuid, jsonb, jsonb, smallint);
--   drop function if exists public.games_match_join(uuid, text, smallint);
--   drop function if exists public.games_match_create(text, text, smallint, boolean, text, jsonb, jsonb);
--   drop function if exists public._games_rating_apply(uuid, text, integer, numeric);
--   drop table if exists public.games_match_turns cascade;
--   drop table if exists public.games_match_seats cascade;
--   drop table if exists public.games_ratings cascade;
--   drop table if exists public.games_matches cascade;
--   delete from supabase_migrations.schema_migrations where version = '20260820144500';
--   commit;
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. games_matches — one VS-WORLD / vs-AI / local game instance.
-- ---------------------------------------------------------------------------
create table if not exists public.games_matches (
  id             uuid primary key default gen_random_uuid(),
  game           text not null,                                   -- catalog key
  mode           text,                                            -- per-game mode
  status         text not null default 'open'
                   check (status in ('open','active','complete','abandoned')),
  kind           text not null default 'vs_world'
                   check (kind in ('vs_world','vs_ai','local')),
  is_ranked      boolean not null default true,
  seat_count     smallint not null default 2 check (seat_count between 1 and 8),
  current_seat   smallint not null default 0,
  turn_no        integer  not null default 0,
  state          jsonb    not null default '{}'::jsonb,           -- opaque game state
  result         text     check (result in ('win','draw','abandoned')),
  winner_seat    smallint,
  invite_token   text not null default replace(gen_random_uuid()::text, '-', ''),
  -- Staked play mounts the existing competition/settlement session; null = casual.
  competition_id uuid references public.competitions(id) on delete set null,
  created_by     uuid references public.bees(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  started_at     timestamptz,
  ended_at       timestamptz
);

create index if not exists games_matches_lobby_idx
  on public.games_matches (game, status, created_at desc);
create index if not exists games_matches_token_idx
  on public.games_matches (invite_token);
create index if not exists games_matches_creator_idx
  on public.games_matches (created_by, created_at desc);
create index if not exists games_matches_competition_idx
  on public.games_matches (competition_id) where competition_id is not null;

-- ---------------------------------------------------------------------------
-- 2. games_match_seats — the open-seat matchmaking + AI-seat primitive.
--    bee_id null AND is_ai false = an OPEN seat someone can join.
-- ---------------------------------------------------------------------------
create table if not exists public.games_match_seats (
  match_id      uuid not null references public.games_matches(id) on delete cascade,
  seat_no       smallint not null,
  bee_id        uuid references public.bees(id) on delete set null,
  is_ai         boolean not null default false,
  ai_difficulty text check (ai_difficulty in ('easy','medium','hard')),
  display_name  text,
  joined_at     timestamptz,
  primary key (match_id, seat_no),
  constraint games_seat_ai_has_difficulty check (not is_ai or ai_difficulty is not null),
  constraint games_seat_ai_has_no_bee     check (not is_ai or bee_id is null)
);

create index if not exists games_match_seats_bee_idx
  on public.games_match_seats (bee_id) where bee_id is not null;

-- ---------------------------------------------------------------------------
-- 3. games_match_turns — the async correspondence turn log.
-- ---------------------------------------------------------------------------
create table if not exists public.games_match_turns (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references public.games_matches(id) on delete cascade,
  seat_no    smallint not null,
  turn_no    integer not null,
  move       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (match_id, turn_no)
);

create index if not exists games_match_turns_match_idx
  on public.games_match_turns (match_id, turn_no);

-- ---------------------------------------------------------------------------
-- 4. games_ratings — per-game ELO ladder / leaderboard.
-- ---------------------------------------------------------------------------
create table if not exists public.games_ratings (
  bee_id       uuid not null references public.bees(id) on delete cascade,
  game         text not null,
  rating       integer not null default 1200,
  games_played integer not null default 0,
  wins         integer not null default 0,
  losses       integer not null default 0,
  draws        integer not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (bee_id, game)
);

create index if not exists games_ratings_ladder_idx
  on public.games_ratings (game, rating desc);

-- ---------------------------------------------------------------------------
-- 5. RLS — public read; NO direct write (writes go through the RPCs below,
--    which are SECURITY DEFINER and bypass RLS). Revoke write grants from the
--    named public roles; keep SELECT.
-- ---------------------------------------------------------------------------
alter table public.games_matches      enable row level security;
alter table public.games_match_seats  enable row level security;
alter table public.games_match_turns  enable row level security;
alter table public.games_ratings      enable row level security;

create policy games_matches_public_read     on public.games_matches     for select using (true);
create policy games_match_seats_public_read on public.games_match_seats for select using (true);
create policy games_match_turns_public_read on public.games_match_turns for select using (true);
create policy games_ratings_public_read     on public.games_ratings     for select using (true);

revoke insert, update, delete, truncate on public.games_matches      from anon, authenticated;
revoke insert, update, delete, truncate on public.games_match_seats  from anon, authenticated;
revoke insert, update, delete, truncate on public.games_match_turns  from anon, authenticated;
revoke insert, update, delete, truncate on public.games_ratings      from anon, authenticated;
grant select on public.games_matches      to anon, authenticated;
grant select on public.games_match_seats  to anon, authenticated;
grant select on public.games_match_turns  to anon, authenticated;
grant select on public.games_ratings      to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. ELO helper — apply one player's rating change against a pre-read opponent
--    rating. Internal (underscore); not granted to client roles.
-- ---------------------------------------------------------------------------
create or replace function public._games_rating_apply(
  p_bee uuid, p_game text, p_opp_rating integer, p_score numeric
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rating   integer;
  v_expected numeric;
  v_delta    integer;
begin
  insert into public.games_ratings (bee_id, game) values (p_bee, p_game)
    on conflict (bee_id, game) do nothing;
  select rating into v_rating from public.games_ratings where bee_id = p_bee and game = p_game;
  v_expected := 1.0 / (1.0 + power(10.0, (p_opp_rating - v_rating) / 400.0));
  v_delta := round(32.0 * (p_score - v_expected));
  update public.games_ratings set
    rating       = rating + v_delta,
    games_played = games_played + 1,
    wins         = wins   + case when p_score = 1   then 1 else 0 end,
    losses       = losses + case when p_score = 0   then 1 else 0 end,
    draws        = draws  + case when p_score = 0.5 then 1 else 0 end,
    updated_at   = now()
  where bee_id = p_bee and game = p_game;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. games_match_create — open a match; host takes seat 0; AI + open seats set.
--    p_ai_seats: [{"seat":1,"difficulty":"medium","name":"CPU"}, ...]
-- ---------------------------------------------------------------------------
create or replace function public.games_match_create(
  p_game       text,
  p_kind       text     default 'vs_world',
  p_seat_count smallint default 2,
  p_is_ranked  boolean  default true,
  p_mode       text     default null,
  p_ai_seats   jsonb    default '[]'::jsonb,
  p_state      jsonb    default '{}'::jsonb
) returns public.games_matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_match     public.games_matches;
  v_seat      smallint;
  v_ai        jsonb;
  v_open_left boolean;
begin
  if v_uid is null then
    raise exception 'games_match_create: sign in to open a match';
  end if;
  if coalesce(trim(p_game), '') = '' then
    raise exception 'games_match_create: game is required';
  end if;
  if p_seat_count is null or p_seat_count < 1 or p_seat_count > 8 then
    raise exception 'games_match_create: seat_count must be 1..8';
  end if;
  if p_kind not in ('vs_world','vs_ai','local') then
    raise exception 'games_match_create: invalid kind %', p_kind;
  end if;

  insert into public.games_matches (game, mode, kind, is_ranked, seat_count, state, created_by)
  values (trim(p_game), p_mode, p_kind, coalesce(p_is_ranked, true),
          p_seat_count, coalesce(p_state, '{}'::jsonb), v_uid)
  returning * into v_match;

  -- Seat 0 is always the host.
  insert into public.games_match_seats (match_id, seat_no, bee_id, joined_at)
  values (v_match.id, 0, v_uid, now());

  -- Seats 1..n-1: AI where named in p_ai_seats, else an open seat.
  for v_seat in 1 .. (p_seat_count - 1) loop
    v_ai := null;
    if jsonb_typeof(p_ai_seats) = 'array' then
      select elem into v_ai
        from jsonb_array_elements(p_ai_seats) elem
       where (elem->>'seat')::int = v_seat
       limit 1;
    end if;

    if v_ai is not null then
      insert into public.games_match_seats (match_id, seat_no, is_ai, ai_difficulty, display_name, joined_at)
      values (v_match.id, v_seat, true,
              coalesce(nullif(v_ai->>'difficulty',''), 'medium'),
              nullif(v_ai->>'name',''), now());
    else
      insert into public.games_match_seats (match_id, seat_no) values (v_match.id, v_seat);
    end if;
  end loop;

  -- If no open human seat remains (solo, or every other seat is AI) the match is
  -- immediately playable — same code path as vs-world, just no one to wait for.
  select exists (
    select 1 from public.games_match_seats
     where match_id = v_match.id and bee_id is null and not is_ai
  ) into v_open_left;

  if not v_open_left then
    update public.games_matches
       set status = 'active', started_at = now(), current_seat = 0, updated_at = now()
     where id = v_match.id
     returning * into v_match;
  end if;

  -- Best-effort bus notice: a new open table is worth surfacing in the feed.
  if v_match.status = 'open' then
    begin
      perform public.astra_emit_event(
        'games', 'match.created',
        'A new ' || v_match.game || ' table is open',
        'Join the open seat to play', '/match/' || v_match.id::text, v_match.id,
        jsonb_build_object('game', v_match.game, 'seats', v_match.seat_count), 'info');
    exception when others then null;  -- bus not applied yet / any emit failure
    end;
  end if;

  return v_match;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. games_match_join — claim an open seat by match id or invite token.
-- ---------------------------------------------------------------------------
create or replace function public.games_match_join(
  p_match_id     uuid     default null,
  p_invite_token text     default null,
  p_seat_no      smallint default null
) returns public.games_matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_match     public.games_matches;
  v_seat      smallint;
  v_open_left boolean;
begin
  if v_uid is null then
    raise exception 'games_match_join: sign in to join a match';
  end if;

  select * into v_match from public.games_matches
   where (p_match_id is not null and id = p_match_id)
      or (p_invite_token is not null and invite_token = p_invite_token)
   for update;
  if v_match.id is null then
    raise exception 'games_match_join: match not found';
  end if;
  if v_match.status <> 'open' then
    raise exception 'games_match_join: match is no longer open';
  end if;

  -- Already seated? Return the match unchanged (idempotent rejoin).
  if exists (select 1 from public.games_match_seats
              where match_id = v_match.id and bee_id = v_uid) then
    return v_match;
  end if;

  -- Target seat: the requested open seat, else the lowest open seat.
  select seat_no into v_seat from public.games_match_seats
   where match_id = v_match.id and bee_id is null and not is_ai
     and (p_seat_no is null or seat_no = p_seat_no)
   order by seat_no asc limit 1;
  if v_seat is null then
    raise exception 'games_match_join: no open seat available';
  end if;

  update public.games_match_seats set bee_id = v_uid, joined_at = now()
   where match_id = v_match.id and seat_no = v_seat;

  -- Table full? Start it.
  select exists (
    select 1 from public.games_match_seats
     where match_id = v_match.id and bee_id is null and not is_ai
  ) into v_open_left;

  if not v_open_left then
    update public.games_matches
       set status = 'active', started_at = now(), current_seat = 0, updated_at = now()
     where id = v_match.id
     returning * into v_match;
    begin
      perform public.astra_emit_event(
        'games', 'match.started',
        v_match.game || ' match is underway',
        null, '/match/' || v_match.id::text, v_match.id,
        jsonb_build_object('game', v_match.game), 'info');
    exception when others then null;
    end;
  end if;

  return v_match;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. games_match_move — append a turn for the current seat, advance the turn.
--    The caller must hold the current seat, OR the current seat is an AI seat
--    and the caller is a participant (a human client submits the AI's move —
--    the AI is computed client-side, hand-rolled; the DB only records it).
-- ---------------------------------------------------------------------------
create or replace function public.games_match_move(
  p_match_id   uuid,
  p_move       jsonb,
  p_next_state jsonb    default null,
  p_next_seat  smallint default null
) returns public.games_matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_match     public.games_matches;
  v_seat_bee  uuid;
  v_seat_ai   boolean;
  v_is_part   boolean;
  v_next      smallint;
begin
  if v_uid is null then
    raise exception 'games_match_move: sign in to play';
  end if;

  select * into v_match from public.games_matches where id = p_match_id for update;
  if v_match.id is null then
    raise exception 'games_match_move: match not found';
  end if;
  if v_match.status <> 'active' then
    raise exception 'games_match_move: match is not active';
  end if;

  select bee_id, is_ai into v_seat_bee, v_seat_ai
    from public.games_match_seats
   where match_id = p_match_id and seat_no = v_match.current_seat;
  select exists (select 1 from public.games_match_seats
                  where match_id = p_match_id and bee_id = v_uid) into v_is_part;

  if not ( v_seat_bee = v_uid or (coalesce(v_seat_ai, false) and v_is_part) ) then
    raise exception 'games_match_move: not your turn';
  end if;

  insert into public.games_match_turns (match_id, seat_no, turn_no, move)
  values (p_match_id, v_match.current_seat, v_match.turn_no + 1, coalesce(p_move, '{}'::jsonb));

  -- Next occupied seat, wrapping; an explicit p_next_seat overrides (skips/passes).
  if p_next_seat is not null then
    v_next := p_next_seat;
  else
    select coalesce(
      (select seat_no from public.games_match_seats
        where match_id = p_match_id and seat_no > v_match.current_seat
          and (bee_id is not null or is_ai) order by seat_no asc limit 1),
      (select seat_no from public.games_match_seats
        where match_id = p_match_id and (bee_id is not null or is_ai)
        order by seat_no asc limit 1)
    ) into v_next;
  end if;

  update public.games_matches set
    state        = coalesce(p_next_state, state),
    turn_no      = turn_no + 1,
    current_seat = v_next,
    updated_at   = now()
  where id = p_match_id
  returning * into v_match;

  begin
    perform public.astra_emit_event(
      'games', 'match.turn',
      'A move was made in ' || v_match.game, null,
      '/match/' || v_match.id::text, v_match.id,
      jsonb_build_object('game', v_match.game, 'turn', v_match.turn_no), 'info');
  exception when others then null;
  end;

  return v_match;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. games_match_finish — record the result; apply ELO for a ranked 1v1.
-- ---------------------------------------------------------------------------
create or replace function public.games_match_finish(
  p_match_id    uuid,
  p_result      text,
  p_winner_seat smallint default null
) returns public.games_matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_match  public.games_matches;
  v_a_bee  uuid; v_a_seat smallint; v_a_rating integer;
  v_b_bee  uuid; v_b_seat smallint; v_b_rating integer;
  v_n      integer;
  v_a_score numeric; v_b_score numeric;
begin
  if v_uid is null then
    raise exception 'games_match_finish: sign in';
  end if;
  if p_result not in ('win','draw','abandoned') then
    raise exception 'games_match_finish: invalid result %', p_result;
  end if;
  if p_result = 'win' and p_winner_seat is null then
    raise exception 'games_match_finish: a win requires winner_seat';
  end if;

  select * into v_match from public.games_matches where id = p_match_id for update;
  if v_match.id is null then
    raise exception 'games_match_finish: match not found';
  end if;
  if v_match.status not in ('open','active') then
    raise exception 'games_match_finish: match already ended';
  end if;
  if not exists (select 1 from public.games_match_seats
                  where match_id = p_match_id and bee_id = v_uid) then
    raise exception 'games_match_finish: only a participant can end the match';
  end if;

  update public.games_matches set
    status      = case when p_result = 'abandoned' then 'abandoned' else 'complete' end,
    result      = p_result,
    winner_seat = p_winner_seat,
    ended_at    = now(),
    updated_at  = now()
  where id = p_match_id
  returning * into v_match;

  -- ELO only for a ranked decisive/drawn match with EXACTLY two human seats.
  select count(*) into v_n from public.games_match_seats
   where match_id = p_match_id and bee_id is not null and not is_ai;

  if v_match.is_ranked and p_result in ('win','draw') and v_n = 2 then
    select seat_no, bee_id into v_a_seat, v_a_bee from public.games_match_seats
     where match_id = p_match_id and bee_id is not null and not is_ai
     order by seat_no asc limit 1;
    select seat_no, bee_id into v_b_seat, v_b_bee from public.games_match_seats
     where match_id = p_match_id and bee_id is not null and not is_ai
     order by seat_no desc limit 1;

    -- Pre-read both ratings (upsert defaults) so each applies against the other's
    -- rating BEFORE either moved.
    insert into public.games_ratings (bee_id, game) values (v_a_bee, v_match.game)
      on conflict do nothing;
    insert into public.games_ratings (bee_id, game) values (v_b_bee, v_match.game)
      on conflict do nothing;
    select rating into v_a_rating from public.games_ratings where bee_id = v_a_bee and game = v_match.game;
    select rating into v_b_rating from public.games_ratings where bee_id = v_b_bee and game = v_match.game;

    if p_result = 'draw' then
      v_a_score := 0.5; v_b_score := 0.5;
    else
      v_a_score := case when p_winner_seat = v_a_seat then 1 else 0 end;
      v_b_score := case when p_winner_seat = v_b_seat then 1 else 0 end;
    end if;

    perform public._games_rating_apply(v_a_bee, v_match.game, v_b_rating, v_a_score);
    perform public._games_rating_apply(v_b_bee, v_match.game, v_a_rating, v_b_score);
  end if;

  begin
    perform public.astra_emit_event(
      'games', 'match.finished',
      v_match.game || ' match finished',
      case p_result when 'draw' then 'Ended in a draw' when 'abandoned' then 'Abandoned' else 'We have a winner' end,
      '/match/' || v_match.id::text, v_match.id,
      jsonb_build_object('game', v_match.game, 'result', p_result), 'info');
  exception when others then null;
  end;

  return v_match;
end;
$$;

-- ---------------------------------------------------------------------------
-- 11. Function grants — writes need a session; execute to authenticated only.
-- ---------------------------------------------------------------------------
revoke all on function public.games_match_create(text, text, smallint, boolean, text, jsonb, jsonb) from public;
revoke all on function public.games_match_join(uuid, text, smallint) from public;
revoke all on function public.games_match_move(uuid, jsonb, jsonb, smallint) from public;
revoke all on function public.games_match_finish(uuid, text, smallint) from public;
revoke all on function public._games_rating_apply(uuid, text, integer, numeric) from public;

grant execute on function public.games_match_create(text, text, smallint, boolean, text, jsonb, jsonb) to authenticated;
grant execute on function public.games_match_join(uuid, text, smallint) to authenticated;
grant execute on function public.games_match_move(uuid, jsonb, jsonb, smallint) to authenticated;
grant execute on function public.games_match_finish(uuid, text, smallint) to authenticated;
-- _games_rating_apply is internal: no client grant.

-- ---------------------------------------------------------------------------
-- 12. Ledger pairing — record this version so reconcile stays sound (SQL_AUTONOMY
--     item 3). NOTE: this repo (REBELUTION.games) is not in TheMANUAL.tech's
--     reconcile.mjs scan path — flagged for the DB lane in REPORT.
-- ---------------------------------------------------------------------------
insert into supabase_migrations.schema_migrations (version, name)
values ('20260820144500', 'gamematch1_vs_world_layer_v1')
on conflict (version) do nothing;

commit;
