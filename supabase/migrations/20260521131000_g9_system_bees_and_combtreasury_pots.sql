-- =============================================================================
-- Migration 20260521131000 — G9: system Bees + @combtreasury sub-buckets (Wave 2, step 4)
-- =============================================================================
-- Date:        2026-05-21
-- Author:      Code 2 (Claude Opus 4.7) — supervised by Butch
-- Branch:      feat/bling-v9-ledger
-- Wave:        2 (pots + system Bees + affiliate scaffolding). Depends on step 3.
-- Source:      canon/tag-progenitor-reconcile.md §"Implementation notes"
--              shared/canon/system-funds-targets-resolution.md v0.2
--
-- Purpose:
--   Seed two new protocol-level system Bees and the @combtreasury sub-buckets:
--     @honeypot    — Honeypot fund (89-weight 3-slot + ban-forfeit destination)
--     @annualparty — Annual Party fund (89-weight 1-slot)
--   And seed 5 @combtreasury sub-buckets in bling_pots:
--     operational | reserve | defense | campaign | promotions
--
-- TRIGGER-AWARE APPROACH (v2 after first apply attempt):
--
--   On 2026-05-21 first attempt, this migration tried to INSERT into auth.users
--   then INSERT into public.bees explicitly. That failed because the
--   handle_new_bee() trigger on auth.users automatically INSERTs a bees row
--   with handle = 'bee_' || substr(id::text, 1, 8). Since all system-Bee UUIDs
--   begin '00000000-...', every trigger-derived handle collapsed to
--   'bee_00000000' and the second auth.users insert violated bees_handle_key.
--   Transaction rolled back cleanly — no state persisted.
--
--   Fix (this version): set `"handle": "<value>"` in raw_user_meta_data so
--   the trigger picks the right handle via its coalesce(...) lookup. Then
--   UPDATE the trigger-created bees row to add name/bio (the trigger only
--   populates id, handle, email).
--
--   Why @combtreasury wasn't affected by this issue: it was created
--   2026-04-26 via Studio with raw_user_meta_data = {"name":"...", "system":true}
--   (no "handle" key). Either the trigger wasn't deployed yet at that date,
--   or its handle was UPDATEd post-trigger-creation. Today's deployed trigger
--   on a fresh auth.users INSERT WILL pick up "handle" from raw_user_meta_data
--   if present — which is what this migration leverages.
--
-- AUTH SCHEMA NOTE — writes to auth.users:
--   instance_id default-zero · aud + role = 'authenticated' · email_confirmed_at = now()
--   raw_app_meta_data = {"provider": "system"}
--   raw_user_meta_data = {"name": "<display>", "system": true, "handle": "<handle>"}
--   encrypted_password = NULL  ← no password = no login risk
--   No auth.identities row (matches @combtreasury — system Bees don't OAuth).
--
-- HANDLE CONVENTION:
--   Stored without `@` prefix in bees.handle (matches deployed @combtreasury).
--   Reserved-handle hardening (preventing user signup with these handles) is
--   out of scope; flagged for v1 launch as a separate task.
--
-- UUID CONVENTION (proposed; ratified at Wave 2 plan):
--   - @combtreasury    = 00000000-0000-0000-0000-000000000bee  (locked, exists)
--   - @honeypot        = 00000000-0000-0000-0000-00000000beef
--   - @annualparty     = 00000000-0000-0000-0000-0000000ba110
--
-- Idempotency:
--   - All INSERTs use ON CONFLICT DO NOTHING. UPDATE statements use predicates
--     that match the trigger-created rows.
--   - Safe to re-apply: trigger fires only on auth.users INSERT, which is
--     ON CONFLICT (id) DO NOTHING — no duplicate trigger fires.
--
-- Blast radius:
--   - 2 rows added to auth.users (system Bees, NULL password).
--   - 2 rows added to public.bees (via trigger, then UPDATEd to enrich).
--   - 2 rows added to public.bee_profiles (via bees_create_profile AFTER INSERT).
--   - 5 rows added to public.bling_pots (treasury sub-buckets, zero balance).
--   - No DROPs, no ALTERs of existing tables.
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight: confirm dependencies + handle_new_bee trigger present.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_pots_exists boolean;
    v_treasury_in_auth boolean;
    v_treasury_in_bees boolean;
    v_handle_trigger_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema='public' AND table_name='bling_pots'
    ) INTO v_pots_exists;
    IF NOT v_pots_exists THEN
        RAISE EXCEPTION 'Pre-flight failed: public.bling_pots missing. Apply step 3 first.';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000bee'::uuid
    ) INTO v_treasury_in_auth;
    IF NOT v_treasury_in_auth THEN
        RAISE EXCEPTION 'Pre-flight failed: @combtreasury auth.users row missing.';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.bees WHERE id = '00000000-0000-0000-0000-000000000bee'::uuid
          AND handle = 'combtreasury'
    ) INTO v_treasury_in_bees;
    IF NOT v_treasury_in_bees THEN
        RAISE EXCEPTION 'Pre-flight failed: @combtreasury public.bees row missing.';
    END IF;

    -- Confirm the trigger that will read our raw_user_meta_data->>'handle' is present.
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='handle_new_bee'
    ) INTO v_handle_trigger_exists;
    IF NOT v_handle_trigger_exists THEN
        RAISE EXCEPTION 'Pre-flight failed: handle_new_bee() function missing — '
            'this migration depends on the trigger to populate public.bees from '
            'raw_user_meta_data->>''handle''. Investigate before applying.';
    END IF;

    RAISE NOTICE 'Pre-flight OK.';
END $$;

