-- DB69 — DELETE THE THREE SEED CAMPAIGNS, FLAG THE TEST CAMPAIGN OUT OF THE TOTALS (2026-08-18)
-- ROLLBACK: _drafts/20260818115111_db69_drop_seed_campaigns_v1_rollback.sql
--
-- OWNER RULING 2026-08-18: "prob delete fake campaigns. We will figure out a
-- flagship campaign next month." DB68 proposed the shape and cleared the way for
-- it; this applies what DB68 proposed, unchanged.
--
-- WHY DELETION IS SAFE HERE, measured by DB68 rather than assumed:
--   * exactly ONE foreign key points at give_campaigns —
--     fountain_pledges_campaign_id_fkey, ON DELETE NO ACTION. Nothing cascades by
--     construction; the DELETE simply FAILS while a child row remains.
--   * a sweep of every text/varchar/json/jsonb column in every public table for
--     the three slugs AND their three uuids returned ZERO hits outside
--     give_campaigns itself. No atom_surfaces row, no notification, no
--     stripe_events payload, no realm_path reference.
--   * give_campaigns carries no DELETE policy at all, so this is owner-channel
--     work by construction, not merely by convention.
--
-- WHAT IS KEPT AND WHY: fund-live-test-20260817 holds the record of the
-- platform's first real charge — pi_3U5crDAPNY1rgvEA0e2ndpCB, $13.00 captured,
-- 26 cents of application fee collected (DB65), no custody proven. Deleting it
-- would destroy the platform's own ledger of that. It is flagged out of the
-- public totals instead, which is reversible; deletion is not.
--
-- BOTH FLAGS ARE REQUIRED, and this is the correction FRONT65 measured:
-- fountain_counters filters the PLEDGE's is_fixture, not the campaign's, so
-- flagging only the campaign would leave $13.00 in every total while wearing a
-- "Test data" badge. Flagging only the pledges would leave the campaign able to
-- accept a new give. Each statement does a different job.
--
-- WHAT THIS DOES NOT DO: it does not hide the surviving campaign. is_fixture is
-- not a visibility filter — listCampaigns() has no fixture test and sitemap.ts
-- iterates the same unfiltered list — so the grid still renders one badged card
-- at $0 and /fund/fund-live-test-20260817 still returns 200. Hiding it, or
-- noindexing it, is front work (FRONT65) and is deliberately not smuggled in here.

-- ---------------------------------------------------------------- pre-guard

-- Halts if the three fixture campaigns hold anything other than the two known
-- seed rows. A real pledge on a fixture campaign should be impossible
-- (fountain_register_pledge refuses fixtures, DB54) — if one exists, the
-- assumption behind this whole migration is wrong and it must not run.
DO $db69_guard$
DECLARE v_n int; v_unexpected int;
BEGIN
  SELECT count(*) INTO v_n FROM public.give_campaigns
   WHERE id IN ('09af82d2-a1b6-424f-93b6-370112dc3a13',
                '77435523-9f92-44f1-920c-b00ac92e8db8',
                'fa40c585-d86d-4396-9b8a-90e92af741db')
     AND is_fixture = true;
  IF v_n <> 3 THEN
    RAISE EXCEPTION 'DB69: expected 3 fixture campaigns by id, found %', v_n;
  END IF;

  SELECT count(*) INTO v_unexpected FROM public.fountain_pledges
   WHERE campaign_id IN ('09af82d2-a1b6-424f-93b6-370112dc3a13',
                         '77435523-9f92-44f1-920c-b00ac92e8db8',
                         'fa40c585-d86d-4396-9b8a-90e92af741db')
     AND stripe_payment_intent_id NOT IN ('pi_seed_1','pi_seed_2');
  IF v_unexpected > 0 THEN
    RAISE EXCEPTION 'DB69: % unexpected pledge(s) on a fixture campaign — STOP, that is not a seed row', v_unexpected;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.give_campaigns WHERE slug = 'fund-live-test-20260817') THEN
    RAISE EXCEPTION 'DB69: the campaign to KEEP is missing — refusing to delete anything';
  END IF;
END $db69_guard$;

-- ---------------------------------------------------------------- the deletion

