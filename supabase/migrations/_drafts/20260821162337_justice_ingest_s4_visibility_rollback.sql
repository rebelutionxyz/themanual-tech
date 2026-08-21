-- ============================================================================
-- Rollback for justice_ingest_s4_visibility.sql (§4 record-visibility gate).
-- Restores the pre-§4 posture: crowd-review-only public read, reviewed_chk without
-- the ingest branch. This migration did NOT widen the origin columns (fnulnu authors
-- ingested rows, per SYSTEM_BEE v1) so there is NO NOT-NULL to restore and NO origin
-- CHECK to drop. justice_sources.is_trusted is left in place (additive, harmless).
--
-- NOTE: run this BEFORE rolling back the substrate (20260821153831) — §4 references
-- ingest_source_id / is_trusted which the substrate rollback would drop.
-- ============================================================================

begin;

-- undo §4d: restore the original crowd-review-only public read
drop policy if exists justice_filings_public_read on public.justice_filings;
create policy justice_filings_public_read on public.justice_filings
  for select using (
    review_status = 'entered'
    and exists (
      select 1 from public.justice_dockets d
      where d.id = justice_filings.docket_id and d.is_fixture = false
    )
  );

-- undo §4c: restore the original reviewed_chk (entered/rejected require a reviewer)
alter table public.justice_filings drop constraint if exists justice_filings_reviewed_chk;
alter table public.justice_filings
  add constraint justice_filings_reviewed_chk
  check (
    review_status = 'pending_review'
    or (reviewed_by is not null and reviewed_at is not null)
  );

-- justice_sources.is_trusted is intentionally LEFT in place (additive, harmless).
-- To fully remove: alter table public.justice_sources drop column if exists is_trusted;

commit;
