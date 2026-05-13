-- =============================================================================
-- Migration 20260513115000 — Lock 8 (B-aux) · BEFORE INSERT defaulting trigger
--                                              for astra_id + nova_id
-- =============================================================================
-- Date:        2026-05-13
-- Author:      Code (Claude Opus 4.7) — supervised by Butch
-- Status:      UNAPPLIED. Apply Wednesday 2026-05-13 immediately AFTER
--              Migration B (20260513110000_lock8_b_per_table_astra_nova_columns.sql)
--              and BEFORE Migration C (20260513120000_lock8_c_rls_rewrite.sql).
--              Closes the insert-side gap left by B: with astra_id NOT NULL
--              and no DEFAULT, every existing client INSERT would fail.
--              This trigger fills astra_id (and nova_id when applicable)
--              from the request.astra_id / request.nova_id GUCs, falling
--              back to the themanual astra_id when no GUC is set.
--
-- Source:      shared/canon/wednesday-2026-05-13-lock8-prescope.md §3b
--              shared/canon/federation-tier-1-scoping.md §Lock 8 (insert-side)
--              Wednesday afternoon Code-session audit punch list
--                  (6 client INSERT callsites in 2 files — intel.ts +
--                   reactions.ts — would otherwise need 6 manual edits;
--                   Pattern B server-side trigger replaces all 6)
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- WHY A TRIGGER (and not a column DEFAULT)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--   A DEFAULT clause like
--       ALTER TABLE T ALTER COLUMN astra_id SET DEFAULT
--           current_setting('request.astra_id', true)::uuid;
--   works for the GUC-set case but breaks when the GUC is unset:
--   current_setting('...', true) returns NULL, ::uuid casts NULL to NULL,
--   and the NOT NULL constraint then rejects the insert. The DEFAULT
--   cannot conditionally fall back to a hard-coded UUID.
--
--   A BEFORE INSERT trigger CAN — it reads the GUC, branches on whether
--   it's set, and falls back to the themanual UUID when missing or empty.
--   Same primitive for nova_id where the column exists.
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- GUC + FALLBACK CONTRACT
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--   request.astra_id  — set by per-Astra Edge Functions on every request
--                       (Code follow-up post-Wed). When unset or empty
--                       string, trigger falls back to themanual:
--                       16c5f71e-8a5d-49e7-86c7-4ff64c4590ac
--   request.nova_id   — set by per-Nova Edge Functions (when ever Novas
--                       exist) on every request. When unset or empty,
--                       NEW.nova_id stays NULL (acceptable — nova_id
--                       is nullable on all 14 tables that carry it).
--
--   Caller-provided values (NEW.astra_id, NEW.nova_id explicitly set
--   in the INSERT) are NEVER overridden — the trigger only fills NULLs.
--   This preserves the path for service-role writers (and the rare
--   client writer that wants to insert into a non-current Astra) to
--   set the values directly.
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLES BOUND (15 total — same set as Migration B)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--   Bound to lock8_default_astra_and_nova() (14 tables — both columns):
--     groups, group_memberships, events, event_rsvps, forum_threads,
--     forum_posts, chat_rooms, bazaar_listings, give_campaigns,
--     give_contributions, entity_atom_links, entity_reactions,
--     entity_shares, promotions
--
--   Bound to lock8_default_astra_only() (1 table — pillars; no nova_id):
--     pillars
--
--   NOT bound (excluded per Migration B §29–§65 exclusions list):
--     bling_*, bees / bee_profiles, atoms / realms / atom_*,
--     entity_category_links, canonical_documents / document_versions /
--     sessions, bee_disciplines / bee_ranks / rank_history /
--     queen_assignments, astra_registry / nova_registry,
--     message_threads / message_participants / messages, entity_saves
--
-- Dependencies:
--   - Migration A (20260513100000_lock8_a_registries.sql) MUST have applied.
--   - Migration B (20260513110000_lock8_b_per_table_astra_nova_columns.sql)
--     MUST have applied. astra_id columns must exist (and be NOT NULL) on
--     all 15 tables; nova_id must exist on 14 of them.
--   - Pre-flight DO block verifies both and aborts cleanly if either is
--     absent. Also verifies the hard-coded themanual UUID matches the
--     registry's seed row — drift between this migration's literal and
--     production registry is a hard fail.
--
-- Idempotency:
--   - CREATE OR REPLACE FUNCTION — safe to re-run; replaces existing body.
--   - DROP TRIGGER IF EXISTS … then CREATE TRIGGER — safe to re-run;
--     re-creates the trigger atomically with the function it binds to.
--   - Re-applying after a successful first apply re-installs the same
--     function bodies and re-binds the same triggers — net no-op.
--
-- Security:
--   - Trigger functions run SECURITY INVOKER (default). RLS still applies
--     to the inserting role; the trigger does NOT escalate privilege.
--   - search_path explicitly pinned to pg_catalog, public to prevent
--     search-path manipulation per Postgres trigger-security guidance.
--   - Hard-coded themanual UUID is the registry's canonical seed row id;
--     pre-flight verifies the literal matches production.
-- =============================================================================

