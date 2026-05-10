-- =============================================================================
-- Migration 20260511150000 — Lock role hierarchy (disciplines, ranks, queens)
-- =============================================================================
-- Date:        2026-05-11
-- Author:      Code (Claude Opus 4.7) — supervised by Butch
-- Status:      UNAPPLIED. Apply Monday 2026-05-11 alongside the other Monday
--              schema migrations (Lock 7 precision, Lock 3 discriminators,
--              Phase C verify, Lock 2 chargeback infra, CR-5 order book
--              hardening). This migration is independent of all five —
--              no dependencies, no dependents. Apply in any order.
-- Source:      shared/canon/bee-role-hierarchy.md (canonized 2026-05-10)
--              §2 (the five discipline ladders + 25 rank names)
--              §3 (the six Queens + queen_role enum)
--              §10 (schema implications — table sketch)
--
-- Purpose:
--   Lands the four tables + two enums that codify HONEYCOMB's vocational
--   hierarchy:
--
--     ENUM bee_discipline    — five discipline ladders.
--     ENUM queen_role         — six Queen domains (note: the platform-wide
--                               pair, HoneyComb + Manual, sit alongside the
--                               four discipline-Queens; not above them).
--
--     bee_disciplines    — which disciplines a Bee participates in.
--     bee_ranks          — current rank per Bee per discipline (5-rung).
--     rank_history       — append-only audit trail of every ascension and
--                          demotion (UPDATE / DELETE blocked via trigger).
--     queen_assignments  — who currently holds each Queen role + history
--                          (UPDATE allowed for retirement; DELETE blocked
--                          via trigger).
--
-- Lock 8 scoping decision (locked separately by Butch on 2026-05-10 evening):
--
--   Rank is PLATFORM-WIDE for all five disciplines (including HoneyComb).
--   No astra_id columns on any of the four tables here. A Bee's rank
--   applies across every Astra and every Nova they touch.
--
--   This diverges from canon §10's earlier recommendation, which suggested
--   per-Astra rank for the four discipline ladders + platform-wide for
--   HoneyComb. The lock supersedes the recommendation. Canon §10 will be
--   updated in a follow-up edit; the migration follows the lock.
--
-- Idempotency:
--   Pre-flight DO block probes for existing artifacts. Three states:
--     - none of the 4 artifacts (bee_discipline type + the 4 tables) exist
--       → migration unapplied, proceed.
--     - all 4 exist → migration already applied, RAISE NOTICE and let the
--       remainder run as no-op (every CREATE statement uses IF NOT EXISTS
--       or DO-block guards; constraints and triggers are dropped + re-added
--       idempotently).
--     - mixed state → unexpected, raise exception.
--
-- House-style notes:
--   * Single BEGIN / COMMIT — all four tables, both enums, all RLS policies,
--     all indexes, all triggers atomic. Mirrors the v9 / Phase C convention.
--   * search_path on plpgsql functions = 'public, pg_temp' (newer style;
--     mig 23 Block D + Phase C 20260508120000 use this).
--   * Trigger functions REVOKE EXECUTE FROM PUBLIC for hygiene; triggers
--     fire regardless of EXECUTE grant.
--   * RLS posture per spec:
--       - bee_disciplines: SELECT to authenticated only; writes service-role.
--       - bee_ranks:       SELECT public; writes service-role.
--       - rank_history:    SELECT public; INSERT service-role; UPDATE/DELETE
--                          BLOCKED via row-level trigger (don't revoke from
--                          service_role — that breaks the codebase
--                          convention; trigger is the right pattern here).
--       - queen_assignments: SELECT public; INSERT/UPDATE service-role;
--                          DELETE BLOCKED via row-level trigger (UPDATE is
--                          the natural retirement mechanic — set ended_at).
--   * Verification queries at end (commented — run AFTER COMMIT).
--   * Rollback block at end (commented out).
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight: detect already-applied / mixed state.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_discipline_enum_exists  boolean;
    v_queen_role_enum_exists  boolean;
    v_bee_disciplines_exists  boolean;
    v_bee_ranks_exists        boolean;
    v_rank_history_exists     boolean;
    v_queen_assignments_exists boolean;
    v_present_count           integer;
