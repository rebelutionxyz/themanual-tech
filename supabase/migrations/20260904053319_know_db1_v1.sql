-- ============================================================================
-- KNOW_DB1 - schema for the four kNOW/Justice surfaces with no table today
-- Canon: KNOW_SPEC v0.3 (locked), CURRENCY_LAW v1.4/v1.6, FEE_SCHEDULE v1.0,
--        JMF v0.16. Lane law: justice_* slugs never rename.
-- ----------------------------------------------------------------------------
-- STATUS: APPLIED 2026-09-04 05:33:19 UTC on owner authorisation ("apply db1
--   tonight", KNOW_DB1_APPLY dispatch), stamped in
--   supabase_migrations.schema_migrations as version 20260904053319. Promoted
--   out of _drafts/ to this filename to match. Pre-flight held correctly at
--   the MIGRATION AMENDMENT gate first (MIGRATION_RECONCILE1 found a
--   substantive anon-grant divergence in an unrelated pair of migrations;
--   MIGRATION_RECONCILE2 closed it; reconcile.mjs measure returned RECONCILED
--   exit 0 before this file was applied). Post-apply verification in
--   REPORT.md: 4 tables, 2 columns, the gate function + both triggers, 7
--   policies all present; fee_schedule holds exactly one know_boost row
--   (35%, dormant); all 1773 justice_dockets rows still read victim_crime
--   NULL (nothing backfilled); the victim-crime gate trigger was tested with
--   a real INSERT attempt against a NULL-victim_crime docket and correctly
--   refused it (rolled back, zero rows left in justice_boosts).
--   Rollback stays a draft, never promoted: supabase/migrations/_drafts/
--   know_db1_v1_rollback.sql.
--
-- CONTEXT: WALK_PACKETS v0.2 sheet #8 found 7 of 17 REBELUTION.org routes
--   real; 10 render an honest not-landed stub. Four of those ten have no
--   table behind them: watches, boosts, collections, contributions.
--
-- WHY EXTEND OVER NEW TABLES (per dispatch instruction, confirmed live against
--   the running schema, not just this draft's older sibling file at
--   verify-out/adopt/20260726191144_justice_schema_v1.sql):
--   - CONTRIBUTIONS get NO new table. KNOW_SPEC v0.3 item 4 describes "a
--     sourced submission (document/link/connection + source), review queue,
--     never auto-published, public identity, premium BLiNG on acceptance" -
--     that is justice_filings verbatim (type='evidence' is the closest
--     existing fit for a document/link submission; review_status defaults
--     'pending_review', i.e. never auto-published, already). Acceptance
--     (review_status -> 'entered') is where a future review RPC would award
--     karma via justice_karma_ledger, reading the new multiplier below. No
--     schema gap here - only a not-yet-built RPC, which is a later pass
--     (not this one; NOT IN THIS PASS also excludes it explicitly for leads).
--   - The PAYOUT bridge itself (karma points -> BLiNG) DOES NOT EXIST ANYWHERE
--     on the platform today. Verified: no function in this project references
--     both justice_karma_ledger and bling_* (pg_proc.prosrc scanned). The two
--     closest analogs - atom_contributions' Fibonacci royalty distribution and
--     the @combrewardspool system bee (schema-v9-rewards-pool.sql) - are both
--     explicitly parked "distribution mechanics land in a later file." So
--     "mirror the EXISTING payout structure" (KNOW_SPEC v0.3 item 4) cannot
--     mean a literal existing BLiNG-crediting mechanism, because none is live.
--     This migration therefore does the honest, schema-only half: a config
--     multiplier a future payout dispatcher reads (Section 4 below). Building
--     that dispatcher is out of scope for a schema-draft pass and is not
--     something this file invents unilaterally.
--   - THE BOOST MARGIN rides the EXISTING public.fee_schedule config table
--     (live, holds fee_key/platform_pct/active/note - see the 'give' row
--     activated by DB50) rather than a new config table. Same "config, never
--     a hardcode" instruction FEE_SCHEDULE v1.0 itself states.
--
-- WHY SAFE: purely additive except one nullable column on justice_dockets
--   (victim_crime, Section 3) and one NOT NULL-with-default column on
--   justice_settings (Section 4). Three new tables. No existing row is
--   touched: victim_crime is added NULL (the current "unknown" state the
--   frontend already renders safely - REBELUTION.org src/lib/live.ts already
--   emits victimCrime: null for every live docket), and the settings column
--   carries a DEFAULT so the existing singleton row picks it up with no
--   backfill. Touches no bling_* table or RPC at all.
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1 - justice_watches
-- ============================================================================
-- Per-Bee watch on exactly one target: a docket OR an entity, never both,
-- never neither. A personal follow list, not a public/append-only record -
-- unlike the ledger tables elsewhere in justice_*, a Bee owns these rows
-- outright (set/unset is a preference, not a fact for the record).

CREATE TABLE IF NOT EXISTS public.justice_watches (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    bee_id      uuid        NOT NULL REFERENCES public.bees (id) ON DELETE CASCADE,
    docket_id   uuid        NULL REFERENCES public.justice_dockets (id) ON DELETE CASCADE,
    entity_id   uuid        NULL REFERENCES public.justice_entities (id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT justice_watches_one_target_chk CHECK (
        (docket_id IS NOT NULL AND entity_id IS NULL)
     OR (docket_id IS NULL AND entity_id IS NOT NULL)
    )
);

COMMENT ON TABLE public.justice_watches IS
'Per-Bee watch list. Exactly one of docket_id/entity_id is set (never both,
never neither). Owner-writable directly (SET/UNSET is a preference, not a
record fact) - unlike the append-only ledger tables elsewhere in justice_*.';

-- One watch per (bee, target). Partial unique indexes because docket_id and
-- entity_id are each nullable and a plain UNIQUE(bee_id, docket_id, entity_id)
-- would not catch a duplicate docket-watch (two NULLs never equal each other).
CREATE UNIQUE INDEX IF NOT EXISTS justice_watches_bee_docket_uq
    ON public.justice_watches (bee_id, docket_id) WHERE docket_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS justice_watches_bee_entity_uq
    ON public.justice_watches (bee_id, entity_id) WHERE entity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS justice_watches_bee_idx
    ON public.justice_watches (bee_id, created_at DESC);
-- Supports "who is watching this docket/entity" (a watch count on the record).
CREATE INDEX IF NOT EXISTS justice_watches_docket_idx
    ON public.justice_watches (docket_id) WHERE docket_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS justice_watches_entity_idx
    ON public.justice_watches (entity_id) WHERE entity_id IS NOT NULL;


-- ============================================================================
-- SECTION 2 - justice_collections + justice_collection_members
-- ============================================================================
-- Admin-curated themed parent dockets (DJIA-class grouping). v1 curation rule
-- is lead-set and reversible (dispatch instruction): membership is admin-only
-- to write in this pass; KNOW_COLLECTIONS1 (after this pass) builds the actual
-- curation surface against these tables. A collection is NOT a docket itself -
-- it groups existing dockets, so it does not enter the holarchy (no path, no
-- jx_id) and a docket keeps its own single parent_docket_id independent of
-- whatever collections it also belongs to.

CREATE TABLE IF NOT EXISTS public.justice_collections (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        text        NOT NULL UNIQUE
                            CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    title       text        NOT NULL CHECK (length(btrim(title)) > 0),
    description text        NULL,
    is_fixture  boolean     NOT NULL DEFAULT false,
    created_by  uuid        NULL REFERENCES public.bees (id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.justice_collections IS
'Admin-curated themed groupings of dockets ("DJIA-class"). Not part of the
holarchy - a docket''s parent_docket_id is independent of collection
membership. v1 curation rule (which dockets, in what order) is lead-set per
KNOW_SPEC v0.3 item 5/6 framing and reversible.';

CREATE TABLE IF NOT EXISTS public.justice_collection_members (
    collection_id uuid        NOT NULL REFERENCES public.justice_collections (id) ON DELETE CASCADE,
    docket_id     uuid        NOT NULL REFERENCES public.justice_dockets (id) ON DELETE CASCADE,
    ordinal       integer     NULL,
    added_by      uuid        NULL REFERENCES public.bees (id) ON DELETE SET NULL,
    added_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (collection_id, docket_id)
);

COMMENT ON TABLE public.justice_collection_members IS
'Collection <-> docket membership. ordinal is nullable curator ordering within
the collection; NULL sorts after any explicit ordinal.';

CREATE INDEX IF NOT EXISTS justice_collections_fixture_idx
    ON public.justice_collections (is_fixture);
CREATE INDEX IF NOT EXISTS justice_collection_members_docket_idx
    ON public.justice_collection_members (docket_id);

DROP TRIGGER IF EXISTS justice_collections_touch ON public.justice_collections;
CREATE TRIGGER justice_collections_touch
    BEFORE UPDATE ON public.justice_collections
    FOR EACH ROW EXECUTE FUNCTION public.justice_touch_updated_at();


-- ============================================================================
-- SECTION 3 - justice_dockets.victim_crime (the DB half of the KNOW_DOCKET1 gate)
-- ============================================================================
-- The frontend gate already exists and is already safe: BoostButton.tsx
-- renders only when `docket.victimCrime === false`, and the live provider
-- (REBELUTION.org src/lib/live.ts) currently hardcodes victimCrime: null for
-- every docket because "No public column carries a victim-crime flag." This
-- adds that column. NULL stays the default and the correct value for every
-- existing row - "when in doubt, no button" (owner rule) means unknown must
-- keep reading as blocked, so this column is NEVER backfilled to false by
-- this migration. Only a deliberate, reviewed classification (ingest or
-- admin) ever sets it to true or false.

ALTER TABLE public.justice_dockets
    ADD COLUMN IF NOT EXISTS victim_crime boolean NULL;

COMMENT ON COLUMN public.justice_dockets.victim_crime IS
'Auto-priority / no-boost classification (KNOW_SPEC v0.3; KNOW_DOCKET1 UI
gate). NULL = unknown (no classification yet) and is the safe default - the
boost button and justice_boosts both treat NULL exactly like TRUE, i.e.
blocked. TRUE = confirmed victim-crime docket, hard-blocked from boosting.
FALSE = confirmed safe, the ONLY state that allows a boost row or shows the
frontend boost button (docket.victimCrime === false, see
REBELUTION.org/src/components/justice/BoostButton.tsx). Never default this to
false and never bulk-set it - "when in doubt, no button" is an owner rule, not
a UI convenience.';


-- ============================================================================
-- SECTION 4 - justice_boosts (FIAT ONLY - never touches bling_transactions)
-- ============================================================================
-- CURRENCY_LAW v1.4 (owner-ruled): boosts are USD because the natural boost
-- buyers "have never earned a BLiNG and never will." CURRENCY_LAW v1.6 hard-
-- rules NO bridge between BLiNG and any other rail, in either direction, ever
-- - so this table has no BLiNG-denominated column and nothing in this
-- migration writes to bling_transactions, bling_escrows, or any bling_* RPC.
-- Settlement is Stripe, on the existing fiat rail pattern (FUND/DB50): a
-- PaymentIntent, application_fee_amount computed from fee_schedule at call
-- time, no custody model invented here.
--
-- A boost buys COMPUTE PRIORITY and a place in the Boosted queue - never
-- editorial control, never a conclusion (CURRENCY_LAW v1.4). The record stays
-- sourced-only regardless of who paid. NO ADS ON THE RECORD.

CREATE TABLE IF NOT EXISTS public.justice_boosts (
    id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    docket_id                uuid        NOT NULL
                                REFERENCES public.justice_dockets (id) ON DELETE RESTRICT,

    -- The buyer MAY be a signed-in Bee (attribution / receipt history) but
    -- need not be - KNOW_SPEC v0.3's named buyer classes (law firms, insurers,
    -- journalists, families) are not assumed to hold Bee accounts.
    buyer_bee_id             uuid        NULL REFERENCES public.bees (id) ON DELETE SET NULL,

    -- KNOW_SPEC v0.3 item 6: amount public, name OPTIONAL. NULL here is the
    -- buyer's own choice to stay anonymous, not a data gap.
    display_name             text        NULL,

    amount_cents             bigint      NOT NULL CHECK (amount_cents > 0),
    currency                 text        NOT NULL DEFAULT 'usd' CHECK (currency = 'usd'),

    -- What the money bought - the live meter (KNOW_SPEC v0.3 item 5) reads
    -- this, not a guess. NULL until fulfillment computes it from amount and
    -- the FEE_SCHEDULE v1.0 §4 margin.
    compute_units_granted    numeric     NULL CHECK (compute_units_granted IS NULL OR compute_units_granted >= 0),

    stripe_payment_intent_id text        NULL UNIQUE,
    status                   text        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),

    created_at               timestamptz NOT NULL DEFAULT now(),
    succeeded_at             timestamptz NULL,

    CONSTRAINT justice_boosts_succeeded_has_timestamp_chk CHECK (
        status <> 'succeeded' OR succeeded_at IS NOT NULL
    )
);