BEGIN;


-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight: verify Migrations A + B applied, and verify the hard-coded
-- themanual UUID matches the registry's seed row.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_registry_themanual_uuid  uuid;
    v_expected_themanual_uuid  uuid := '16c5f71e-8a5d-49e7-86c7-4ff64c4590ac'::uuid;
    v_missing_astra_id_tables  text[];
    v_missing_nova_id_tables   text[];
    v_required_astra_tables    text[] := ARRAY[
        'pillars','groups','group_memberships','events','event_rsvps',
        'forum_threads','forum_posts','chat_rooms','bazaar_listings',
        'give_campaigns','give_contributions','entity_atom_links',
        'entity_reactions','entity_shares','promotions'
    ];
    v_required_nova_tables     text[] := ARRAY[
        'groups','group_memberships','events','event_rsvps',
        'forum_threads','forum_posts','chat_rooms','bazaar_listings',
        'give_campaigns','give_contributions','entity_atom_links',
        'entity_reactions','entity_shares','promotions'
    ];
BEGIN
    -- A · registry seed row exists?
    SELECT id INTO v_registry_themanual_uuid
    FROM public.astra_registry
    WHERE slug = 'themanual';

    IF v_registry_themanual_uuid IS NULL THEN
        RAISE EXCEPTION
            'Pre-flight failed: astra_registry seed row (slug=themanual) is missing. '
            'Apply Migration A (20260513100000_lock8_a_registries.sql) first.';
    END IF;

    -- A.1 · registry UUID matches the literal hard-coded in this migration?
    IF v_registry_themanual_uuid <> v_expected_themanual_uuid THEN
        RAISE EXCEPTION
            'Pre-flight failed: astra_registry themanual UUID is % but this '
            'migration hard-codes the fallback as %. Either update the literal '
            'in this migration body to match production, or reconcile the '
            'registry seed row UUID. Refusing to install a trigger with a '
            'stale fallback.',
            v_registry_themanual_uuid, v_expected_themanual_uuid;
    END IF;

    -- B · astra_id columns exist on all 15 required tables?
    SELECT array_agg(t)
      INTO v_missing_astra_id_tables
      FROM unnest(v_required_astra_tables) AS t
     WHERE NOT EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name   = t
           AND column_name  = 'astra_id'
     );

    IF v_missing_astra_id_tables IS NOT NULL AND array_length(v_missing_astra_id_tables, 1) > 0 THEN
        RAISE EXCEPTION
            'Pre-flight failed: astra_id column missing on tables: %. '
            'Apply Migration B first.',
            v_missing_astra_id_tables;
    END IF;

    -- B.1 · nova_id columns exist on all 14 required tables (pillars excluded)?
    SELECT array_agg(t)
      INTO v_missing_nova_id_tables
      FROM unnest(v_required_nova_tables) AS t
     WHERE NOT EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name   = t
           AND column_name  = 'nova_id'
     );

    IF v_missing_nova_id_tables IS NOT NULL AND array_length(v_missing_nova_id_tables, 1) > 0 THEN
        RAISE EXCEPTION
            'Pre-flight failed: nova_id column missing on tables: %. '
            'Apply Migration B first.',
            v_missing_nova_id_tables;
    END IF;

    RAISE NOTICE 'Pre-flight OK: registries present; themanual UUID matches (%); all astra_id / nova_id columns present.', v_expected_themanual_uuid;
