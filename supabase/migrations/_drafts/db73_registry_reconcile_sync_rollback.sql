-- =============================================================================
-- ROLLBACK DRAFT — db73 astra_registry reconcile, SYNC shape
-- PROPOSAL ONLY. NOT APPLIED. Pairs with db73_registry_reconcile_sync.sql.
-- Authored by DB73 (2026-08-18). The forward migration does not exist yet and
-- must not be authored until the owner picks a shape.
--
-- Restores public.astra_registry to its EXACT pre-migration state: the 30 rows
-- below, with their real ids, captured live from production on 2026-08-18.
-- Ids are preserved by the forward migration (every change is an UPDATE, never
-- a DELETE), so this rollback is a pure UPDATE ... FROM VALUES keyed on id plus
-- a DELETE of the 19 rows the forward migration inserted.
-- =============================================================================

BEGIN;

-- ── Guard: refuse to roll back if anything started referencing an inserted row.
-- Fail closed. If this raises, resolve the references by hand before retrying —
-- deleting a referenced astra would orphan real data.
DO $guard$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n
    FROM public.astra_registry r
   WHERE r.slug IN ('exchange', 'fnulnu', 'waggles', 'honeypot', 'beehold', 'memories', 'press', 'feed', 'dating', 'vr', 'genealogy', 'theranking', 'workshop', 'miniwaves', 'production', 'safetycheck', 'therank', 'willtestament', 'justice')
     AND (EXISTS (SELECT 1 FROM public.atlasoracle_directives x WHERE x.astra_id = r.id)
       OR EXISTS (SELECT 1 FROM public.forum_threads     x WHERE x.astra_id = r.id)
       OR EXISTS (SELECT 1 FROM public.forum_posts       x WHERE x.astra_id = r.id)
       OR EXISTS (SELECT 1 FROM public.pillars           x WHERE x.astra_id = r.id)
       OR EXISTS (SELECT 1 FROM public.group_memberships x WHERE x.astra_id = r.id)
       OR EXISTS (SELECT 1 FROM public.events            x WHERE x.astra_id = r.id)
       OR EXISTS (SELECT 1 FROM public.groups            x WHERE x.astra_id = r.id)
       OR EXISTS (SELECT 1 FROM public.entity_shares     x WHERE x.astra_id = r.id)
       OR EXISTS (SELECT 1 FROM public.event_rsvps       x WHERE x.astra_id = r.id)
       OR EXISTS (SELECT 1 FROM public.nova_registry     x WHERE x.astra_id = r.id));
  IF n > 0 THEN
    RAISE EXCEPTION 'db73 rollback refused: % inserted astra row(s) are now referenced', n;
  END IF;
END
$guard$;

-- ── 1. Remove the 19 rows the forward migration inserted.
DELETE FROM public.astra_registry
 WHERE slug IN ('exchange', 'fnulnu', 'waggles', 'honeypot', 'beehold', 'memories', 'press', 'feed', 'dating', 'vr', 'genealogy', 'theranking', 'workshop', 'miniwaves', 'production', 'safetycheck', 'therank', 'willtestament', 'justice');