COMMENT ON TABLE public.justice_boosts IS
'FIAT ONLY (CURRENCY_LAW v1.4/v1.6). Never references bling_transactions or
any bling_* RPC - USD settles via Stripe on the existing fiat-rail pattern
(FUND/DB50), margin read from fee_schedule (fee_key=know_boost, Section 5).
A boost buys compute priority and a queue position only, never editorial
control (CURRENCY_LAW v1.4) - status/kind never characterizes the docket.';
COMMENT ON COLUMN public.justice_boosts.display_name IS
'KNOW_SPEC v0.3 item 6: amount is always public, the buyer''s name is
optional. NULL is the anonymous choice, not a missing value.';

CREATE INDEX IF NOT EXISTS justice_boosts_docket_idx
    ON public.justice_boosts (docket_id, created_at DESC);
CREATE INDEX IF NOT EXISTS justice_boosts_buyer_idx
    ON public.justice_boosts (buyer_bee_id) WHERE buyer_bee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS justice_boosts_status_idx
    ON public.justice_boosts (status) WHERE status = 'pending';


-- ---------------------------------------------------------------------------
-- 4a. THE DB-LEVEL VICTIM-CRIME GATE
-- ---------------------------------------------------------------------------
-- The dispatch is explicit: "The gate already exists in the UI from
-- KNOW_DOCKET1; it must exist in the database too." A CHECK constraint alone
-- cannot read another table, so this is a BEFORE INSERT trigger - same
-- reasoning as justice_append_only_guard elsewhere in this schema: RLS and
-- application code are not enough because service_role and the table owner
-- bypass both. The trigger binds every role, including service_role, so a
-- Stripe-webhook-driven insert (the real write path once KNOW_BOOST1 lands)
-- cannot boost a victim-crime docket even if the caller's own guard has a bug.
--
-- Symmetric with the frontend rule exactly: only victim_crime = false passes.
-- NULL (unknown) and true (confirmed) both hard-block, matching
-- `docket.victimCrime !== false` in BoostButton.tsx.

