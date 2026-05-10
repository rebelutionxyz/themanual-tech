-- =============================================================================
-- Migration 20260513110000 — Lock 8 (B) · Per-table astra_id / nova_id columns + backfill
-- =============================================================================
-- Date:        2026-05-13
-- Author:      Code (Claude Opus 4.7) — supervised by Butch
-- Status:      UNAPPLIED. Apply Wednesday 2026-05-13 as Migration B of the
--              three-part Lock 8 set (A: registries; B: this file; C: RLS
--              policy rewrite — separate file). High blast radius —
--              touches every content row in every Lock-8-scoped table.
--              Apply in a low-traffic window. Plan-mode required.
-- Source:      shared/canon/wednesday-2026-05-13-lock8-prescope.md §2b + §4 + §5
--              shared/canon/federation-tier-1-scoping.md §Lock 8 (lines 217–229)
--              20260513100000_lock8_a_registries.sql (Migration A — dependency)
--              Sunday investigation pass + Wednesday-pre exclusion ratification
--              (DM family + entity_saves moved to Bee-platform-wide exclusion)
--
-- Purpose:
--   Adds the `astra_id` (NOT NULL) and `nova_id` (nullable) columns to every
--   Lock-8-scoped content table, backfills `astra_id = <themanual-uuid>`
--   for existing rows under the lensed-view assumption, and creates the
--   two indexes per table that future RLS policies (Migration C) and
--   per-Astra queries depend on.
--
--   No RLS policy changes ship in this migration — Migration C handles
--   that separately to keep the RLS cutover risk isolated (per
--   wednesday-2026-05-13-lock8-prescope.md §3b).
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- THE 15 TABLES (ratified Sunday + Wednesday-pre exclusion pass)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--   astra_id NOT NULL + nova_id nullable — full pattern (14 tables):
--     groups, group_memberships, events, event_rsvps, forum_threads,
--     forum_posts, chat_rooms, bazaar_listings, give_campaigns,
--     give_contributions, entity_atom_links, entity_reactions,
--     entity_shares, promotions
--
--   astra_id NOT NULL ONLY (1 table — no nova_id):
--     pillars (Astra config registry; Astras are not sub-owned by Novas)
--
--   Excluded per pre-scope §4 + Lock 9 DB-domain separation:
--     bling_transactions / bling_orders / bling_escrows / bling_system_state /
--     bling_stripe_events  (BLiNG! DB; platform-wide economy)
--     bees / bee_profiles  (theMANUAL spine; canonical Bee identity)
--     atoms / realms / atom_sources / atom_kettle_votes / atom_comments
--                           (taxonomy spine; FNU LNU owned)
--     entity_category_links (flat tags; distinct from semantic atom links)
--     canonical_documents / document_versions / sessions
--                           (platform metadata)
--     bee_disciplines / bee_ranks / rank_history / queen_assignments
--                           (platform-wide rank scope locked 2026-05-10)
--     astra_registry / nova_registry (the registries themselves)
--
--   Excluded as Bee-platform-wide private content (ratified Wednesday-pre,
--   matching Migration C's exclusion list):
--     message_threads / message_participants / messages
--                           (DMs are private cross-Astra communication;
--                            scoping to "initiation Astra" is incoherent
--                            when the receiver lives on a different Astra,
--                            and a Bee's inbox should be a single platform-
--                            wide surface, not split per-Astra)
--     entity_saves          (a Bee's bookmarks belong to the Bee, not to the
--                            Astra they happened to be on when they saved.
--                            Cross-Astra-visible saves match how every other
--                            "personal collection" works on the platform)
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BACKFILL ASSUMPTION (ratified Sunday + Wednesday morning re-confirm)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--   Every existing content row backfills to astra_id = (the themanual seed
--   row's UUID). AtlasINTEL.fyi and Rebelution.fyi content is treated as
--   lensed views of theMANUAL content, not separate Astra provenance.
--
--   If the room ever decides that AtlasINTEL content should be tagged with
--   its own astra_id, that's a future re-tagging migration — distinguish
--   which threads / posts / events came in via AtlasINTEL vs. native
--   theMANUAL at that time. Today, the lensed-view assumption is the
--   cleanest backfill.
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- KNOWN PER-TABLE NUANCES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--   pillars (5 existing seed rows: themanual, freedomblings, rebelution.app,
--     fnulnu, civilizationoftheuniverse) — all 5 backfill to the themanual
--     astra_id. ⚠ The pillars table predates astra_registry and is
--     candidate for deprecation / merge in a future migration. Tracked as
--     #SCH-11; this migration does NOT deprecate.
--
--   promotions has an existing `astra_slug text` column (Phase C). Adding
--     `astra_id uuid` here creates a redundant column pair. ⚠ astra_slug
--     deprecation tracked as #SCH-12; this migration does NOT drop
--     astra_slug — that's its own follow-up.
--
-- Dependencies:
--   - Migration A (20260513100000_lock8_a_registries.sql) MUST have
--     applied. Pre-flight DO block aborts if registries don't exist or if
--     the themanual seed row is missing.
--   - Lock 3 (20260511110000_lock3_discriminators.sql) MUST have applied —
--     astra_or_nova_status enum is consumed by the registries Migration A
--     created. Implicitly verified via Migration A's pre-flight; not
--     re-checked here.
--
-- Idempotency:
--   - ADD COLUMN IF NOT EXISTS — safe to re-run; existing columns untouched.
--   - UPDATE … WHERE astra_id IS NULL — only touches rows that need backfill.
--     A re-run after a successful first apply sees zero NULL rows and
--     UPDATEs nothing.
--   - ALTER COLUMN SET NOT NULL — Postgres no-ops if already NOT NULL.
--   - CREATE INDEX IF NOT EXISTS — safe to re-run.
--   Re-applying is a complete no-op after a successful first apply.
--
-- House-style notes:
--   * Single BEGIN/COMMIT — all 15 tables atomic. If any backfill fails
--     (e.g., FK constraint snag), the whole migration rolls back. No
--     partial states.
--   * Pattern repeats per table. Each table block is annotated with its
--     row-count expectation at write time.
--   * No RLS policy changes ship here — Migration C is the cutover.
--   * Verification queries at end (commented). Rollback at end (commented).
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight: verify Migration A applied (registries + seed row).
-- Captures the themanual UUID for use in each UPDATE statement below.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_astra_reg_exists  boolean;
    v_nova_reg_exists   boolean;
    v_themanual_uuid    uuid;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema='public' AND table_name='astra_registry'
    ) INTO v_astra_reg_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema='public' AND table_name='nova_registry'
    ) INTO v_nova_reg_exists;

    IF NOT v_astra_reg_exists OR NOT v_nova_reg_exists THEN
        RAISE EXCEPTION
            'Pre-flight failed: registries missing (astra_registry=%, nova_registry=%). '
            'Apply Migration A (20260513100000_lock8_a_registries.sql) first.',
            v_astra_reg_exists, v_nova_reg_exists;
    END IF;

    SELECT id INTO v_themanual_uuid
        FROM public.astra_registry
        WHERE slug = 'themanual';

    IF v_themanual_uuid IS NULL THEN
        RAISE EXCEPTION
            'Pre-flight failed: astra_registry seed row (slug=themanual) is missing. '
            'Migration A applied but seed row absent — investigate before backfilling.';
    END IF;

    RAISE NOTICE 'Pre-flight OK: registries present; themanual UUID = %.', v_themanual_uuid;
