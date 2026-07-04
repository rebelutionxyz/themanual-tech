-- =============================================================================
-- Migration 20260521140000 — @fnu canonical system bee + Butch rename + atom_contributions seed
-- =============================================================================
-- Date:        2026-05-21
-- Author:      Code (Claude Opus 4.7) — supervised by Butch via chat-Claude UR2
-- Status:      UNAPPLIED at this filename. First apply attempt (direct INSERT
--              INTO public.bees) failed atomically on FK bees_id_fkey →
--              auth.users(id); no rows persisted, version not recorded in
--              schema_migrations. This rewrite uses the BL3-Wave-2 step-4
--              trigger-aware pattern (INSERT auth.users with handle in
--              raw_user_meta_data → handle_new_bee() trigger materializes
--              the public.bees row → UPDATE bees to add name + bio).
-- Source:      shared/notes/foundation-status-sweep-2026-05-20.md §1 (fnulnu)
--              master-master-file.md §8.2 ("FNU LNU bee owns ALL Manual atoms"
--                pseudonymous legal firewall)
--              shared/canon/fibonacci-atom-contribution.md §7.2 (atom owner
--                routing — naming drift 'original_sourcer' → 'sourcer'
--                tracked as #ATOM-CONTRIB-ROLE-NAMING-DRIFT)
--              supabase/migrations/20260521131000_g9_system_bees_and_combtreasury_pots.sql
--                (BL3-Wave-2 step 4 — canonical pattern for system-bee
--                creation; same trigger-aware approach)
--
-- Purpose:
--   Enforce the §8.2 pseudonymous-ownership lock in data, not just rhetoric.
--   Four parts in one transaction:
--
--     Part 1: rename Butch's bee from handle 'fnulnu' to 'butch'. The
--             existing row (id ab696a36-…, email rebelutionxyz@gmail.com)
--             currently squats on the canonical pseudonym slot.
--
--     Part 2: INSERT auth.users for the canonical @fnu system bee with
--             deterministic UUID 00000000-0000-0000-0000-000000facade. The
--             handle_new_bee() trigger fires and materializes the public.bees
--             row with handle pulled from raw_user_meta_data->>'handle'.
--             Follow-up UPDATE adds name + bio.
--             Rationale for UUID: 'facade' is a valid 6-char hex word that
--             follows the deterministic-hex-word system-bee pattern
--             (combtreasury …0bee, combrewardspool …feed, honeypot …beef,
--             annualparty …ba110, themanual_board …b0a8d1). Semantically:
--             "facade" = the face the pseudonym shows.
--             (chat-Claude UR2 originally suggested …0fnu but n/u aren't
--             hex digits.)
--
--     Part 3: same trigger-aware INSERT pattern for the @fnulnu sentinel at
--             00000000-0000-0000-0000-deadbeefdead. The 'fnulnu' handle is
--             freed by Part 1 before this part runs (single transaction,
--             ordered). "deadbeefdead" is the canonical do-not-touch /
--             reserved-memory hex marker; signals reservation lock at a
--             glance to anyone reading bees / auth.users.
--
--     Part 4: seed atom_contributions with (atom_id, @fnu, 'sourcer') for
--             every atom in production (4,892 rows). Uses the
--             atom_contributions table shipped earlier 2026-05-21
--             (migration 20260521100000). ON CONFLICT respects the
--             UNIQUE (atom_id, bee_id, role) key so re-runs are idempotent.
--
-- TRIGGER-AWARE APPROACH NOTES (mirrors step-4 lessons learned):
--
--   - The handle_new_bee() trigger on auth.users INSERT auto-derives handle
--     from raw_user_meta_data->>'handle' when present, falling back to
--     'bee_' + UUID prefix. All system-Bee UUIDs share the all-zero prefix,
--     so the fallback collides on bees_handle_key — meaning we MUST set the
--     handle in meta.
--   - Email passes through auth.users.email into public.bees.email.
--   - The trigger only populates id, handle, email (per step-4 migration
--     header). name + bio are NULL after trigger fires; UPDATE statements
--     enrich them, scoped by (name IS NULL OR bio IS NULL) so a re-run
--     after manual edits doesn't clobber.
--   - System Bee passwords are NULL — no login risk. No auth.identities row
--     needed (system bees don't OAuth).
--
-- Codebase impact (read-only grep performed 2026-05-21):
--   - LoginPage.tsx:116 — `placeholder="fnulnu"` is an input hint, not a
--     query. UI cosmetic only.
--   - README.md mentions fnulnu.xyz (domain), not the bee handle.
--   - schema-v2-surfaces.sql + lock8_b migration mention 'fnulnu' as a
--     PILLAR seed row, not a bee. Unaffected.
--   - No `.eq('handle','fnulnu')` or `WHERE handle='fnulnu'` callsite in
--     production code. Renaming Butch's handle is safe.
--
-- RLS posture:
--   - bees rows are visible per the existing bees-table policies (not
--     touched here).
--   - atom_contributions inserts run under service_role via apply_migration
--     (RLS bypassed). The table's SELECT policy (bee_id = auth.uid())
--     means an authenticated Bee X will not see @fnu's rows — intentional.
--     @fnu's contributions are visible only via service-role queries / RPCs.
--
-- Dependencies:
--   - public.bees (uuid id, text handle, text email) — present.
--   - public.atoms (text id) — present, 4,892 rows at 2026-05-21.
--   - public.atom_contributions (created 2026-05-21 by 20260521100000) —
--     present, empty.
--   - public.handle_new_bee() — must exist; pre-flight refuses if absent.
--   - auth.users — Supabase-managed; written into here for system bees.
--
-- Idempotency:
--   - Part 1: UPDATE … WHERE id=<butch> AND handle='fnulnu'. The WHERE
--     handle predicate makes a second run a no-op.
--   - Part 2: INSERT INTO auth.users … ON CONFLICT (id) DO NOTHING;
--     UPDATE bees … WHERE (name IS NULL OR bio IS NULL).
--   - Part 3: same as Part 2.
--   - Part 4: INSERT … ON CONFLICT (atom_id, bee_id, role) DO NOTHING.
--   - Pre-flight DO block RAISEs EXCEPTION on missing dependencies.
--
-- House-style notes:
--   * Single BEGIN/COMMIT.
--   * Pre-flight + per-part block + verification + rollback comment, mirroring
--     20260513100000_lock8_a_registries.sql + 20260521100000_atom_contributions.sql
--     + 20260521131000_g9_system_bees_and_combtreasury_pots.sql.
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight: confirm dependencies + handle_new_bee() trigger function.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_bees_exists              boolean;
    v_atoms_exists             boolean;
    v_atom_contribs_exists     boolean;
    v_handle_trigger_exists    boolean;
    v_butch_row_exists         boolean;
    v_butch_already_renamed    boolean;
    v_fnu_exists               boolean;
    v_fnulnu_sentinel_exists   boolean;
    v_atoms_count              integer;
BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='bees') INTO v_bees_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='atoms') INTO v_atoms_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='atom_contributions') INTO v_atom_contribs_exists;
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='handle_new_bee'
    ) INTO v_handle_trigger_exists;

    IF NOT v_bees_exists THEN
        RAISE EXCEPTION 'Pre-flight failed: public.bees missing.';
    END IF;
    IF NOT v_atoms_exists THEN
        RAISE EXCEPTION 'Pre-flight failed: public.atoms missing.';
    END IF;
    IF NOT v_atom_contribs_exists THEN
        RAISE EXCEPTION
            'Pre-flight failed: public.atom_contributions missing. '
            'Migration 20260521100000_atom_contributions.sql must apply first.';
    END IF;
    IF NOT v_handle_trigger_exists THEN
        RAISE EXCEPTION
            'Pre-flight failed: handle_new_bee() function missing — '
            'this migration depends on the trigger to materialize public.bees '
            'rows from auth.users INSERTs using raw_user_meta_data->>''handle''. '
            'Investigate before applying.';
    END IF;

    SELECT EXISTS (SELECT 1 FROM public.bees WHERE id = 'ab696a36-e3aa-4c78-8137-eb46d3b4e9c6'::uuid) INTO v_butch_row_exists;
    SELECT EXISTS (SELECT 1 FROM public.bees WHERE id = 'ab696a36-e3aa-4c78-8137-eb46d3b4e9c6'::uuid AND handle = 'butch') INTO v_butch_already_renamed;
    SELECT EXISTS (SELECT 1 FROM public.bees WHERE handle = 'fnu')    INTO v_fnu_exists;
    SELECT EXISTS (SELECT 1 FROM public.bees WHERE handle = 'fnulnu' AND id = '00000000-0000-0000-0000-deadbeefdead'::uuid) INTO v_fnulnu_sentinel_exists;
    SELECT COUNT(*) INTO v_atoms_count FROM public.atoms;

    IF NOT v_butch_row_exists THEN
        RAISE EXCEPTION
            'Pre-flight failed: expected bee row ab696a36-e3aa-4c78-8137-eb46d3b4e9c6 not found.';
    END IF;

    RAISE NOTICE 'Pre-flight: butch_row=%, butch_already_renamed=%, fnu_exists=%, fnulnu_sentinel_exists=%, atoms_count=%',
        v_butch_row_exists, v_butch_already_renamed, v_fnu_exists, v_fnulnu_sentinel_exists, v_atoms_count;
