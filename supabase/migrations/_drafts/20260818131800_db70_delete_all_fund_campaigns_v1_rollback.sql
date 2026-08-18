-- ROLLBACK for 20260818131800_db70_delete_all_fund_campaigns_v1.sql
-- DB70, 2026-08-18. WRITTEN BEFORE THE FORWARD MIGRATION per the MIGRATION AMENDMENT.
--
-- WHAT RUNNING THIS RESTORES: fund-live-test-20260817 and all five of its
-- pledges, including 512e8349-… — the platform's first real charge,
-- pi_3U5crDAPNY1rgvEA0e2ndpCB, $13.00 captured. Every value below was taken from
-- to_jsonb() of the live rows at 2026-08-18 13:09 UTC, before a single DELETE ran,
-- and the same capture is archived permanently in ops_docs as
-- doc 'FUND_CAMPAIGN_ARCHIVE' v0.2 (v0.1 is the identical first write).
--
-- A DELETE ROLLBACK CANNOT WORK FROM KEYS, so every column of every deleted row is
-- written out. The column lists are explicit rather than positional: give_campaigns
-- already has two dropped ordinals (5 and 6), so a positional list would be wrong
-- today, never mind after the next column lands.
--
-- ORDER IS FORCED BY TWO MECHANISMS, not by preference:
--   * fountain_pledges.campaign_id REFERENCES give_campaigns(id) — the parent must
--     exist first;
--   * fountain_pledges_fixture_segregation raises on a pledge whose campaign is
--     absent, so a reversed order fails loudly rather than writing an orphan.
--
-- THREE TRIGGERS REWRITE PART OF WHAT IS INSERTED HERE, and that is correct:
--   * give_campaigns_derive_counters overwrites raised_cents/captured_cents from
--     fountain_counters(). Every restored pledge is is_fixture = true, so the
--     derived answer is 0/0 — which is exactly what the deleted row held.
--   * fountain_pledges_fixture_segregation overwrites is_fixture from the parent;
--     the parent is a fixture, so it lands on true either way.
--   * give_campaigns_lock8_default_insert only fills astra_id/nova_id when NULL;
--     astra_id is supplied, nova_id was genuinely NULL. No-op.
--
-- WHAT THIS ROLLBACK DOES NOT NEED TO TOUCH, because DB70 does not delete them:
-- bling_lots #51 (1157 BLiNG! FREEd by the captured pledge, still active) and
-- bling_transactions #92. They survive the forward migration untouched, so
-- restoring the pledge rows re-resolves their dna references with no further work.
--
-- THIS ROLLBACK WAS REHEARSED, not assumed: DB70 ran the forward deletes and these
-- INSERTs inside one self-rolling-back block and compared whole-table to_jsonb()
-- against the pre-delete capture. See REPORT.md.

-- 1. THE CAMPAIGN -------------------------------------------------------------
INSERT INTO public.give_campaigns
  (id, slug, title, description, created_by, status, parent_surface, parent_id,
   starts_at, ends_at, created_at, astra_id, nova_id, funding_model, goal_cents,
   currency, raised_cents, captured_cents, manager_connect_account, closed_at,
   realm_path, location_text, location_coords, cover_url, is_fixture)
VALUES
  ('c4d34666-842f-4f95-be7a-5368c90de480','fund-live-test-20260817','Pledge rail test',
   'A $10 test campaign proving the FUND pledge rail end to end: authorization, 2% platform fee, direct charge on a connected account, and the derived counters. Test mode only, no real money moves.',
   'ab696a36-e3aa-4c78-8137-eb46d3b4e9c6','active',NULL,NULL,
   '2026-08-18 00:22:19.86119+00',NULL,'2026-08-18 00:22:19.86119+00',
   '16c5f71e-8a5d-49e7-86c7-4ff64c4590ac',NULL,'aon',1000,
   'usd',0,0,'acct_1TK1VIAPNY1rgvEA',NULL,
   NULL,NULL,NULL,NULL,true);

-- 2. THE FIVE PLEDGES ---------------------------------------------------------
-- Written in created_at order. Four are test-mode authorizations and cancels; the
-- fifth is the real one.
INSERT INTO public.fountain_pledges
  (id, campaign_id, bee_id, amount_cents, currency, stripe_payment_intent_id,
   status, source_ref, reward_lot_id, created_at, captured_at, authorized_at, is_fixture)
VALUES
  ('6e20e1e4-a588-49b3-8c96-04ecaf1c499b','c4d34666-842f-4f95-be7a-5368c90de480',
   'ab696a36-e3aa-4c78-8137-eb46d3b4e9c6',1000,'usd','pi_3U5apLAPNY1rgvEA2Iu3a1Sz',
   'canceled','322975b6-e1b6-55ec-bc1c-c6873fcdc72f',NULL,
   '2026-08-18 00:24:28.07614+00',NULL,NULL,true),
  ('d502711d-5680-4c59-9736-43ba4593034f','c4d34666-842f-4f95-be7a-5368c90de480',
   'ab696a36-e3aa-4c78-8137-eb46d3b4e9c6',1100,'usd','pi_3U5azMAPNY1rgvEA3ZCi7Lry',
   'authorized','e5d13c33-dd88-5e9e-87a9-75822b8e6071',NULL,
   '2026-08-18 00:34:49.198822+00',NULL,NULL,true),
  ('d057b2bf-1e88-4e15-9965-e9c68213beb9','c4d34666-842f-4f95-be7a-5368c90de480',
   'ab696a36-e3aa-4c78-8137-eb46d3b4e9c6',1200,'usd','pi_3U5bdFAPNY1rgvEA167xTETd',
   'canceled','32193394-e83e-5390-bc05-21a0266dd48e',NULL,
   '2026-08-18 01:16:01.615749+00',NULL,'2026-08-18 01:16:32.19784+00',true),
  ('4adc2597-f227-4823-aa48-829e376cf754','c4d34666-842f-4f95-be7a-5368c90de480',
   'ab696a36-e3aa-4c78-8137-eb46d3b4e9c6',1300,'usd','pi_3U5cqiAPNY1rgvEA1AWRU5WR',
   'authorized','a374c4c9-3e1d-5b30-ae84-24e667fc5d86',NULL,
   '2026-08-18 02:34:01.217857+00',NULL,NULL,true),
  ('512e8349-bf2c-4017-bc81-03fdeed0c650','c4d34666-842f-4f95-be7a-5368c90de480',
   'ab696a36-e3aa-4c78-8137-eb46d3b4e9c6',1300,'usd','pi_3U5crDAPNY1rgvEA0e2ndpCB',
   'captured','733e9d08-a6ae-5701-8a6d-dd4c1ea1b8d5',51,
   '2026-08-18 02:34:32.090368+00','2026-08-18 02:34:58.618137+00','2026-08-18 02:34:58.076642+00',true);

-- 3. RECOUNT so the stored counters match the restored record.
-- Every restored pledge is a fixture, so this settles on 0/0 — the value the
-- deleted row actually held. The loop is belt-and-braces; the pledge INSERTs above
-- already fired fountain_pledges_sync_counters.
DO $rb$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.give_campaigns LOOP
    PERFORM public.fountain_recount(r.id);
  END LOOP;
END $rb$;
