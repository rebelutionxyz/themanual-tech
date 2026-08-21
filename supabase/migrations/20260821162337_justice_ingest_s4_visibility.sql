-- ============================================================================
-- justice_ingest_s4_visibility.sql
-- Applied by: migrate lane, pass JUSTICE_SCHEMA_APPLY1 (session be0bc0bc).
-- Second half of the JUSTICE_ENGINE1 delta: the §4 RECORD-VISIBILITY GATE.
-- Authorized by JUSTICE_SCHEMA v1 (owner-via-lead ruling 2026-08-21), §4 SCOPED.
-- Substrate §1-3+§5 already landed in 20260821153831_justice_ingest_substrate.
-- Rollback: _drafts/<stamped>_justice_ingest_s4_visibility_rollback.sql
--
-- ORIGIN MODEL — fnulnu, NOT widening (SYSTEM_BEE v1 SUPERSEDES proposal §4a):
--   The proposal's §4a widened author_bee / submitter / recorded_by to NULL so a
--   machine-ingested row could stand without a Bee author. SYSTEM_BEE v1 (owner,
--   2026-08-21) reverses that: fnulnu (00000000-0000-0000-0000-deadbeefdead) is the
--   DEFAULT author for anything the platform/h24 creates, across every astra.
--   Ingested justice rows therefore AUTHOR AS fnulnu, and the origin columns STAY
--   NOT NULL. That is a STRONGER guarantee than the proposal's origin CHECK: an
--   authorless row is impossible at the column level, so §4a widening AND the §4b
--   origin CHECKs are intentionally omitted here. (Engine change required — the
--   ingest engine must set author_bee/submitter/recorded_by = fnulnu, not null;
--   messaged to the justice lane on apply.)
--
-- SCOPE / TIGHTENING (per JUSTICE_SCHEMA v1 §4b — MANDATORY):
--   Auto-on-record keys off a REGISTERED TRUSTED GOVERNMENT SOURCE carrying a
--   source_cite; crowd/user/whistleblower rows STAY review-gated ("a tip is not a
--   published claim").
--     (a) NEW justice_sources.is_trusted (default false) — the trusted-source key.
--         The 4 seeded gov sources set true; a future-registered source is untrusted
--         until explicitly marked.
--     (b) reviewed_chk relaxes 'entered'-without-reviewer ONLY for ingest_source_id +
--         source_cite (a CHECK cannot subquery is_trusted; the trust key lives in the
--         RLS gate, which is where "publicly on-record" is actually decided).
--     (c) public_read gate: crowd path REQUIRES reviewed_by (human review) so an
--         auto-'entered' ingested row cannot ride the crowd path; trusted path REQUIRES
--         is_trusted source + source_cite. An untrusted source-ingested row is therefore
--         NOT publicly visible — the leak the ruling warned against is closed.
--
-- PRE-FLIGHT (recorded in REPORT.md): triggers on the three targets inspected —
--   justice_filings_touch (BEFORE UPDATE, sets updated_at) and
--   justice_exhibits_append_only_trg (BEFORE DELETE/UPDATE); NO INSERT trigger reads
--   author columns, so the origin model is trigger-safe. Existing filings (2) all carry
--   a human origin; new reviewed_chk is a superset of the old, so no existing row is
--   invalidated. author_bee stays NOT NULL — no un-widening risk on rollback.
-- ADDITIVE + REVERSIBLE: one nullable-default column + new CHECK + replaced policy; no
--   column DROP, no NOT NULL change, no data rewrite (only marking the 4 gov sources trusted).
-- ============================================================================

-- §4-pre  TRUSTED-SOURCE KEY (the tightening justice_sources needs for §4b)
alter table public.justice_sources
  add column if not exists is_trusted boolean not null default false;
comment on column public.justice_sources.is_trusted is
  'True = trusted government source whose CITED filings are auto-on-record without crowd review (JUSTICE_SCHEMA v1 §4b). Default false: a newly registered source is untrusted until explicitly marked.';
update public.justice_sources set is_trusted = true
 where slug in ('sec','doj','ftc','courtlistener');

-- §4c  A filing may be 'entered' with no human reviewer ONLY when it is source-ingested
--      AND carries a source_cite. (is_trusted is enforced by the visibility gate below,
--      not here — a CHECK constraint cannot contain a subquery.) Origin columns stay
--      NOT NULL; ingested rows author as fnulnu, so this is the only insert-path change.
alter table public.justice_filings drop constraint if exists justice_filings_reviewed_chk;
alter table public.justice_filings
  add constraint justice_filings_reviewed_chk
  check (
    review_status = 'pending_review'
    or (reviewed_by is not null and reviewed_at is not null)
    or (ingest_source_id is not null and source_cite is not null and review_status = 'entered')
  );

-- §4d  PUBLIC READ = the record-visibility gate. Keys off TRUSTED-SOURCE origin, not
--      "any non-Bee row". Crowd path requires human review; trusted path requires a
--      trusted source + a source_cite. Fixtures never public.
drop policy if exists justice_filings_public_read on public.justice_filings;
create policy justice_filings_public_read on public.justice_filings
  for select using (
    (
      -- crowd path: human-reviewed and entered (reviewed_by present excludes auto-entered ingest rows)
      (review_status = 'entered' and reviewed_by is not null)
      -- trusted-source path: registered TRUSTED source carrying the required cite
      or (
        source_cite is not null
        and exists (
          select 1 from public.justice_sources s
          where s.id = justice_filings.ingest_source_id and s.is_trusted = true
        )
      )
    )
    and exists (
      select 1 from public.justice_dockets d
      where d.id = justice_filings.docket_id and d.is_fixture = false
    )
  );
