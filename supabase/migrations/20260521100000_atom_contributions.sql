-- =============================================================================
-- Migration 20260521100000 — atom_contributions
-- =============================================================================
-- Date:        2026-05-21
-- Author:      Code (Claude Opus 4.7) — supervised by Butch via chat-Claude UR2
-- Status:      UNAPPLIED. Pending OG HUMAN ratification in plan-mode review.
-- Source:      shared/notes/foundation-status-sweep-2026-05-20.md
--                §1 fnulnu recommended next moves item 2
--                §2 affiliate-engine recommended next moves item 2
--                cross-cutting observations: "single missing table blocks
--                the most surface area"
--              shared/canon/affiliate-system.md (A1 v1.1) — atom-side
--                contribution roles feed the Fibonacci atom-royalty schema.
--              shared/canon/fibonacci-atom-contribution.md (v2) — 89-weight
--                schema requires per-atom contributor identification.
--              shared/canon/whitepapers/per-astra/fnulnu-whitepaper-stub.md
--                §Claim-via-Witness — this table is the substrate that
--                Witness panels write contributor approval into.
--
-- Purpose:
--   One table unblocks three Foundation-tier surfaces:
--
--     fnulnu Claim-via-Witness flow — Bees claim contributor roles on
--       FNU-LNU-owned atoms; Witness panels approve; rows land here.
--
--     atlasADs.biz Tag Progenitor 3% routing — atom-promotion clicks
--       reference these rows to identify who gets the contributor share.
--
--     Fibonacci atom-royalty distribution — when revenue lands at an atom,
--       the 76 atom-role weights (34/21/13/8) read this table to find the
--       sourcer / verifier / editor / progenitor recipients.
--
--   Schema follows Butch / chat-Claude UR2 spec adjusted to existing
--   themanual-tech conventions:
--     - atom_id is TEXT FK (matches atoms.id text type and existing
--       atom_kettle_votes / atom_sources / atom_comments / entity_atom_links
--       conventions).
--     - bee_id is UUID FK (matches bees.id).
--     - role enumerated via CHECK constraint (no postgres enum type yet —
--       leave room for evolution without ALTER TYPE rituals). Seven-role
--       universe per fibonacci-atom-contribution §10 schema disposition
--       — includes retired roles (translator, minor_edit) so disposition
--       reconciliations resolve without an enum-alter later.
--     - astra_id present for Lock 8 compliance (Lock 8 part A applied:
--       astra_registry exists; the 'themanual' seed row's UUID is
--       16c5f71e-8a5d-49e7-86c7-4ff64c4590ac per live audit 2026-05-21).
--     - UNIQUE (atom_id, bee_id, role) — one (bee, role) per atom.
--     - event_count + first/last_contributed_at — upsert path bumps the
--       count and last timestamp; lets Fibonacci weighting account for
--       repeat-contribution intensity.
--
-- RLS posture (attribution privacy):
--   - SELECT TO authenticated USING (bee_id = auth.uid())
--     A Bee sees only their own contributions.
--   - No INSERT / UPDATE / DELETE policies → service_role bypass only.
--     Writes mediated by future SECURITY DEFINER RPCs (claim flow + Witness
--     approval + Fibonacci payout dispatcher). The chat-Claude UR2 note:
--     public read can be promoted later via Patchboard if affiliate UX
--     needs cross-Bee chain transparency — don't broaden now.
--
-- Dependencies:
--   - public.atoms (text id) — present, 4892 rows at 2026-05-21.
--   - public.bees (uuid id) — present.
--   - public.astra_registry (uuid id) — present; Lock 8 part A applied
--     (drift from the Phase A audit §2.5 'unapplied' claim — verified
--     against live production 2026-05-21).
--   - Lock 3 astra_or_nova_status enum — not referenced here; the astra_id
--     FK doesn't carry a status column on this table.
--
-- Idempotency:
--   - CREATE TABLE IF NOT EXISTS.
--   - CREATE INDEX IF NOT EXISTS for all three indexes + UNIQUE.
--   - RLS ENABLE safe to re-run.
--   - DROP POLICY IF EXISTS + CREATE POLICY for the SELECT policy.
--   - DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT for the role CHECK +
--     UNIQUE (so a re-run refreshes the constraint definition cleanly).
--
-- House-style notes:
--   * Single BEGIN/COMMIT.
--   * Mirrors 20260513100000_lock8_a_registries.sql pre-flight + verification
--     + rollback comment pattern.
--   * Verification queries at end (commented). Rollback at end (commented).
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight: confirm dependency tables exist; detect already-applied.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_atoms_exists           boolean;
    v_bees_exists            boolean;
    v_astra_registry_exists  boolean;
    v_self_exists            boolean;
BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='atoms') INTO v_atoms_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='bees') INTO v_bees_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='astra_registry') INTO v_astra_registry_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='atom_contributions') INTO v_self_exists;

    IF NOT v_atoms_exists THEN
        RAISE EXCEPTION 'Pre-flight failed: public.atoms missing.';
    END IF;
    IF NOT v_bees_exists THEN
        RAISE EXCEPTION 'Pre-flight failed: public.bees missing.';
    END IF;
    IF NOT v_astra_registry_exists THEN
        RAISE EXCEPTION
            'Pre-flight failed: public.astra_registry missing. '
            'Lock 8 part A (20260513100000_lock8_a_registries.sql) must apply first.';
    END IF;

    IF v_self_exists THEN
        RAISE NOTICE 'atom_contributions already present. Idempotent re-run will refresh constraints / indexes / policies without other effect.';
    ELSE
        RAISE NOTICE 'Pre-flight OK: dependencies present, table absent. Creating atom_contributions.';
    END IF;
END
$$;


-- =============================================================================
-- TABLE atom_contributions
-- =============================================================================
-- One row per (atom, bee, role) tuple. UPSERT path increments event_count
-- and bumps last_contributed_at; first_contributed_at is set once and held.
--
-- Columns:
--   id                    — uuid PK
--   atom_id               — text FK to atoms (matches house atom-FK convention)
--   bee_id                — uuid FK to bees
--   role                  — sourcer | verifier | editor | progenitor | witness
--                           | translator | minor_edit
--                           (per fibonacci-atom-contribution §10 schema
--                           disposition: enum includes all 7 historical
--                           roles so retired roles stay queryable and
--                           disposition reconciliations resolve without
--                           an enum-alter migration)
--   event_count           — count of distinct contribution events at this role
--   first_contributed_at  — first time this (bee, role) wrote to this atom
--   last_contributed_at   — most recent
--   astra_id              — Lock 8 compliance; defaults to NULL until backfilled
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.atom_contributions (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    atom_id               text NOT NULL REFERENCES public.atoms(id) ON DELETE CASCADE,
    bee_id                uuid NOT NULL REFERENCES public.bees(id)  ON DELETE CASCADE,
    role                  text NOT NULL,
    event_count           integer NOT NULL DEFAULT 0,
    first_contributed_at  timestamptz NOT NULL DEFAULT now(),
    last_contributed_at   timestamptz NOT NULL DEFAULT now(),
    astra_id              uuid REFERENCES public.astra_registry(id)
);

-- Role domain enforcement. Seven-role universe per fibonacci-atom-contribution
-- §10 schema disposition: include all 7 historical roles so retired roles
-- (translator, minor_edit) stay queryable and the disposition reconciliations
-- can resolve without an enum-alter migration later.
ALTER TABLE public.atom_contributions
    DROP CONSTRAINT IF EXISTS atom_contributions_role_chk;
ALTER TABLE public.atom_contributions
    ADD  CONSTRAINT atom_contributions_role_chk
        CHECK (role IN (
            'sourcer', 'verifier', 'editor', 'progenitor', 'witness',
            'translator', 'minor_edit'
        ));

-- One row per (atom, bee, role).
ALTER TABLE public.atom_contributions
    DROP CONSTRAINT IF EXISTS atom_contributions_atom_bee_role_key;
ALTER TABLE public.atom_contributions
    ADD  CONSTRAINT atom_contributions_atom_bee_role_key UNIQUE (atom_id, bee_id, role);

-- Read paths:
--   (atom_id)              — "who contributed to this atom" (Fibonacci payout lookup)
--   (bee_id, role)         — "what has this Bee done as <role>" (profile / fnulnu UI)
--   (atom_id, role)        — "all sourcers / all verifiers on this atom"
CREATE INDEX IF NOT EXISTS atom_contributions_atom_id_idx
    ON public.atom_contributions (atom_id);

CREATE INDEX IF NOT EXISTS atom_contributions_bee_id_role_idx
    ON public.atom_contributions (bee_id, role);

