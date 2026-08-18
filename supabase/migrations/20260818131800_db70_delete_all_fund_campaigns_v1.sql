-- DB70 — DELETE ALL FUND CAMPAIGNS (2026-08-18)
-- ROLLBACK: _drafts/20260818131800_db70_delete_all_fund_campaigns_v1_rollback.sql
--
-- OWNER RULING 2026-08-18: "we were supposed to delete all fund campaigns." This
-- OVERRIDES the DB68/DB69 ruling that kept fund-live-test-20260817 as the local
-- record of the first real charge. give_campaigns and fountain_pledges end this
-- migration EMPTY.
--
-- WHAT IS BEING DESTROYED — stated plainly, not softened:
--   fund-live-test-20260817 holds the platform's FIRST REAL CHARGE. Payment intent
--   pi_3U5crDAPNY1rgvEA0e2ndpCB, $13.00 captured on connected account
--   acct_1TK1VIAPNY1rgvEA at 2026-08-18 02:34:58 UTC, with 26 cents of application
--   fee collected (DB65 measured it). Deleting these rows deletes the LOCAL trace of
--   that event. Stripe's record is durable and is not touched by anything here.
--   Four further pledges go with it: two canceled, two authorized, all test-mode.
--
-- THE ARCHIVE IS THE REPLACEMENT FOR THAT LOCAL TRACE and it was written FIRST.
-- ops_docs doc 'FUND_CAMPAIGN_ARCHIVE' v0.2 carries to_jsonb() of the campaign row,
-- all five pledge rows, and the two BLiNG! rows below, taken from the live tables
-- before any DELETE ran and read back byte-for-byte. The pre-guard below REFUSES TO
-- RUN if that archive is absent. The archive is not the rollback and does not
-- replace it; both exist.
--
-- THE FK SHAPE, re-measured for THIS row rather than inherited from DB69:
--   * exactly ONE foreign key points at give_campaigns —
--     fountain_pledges_campaign_id_fkey, ON DELETE NO ACTION. Nothing cascades by
--     construction; the parent DELETE simply FAILS while a child remains.
--   * ZERO foreign keys point at fountain_pledges. Nothing downstream is torn out.
--   * give_campaigns and fountain_pledges carry NO DELETE policy at all (r/a/w only),
--     so this is owner-channel work by construction, not merely by convention.
--
-- WHAT THE SWEEP FOUND THAT DB69's DID NOT, and this is the finding of the pass. A
-- whole-database sweep of every text/varchar/uuid/json/jsonb/array column for the
-- slug, the campaign uuid and all five pledge uuids returned hits OUTSIDE the two
-- target tables:
--   * bling_lots #51 — 1157 BLiNG! FREEd by the captured pledge at the x89 fountain
--     multiplier, origin 'fountain', still status 'active' with amount_remaining
--     1157. Its `dna` jsonb names pledge_id, campaign_id and campaign_slug.
--   * bling_transactions #92 — "Fountain reward x89 for campaign
--     fund-live-test-20260817", 1157, balance_after 1296.282344.
--   * stripe_events — 4 webhook payloads carrying the campaign id and slug.
--   * ops_dispatches / ops_reports — rail bookkeeping, expected, not a data reference.
-- NEITHER BLiNG! ROW IS DELETED AND NEITHER MAY BE. bling_transactions is an
-- append-only ledger by canon, and the 1157 BLiNG! is live currency sitting in a
-- Bee's balance — deleting the lot would destroy real value, and deleting the
-- transaction would rewrite the audit trail. What this migration therefore DOES do
-- is ORPHAN THEIR PROVENANCE: after it runs, lot #51's dna names a pledge and a
-- campaign that exist only in the archive. That is the cost of the owner's ruling
-- and it is recorded here rather than discovered later. stripe_events is likewise
-- append-only idempotency state and is left alone.
--
-- WHAT THIS DOES NOT DO: it touches no front-end code. /fund already has a built
-- empty state ("No campaigns yet", src/app/page.tsx in REBELUTION.fund) and the
-- campaign route already has a branded not-found segment, so no front work is
-- smuggled in here.

-- ---------------------------------------------------------------- pre-guard

