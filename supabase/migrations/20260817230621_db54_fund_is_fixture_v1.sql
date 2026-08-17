-- DB54 — FLAG THE TEST SEED: is_fixture on give_campaigns and fountain_pledges (2026-08-17)
-- ROLLBACK: _drafts/20260817230621_db54_fund_is_fixture_v1_rollback.sql
-- Authored as 20260817230000; apply_migration stamped 20260817230621 and both
-- repo files were renamed to the stamped version (DB22 class A1a).
-- Implements the LEAD RULING on DB49's proposal. DB49 did the diagnosis and
-- found the precedent; this file does not re-derive either.
--
-- THE HARM, IN ONE LINE. fountain_begin_close computes the all-or-nothing
-- verdict as raised_cents >= goal_cents, and fountain_counters (DB48) has no
-- seed awareness — so fund-the-fountain's 32000 of fabricated money counts
-- toward a real verdict. One real pledge of 18000 on that campaign would reach
-- the 50000 goal on money that never existed and CAPTURE A REAL GIVER'S CARD on
-- a goal never met. The seed pledges failing their own captures does not save
-- it: THE VERDICT IS COMPUTED BEFORE THE CAPTURES ARE ATTEMPTED.
--
-- DB48 made raised_cents honest ABOUT THE PLEDGE TABLE. It did not make the
-- pledge table honest ABOUT REALITY. This file does the second half.
--
-- THE CONVENTION IS NOT NEW. Three tables across two astras already carry it,
-- all boolean NOT NULL DEFAULT false:
--   elections.is_fixture · justice_entities.is_fixture · justice_dockets.is_fixture
-- Same name, same type, same nullability, same default here. A fourth spelling
-- for one idea is how vocabularies rot.
--
-- BUT NOT THE SAME ENFORCEMENT POINT. JUSTICE enforces at the READ boundary —
-- eight *_public views filter is_fixture, so the public surface never sees a
-- fixture. FUND must not copy that: the danger here is not that someone SEES the
-- seed, it is that the seed PARTICIPATES IN A MONEY DECISION. So FUND takes the
-- ELECTIONS shape (elections_cast_vote / elections_certify refuse on a fixture)
-- and enforces at the WRITE and DERIVATION boundaries instead. The three seed
-- campaigns stay visible on the public grid and get badged by a later FRONT
-- pass — DO NOT PURGE, DO NOT HIDE. Hiding them would leave FUND showing an
-- empty grid on a live public page, and would make the seed HARDER to notice,
-- which is the opposite of the point.
--
-- DEFENCE IN DEPTH, four independent layers. Any one of them alone prevents the
-- harm above; all four are here because each fails differently:
--   1. DERIVATION  — fountain_counters excludes fixture pledges, so no live
--                    total can contain fabricated money (step 3).
--   2. VERDICT     — fountain_begin_close REFUSES on a fixture campaign, so even
--                    if step 3 were reverted no verdict is ever computed and no
--                    capture is ever attempted (step 5).
--   3. ADMISSION   — fountain_register_pledge REFUSES a pledge against a fixture
--                    campaign, so a real giver's card is never even authorized
--                    against one (step 6).
--   4. SEGREGATION — a pledge's is_fixture is DERIVED from its campaign by
--                    trigger and never trusted from the caller, so a mixed
--                    population is unrepresentable (step 7).
--
-- ORDER IS LOAD-BEARING. The flags are written (step 2) while the OLD
-- fixture-unaware counters are still installed, so those UPDATEs are counter
-- no-ops; the counters are then replaced (step 3) and every campaign rederived
-- (step 4). The is_fixture pin on give_campaigns (step 8) is installed LAST, so
-- it cannot interfere with step 2's own flagging UPDATE.
--
-- SECURITY DEFINER + pinned search_path on every function, per the DB40 secdef
-- pattern; EXECUTE revoked from PUBLIC / anon / authenticated on the new trigger
-- function at the bottom. fountain_pledges has RLS with a single own-rows SELECT
-- policy, so an INVOKER counter would see only one Bee's pledges and derive a
-- total that is too small — DEFINER is required, not decorative (DB48).
--
-- MOVES NO MONEY, DELETES NO ROW, PURGES NOTHING. The only value that changes is
-- a derived counter that was never real: fund-the-fountain 32000 -> 0.

-- ---------------------------------------------------------------------------
-- 1. The columns.
--
-- DEFAULT false means every row that already exists and every row created from
-- now on is REAL unless something says otherwise. That is the safe direction: a
-- forgotten flag yields a real campaign that works, not a hidden one that
-- silently does not.

alter table public.give_campaigns
  add column if not exists is_fixture boolean not null default false;

alter table public.fountain_pledges
  add column if not exists is_fixture boolean not null default false;