BEGIN
    SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bee_discipline' AND typnamespace = 'public'::regnamespace) INTO v_discipline_enum_exists;
    SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'queen_role'     AND typnamespace = 'public'::regnamespace) INTO v_queen_role_enum_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='bee_disciplines')    INTO v_bee_disciplines_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='bee_ranks')          INTO v_bee_ranks_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rank_history')       INTO v_rank_history_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='queen_assignments')  INTO v_queen_assignments_exists;

    v_present_count := (v_discipline_enum_exists::int + v_queen_role_enum_exists::int +
                        v_bee_disciplines_exists::int + v_bee_ranks_exists::int +
                        v_rank_history_exists::int + v_queen_assignments_exists::int);

    IF v_present_count = 0 THEN
        RAISE NOTICE 'Pre-flight OK: no role-hierarchy artifacts present. Proceeding.';
    ELSIF v_present_count = 6 THEN
        RAISE NOTICE 'Lock role-hierarchy already applied (all 6 artifacts present). Idempotent re-run will refresh constraints / policies / triggers without other effect.';
    ELSE
        RAISE EXCEPTION
            'Pre-flight failed: role-hierarchy migration is in mixed state. '
            'Present: bee_discipline=%, queen_role=%, bee_disciplines=%, bee_ranks=%, rank_history=%, queen_assignments=%. '
            'Investigate before proceeding.',
            v_discipline_enum_exists, v_queen_role_enum_exists,
            v_bee_disciplines_exists, v_bee_ranks_exists,
            v_rank_history_exists, v_queen_assignments_exists;
    END IF;
END
$$;


-- =============================================================================
-- BLOCK A — ENUMs
-- =============================================================================
-- bee_discipline: five ladders (canon §2).
-- queen_role:     six Queen domains (canon §3) — distinct from bee_discipline
--                 because the platform-wide pair (HoneyComb + Manual) sit
--                 alongside the four discipline Queens.
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'bee_discipline' AND typnamespace = 'public'::regnamespace
    ) THEN
        CREATE TYPE public.bee_discipline AS ENUM (
            'education', 'security', 'coder', 'monitoring', 'honeycomb'
        );
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'queen_role' AND typnamespace = 'public'::regnamespace
    ) THEN
        CREATE TYPE public.queen_role AS ENUM (
            'honeycomb', 'manual', 'code', 'education', 'security', 'monitor'
        );
    END IF;
END
$$;