CREATE OR REPLACE FUNCTION public.justice_boosts_victim_crime_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_victim_crime boolean;
BEGIN
    SELECT d.victim_crime INTO v_victim_crime
      FROM public.justice_dockets d
     WHERE d.id = NEW.docket_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'justice: docket % does not exist', NEW.docket_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF v_victim_crime IS DISTINCT FROM false THEN
        RAISE EXCEPTION
            'justice: docket % is not boostable (victim_crime=%). Only a docket '
            'explicitly classified victim_crime=false may be boosted - NULL '
            '(unclassified) and TRUE both block, matching the frontend rule '
            '"when in doubt, no button".',
            NEW.docket_id, v_victim_crime
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.justice_boosts_victim_crime_gate() IS
'Hard DB-level backstop for the KNOW_DOCKET1 victim-crime boost gate. Binds
service_role (unlike RLS) - see BEFORE INSERT trigger below. A boost row on a
docket whose victim_crime is not exactly FALSE is impossible, full stop.';

DROP TRIGGER IF EXISTS justice_boosts_victim_crime_gate_trg ON public.justice_boosts;
CREATE TRIGGER justice_boosts_victim_crime_gate_trg
    BEFORE INSERT ON public.justice_boosts
    FOR EACH ROW EXECUTE FUNCTION public.justice_boosts_victim_crime_gate();