END
$$;


-- =============================================================================
-- FUNCTION 1 — lock8_default_astra_and_nova()
-- Used by the 14 tables carrying both astra_id and nova_id.
--
-- Logic:
--   * NEW.astra_id IS NULL ?
--       → read request.astra_id GUC.
--       → if set and non-empty, cast to uuid and assign.
--       → else assign themanual fallback UUID.
--   * NEW.nova_id IS NULL ?
--       → read request.nova_id GUC.
--       → if set and non-empty, cast to uuid and assign.
--       → else leave NULL (column is nullable on all 14 tables).
--
-- Caller-provided NEW.astra_id / NEW.nova_id values are never overridden.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.lock8_default_astra_and_nova()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_astra_id_text  text;
    v_nova_id_text   text;
    v_fallback_uuid  uuid := '16c5f71e-8a5d-49e7-86c7-4ff64c4590ac'::uuid;
BEGIN
    -- astra_id ----------------------------------------------------------
    IF NEW.astra_id IS NULL THEN
        v_astra_id_text := current_setting('request.astra_id', true);
        IF v_astra_id_text IS NOT NULL AND v_astra_id_text <> '' THEN
            BEGIN
                NEW.astra_id := v_astra_id_text::uuid;
            EXCEPTION WHEN invalid_text_representation THEN
                -- GUC set but not a valid uuid — fall back rather than error.
                -- Logged as NOTICE so misconfigured Edge Functions surface in
                -- DB logs without breaking the insert path.
                RAISE NOTICE 'lock8_default_astra_and_nova: request.astra_id GUC set to invalid uuid "%", falling back to themanual.', v_astra_id_text;
                NEW.astra_id := v_fallback_uuid;
            END;
        ELSE
            NEW.astra_id := v_fallback_uuid;
        END IF;
    END IF;

    -- nova_id -----------------------------------------------------------
    IF NEW.nova_id IS NULL THEN
        v_nova_id_text := current_setting('request.nova_id', true);
        IF v_nova_id_text IS NOT NULL AND v_nova_id_text <> '' THEN
            BEGIN
                NEW.nova_id := v_nova_id_text::uuid;
            EXCEPTION WHEN invalid_text_representation THEN
                RAISE NOTICE 'lock8_default_astra_and_nova: request.nova_id GUC set to invalid uuid "%", leaving nova_id NULL.', v_nova_id_text;
                -- No fallback — nova_id NULL is acceptable.
            END;
        END IF;
        -- else: leave NEW.nova_id NULL.
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.lock8_default_astra_and_nova() IS
'Lock 8 (B-aux) BEFORE INSERT trigger: fills astra_id from request.astra_id GUC '
'(falling back to themanual UUID 16c5f71e-8a5d-49e7-86c7-4ff64c4590ac) and '
'nova_id from request.nova_id GUC (no fallback — NULL is acceptable). '
'Caller-provided values are never overridden.';


-- =============================================================================
-- FUNCTION 2 — lock8_default_astra_only()
-- Used by the 1 table carrying astra_id only (pillars — Astras are not
-- sub-owned by Novas, so the table has no nova_id column).
-- =============================================================================
CREATE OR REPLACE FUNCTION public.lock8_default_astra_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_astra_id_text  text;
    v_fallback_uuid  uuid := '16c5f71e-8a5d-49e7-86c7-4ff64c4590ac'::uuid;
BEGIN
    IF NEW.astra_id IS NULL THEN
        v_astra_id_text := current_setting('request.astra_id', true);
        IF v_astra_id_text IS NOT NULL AND v_astra_id_text <> '' THEN
            BEGIN
                NEW.astra_id := v_astra_id_text::uuid;
            EXCEPTION WHEN invalid_text_representation THEN
                RAISE NOTICE 'lock8_default_astra_only: request.astra_id GUC set to invalid uuid "%", falling back to themanual.', v_astra_id_text;
                NEW.astra_id := v_fallback_uuid;
            END;
        ELSE
            NEW.astra_id := v_fallback_uuid;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.lock8_default_astra_only() IS
