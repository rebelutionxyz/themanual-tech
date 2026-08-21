-- ============================================================================
-- 20260821060000_justice_ingest_substrate.sql
-- Applied by: migrate lane, pass JUSTICE_SCHEMA_APPLY1 (session 99998b51).
-- Source proposal: REBELUTION.org/db/proposed/0001_justice_ingest.sql (JUSTICE_ENGINE1).
-- Rollback: 20260821060000_justice_ingest_substrate_rollback.sql (this dir).
--
-- SCOPE OF THIS APPLY: §1 registry + §2 provenance columns + §3 idempotency
-- uniques + §5 RLS/seed. **§4 (origin widening + record-visibility gate) is
-- DEFERRED** — it changes what is publicly on-record and REQUIRES AN OWNER RULING
-- (proposal §4). §4 stays parked in REBELUTION.org/db/proposed/0001_justice_ingest.sql
-- until ruled. Until §4 lands, the engine's live 'entered' writes stay gated.
--
-- ADDITIVE + REVERSIBLE. No column DROP, no data rewrite. Pre-flight recorded in
-- TheMANUAL.tech/REPORT.md (justice_is_admin() present; no INSERT trigger reads
-- author_bee; gen_random_uuid() resolves unqualified; rows entities1/dockets5/
-- filings2/exhibits1/claims3/outcomes0).
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- §1  SOURCE REGISTRY
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.justice_sources (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique
                check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (length(btrim(name)) > 0),
  homepage    text,
  base_url    text,
  rate_limit  text,
  license     text,
  priority    integer not null default 100,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
comment on table public.justice_sources is
  'Registry of official-record ingest sources (JUSTICE_ENGINE1). Membership is a data-provenance fact, never an accusation.';

-- ─────────────────────────────────────────────────────────────────────────
-- §2  PROVENANCE COLUMNS on the six ingest targets
-- ─────────────────────────────────────────────────────────────────────────
alter table public.justice_entities
  add column if not exists ingest_source_id uuid references public.justice_sources(id) on delete set null,
  add column if not exists external_ref     text,
  add column if not exists retrieved_at      timestamptz;

alter table public.justice_dockets
  add column if not exists ingest_source_id uuid references public.justice_sources(id) on delete set null,
  add column if not exists external_ref     text,
  add column if not exists retrieved_at      timestamptz;

alter table public.justice_filings
  add column if not exists ingest_source_id uuid references public.justice_sources(id) on delete set null,
  add column if not exists external_ref     text,
  add column if not exists retrieved_at      timestamptz;

alter table public.justice_exhibits
  add column if not exists ingest_source_id uuid references public.justice_sources(id) on delete set null,
  add column if not exists external_ref     text,
  add column if not exists retrieved_at      timestamptz;

alter table public.justice_claims
  add column if not exists ingest_source_id uuid references public.justice_sources(id) on delete set null,
  add column if not exists external_ref     text,
  add column if not exists retrieved_at      timestamptz;

alter table public.justice_outcomes
  add column if not exists ingest_source_id uuid references public.justice_sources(id) on delete set null,
  add column if not exists external_ref     text,
  add column if not exists retrieved_at      timestamptz;

-- ─────────────────────────────────────────────────────────────────────────
-- §3  IDEMPOTENCY UNIQUES  (filings/claims/outcomes lack a natural key)
--   Both columns nullable → NULL-distinct, so human rows never collide;
--   ingested rows always set both.
-- ─────────────────────────────────────────────────────────────────────────
create unique index if not exists justice_filings_ingest_ref_uidx
  on public.justice_filings (ingest_source_id, external_ref);
create unique index if not exists justice_claims_ingest_ref_uidx
  on public.justice_claims (ingest_source_id, external_ref);
create unique index if not exists justice_outcomes_ingest_ref_uidx
  on public.justice_outcomes (ingest_source_id, external_ref);

-- ─────────────────────────────────────────────────────────────────────────
-- §5  RLS + SEED  (justice_sources)
--   Public read; admin writes via justice_is_admin(); service-role bypasses RLS.
--   Seed is idempotent.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.justice_sources enable row level security;

drop policy if exists justice_sources_public_read on public.justice_sources;
create policy justice_sources_public_read on public.justice_sources
  for select using (true);

drop policy if exists justice_sources_admin_all on public.justice_sources;
create policy justice_sources_admin_all on public.justice_sources
  for all using (justice_is_admin()) with check (justice_is_admin());

insert into public.justice_sources (slug, name, homepage, base_url, rate_limit, license, priority)
values
  ('sec',           'SEC — Litigation Releases & Administrative Proceedings', 'https://www.sec.gov/litigation.htm',            'https://www.sec.gov',                            '~10/min', 'US Government work (public domain)', 10),
  ('doj',           'DOJ — Press Releases (all divisions)',                   'https://www.justice.gov/news',                  'https://www.justice.gov',                        '~10/min', 'US Government work (public domain)', 20),
  ('ftc',           'FTC — Cases and Proceedings',                           'https://www.ftc.gov/legal-library/browse/cases-proceedings', 'https://www.ftc.gov',              '~10/min', 'US Government work (public domain)', 30),
  ('courtlistener', 'CourtListener / RECAP — Federal Dockets',               'https://www.courtlistener.com',                 'https://www.courtlistener.com/api/rest/v4',      '~60/min', 'CourtListener API (attribution; respect ToS)', 40)
on conflict (slug) do nothing;
