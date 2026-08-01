-- ============================================================================
-- 20260801160000_trivia_identity_and_read_surface_v1.sql
--
-- STATUS: DRAFT. NOT APPLIED. TRIV30, 2026-08-01.
-- Parked in docs/ deliberately, NOT in supabase/migrations/, so no `db push`
-- can pick it up. Same convention as docs/20260704214721_reassert_handle_new_bee
-- _as_deployed.sql. Moving it into supabase/migrations/ under this exact
-- filename is the apply step, and belongs to a dispatch that names it.
--
-- WHAT IT CLOSES
--   1. trivia_submit_answer performs no caller check. It accepts a player id
--      and nothing else. trivia_players.device_key - the guest's only identity
--      token - is world-readable. Read an id, answer as that player.
--      (TRIV8 GAP-A; re-confirmed TRIV26-Q; confirmed a third time by the lead
--      2026-08-01 on both the policy/grant route and the function-source route.)
--   2. trivia_claim_player has the same shape and was NOT in the dispatch.
--      It checks auth.uid() for the CLAIMANT but never checks that the seat
--      belongs to them - any signed-in Bee can bind any unclaimed seat, and
--      TRIV14's lifetime ledger is per-seat keyed. Found while drafting; fixed
--      here because it is the identical missing-caller-check defect on the same
--      table and splitting them would leave the round trip open.
--   3. trivia_venues.owner_bee_id and .subscription_id are world-readable.
--      LEAD RULING (TRIV30): neither should be.
--
-- CALIBRATION. 2 active venues, 0 live sessions, 3 sessions ever, 17 players.
-- Nobody is losing money tonight and the leaderboard at risk is a bar's. This
-- matters because venues are being SOLD a product whose scores cannot be
-- trusted, and because "0 live sessions" is exactly the window in which the
-- flag day below is free.
--
-- HARD PRECONDITIONS - read before applying:
--   P1. THE CLIENT SHIPS FIRST. This migration is a flag day for
--       TheHoneycomb.games/apps/trivia. Four call sites must land and deploy
--       BEFORE this is applied (listed at the bottom, "CLIENT CHANGES").
--       Applying this against the currently deployed client breaks the game.
--   P2. select count(*) from trivia_sessions where status = 'live'  ->  must be 0.
--       A seat whose device_key is null cannot answer after this lands. Seats in
--       ended sessions cannot answer anyway, so at 0 live this costs nothing;
--       mid-round it ejects the room.
--   P3. RE-DERIVE THE TWO FUNCTION BODIES FIRST. The bodies restated below were
--       taken from the 2026-07-26 production dump. Trivia work has shipped since
--       (TRIV21 night-mode phase 4a at minimum) and some of it was applied
--       out-of-repo. Run pg_get_functiondef on trivia_submit_answer and
--       trivia_claim_player, diff against the bodies here, and carry any drift
--       forward. Do not apply a stale body.
--
-- DELIBERATELY NOT IN THIS FILE
--   - The correct_idx still returned by trivia_submit_answer. That is the
--     pending lock_in_phase2_strip_correct_idx change and it is a different
--     concern; the body below is left byte-identical to production apart from
--     the guard, so the two migrations cannot collide.
--   - bees exposure. That is DB14. Untouched.
--   - trivia_answers reveal-gate RLS. Still the open draft at
--     TheHoneycomb.games/apps/trivia/supabase-proposed/trivia_answers_reveal_
--     gate_rls_v1.sql. Untouched.
--
-- ZERO DML. Every statement here is DDL or a grant. No row is read, written,
-- rotated or backfilled. The 17 existing device_key values are NOT rotated -
-- they are burned (world-readable since June), but every seat holding one is in
-- an ended session and an ended session cannot be answered into.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- PART 1 - ADDITIVE. Safe to apply on its own; nothing breaks.
-- If the lead wants a two-step apply, PART 1 can ship now and PART 2 after the
-- client deploy. Split at the PART 2 banner.
-- ---------------------------------------------------------------------------

-- 1a. Player public read model. Everything PlayerRow already declares in
--     lib/trivia.ts, minus device_key. Definer view (security_invoker off) is
--     the established pattern here - see question_bank_public, migration
--     20260704224559. The linter's security_definer_view flag on these views is
--     intentional: the view IS the read model and the base table's anon grant
--     goes away in PART 2.
create view public.trivia_players_public
  with (security_invoker = off) as
  select id,
         session_id,
         nickname,
         table_tag,
         bee_id,
         score,
         correct_count,
         joined_at,
         claimed_at
    from public.trivia_players;

