-- =============================================================================
-- Migration 20260521170000 — Manual Groups v1
-- =============================================================================
-- Date:        2026-05-21
-- Author:      Code (Claude Opus 4.7) — supervised by Butch via chat-Claude UR2
-- Status:      UNAPPLIED. Pending OG HUMAN ratification.
-- Source:      shared/canon/manual-groups-spec-v1.md (v0.1, 2026-05-21)
--              shared/canon/external-class-action-architecture-v0.md §3.2 + §8
--                (two amendments: 'external_class_action' kind + metadata JSONB)
--              Companion: DingleBERRY.tech/canon-v1.md §5 (class-action
--                matchmaker depends on this), master-master-file.md §8.2
--                (atom ownership canon, enforced by 20260521140000 fnu seed)
--
-- Purpose:
--   Ship the Manual Groups primitive — community formation anchored to
--   Manual atoms. v1 includes the three tables, triggers, RLS, and the
--   three core RPCs (create / join / leave). Five use cases (Justice
--   class actions, Science study circles, Health support communities,
--   Society civic campaigns, Justice direct action) all use this same
--   primitive.
--
-- AMENDMENTS applied to spec v0.1 (per UR2 dispatch 2026-05-21):
--
--   A1 — kind enum extended from 6 to 7 values: add 'external_class_action'
--        to the kind CHECK constraint and to the RPC validation list.
--        external_class_action kind anchors a Manual Group to real-world
--        ongoing litigation surfaced by AtlasOracle's external_litigation
--        table (separate spec, table not yet created). The metadata column
--        (Amendment 2) carries case_number, court, lead_counsel_firm,
--        filing_date, status, external_url, honeycomb_outreach_status.
--
--   A2 — manual_groups gains `metadata JSONB NOT NULL DEFAULT '{}'::jsonb`
--        column. No new index at v1 (RLS via existing public_read; metadata
--        is publicly readable like name/description). create_manual_group()
--        RPC gains `p_metadata JSONB DEFAULT '{}'::jsonb` parameter; the
--        INSERT statement passes it through.
--
-- Schema:
--   - manual_groups        — Group identity (name, slug, kind, founder, etc.)
--   - manual_group_atoms   — Group ↔ atom anchors (M:N)
--   - manual_group_members — Group ↔ bee membership (with role)
--
-- Trigger:
--   - manual_group_members_recalc — denormalizes manual_groups.member_count
--   - set_updated_at (existing public.set_updated_at fn) — touches updated_at
--
-- RLS posture:
--   - manual_groups        — public_read on non-archived; founder/mod UPDATE;
--                            service_role INSERT/DELETE (RPC-mediated).
--   - manual_group_atoms   — public read; service_role write.
--   - manual_group_members — members see their own Groups' member lists;
--                            service_role write.
--
-- RPCs (SECURITY DEFINER, REVOKE PUBLIC, GRANT authenticated + service_role):
--   - create_manual_group(p_name, p_slug, p_description, p_kind,
--                         p_atom_ids[], p_is_open, p_metadata)
--   - join_manual_group(p_group_id, p_joined_via)
--   - leave_manual_group(p_group_id)
--
-- Dependencies:
--   - public.bees, public.atoms, public.astra_registry — present.
--   - public.set_updated_at() — present (verified 2026-05-21).
--   - auth.uid() — Supabase Auth runtime.
--
-- Idempotency:
--   - CREATE TABLE IF NOT EXISTS guards all three tables.
--   - DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT for refresh-on-rerun.
--   - CREATE INDEX IF NOT EXISTS for all indexes.
--   - CREATE OR REPLACE FUNCTION + DROP TRIGGER IF EXISTS + CREATE TRIGGER
--     for the recalc + updated_at triggers.
--   - DROP POLICY IF EXISTS + CREATE POLICY for all RLS policies.
--   - CREATE OR REPLACE FUNCTION for RPCs; REVOKE + GRANT are idempotent.
--   - Pre-flight DO block detects already-applied state cleanly.
--
-- Blast radius:
--   - 3 net-new tables, 3 net-new RPCs, 1 new trigger function, 2 triggers,
--     7 RLS policies. No existing-table changes. No DROPs.
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight: confirm dependencies + detect already-applied.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_bees_exists                boolean;
    v_atoms_exists               boolean;
    v_astra_registry_exists      boolean;
    v_set_updated_at_exists      boolean;
    v_manual_groups_exists       boolean;
BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='bees') INTO v_bees_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='atoms') INTO v_atoms_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='astra_registry') INTO v_astra_registry_exists;
    SELECT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='set_updated_at') INTO v_set_updated_at_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='manual_groups') INTO v_manual_groups_exists;

    IF NOT v_bees_exists THEN
        RAISE EXCEPTION 'Pre-flight failed: public.bees missing.';
    END IF;
    IF NOT v_atoms_exists THEN
        RAISE EXCEPTION 'Pre-flight failed: public.atoms missing.';
    END IF;
    IF NOT v_astra_registry_exists THEN
        RAISE EXCEPTION 'Pre-flight failed: public.astra_registry missing (Lock 8 part A).';
    END IF;
    IF NOT v_set_updated_at_exists THEN
        RAISE EXCEPTION 'Pre-flight failed: public.set_updated_at() function missing.';
    END IF;

    IF v_manual_groups_exists THEN
        RAISE NOTICE 'manual_groups already present. Idempotent re-run will refresh constraints / indexes / policies / RPCs.';
    ELSE
        RAISE NOTICE 'Pre-flight OK. Creating manual_groups v1 surface.';
    END IF;
END
$$;


-- =============================================================================
-- TABLE manual_groups
-- =============================================================================
-- Identity row for each Group. Soft-delete via is_archived / archived_at.
-- member_count is denormalized — kept in sync by the recalc trigger.
-- metadata JSONB carries kind-specific extension fields (especially
-- external_class_action: case_number, court, lead_counsel_firm, filing_date,
-- status, external_url, honeycomb_outreach_status — surfaced by AtlasOracle
-- external_litigation table, separate spec). astra_id reserved for Lock 8
-- compliance (nullable for cross-Astra Groups; v1 default null).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.manual_groups (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL,
    slug            text NOT NULL,
    description     text,
    kind            text NOT NULL,
    founder_bee_id  uuid NOT NULL REFERENCES public.bees(id),
    is_open         boolean NOT NULL DEFAULT true,
    is_archived     boolean NOT NULL DEFAULT false,
    archived_at     timestamptz,
    member_count    integer NOT NULL DEFAULT 1,
    metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
    astra_id        uuid REFERENCES public.astra_registry(id),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.manual_groups.kind IS
    'Group taxonomy. Allowed values: class_action | external_class_action | study | support | campaign | direct_action | other. '
    'external_class_action anchors a Manual Group to real-world ongoing litigation surfaced by '
    'AtlasOracle external_litigation table (separate spec); metadata column carries case_number, '
    'court, lead_counsel_firm, filing_date, status, external_url, honeycomb_outreach_status.';

COMMENT ON COLUMN public.manual_groups.metadata IS
    'Kind-specific extension JSONB. Publicly readable (same posture as name/description). '
    'No new index at v1; promote to GIN if query patterns demand it later.';

ALTER TABLE public.manual_groups DROP CONSTRAINT IF EXISTS manual_groups_slug_key;
ALTER TABLE public.manual_groups ADD  CONSTRAINT manual_groups_slug_key UNIQUE (slug);

ALTER TABLE public.manual_groups DROP CONSTRAINT IF EXISTS manual_groups_kind_chk;
ALTER TABLE public.manual_groups ADD  CONSTRAINT manual_groups_kind_chk
    CHECK (kind IN ('class_action','external_class_action','study','support','campaign','direct_action','other'));

ALTER TABLE public.manual_groups DROP CONSTRAINT IF EXISTS manual_groups_member_count_nonneg_chk;
ALTER TABLE public.manual_groups ADD  CONSTRAINT manual_groups_member_count_nonneg_chk
    CHECK (member_count >= 0);

CREATE INDEX IF NOT EXISTS manual_groups_kind_idx     ON public.manual_groups (kind);
CREATE INDEX IF NOT EXISTS manual_groups_founder_idx  ON public.manual_groups (founder_bee_id);
CREATE INDEX IF NOT EXISTS manual_groups_active_idx   ON public.manual_groups (id) WHERE is_archived = false;


-- =============================================================================
-- TABLE manual_group_atoms
-- =============================================================================
-- Group ↔ atom anchors. M:N. Composite PK (group_id, atom_id) prevents dup.
-- ON DELETE CASCADE both ways so an archived/deleted Group or atom cleans up.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.manual_group_atoms (
    group_id   uuid NOT NULL REFERENCES public.manual_groups(id) ON DELETE CASCADE,
    atom_id    text NOT NULL REFERENCES public.atoms(id)          ON DELETE CASCADE,
    added_at   timestamptz NOT NULL DEFAULT now(),
    added_by   uuid NOT NULL REFERENCES public.bees(id),
    PRIMARY KEY (group_id, atom_id)
);

CREATE INDEX IF NOT EXISTS manual_group_atoms_atom_idx ON public.manual_group_atoms (atom_id);


-- =============================================================================
-- TABLE manual_group_members
-- =============================================================================
-- Group ↔ bee membership with role (founder | moderator | member). Composite
-- PK (group_id, bee_id) prevents duplicate membership.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.manual_group_members (
    group_id    uuid NOT NULL REFERENCES public.manual_groups(id) ON DELETE CASCADE,
    bee_id      uuid NOT NULL REFERENCES public.bees(id)           ON DELETE CASCADE,
    role        text NOT NULL DEFAULT 'member',
    joined_at   timestamptz NOT NULL DEFAULT now(),
    joined_via  text,
    PRIMARY KEY (group_id, bee_id)
);

ALTER TABLE public.manual_group_members DROP CONSTRAINT IF EXISTS manual_group_members_role_chk;
ALTER TABLE public.manual_group_members ADD  CONSTRAINT manual_group_members_role_chk
    CHECK (role IN ('founder','moderator','member'));

CREATE INDEX IF NOT EXISTS manual_group_members_bee_idx       ON public.manual_group_members (bee_id);
CREATE INDEX IF NOT EXISTS manual_group_members_group_role_idx ON public.manual_group_members (group_id, role);


-- =============================================================================
-- TRIGGER: manual_group_members_recalc
-- =============================================================================
-- Keeps manual_groups.member_count + updated_at in sync on member INSERT/DELETE.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.manual_groups_recalc_member_count() RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.manual_groups
           SET member_count = member_count + 1, updated_at = now()
         WHERE id = NEW.group_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.manual_groups
           SET member_count = GREATEST(member_count - 1, 0), updated_at = now()
         WHERE id = OLD.group_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END
$function$;

DROP TRIGGER IF EXISTS manual_group_members_recalc ON public.manual_group_members;
CREATE TRIGGER manual_group_members_recalc
    AFTER INSERT OR DELETE ON public.manual_group_members
    FOR EACH ROW EXECUTE FUNCTION public.manual_groups_recalc_member_count();


-- =============================================================================
-- TRIGGER: manual_groups_set_updated_at — reuses existing public.set_updated_at()
-- =============================================================================

DROP TRIGGER IF EXISTS manual_groups_set_updated_at ON public.manual_groups;
CREATE TRIGGER manual_groups_set_updated_at
    BEFORE UPDATE ON public.manual_groups
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================================
-- RLS — manual_groups
-- =============================================================================

ALTER TABLE public.manual_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS manual_groups_public_read ON public.manual_groups;
CREATE POLICY manual_groups_public_read
    ON public.manual_groups
    FOR SELECT
    USING (is_archived = false);

DROP POLICY IF EXISTS manual_groups_admin_update ON public.manual_groups;
CREATE POLICY manual_groups_admin_update
    ON public.manual_groups
    FOR UPDATE
    USING (
        founder_bee_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.manual_group_members
            WHERE group_id = manual_groups.id
              AND bee_id = auth.uid()
              AND role IN ('founder','moderator')
        )
    );