'Lock 8 (B-aux) BEFORE INSERT trigger: fills astra_id from request.astra_id GUC '
'(falling back to themanual UUID 16c5f71e-8a5d-49e7-86c7-4ff64c4590ac). '
'For tables that carry astra_id but no nova_id (pillars). '
'Caller-provided values are never overridden.';


-- =============================================================================
-- TRIGGER BINDINGS — 15 tables total
-- =============================================================================

-- ── 1 · pillars (astra_id only) ────────────────────────────────────────
DROP TRIGGER IF EXISTS pillars_lock8_default_insert ON public.pillars;
CREATE TRIGGER pillars_lock8_default_insert
    BEFORE INSERT ON public.pillars
    FOR EACH ROW EXECUTE FUNCTION public.lock8_default_astra_only();

-- ── 2–15 · The 14 tables with both astra_id + nova_id ──────────────────
DROP TRIGGER IF EXISTS groups_lock8_default_insert ON public.groups;
CREATE TRIGGER groups_lock8_default_insert
    BEFORE INSERT ON public.groups
    FOR EACH ROW EXECUTE FUNCTION public.lock8_default_astra_and_nova();

DROP TRIGGER IF EXISTS group_memberships_lock8_default_insert ON public.group_memberships;
CREATE TRIGGER group_memberships_lock8_default_insert
    BEFORE INSERT ON public.group_memberships
    FOR EACH ROW EXECUTE FUNCTION public.lock8_default_astra_and_nova();

DROP TRIGGER IF EXISTS events_lock8_default_insert ON public.events;
CREATE TRIGGER events_lock8_default_insert
    BEFORE INSERT ON public.events
    FOR EACH ROW EXECUTE FUNCTION public.lock8_default_astra_and_nova();

DROP TRIGGER IF EXISTS event_rsvps_lock8_default_insert ON public.event_rsvps;
CREATE TRIGGER event_rsvps_lock8_default_insert
    BEFORE INSERT ON public.event_rsvps
    FOR EACH ROW EXECUTE FUNCTION public.lock8_default_astra_and_nova();

DROP TRIGGER IF EXISTS forum_threads_lock8_default_insert ON public.forum_threads;
CREATE TRIGGER forum_threads_lock8_default_insert
    BEFORE INSERT ON public.forum_threads
    FOR EACH ROW EXECUTE FUNCTION public.lock8_default_astra_and_nova();

DROP TRIGGER IF EXISTS forum_posts_lock8_default_insert ON public.forum_posts;
CREATE TRIGGER forum_posts_lock8_default_insert
    BEFORE INSERT ON public.forum_posts
    FOR EACH ROW EXECUTE FUNCTION public.lock8_default_astra_and_nova();

DROP TRIGGER IF EXISTS chat_rooms_lock8_default_insert ON public.chat_rooms;
CREATE TRIGGER chat_rooms_lock8_default_insert
    BEFORE INSERT ON public.chat_rooms
    FOR EACH ROW EXECUTE FUNCTION public.lock8_default_astra_and_nova();

DROP TRIGGER IF EXISTS bazaar_listings_lock8_default_insert ON public.bazaar_listings;
CREATE TRIGGER bazaar_listings_lock8_default_insert
    BEFORE INSERT ON public.bazaar_listings
    FOR EACH ROW EXECUTE FUNCTION public.lock8_default_astra_and_nova();

DROP TRIGGER IF EXISTS give_campaigns_lock8_default_insert ON public.give_campaigns;
CREATE TRIGGER give_campaigns_lock8_default_insert
    BEFORE INSERT ON public.give_campaigns
    FOR EACH ROW EXECUTE FUNCTION public.lock8_default_astra_and_nova();

DROP TRIGGER IF EXISTS give_contributions_lock8_default_insert ON public.give_contributions;
CREATE TRIGGER give_contributions_lock8_default_insert
    BEFORE INSERT ON public.give_contributions
    FOR EACH ROW EXECUTE FUNCTION public.lock8_default_astra_and_nova();

