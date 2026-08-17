-- DB48 — KILL THE PHANTOM COUNTER (2026-08-17)
-- Fixes FUND_MF v0.1 defect D-2. ROLLBACK: _drafts/20260817181500_db48_fountain_derived_counters_v1_rollback.sql
--
-- THE DEFECT. give_campaigns.raised_cents is a plain bigint that
-- fountain_register_pledge increments at AUTHORIZATION and nothing ever
-- decrements. Stripe voids an uncaptured manual-capture PaymentIntent after
-- about 7 days, and no code path told the database. So the counter reads money
-- that has evaporated, and fountain_begin_close computes the AON verdict
-- (raised_cents >= goal_cents) off that number. A campaign could capture on a
-- goal it never met. captured_cents had the same shape, incremented in
-- fountain_pledge_captured.
--
-- THE FIX, IN ONE SENTENCE: fountain_pledges becomes the only place a pledge
-- amount is recorded, and both counters are derived from it — so a pledge that
-- moves to 'canceled' (which is what an expired auth now becomes, via the
-- give-webhook edge function shipped alongside this migration) takes its money
-- back out of raised_cents automatically.
--
-- WHY A TRIGGER AND NOT A GENERATED COLUMN. The dispatch asked for a generated
-- column if one would serve. One will not: a Postgres STORED generated column's
-- expression may reference only columns of the row being generated, and must be
-- IMMUTABLE. raised_cents is an aggregate over a DIFFERENT table
-- (fountain_pledges), so it is unreachable from any generated-column expression
-- in any current Postgres version. The remaining shapes were a view (breaks
-- every existing reader — src/lib/campaigns.ts selects and ORDER BYs
-- raised_cents on the table, and fountain_begin_close reads it off the locked
-- campaign row) or triggers. Triggers keep the column shape, so nothing above
-- the database changes.
--
-- DERIVED, NOT MERELY MAINTAINED — two triggers, on purpose:
--   1. fountain_pledges_sync_counters (AFTER, on fountain_pledges) recomputes
--      the owning campaign whenever a pledge is inserted, changes status or
--      amount, moves campaign, or is deleted.
--   2. give_campaigns_derive_counters (BEFORE, on give_campaigns) overwrites
--      whatever raised_cents / captured_cents an UPDATE tried to write with the
--      derived values. This is not belt-and-braces: give_campaigns carries the
--      permissive policy give_update_own (UPDATE ... USING auth.uid() =
--      created_by), so before this migration a campaign's own creator could set
--      raised_cents to any number they liked straight from the client. After it,
--      the number cannot be written by anyone — only derived.
--
-- SEMANTICS.
--   raised_cents   = sum(amount_cents) where status in ('authorized','captured')
--                    — money that is live: authorized and not yet voided, plus
--                    money already taken. Capture must not make the bar drop.
--   captured_cents = sum(amount_cents) where status = 'captured' — settled only.
--   'canceled', 'capture_failed' and 'refunded' count toward neither. That is
--   the whole of the D-2 fix: an expired authorization lands in 'canceled' and
--   leaves raised_cents on its way out.
--
-- SECURITY DEFINER is REQUIRED here, not decorative. fountain_pledges has RLS
-- with a single own-rows SELECT policy, so a SECURITY INVOKER counter function
-- running under a campaign creator's UPDATE would see only that Bee's own
-- pledges and would derive a wrong (too small) total. search_path is pinned on
-- every function per the DB40 secdef remediation pattern, and EXECUTE is revoked
-- from PUBLIC / anon / authenticated at the bottom.
--
-- TOUCHES NO SEED ROW. The backfill is guarded by IS DISTINCT FROM and the
-- derivation was measured equal to the stored values for all 3 campaigns before
-- authoring, so it updates zero rows today. Purging or flagging the 2026-06-24
-- test seed is DB49's pass, not this one.

-- ---------------------------------------------------------------- derivation