END
$$;


-- =============================================================================
-- The 15 table blocks. Same pattern except pillars (no nova_id).
-- All UPDATE statements use a sub-SELECT against astra_registry.slug =
-- 'themanual' rather than passing the UUID from the DO block above —
-- captured PL/pgSQL variables do not persist across DO blocks, and the
-- sub-SELECT is equally idempotent.
-- =============================================================================


-- =============================================================================
-- BLOCK 1 — pillars (5 existing seed rows)
-- ⚠ astra_id ONLY — no nova_id. Astras are not sub-owned by Novas.
-- ⚠ Future deprecation candidate (#SCH-11): pillars predates astra_registry.
-- =============================================================================
ALTER TABLE public.pillars
    ADD COLUMN IF NOT EXISTS astra_id uuid REFERENCES public.astra_registry(id);

UPDATE public.pillars
   SET astra_id = (SELECT id FROM public.astra_registry WHERE slug = 'themanual')
 WHERE astra_id IS NULL;

ALTER TABLE public.pillars ALTER COLUMN astra_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS pillars_astra_id_idx
    ON public.pillars (astra_id);


-- =============================================================================
-- BLOCK 2 — groups
-- =============================================================================
ALTER TABLE public.groups
    ADD COLUMN IF NOT EXISTS astra_id uuid REFERENCES public.astra_registry(id),
    ADD COLUMN IF NOT EXISTS nova_id  uuid REFERENCES public.nova_registry(id);

UPDATE public.groups
   SET astra_id = (SELECT id FROM public.astra_registry WHERE slug = 'themanual')
 WHERE astra_id IS NULL;

ALTER TABLE public.groups ALTER COLUMN astra_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS groups_astra_id_idx ON public.groups (astra_id);
CREATE INDEX IF NOT EXISTS groups_nova_id_idx  ON public.groups (nova_id) WHERE nova_id IS NOT NULL;


-- =============================================================================
-- BLOCK 3 — group_memberships (junction; denormalized scope for RLS efficiency)
-- =============================================================================
ALTER TABLE public.group_memberships
    ADD COLUMN IF NOT EXISTS astra_id uuid REFERENCES public.astra_registry(id),
    ADD COLUMN IF NOT EXISTS nova_id  uuid REFERENCES public.nova_registry(id);

UPDATE public.group_memberships
   SET astra_id = (SELECT id FROM public.astra_registry WHERE slug = 'themanual')
 WHERE astra_id IS NULL;

ALTER TABLE public.group_memberships ALTER COLUMN astra_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS group_memberships_astra_id_idx ON public.group_memberships (astra_id);
CREATE INDEX IF NOT EXISTS group_memberships_nova_id_idx  ON public.group_memberships (nova_id) WHERE nova_id IS NOT NULL;


-- =============================================================================
-- BLOCK 4 — events
-- =============================================================================
ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS astra_id uuid REFERENCES public.astra_registry(id),
    ADD COLUMN IF NOT EXISTS nova_id  uuid REFERENCES public.nova_registry(id);

UPDATE public.events
   SET astra_id = (SELECT id FROM public.astra_registry WHERE slug = 'themanual')
 WHERE astra_id IS NULL;

ALTER TABLE public.events ALTER COLUMN astra_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS events_astra_id_idx ON public.events (astra_id);
CREATE INDEX IF NOT EXISTS events_nova_id_idx  ON public.events (nova_id) WHERE nova_id IS NOT NULL;


-- =============================================================================
-- BLOCK 5 — event_rsvps (junction)
-- =============================================================================
ALTER TABLE public.event_rsvps
    ADD COLUMN IF NOT EXISTS astra_id uuid REFERENCES public.astra_registry(id),
    ADD COLUMN IF NOT EXISTS nova_id  uuid REFERENCES public.nova_registry(id);

UPDATE public.event_rsvps
   SET astra_id = (SELECT id FROM public.astra_registry WHERE slug = 'themanual')
 WHERE astra_id IS NULL;

ALTER TABLE public.event_rsvps ALTER COLUMN astra_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS event_rsvps_astra_id_idx ON public.event_rsvps (astra_id);
CREATE INDEX IF NOT EXISTS event_rsvps_nova_id_idx  ON public.event_rsvps (nova_id) WHERE nova_id IS NOT NULL;


-- =============================================================================
-- BLOCK 6 — forum_threads
-- =============================================================================
ALTER TABLE public.forum_threads
    ADD COLUMN IF NOT EXISTS astra_id uuid REFERENCES public.astra_registry(id),
    ADD COLUMN IF NOT EXISTS nova_id  uuid REFERENCES public.nova_registry(id);

UPDATE public.forum_threads
   SET astra_id = (SELECT id FROM public.astra_registry WHERE slug = 'themanual')
 WHERE astra_id IS NULL;

ALTER TABLE public.forum_threads ALTER COLUMN astra_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS forum_threads_astra_id_idx ON public.forum_threads (astra_id);
CREATE INDEX IF NOT EXISTS forum_threads_nova_id_idx  ON public.forum_threads (nova_id) WHERE nova_id IS NOT NULL;


-- =============================================================================
-- BLOCK 7 — forum_posts
-- =============================================================================
ALTER TABLE public.forum_posts
    ADD COLUMN IF NOT EXISTS astra_id uuid REFERENCES public.astra_registry(id),
    ADD COLUMN IF NOT EXISTS nova_id  uuid REFERENCES public.nova_registry(id);

UPDATE public.forum_posts
   SET astra_id = (SELECT id FROM public.astra_registry WHERE slug = 'themanual')
 WHERE astra_id IS NULL;

ALTER TABLE public.forum_posts ALTER COLUMN astra_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS forum_posts_astra_id_idx ON public.forum_posts (astra_id);
CREATE INDEX IF NOT EXISTS forum_posts_nova_id_idx  ON public.forum_posts (nova_id) WHERE nova_id IS NOT NULL;


-- =============================================================================
-- BLOCK 8 — chat_rooms (live video rooms; conversational context belongs
--   to the Astra the room "happened on", same shape as entity_reactions)
-- =============================================================================
ALTER TABLE public.chat_rooms
    ADD COLUMN IF NOT EXISTS astra_id uuid REFERENCES public.astra_registry(id),
    ADD COLUMN IF NOT EXISTS nova_id  uuid REFERENCES public.nova_registry(id);

UPDATE public.chat_rooms
   SET astra_id = (SELECT id FROM public.astra_registry WHERE slug = 'themanual')
 WHERE astra_id IS NULL;

ALTER TABLE public.chat_rooms ALTER COLUMN astra_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS chat_rooms_astra_id_idx ON public.chat_rooms (astra_id);
CREATE INDEX IF NOT EXISTS chat_rooms_nova_id_idx  ON public.chat_rooms (nova_id) WHERE nova_id IS NOT NULL;


-- =============================================================================
-- BLOCK 9 — bazaar_listings
-- =============================================================================
ALTER TABLE public.bazaar_listings
    ADD COLUMN IF NOT EXISTS astra_id uuid REFERENCES public.astra_registry(id),
    ADD COLUMN IF NOT EXISTS nova_id  uuid REFERENCES public.nova_registry(id);

UPDATE public.bazaar_listings
   SET astra_id = (SELECT id FROM public.astra_registry WHERE slug = 'themanual')
 WHERE astra_id IS NULL;

ALTER TABLE public.bazaar_listings ALTER COLUMN astra_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS bazaar_listings_astra_id_idx ON public.bazaar_listings (astra_id);
CREATE INDEX IF NOT EXISTS bazaar_listings_nova_id_idx  ON public.bazaar_listings (nova_id) WHERE nova_id IS NOT NULL;


-- =============================================================================
-- BLOCK 10 — give_campaigns
-- =============================================================================
ALTER TABLE public.give_campaigns
    ADD COLUMN IF NOT EXISTS astra_id uuid REFERENCES public.astra_registry(id),
    ADD COLUMN IF NOT EXISTS nova_id  uuid REFERENCES public.nova_registry(id);

UPDATE public.give_campaigns
   SET astra_id = (SELECT id FROM public.astra_registry WHERE slug = 'themanual')
 WHERE astra_id IS NULL;

ALTER TABLE public.give_campaigns ALTER COLUMN astra_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS give_campaigns_astra_id_idx ON public.give_campaigns (astra_id);
CREATE INDEX IF NOT EXISTS give_campaigns_nova_id_idx  ON public.give_campaigns (nova_id) WHERE nova_id IS NOT NULL;


-- =============================================================================
-- BLOCK 11 — give_contributions
-- =============================================================================
ALTER TABLE public.give_contributions
    ADD COLUMN IF NOT EXISTS astra_id uuid REFERENCES public.astra_registry(id),
    ADD COLUMN IF NOT EXISTS nova_id  uuid REFERENCES public.nova_registry(id);

UPDATE public.give_contributions
   SET astra_id = (SELECT id FROM public.astra_registry WHERE slug = 'themanual')
 WHERE astra_id IS NULL;

ALTER TABLE public.give_contributions ALTER COLUMN astra_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS give_contributions_astra_id_idx ON public.give_contributions (astra_id);
CREATE INDEX IF NOT EXISTS give_contributions_nova_id_idx  ON public.give_contributions (nova_id) WHERE nova_id IS NOT NULL;


-- =============================================================================
-- BLOCK 12 — entity_atom_links
-- =============================================================================
ALTER TABLE public.entity_atom_links
    ADD COLUMN IF NOT EXISTS astra_id uuid REFERENCES public.astra_registry(id),
    ADD COLUMN IF NOT EXISTS nova_id  uuid REFERENCES public.nova_registry(id);

UPDATE public.entity_atom_links
   SET astra_id = (SELECT id FROM public.astra_registry WHERE slug = 'themanual')
 WHERE astra_id IS NULL;

ALTER TABLE public.entity_atom_links ALTER COLUMN astra_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS entity_atom_links_astra_id_idx ON public.entity_atom_links (astra_id);
CREATE INDEX IF NOT EXISTS entity_atom_links_nova_id_idx  ON public.entity_atom_links (nova_id) WHERE nova_id IS NOT NULL;


-- =============================================================================
-- BLOCK 13 — entity_reactions
-- =============================================================================
ALTER TABLE public.entity_reactions
    ADD COLUMN IF NOT EXISTS astra_id uuid REFERENCES public.astra_registry(id),
    ADD COLUMN IF NOT EXISTS nova_id  uuid REFERENCES public.nova_registry(id);

UPDATE public.entity_reactions
   SET astra_id = (SELECT id FROM public.astra_registry WHERE slug = 'themanual')
 WHERE astra_id IS NULL;

ALTER TABLE public.entity_reactions ALTER COLUMN astra_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS entity_reactions_astra_id_idx ON public.entity_reactions (astra_id);
CREATE INDEX IF NOT EXISTS entity_reactions_nova_id_idx  ON public.entity_reactions (nova_id) WHERE nova_id IS NOT NULL;


-- =============================================================================
-- BLOCK 14 — entity_shares
-- =============================================================================
ALTER TABLE public.entity_shares
    ADD COLUMN IF NOT EXISTS astra_id uuid REFERENCES public.astra_registry(id),
    ADD COLUMN IF NOT EXISTS nova_id  uuid REFERENCES public.nova_registry(id);

UPDATE public.entity_shares
   SET astra_id = (SELECT id FROM public.astra_registry WHERE slug = 'themanual')
 WHERE astra_id IS NULL;

ALTER TABLE public.entity_shares ALTER COLUMN astra_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS entity_shares_astra_id_idx ON public.entity_shares (astra_id);
CREATE INDEX IF NOT EXISTS entity_shares_nova_id_idx  ON public.entity_shares (nova_id) WHERE nova_id IS NOT NULL;


-- =============================================================================
-- BLOCK 15 — promotions
-- ⚠ Existing column astra_slug (Phase C) is now redundant with astra_id.
--    Deprecation tracked as #SCH-12; astra_slug stays for now alongside
--    astra_id. New writes should populate both; reads should prefer astra_id.
-- =============================================================================
ALTER TABLE public.promotions
    ADD COLUMN IF NOT EXISTS astra_id uuid REFERENCES public.astra_registry(id),
    ADD COLUMN IF NOT EXISTS nova_id  uuid REFERENCES public.nova_registry(id);

UPDATE public.promotions
   SET astra_id = (SELECT id FROM public.astra_registry WHERE slug = 'themanual')
 WHERE astra_id IS NULL;

ALTER TABLE public.promotions ALTER COLUMN astra_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS promotions_astra_id_idx ON public.promotions (astra_id);
CREATE INDEX IF NOT EXISTS promotions_nova_id_idx  ON public.promotions (nova_id) WHERE nova_id IS NOT NULL;


COMMIT;


-- =============================================================================
-- VERIFICATION (run AFTER COMMIT)
-- =============================================================================
-- (1) Every targeted table has astra_id NOT NULL:
--     SELECT table_name, column_name, is_nullable
--     FROM information_schema.columns
--     WHERE table_schema='public'
--       AND column_name='astra_id'
--       AND table_name IN (
--           'pillars','groups','group_memberships','events','event_rsvps',
--           'forum_threads','forum_posts','chat_rooms','bazaar_listings',
--           'give_campaigns','give_contributions','entity_atom_links',
--           'entity_reactions','entity_shares','promotions'
--       )
--     ORDER BY table_name;
--     -- expect: 15 rows, is_nullable='NO' for all.
--
-- (2) nova_id present on 14 tables (NOT on pillars):
--     SELECT table_name FROM information_schema.columns
--     WHERE table_schema='public' AND column_name='nova_id'
--       AND table_name IN ( … same list as above … )
--     ORDER BY table_name;
--     -- expect: 14 rows; pillars NOT present.
--
-- (3) Excluded tables remain UN-tagged (no astra_id column):
--     SELECT table_name FROM information_schema.columns
--     WHERE table_schema='public' AND column_name='astra_id'
--       AND table_name IN (
--           'message_threads','message_participants','messages','entity_saves'
--       );
--     -- expect: 0 rows. The Bee-platform-wide exclusion is intact.
--
-- (4) All existing rows tagged with themanual (per-table count check):
--     SELECT 'pillars'              AS t, count(*) AS n_themanual FROM public.pillars              WHERE astra_id = (SELECT id FROM public.astra_registry WHERE slug='themanual')
--     UNION ALL SELECT 'groups',                count(*) FROM public.groups                WHERE astra_id = (SELECT id FROM public.astra_registry WHERE slug='themanual')
--     UNION ALL SELECT 'group_memberships',     count(*) FROM public.group_memberships     WHERE astra_id = (SELECT id FROM public.astra_registry WHERE slug='themanual')
--     UNION ALL SELECT 'events',                count(*) FROM public.events                WHERE astra_id = (SELECT id FROM public.astra_registry WHERE slug='themanual')
--     UNION ALL SELECT 'event_rsvps',           count(*) FROM public.event_rsvps           WHERE astra_id = (SELECT id FROM public.astra_registry WHERE slug='themanual')
--     UNION ALL SELECT 'forum_threads',         count(*) FROM public.forum_threads         WHERE astra_id = (SELECT id FROM public.astra_registry WHERE slug='themanual')
--     UNION ALL SELECT 'forum_posts',           count(*) FROM public.forum_posts           WHERE astra_id = (SELECT id FROM public.astra_registry WHERE slug='themanual')
--     UNION ALL SELECT 'chat_rooms',            count(*) FROM public.chat_rooms            WHERE astra_id = (SELECT id FROM public.astra_registry WHERE slug='themanual')
--     UNION ALL SELECT 'bazaar_listings',       count(*) FROM public.bazaar_listings       WHERE astra_id = (SELECT id FROM public.astra_registry WHERE slug='themanual')
--     UNION ALL SELECT 'give_campaigns',        count(*) FROM public.give_campaigns        WHERE astra_id = (SELECT id FROM public.astra_registry WHERE slug='themanual')
--     UNION ALL SELECT 'give_contributions',    count(*) FROM public.give_contributions    WHERE astra_id = (SELECT id FROM public.astra_registry WHERE slug='themanual')
--     UNION ALL SELECT 'entity_atom_links',     count(*) FROM public.entity_atom_links     WHERE astra_id = (SELECT id FROM public.astra_registry WHERE slug='themanual')
--     UNION ALL SELECT 'entity_reactions',      count(*) FROM public.entity_reactions      WHERE astra_id = (SELECT id FROM public.astra_registry WHERE slug='themanual')
--     UNION ALL SELECT 'entity_shares',         count(*) FROM public.entity_shares         WHERE astra_id = (SELECT id FROM public.astra_registry WHERE slug='themanual')
--     UNION ALL SELECT 'promotions',            count(*) FROM public.promotions            WHERE astra_id = (SELECT id FROM public.astra_registry WHERE slug='themanual');
--     -- Each row's count should match SELECT count(*) FROM <table>.
--
-- (5) Indexes present (29 new indexes: 15 astra_id + 14 nova_id partial):
--     SELECT count(*) FROM pg_indexes
--     WHERE schemaname='public'
--       AND (indexname LIKE '%_astra_id_idx' OR indexname LIKE '%_nova_id_idx');
--     -- expect: 29
--
-- (6) FKs wired (15 to astra_registry, 14 to nova_registry):
--     SELECT t.relname, c.conname, pg_get_constraintdef(c.oid)
--     FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
--     JOIN pg_namespace n ON n.oid = c.connamespace
--     WHERE n.nspname='public' AND c.contype='f'
--       AND ( pg_get_constraintdef(c.oid) LIKE '%astra_registry%'
--          OR pg_get_constraintdef(c.oid) LIKE '%nova_registry%' );
--     -- expect: 29 rows.
--
-- (7) Smoke: confirm reads still work (no RLS change in this migration):
--     SELECT count(*) FROM public.forum_threads;
--     SELECT count(*) FROM public.bazaar_listings;
--     -- expect: same counts as pre-migration. RLS unchanged.


-- =============================================================================
-- ROLLBACK (commented out — for reference only)
-- =============================================================================
-- ⚠ Rollback is safe ONLY if Migration C has not yet applied. Once C ships
-- the per-Astra RLS policies, dropping astra_id leaves a broken policy
-- predicate. Roll back C first.
--
-- ⚠ Rollback drops any rows that depend on the FKs (e.g., a row tagged
-- with a nova_id that points to a nova_registry row created post-migration).
-- ON DELETE behavior here is the default — capture pg_dump first if any
-- non-trivial writes have occurred.
--
-- BEGIN;
-- -- Repeat per table (pillars: no nova_id drop):
-- ALTER TABLE public.<T>
--     DROP COLUMN IF EXISTS nova_id,
--     DROP COLUMN IF EXISTS astra_id;
-- -- Indexes drop automatically with the columns.
-- COMMIT;


-- =============================================================================
-- OPEN QUESTIONS LOGGED BY THIS MIGRATION (carry to open-questions-current.md)
-- =============================================================================
-- #SCH-11: pillars deprecation. The pillars table predates astra_registry
--          and is now redundant. Both tables describe Astras; pillars has
--          skin defaults (primary_color, accent_color) and pillar-domain
--          routing while astra_registry is the canonical identity table.
--          Future migration: merge pillars fields into astra_registry,
--          drop pillars. Anchor: BRANDoSOPHIC day (Fri 2026-05-15) might
--          surface the need.
-- #SCH-12: promotions.astra_slug deprecation. astra_slug (text) is now
--          redundant with astra_id (uuid FK). Drop astra_slug in a
--          follow-up; before that, decide whether reader code prefers
--          slug or uuid for cache locality / query simplicity.
--
-- (The previously-flagged #LOCK8-B-3 (cross-Astra saves) and #LOCK8-B-4
--  (cross-Astra DMs) are no longer open questions — the exclusion of
--  entity_saves and the DM family from this migration's table list IS
--  the resolution. Both are now permanently platform-wide tables.)