revoke all on public.trivia_players_public from anon, authenticated;
grant select on public.trivia_players_public to anon, authenticated;

-- 1b. Venue public read model. owner_bee_id and subscription_id withheld.
--     The where-clause reproduces the policy it replaces ("public read active
--     venues" USING status='active') exactly, so patron-facing behaviour for
--     an inactive venue is unchanged.
create view public.trivia_venues_public
  with (security_invoker = off) as
  select id,
         name,
         slug,
         venue_code,
         venue_type,
         logo_url,
         city,
         status,
         created_at,
         settings
    from public.trivia_venues
   where status = 'active';

revoke all on public.trivia_venues_public from anon, authenticated;
grant select on public.trivia_venues_public to anon, authenticated;

-- 1c. Owner read model. This is what makes 1b's narrowing possible: the host
--     console needs owner_bee_id and subscription_id, and today it gets them by
--     filtering the base table, which requires column SELECT on owner_bee_id.
--     auth.uid() reads the per-request JWT GUC and resolves correctly inside a
--     definer view. No grant to anon - a signed-out caller sees nothing.
create view public.trivia_venues_owner
  with (security_invoker = off) as
  select id,
         name,
         slug,
         venue_code,
         venue_type,
         logo_url,
         city,
         owner_bee_id,
         subscription_id,
         status,
         created_at,
         settings
    from public.trivia_venues
   where owner_bee_id = auth.uid();

revoke all on public.trivia_venues_owner from anon, authenticated;
grant select on public.trivia_venues_owner to authenticated;

-- 1d. Write the rule down where a future pass will actually hit it.
--     LEAD RULING, adopted from TRIV26-Q section 2b.
comment on column public.trivia_venues.settings is
  'PUBLIC FIELD. Served to every anonymous patron through trivia_venues_public. Anything private goes in another table - no owner identity, no billing linkage, no keys, no internal notes, no thresholds you would not print on the table tent. LEAD RULING (TRIV26-Q s2b, adopted TRIV30 2026-08-01).';

comment on column public.trivia_venues.owner_bee_id is
  'PRIVATE. Joins a public venue straight to a person. Not in trivia_venues_public; owner-only through trivia_venues_owner. Compounds with the DB14 bees exposure - see TRIV30.';

comment on column public.trivia_venues.subscription_id is
  'PRIVATE. Discloses which venues are paying. Not in trivia_venues_public; owner-only through trivia_venues_owner. Read it through venueIsPaid(), never as bare truthiness.';

comment on column public.trivia_players.device_key is
  'BEARER SECRET. The guest seat''s only identity token - trivia_submit_answer and trivia_claim_player authenticate the caller against it. NEVER expose it in a view, a policy, an RPC return value or a log. Not in trivia_players_public, by design (TRIV30).';

-- ---------------------------------------------------------------------------
-- PART 2 - BREAKING. Requires precondition P1 (client deployed) and P2 (0 live
-- sessions).
-- ---------------------------------------------------------------------------

-- 2a. Close the player read surface.
--     The policy is dropped as well as the grant. Leaving a USING (true) policy
--     behind a revoked grant is a trap: one future `grant select` re-opens the
--     whole table in a single statement, with no policy review.
drop policy if exists "public read players" on public.trivia_players;
revoke all on public.trivia_players from anon, authenticated;

-- 2b. Close the venue read surface. Same reasoning.
drop policy if exists "public read active venues" on public.trivia_venues;
revoke all on public.trivia_venues from anon, authenticated;

-- Both tables keep RLS enabled with zero policies: fail-closed for anon and
-- authenticated, unchanged for service_role (the two edge functions,
-- venue-checkout and stripe-subscription-webhook, use serviceClient() and are
-- unaffected by grants and policies alike).

-- 2c. trivia_submit_answer - the caller check.
--     Signature changes (4 args -> 5). PostgREST resolves by named parameter,
--     so a client sending only the old four gets "function not found" - which is
--     precisely why P1 is a hard precondition and not advice.
--     Adding p_device_key with a DEFAULT instead of dropping the 4-arg overload
--     was considered and rejected: it makes the 4-arg call ambiguous at call
--     time, and a defaulted null would have to be grandfathered, which is the
--     hole again with extra steps.
drop function if exists public.trivia_submit_answer(uuid, uuid, integer, integer);

create function public.trivia_submit_answer(
    p_player_id   uuid,
    p_question_id uuid,
    p_answer_idx  integer,
    p_response_ms integer,
    p_device_key  text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare v_player trivia_players; v_session trivia_sessions; v_q question_bank;
        v_correct boolean; v_points integer; v_limit_ms integer;
begin
  -- THE CALLER CHECK. Patrons are guests: there is no auth.uid() to check
  -- against, which is why this was never written. device_key is the trust
  -- anchor instead - the same token trivia_join_session already keys rejoin on.
  if p_device_key is null or length(btrim(p_device_key)) = 0 then
    raise exception 'player not found';
  end if;

  -- One lookup, both conditions. A wrong key and a wrong id raise the SAME
  -- message on purpose: a distinct "bad key" error would confirm to an attacker
  -- that the player id was real.
  select * into v_player from trivia_players
   where id = p_player_id
     and device_key is not null
     and device_key = p_device_key;
  if not found then raise exception 'player not found'; end if;

  -- ---- unchanged from production below this line, except as noted ----
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

  -- correct_idx STILL RETURNED. Left exactly as production has it - stripping it
  -- is lock_in_phase2_strip_correct_idx's job, not this migration's. The client
  -- type already refuses to read it.
  return jsonb_build_object('correct', v_correct, 'points', v_points, 'correct_idx', v_q.correct_idx);
end $function$;

revoke all on function public.trivia_submit_answer(uuid, uuid, integer, integer, text) from public;
grant execute on function public.trivia_submit_answer(uuid, uuid, integer, integer, text) to anon, authenticated;

-- 2d. trivia_claim_player - the second missing caller check.
--     Today: any signed-in Bee can pass any unclaimed player id and take that
--     seat's score into their own lifetime accruals. The claimant is
--     authenticated; the SEAT never was.
drop function if exists public.trivia_claim_player(uuid);

create function public.trivia_claim_player(
    p_player_id  uuid,
    p_device_key text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare v_bee_id uuid := auth.uid();
begin
  if v_bee_id is null then raise exception 'auth required'; end if;
  if not exists (select 1 from bees where id = v_bee_id) then
    raise exception 'bee profile not found'; end if;
  if p_device_key is null or length(btrim(p_device_key)) = 0 then
    raise exception 'player missing or already claimed'; end if;

  update trivia_players set bee_id = v_bee_id, claimed_at = now()
  where id = p_player_id
    and bee_id is null
    and device_key is not null
    and device_key = p_device_key;
  if not found then raise exception 'player missing or already claimed'; end if;

  return jsonb_build_object('claimed', true, 'bee_id', v_bee_id);
end $function$;

revoke all on function public.trivia_claim_player(uuid, text) from public;
grant execute on function public.trivia_claim_player(uuid, text) to authenticated;

-- 2e. trivia_join_session - stop minting unauthenticatable seats.
--     Same signature, so this is `create or replace` and no flag day of its own.
--     Both deployed callers already pass a key (Play.tsx deviceKey(),
--     Tv.tsx `tv:{CODE}`), so the guard is inert against today's client.
create or replace function public.trivia_join_session(
    p_venue_code text,
    p_nickname   text,
    p_table_tag  text default null,
    p_device_key text default null)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare v_venue trivia_venues; v_session trivia_sessions; v_player trivia_players;
begin
  -- A seat with a null device_key can never authenticate a submit. Refuse to
  -- create one rather than hand a patron a seat that silently cannot answer.
  if p_device_key is null or length(btrim(p_device_key)) = 0 then
    raise exception 'device key required';
  end if;

  select * into v_venue from trivia_venues where venue_code = upper(trim(p_venue_code)) and status='active';
  if not found then raise exception 'venue not found'; end if;

  select * into v_session from trivia_sessions
   where venue_id = v_venue.id and status = 'live' order by created_at desc limit 1;

  if not found then
    insert into trivia_sessions (venue_id, mode, status, started_at)
    values (v_venue.id, 'channel', 'live', now()) returning * into v_session;
  end if;

  select * into v_player from trivia_players
   where session_id = v_session.id and device_key = p_device_key limit 1;
  if found then
    return jsonb_build_object('player_id', v_player.id, 'session_id', v_session.id,
      'venue', v_venue.name, 'rejoined', true);
  end if;

  insert into trivia_players (session_id, nickname, table_tag, device_key)
  values (v_session.id, left(trim(p_nickname),24), nullif(left(trim(coalesce(p_table_tag,'')),24),''), p_device_key)
  returning * into v_player;

  return jsonb_build_object('player_id', v_player.id, 'session_id', v_session.id,
    'venue', v_venue.name, 'rejoined', false);
end $function$;

revoke all on function public.trivia_join_session(text, text, text, text) from public;
grant execute on function public.trivia_join_session(text, text, text, text) to anon, authenticated;

commit;

-- POST-APPLY, outside the transaction - PostgREST will not see the new views or
-- the new function signatures until its schema cache reloads:
--   notify pgrst, 'reload schema';


-- ============================================================================
-- ROLLBACK - exact, verbatim. Restores production as of 2026-08-01.
-- Run the whole block. It is written to be safe to run even on a partial apply.
-- ============================================================================
--
-- begin;
--
-- -- restore trivia_join_session (drops the device-key requirement)
-- create or replace function public.trivia_join_session(
--     p_venue_code text, p_nickname text,
--     p_table_tag text default null, p_device_key text default null)
--  returns jsonb language plpgsql security definer set search_path to 'public'
-- as $function$
-- declare v_venue trivia_venues; v_session trivia_sessions; v_player trivia_players;
-- begin
--   select * into v_venue from trivia_venues where venue_code = upper(trim(p_venue_code)) and status='active';
--   if not found then raise exception 'venue not found'; end if;
--
--   select * into v_session from trivia_sessions
--    where venue_id = v_venue.id and status = 'live' order by created_at desc limit 1;
--
--   if not found then
--     insert into trivia_sessions (venue_id, mode, status, started_at)
--     values (v_venue.id, 'channel', 'live', now()) returning * into v_session;
--   end if;
--
--   if p_device_key is not null then
--     select * into v_player from trivia_players
--      where session_id = v_session.id and device_key = p_device_key limit 1;
--     if found then
--       return jsonb_build_object('player_id', v_player.id, 'session_id', v_session.id,
--         'venue', v_venue.name, 'rejoined', true);
--     end if;
--   end if;
--
--   insert into trivia_players (session_id, nickname, table_tag, device_key)
--   values (v_session.id, left(trim(p_nickname),24), nullif(left(trim(coalesce(p_table_tag,'')),24),''), p_device_key)
--   returning * into v_player;
--
--   return jsonb_build_object('player_id', v_player.id, 'session_id', v_session.id,
--     'venue', v_venue.name, 'rejoined', false);
-- end $function$;
-- revoke all on function public.trivia_join_session(text, text, text, text) from public;
-- grant execute on function public.trivia_join_session(text, text, text, text) to anon, authenticated;
--
-- -- restore trivia_claim_player(uuid)
-- drop function if exists public.trivia_claim_player(uuid, text);
-- create function public.trivia_claim_player(p_player_id uuid)
--  returns jsonb language plpgsql security definer set search_path to 'public'
-- as $function$
-- declare v_bee_id uuid := auth.uid();
-- begin
--   if v_bee_id is null then raise exception 'auth required'; end if;
--   if not exists (select 1 from bees where id = v_bee_id) then
--     raise exception 'bee profile not found'; end if;
--
--   update trivia_players set bee_id = v_bee_id, claimed_at = now()
--   where id = p_player_id and bee_id is null;
--   if not found then raise exception 'player missing or already claimed'; end if;
--
--   return jsonb_build_object('claimed', true, 'bee_id', v_bee_id);
-- end $function$;
-- revoke all on function public.trivia_claim_player(uuid) from public;
-- grant execute on function public.trivia_claim_player(uuid) to anon, authenticated;
--
-- -- restore trivia_submit_answer(uuid, uuid, integer, integer)
-- drop function if exists public.trivia_submit_answer(uuid, uuid, integer, integer, text);
-- create function public.trivia_submit_answer(p_player_id uuid, p_question_id uuid, p_answer_idx integer, p_response_ms integer)
--  returns jsonb language plpgsql security definer set search_path to 'public'
-- as $function$
-- declare v_player trivia_players; v_session trivia_sessions; v_q question_bank;
--         v_correct boolean; v_points integer; v_limit_ms integer;
-- begin
--   select * into v_player from trivia_players where id = p_player_id;
--   if not found then raise exception 'player not found'; end if;
--   select * into v_session from trivia_sessions where id = v_player.session_id;
--   if v_session.status <> 'live' then raise exception 'session not live'; end if;
--   if v_session.current_question_id is distinct from p_question_id then
--     raise exception 'question not current'; end if;
--
--   if v_session.scoring_mode = 'table' and v_player.table_tag is not null then
--     if exists (
--       select 1 from trivia_answers a
--         join trivia_players p2 on p2.id = a.player_id
--        where a.session_id = v_session.id
--          and a.question_id = p_question_id
--          and p2.table_tag = v_player.table_tag) then
--       raise exception 'table already answered this question';
--     end if;
--   end if;
--
--   select * into v_q from question_bank where id = p_question_id;
--   v_limit_ms := coalesce((v_session.settings->>'question_ms')::integer, 15000);
--
--   v_correct := (p_answer_idx = v_q.correct_idx);
--   v_points := case when v_correct
--     then 100 + greatest(0, round(100.0 * (1.0 - least(p_response_ms, v_limit_ms)::numeric / v_limit_ms)))::integer
--     else 0 end;
--
--   insert into trivia_answers (session_id, player_id, question_id, answer_idx, is_correct, response_ms, points)
--   values (v_session.id, p_player_id, p_question_id, p_answer_idx, v_correct, p_response_ms, v_points);
--
--   update trivia_players set score = score + v_points,
--     correct_count = correct_count + (v_correct::integer)
--   where id = p_player_id;
--
--   return jsonb_build_object('correct', v_correct, 'points', v_points, 'correct_idx', v_q.correct_idx);
-- end $function$;
-- revoke all on function public.trivia_submit_answer(uuid, uuid, integer, integer) from public;
-- grant execute on function public.trivia_submit_answer(uuid, uuid, integer, integer) to anon, authenticated;
--
-- -- restore the two read surfaces
-- grant select on public.trivia_players to anon, authenticated;
-- create policy "public read players" on public.trivia_players for select using (true);
--
-- grant select on public.trivia_venues to anon, authenticated;
-- create policy "public read active venues" on public.trivia_venues for select using ((status = 'active'::text));
--
-- drop view if exists public.trivia_venues_owner;
-- drop view if exists public.trivia_venues_public;
-- drop view if exists public.trivia_players_public;
--
-- comment on column public.trivia_venues.settings is null;
-- comment on column public.trivia_venues.owner_bee_id is null;
-- comment on column public.trivia_venues.subscription_id is null;
-- comment on column public.trivia_players.device_key is null;
--
-- commit;
-- notify pgrst, 'reload schema';
--
-- NOTE ON ROLLBACK COMPLETENESS: rolling back restores the hole. It does not
-- restore any device_key an attacker read while it was open - see "burned",
-- above. The four COMMENT statements are reset to null because none of these
-- columns carried a comment before this migration (verified against the
-- 2026-07-26 dump).


-- ============================================================================
-- CLIENT CHANGES - the P1 precondition. TheHoneycomb.games/apps/trivia.
-- Not made in this pass: workdir is TheMANUAL.tech.
-- ============================================================================
--   1. src/lib/trivia.ts getStandings()      .from("trivia_players") -> "trivia_players_public"
--   2. src/lib/trivia.ts getVenueById()      .from("trivia_venues")  -> "trivia_venues_public"
--      src/lib/trivia.ts getVenueByCode()    .from("trivia_venues")  -> "trivia_venues_public"
--   3. src/lib/trivia.ts getOwnedVenues()    .from("trivia_venues").eq("owner_bee_id", beeId)
--                                            -> .from("trivia_venues_owner")  (drop the filter;
--                                               the view already scopes to auth.uid())
--   4. src/lib/trivia.ts submitAnswer()      add p_device_key: deviceKey()
--      src/lib/trivia.ts claimPlayer()       add p_device_key: deviceKey()
--      -- both callers (Play.tsx answer(), Play.tsx claim flow) already run in a
--         context where deviceKey() is available; no prop threading needed.
--
-- The `.select("*")` calls are the reason a column-level REVOKE could not be used
-- instead of views: PostgREST expands select=* to SELECT *, which needs privilege
-- on EVERY column, so a column revoke turns every venue and standings read into
-- 42501 permission denied. Views were chosen over rewriting the client's select
-- lists because the repo already runs this exact pattern (question_bank_public)
-- and because a view cannot be defeated by someone adding a column later.
-- ============================================================================