-- ── 2. Restore the 30 original rows verbatim, keyed by id.
UPDATE public.astra_registry r
   SET slug               = v.slug,
       display_name       = v.display_name,
       domain             = v.domain,
       status             = v.status,
       default_name       = v.default_name,
       astra_grid_group   = v.astra_grid_group,
       show_in_grid       = v.show_in_grid,
       link_redirect_slug = v.link_redirect_slug,
       notes              = v.notes,
       created_by         = v.created_by,
       director_bee_id    = v.director_bee_id,
       board_bee_id       = v.board_bee_id,
       created_at         = v.created_at
  FROM (VALUES
  ('7d7f71f5-f62e-4598-b7ef-1ea78a5cd2bb'::uuid,'atlasads','atlasADs','atlasads.biz','off_grid'::public.astra_or_nova_status,'Promotions','Services','true',NULL,'surface | Ads/Promotions',NULL,NULL,NULL,'2026-06-09 21:05:23.918809+00'::timestamptz),
  ('a0264924-17b3-4373-83a3-4fa0aba83ded'::uuid,'atlasadvocate','AtlasADVOCATE','atlasadvocate.com','off_grid'::public.astra_or_nova_status,'Legal','Services','true',NULL,'surface | Legal | Serves BOTH Legal and Justice realms (Justice realm Astra-jump target).',NULL,NULL,NULL,'2026-06-09 21:05:23.918809+00'::timestamptz),
  ('766cdafb-9665-44a5-bd86-53a6e7c27b89'::uuid,'atlascomms','AtlasCOMMS','atlascomms.live','off_grid'::public.astra_or_nova_status,'Comms','Community','true',NULL,'surface | Comms',NULL,NULL,NULL,'2026-06-09 21:05:23.918809+00'::timestamptz),
  ('65ba3103-bf2c-48ab-9d2b-82a4fd229a9e'::uuid,'atlasenlightened','AtlasENLIGHTENED','atlasenlightened.com','off_grid'::public.astra_or_nova_status,'Education','Services','true',NULL,'surface | Education',NULL,NULL,NULL,'2026-06-09 21:05:23.918809+00'::timestamptz),
  ('907238f2-d8b5-4299-80e1-c2237a342ec1'::uuid,'atlasindustry','AtlasIndustry','atlasindustry.com','off_grid'::public.astra_or_nova_status,'Pro Services','Services','true',NULL,'surface | Pro Services',NULL,NULL,NULL,'2026-06-09 21:05:23.918809+00'::timestamptz),
  ('8103bc91-0618-49bc-a780-40840ed24ff8'::uuid,'atlasintel','AtlasINTEL','atlasintel.fyi','off_grid'::public.astra_or_nova_status,'Forum','Community','true',NULL,'surface | Forum',NULL,NULL,NULL,'2026-06-09 21:05:23.918809+00'::timestamptz),
  ('ab099135-c4d0-4afd-bcd9-0ca3f326cd4e'::uuid,'atlaslounge','AtlasLOUNGE','atlaslounge.com','off_grid'::public.astra_or_nova_status,'Lounge','Community','true',NULL,'surface | Lounge',NULL,NULL,NULL,'2026-06-09 21:05:23.918809+00'::timestamptz),
  ('f0e1a56e-b4d2-4487-9fc7-793c03d3105c'::uuid,'atlasnation','AtlasNATION','atlasnation.com','off_grid'::public.astra_or_nova_status,'Groups','Community','true',NULL,'surface | Groups/Novas',NULL,NULL,NULL,'2026-06-09 21:05:23.918809+00'::timestamptz),
  ('5fade615-e0ce-47b0-89b1-8b1b164aa9f4'::uuid,'atlasoracle','AtlasORACLE','atlasoracle.to','off_grid'::public.astra_or_nova_status,'AI','Services','true',NULL,'layer | AI (not per-atom surface)',NULL,NULL,NULL,'2026-06-09 21:05:23.918809+00'::timestamptz),
  ('7649fca6-63c4-4773-a970-9a830b66fe01'::uuid,'atlasresidential','AtlasRESIDENTIAL','atlasresidential.com','off_grid'::public.astra_or_nova_status,'Residential','Services','true',NULL,'surface | Real Estate',NULL,NULL,NULL,'2026-06-09 21:05:23.918809+00'::timestamptz),
  ('0c6fa9d7-52b0-45ed-af09-cd049a21f738'::uuid,'atlasunited','AtlasUNITED','atlasunited.fyi','off_grid'::public.astra_or_nova_status,'Events','Community','true',NULL,'surface | Events',NULL,NULL,NULL,'2026-06-09 21:05:23.918809+00'::timestamptz),
  ('9b5b88c2-4e4e-40f2-8614-9dbaa54ff10b'::uuid,'atlasvote','AtlasVOTE','atlasvote.org','off_grid'::public.astra_or_nova_status,'Voting','Services','true',NULL,'surface | VOTE (sovereign voting, not betting)',NULL,NULL,NULL,'2026-06-09 21:05:23.918809+00'::timestamptz),
  ('cee4b14a-60df-4f91-88a8-00e5c5a56bad'::uuid,'bazaar','Bazaar',NULL,'off_grid'::public.astra_or_nova_status,'Trading','Community','true','bazaar',NULL,NULL,NULL,NULL,'2026-06-28 05:05:18.223616+00'::timestamptz),
  ('10a8136a-8b61-4800-9808-98cc5d2dd7ed'::uuid,'blingster','BLiNGster.org','blingster.org','off_grid'::public.astra_or_nova_status,'Wagering',NULL,'false',NULL,'surface | Games house, 18+ wagering',NULL,NULL,NULL,'2026-06-09 21:05:23.918809+00'::timestamptz),
  ('a93e808d-a9f3-4aaa-b46b-5b965071312f'::uuid,'braindualgames','Braindual.games','braindual.games','off_grid'::public.astra_or_nova_status,'Trivia',NULL,'false',NULL,'surface | Games house (trivia)',NULL,NULL,NULL,'2026-06-09 21:05:23.918809+00'::timestamptz),
  ('35283e63-c5a8-4376-bc7f-5db21323eb13'::uuid,'brandosophic','BRANDoSOPHIC','brandosophic.com','off_grid'::public.astra_or_nova_status,'Skins','Services','true','brand','layer | Skins (not per-atom surface)',NULL,NULL,NULL,'2026-06-09 21:05:23.918809+00'::timestamptz),
  ('5e2f6cdd-cce1-4b95-89ad-442273cbd36c'::uuid,'dingleberry','DingleBERRY.tech','dingleberry.tech','off_grid'::public.astra_or_nova_status,'Security','Services','true',NULL,'layer | Defense/security/anti-malware',NULL,NULL,NULL,'2026-06-09 21:05:23.918809+00'::timestamptz),
  ('e20194a6-8035-404f-acdc-5d3c45e9d9a9'::uuid,'entertheprize','Entertheprize','entertheprize.com','off_grid'::public.astra_or_nova_status,'Prizes',NULL,'false',NULL,'surface | Marketplace',NULL,NULL,NULL,'2026-06-09 21:05:23.918809+00'::timestamptz),
  ('4bc65ab6-0f6c-486d-a6a4-8f2d7d8017a0'::uuid,'freedomblings','FreedomBLiNGS.com','freedomblings.com','off_grid'::public.astra_or_nova_status,'Currency',NULL,'false',NULL,'platform | BLiNG! ledger/wallet/escrow front-end',NULL,NULL,NULL,'2026-06-09 21:05:23.918809+00'::timestamptz),
  ('d7cb791c-d84b-4ea8-a32a-8376ec6b323e'::uuid,'freedomrings','FreedomRINGS.online','freedomrings.online','off_grid'::public.astra_or_nova_status,'Freedom Rings',NULL,'false',NULL,'surface | AI Tours / Gateway (sec24)',NULL,NULL,NULL,'2026-06-09 21:05:23.918809+00'::timestamptz),
  ('d7975439-b308-401f-b55e-304fce1b1f56'::uuid,'fund','FUND','rebelution.fund','active'::public.astra_or_nova_status,'Funding','Community','true',NULL,'surface | Crowdfunding (The Fountain). Renamed GIVE -> FUND 2026-08-17. Public at themanual.tech/fund; smoke of record GREEN (FRONT57, six external probes). Domain rebelution.fund assigned but NOT attached - gated on DOMAINS v2.2 Stanza B (trademark).',NULL,NULL,NULL,'2026-08-17 16:47:02.592535+00'::timestamptz),
  ('e89097ca-012a-4bd7-b6da-667e31120d2c'::uuid,'honeycombglobal','HoneyComb.global','honeycomb.global','off_grid'::public.astra_or_nova_status,'HoneyComb',NULL,'false',NULL,'root | mother constellation hub (7-hex flower)',NULL,NULL,NULL,'2026-06-09 21:05:23.918809+00'::timestamptz),
  ('71fa3ece-838a-49cf-a92f-63264026adfa'::uuid,'houseofcardgames','Houseofcard.games','houseofcard.games','off_grid'::public.astra_or_nova_status,'Cards',NULL,'false',NULL,'surface | Games house (cards)',NULL,NULL,NULL,'2026-06-09 21:05:23.918809+00'::timestamptz),
  ('4c3375c0-fe98-486c-b905-47487c2c048c'::uuid,'marketplace','Marketplace',NULL,'off_grid'::public.astra_or_nova_status,'Marketplace','Community','false','bazaar',NULL,NULL,NULL,NULL,'2026-06-28 05:05:18.223616+00'::timestamptz),
  ('78f60b85-8873-4138-ae8d-5c705d55aca9'::uuid,'media','Media',NULL,'off_grid'::public.astra_or_nova_status,'Media','Community','true','pulse',NULL,NULL,NULL,NULL,'2026-06-28 01:03:34.376195+00'::timestamptz),
  ('c9b75992-bd90-4ba2-9e3e-b42e686a896b'::uuid,'network','Freedom Network','freedomnetwork.app','off_grid'::public.astra_or_nova_status,'Freedom Network',NULL,'false',NULL,'surface | News/Video; creator side freedomplatform.app',NULL,NULL,NULL,'2026-06-09 21:05:23.918809+00'::timestamptz),
  ('472298c3-f4a4-499a-b61d-40f9e1e81444'::uuid,'pulse','Pulse',NULL,'off_grid'::public.astra_or_nova_status,'Streaming',NULL,'false',NULL,NULL,NULL,NULL,NULL,'2026-06-28 01:03:34.376195+00'::timestamptz),
  ('5dace801-b860-40a8-9040-271deaa0b5d3'::uuid,'thebeegames','TheBee.games','thebee.games','off_grid'::public.astra_or_nova_status,'Spelling Bee',NULL,'false',NULL,'surface | Games house (spelling)',NULL,NULL,NULL,'2026-06-09 21:05:23.918809+00'::timestamptz),
  ('05328bac-db82-40ea-905d-ea557017cb6a'::uuid,'thehoneycombgames','TheHoneycomb.games','thehoneycomb.games','off_grid'::public.astra_or_nova_status,'Games','Community','true','braindualgames','umbrella | Games catalog',NULL,NULL,NULL,'2026-06-09 21:05:23.918809+00'::timestamptz),
  ('16c5f71e-8a5d-49e7-86c7-4ff64c4590ac'::uuid,'themanual','TheMANUAL.tech','themanual.tech','active'::public.astra_or_nova_status,'Knowledge',NULL,'false',NULL,NULL,NULL,NULL,'00000000-0000-0000-0000-000000b0a8d1','2026-05-13 18:56:44.24553+00'::timestamptz)
  ) AS v(id, slug, display_name, domain, status, default_name, astra_grid_group,
         show_in_grid, link_redirect_slug, notes, created_by, director_bee_id,
         board_bee_id, created_at)
 WHERE r.id = v.id;

-- ── 3. Verify: 30 rows, 2 active, and the two referenced ids still resolve.
DO $verify$
DECLARE
  n_rows integer; n_active integer;
BEGIN
  SELECT count(*) INTO n_rows   FROM public.astra_registry;
  SELECT count(*) INTO n_active FROM public.astra_registry WHERE status = 'active';
  IF n_rows <> 30 THEN
    RAISE EXCEPTION 'db73 rollback verify failed: % rows, expected 30', n_rows;
  END IF;
  IF n_active <> 2 THEN
    RAISE EXCEPTION 'db73 rollback verify failed: % active, expected 2', n_active;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.astra_registry WHERE slug = 'themanual') THEN
    RAISE EXCEPTION 'db73 rollback verify failed: themanual missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.astra_registry WHERE slug = 'atlasnation') THEN
    RAISE EXCEPTION 'db73 rollback verify failed: atlasnation missing';
  END IF;
END
$verify$;

COMMIT;