END
$$;


-- =============================================================================
-- PART 1 — Rename Butch's bee from 'fnulnu' to 'butch'
-- =============================================================================
-- WHERE handle='fnulnu' filter makes this idempotent. Once renamed, a
-- second apply finds zero rows matching the predicate.
-- =============================================================================

UPDATE public.bees
   SET handle = 'butch',
       updated_at = now()
 WHERE id = 'ab696a36-e3aa-4c78-8137-eb46d3b4e9c6'::uuid
   AND handle = 'fnulnu';


-- =============================================================================
-- PART 2 — Canonical @fnu system bee via trigger-aware INSERT
-- =============================================================================
-- INSERT auth.users with raw_user_meta_data->>'handle' = 'fnu'.
-- The handle_new_bee() trigger fires and INSERTs the public.bees row with
-- id + handle + email. The follow-up UPDATE adds name + bio (the trigger
-- doesn't populate those).
--
-- UUID 00000000-0000-0000-0000-000000facade follows the existing system-bee
-- hex-word pattern.
-- =============================================================================

INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    '00000000-0000-0000-0000-000000facade'::uuid,
    'authenticated', 'authenticated',
    'fnu@themanual.tech',
    NULL, now(),
    '{"provider": "system"}'::jsonb,
    '{"name": "FNU LNU", "system": true, "handle": "fnu"}'::jsonb,
    now(), now()
)
ON CONFLICT (id) DO NOTHING;

