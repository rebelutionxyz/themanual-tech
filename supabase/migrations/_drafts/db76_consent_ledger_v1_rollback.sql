-- =============================================================================
-- ROLLBACK DRAFT — db76 consent ledger v1
-- PROPOSAL ONLY. NOT APPLIED. Pairs with db76_consent_ledger_v1.sql.
-- Authored FIRST, per the MIGRATION AMENDMENT. DB76, 2026-08-18.
--
-- The forward migration is PURELY ADDITIVE: two new tables, four new enums,
-- three new routines, two new triggers. It alters nothing that already exists.
-- That is what makes this rollback a clean drop with no data to restore — there
-- is no pre-migration state of these objects, because they do not exist yet.
--
-- THE ONE THING THIS ROLLBACK DESTROYS: any consent grants and receipts written
-- between the apply and the rollback. Receipts are append-only history and a
-- user's record of what h24 has seen. The guard below refuses to run if either
-- table is non-empty, so a rollback after real use is a deliberate act with a
-- second decision attached, not an accident.
-- =============================================================================

BEGIN;

-- ── Guard: never silently destroy a user's consent history.
DO $guard$
DECLARE
  n_grants integer := 0;
  n_receipts integer := 0;
BEGIN
  IF to_regclass('public.consent_grants') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.consent_grants' INTO n_grants;
  END IF;
  IF to_regclass('public.consent_receipts') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.consent_receipts' INTO n_receipts;
  END IF;
  IF n_grants > 0 OR n_receipts > 0 THEN
    RAISE EXCEPTION
      'db76 rollback refused: % grant(s) and % receipt(s) exist. These are a user-facing record of what was accessed. Export them before dropping, then re-run with the tables emptied deliberately.',
      n_grants, n_receipts;
  END IF;
END
$guard$;

-- ── Routines first (they depend on the tables).
DROP FUNCTION IF EXISTS public.consent_receipt_write(uuid, public.consent_capability, public.consent_scope_kind, uuid, text, numeric, uuid);
DROP FUNCTION IF EXISTS public.consent_revoke(uuid);
DROP FUNCTION IF EXISTS public.consent_grant(public.consent_scope_kind, uuid, text, public.consent_grantee_kind, uuid, text, public.consent_capability, public.consent_mode, timestamptz);

-- ── Triggers die with their tables; the trigger function does not.
DROP FUNCTION IF EXISTS public.consent_receipts_append_only() CASCADE;

-- ── Tables. receipts first — it references grants.
DROP TABLE IF EXISTS public.consent_receipts;
DROP TABLE IF EXISTS public.consent_grants;

-- ── Enums last — nothing may still reference them.
DROP TYPE IF EXISTS public.consent_mode;
DROP TYPE IF EXISTS public.consent_capability;
DROP TYPE IF EXISTS public.consent_grantee_kind;
DROP TYPE IF EXISTS public.consent_scope_kind;

-- ── Verify: every object is gone.
DO $verify$
BEGIN
  IF to_regclass('public.consent_grants')   IS NOT NULL THEN RAISE EXCEPTION 'db76 rollback: consent_grants survived'; END IF;
  IF to_regclass('public.consent_receipts') IS NOT NULL THEN RAISE EXCEPTION 'db76 rollback: consent_receipts survived'; END IF;
  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
              WHERE n.nspname = 'public'
                AND t.typname IN ('consent_scope_kind','consent_grantee_kind','consent_capability','consent_mode'))
  THEN RAISE EXCEPTION 'db76 rollback: a consent enum survived'; END IF;
END
$verify$;

COMMIT;