DROP TRIGGER IF EXISTS entity_atom_links_lock8_default_insert ON public.entity_atom_links;
CREATE TRIGGER entity_atom_links_lock8_default_insert
    BEFORE INSERT ON public.entity_atom_links
    FOR EACH ROW EXECUTE FUNCTION public.lock8_default_astra_and_nova();

DROP TRIGGER IF EXISTS entity_reactions_lock8_default_insert ON public.entity_reactions;
CREATE TRIGGER entity_reactions_lock8_default_insert
    BEFORE INSERT ON public.entity_reactions
    FOR EACH ROW EXECUTE FUNCTION public.lock8_default_astra_and_nova();

DROP TRIGGER IF EXISTS entity_shares_lock8_default_insert ON public.entity_shares;
CREATE TRIGGER entity_shares_lock8_default_insert
    BEFORE INSERT ON public.entity_shares
    FOR EACH ROW EXECUTE FUNCTION public.lock8_default_astra_and_nova();

DROP TRIGGER IF EXISTS promotions_lock8_default_insert ON public.promotions;
CREATE TRIGGER promotions_lock8_default_insert
    BEFORE INSERT ON public.promotions
    FOR EACH ROW EXECUTE FUNCTION public.lock8_default_astra_and_nova();


COMMIT;


-- =============================================================================
-- VERIFICATION (run AFTER COMMIT)
-- =============================================================================
-- (1) Both functions exist and are SECURITY INVOKER with locked search_path:
--     SELECT p.proname, p.prosecdef, p.proconfig
--       FROM pg_proc p
--       JOIN pg_namespace n ON n.oid = p.pronamespace
--      WHERE n.nspname = 'public'
--        AND p.proname IN ('lock8_default_astra_and_nova','lock8_default_astra_only');
--     -- expect: 2 rows; prosecdef=false (SECURITY INVOKER); proconfig
--     --         contains 'search_path=pg_catalog, public'.
--
-- (2) 15 triggers bound — one per table:
--     SELECT event_object_table, trigger_name, action_timing, event_manipulation
--       FROM information_schema.triggers
--      WHERE trigger_schema = 'public'
--        AND trigger_name LIKE '%_lock8_default_insert'
--      ORDER BY event_object_table;
--     -- expect: 15 rows; action_timing='BEFORE'; event_manipulation='INSERT'.
--
-- (3) Smoke — INSERT without astra_id should succeed and the row should
--     carry the themanual fallback. Run as anon role on a low-traffic
--     table; rollback after. ⚠ Wrap in BEGIN; ... ROLLBACK; — do NOT
--     leave the test row in production.
--     -- BEGIN;
--     -- INSERT INTO public.forum_threads (title, body, created_by)
--     -- VALUES ('lock8-trigger-smoke', '', '<some-bee-uuid>')
--     -- RETURNING astra_id;
--     -- -- expect: astra_id = 16c5f71e-8a5d-49e7-86c7-4ff64c4590ac
--     -- ROLLBACK;
--
-- (4) Smoke — INSERT with explicit astra_id should be left alone:
--     -- BEGIN;
--     -- INSERT INTO public.forum_threads (title, body, created_by, astra_id)
--     -- VALUES ('lock8-trigger-explicit', '', '<some-bee-uuid>',
--     --         '<some-other-astra-uuid>')
--     -- RETURNING astra_id;
--     -- -- expect: astra_id = <some-other-astra-uuid> (NOT overridden).
--     -- ROLLBACK;
--
-- (5) Smoke — GUC-set INSERT should pick up the GUC value:
--     -- BEGIN;
--     -- SET LOCAL request.astra_id = '<atlasintel-astra-uuid-if-it-existed>';
--     -- INSERT INTO public.forum_threads (title, body, created_by)
--     -- VALUES ('lock8-trigger-guc', '', '<some-bee-uuid>')
--     -- RETURNING astra_id;
--     -- -- expect: astra_id = <atlasintel-astra-uuid>
--     -- ROLLBACK;
--
-- (6) Verify pillars trigger uses the astra-only function (no nova_id reference):
--     SELECT t.tgname, p.proname
--       FROM pg_trigger t
--       JOIN pg_proc p ON p.oid = t.tgfoid
--       JOIN pg_class c ON c.oid = t.tgrelid
--      WHERE c.relname = 'pillars'
--        AND t.tgname = 'pillars_lock8_default_insert';
--     -- expect: 1 row; proname = 'lock8_default_astra_only'.