-- ============================================================================
-- SECTION 5 - kNOW boost margin: EXTEND fee_schedule, no new config table
-- ============================================================================
-- FEE_SCHEDULE v1.0 §4: "kNOW BOOST MARGIN [SET: compute + 35%]... Draft it as
-- a config row, never a hardcode." fee_schedule already IS that config table
-- (fee_key/platform_pct/active/note - see the 'give' row DB50 activated).
-- Dormant (active=false) here, same pattern as 'give' before DB50: the row
-- exists so KNOW_BOOST1's checkout RPC has something real to read, but
-- nothing charges until a dispatch flips active=true, same kill-switch
-- property FEE_SCHEDULE v1.0 relies on platform-wide.
--
-- No ON CONFLICT here: fee_schedule carries no UNIQUE constraint on fee_key
-- (confirmed live via pg_constraint - DB50 matched its row by an explicit
-- WHERE, not upsert). This mirrors that guarded-insert shape instead of
-- guessing an upsert target that does not exist.

INSERT INTO public.fee_schedule (fee_key, platform_pct, active, note)
SELECT
    'know_boost',
    35,
    false,
    'kNOW/Justice boost margin: compute cost + 35% (FEE_SCHEDULE v1.0 section 4, '
    'lead-set under owner delegation 2026-08-29, patchboard-reversible). USD only '
    '(CURRENCY_LAW v1.4/v1.6) - a boost never touches bling_transactions; this row '
    'is a straight cost-plus markup on Stripe-settled compute spend, not a '
    'BLiNG-side fee. Dormant (active=false) until KNOW_BOOST1 wires the checkout '
    'flow that reads it - same activation pattern as fee_key=give / DB50.'