-- The single definition of what the two counters mean. Everything else calls this.
CREATE OR REPLACE FUNCTION public.fountain_counters(p_campaign_id uuid)
RETURNS TABLE (raised_cents bigint, captured_cents bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
  SELECT coalesce(sum(amount_cents) FILTER (WHERE status IN ('authorized','captured')), 0)::bigint,
         coalesce(sum(amount_cents) FILTER (WHERE status = 'captured'), 0)::bigint
    FROM public.fountain_pledges
   WHERE campaign_id = p_campaign_id;
$$;

-- Write the derived values onto one campaign. The IS DISTINCT FROM guard means a
-- no-op change writes no row version and fires no downstream trigger work.
CREATE OR REPLACE FUNCTION public.fountain_recount(p_campaign_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE v record;
BEGIN
  IF p_campaign_id IS NULL THEN RETURN; END IF;
  SELECT * INTO v FROM public.fountain_counters(p_campaign_id);
  UPDATE public.give_campaigns
     SET raised_cents = v.raised_cents, captured_cents = v.captured_cents
   WHERE id = p_campaign_id
     AND (raised_cents IS DISTINCT FROM v.raised_cents
       OR captured_cents IS DISTINCT FROM v.captured_cents);
END; $$;

-- ------------------------------------------------------------------ triggers

CREATE OR REPLACE FUNCTION public.fountain_pledges_sync_counters()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
BEGIN
  -- OLD covers UPDATE and DELETE; a status or amount change on an unmoved pledge
  -- is fully handled by this single recount.
  IF TG_OP IN ('UPDATE','DELETE') THEN
    PERFORM public.fountain_recount(OLD.campaign_id);
  END IF;
  -- NEW is only a second campaign when the pledge was inserted, or moved between
  -- campaigns (which nothing does today — this is here so it cannot silently rot).
  IF TG_OP = 'INSERT'
     OR (TG_OP = 'UPDATE' AND NEW.campaign_id IS DISTINCT FROM OLD.campaign_id) THEN
    PERFORM public.fountain_recount(NEW.campaign_id);
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS fountain_pledges_sync_counters ON public.fountain_pledges;

CREATE TRIGGER fountain_pledges_sync_counters
  AFTER INSERT OR UPDATE OR DELETE ON public.fountain_pledges
  FOR EACH ROW EXECUTE FUNCTION public.fountain_pledges_sync_counters();

CREATE OR REPLACE FUNCTION public.give_campaigns_derive_counters()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE v record;
BEGIN
  SELECT * INTO v FROM public.fountain_counters(NEW.id);
  NEW.raised_cents := v.raised_cents;
  NEW.captured_cents := v.captured_cents;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS give_campaigns_derive_counters ON public.give_campaigns;

-- Name sorts before give_campaigns_lock8_default_insert, so this runs first among
-- the BEFORE row triggers. The two are independent (astra/nova defaults vs money
-- counters) and the order does not matter; it is recorded so it is not a surprise.
CREATE TRIGGER give_campaigns_derive_counters
  BEFORE INSERT OR UPDATE ON public.give_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.give_campaigns_derive_counters();

-- ------------------------------------------- the two hand-increments come out

-- fountain_register_pledge: identical to the live 2026-06-10 body except that the
-- final `UPDATE give_campaigns SET raised_cents = raised_cents + p_amount_cents`
-- is gone. The INSERT above it now fires fountain_pledges_sync_counters, which
-- derives the same number — leaving the increment in would double-count it.
CREATE OR REPLACE FUNCTION public.fountain_register_pledge(
  p_campaign_id uuid, p_bee_id uuid, p_amount_cents bigint, p_currency text,
  p_payment_intent_id text, p_source_ref uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE v_status text; v_model text; v_id uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'service_role only'; END IF;
  SELECT status, funding_model INTO v_status, v_model FROM public.give_campaigns WHERE id=p_campaign_id FOR UPDATE;
  IF v_status IS NULL THEN RAISE EXCEPTION 'campaign not found'; END IF;
  IF v_status <> 'active' THEN RAISE EXCEPTION 'campaign not active (%)', v_status; END IF;
  IF v_model IS NULL THEN RAISE EXCEPTION 'campaign has no funding model'; END IF;
  INSERT INTO public.fountain_pledges (campaign_id,bee_id,amount_cents,currency,stripe_payment_intent_id,source_ref)
  VALUES (p_campaign_id,p_bee_id,p_amount_cents,p_currency,p_payment_intent_id,p_source_ref)
  ON CONFLICT (stripe_payment_intent_id) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN RETURN jsonb_build_object('ok',true,'duplicate',true); END IF;
  RETURN jsonb_build_object('ok',true,'pledge_id',v_id);
END; $$;

-- fountain_pledge_captured: identical to the live 2026-06-10 body except that the
-- final `UPDATE give_campaigns SET captured_cents = captured_cents + ...` is gone.
-- The `UPDATE fountain_pledges SET status='captured'` one line above it fires the
-- sync trigger, which moves the amount from authorized-only into captured. The
-- BLiNG! reward path, the reserve drain and the ledger row are untouched.
CREATE OR REPLACE FUNCTION public.fountain_pledge_captured(p_pledge_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE v_p record; v_c record; v_mult numeric; v_reserve numeric; v_reward numeric; v_lot bigint;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'service_role only'; END IF;
  SELECT * INTO v_p FROM public.fountain_pledges WHERE id=p_pledge_id FOR UPDATE;
  IF v_p.id IS NULL THEN RAISE EXCEPTION 'pledge not found'; END IF;
  IF v_p.status = 'captured' THEN RETURN jsonb_build_object('ok',true,'duplicate',true); END IF;
  IF v_p.status <> 'authorized' THEN RAISE EXCEPTION 'cannot capture pledge in status %', v_p.status; END IF;
  SELECT id, slug INTO v_c FROM public.give_campaigns WHERE id=v_p.campaign_id;
  SELECT freeing_multiplier, reserve INTO v_mult, v_reserve
    FROM public.bling_system_state WHERE id=1 FOR UPDATE;
  v_reward := round((v_p.amount_cents::numeric/100) * v_mult, 6);
  IF v_reward > v_reserve THEN RAISE EXCEPTION 'reward would exceed reserve'; END IF;
  UPDATE public.bling_system_state
     SET total_supply = total_supply + v_reward, reserve = reserve - v_reward WHERE id=1;
  v_lot := public.lot_credit(v_p.bee_id, v_reward, 'fountain',
            jsonb_build_object('campaign_id',v_c.id,'campaign_slug',v_c.slug,'pledge_id',v_p.id));
  INSERT INTO public.bling_transactions (bee_id,type,amount,balance_after,category,source_type,source_ref,memo)
  VALUES (v_p.bee_id,'fountain_reward',v_reward,
          (SELECT bling_balance FROM public.bees WHERE id=v_p.bee_id),
          'fountain','fountain',v_p.source_ref,'Fountain reward ×'||v_mult||' for campaign '||v_c.slug);
  UPDATE public.fountain_pledges SET status='captured', captured_at=now(), reward_lot_id=v_lot WHERE id=p_pledge_id;
  RETURN jsonb_build_object('ok',true,'reward_freed',v_reward,'lot_id',v_lot);
END; $$;

-- ------------------------------------------------------------------ backfill

-- Measured a no-op before authoring: all 3 campaigns already held exactly the
-- derived values (fund-the-fountain 32000/0, bee-sanctuary 0/0, community-mural
-- 0/0). It runs anyway so the state is provably derived rather than believed to
-- be, and the IS DISTINCT FROM guard inside fountain_recount means it writes
-- nothing when there is nothing to correct.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.give_campaigns LOOP
    PERFORM public.fountain_recount(r.id);
  END LOOP;
END $$;

-- --------------------------------------------------- webhook audit-trail slot

-- The give-webhook edge function logs every verified Stripe event to
-- stripe_events, the same table F6 and the ad-slot rail use. Its product_type
-- CHECK is an allow-list and does not yet carry the FUND value. Widening a CHECK
-- rejects no existing row.
ALTER TABLE public.stripe_events DROP CONSTRAINT stripe_events_product_type_check;

ALTER TABLE public.stripe_events ADD CONSTRAINT stripe_events_product_type_check
  CHECK (product_type = ANY (ARRAY['membership'::text, 'oracle'::text, 'ad_slot'::text, 'venue'::text, 'fund'::text]));

-- -------------------------------------------------------------------- grants

REVOKE EXECUTE ON FUNCTION public.fountain_counters(uuid) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.fountain_recount(uuid) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.fountain_pledges_sync_counters() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.give_campaigns_derive_counters() FROM PUBLIC, anon, authenticated;

COMMENT ON COLUMN public.give_campaigns.raised_cents IS
  'DERIVED — sum(fountain_pledges.amount_cents) where status in (authorized, captured). '
  'Maintained by fountain_pledges_sync_counters and forced by give_campaigns_derive_counters. '
  'Never write it by hand: any value an UPDATE supplies is overwritten by the BEFORE trigger. DB48.';

COMMENT ON COLUMN public.give_campaigns.captured_cents IS
  'DERIVED — sum(fountain_pledges.amount_cents) where status = captured. Same trigger pair '
  'as raised_cents; not hand-writable. DB48.';
