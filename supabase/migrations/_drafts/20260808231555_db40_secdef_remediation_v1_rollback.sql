-- ROLLBACK for 20260808234500_db40_secdef_remediation_v1.sql
-- WRITTEN BEFORE THE APPLY, per the MIGRATION AMENDMENT.
--
-- WARNING, READ BEFORE RUNNING: restoring press_is_admin to its prior body
-- RE-BREAKS public.press_spot_offer. The prior body queries bees.auth_user_id,
-- a column that does not exist, so it raises 42703 on every call; press_spot_offer
-- calls it as the LEFT operand of an OR and SQL does not guarantee short-circuit,
-- so the raise propagates and NOBODY can offer on a press spot. That outage is
-- exactly what the forward migration fixed. Roll back the GRANTs freely; think
-- twice before rolling back this function body.
--
-- Prior definitions captured with pg_get_functiondef() BEFORE the apply.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. RESTORE THE GRANTS (exact inverse of the forward REVOKEs)
--    Prior state, read from proacl: every function below carried
--    {=X/postgres, postgres=X/postgres, anon=X/postgres, authenticated=X/postgres,
--     service_role=X/postgres} -- i.e. a PUBLIC grant AND explicit role grants.
--    trivia_channel_tick is the one exception: it had NO PUBLIC grant.
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.press_is_admin(uuid) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trivia__open_lobby(uuid) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trivia__begin_rounds(uuid) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.games_accrue_session(uuid, text) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.games_night_sweep() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.comms_sweep_expired() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.justice_karma_reconcile() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.comms_is_blocked(uuid, uuid) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.games_venue_may_run_night(uuid) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.games_seed_window(uuid, text) TO PUBLIC, anon, authenticated;
-- anon-only revokes: authenticated kept its grant throughout, so only anon+PUBLIC return.
GRANT EXECUTE ON FUNCTION public.fee_resolve(text, text, uuid) TO PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trivia_venue_last_close(uuid) TO PUBLIC, anon;

-- ---------------------------------------------------------------------------
-- 2. RESTORE public.press_is_admin(uuid) -- THE BROKEN BODY (see warning above)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.press_is_admin(p_uid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_admin boolean := false;
begin
  begin
    execute 'select coalesce(bool_or(is_admin),false) from bees where auth_user_id = $1'
      into v_admin using p_uid;
  exception when undefined_table then v_admin := false;
  end;
  return v_admin;
end $function$;

-- ---------------------------------------------------------------------------
-- 3. RESTORE public.trivia_channel_tick(uuid, boolean) -- ungated p_force
--    Restoring this re-opens the hole DB35 proved as anon: any caller holding a
--    session uuid can force-deal questions in a live venue.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trivia_channel_tick(p_session_id uuid, p_force boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_session trivia_sessions; v_venue trivia_venues; v_next uuid;
  v_show_ms integer; v_pace_ms integer; v_gate_ms integer; v_cooldown_days integer;
  v_next_deal timestamptz;
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
    v_next_deal := v_session.question_started_at + make_interval(secs => v_gate_ms / 1000.0);
    if v_session.settings->>'next_deal_at' is distinct from to_jsonb(v_next_deal)#>>'{}' then
      update trivia_sessions
         set settings = settings || jsonb_build_object('next_deal_at', to_jsonb(v_next_deal))
       where id = p_session_id;
    end if;
    return jsonb_build_object('advanced', false,
      'question_id', v_session.current_question_id,
      'question_started_at', v_session.question_started_at,
      'next_deal_at', to_jsonb(v_next_deal),
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

  v_next_deal := now() + make_interval(secs => v_gate_ms / 1000.0);

  update trivia_sessions
     set current_question_id = v_next, question_started_at = now(),
         settings = settings || jsonb_build_object('next_deal_at', to_jsonb(v_next_deal))
   where id = p_session_id;

  return jsonb_build_object('advanced', true, 'question_id', v_next,
    'question_started_at', now(), 'next_deal_at', to_jsonb(v_next_deal));
end $function$;

COMMIT;
