-- ROLLBACK for 20260818115111_db69_drop_seed_campaigns_v1.sql
-- DB69, 2026-08-18. WRITTEN BEFORE THE FORWARD MIGRATION per the MIGRATION AMENDMENT.
--
-- WHAT RUNNING THIS RESTORES: the three seed campaigns and their two fabricated
-- pledges, and it un-flags fund-live-test-20260817 so its $13.00 returns to the
-- public totals.
--
-- A DELETE ROLLBACK CANNOT WORK FROM KEYS, so every column of every deleted row
-- is written out below, captured verbatim from to_jsonb() at 2026-08-18 11:4x UTC
-- while the rows still existed. The column lists are explicit rather than
-- positional: a column added to either table later cannot silently shift a value
-- into the wrong slot.
--
-- ORDER IS FORCED BY TWO MECHANISMS, not by preference:
--   * fountain_pledges.campaign_id REFERENCES give_campaigns(id) — the parent must
--     exist first;
--   * fountain_pledges_fixture_segregation raises 'campaign not found' on a pledge
--     whose campaign is absent, so a reversed order fails loudly rather than
--     writing an orphan.
--
-- THREE TRIGGERS REWRITE PART OF WHAT IS INSERTED HERE, and that is correct:
--   * give_campaigns_derive_counters overwrites raised_cents/captured_cents from
--     fountain_counters(). The literals below are therefore advisory. For these
--     rows the derived answer is 0/0 — fixture pledges are excluded — which is
--     exactly what the deleted rows held.
--   * fountain_pledges_fixture_segregation overwrites is_fixture from the parent
--     campaign; the parents are fixtures, so it lands on true either way.
--   * lock8_default_astra_and_nova only fills astra_id/nova_id when NULL;
--     astra_id is supplied, nova_id was genuinely NULL. No-op.
--
-- THIS ROLLBACK WAS REHEARSED, not assumed: DB69 ran the forward deletes and
-- these INSERTs inside one self-rolling-back block and compared to_jsonb() of
-- every restored row against the pre-delete capture. See REPORT.md.

-- 1. THE THREE CAMPAIGNS ------------------------------------------------------
INSERT INTO public.give_campaigns
  (id, slug, title, description, created_by, status, parent_surface, parent_id,
   starts_at, ends_at, created_at, astra_id, nova_id, funding_model, goal_cents,
   currency, raised_cents, captured_cents, manager_connect_account, closed_at,
   realm_path, location_text, location_coords, cover_url, is_fixture)
VALUES
  ('09af82d2-a1b6-424f-93b6-370112dc3a13','bee-sanctuary','Bee Sanctuary',
   'Early draft — funding details to come.',
   'ab696a36-e3aa-4c78-8137-eb46d3b4e9c6','active','give'::public.surface_type,NULL,
   '2026-06-24 17:55:01.362471+00',NULL,'2026-06-24 17:55:01.362471+00',
   '16c5f71e-8a5d-49e7-86c7-4ff64c4590ac',NULL,NULL,NULL,
   'usd',0,0,NULL,NULL,
   ARRAY['Science']::text[],NULL,NULL,NULL,true),
  ('77435523-9f92-44f1-920c-b00ac92e8db8','community-mural','Community Mural',
   'Commission a mural for the commons.',
   'ab696a36-e3aa-4c78-8137-eb46d3b4e9c6','active','give'::public.surface_type,NULL,
   '2026-06-24 17:55:01.362471+00',NULL,'2026-06-24 17:55:01.362471+00',
   '16c5f71e-8a5d-49e7-86c7-4ff64c4590ac',NULL,'kwyr',100000,
   'usd',0,0,'acct_test_seed',NULL,
   ARRAY['Culture']::text[],'Seattle, WA','(-122.3321,47.6062)'::point,NULL,true),
  ('fa40c585-d86d-4396-9b8a-90e92af741db','fund-the-fountain','Fund the Fountain',
   'Help seed the Fountain so creators can raise BLiNG!-rewarded support.',
   'ab696a36-e3aa-4c78-8137-eb46d3b4e9c6','active','give'::public.surface_type,NULL,
   '2026-06-24 17:55:01.362471+00',NULL,'2026-06-24 17:55:01.362471+00',
   '16c5f71e-8a5d-49e7-86c7-4ff64c4590ac',NULL,'aon',50000,
   'usd',0,0,'acct_test_seed',NULL,
   ARRAY['Society']::text[],NULL,NULL,NULL,true);

-- 2. THE TWO SEED PLEDGES -----------------------------------------------------
INSERT INTO public.fountain_pledges
  (id, campaign_id, bee_id, amount_cents, currency, stripe_payment_intent_id,
   status, source_ref, reward_lot_id, created_at, captured_at, authorized_at, is_fixture)
VALUES
  ('6f543bb8-f449-42c7-829e-ad3b275ddcfc','fa40c585-d86d-4396-9b8a-90e92af741db',
   'ab696a36-e3aa-4c78-8137-eb46d3b4e9c6',20000,'usd','pi_seed_1',
   'authorized','f86ee3b5-5895-48b1-ba74-f285794d7dcc',NULL,
   '2026-06-24 17:55:01.362471+00',NULL,NULL,true),
  ('4791d2cd-e152-4452-a9ca-24f3046ab761','fa40c585-d86d-4396-9b8a-90e92af741db',
   '00000000-0000-0000-0000-000000000bee',12000,'usd','pi_seed_2',
   'authorized','a4fd8283-e848-4d2f-9471-fba81d88215f',NULL,
   '2026-06-24 17:55:01.362471+00',NULL,NULL,true);

-- 3. UN-FLAG THE TEST CAMPAIGN AND ITS FIVE PLEDGES ---------------------------
-- Both statements are required: the segregation trigger fires only on INSERT or
-- on UPDATE OF campaign_id, so neither side propagates to the other.
UPDATE public.fountain_pledges SET is_fixture = false
 WHERE campaign_id = (SELECT id FROM public.give_campaigns WHERE slug = 'fund-live-test-20260817');

UPDATE public.give_campaigns SET is_fixture = false
 WHERE slug = 'fund-live-test-20260817';

-- 4. RECOUNT so the stored counters match the restored record (back to 1300/1300).
DO $rb$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.give_campaigns LOOP
    PERFORM public.fountain_recount(r.id);
  END LOOP;
END $rb$;