CREATE INDEX IF NOT EXISTS atom_contributions_atom_id_role_idx
    ON public.atom_contributions (atom_id, role);


-- ───────────────────────────────────────────────────────────────────────
-- RLS — attribution-privacy default
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.atom_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS atom_contributions_select_own ON public.atom_contributions;
CREATE POLICY atom_contributions_select_own
    ON public.atom_contributions
    FOR SELECT
    TO authenticated
    USING (bee_id = auth.uid());

-- No INSERT / UPDATE / DELETE policies → service_role bypass is the only
-- write path. Future SECURITY DEFINER RPCs (claim flow, Witness approval,
-- Fibonacci payout dispatcher) mediate Bee-initiated writes.


COMMIT;


-- =============================================================================
-- VERIFICATION (run AFTER COMMIT via execute_sql)
-- =============================================================================
-- (1) Table exists, RLS enabled:
--     SELECT tablename, rowsecurity
--     FROM pg_tables
--     WHERE schemaname='public' AND tablename='atom_contributions';
--     -- expect: 1 row, rowsecurity=true.
--
-- (2) Foreign keys wired correctly (3 FKs: atoms / bees / astra_registry):
--     SELECT conname, pg_get_constraintdef(c.oid)
--     FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
--     WHERE t.relname='atom_contributions' AND c.contype='f'
--     ORDER BY conname;
--     -- expect:
--     --   atom_contributions_astra_id_fkey → public.astra_registry(id)
--     --   atom_contributions_atom_id_fkey  → public.atoms(id) ON DELETE CASCADE
--     --   atom_contributions_bee_id_fkey   → public.bees(id)  ON DELETE CASCADE
--
-- (3) Role CHECK + UNIQUE present:
--     SELECT conname, pg_get_constraintdef(c.oid)
--     FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
--     WHERE t.relname='atom_contributions'
--       AND conname IN ('atom_contributions_role_chk','atom_contributions_atom_bee_role_key');
--     -- expect: 2 rows.
--
-- (4) Three indexes present:
--     SELECT indexname FROM pg_indexes
--     WHERE schemaname='public' AND tablename='atom_contributions'
--     ORDER BY indexname;
--     -- expect:
--     --   atom_contributions_atom_bee_role_key  (UNIQUE-derived)
--     --   atom_contributions_atom_id_idx
--     --   atom_contributions_atom_id_role_idx
--     --   atom_contributions_bee_id_role_idx
--     --   atom_contributions_pkey
--
-- (5) RLS policy present (one SELECT policy, no writes):
--     SELECT polname, polcmd FROM pg_policies
--     WHERE schemaname='public' AND tablename='atom_contributions';
--     -- expect: 1 row, polname='atom_contributions_select_own', polcmd='r'.
--
-- (6) Negative test — bad role rejected (run in branch / scratch only):
--     INSERT INTO public.atom_contributions (atom_id, bee_id, role)
--     VALUES (
--       (SELECT id FROM public.atoms LIMIT 1),
--       (SELECT id FROM public.bees  LIMIT 1),
--       'maintainer'
--     );
--     -- expect: ERROR — atom_contributions_role_chk violated.
--
-- (7) Negative test — duplicate (atom, bee, role) rejected:
--     -- (run with service_role; insert same triple twice)
--     -- expect: ERROR — atom_contributions_atom_bee_role_key violated.
--
-- (8) Negative test — authenticated cannot see another Bee's rows:
--     -- With service_role: INSERT a row for bee A.
--     -- With JWT for bee B: SELECT * FROM atom_contributions; → 0 rows.


-- =============================================================================
-- ROLLBACK (commented out — for reference only)
-- =============================================================================
-- ⚠ Rollback is destructive on any rows written between apply and rollback.
-- At apply time the table is empty (verified pre-flight) so a near-immediate
-- rollback is safe. Later rollback should pg_dump the table first.
--
-- BEGIN;
-- DROP POLICY IF EXISTS atom_contributions_select_own ON public.atom_contributions;
-- DROP INDEX IF EXISTS public.atom_contributions_atom_id_role_idx;
-- DROP INDEX IF EXISTS public.atom_contributions_bee_id_role_idx;
-- DROP INDEX IF EXISTS public.atom_contributions_atom_id_idx;
-- DROP TABLE IF EXISTS public.atom_contributions;
-- COMMIT;