UPDATE public.bees
   SET name = 'FNU LNU',
       bio  = 'Canonical pseudonymous Bee. Owns all Manual atoms as the public-facing identity for atom-derived royalty flows (per master-master-file §8.2 ownership lock). 79/89 of atom-yield routes to @combtreasury.reserve via fibonacci v2 §6.'
 WHERE id = '00000000-0000-0000-0000-000000facade'::uuid
   AND handle = 'fnu'
   AND (name IS NULL OR bio IS NULL);


-- =============================================================================
-- PART 3 — @fnulnu sentinel via trigger-aware INSERT
-- =============================================================================
-- Same trigger-aware pattern. The 'fnulnu' handle is freed by Part 1
-- before this part runs (single transaction, ordered) so the trigger
-- does not collide on bees_handle_key.
--
-- UUID 00000000-0000-0000-0000-deadbeefdead is the canonical do-not-touch /
-- reserved-memory hex marker. The bio inscribes the reservation rule for
-- any future reader of the bees / auth.users tables.
-- =============================================================================

INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    '00000000-0000-0000-0000-deadbeefdead'::uuid,
    'authenticated', 'authenticated',
    'fnulnu-reserved@themanual.tech',
    NULL, now(),
    '{"provider": "system"}'::jsonb,
    '{"name": "fnulnu (reserved sentinel)", "system": true, "handle": "fnulnu"}'::jsonb,
    now(), now()
)
ON CONFLICT (id) DO NOTHING;

UPDATE public.bees
   SET name = 'fnulnu (reserved sentinel)',
       bio  = 'Reserved sentinel — DO NOT REFERENCE in any code, RPC, or query. This row exists solely to block re-registration of the fnulnu handle. The canonical identity is @fnu.'
 WHERE id = '00000000-0000-0000-0000-deadbeefdead'::uuid
   AND handle = 'fnulnu'
   AND (name IS NULL OR bio IS NULL);