-- =============================================================================
-- ROLLBACK (commented out — for reference only)
-- =============================================================================
-- ⚠ Rolling back this trigger BEFORE Migration B's NOT NULL is reverted
--   breaks every INSERT that relies on the trigger to fill astra_id. If
--   you need to roll back, plan the order: roll back this trigger, deploy
--   client code that stamps astra_id explicitly, THEN consider rolling
--   back Migration B if needed.
--
-- BEGIN;
-- DROP TRIGGER IF EXISTS pillars_lock8_default_insert            ON public.pillars;
-- DROP TRIGGER IF EXISTS groups_lock8_default_insert             ON public.groups;
-- DROP TRIGGER IF EXISTS group_memberships_lock8_default_insert  ON public.group_memberships;
-- DROP TRIGGER IF EXISTS events_lock8_default_insert             ON public.events;
-- DROP TRIGGER IF EXISTS event_rsvps_lock8_default_insert        ON public.event_rsvps;
-- DROP TRIGGER IF EXISTS forum_threads_lock8_default_insert      ON public.forum_threads;
-- DROP TRIGGER IF EXISTS forum_posts_lock8_default_insert        ON public.forum_posts;
-- DROP TRIGGER IF EXISTS chat_rooms_lock8_default_insert         ON public.chat_rooms;
-- DROP TRIGGER IF EXISTS bazaar_listings_lock8_default_insert    ON public.bazaar_listings;
-- DROP TRIGGER IF EXISTS give_campaigns_lock8_default_insert     ON public.give_campaigns;
-- DROP TRIGGER IF EXISTS give_contributions_lock8_default_insert ON public.give_contributions;
-- DROP TRIGGER IF EXISTS entity_atom_links_lock8_default_insert  ON public.entity_atom_links;
-- DROP TRIGGER IF EXISTS entity_reactions_lock8_default_insert   ON public.entity_reactions;
-- DROP TRIGGER IF EXISTS entity_shares_lock8_default_insert      ON public.entity_shares;
-- DROP TRIGGER IF EXISTS promotions_lock8_default_insert         ON public.promotions;
-- DROP FUNCTION IF EXISTS public.lock8_default_astra_and_nova();
-- DROP FUNCTION IF EXISTS public.lock8_default_astra_only();
-- COMMIT;


-- =============================================================================
-- OPEN QUESTIONS LOGGED BY THIS MIGRATION
-- =============================================================================
-- #LOCK8-B-AUX-1: Lifecycle pairing with Migration C bridge. When Migration
--                 C's bridge policy is eventually tightened (i.e., the
--                 "fall back when GUC is NULL" SELECT policy is dropped),
--                 the corresponding question for this trigger is: should
--                 the themanual fallback also be removed (forcing every
--                 insert to come with a GUC)?
--                 Recommendation: yes, eventually. Same trigger session
--                 that tightens C should swap the fallback for a hard
--                 RAISE EXCEPTION 'request.astra_id GUC required'.
--                 Anchor: when every Astra Edge Function is verified to
--                 stamp request.astra_id on every request (post-Cat-1
--                 mass build).
--
-- #LOCK8-B-AUX-2: Should the trigger ALSO fire on UPDATE? Current design
--                 is BEFORE INSERT only. UPDATE preserves astra_id by
--                 default (no NULL → fallback rewrite); explicit
--                 UPDATE SET astra_id = NULL would fail the NOT NULL
--                 constraint directly without going through the trigger.
--                 No known callsite intends this; leave as INSERT-only.
--
-- #LOCK8-B-AUX-3: Invalid-uuid GUC handling. Current design RAISE NOTICE
--                 and falls back to themanual when request.astra_id is
--                 set to an invalid string. Alternative: RAISE EXCEPTION
--                 to surface the misconfiguration immediately. The
--                 fail-soft posture is intentional during cutover (a
--                 misconfigured Edge Function shouldn't bring down user-
--                 facing inserts); revisit when tightening for v2.