-- ---------------------------------------------------------------------------
-- 2. Flag the five known 2026-06-24 seed rows, BY NATURAL KEY — slug and
--    PaymentIntent id, never a hardcoded uuid — so the statements are readable
--    and re-runnable.
--
--    Both PaymentIntent ids are fabricated; no Stripe object ever existed for
--    either, and zero bling_transactions reference either pledge's source_ref
--    (DB49), so there is no downstream financial residue anywhere.
--
--    These UPDATEs fire DB48's give_campaigns_derive_counters (BEFORE UPDATE)
--    and fountain_pledges_sync_counters (AFTER UPDATE). Both still run the OLD
--    fixture-unaware counters at this point, so both are no-ops on the numbers.

update public.give_campaigns
   set is_fixture = true
 where slug in ('bee-sanctuary','fund-the-fountain','community-mural');

update public.fountain_pledges
   set is_fixture = true
 where stripe_payment_intent_id in ('pi_seed_1','pi_seed_2');

-- ---------------------------------------------------------------------------
-- 3. THE DERIVATION — fixture pledges leave the money.
--
--    This single change makes the money honest everywhere at once: the public
--    page stops showing $320 that never existed, and the AON verdict stops being
--    poisonable, because fountain_begin_close reads raised_cents off the
--    campaign row that this function derives.
--
--    fund-the-fountain drops to 0 / 0 and THAT IS CORRECT. It was never $320.
--
--    Semantics are otherwise exactly DB48's and deliberately unchanged:
--      raised_cents   = authorized + captured (capture must not make the bar drop)
--      captured_cents = captured only
--      canceled / capture_failed / refunded count toward neither — the D-2 fix.

CREATE OR REPLACE FUNCTION public.fountain_counters(p_campaign_id uuid)
 RETURNS TABLE(raised_cents bigint, captured_cents bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT coalesce(sum(amount_cents) FILTER (WHERE status IN ('authorized','captured')), 0)::bigint,
         coalesce(sum(amount_cents) FILTER (WHERE status = 'captured'), 0)::bigint
    FROM public.fountain_pledges
   WHERE campaign_id = p_campaign_id
     AND is_fixture = false;
$function$;

-- ---------------------------------------------------------------------------
-- 4. Rederive every campaign under the new counters, so the stored numbers are
--    honest immediately rather than at the next pledge touch. fountain_recount
--    is guarded by IS DISTINCT FROM, so this writes exactly one row today:
--    fund-the-fountain, 32000 -> 0.

select public.fountain_recount(id) from public.give_campaigns;

-- ---------------------------------------------------------------------------
-- 5. THE VERDICT — a fixture campaign REFUSES TO CLOSE. Not "computes zero":
--    refuses, before any state change and before any pledge is listed for
--    capture. Belt and braces — even if step 3 were reverted, a fixture campaign
--    must never compute a verdict or capture anything.
--
--    The check sits immediately after the row is loaded and before the
--    status transition, so the exception aborts the whole call having written
--    nothing. Everything else in this body is byte-identical to the pre-DB54
--    definition (md5 9bc736dd9faaf5f0a3390b5acd7d453c).

CREATE OR REPLACE FUNCTION public.fountain_begin_close(p_campaign_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE v_c record; v_success boolean; v_work jsonb;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'service_role only'; END IF;
  SELECT * INTO v_c FROM public.give_campaigns WHERE id=p_campaign_id FOR UPDATE;
  IF v_c.id IS NULL THEN RAISE EXCEPTION 'campaign not found'; END IF;
  IF v_c.is_fixture THEN RAISE EXCEPTION 'campaign is a fixture and cannot be closed'; END IF;
  IF v_c.status = 'closing' THEN NULL;
  ELSIF v_c.status <> 'active' THEN RAISE EXCEPTION 'cannot close in status %', v_c.status;
  END IF;
  IF v_c.funding_model = 'aon' THEN v_success := v_c.raised_cents >= v_c.goal_cents;
  ELSE v_success := true; END IF;
  UPDATE public.give_campaigns SET status='closing' WHERE id=p_campaign_id;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'pledge_id',id,'payment_intent',stripe_payment_intent_id,'amount_cents',amount_cents)),'[]'::jsonb)
    INTO v_work FROM public.fountain_pledges
   WHERE campaign_id=p_campaign_id AND status='authorized';
  RETURN jsonb_build_object('ok',true,'verdict',CASE WHEN v_success THEN 'capture' ELSE 'cancel' END,
           'funding_model',v_c.funding_model,'raised_cents',v_c.raised_cents,'goal_cents',v_c.goal_cents,
           'pledges',v_work);
END; $function$;

-- ---------------------------------------------------------------------------
-- 6. THE STRONGEST GUARD — a fixture campaign never ACCEPTS a real pledge.
--
--    This belongs in the database, not the edge function, and it is achievable
--    in this pass: fountain_pledges has RLS with NO insert policy at all, so
--    the only path that can create a pledge row is this SECURITY DEFINER RPC.
--    Refusing here closes the admission path completely — there is no second
--    door for a function change to have to cover.
--
--    It is not the whole story at the edge, and the residue is named honestly:
--    /pledge opens the Stripe PaymentIntent BEFORE calling this RPC, so a real
--    giver aiming at a fixture campaign now gets an authorization opened and
--    then immediately refused, leaving an orphan uncaptured PI that Stripe voids
--    on its own (~7 days) and that the give-webhook records as unresolved. No
--    money is ever captured and no pledge row is ever created, which is what
--    this pass owes. Moving the refusal AHEAD of the PI create is a FUND edge
--    function change — a deploy, and its own dispatch. NOT DONE HERE.
--
--    Everything else in this body is byte-identical to the pre-DB54 definition
--    (md5 4fbfd6b8b0efeb8f0c11b422a86a4702).