-- =============================================================================
-- PART 4 — Seed atom_contributions: @fnu as 'sourcer' for every atom
-- =============================================================================
-- Enforces the §8.2 pseudonymous-ownership lock in data. Every atom gets
-- a (atom_id, fnu_bee_id, 'sourcer') row — the canonical default authorship
-- attribution that future Bee Witness-approved claims will displace per
-- the fnulnu Claim-via-Witness flow.
--
-- role='sourcer' aligns with the seven-role universe authored in
-- 20260521100000_atom_contributions.sql. Drift from fibonacci §7.2's
-- 'original_sourcer' tracked as #ATOM-CONTRIB-ROLE-NAMING-DRIFT.
--
-- event_count = 1: represents "the canonical seeding event." Future
-- Fibonacci weighting can distinguish FNU-seeded rows (count=1) from
-- human-claimed rows (count >= 1, real bee).
--
-- ON CONFLICT (atom_id, bee_id, role) DO NOTHING — second apply is a no-op.
-- =============================================================================

INSERT INTO public.atom_contributions
    (atom_id, bee_id, role, event_count, first_contributed_at, last_contributed_at)
SELECT
    a.id,
    '00000000-0000-0000-0000-000000facade'::uuid,
    'sourcer',
    1,
    now(),
    now()
FROM public.atoms a
ON CONFLICT (atom_id, bee_id, role) DO NOTHING;


COMMIT;


-- =============================================================================
-- VERIFICATION (run AFTER COMMIT via execute_sql)
-- =============================================================================
-- (V1) Three handles present, in expected order:
--      SELECT id::text, handle, email FROM public.bees
--      WHERE handle IN ('butch','fnu','fnulnu') ORDER BY handle;
--      -- expect 3 rows:
--      --   butch    ab696a36-…           rebelutionxyz@gmail.com
--      --   fnu      00000000-…facade      fnu@themanual.tech
--      --   fnulnu   00000000-…deadbeefdead fnulnu-reserved@themanual.tech
--
-- (V2) Butch's row id is stable:
--      SELECT id::text, handle FROM public.bees
--      WHERE id = 'ab696a36-e3aa-4c78-8137-eb46d3b4e9c6'::uuid;
--      -- expect: 1 row, handle='butch'.
--
-- (V3) Atom-contribution seeding count matches atoms count:
--      SELECT
--        (SELECT COUNT(*) FROM public.atom_contributions
--           WHERE bee_id = '00000000-0000-0000-0000-000000facade'::uuid
--             AND role = 'sourcer') AS fnu_sourcer_rows,
--        (SELECT COUNT(*) FROM public.atoms) AS atoms_count;
--      -- expect: fnu_sourcer_rows = atoms_count (4892 at apply time).
--
-- (V4) Spot-check seeded row shape:
--      SELECT atom_id, bee_id::text, role, event_count
--      FROM public.atom_contributions
--      WHERE bee_id = '00000000-0000-0000-0000-000000facade'::uuid
--      LIMIT 3;
--      -- expect: 3 rows, role='sourcer', event_count=1.
--
-- (V5) Full bees census — expected 8 rows total post-apply:
--      SELECT id::text, handle FROM public.bees ORDER BY created_at;
--      -- expect 8 rows: combtreasury, combrewardspool, butch, fnu, fnulnu,
--      -- honeypot, annualparty, themanual_board (the 3 BL3-Wave-2 system
--      -- bees pre-exist; this migration adds @fnu and @fnulnu; @butch is
--      -- the renamed pre-existing Butch row).
--
-- (V6) Sentinel @fnulnu has zero atom_contributions rows:
--      SELECT COUNT(*) FROM public.atom_contributions
--      WHERE bee_id = '00000000-0000-0000-0000-deadbeefdead'::uuid;
--      -- expect: 0. Sentinel must own nothing.


-- =============================================================================
-- ROLLBACK (commented out — for reference only)
-- =============================================================================
-- ⚠ Rollback path: deletes the auth.users rows (which CASCADE-deletes the
-- public.bees rows via bees_id_fkey ON DELETE CASCADE, which CASCADE-deletes
-- the atom_contributions rows via atom_contributions_bee_id_fkey ON DELETE
-- CASCADE). Then restores Butch's handle.
--
-- BEGIN;
-- DELETE FROM auth.users
--   WHERE id IN (
--     '00000000-0000-0000-0000-000000facade'::uuid,
--     '00000000-0000-0000-0000-deadbeefdead'::uuid
--   );
-- UPDATE public.bees SET handle = 'fnulnu', updated_at = now()
--   WHERE id = 'ab696a36-e3aa-4c78-8137-eb46d3b4e9c6'::uuid AND handle = 'butch';
-- COMMIT;