DO $db70_guard$
DECLARE v_n int;
BEGIN
  -- The archive must exist BEFORE anything is destroyed. This is the one guard
  -- that is not about correctness of the delete but about what survives it.
  SELECT count(*) INTO v_n FROM public.ops_docs WHERE doc = 'FUND_CAMPAIGN_ARCHIVE';
  IF v_n = 0 THEN
    RAISE EXCEPTION 'DB70: no FUND_CAMPAIGN_ARCHIVE in ops_docs — refusing to delete the first-charge rows with no permanent record';
  END IF;

  -- The table must hold exactly the one campaign this migration was written
  -- against. A second campaign appearing since the pre-flight means the ruling was
  -- made about a different world.
  SELECT count(*) INTO v_n FROM public.give_campaigns;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'DB70: expected exactly 1 campaign, found % — STOP, this migration names its rows explicitly', v_n;
  END IF;

  SELECT count(*) INTO v_n FROM public.give_campaigns
   WHERE id = 'c4d34666-842f-4f95-be7a-5368c90de480' AND slug = 'fund-live-test-20260817';
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'DB70: the one campaign present is not fund-live-test-20260817';
  END IF;

  -- Exactly the five known pledges, by id. A sixth — a real give arriving between
  -- pre-flight and apply — halts the pass rather than being swept up in it.
  SELECT count(*) INTO v_n FROM public.fountain_pledges;
  IF v_n <> 5 THEN
    RAISE EXCEPTION 'DB70: expected exactly 5 pledges, found % — STOP, a pledge this migration does not name would be destroyed or would block the parent delete', v_n;
  END IF;

  SELECT count(*) INTO v_n FROM public.fountain_pledges
   WHERE id IN ('6e20e1e4-a588-49b3-8c96-04ecaf1c499b',
                'd502711d-5680-4c59-9736-43ba4593034f',
                'd057b2bf-1e88-4e15-9965-e9c68213beb9',
                '4adc2597-f227-4823-aa48-829e376cf754',
                '512e8349-bf2c-4017-bc81-03fdeed0c650');
  IF v_n <> 5 THEN
    RAISE EXCEPTION 'DB70: the 5 pledges present are not the 5 this migration names (matched % by id)', v_n;
  END IF;

  -- The two BLiNG! rows must be here BEFORE, so the done-test's "still here AFTER"
  -- means something.
  IF NOT EXISTS (SELECT 1 FROM public.bling_lots WHERE id = 51 AND amount_remaining = 1157) THEN
    RAISE EXCEPTION 'DB70: bling_lots #51 is missing or altered — the provenance assumption behind this migration is wrong';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.bling_transactions WHERE id = 92) THEN
    RAISE EXCEPTION 'DB70: bling_transactions #92 is missing — the ledger is not in the state this migration was written against';
  END IF;
END $db70_guard$;

-- ---------------------------------------------------------------- the deletion

-- Pledges first: the FK is NO ACTION, so the parent cannot go while a child
-- remains. Rows are named by explicit id even though the id list is now the whole
-- table — a DELETE with no WHERE would happily take a row that arrived after the
-- guard ran, and the guard is the only thing that read these ids.
DELETE FROM public.fountain_pledges
 WHERE id IN ('6e20e1e4-a588-49b3-8c96-04ecaf1c499b',
              'd502711d-5680-4c59-9736-43ba4593034f',
              'd057b2bf-1e88-4e15-9965-e9c68213beb9',
              '4adc2597-f227-4823-aa48-829e376cf754',
              '512e8349-bf2c-4017-bc81-03fdeed0c650');

DELETE FROM public.give_campaigns
 WHERE id = 'c4d34666-842f-4f95-be7a-5368c90de480';

-- ---------------------------------------------------------------- the done-test

DO $db70_test$
DECLARE v_n int;
BEGIN
  SELECT count(*) INTO v_n FROM public.give_campaigns;
  IF v_n <> 0 THEN RAISE EXCEPTION 'DB70: give_campaigns is not empty, holds %', v_n; END IF;

  SELECT count(*) INTO v_n FROM public.fountain_pledges;
  IF v_n <> 0 THEN RAISE EXCEPTION 'DB70: fountain_pledges is not empty, holds %', v_n; END IF;

  -- The BLiNG! must have survived. This is the half of the ruling that is NOT
  -- "delete everything", and it is asserted, not assumed.
  IF NOT EXISTS (
    SELECT 1 FROM public.bling_lots
     WHERE id = 51 AND status = 'active' AND amount_original = 1157 AND amount_remaining = 1157
  ) THEN
    RAISE EXCEPTION 'DB70: bling_lots #51 did not survive intact — real BLiNG! was destroyed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.bling_transactions
     WHERE id = 92 AND amount = 1157 AND type = 'fountain_reward'
  ) THEN
    RAISE EXCEPTION 'DB70: bling_transactions #92 did not survive intact — the append-only ledger was rewritten';
  END IF;

  -- The record of what was destroyed must still be readable.
  IF NOT EXISTS (
    SELECT 1 FROM public.ops_docs
     WHERE doc = 'FUND_CAMPAIGN_ARCHIVE'
       AND body LIKE '%pi_3U5crDAPNY1rgvEA0e2ndpCB%'
  ) THEN
    RAISE EXCEPTION 'DB70: the archive no longer names the first charge';
  END IF;
END $db70_test$;
