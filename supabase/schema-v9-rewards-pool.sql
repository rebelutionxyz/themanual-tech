-- ═══════════════════════════════════════════════════════════════════════
-- schema-v9-rewards-pool.sql — @combrewardspool system bee
--
-- Companion to v8 (@combtreasury). The treasury collects bee-to-bee
-- fees; the rewards pool holds funds destined for distribution back to
-- Bees per the v9 Economic Constitution. Distribution mechanics
-- (eligibility, schedule, payout RPCs) land in a later v9.x file —
-- this migration only creates the recipient row so subsequent v9 work
-- has a real UUID to credit.
--
-- What this does:
--   1. INSERT @combrewardspool into auth.users (empty encrypted_password,
--      so no login is possible) and public.bees. Same pattern as
--      @combtreasury in schema-v8-bling-themanual.sql §2 — bees.id has
--      a FK → auth.users.id, so the auth.users row must exist first.
--   2. Reserved/recognizable UUID: 8 zero blocks + 'feed'
--      (00000000-0000-0000-0000-00000000feed). Mnemonic: rewards feed
--      the swarm.
--
-- What this does NOT do:
--   - Wire any RPC to credit @combrewardspool. bling_send still credits
--     @combtreasury for bee-to-bee fees. Distribution policy will route
--     funds from treasury → rewards pool → Bees in a follow-up file.
--   - Modify bling_system_state, bling_transactions, or any RPC.
--
-- Idempotent: re-running is safe (ON CONFLICT (id) DO NOTHING on both
-- inserts; the follow-up UPDATE is a no-op when handle is already set).
--
-- ⚠ FK CHECK: schema-v8-bling-themanual.sql §2 already established the
-- bees.id → auth.users.id FK is enforced on themanual.tech. If that
-- ever changes, the auth.users INSERT below becomes optional.
--
-- ⚠ TRIGGER NOTE (REQUIRED READING for any future system bee):
-- An on_auth_user_created trigger on auth.users fires AFTER our
-- auth.users INSERT and auto-creates a public.bees row with a
-- generated/default handle (NOT the one we want). Because that bees
-- row exists by the time our explicit `INSERT INTO public.bees`
-- runs, ON CONFLICT (id) DO NOTHING leaves the wrong handle in place.
--
-- Workaround (used in §3 below, MUST be repeated for every future
-- system bee): follow the inserts with
--   UPDATE public.bees SET handle = '{intended_handle}'
--   WHERE id = '{uuid}';
-- to overwrite whatever the trigger set. Email may also need the same
-- treatment depending on what the trigger populates.
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- 1. @combrewardspool — auth.users row (no login)
-- ───────────────────────────────────────────────────────────────────────
-- BEGIN AUTH BLOCK ─────────────────────────────────────────────────────
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_sso_user,
    is_anonymous
) VALUES (
    '00000000-0000-0000-0000-00000000feed'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'rewardspool@themanual.tech',
    '',
    now(),
    '{"provider":"system"}'::jsonb,
    '{"name":"Comb Rewards Pool","system":true}'::jsonb,
    now(),
    now(),
    false,
    false
)
ON CONFLICT (id) DO NOTHING;
-- END AUTH BLOCK ───────────────────────────────────────────────────────

-- ───────────────────────────────────────────────────────────────────────
-- 2. @combrewardspool — public.bees row (best-effort; trigger may win)
-- ───────────────────────────────────────────────────────────────────────
-- themanual.tech bees uses `handle` (not `bee_id`). bling_rank,
-- honeycomb_ring, action_count, updated_at have NOT NULL DEFAULTs.
-- NOTE: the on_auth_user_created trigger has likely already inserted
-- this row with a default handle. We INSERT here for the case where
-- the trigger is ever disabled; §3 is what guarantees correctness.
INSERT INTO public.bees (id, handle, email, bling_balance)
VALUES (
    '00000000-0000-0000-0000-00000000feed'::uuid,
    'combrewardspool',
    'rewardspool@themanual.tech',
    0
)
ON CONFLICT (id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────
-- 3. Overwrite trigger-generated handle/email (REQUIRED — see header)
-- ───────────────────────────────────────────────────────────────────────
UPDATE public.bees
SET    handle = 'combrewardspool',
       email  = 'rewardspool@themanual.tech'
WHERE  id = '00000000-0000-0000-0000-00000000feed'::uuid;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════
-- 1. Both system bees present:
--      SELECT id, handle, bling_balance, bling_rank, action_count
--      FROM public.bees
--      WHERE handle IN ('combtreasury','combrewardspool')
--      ORDER BY handle;
--      -> 2 rows: combrewardspool (id ends ...feed),
--                 combtreasury    (id ends ...bee).
--         Both balance=0.000, rank=0.
--
-- 2. Rewards pool auth.users + bees rows linked:
--      SELECT u.id, u.email, b.handle, b.bling_balance
--      FROM auth.users u JOIN public.bees b ON b.id = u.id
--      WHERE u.id = '00000000-0000-0000-0000-00000000feed'::uuid;
--      -> 1 row: id ends ...feed, email=rewardspool@themanual.tech,
--                handle=combrewardspool, bling_balance=0.000
--
-- 3. Confirm no login is possible (empty password hash):
--      SELECT id, email, encrypted_password = '' AS no_login
--      FROM auth.users
--      WHERE id = '00000000-0000-0000-0000-00000000feed'::uuid;
--      -> no_login = true
-- ═══════════════════════════════════════════════════════════════════════
