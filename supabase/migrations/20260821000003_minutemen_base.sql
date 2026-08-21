-- PROPOSAL_APPLY1 pairing file for MINUTEMEN 0001_minutemen_base (applied 2026-08-21 via execute_sql).
-- Reconstructed pairing (LEAD_PROTOCOL v0.39): the applied DDL. Source: MINUTEMEN.app/db/proposals/0001_minutemen_base.sql
begin;
create table if not exists public.minutemen_needs (id uuid primary key default gen_random_uuid(), requester_bee_id uuid not null references public.bees(id) on delete cascade, title text not null check (char_length(title) between 1 and 90), body text not null default '' check (char_length(body) <= 600), category text not null default 'other' check (category in ('errand','ride','delivery','repair','tech','care','moving','other')), urgency text not null default 'flexible' check (urgency in ('now','soon','flexible')), status text not null default 'open' check (status in ('open','claimed','enroute','arrived','resolved','cancelled')), location_label text, offer_bling numeric(20,6) check (offer_bling is null or offer_bling >= 0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), resolved_at timestamptz);
create index if not exists minutemen_needs_status_created_idx on public.minutemen_needs (status, created_at desc);
create index if not exists minutemen_needs_requester_idx on public.minutemen_needs (requester_bee_id, created_at desc);
alter table public.minutemen_needs enable row level security;
create policy minutemen_needs_public_read on public.minutemen_needs for select using (true);
create policy minutemen_needs_insert_own on public.minutemen_needs for insert with check (requester_bee_id = auth.uid());
create policy minutemen_needs_update_own on public.minutemen_needs for update using (requester_bee_id = auth.uid()) with check (requester_bee_id = auth.uid());
create table if not exists public.minutemen_dispatch_steps (id uuid primary key default gen_random_uuid(), need_id uuid not null references public.minutemen_needs(id) on delete cascade, status text not null check (status in ('open','claimed','enroute','arrived','resolved','cancelled')), actor_bee_id uuid references public.bees(id) on delete set null, note text check (note is null or char_length(note) <= 300), created_at timestamptz not null default now());
create index if not exists minutemen_dispatch_steps_need_idx on public.minutemen_dispatch_steps (need_id, created_at asc);
alter table public.minutemen_dispatch_steps enable row level security;
create policy minutemen_dispatch_steps_public_read on public.minutemen_dispatch_steps for select using (true);
create table if not exists public.minutemen_responder_interest (need_id uuid not null references public.minutemen_needs(id) on delete cascade, responder_bee_id uuid not null references public.bees(id) on delete cascade, blurb text check (blurb is null or char_length(blurb) <= 200), created_at timestamptz not null default now(), primary key (need_id, responder_bee_id));
create index if not exists minutemen_responder_interest_need_idx on public.minutemen_responder_interest (need_id, created_at asc);
alter table public.minutemen_responder_interest enable row level security;
create policy minutemen_responder_interest_public_read on public.minutemen_responder_interest for select using (true);
create policy minutemen_responder_interest_insert_own on public.minutemen_responder_interest for insert with check (responder_bee_id = auth.uid());
create policy minutemen_responder_interest_delete_own on public.minutemen_responder_interest for delete using (responder_bee_id = auth.uid());
commit;