WHERE NOT EXISTS (
    SELECT 1 FROM public.fee_schedule
     WHERE fee_key = 'know_boost' AND astra_ref IS NULL AND bee_ref IS NULL
);


-- ============================================================================
-- SECTION 6 - premium rung: EXTEND justice_settings, no new config table
-- ============================================================================
-- KNOW_SPEC v0.3 item 4: "everything earns BLiNG; mirror the EXISTING payout
-- structure... with ONE new premium rung on top - accepted record
-- contributions pay a premium multiplier. Lead implements from current
-- tables; owner does not need to re-rule." justice_settings is already the
-- astra's own inspectable posture singleton (create_requires_admin,
-- spawn_max_depth) - this is one more posture value on the same row, per the
-- dispatch's own "prefer extending what exists" instruction, rather than a
-- new one-row config table.
--
-- HONEST GAP, stated once here and in the pass report rather than papered
-- over: no karma-to-BLiNG payout mechanism exists yet anywhere on the
-- platform (verified - see the header note). This multiplier has nothing to
-- multiply until that dispatcher is designed and built, which is NOT this
-- pass. It is drafted now so the number has a home the moment that dispatcher
-- exists, per KNOW_SPEC v0.3's own instruction to draft it as config.

ALTER TABLE public.justice_settings
    ADD COLUMN IF NOT EXISTS contribution_premium_multiplier numeric(4,2) NOT NULL DEFAULT 1.50
        CHECK (contribution_premium_multiplier >= 1.00);

COMMENT ON COLUMN public.justice_settings.contribution_premium_multiplier IS
'KNOW_SPEC v0.3 item 4 premium rung. Multiplier applied on top of whatever the
platform''s existing content-payout structure awards, for an accepted (on
review_status=entered) record contribution. 1.50 is a lead-proposed starting
value, patchboard-style reversible on the owner''s word - NOT owner-ruled. Has
no consumer yet: no karma-to-BLiNG payout dispatcher exists anywhere on the
platform today (checked: no function references both justice_karma_ledger and
any bling_* object). Read by that dispatcher once it is designed and built -
not by anything in this migration.';


-- ============================================================================
-- SECTION 7 - RLS
-- ============================================================================
-- Same posture family as the rest of justice_*: public read of non-fixture /
-- non-hidden rows, justice_is_admin() gated writes, and (for watches, which
-- are a personal preference, not a record) owner-only read+write.

ALTER TABLE public.justice_watches            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.justice_collections        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.justice_collection_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.justice_boosts             ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.justice_watches, public.justice_collections,
              public.justice_collection_members, public.justice_boosts
    FROM anon, authenticated;

-- --- justice_watches: strictly the owning Bee, all operations --------------
GRANT SELECT, INSERT, DELETE ON public.justice_watches TO authenticated;

DROP POLICY IF EXISTS justice_watches_own ON public.justice_watches;
CREATE POLICY justice_watches_own ON public.justice_watches
    FOR ALL TO authenticated
    USING (bee_id = auth.uid()) WITH CHECK (bee_id = auth.uid());

