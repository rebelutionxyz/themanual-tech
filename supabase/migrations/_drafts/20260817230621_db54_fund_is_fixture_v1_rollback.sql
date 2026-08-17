-- ROLLBACK for 20260817230621_db54_fund_is_fixture_v1.sql
-- DB54, 2026-08-17. WRITTEN BEFORE THE FORWARD MIGRATION, per the MIGRATION
-- AMENDMENT (root CLAUDE.md R7): the rollback is stated in full before any apply
-- is proposed.
--
-- WHAT RUNNING THIS RESTORES: the state DB49 diagnosed and DB54 closed. Five
-- fabricated rows become indistinguishable from real ones to every code path;
-- fountain_counters goes back to summing them into give_campaigns.raised_cents;
-- and fountain_begin_close goes back to computing the all-or-nothing verdict
-- (raised_cents >= goal_cents) off that number. fund-the-fountain returns to
-- reading $320 raised on money that never existed, 64% of the way to a 50000
-- goal — so ONE real pledge of 18000 would reach it and CAPTURE A REAL GIVER'S
-- CARD on a goal never met. The seed pledges failing their own captures is not a
-- defence: the verdict is computed before any capture is attempted.
--
-- IT MOVES NO MONEY, DELETES NO PLEDGE AND FREES NO BLiNG!. The forward
-- migration writes no financial fact — it adds a marker, excludes marked rows
-- from a derivation, and refuses two operations on marked campaigns.
--
-- IT LOSES WHICH ROWS WERE MARKED. Dropping the columns discards the marking
-- itself; re-flagging means re-identifying the rows by hand. The five are, by
-- natural key:
--   give_campaigns.slug in ('bee-sanctuary','fund-the-fountain','community-mural')
--   fountain_pledges.stripe_payment_intent_id in ('pi_seed_1','pi_seed_2')
--
-- ORDER MATTERS: the four function bodies are restored FIRST, so that nothing
-- referencing is_fixture survives the column drop. Every body below is the
-- verbatim pre-DB54 definition, recovered with pg_get_functiondef() during the
-- DB54 pre-flight; md5 and octet_length of each are recorded in REPORT.md.
--
-- It exists for protocol completeness, not as a maintenance procedure.

-- 1. Restore fountain_counters to its DB48 body — fixture-unaware, sums every
--    pledge row on the campaign. md5 b00e393f7334b641a4570e9a33fba247, 492 bytes.

CREATE OR REPLACE FUNCTION public.fountain_counters(p_campaign_id uuid)
 RETURNS TABLE(raised_cents bigint, captured_cents bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT coalesce(sum(amount_cents) FILTER (WHERE status IN ('authorized','captured')), 0)::bigint,
         coalesce(sum(amount_cents) FILTER (WHERE status = 'captured'), 0)::bigint
    FROM public.fountain_pledges
   WHERE campaign_id = p_campaign_id;
$function$;

-- 2. Restore fountain_begin_close — no fixture refusal.
--    md5 9bc736dd9faaf5f0a3390b5acd7d453c, 1334 bytes.

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

-- 3. Restore fountain_register_pledge — no fixture refusal.
--    md5 4fbfd6b8b0efeb8f0c11b422a86a4702, 1237 bytes.

CREATE OR REPLACE FUNCTION public.fountain_register_pledge(p_campaign_id uuid, p_bee_id uuid, p_amount_cents bigint, p_currency text, p_payment_intent_id text, p_source_ref uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
END; $function$;

-- 4. Restore give_campaigns_derive_counters — counters only, no is_fixture pin.
--    md5 74f1a8e0322973445de0a11bf1a84ca7, 368 bytes.

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
  RETURN NEW;
END; $function$;

-- 5. Drop the pledge segregation trigger and its function.

drop trigger if exists fountain_pledges_fixture_segregation on public.fountain_pledges;

drop function if exists public.fountain_pledges_fixture_segregation();

-- 6. Rederive every campaign under the restored (fixture-unaware) counters, so
--    the stored numbers match the restored derivation immediately rather than at
--    the next pledge touch. fund-the-fountain goes back to 32000.

select public.fountain_recount(id) from public.give_campaigns;

-- 7. Drop the columns. Order does not matter; neither references the other.

alter table public.fountain_pledges drop column if exists is_fixture;

alter table public.give_campaigns drop column if exists is_fixture;
