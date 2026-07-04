-- TheTRIVIA.app tester + serve-path fixes (2026-07-04)
-- Applied to prod via MCP as version 20260704224559.
--
-- 1. question_bank_public rebuilt: was status='live' only (10 rows) while the
--    tick serves ('live','validated') — clients couldn't read 99.7% of served
--    questions. Now mirrors the serve gate. Column-safe: no correct_idx,
--    no accepted_answers. Definer view = the public read model (base-table
--    anon SELECT is revoked at grant level; linter's security_definer_view
--    flag on this view is intentional).
-- 2. trivia_channel_tick gains p_force (default false) — advancement-gate
--    bypass for testing tools. Prod callers omit it; behavior unchanged.
--    NOTE: signature changed (uuid) -> (uuid, boolean default false).
--    Named-param PostgREST callers ({p_session_id}) resolve unchanged.
-- 3. trivia_submit_answer returns correct_idx — reveal after answer lock-in.

drop view if exists question_bank_public;
create view question_bank_public as
  select id, realm, prompt, choices, difficulty, answer_format, time_frame, status, created_at
    from question_bank
   where status in ('live','validated')
     and (expires_at is null or expires_at > now());
revoke all on question_bank_public from anon, authenticated;
grant select on question_bank_public to anon, authenticated;

drop function if exists trivia_channel_tick(uuid);
create function trivia_channel_tick(p_session_id uuid, p_force boolean default false)
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

  if not p_force
     and v_session.current_question_id is not null
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
revoke all on function trivia_channel_tick(uuid, boolean) from public;
grant execute on function trivia_channel_tick(uuid, boolean) to anon, authenticated;

create or replace function trivia_submit_answer(p_player_id uuid, p_question_id uuid, p_answer_idx integer, p_response_ms integer)
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

  return jsonb_build_object('correct', v_correct, 'points', v_points, 'correct_idx', v_q.correct_idx);
end $function$;
