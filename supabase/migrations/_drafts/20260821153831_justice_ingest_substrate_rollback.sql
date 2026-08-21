-- ============================================================================
-- 20260821060000_justice_ingest_substrate_rollback.sql
-- Rollback for 20260821060000_justice_ingest_substrate.sql (§1–§3 + §5 only).
-- §4 was NOT applied, so this rollback carries no §4 block.
-- Reverses in dependency order: uniques → columns → registry/policies.
--
-- NOTE: dropping the §2 provenance columns discards any ingested rows' source
-- linkage. Safe while no ingested rows exist (the case at apply time). If ingest
-- has run, remove those rows first.
-- ============================================================================

begin;

-- ── undo §3  (idempotency uniques) ───────────────────────────────────────
drop index if exists public.justice_filings_ingest_ref_uidx;
drop index if exists public.justice_claims_ingest_ref_uidx;
drop index if exists public.justice_outcomes_ingest_ref_uidx;

-- ── undo §2  (provenance columns) ────────────────────────────────────────
alter table public.justice_entities  drop column if exists ingest_source_id, drop column if exists external_ref, drop column if exists retrieved_at;
alter table public.justice_dockets   drop column if exists ingest_source_id, drop column if exists external_ref, drop column if exists retrieved_at;
alter table public.justice_filings   drop column if exists ingest_source_id, drop column if exists external_ref, drop column if exists retrieved_at;
alter table public.justice_exhibits  drop column if exists ingest_source_id, drop column if exists external_ref, drop column if exists retrieved_at;
alter table public.justice_claims    drop column if exists ingest_source_id, drop column if exists external_ref, drop column if exists retrieved_at;
alter table public.justice_outcomes  drop column if exists ingest_source_id, drop column if exists external_ref, drop column if exists retrieved_at;

-- ── undo §1 / §5  (registry + its policies) ──────────────────────────────
drop policy if exists justice_sources_public_read on public.justice_sources;
drop policy if exists justice_sources_admin_all on public.justice_sources;
drop table if exists public.justice_sources;

commit;