-- --- justice_collections / members: public read, admin write ---------------
GRANT SELECT ON public.justice_collections, public.justice_collection_members
    TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.justice_collections, public.justice_collection_members
    TO authenticated;   -- still gated row-by-row by the admin policies below

DROP POLICY IF EXISTS justice_collections_public_read ON public.justice_collections;
CREATE POLICY justice_collections_public_read ON public.justice_collections
    FOR SELECT TO anon, authenticated
    USING (is_fixture = false);

DROP POLICY IF EXISTS justice_collections_admin_all ON public.justice_collections;
CREATE POLICY justice_collections_admin_all ON public.justice_collections
    FOR ALL TO authenticated
    USING (public.justice_is_admin()) WITH CHECK (public.justice_is_admin());

DROP POLICY IF EXISTS justice_collection_members_public_read ON public.justice_collection_members;
CREATE POLICY justice_collection_members_public_read ON public.justice_collection_members
    FOR SELECT TO anon, authenticated
    USING (
        EXISTS (SELECT 1 FROM public.justice_collections c
                 WHERE c.id = justice_collection_members.collection_id AND c.is_fixture = false)
    );

DROP POLICY IF EXISTS justice_collection_members_admin_all ON public.justice_collection_members;
CREATE POLICY justice_collection_members_admin_all ON public.justice_collection_members
    FOR ALL TO authenticated
    USING (public.justice_is_admin()) WITH CHECK (public.justice_is_admin());

-- --- justice_boosts: public read of settled boosts, NO client write --------
-- KNOW_SPEC v0.3 item 6: the docket ALWAYS shows "boosted + how much" - so a
-- succeeded boost on a non-fixture docket is public by design, buyer identity
-- included only when the buyer chose to sign it (display_name). Writes are
-- service_role only: checkout runs through a Stripe-webhook-driven RPC
-- (KNOW_BOOST1, not this pass), same posture as bling_credit_purchase and
-- bling_chargeback_clawback ("service-role only" per TheMANUAL.tech
-- CLAUDE.md). No INSERT/UPDATE/DELETE grant to anon or authenticated at all.
DROP POLICY IF EXISTS justice_boosts_public_read ON public.justice_boosts;
CREATE POLICY justice_boosts_public_read ON public.justice_boosts
    FOR SELECT TO anon, authenticated
    USING (
        status = 'succeeded'
        AND EXISTS (SELECT 1 FROM public.justice_dockets d
                     WHERE d.id = justice_boosts.docket_id AND d.is_fixture = false)
    );

DROP POLICY IF EXISTS justice_boosts_admin_read ON public.justice_boosts;
CREATE POLICY justice_boosts_admin_read ON public.justice_boosts
    FOR SELECT TO authenticated USING (public.justice_is_admin());
-- No GRANT INSERT/UPDATE/DELETE to anon/authenticated at all - service_role
-- (the future Stripe webhook handler) bypasses RLS and is the only writer.

COMMIT;

-- ============================================================================
-- PRE-FLIGHT NOTES for the apply dispatch (fill/confirm in REPORT.md)
-- ============================================================================
--  * Dependent objects touched: justice_dockets (ADD COLUMN victim_crime,
--    nullable, no backfill - zero rows at risk), justice_settings (ADD COLUMN
--    contribution_premium_multiplier NOT NULL DEFAULT 1.50 - the existing
--    singleton row picks up the default, zero rows at risk), fee_schedule
--    (one guarded INSERT, WHERE NOT EXISTS - zero rows at risk of duplication
--    even on a re-run).
--  * Rows at risk: ZERO for all of the above (additive column with default /
--    nullable column / guarded insert). Three new tables start empty.
--  * public.justice_is_admin(), public.justice_touch_updated_at(),
--    public.bees(id), public.justice_dockets(id), public.justice_entities(id),
--    public.fee_schedule(fee_key,astra_ref,bee_ref,platform_pct,active,note)
--    all confirmed live via information_schema / pg_constraint before drafting
--    this file (2026-09-04, KNOW_DB1).
--  * get_advisors(security) after apply - expect the two new SECURITY DEFINER
--    functions (justice_boosts_victim_crime_gate; none other added) to need no
--    exception beyond the search_path pinning already present on both.
-- ============================================================================