-- =============================================================================
-- BLOCK B — TABLE bee_disciplines
-- =============================================================================
-- Tracks which disciplines each Bee participates in. A Bee may join multiple
-- (canon §4: multi-ladder ascension, no cap). Joining is bookkeeping only —
-- rank state lives in bee_ranks.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.bee_disciplines (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bee_id      uuid NOT NULL REFERENCES public.bees(id) ON DELETE CASCADE,
    discipline  public.bee_discipline NOT NULL,
    joined_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bee_disciplines
    DROP CONSTRAINT IF EXISTS bee_disciplines_bee_discipline_key;
ALTER TABLE public.bee_disciplines
    ADD  CONSTRAINT bee_disciplines_bee_discipline_key UNIQUE (bee_id, discipline);

CREATE INDEX IF NOT EXISTS bee_disciplines_bee_idx
    ON public.bee_disciplines (bee_id);

ALTER TABLE public.bee_disciplines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bee_disciplines_select_authenticated ON public.bee_disciplines;
CREATE POLICY bee_disciplines_select_authenticated
    ON public.bee_disciplines
    FOR SELECT
    TO authenticated
    USING (true);

-- No INSERT/UPDATE/DELETE policies → service_role bypass is the only write path.


-- =============================================================================
-- BLOCK C — TABLE bee_ranks
-- =============================================================================
-- Current rank per Bee per discipline. UNIQUE (bee_id, discipline) → one
-- current rank row per (Bee, ladder). rank_name is denormalized for display
-- speed; a CHECK constraint enforces the 25 (discipline, rank_level)→rank_name
-- pairs locked in canon §2 so the denormalization can never drift.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.bee_ranks (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bee_id       uuid NOT NULL REFERENCES public.bees(id) ON DELETE CASCADE,
    discipline   public.bee_discipline NOT NULL,
    rank_level   smallint NOT NULL CHECK (rank_level BETWEEN 1 AND 5),
    rank_name    text NOT NULL,
    attained_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bee_ranks
    DROP CONSTRAINT IF EXISTS bee_ranks_bee_discipline_key;
ALTER TABLE public.bee_ranks
    ADD  CONSTRAINT bee_ranks_bee_discipline_key UNIQUE (bee_id, discipline);

-- 25-pair CHECK constraint: every legal (discipline, rank_level) combination
-- pinned to its canonical rank_name (canon §2). Drop-then-add so re-runs
-- refresh the constraint shape if canon ever evolves.
ALTER TABLE public.bee_ranks
    DROP CONSTRAINT IF EXISTS bee_ranks_rank_name_chk;
ALTER TABLE public.bee_ranks
    ADD  CONSTRAINT bee_ranks_rank_name_chk CHECK (
        -- Education
        (discipline = 'education'  AND rank_level = 1 AND rank_name = 'Seeker')      OR
        (discipline = 'education'  AND rank_level = 2 AND rank_name = 'Student')     OR
        (discipline = 'education'  AND rank_level = 3 AND rank_name = 'Graduate')    OR
        (discipline = 'education'  AND rank_level = 4 AND rank_name = 'Scholar')     OR
        (discipline = 'education'  AND rank_level = 5 AND rank_name = 'Professor')   OR
        -- Security
        (discipline = 'security'   AND rank_level = 1 AND rank_name = 'Brood')       OR
        (discipline = 'security'   AND rank_level = 2 AND rank_name = 'Scout')       OR
        (discipline = 'security'   AND rank_level = 3 AND rank_name = 'Seraph')      OR
        (discipline = 'security'   AND rank_level = 4 AND rank_name = 'Sentinel')    OR
        (discipline = 'security'   AND rank_level = 5 AND rank_name = 'Guardian')    OR
        -- Coder
        (discipline = 'coder'      AND rank_level = 1 AND rank_name = 'Apprentice')  OR
        (discipline = 'coder'      AND rank_level = 2 AND rank_name = 'Builder')     OR
        (discipline = 'coder'      AND rank_level = 3 AND rank_name = 'Architect')   OR
        (discipline = 'coder'      AND rank_level = 4 AND rank_name = 'Master')      OR
        (discipline = 'coder'      AND rank_level = 5 AND rank_name = 'Sage')        OR
        -- Monitoring
        (discipline = 'monitoring' AND rank_level = 1 AND rank_name = 'Spotter')     OR
        (discipline = 'monitoring' AND rank_level = 2 AND rank_name = 'Drone')       OR
        (discipline = 'monitoring' AND rank_level = 3 AND rank_name = 'Forager')     OR
        (discipline = 'monitoring' AND rank_level = 4 AND rank_name = 'Keeper')      OR
        (discipline = 'monitoring' AND rank_level = 5 AND rank_name = 'Steward')     OR
        -- HoneyComb
        (discipline = 'honeycomb'  AND rank_level = 1 AND rank_name = 'Conductor')   OR
        (discipline = 'honeycomb'  AND rank_level = 2 AND rank_name = 'Sovereign')   OR
        (discipline = 'honeycomb'  AND rank_level = 3 AND rank_name = 'Visionary')   OR
        (discipline = 'honeycomb'  AND rank_level = 4 AND rank_name = 'Luminary')    OR
        (discipline = 'honeycomb'  AND rank_level = 5 AND rank_name = 'Eternal')
    );

CREATE INDEX IF NOT EXISTS bee_ranks_bee_idx
    ON public.bee_ranks (bee_id);

CREATE INDEX IF NOT EXISTS bee_ranks_discipline_level_idx
    ON public.bee_ranks (discipline, rank_level);

ALTER TABLE public.bee_ranks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bee_ranks_select_public ON public.bee_ranks;
CREATE POLICY bee_ranks_select_public
    ON public.bee_ranks
    FOR SELECT
    USING (true);

-- No INSERT/UPDATE/DELETE policies → service_role bypass is the only write path.


-- =============================================================================
-- BLOCK D — TABLE rank_history (append-only)
-- =============================================================================
-- Every ascension and demotion appends a row. UPDATE and DELETE are blocked
-- via row-level trigger (chosen over REVOKE-from-service_role per the
-- codebase convention — service_role retains full write access in the
-- existing v9-hardening pattern; we keep that contract).
--
-- from_level NULL  → initial entry into a discipline (no prior rank).
-- from_level > to_level → demotion. Reason is required when this happens
--                         (CHECK constraint).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.rank_history (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bee_id          uuid NOT NULL REFERENCES public.bees(id),
    discipline      public.bee_discipline NOT NULL,
    from_level      smallint,
    to_level        smallint NOT NULL CHECK (to_level BETWEEN 1 AND 5),
    changed_at      timestamptz NOT NULL DEFAULT now(),
    trigger_source  text,
    reason          text
);

-- from_level range check (when present). Hygiene; complements to_level CHECK.
ALTER TABLE public.rank_history
    DROP CONSTRAINT IF EXISTS rank_history_from_level_range_chk;
ALTER TABLE public.rank_history
    ADD  CONSTRAINT rank_history_from_level_range_chk
        CHECK (from_level IS NULL OR from_level BETWEEN 1 AND 5);

-- Demotion-requires-reason CHECK. Only enforced when from_level > to_level
-- (strictly downward). Equal levels (re-affirmation) and ascensions don't
-- require reason.
ALTER TABLE public.rank_history
    DROP CONSTRAINT IF EXISTS rank_history_demotion_reason_chk;
ALTER TABLE public.rank_history
    ADD  CONSTRAINT rank_history_demotion_reason_chk
        CHECK (
            from_level IS NULL
            OR from_level <= to_level
            OR reason IS NOT NULL
        );

CREATE INDEX IF NOT EXISTS rank_history_bee_idx
    ON public.rank_history (bee_id);

CREATE INDEX IF NOT EXISTS rank_history_discipline_recent_idx
    ON public.rank_history (discipline, changed_at DESC);

ALTER TABLE public.rank_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rank_history_select_public ON public.rank_history;
CREATE POLICY rank_history_select_public
    ON public.rank_history
    FOR SELECT
    USING (true);

-- No INSERT/UPDATE/DELETE policies → service_role bypass is the only write
-- path. The trigger below blocks UPDATE / DELETE even from service_role,
-- enforcing append-only at the database level.

CREATE OR REPLACE FUNCTION public.rank_history_block_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
    RAISE EXCEPTION
        'rank_history is append-only — % rejected. '
        'Insert a new row to record an ascension or demotion.',
        TG_OP;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.rank_history_block_mutation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rank_history_block_mutation() FROM anon, authenticated;

DROP TRIGGER IF EXISTS rank_history_no_update ON public.rank_history;
CREATE TRIGGER rank_history_no_update
    BEFORE UPDATE ON public.rank_history
    FOR EACH ROW EXECUTE FUNCTION public.rank_history_block_mutation();

DROP TRIGGER IF EXISTS rank_history_no_delete ON public.rank_history;
CREATE TRIGGER rank_history_no_delete
    BEFORE DELETE ON public.rank_history
    FOR EACH ROW EXECUTE FUNCTION public.rank_history_block_mutation();


-- =============================================================================
-- BLOCK E — TABLE queen_assignments
-- =============================================================================
-- Tracks who currently holds each Queen role + full succession history.
-- ended_at IS NULL means active. The partial unique index enforces
-- "at most one active Queen per role." UPDATE is allowed (setting ended_at
-- is the natural retirement mechanic). DELETE is blocked via trigger —
-- once a Queen has held a role, that's permanent history.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.queen_assignments (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    queen_role         public.queen_role NOT NULL,
    bee_id             uuid NOT NULL REFERENCES public.bees(id),
    assigned_at        timestamptz NOT NULL DEFAULT now(),
    ended_at           timestamptz,
    succession_method  text,
    reason             text
);

-- Tenure-duration sanity check.
ALTER TABLE public.queen_assignments
    DROP CONSTRAINT IF EXISTS queen_assignments_duration_chk;
ALTER TABLE public.queen_assignments
    ADD  CONSTRAINT queen_assignments_duration_chk
        CHECK (ended_at IS NULL OR ended_at >= assigned_at);

-- Partial unique index: at most one active assignment per queen_role.
-- Retired rows (ended_at IS NOT NULL) are unconstrained — succession
-- history accumulates freely.
CREATE UNIQUE INDEX IF NOT EXISTS queen_assignments_one_active_per_role
    ON public.queen_assignments (queen_role)
    WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS queen_assignments_bee_idx
    ON public.queen_assignments (bee_id);

CREATE INDEX IF NOT EXISTS queen_assignments_role_history_idx
    ON public.queen_assignments (queen_role, assigned_at DESC);

ALTER TABLE public.queen_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS queen_assignments_select_public ON public.queen_assignments;
CREATE POLICY queen_assignments_select_public
    ON public.queen_assignments
    FOR SELECT
    USING (true);

-- No INSERT/UPDATE/DELETE policies → service_role bypass is the only write
-- path. UPDATE is permitted at the role level (no anti-update trigger);
-- DELETE is blocked by the trigger below.

CREATE OR REPLACE FUNCTION public.queen_assignments_block_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
    RAISE EXCEPTION
        'queen_assignments rows are permanent history — DELETE rejected. '
        'Set ended_at to retire a Queen instead.';
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.queen_assignments_block_delete() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.queen_assignments_block_delete() FROM anon, authenticated;

DROP TRIGGER IF EXISTS queen_assignments_no_delete ON public.queen_assignments;
CREATE TRIGGER queen_assignments_no_delete
    BEFORE DELETE ON public.queen_assignments
    FOR EACH ROW EXECUTE FUNCTION public.queen_assignments_block_delete();


COMMIT;


-- =============================================================================
-- VERIFICATION (run AFTER COMMIT)
-- =============================================================================
-- (1) Both enums exist with the expected values:
--     SELECT t.typname, e.enumlabel
--     FROM pg_type t
--     JOIN pg_enum e ON e.enumtypid = t.oid
--     WHERE t.typname IN ('bee_discipline','queen_role')
--     ORDER BY t.typname, e.enumsortorder;
--     -- expect bee_discipline: education, security, coder, monitoring, honeycomb
--     -- expect queen_role:    honeycomb, manual, code, education, security, monitor
--
-- (2) All four tables present with RLS enabled:
--     SELECT tablename, rowsecurity
--     FROM pg_tables
--     WHERE schemaname='public'
--       AND tablename IN ('bee_disciplines','bee_ranks','rank_history','queen_assignments')
--     ORDER BY tablename;
--     -- expect 4 rows, rowsecurity=true on all.
--
-- (3) bee_ranks rank_name CHECK rejects bad pairs:
--     -- (Run on branch DB only — write attempts require service_role.)
--     INSERT INTO public.bee_ranks (bee_id, discipline, rank_level, rank_name)
--     VALUES ('00000000-0000-0000-0000-000000000bee','education',1,'Sage');
--     -- expect: ERROR — bee_ranks_rank_name_chk violated.
--     INSERT INTO public.bee_ranks (bee_id, discipline, rank_level, rank_name)
--     VALUES ('00000000-0000-0000-0000-000000000bee','education',1,'Seeker');
--     -- expect: success.
--
-- (4) rank_history append-only enforcement:
--     INSERT INTO public.rank_history (bee_id, discipline, from_level, to_level, trigger_source)
--     VALUES ('00000000-0000-0000-0000-000000000bee','coder',NULL,1,'manual')
--     RETURNING id;
--     UPDATE public.rank_history SET to_level = 2 WHERE id = '<id-from-above>';
--     -- expect: ERROR — rank_history is append-only — UPDATE rejected.
--     DELETE FROM public.rank_history WHERE id = '<id-from-above>';
--     -- expect: ERROR — rank_history is append-only — DELETE rejected.
--
-- (5) rank_history demotion-requires-reason:
--     INSERT INTO public.rank_history (bee_id, discipline, from_level, to_level, trigger_source)
--     VALUES ('00000000-0000-0000-0000-000000000bee','coder',3,2,'manual');
--     -- expect: ERROR — rank_history_demotion_reason_chk violated.
--     INSERT INTO public.rank_history (bee_id, discipline, from_level, to_level, trigger_source, reason)
--     VALUES ('00000000-0000-0000-0000-000000000bee','coder',3,2,'demotion_abuse','test demotion');
--     -- expect: success.
--
-- (6) queen_assignments at-most-one-active-per-role:
--     INSERT INTO public.queen_assignments (queen_role, bee_id, succession_method)
--     VALUES ('honeycomb','00000000-0000-0000-0000-000000000bee','platform_lock');
--     INSERT INTO public.queen_assignments (queen_role, bee_id, succession_method)
--     VALUES ('honeycomb','00000000-0000-0000-0000-000000000bee','platform_lock');
--     -- expect: ERROR — duplicate key on queen_assignments_one_active_per_role.
--     -- After UPDATE'ing the first row's ended_at = now(), a second insert succeeds.
--
-- (7) queen_assignments DELETE blocked:
--     DELETE FROM public.queen_assignments WHERE id = '<id>';
--     -- expect: ERROR — queen_assignments rows are permanent history.
--
-- (8) queen_assignments UPDATE allowed (retirement mechanic):
--     UPDATE public.queen_assignments
--     SET ended_at = now()
--     WHERE queen_role = 'honeycomb' AND ended_at IS NULL;
--     -- expect: success.


-- =============================================================================
-- ROLLBACK (commented out — for reference only)
-- =============================================================================
-- ⚠ Rolling back drops every rank assignment and queen assignment in the
-- system. If any rows have been written between apply and rollback, that
-- history is lost. Capture pg_dump --table=public.rank_history etc. before
-- rolling back if any non-trivial state has accumulated.
--
-- BEGIN;
-- DROP TRIGGER IF EXISTS queen_assignments_no_delete ON public.queen_assignments;
-- DROP FUNCTION IF EXISTS public.queen_assignments_block_delete();
-- DROP TABLE IF EXISTS public.queen_assignments;
--
-- DROP TRIGGER IF EXISTS rank_history_no_update ON public.rank_history;
-- DROP TRIGGER IF EXISTS rank_history_no_delete ON public.rank_history;
-- DROP FUNCTION IF EXISTS public.rank_history_block_mutation();
-- DROP TABLE IF EXISTS public.rank_history;
--
-- DROP TABLE IF EXISTS public.bee_ranks;
-- DROP TABLE IF EXISTS public.bee_disciplines;
--
-- DROP TYPE IF EXISTS public.queen_role;
-- DROP TYPE IF EXISTS public.bee_discipline;
-- COMMIT;