-- Pledges first: the FK is NO ACTION, so the parent cannot go while a child
-- remains. Every DELETE carries is_fixture = true on top of an explicit id list —
-- the id list is already exact, and the flag is what makes a mistyped id fail
-- closed instead of taking the one campaign that must not be lost.
DELETE FROM public.fountain_pledges
 WHERE id IN ('6f543bb8-f449-42c7-829e-ad3b275ddcfc',
              '4791d2cd-e152-4452-a9ca-24f3046ab761')
   AND is_fixture = true
   AND stripe_payment_intent_id IN ('pi_seed_1','pi_seed_2');

DELETE FROM public.give_campaigns
 WHERE id IN ('09af82d2-a1b6-424f-93b6-370112dc3a13',
              '77435523-9f92-44f1-920c-b00ac92e8db8',
              'fa40c585-d86d-4396-9b8a-90e92af741db')
   AND is_fixture = true;

-- ---------------------------------------------------------------- the flagging

-- The pledge flag is what moves the money out of the totals; the campaign flag is
-- what stops fountain_register_pledge accepting a new give. Neither implies the
-- other: fountain_pledges_fixture_segregation fires on INSERT OR UPDATE OF
-- campaign_id only, so a campaign-side flip touches no pledge row and this
-- explicit pledge UPDATE is not re-derived from the parent.
UPDATE public.fountain_pledges SET is_fixture = true
 WHERE campaign_id = (SELECT id FROM public.give_campaigns WHERE slug = 'fund-live-test-20260817');

UPDATE public.give_campaigns SET is_fixture = true
 WHERE slug = 'fund-live-test-20260817';

-- The pledge UPDATE above fires DB48's sync trigger, which recounts. This loop is
-- belt-and-braces for the campaign-side flip, which does not.
DO $db69_recount$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.give_campaigns LOOP
    PERFORM public.fountain_recount(r.id);
  END LOOP;
END $db69_recount$;

-- ---------------------------------------------------------------- the done-test

DO $db69_test$
DECLARE v_c int; v_p int; v_orphan int; v_raised bigint; v_captured bigint;
BEGIN
  SELECT count(*) INTO v_c FROM public.give_campaigns;
  IF v_c <> 1 THEN RAISE EXCEPTION 'DB69: expected 1 campaign remaining, found %', v_c; END IF;

  SELECT count(*) INTO v_c FROM public.give_campaigns
   WHERE slug = 'fund-live-test-20260817' AND is_fixture = true;
  IF v_c <> 1 THEN RAISE EXCEPTION 'DB69: the surviving campaign is not the flagged live-test campaign'; END IF;

  SELECT count(*) INTO v_p FROM public.fountain_pledges;
  IF v_p <> 5 THEN RAISE EXCEPTION 'DB69: expected 5 pledges remaining, found %', v_p; END IF;

  SELECT count(*) INTO v_p FROM public.fountain_pledges WHERE is_fixture = false;
  IF v_p <> 0 THEN RAISE EXCEPTION 'DB69: % pledge(s) left unflagged — money would stay in the totals', v_p; END IF;

  SELECT count(*) INTO v_orphan FROM public.fountain_pledges p
   WHERE NOT EXISTS (SELECT 1 FROM public.give_campaigns c WHERE c.id = p.campaign_id);
  IF v_orphan > 0 THEN RAISE EXCEPTION 'DB69: % orphaned pledge(s)', v_orphan; END IF;

  SELECT raised_cents, captured_cents INTO v_raised, v_captured
    FROM public.give_campaigns WHERE slug = 'fund-live-test-20260817';
  IF v_raised <> 0 OR v_captured <> 0 THEN
    RAISE EXCEPTION 'DB69: the kept campaign still reads %/% — the money did not leave the totals', v_raised, v_captured;
  END IF;

  -- The captured pledge itself must survive intact. Flagging must not have
  -- touched the record of the first real charge.
  IF NOT EXISTS (
    SELECT 1 FROM public.fountain_pledges
     WHERE stripe_payment_intent_id = 'pi_3U5crDAPNY1rgvEA0e2ndpCB'
       AND status = 'captured' AND amount_cents = 1300
       AND authorized_at IS NOT NULL AND captured_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'DB69: the first-real-charge pledge is missing or altered';
  END IF;
END $db69_test$;
