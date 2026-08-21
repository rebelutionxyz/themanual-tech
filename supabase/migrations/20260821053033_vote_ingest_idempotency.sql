-- VOTE_IDEMPOTENCY_APPLY1 — ingest idempotency keys for the vote knowledge graph.
-- Paired from REBELUTION.vote/db/proposed/0003_ingest_idempotency.sql per SQL_AUTONOMY v1.1.
-- Applied 2026-08-21 via apply_migration; stamped version 20260821053033.
-- Strictly additive (VOTE_ENGINE1 follow-up to 0002 / VOTE_SCHEMA_APPLY1).
--
-- ROLLBACK (Section A of the proposal, stated first per MIGRATION AMENDMENT):
--   BEGIN;
--     ALTER TABLE public.election_field_citations
--       DROP CONSTRAINT IF EXISTS election_field_citations_entity_field_key;
--     ALTER TABLE public.election_races DROP COLUMN IF EXISTS natural_key;
--     ALTER TABLE public.election_polls DROP COLUMN IF EXISTS natural_key;
--   COMMIT;

-- B1. citations: idempotent on-conflict target (replaces delete-then-insert).
alter table public.election_field_citations
  add constraint election_field_citations_entity_field_key
  unique (entity, entity_id, field);

-- B2. race + poll natural keys (nullable + unique so existing 0002 rows are unaffected).
alter table public.election_races add column if not exists natural_key text;
alter table public.election_races
  add constraint election_races_natural_key_key unique (natural_key);

alter table public.election_polls add column if not exists natural_key text;
alter table public.election_polls
  add constraint election_polls_natural_key_key unique (natural_key);

-- After this applies: engine CONFLICT_FOR gains race:'natural_key', poll:'natural_key',
-- and the citation delete-then-insert becomes upsert on the unique above.
