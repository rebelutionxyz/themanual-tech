-- =============================================================================
-- Migration 20260521130000 — G8: bling_pots table (Wave 2, step 3)
-- =============================================================================
-- Date:        2026-05-21
-- Author:      Code 2 (Claude Opus 4.7) — supervised by Butch
-- Branch:      feat/bling-v9-ledger
-- Wave:        2 (pots + system Bees + affiliate scaffolding)
-- Source:      canon/tag-progenitor-reconcile.md §"Implementation notes"
--              AtlasORACLE.to/master_plan/bling-ledger-interface.md
--              (v0.2 bling_pots design — referenced by tag-progenitor-reconcile;
--               file on disk is labeled v0.1, design recovered from references)
--
-- Purpose:
--   Generic purpose-locked pot mechanism. Same shape serves multiple use cases:
--     - Treasury sub-buckets: @combtreasury × (reserve|operational|defense|
--                              campaign|promotions) — step 4 seeds these.
--     - Future AtlasOracle per-Astra escrow holdings: any system or
--       application Bee can have purpose-tagged sub-balances.
--     - Future per-Astra prize pools, Curator endowments, etc.
--
--   The (bee_id, purpose) UNIQUE constraint enforces one balance per
--   (Bee, purpose) tuple. The CHECK (balance >= 0) blocks negative balances
--   (pots cannot go into debt; debits must be guarded by application logic
--   that reads balance first).
--
-- EXCEPTION: NO lock8 default-insert trigger.
--   Every non-Lock-8-table created since 2026-05-13 carries the
--   `lock8_default_astra_and_nova` trigger that auto-populates astra_id +
--   nova_id columns. THIS TABLE INTENTIONALLY DOES NOT.
--
--   Rationale: pots are global (Bee × purpose), not Astra-scoped. The
--   treasury Bee's sub-buckets serve the constellation, not any one Astra.
--   A Bee's personal pots (future use cases) likewise span their activity
--   across all Astras they participate in.
--
--   If a future use case demands Astra-scoping (e.g., per-Astra prize
--   pools that ARE tied to a specific Astra), it adds an astra_id column
--   in a follow-up migration plus the lock8 trigger — but the v1 design
--   keeps pots Astra-agnostic.
--
-- RLS posture:
--   - Owner-read: a Bee can SELECT their own pots. service-role bypass.
--   - Service-write: only service_role can INSERT/UPDATE/DELETE pots.
--     Direct Bee writes are blocked — pot balance changes must go through
--     service-role-callable RPCs (the donation settlement in step 6, future
--     AtlasOracle escrow RPCs, etc.).
--   Mirrors deployed bling_retirement_escrows posture.
--
-- Idempotency:
--   CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS, CREATE POLICY
--   uses DROP IF EXISTS + CREATE pattern. Re-apply is a no-op.
--
-- Blast radius:
--   New table only, no data, no existing-table mutations. Rollback is
--   `DROP TABLE bling_pots CASCADE` (no FKs in yet).
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight: confirm dependencies present.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_bees_exists boolean;
    v_set_updated_at_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema='public' AND table_name='bees'
    ) INTO v_bees_exists;
    IF NOT v_bees_exists THEN
        RAISE EXCEPTION 'Pre-flight failed: public.bees missing.';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='set_updated_at'
    ) INTO v_set_updated_at_exists;
    IF NOT v_set_updated_at_exists THEN
        RAISE EXCEPTION 'Pre-flight failed: set_updated_at() function missing.';
    END IF;

    RAISE NOTICE 'Pre-flight OK: bees + set_updated_at present.';
END $$;

-- ───────────────────────────────────────────────────────────────────────
-- Block A · Table
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bling_pots (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bee_id      UUID NOT NULL REFERENCES public.bees(id),
    purpose     TEXT NOT NULL,
    balance     NUMERIC(20, 6) NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (bee_id, purpose),
    CHECK (balance >= 0)
);

-- ───────────────────────────────────────────────────────────────────────
-- Block B · Indexes
-- ───────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS bling_pots_bee_id_idx
    ON public.bling_pots(bee_id);

-- ───────────────────────────────────────────────────────────────────────
-- Block C · RLS
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.bling_pots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bling_pots_owner_read    ON public.bling_pots;
DROP POLICY IF EXISTS bling_pots_service_write ON public.bling_pots;

CREATE POLICY bling_pots_owner_read ON public.bling_pots
    FOR SELECT
    USING (
        bee_id = auth.uid()
        OR auth.role() = 'service_role'
    );

CREATE POLICY bling_pots_service_write ON public.bling_pots
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ───────────────────────────────────────────────────────────────────────
-- Block D · set_updated_at trigger
-- ───────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS bling_pots_set_updated_at ON public.bling_pots;
CREATE TRIGGER bling_pots_set_updated_at
    BEFORE UPDATE ON public.bling_pots
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ───────────────────────────────────────────────────────────────────────
-- Block E · INTENTIONALLY NO lock8_default_astra_and_nova trigger.
--           Pots are global, not Astra-scoped. See header EXCEPTION note.
-- ───────────────────────────────────────────────────────────────────────

COMMIT;

-- =============================================================================
-- VERIFICATION (post-COMMIT — run separately, NOT inside the transaction)
-- =============================================================================
--
-- (1) Table exists with expected columns + constraints:
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--  WHERE table_schema='public' AND table_name='bling_pots'
--  ORDER BY ordinal_position;
-- → 6 rows: id(uuid|NO|gen_random_uuid()), bee_id(uuid|NO|null),
--           purpose(text|NO|null), balance(numeric|NO|0),
--           created_at(timestamptz|NO|now()), updated_at(timestamptz|NO|now()).
--
-- (2) PK + UNIQUE + CHECK constraints:
-- SELECT conname, pg_get_constraintdef(c.oid)
--   FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
--   JOIN pg_namespace n ON n.oid=t.relnamespace
--  WHERE n.nspname='public' AND t.relname='bling_pots';
-- → PK on id, UNIQUE (bee_id, purpose), CHECK (balance >= 0), FK bee_id → bees.id.
--
-- (3) Index present:
-- SELECT indexname FROM pg_indexes
--  WHERE schemaname='public' AND tablename='bling_pots'
--  ORDER BY indexname;
-- → bling_pots_bee_id_idx, bling_pots_bee_id_purpose_key (UNIQUE), bling_pots_pkey.
--
-- (4) RLS + policies + trigger:
-- SELECT relname, relrowsecurity FROM pg_class
--  WHERE relname='bling_pots' AND relnamespace='public'::regnamespace;
-- → relrowsecurity=t.
-- SELECT policyname, cmd FROM pg_policies
--  WHERE schemaname='public' AND tablename='bling_pots' ORDER BY policyname;
-- → bling_pots_owner_read(SELECT), bling_pots_service_write(ALL).
-- SELECT tgname FROM pg_trigger
--  WHERE tgrelid='public.bling_pots'::regclass AND NOT tgisinternal;
-- → bling_pots_set_updated_at (only — no lock8 trigger per design).
--
-- (5) No rows yet (step 4 seeds @combtreasury sub-buckets):
-- SELECT count(*) FROM public.bling_pots;
-- → 0.

-- =============================================================================
-- ROLLBACK (commented — only if reverting this migration intentionally)
-- =============================================================================
-- BEGIN;
-- DROP TABLE IF EXISTS public.bling_pots CASCADE;
-- COMMIT;
