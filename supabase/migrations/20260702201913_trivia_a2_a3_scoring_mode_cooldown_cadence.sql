-- CANON: thetrivia-venue-v2.md A2 (scoring modes) + A3 (question-serving memory & cadence)
-- Applied to prod 2026-07-02 as version 20260702201913.
-- A2: trivia_sessions.scoring_mode ('speed'|'table'); trivia_start_night gains p_scoring_mode
--     (table mode = 60s clock, one submission per table per question); Channel always speed.
-- A3: trivia_question_serves per-venue history; venue settings jsonb (cooldown_days=30,
--     channel_pace_ms=180000); ticks filter by cooldown, fall back oldest-served-first,
--     and record every serve. Channel advancement gated by pace.

-- A3.1 served-question history
create table public.trivia_question_serves (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references trivia_venues(id),
  session_id uuid references trivia_sessions(id),
  question_id uuid not null references question_bank(id),
  served_at timestamptz not null default now()
);
create index trivia_question_serves_venue_q_idx
  on public.trivia_question_serves (venue_id, question_id, served_at desc);
alter table public.trivia_question_serves enable row level security;
create policy trivia_serves_owner_read on public.trivia_question_serves
  for select using (
    exists (select 1 from trivia_venues v
             where v.id = trivia_question_serves.venue_id
               and v.owner_bee_id = auth.uid()));

-- A3.2 venue settings (cooldown_days, channel_pace_ms)
alter table public.trivia_venues
  add column settings jsonb not null default '{}'::jsonb;

-- A2.1 scoring mode on sessions
alter table public.trivia_sessions
  add column scoring_mode text not null default 'speed'
  check (scoring_mode in ('speed','table'));

