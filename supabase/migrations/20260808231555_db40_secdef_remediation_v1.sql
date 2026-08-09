-- DB40 -- act on DB36: fix the outage, close the trivia holes, apply the revokes.
-- Rollback: supabase/migrations/_drafts/20260808234500_db40_secdef_remediation_v1_rollback.sql
--           (written BEFORE this migration, per the MIGRATION AMENDMENT)
--
-- REVOKE DISCIPLINE (Amendment 2). proacl was read first. Every function touched
-- here carried BOTH a PUBLIC grant (=X/postgres) AND explicit anon= / authenticated=
-- role grants. Revoking only the named roles would leave the PUBLIC grant doing the
-- same job, and revoking only PUBLIC is the documented no-op. So each statement
-- revokes from PUBLIC **and** the named roles. service_role keeps EXECUTE
-- everywhere -- it is the server-side identity and none of this is aimed at it.
--
-- WHY THE CRON EVIDENCE MATTERS. pg_cron runs as `postgres`:
--   job 9  * * * * *   select public.games_night_sweep()
--   job 5  15 seconds  select public.trivia_channel_sweep()
--   job 6  */5 * * * * select public.comms_sweep_expired()
-- games_night_sweep (SECDEF) calls trivia__open_lobby, trivia__begin_rounds and
-- trivia_night_tick; trivia_channel_sweep (SECDEF) calls trivia_venue_last_close and
-- trivia_channel_tick(id) with p_force defaulted false. Those internal calls execute
-- as the owner and never consult the caller's grants, so the revokes below cannot
-- stop the night machine or Channel pacing.

BEGIN;

