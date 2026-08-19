-- ROLLBACK for 20260818215307_db79_provider_catalog_v1.sql
-- DB79, 2026-08-18. WRITTEN BEFORE THE FORWARD MIGRATION per the MIGRATION AMENDMENT.
-- PROPOSAL — the forward migration is NOT applied; this is its recovery script.
--
-- Reverses: the provider catalog (providers + models tables), the single
-- h24-token margin function, their RLS, and the seed rows. Purely a create —
-- nothing pre-existing is touched — so the rollback is a clean drop in FK order
-- (models before providers), and the seed rows go with the tables.
--
-- Safe to run only while nothing ELSE references these objects yet. Once the
-- route's rate path is repointed at this catalog (a later pass), that repoint
-- must be reverted first — this rollback drops the tables the route would read.

BEGIN;

DROP FUNCTION IF EXISTS public.h24_tokens_per_mtok(numeric, text);

-- models has the FK to providers, so it drops first. CASCADE clears the
-- policies and the FK with the tables.
DROP TABLE IF EXISTS public.models CASCADE;
DROP TABLE IF EXISTS public.providers CASCADE;

COMMIT;
