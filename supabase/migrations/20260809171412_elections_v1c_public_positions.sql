-- DB44 -- elections_v1c_public_positions: public positions of verified actors
--
-- ROLLBACK: supabase/migrations/_drafts/20260809171412_elections_v1c_public_positions_rollback.sql
--           Written FIRST, per the MIGRATION AMENDMENT.
--
-- ALREADY APPLIED. This file was saved by DB45 AFTER the fact, adopting an
-- apply that ran on 2026-08-09 17:14:12 UTC without a repo file. The version in
-- this filename is the one apply_migration stamped, not a provisional name.
-- Do not re-apply it; it exists so the ledger reconciles and so a human has the
-- statement text to read. Same adopt-back shape as DB42 / dingleberry_device_v1.
--
-- Ruling basis: R7 (2026-08-09, Butch) PUBLIC POSITIONS v1 Option A --
-- actor-side accountability. Bee ballots stay secret; election_receipts is
-- untouched and identity-free, which the guard at the foot of this file asserts.
--
-- Statement text is byte-identical to the MIGRATION section of ops_dispatches
-- pass DB44, with the begin;/commit; wrapper stripped -- apply_migration wraps
-- its own transaction, so the applied text had none. Verified against the live
-- catalog by DB45: 11 columns, 8 constraints, 4 indexes, 3 policies, RLS on,
-- table comment exact.

create table public.election_positions (
  id uuid primary key default gen_random_uuid(),
  actor_id text not null references public.election_actors(id) on delete cascade,
  election_id uuid not null references public.elections(id) on delete cascade,
  position text not null,
  source text not null,
  evidence_url text,
  declared_at timestamptz not null default now(),
  superseded boolean not null default false,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.bees(id) on delete set null,
  constraint election_positions_position_len_chk
    check (char_length(position) between 1 and 80),
  constraint election_positions_source_chk
    check (source in ('platform','roll_call','statement')),
  constraint election_positions_evidence_required_chk
    check (source = 'platform' or evidence_url is not null),
  constraint election_positions_evidence_url_chk
    check (evidence_url is null or evidence_url ~* '^https?://')
);
comment on table public.election_positions is
  'Public positions of verified actors (R7 Option A, 2026-08-09). Actor-side only; never linked to Bee ballots.';
create index election_positions_actor_idx
  on public.election_positions (actor_id, declared_at desc);
create index election_positions_election_idx
  on public.election_positions (election_id);
create unique index election_positions_live_rollcall_uq
  on public.election_positions (actor_id, election_id)
  where source = 'roll_call' and superseded = false;
alter table public.election_positions enable row level security;
create policy election_positions_public_read on public.election_positions
  for select to anon, authenticated using (true);
create policy election_positions_admin_insert on public.election_positions
  for insert to authenticated with check (is_platform_admin());
create policy election_positions_admin_update on public.election_positions
  for update to authenticated
  using (is_platform_admin()) with check (is_platform_admin());
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'election_receipts'
               and column_name = 'bee_id') then
    raise exception 'CANON VIOLATION: election_receipts.bee_id must never exist';
  end if;
end $$;