DROP POLICY IF EXISTS manual_groups_service_write ON public.manual_groups;
CREATE POLICY manual_groups_service_write
    ON public.manual_groups
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS manual_groups_service_delete ON public.manual_groups;
CREATE POLICY manual_groups_service_delete
    ON public.manual_groups
    FOR DELETE
    USING (auth.role() = 'service_role');


-- =============================================================================
-- RLS — manual_group_atoms
-- =============================================================================

ALTER TABLE public.manual_group_atoms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS manual_group_atoms_public_read ON public.manual_group_atoms;
CREATE POLICY manual_group_atoms_public_read
    ON public.manual_group_atoms
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS manual_group_atoms_service_write ON public.manual_group_atoms;
CREATE POLICY manual_group_atoms_service_write
    ON public.manual_group_atoms
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');


-- =============================================================================
-- RLS — manual_group_members
-- =============================================================================

ALTER TABLE public.manual_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS manual_group_members_visible_to_members ON public.manual_group_members;
CREATE POLICY manual_group_members_visible_to_members
    ON public.manual_group_members
    FOR SELECT
    USING (
        group_id IN (
            SELECT mgm.group_id FROM public.manual_group_members mgm WHERE mgm.bee_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS manual_group_members_service_write ON public.manual_group_members;
CREATE POLICY manual_group_members_service_write
    ON public.manual_group_members
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');


-- =============================================================================
-- RPC 1 — create_manual_group (AMENDMENT 2: p_metadata param added)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_manual_group(
    p_name        text,
    p_slug        text,
    p_description text,
    p_kind        text,
    p_atom_ids    text[],
    p_is_open     boolean DEFAULT true,
    p_metadata    jsonb   DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
    v_bee_id   uuid;
    v_group_id uuid;
    v_atom_id  text;
BEGIN
    v_bee_id := auth.uid();
    IF v_bee_id IS NULL THEN
        RAISE EXCEPTION 'authentication required';
    END IF;
    IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
        RAISE EXCEPTION 'name required';
    END IF;
    IF p_slug IS NULL OR length(trim(p_slug)) = 0 THEN
        RAISE EXCEPTION 'slug required';
    END IF;
    -- AMENDMENT 1: external_class_action included in allowed-kind list.
    IF p_kind NOT IN ('class_action','external_class_action','study','support','campaign','direct_action','other') THEN
        RAISE EXCEPTION 'invalid kind';
    END IF;
    IF array_length(p_atom_ids, 1) IS NULL OR array_length(p_atom_ids, 1) = 0 THEN
        RAISE EXCEPTION 'at least one atom anchor required';
    END IF;

    INSERT INTO public.manual_groups (name, slug, description, kind, founder_bee_id, is_open, metadata)
    VALUES (p_name, p_slug, p_description, p_kind, v_bee_id, p_is_open, COALESCE(p_metadata, '{}'::jsonb))
    RETURNING id INTO v_group_id;

    -- Founder is the first member.
    INSERT INTO public.manual_group_members (group_id, bee_id, role, joined_via)
    VALUES (v_group_id, v_bee_id, 'founder', 'founder_init');

    FOREACH v_atom_id IN ARRAY p_atom_ids LOOP
        INSERT INTO public.manual_group_atoms (group_id, atom_id, added_by)
        VALUES (v_group_id, v_atom_id, v_bee_id)
        ON CONFLICT DO NOTHING;
    END LOOP;

    RETURN jsonb_build_object('group_id', v_group_id, 'member_count', 1);
END
$function$;

REVOKE EXECUTE ON FUNCTION public.create_manual_group(text, text, text, text, text[], boolean, jsonb) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.create_manual_group(text, text, text, text, text[], boolean, jsonb) TO authenticated, service_role;


-- =============================================================================
-- RPC 2 — join_manual_group (unchanged by amendments)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.join_manual_group(
    p_group_id   uuid,
    p_joined_via text DEFAULT 'self'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
    v_bee_id      uuid;
    v_is_open     boolean;
    v_is_archived boolean;
BEGIN
    v_bee_id := auth.uid();
    IF v_bee_id IS NULL THEN
        RAISE EXCEPTION 'authentication required';
    END IF;

    SELECT is_open, is_archived INTO v_is_open, v_is_archived
      FROM public.manual_groups
     WHERE id = p_group_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'group not found';
    END IF;
    IF v_is_archived THEN
        RAISE EXCEPTION 'group archived';
    END IF;
    IF NOT v_is_open THEN
        RAISE EXCEPTION 'group is invite-only; request via founder';
    END IF;

    INSERT INTO public.manual_group_members (group_id, bee_id, role, joined_via)
    VALUES (p_group_id, v_bee_id, 'member', p_joined_via)
    ON CONFLICT (group_id, bee_id) DO NOTHING;

    RETURN jsonb_build_object('joined', true, 'group_id', p_group_id);
END
$function$;

REVOKE EXECUTE ON FUNCTION public.join_manual_group(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.join_manual_group(uuid, text) TO authenticated, service_role;


-- =============================================================================
-- RPC 3 — leave_manual_group (unchanged by amendments)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.leave_manual_group(
    p_group_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
    v_bee_id     uuid;
    v_is_founder boolean;
BEGIN
    v_bee_id := auth.uid();
    IF v_bee_id IS NULL THEN
        RAISE EXCEPTION 'authentication required';
    END IF;

    SELECT (founder_bee_id = v_bee_id) INTO v_is_founder
      FROM public.manual_groups
     WHERE id = p_group_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'group not found';
    END IF;
    IF v_is_founder THEN
        RAISE EXCEPTION 'founder cannot leave; transfer ownership or archive group first';
    END IF;

    DELETE FROM public.manual_group_members
     WHERE group_id = p_group_id AND bee_id = v_bee_id;

    RETURN jsonb_build_object('left', true, 'group_id', p_group_id);
END
$function$;

REVOKE EXECUTE ON FUNCTION public.leave_manual_group(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.leave_manual_group(uuid) TO authenticated, service_role;


COMMIT;


-- =============================================================================
-- VERIFICATION (run AFTER COMMIT via execute_sql)
-- =============================================================================
-- (V1) Three tables exist with RLS enabled:
--      SELECT tablename, rowsecurity FROM pg_tables
--      WHERE schemaname='public' AND tablename IN ('manual_groups','manual_group_atoms','manual_group_members')
--      ORDER BY tablename;
--      -- expect 3 rows, rowsecurity=true for all.
--
-- (V2) manual_groups columns include metadata + 7-value kind CHECK:
--      SELECT column_name, data_type, is_nullable, column_default
--      FROM information_schema.columns
--      WHERE table_schema='public' AND table_name='manual_groups'
--        AND column_name IN ('metadata','kind','astra_id','member_count')
--      ORDER BY column_name;
--      -- expect: metadata jsonb NOT NULL DEFAULT '{}'::jsonb; kind text NOT NULL; etc.
--
--      SELECT pg_get_constraintdef(c.oid)
--      FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
--      WHERE t.relname='manual_groups' AND c.conname='manual_groups_kind_chk';
--      -- expect: CHECK with all 7 values including 'external_class_action'.
--
-- (V3) Foreign keys wired correctly across the 3 tables:
--      SELECT t.relname AS table, conname, pg_get_constraintdef(c.oid) AS def
--      FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
--      WHERE t.relname IN ('manual_groups','manual_group_atoms','manual_group_members')
--        AND c.contype='f'
--      ORDER BY t.relname, conname;
--      -- expect:
--      --   manual_groups        founder_bee_id → bees, astra_id → astra_registry
--      --   manual_group_atoms   group_id → manual_groups(CASCADE), atom_id → atoms(CASCADE), added_by → bees
--      --   manual_group_members group_id → manual_groups(CASCADE), bee_id → bees(CASCADE)
--
-- (V4) Indexes present (6 custom + 3 pkey-derived):
--      SELECT tablename, indexname FROM pg_indexes
--      WHERE schemaname='public' AND tablename IN ('manual_groups','manual_group_atoms','manual_group_members')
--      ORDER BY tablename, indexname;
--      -- expect:
--      --   manual_groups: pkey, slug_key, kind_idx, founder_idx, active_idx (partial)
--      --   manual_group_atoms: pkey (composite), atom_idx
--      --   manual_group_members: pkey (composite), bee_idx, group_role_idx
--
-- (V5) RLS policies present (4 + 2 + 2 = 8 total):
--      SELECT tablename, polname, polcmd FROM pg_policies
--      WHERE schemaname='public' AND tablename IN ('manual_groups','manual_group_atoms','manual_group_members')
--      ORDER BY tablename, polname;
--      -- expect 8 rows.
--
-- (V6) Triggers present:
--      SELECT trigger_name, event_manipulation, event_object_table
--      FROM information_schema.triggers
--      WHERE event_object_schema='public'
--        AND event_object_table IN ('manual_groups','manual_group_members')
--      ORDER BY event_object_table, trigger_name;
--      -- expect:
--      --   manual_groups          manual_groups_set_updated_at         UPDATE
--      --   manual_group_members   manual_group_members_recalc          INSERT
--      --   manual_group_members   manual_group_members_recalc          DELETE
--
-- (V7) Three RPCs callable with correct signatures + REVOKE PUBLIC posture:
--      SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args, p.prosecdef AS security_definer
--      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--      WHERE n.nspname='public'
--        AND p.proname IN ('create_manual_group','join_manual_group','leave_manual_group','manual_groups_recalc_member_count')
--      ORDER BY p.proname;
--      -- expect:
--      --   create_manual_group(text, text, text, text, text[], boolean, jsonb)  security_definer=t
--      --   join_manual_group(uuid, text)                                         security_definer=t
--      --   leave_manual_group(uuid)                                              security_definer=t
--      --   manual_groups_recalc_member_count()                                   security_definer=f
--
-- (V8) RPC EXECUTE grants — authenticated + service_role only:
--      SELECT routine_name, grantee, privilege_type
--      FROM information_schema.routine_privileges
--      WHERE specific_schema='public'
--        AND routine_name IN ('create_manual_group','join_manual_group','leave_manual_group')
--      ORDER BY routine_name, grantee;
--      -- expect: rows for authenticated + service_role; NO PUBLIC.
--
-- (V9) Live RPC smoke test — create a Group with metadata, join, leave (run
--      against a test atom in a branch DB; production smoke is up to UR2):
--      -- Set role to a real bee's JWT:
--      -- SELECT public.create_manual_group(
--      --   'Test Group','test-group-2026-05-21','Test description','external_class_action',
--      --   ARRAY['culture'], true,
--      --   '{"case_number":"24-cv-12345","court":"D.C. District","status":"filed"}'::jsonb);
--      -- Expect: jsonb with group_id + member_count=1; row in manual_groups with metadata populated.
--
-- (V10) Member-count denorm trigger fires correctly:
--      -- After insert: SELECT member_count FROM manual_groups WHERE id=<new>; expect 1.
--      -- After join: expect 2. After leave: expect 1.


-- =============================================================================
-- ROLLBACK (commented out — for reference only)
-- =============================================================================
-- ⚠ Destroys every Group, every membership, every atom anchor. Safe at v1
-- apply time (no rows yet) but progressively riskier as Bees form Groups.
--
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.leave_manual_group(uuid);
-- DROP FUNCTION IF EXISTS public.join_manual_group(uuid, text);
-- DROP FUNCTION IF EXISTS public.create_manual_group(text, text, text, text, text[], boolean, jsonb);
-- DROP TRIGGER  IF EXISTS manual_group_members_recalc ON public.manual_group_members;
-- DROP FUNCTION IF EXISTS public.manual_groups_recalc_member_count();
-- DROP TRIGGER  IF EXISTS manual_groups_set_updated_at ON public.manual_groups;
-- DROP TABLE    IF EXISTS public.manual_group_members;
-- DROP TABLE    IF EXISTS public.manual_group_atoms;
-- DROP TABLE    IF EXISTS public.manual_groups;
-- COMMIT;