-- ───────────────────────────────────────────────────────────────────────
-- Block A · @honeypot system Bee.
-- INSERT auth.users → handle_new_bee() trigger fires → creates bees row
-- with handle from raw_user_meta_data->>'handle'. Then UPDATE that row
-- to enrich with name + bio.
-- ───────────────────────────────────────────────────────────────────────
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    '00000000-0000-0000-0000-00000000beef'::uuid,
    'authenticated', 'authenticated',
    'honeypot@themanual.tech',
    NULL, now(),
    '{"provider": "system"}'::jsonb,
    '{"name": "Honeypot Fund", "system": true, "handle": "honeypot"}'::jsonb,
    now(), now()
)
ON CONFLICT (id) DO NOTHING;

UPDATE public.bees
   SET name = 'Honeypot Fund',
       bio  = 'Protocol-level Honeypot fund. Receives forfeited locked escrows on lifetime ban + 3-weight Honeypot slot of the 89-weight schema.'
 WHERE id = '00000000-0000-0000-0000-00000000beef'::uuid
   AND handle = 'honeypot'
   AND (name IS NULL OR bio IS NULL);

-- ───────────────────────────────────────────────────────────────────────
-- Block B · @annualparty system Bee.
-- ───────────────────────────────────────────────────────────────────────
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    '00000000-0000-0000-0000-0000000ba110'::uuid,
    'authenticated', 'authenticated',
    'annualparty@themanual.tech',
    NULL, now(),
    '{"provider": "system"}'::jsonb,
    '{"name": "Annual Party Fund", "system": true, "handle": "annualparty"}'::jsonb,
    now(), now()
)
ON CONFLICT (id) DO NOTHING;

UPDATE public.bees
   SET name = 'Annual Party Fund',
       bio  = 'Protocol-level Annual Party fund. Receives 1-weight Annual Party slot of the 89-weight schema. Annual disbursement mechanics per future canon.'
 WHERE id = '00000000-0000-0000-0000-0000000ba110'::uuid
   AND handle = 'annualparty'
   AND (name IS NULL OR bio IS NULL);

-- ───────────────────────────────────────────────────────────────────────
-- Block C · @combtreasury sub-buckets — 5 bling_pots rows.
-- ───────────────────────────────────────────────────────────────────────
INSERT INTO public.bling_pots (bee_id, purpose, balance) VALUES
    ('00000000-0000-0000-0000-000000000bee'::uuid, 'operational', 0),
    ('00000000-0000-0000-0000-000000000bee'::uuid, 'reserve',     0),
    ('00000000-0000-0000-0000-000000000bee'::uuid, 'defense',     0),
    ('00000000-0000-0000-0000-000000000bee'::uuid, 'campaign',    0),
    ('00000000-0000-0000-0000-000000000bee'::uuid, 'promotions',  0)
ON CONFLICT (bee_id, purpose) DO NOTHING;

COMMIT;

-- =============================================================================
-- VERIFICATION (post-COMMIT — run separately, NOT inside the transaction)
-- =============================================================================
--
-- (1) Three system Bees present in auth.users:
-- SELECT id, email, raw_user_meta_data->>'handle' AS handle_meta,
--        raw_user_meta_data->>'system' AS system_flag
--   FROM auth.users
--  WHERE id IN ('00000000-0000-0000-0000-000000000bee'::uuid,
--               '00000000-0000-0000-0000-00000000beef'::uuid,
--               '00000000-0000-0000-0000-0000000ba110'::uuid)
--  ORDER BY id;
-- → 3 rows (treasury may have NULL handle_meta — created pre-trigger; new ones have it set).
--
-- (2) Three system Bees in public.bees with correct handles + names + bios:
-- SELECT handle, email, name, bio IS NOT NULL AS has_bio
--   FROM public.bees
--  WHERE handle IN ('combtreasury','honeypot','annualparty')
--  ORDER BY handle;
-- → 3 rows; honeypot/annualparty have name + bio set.
--
-- (3) bee_profiles auto-created for the two new bees:
-- SELECT count(*) FROM public.bee_profiles
--  WHERE bee_id IN ('00000000-0000-0000-0000-00000000beef'::uuid,
--                   '00000000-0000-0000-0000-0000000ba110'::uuid);
-- → 2.
--
-- (4) Five @combtreasury sub-buckets, all zero balance:
-- SELECT purpose, balance FROM public.bling_pots
--  WHERE bee_id = '00000000-0000-0000-0000-000000000bee'::uuid
--  ORDER BY purpose;
-- → 5 rows: campaign, defense, operational, promotions, reserve — all balance 0.
--
-- (5) No other pots yet:
-- SELECT count(*) FROM public.bling_pots
--  WHERE bee_id <> '00000000-0000-0000-0000-000000000bee'::uuid;
-- → 0.
--
-- (6) No identities for system Bees:
-- SELECT count(*) FROM auth.identities
--  WHERE user_id IN ('00000000-0000-0000-0000-00000000beef'::uuid,
--                    '00000000-0000-0000-0000-0000000ba110'::uuid);
-- → 0.

-- =============================================================================
-- ROLLBACK (commented — touches auth.users; cascade via bees_id_fkey ON DELETE CASCADE)
-- =============================================================================
-- BEGIN;
-- DELETE FROM public.bling_pots
--  WHERE bee_id = '00000000-0000-0000-0000-000000000bee'::uuid
--    AND purpose IN ('operational','reserve','defense','campaign','promotions');
-- DELETE FROM auth.users
--  WHERE id IN ('00000000-0000-0000-0000-00000000beef'::uuid,
--               '00000000-0000-0000-0000-0000000ba110'::uuid);
-- -- bees + bee_profiles cascade-delete via FK chain.
-- COMMIT;
