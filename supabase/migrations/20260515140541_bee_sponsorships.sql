-- =============================================================================
-- Migration 20260515010100 — bee_sponsorships table (SCAFFOLD only)
-- =============================================================================
-- Date:        2026-05-15
-- Author:      Code 3 (Claude Opus 4.7) — supervised by OG HUMAN
-- Branch:      feat/operations-newbee-v1 (TheMANUAL.tech)
-- Status:      UNAPPLIED. Author commits; OG HUMAN applies via Studio MCP.
--              SCAFFOLD ONLY — RPCs (voucher mechanic logic) authored in
--              a follow-up session per task brief.
-- Source:      Task brief (column list authoritative). Sibling spec context:
--              founding-allocation A4 v1.0 §6 (escrow architecture; Sponsors
--              + Vouches not yet authored as a v1 canon doc — this table
--              scaffolds the storage shape for the eventual voucher RPCs).
-- Sibling:     20260515010000_operations_funds.sql (independent)
--              20260515010200_newbee_bonus.sql      (independent)
--
-- Purpose:
--   CREATE TABLE bee_sponsorships — records sponsor-to-sponsored Bee
--   vouches. Per task brief: SCAFFOLD ONLY. Voucher mechanic RPCs
--   (issue_vouch, expire_vouch, apply_sponsor_penalty, etc.) land in a
--   follow-up session.
--
-- Design notes:
--   - id UUID PK with gen_random_uuid() default — surrogate key; the
--     (sponsor_bee_id, sponsored_bee_id) UNIQUE constraint enforces
--     one-vouch-per-pair business rule.
--   - Both FKs reference bees(id) with ON DELETE RESTRICT — preserve
--     attribution integrity; sponsor/sponsored Bee deletion requires
--     explicit sponsorship cleanup.
--   - status TEXT CHECK enum: 'active' (default), 'sponsor_penalty_applied'
--     (sponsored Bee misbehaved within window — sponsor took rank hit),
--     'expired' (vouch_expires_at passed without penalty trigger).
--   - vouch_expires_at default = now() + 30 days. After expiration, the
--     sponsor's rank consequence window closes (no retro penalty for
--     sponsored Bee actions past day 30).
--   - rank_consequence_applied BOOLEAN — once-only flag preventing
--     double-application of the sponsor penalty.
--   - Two indexes per task brief:
--       (a) sponsored_bee_id — lookup "who sponsored me?"
--       (b) (status, vouch_expires_at) — expiration sweep query path
--         (status = 'active' AND vouch_expires_at < now() → mark expired).
--   - RLS enabled with bee-self-read (sponsor OR sponsored sees their own
--     row) + service_role write.
--
-- Idempotency: CREATE TABLE IF NOT EXISTS; CREATE INDEX IF NOT EXISTS;
--              CREATE POLICY guarded by DROP-first.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.bee_sponsorships (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_bee_id            UUID NOT NULL REFERENCES public.bees(id) ON DELETE RESTRICT,
  sponsored_bee_id          UUID NOT NULL REFERENCES public.bees(id) ON DELETE RESTRICT,
  vouched_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  status                    TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN (
                              'active',
                              'sponsor_penalty_applied',
                              'expired'
                            )),
  rank_consequence_applied  BOOLEAN NOT NULL DEFAULT FALSE,
  vouch_expires_at          TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  UNIQUE (sponsor_bee_id, sponsored_bee_id),
  CONSTRAINT bee_sponsorships_no_self_vouch CHECK (sponsor_bee_id <> sponsored_bee_id)
);

COMMENT ON TABLE public.bee_sponsorships IS
  'Scaffold for sponsor-to-sponsored Bee vouches. Voucher mechanic RPCs '
  '(issue_vouch, expire_vouch, apply_sponsor_penalty, etc.) deferred to '
  'follow-up session per feat/operations-newbee-v1 task brief.';

-- Indexes per task brief
CREATE INDEX IF NOT EXISTS bee_sponsorships_sponsored_idx
  ON public.bee_sponsorships(sponsored_bee_id);

CREATE INDEX IF NOT EXISTS bee_sponsorships_status_expires_idx
  ON public.bee_sponsorships(status, vouch_expires_at)
  WHERE status = 'active';

-- RLS
ALTER TABLE public.bee_sponsorships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bee_sponsorships_party_select ON public.bee_sponsorships;
CREATE POLICY bee_sponsorships_party_select
  ON public.bee_sponsorships
  FOR SELECT
  USING (
    sponsor_bee_id   = auth.uid()
    OR sponsored_bee_id = auth.uid()
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS bee_sponsorships_service_write ON public.bee_sponsorships;
CREATE POLICY bee_sponsorships_service_write
  ON public.bee_sponsorships
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ───────────────────────────────────────────────────────────────────────
-- Post-migration sanity assertions
-- ───────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  ASSERT (SELECT to_regclass('public.bee_sponsorships')) IS NOT NULL,
    'bee_sponsorships table missing';

  ASSERT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'public'
       AND tablename  = 'bee_sponsorships'
       AND indexname  = 'bee_sponsorships_sponsored_idx'
  ), 'bee_sponsorships_sponsored_idx index missing';

  ASSERT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'public'
       AND tablename  = 'bee_sponsorships'
       AND indexname  = 'bee_sponsorships_status_expires_idx'
  ), 'bee_sponsorships_status_expires_idx index missing';

  -- UNIQUE constraint on (sponsor_bee_id, sponsored_bee_id)
  ASSERT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.bee_sponsorships'::regclass
       AND contype  = 'u'
       AND pg_get_constraintdef(oid) LIKE '%(sponsor_bee_id, sponsored_bee_id)%'
  ), 'UNIQUE(sponsor_bee_id, sponsored_bee_id) missing';

  ASSERT (SELECT relrowsecurity FROM pg_class
           WHERE oid = 'public.bee_sponsorships'::regclass),
    'RLS not enabled on bee_sponsorships';

  RAISE NOTICE 'Migration 20260515010100 OK: bee_sponsorships scaffold + 2 indexes + RLS verified.';
END $$;

COMMIT;