-- ===========================================================================
-- 1. THE LIVE OUTAGE -- press_is_admin reads a column that does not exist.
--    public.bees has no auth_user_id; the identity column is bees.id (FK to
--    auth.users). The dynamic EXECUTE therefore raises 42703, and the handler
--    only catches undefined_table, so nothing catches it. Its sole caller
--    press_spot_offer uses it as the LEFT operand of an OR -- SQL does not
--    guarantee short-circuit -- so press_spot_offer raises for EVERY caller and
--    nobody can offer on a press spot. Correctness first.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.press_is_admin(p_uid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_admin boolean := false;
begin
  begin
    -- bees.id IS the auth.users id (bees_id_fkey), so this is the identity join.
    execute 'select coalesce(bool_or(is_admin),false) from bees where id = $1'
      into v_admin using p_uid;
  exception when undefined_table then v_admin := false;
  end;
  return v_admin;
end $function$;

-- It should never have been anon-callable: it is an internal admin predicate.
REVOKE EXECUTE ON FUNCTION public.press_is_admin(uuid) FROM PUBLIC, anon, authenticated;

-- ===========================================================================
-- 2. trivia_channel_tick -- gate p_force on venue ownership.
--
--    CHOSEN: gate the parameter, rather than drop it and add an owner-only RPC.
--    Reasons: (a) the signature stays stable, so the cron sweep's 1-arg call and
--    any existing client keep working untouched; (b) the legitimate forcer is the
--    host/TV client, which is the venue owner, so ownership IS the correct
--    predicate; (c) a second RPC would duplicate 60 lines of dealing logic that
--    would then drift. Ordinary anonymous pacing is unaffected: p_force defaults
--    false and the gate is only consulted when it is true.
--
--    trivia_venues.owner_bee_id references bees.id, which is the auth.users id,
--    so comparing it to auth.uid() is the direct ownership test.
-- ===========================================================================
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

  -- DB40: p_force skips the pacing gate, which lets a caller deal questions on
  -- demand -- skipping questions mid-play, burning the venue's pool and
  -- desynchronising every patron from the TV. DB35 proved it as anon. Only the
  -- venue owner may force. Anonymous pacing (p_force=false) is untouched.
  if p_force and (auth.uid() is null or v_venue.owner_bee_id is distinct from auth.uid()) then
    raise exception 'only the venue owner may force a deal';
  end if;

  v_show_ms := coalesce((v_session.settings->>'question_ms')::integer, 15000)
             + coalesce((v_session.settings->>'reveal_ms')::integer, 7000);
  v_pace_ms := coalesce((v_venue.settings->>'channel_pace_ms')::integer, 180000);
  v_gate_ms := greatest(v_show_ms, v_pace_ms);
  v_cooldown_days := coalesce((v_venue.settings->>'cooldown_days')::integer, 30);

  if not p_force
     and v_session.current_question_id is not null
     and v_session.question_started_at > now() - make_interval(secs => v_gate_ms / 1000.0) then
    -- TRIV19 self-heal: a session dealt before this migration has no stamp. Write
    -- it from the values that are already true, so the very next client poll gets
    -- a real timestamp instead of "SOON" - no forced deal, no schedule change.
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

  -- The DB knows exactly when it becomes eligible to deal again. Stamp it, so no
  -- client ever has to reconstruct the gate from venue + session settings.
  v_next_deal := now() + make_interval(secs => v_gate_ms / 1000.0);

  update trivia_sessions
     set current_question_id = v_next, question_started_at = now(),
         settings = settings || jsonb_build_object('next_deal_at', to_jsonb(v_next_deal))
   where id = p_session_id;

  return jsonb_build_object('advanced', true, 'question_id', v_next,
    'question_started_at', now(), 'next_deal_at', to_jsonb(v_next_deal));
end $function$;

-- ===========================================================================
-- 3. THE TRIVIA / GAMES INTERNALS -- no client loses anything.
--    All four are reached only from SECURITY DEFINER cron sweeps.
-- ===========================================================================
-- Anon could flip a scheduled night live AND wrap every other live session at
-- that venue as a side effect. Called by games_night_sweep (SECDEF, cron).
REVOKE EXECUTE ON FUNCTION public.trivia__open_lobby(uuid) FROM PUBLIC, anon, authenticated;
-- Anon could end the lobby and start rounds before the host said a word.
REVOKE EXECUTE ON FUNCTION public.trivia__begin_rounds(uuid) FROM PUBLIC, anon, authenticated;
-- Settlement step, not a client call: writes games_player_accruals and
-- games_lifetime_stats, and p_game_type is an unconstrained caller-supplied string.
REVOKE EXECUTE ON FUNCTION public.games_accrue_session(uuid, text) FROM PUBLIC, anon, authenticated;
-- Drives the whole night state machine; anon-loopable and scan-heavy. Cron owns it.
REVOKE EXECUTE ON FUNCTION public.games_night_sweep() FROM PUBLIC, anon, authenticated;

-- ===========================================================================
-- 4. THE CHEAP LEAKS AND FREE WRITES
-- ===========================================================================
-- DELETE on comms_messages. Only removes already-expired rows, so no data loss,
-- but a free anon-loopable write/DoS vector. Cron job 6 runs it every 5 minutes.
REVOKE EXECUTE ON FUNCTION public.comms_sweep_expired() FROM PUBLIC, anon, authenticated;
-- Read-only despite the name, but it dumps per-bee karma discrepancies to anon
-- and full-outer-joins two karma tables per call.
REVOKE EXECUTE ON FUNCTION public.justice_karma_reconcile() FROM PUBLIC, anon, authenticated;
-- Block-graph oracle for ARBITRARY pairs. DB36 confirmed zero policies call it.
REVOKE EXECUTE ON FUNCTION public.comms_is_blocked(uuid, uuid) FROM PUBLIC, anon, authenticated;
-- Leaks whether any venue holds a subscription. trivia_start_night calls it
-- internally and is SECDEF, so that path survives.
REVOKE EXECUTE ON FUNCTION public.games_venue_may_run_night(uuid) FROM PUBLIC, anon, authenticated;
-- Internal helper reading trivia_venues.settings; only SECDEF callers need it.
REVOKE EXECUTE ON FUNCTION public.games_seed_window(uuid, text) FROM PUBLIC, anon, authenticated;

-- anon-only, per DB36: an authenticated Bee resolving its own fee schedule is
-- legitimate; an anonymous caller probing another bee's overrides is not.
REVOKE EXECUTE ON FUNCTION public.fee_resolve(text, text, uuid) FROM PUBLIC, anon;
-- anon-only: venue timezone/close settings. trivia_channel_sweep (SECDEF, cron)
-- keeps calling it.
REVOKE EXECUTE ON FUNCTION public.trivia_venue_last_close(uuid) FROM PUBLIC, anon;

COMMIT;