-- A3.3 channel tick: pace gate + cooldown + oldest-served fallback + serve recording
create or replace function public.trivia_channel_tick(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_session trivia_sessions; v_venue trivia_venues; v_next uuid;
  v_show_ms integer; v_pace_ms integer; v_gate_ms integer; v_cooldown_days integer;
begin
  select * into v_session from trivia_sessions where id = p_session_id for update;
  if not found or v_session.status <> 'live' then raise exception 'session not live'; end if;

  select * into v_venue from trivia_venues where id = v_session.venue_id;

  v_show_ms := coalesce((v_session.settings->>'question_ms')::integer, 15000)
             + coalesce((v_session.settings->>'reveal_ms')::integer, 7000);
  v_pace_ms := coalesce((v_venue.settings->>'channel_pace_ms')::integer, 180000);
  v_gate_ms := greatest(v_show_ms, v_pace_ms);
  v_cooldown_days := coalesce((v_venue.settings->>'cooldown_days')::integer, 30);

  if v_session.current_question_id is not null
     and v_session.question_started_at > now() - make_interval(secs => v_gate_ms / 1000.0) then
    return jsonb_build_object('advanced', false,
      'question_id', v_session.current_question_id,
      'question_started_at', v_session.question_started_at,
      'show_ms', v_show_ms, 'pace_ms', v_pace_ms);
  end if;

  select qb.id into v_next
    from question_bank qb
   where qb.status in ('live','validated')
     and (qb.expires_at is null or qb.expires_at > now())
     and qb.answer_format = 'multiple_choice'
     and qb.id is distinct from v_session.current_question_id
     and not exists (
        select 1 from trivia_question_serves s
         where s.venue_id = v_session.venue_id
           and s.question_id = qb.id
           and s.served_at > now() - make_interval(days => v_cooldown_days))
   order by random() limit 1;

  if v_next is null then
    select qb.id into v_next
      from question_bank qb
      left join lateral (
        select max(s.served_at) as last_served
          from trivia_question_serves s
         where s.venue_id = v_session.venue_id and s.question_id = qb.id) ls on true
     where qb.status in ('live','validated')
       and qb.answer_format = 'multiple_choice'
       and qb.id is distinct from v_session.current_question_id
     order by ls.last_served asc nulls first, random()
     limit 1;
  end if;

  if v_next is null then
    return jsonb_build_object('advanced', false, 'error', 'no questions available');
  end if;

  insert into trivia_question_serves (venue_id, session_id, question_id)
  values (v_session.venue_id, p_session_id, v_next);

  update trivia_sessions
     set current_question_id = v_next, question_started_at = now()
   where id = p_session_id;

  return jsonb_build_object('advanced', true, 'question_id', v_next,
    'question_started_at', now());
end $function$;

-- A3.4 night tick: cooldown + serve recording (no pace gate; Nights keep live rhythm)
create or replace function public.trivia_night_tick(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare v_session trivia_sessions; v_venue trivia_venues; v_next uuid;
        v_window_ms integer; v_served integer; v_limit integer; v_cooldown_days integer;
begin
  select * into v_session from trivia_sessions where id = p_session_id for update;
  if not found or v_session.mode <> 'night' then raise exception 'night session not found'; end if;
  if v_session.status = 'wrapped' then
    return jsonb_build_object('wrapped', true, 'wrap', v_session.settings->'wrap');
  end if;

  select * into v_venue from trivia_venues where id = v_session.venue_id;
  v_cooldown_days := coalesce((v_venue.settings->>'cooldown_days')::integer, 30);

  v_window_ms := coalesce((v_session.settings->>'question_ms')::integer, 15000)
               + coalesce((v_session.settings->>'reveal_ms')::integer, 7000);
  v_served := coalesce((v_session.settings->>'served_count')::integer, 0);
  v_limit  := coalesce((v_session.settings->>'num_questions')::integer, 20);

  if v_session.current_question_id is not null
     and v_session.question_started_at > now() - make_interval(secs => v_window_ms / 1000.0) then
    return jsonb_build_object('advanced', false, 'wrapped', false,
      'question_id', v_session.current_question_id,
      'question_started_at', v_session.question_started_at,
      'question_number', v_served, 'of', v_limit);
  end if;

  if v_served >= v_limit then
    return jsonb_build_object('wrapped', true, 'wrap', trivia__wrap_session(p_session_id));
  end if;

  select qb.id into v_next
    from question_bank qb
   where qb.status in ('live','validated')
     and (qb.expires_at is null or qb.expires_at > now())
     and qb.answer_format = 'multiple_choice'
     and (v_session.pack_id is null or qb.id = any(
          coalesce((select question_ids from trivia_packs where id = v_session.pack_id), '{}')))
     and qb.id is distinct from v_session.current_question_id
     and qb.id not in (select question_id from trivia_answers where session_id = p_session_id)
     and not exists (
        select 1 from trivia_question_serves s
         where s.venue_id = v_session.venue_id
           and s.question_id = qb.id
           and s.served_at > now() - make_interval(days => v_cooldown_days))
   order by random() limit 1;

  if v_next is null then
    select qb.id into v_next
      from question_bank qb
      left join lateral (
        select max(s.served_at) as last_served
          from trivia_question_serves s
         where s.venue_id = v_session.venue_id and s.question_id = qb.id) ls on true
     where qb.status in ('live','validated')
       and qb.answer_format = 'multiple_choice'
       and (v_session.pack_id is null or qb.id = any(
            coalesce((select question_ids from trivia_packs where id = v_session.pack_id), '{}')))
       and qb.id is distinct from v_session.current_question_id
       and qb.id not in (select question_id from trivia_answers where session_id = p_session_id)
     order by ls.last_served asc nulls first, random()
     limit 1;
  end if;

  if v_next is null then
    return jsonb_build_object('wrapped', true, 'wrap', trivia__wrap_session(p_session_id));
  end if;

  insert into trivia_question_serves (venue_id, session_id, question_id)
  values (v_session.venue_id, p_session_id, v_next);

  update trivia_sessions
     set current_question_id = v_next, question_started_at = now(),
         settings = settings || jsonb_build_object('served_count', v_served + 1)
   where id = p_session_id;

  return jsonb_build_object('advanced', true, 'wrapped', false, 'question_id', v_next,
    'question_number', v_served + 1, 'of', v_limit, 'question_started_at', now());
end $function$;

-- A2.2 start_night with scoring_mode (drop old signature to avoid overload ambiguity)
drop function if exists public.trivia_start_night(uuid, uuid, integer, text);
create or replace function public.trivia_start_night(
  p_venue_id uuid, p_pack_id uuid default null, p_num_questions integer default 20,
  p_prize text default null, p_scoring_mode text default 'speed')
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare v_venue trivia_venues; v_session trivia_sessions; v_settings jsonb;
begin
  select * into v_venue from trivia_venues where id = p_venue_id;
  if not found then raise exception 'venue not found'; end if;
  if v_venue.owner_bee_id is distinct from auth.uid() then
    raise exception 'not venue owner'; end if;
  if p_scoring_mode not in ('speed','table') then
    raise exception 'scoring_mode must be speed or table'; end if;

  perform trivia__wrap_session(id) from trivia_sessions
   where venue_id = p_venue_id and status = 'live';

  v_settings := jsonb_build_object(
    'num_questions', greatest(1, least(p_num_questions, 100)),
    'served_count', 0);
  if p_scoring_mode = 'table' then
    v_settings := v_settings || jsonb_build_object('question_ms', 60000);
  end if;

  insert into trivia_sessions (venue_id, mode, status, pack_id, scoring_mode, started_at, settings)
  values (p_venue_id, 'night', 'live', p_pack_id, p_scoring_mode, now(), v_settings)
  returning * into v_session;

  if p_prize is not null and length(trim(p_prize)) > 0 then
    insert into trivia_prizes (posting_venue_id, session_id, description)
    values (p_venue_id, v_session.id, trim(p_prize));
  end if;

  return jsonb_build_object('session_id', v_session.id,
    'num_questions', (v_session.settings->>'num_questions')::integer,
    'scoring_mode', v_session.scoring_mode);
end $function$;

-- A2.3 submit_answer: table mode = one submission per table per question
create or replace function public.trivia_submit_answer(
  p_player_id uuid, p_question_id uuid, p_answer_idx integer, p_response_ms integer)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare v_player trivia_players; v_session trivia_sessions; v_q question_bank;
        v_correct boolean; v_points integer; v_limit_ms integer;
begin
  select * into v_player from trivia_players where id = p_player_id;
  if not found then raise exception 'player not found'; end if;
  select * into v_session from trivia_sessions where id = v_player.session_id;
  if v_session.status <> 'live' then raise exception 'session not live'; end if;
  if v_session.current_question_id is distinct from p_question_id then
    raise exception 'question not current'; end if;

  if v_session.scoring_mode = 'table' and v_player.table_tag is not null then
    if exists (
      select 1 from trivia_answers a
        join trivia_players p2 on p2.id = a.player_id
       where a.session_id = v_session.id
         and a.question_id = p_question_id
         and p2.table_tag = v_player.table_tag) then
      raise exception 'table already answered this question';
    end if;
  end if;

  select * into v_q from question_bank where id = p_question_id;
  v_limit_ms := coalesce((v_session.settings->>'question_ms')::integer, 15000);

  v_correct := (p_answer_idx = v_q.correct_idx);
  v_points := case when v_correct
    then 100 + greatest(0, round(100.0 * (1.0 - least(p_response_ms, v_limit_ms)::numeric / v_limit_ms)))::integer
    else 0 end;

  insert into trivia_answers (session_id, player_id, question_id, answer_idx, is_correct, response_ms, points)
  values (v_session.id, p_player_id, p_question_id, p_answer_idx, v_correct, p_response_ms, v_points);

  update trivia_players set score = score + v_points,
    correct_count = correct_count + (v_correct::integer)
  where id = p_player_id;

  return jsonb_build_object('correct', v_correct, 'points', v_points);
end $function$;