CREATE OR REPLACE FUNCTION public.fountain_register_pledge(p_campaign_id uuid, p_bee_id uuid, p_amount_cents bigint, p_currency text, p_payment_intent_id text, p_source_ref uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE v_status text; v_model text; v_fixture boolean; v_id uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'service_role only'; END IF;
  SELECT status, funding_model, is_fixture INTO v_status, v_model, v_fixture FROM public.give_campaigns WHERE id=p_campaign_id FOR UPDATE;
  IF v_status IS NULL THEN RAISE EXCEPTION 'campaign not found'; END IF;
  IF v_fixture THEN RAISE EXCEPTION 'campaign is a fixture and cannot take a pledge'; END IF;
  IF v_status <> 'active' THEN RAISE EXCEPTION 'campaign not active (%)', v_status; END IF;
  IF v_model IS NULL THEN RAISE EXCEPTION 'campaign has no funding model'; END IF;
  INSERT INTO public.fountain_pledges (campaign_id,bee_id,amount_cents,currency,stripe_payment_intent_id,source_ref)
  VALUES (p_campaign_id,p_bee_id,p_amount_cents,p_currency,p_payment_intent_id,p_source_ref)
  ON CONFLICT (stripe_payment_intent_id) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN RETURN jsonb_build_object('ok',true,'duplicate',true); END IF;
  RETURN jsonb_build_object('ok',true,'pledge_id',v_id);
END; $function$;

-- ---------------------------------------------------------------------------
-- 7. SEGREGATION — a pledge's is_fixture is DERIVED from its campaign, never
--    accepted from a caller. A fixture pledge can therefore exist only on a
--    fixture campaign, which makes a mixed population unrepresentable rather
--    than merely filtered. Fires on INSERT and on any campaign_id move (nothing
--    moves a pledge today; this is here so it cannot silently rot).

CREATE OR REPLACE FUNCTION public.fountain_pledges_fixture_segregation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE v_fixture boolean;
BEGIN
  SELECT is_fixture INTO v_fixture FROM public.give_campaigns WHERE id = NEW.campaign_id;
  IF v_fixture IS NULL THEN RAISE EXCEPTION 'campaign not found'; END IF;
  NEW.is_fixture := v_fixture;
  RETURN NEW;
END; $function$;

drop trigger if exists fountain_pledges_fixture_segregation on public.fountain_pledges;

create trigger fountain_pledges_fixture_segregation
  before insert or update of campaign_id on public.fountain_pledges
  for each row execute function public.fountain_pledges_fixture_segregation();

-- ---------------------------------------------------------------------------
-- 8. PIN THE FLAG AGAINST THE CLIENT. give_campaigns carries give_update_own —
--    a permissive UPDATE policy for the public role, USING (auth.uid() =
--    created_by), with NO with_check — so without this a campaign's own creator
--    could clear is_fixture straight from the client and walk the seed back into
--    the money path. Same vector DB48 closed for raised_cents, same fix.
--
--    The pin binds exactly the two client-reachable roles. auth.role() is NULL
--    over the management API and psql, and 'service_role' for the edge
--    functions, so neither is pinned: an operator or a later migration can still
--    mark or unmark a fixture deliberately. That is the whole point of testing
--    the roles positively rather than testing for "not service_role" —
--    the latter would have silently pinned this migration's own step 2.

CREATE OR REPLACE FUNCTION public.give_campaigns_derive_counters()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE v record;
BEGIN
  SELECT * INTO v FROM public.fountain_counters(NEW.id);
  NEW.raised_cents := v.raised_cents;
  NEW.captured_cents := v.captured_cents;
  IF auth.role() IN ('anon','authenticated') THEN
    IF TG_OP = 'UPDATE' THEN NEW.is_fixture := OLD.is_fixture;
    ELSE NEW.is_fixture := false;
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

-- ---------------------------------------------------------------------------
-- 9. Grants and documentation.

revoke execute on function public.fountain_pledges_fixture_segregation() from public, anon, authenticated;

comment on column public.give_campaigns.is_fixture is
  'TRUE = 2026-06-24 test seed, not a real campaign. Excluded from the derived '
  'counters, refuses to close (fountain_begin_close) and refuses a pledge '
  '(fountain_register_pledge). Matches the elections / justice_* convention. DB54.';

comment on column public.fountain_pledges.is_fixture is
  'Derived from the owning campaign by fountain_pledges_fixture_segregation — '
  'never set by a caller. Fixture pledges are excluded from fountain_counters, '
  'so fabricated money can never reach a live total or an AON verdict. DB54.';
