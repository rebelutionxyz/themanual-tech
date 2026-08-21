-- ============================================================================
-- PROPOSAL 0002 — the ASTRA BUS, severity + one canonical emit signature.
--   Pass: DEPTH_BUS1 (DEPTH_SLATE v1 E2). Depends conceptually on 0001's
--   astra_events envelope; this file is ADDITIVE and self-sufficient.
--
-- PROPOSE-FIRST. THIS FILE IS NOT APPLIED BY THIS PASS AND MUST NOT BE.
-- New/altered tables + RPCs on the shared production backend are the owner's to
-- apply, via a db-lane dispatch with a recorded pre-flight and the rollback
-- stated (MIGRATION AMENDMENT). It lives in db/proposals/, NOT in any
-- supabase/migrations/ auto-apply path.
--
-- WHY IT EXISTS. 0001 (INTEL2) proposed `astra_events` + `astra_emit_event()` as
-- the ONE shared status envelope every astra emits into and FYI renders. DEPTH_BUS1
-- makes that the constellation NERVOUS SYSTEM in earnest and wires the FYI shell's
-- Bell + Alert to read it. The shell has TWO channels — a notification Bell and an
-- urgent Alert — so the canonical envelope needs a first-class way to say "this one
-- is urgent". That is `severity` ('info' | 'alert'). Everything else about the 0001
-- envelope stands unchanged.
--
-- COORDINATION (DEPTH_RAILS1). Money events ride THIS bus too — no second format.
-- The rails lane emits BLiNG / payment / escrow updates by calling
-- `astra_emit_event(...)` exactly as any other astra does; a value movement that
-- needs a member's eye (a received tip, a settled escrow, a failed charge) is
-- emitted with p_severity => 'alert'. The full contract is written for the rails
-- lane in  docs/astra-events-bus.md  (this repo) — the canonical consumer-side
-- definition RAILS1 aligns its emit side to. If RAILS1 proposed a different shape,
-- the two reconcile to THIS one before either is applied; owner ratifies as canon.
--
-- CANON GUARDRAIL (DEPTH_SLATE). Additive only. Touches NOTHING under bling_* and
-- no built manual table — a new column on the (not-yet-applied) astra_events table
-- and one function replacement. No money-ledger table is read or written here.
--
-- IDEMPOTENT + APPLY-ORDER-PROOF. `astra_events` does not exist in production yet.
-- This file:
--   * creates it WITH severity if it is absent (so applying 0002 ALONE lights the
--     whole bus), and
--   * adds severity if 0001 already created it without.
-- Either apply order (0001 then 0002, or 0002 alone) converges on the same shape.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. astra_events — create-if-absent WITH severity, else add the column.
--    The severity CHECK is added once, by name, in the guarded block below —
--    NOT inline — so the two convergent paths never leave two equivalent checks.
-- ---------------------------------------------------------------------------
create table if not exists public.astra_events (
  id            uuid primary key default gen_random_uuid(),
  astra_slug    text not null,
  event_type    text not null,
  actor_bee_id  uuid references public.bees(id) on delete set null,
  title         text not null,
  summary       text,
  link_path     text,
  entity_id     uuid,
  payload       jsonb not null default '{}'::jsonb,
  visibility    text not null default 'public' check (visibility in ('public','members')),
  -- 'info'  — ordinary update, renders in the Bell.
  -- 'alert' — urgent / needs an eye, renders in the Alert channel too.
  severity      text not null default 'info',
  created_at    timestamptz not null default now()
);

-- Path where 0001 already created astra_events without severity:
alter table public.astra_events
  add column if not exists severity text not null default 'info';

-- One named severity CHECK, added exactly once regardless of path.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'astra_events_severity_chk'
  ) then
    alter table public.astra_events
      add constraint astra_events_severity_chk check (severity in ('info','alert'));
  end if;
end$$;

create index if not exists astra_events_created_idx on public.astra_events (created_at desc);
create index if not exists astra_events_astra_idx   on public.astra_events (astra_slug, created_at desc);
-- Partial index for the Alert channel — small, hot, urgent-only.
create index if not exists astra_events_alert_idx   on public.astra_events (created_at desc) where severity = 'alert';

alter table public.astra_events enable row level security;

-- Public read of public events (idempotent — 0001 may already have created it).
do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'astra_events'
       and policyname = 'astra_events_public_read'
  ) then
    create policy astra_events_public_read on public.astra_events
      for select using (visibility = 'public');
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- 2. astra_emit_event — ONE canonical signature, now carrying severity.
--    Drop the 0001 seven-arg form so exactly one signature exists; the new
--    eighth arg defaults to 'info', so every existing seven-positional caller
--    (and every named-arg caller) keeps working unchanged.
--    No direct INSERT policy on astra_events — writes go ONLY through here, so an
--    astra cannot emit under another astra's name or forge an actor.
-- ---------------------------------------------------------------------------
drop function if exists public.astra_emit_event(text, text, text, text, text, uuid, jsonb);

create or replace function public.astra_emit_event(
  p_astra_slug text,
  p_event_type text,
  p_title      text,
  p_summary    text default null,
  p_link_path  text default null,
  p_entity_id  uuid default null,
  p_payload    jsonb default '{}'::jsonb,
  p_severity   text default 'info'
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id       uuid;
  v_severity text := lower(coalesce(nullif(trim(p_severity), ''), 'info'));
begin
  if coalesce(trim(p_astra_slug), '') = '' or coalesce(trim(p_event_type), '') = '' then
    raise exception 'astra_emit_event: astra_slug and event_type are required';
  end if;
  if coalesce(trim(p_title), '') = '' then
    raise exception 'astra_emit_event: title is required';
  end if;
  if v_severity not in ('info', 'alert') then
    raise exception 'astra_emit_event: severity must be info or alert, got %', p_severity;
  end if;

  insert into public.astra_events
    (astra_slug, event_type, actor_bee_id, title, summary, link_path, entity_id, payload, severity)
  values
    (p_astra_slug, p_event_type, auth.uid(), p_title, p_summary, p_link_path, p_entity_id,
     coalesce(p_payload, '{}'::jsonb), v_severity)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function
  public.astra_emit_event(text, text, text, text, text, uuid, jsonb, text)
  to authenticated, service_role;

commit;

-- ============================================================================
-- APPLY NOTES for the owner / db lane:
--   * Pre-flight: astra_events is NOT yet applied in production (0001 pending),
--     so this touches no live rows. Confirm with a check on
--     information_schema.columns for astra_events.severity BEFORE and AFTER.
--   * Rollback: db/proposals/0002_astra_bus_severity_rollback.sql. It reverses the
--     severity DELTA over a 0001 baseline (drops the column, index, constraint;
--     restores the 7-arg emit fn). If 0002 was applied WITHOUT 0001 (fresh table),
--     the full teardown is `drop table public.astra_events cascade` — noted there.
--   * The canonical emit contract every astra codes against, RAILS1 included, is
--     docs/astra-events-bus.md in this repo.
-- ============================================================================
