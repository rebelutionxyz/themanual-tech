-- ============================================================================
-- PROPOSAL 0001 — FYI microblog + the astra-status "nervous system".
--
-- PROPOSE-FIRST. THIS FILE IS NOT APPLIED BY THIS PASS AND MUST NOT BE.
-- New tables on the shared production backend are the owner's to apply, via a
-- db-lane dispatch with a recorded pre-flight and the rollback stated (MIGRATION
-- AMENDMENT). This file is the PROPOSAL the front (INTEL2) is built against; it
-- lives in db/proposals/, NOT in any supabase/migrations/ auto-apply path.
--
-- WHY IT EXISTS. CONCEPTS v1 [CANON]: "FYI is a basic Twitter site. Post / follow
-- / repost / reply. ALL astra status updates bubble up into it." No microblog
-- posts table exists on the backend today (the follow graph `bee_follows` does).
-- This proposal adds the posts primitive and the ONE shared status-event envelope
-- every astra emits into and FYI renders — "do NOT invent two formats" (EVENTS2
-- dispatch). EVENTS2 is the first emitter; this is the format it emits into.
--
-- COORDINATION. The `astra_events` envelope + `astra_emit_event()` RPC below are
-- proposed as the CANONICAL cross-astra shape. EVENTS2 (and NEWS/BAZAAR/GROUPS
-- later) call `astra_emit_event(...)`; FYI reads `astra_events`. If EVENTS2
-- proposes a different shape, the two must be reconciled to ONE before either is
-- applied — flag at the walkthrough. Owner ratifies the shape as canon.
--
-- STYLE. Mirrors the platform conventions: uuid pks, numeric where money, RLS on
-- every table, public read for public content, writes via SECURITY DEFINER RPCs
-- scoped to auth.uid(). BLiNG amounts (tips, later) are numeric(20,6) per Lock 7.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. fyi_posts — the microblog primitive. One table covers post / reply /
--    repost; `kind` and the two nullable parent refs distinguish them.
-- ---------------------------------------------------------------------------
create table if not exists public.fyi_posts (
  id            uuid primary key default gen_random_uuid(),
  author_bee_id uuid not null references public.bees(id) on delete cascade,
  -- Body is required for a post/reply; a bare repost may have an empty body,
  -- a quote-repost carries one. Cap at 500 (the product's short-post limit).
  body          text not null default '' check (char_length(body) <= 500),
  kind          text not null default 'post'
                  check (kind in ('post', 'reply', 'repost')),
  -- A reply points at the post it answers; null for a top-level post.
  parent_post_id uuid references public.fyi_posts(id) on delete cascade,
  -- A repost points at the post it boosts; null otherwise.
  repost_of_id  uuid references public.fyi_posts(id) on delete cascade,
  -- Denormalised counts, maintained by triggers (below). Never the source of
  -- truth — a reconcile view can always recompute from the child rows.
  reply_count   integer not null default 0,
  repost_count  integer not null default 0,
  like_count    integer not null default 0,
  is_hidden     boolean not null default false,
  created_at    timestamptz not null default now(),
  edited_at     timestamptz,
  -- Shape integrity: a reply has a parent; a repost has a target.
  constraint fyi_posts_reply_has_parent
    check (kind <> 'reply' or parent_post_id is not null),
  constraint fyi_posts_repost_has_target
    check (kind <> 'repost' or repost_of_id is not null)
);

create index if not exists fyi_posts_created_idx    on public.fyi_posts (created_at desc);
create index if not exists fyi_posts_author_idx     on public.fyi_posts (author_bee_id, created_at desc);
create index if not exists fyi_posts_parent_idx     on public.fyi_posts (parent_post_id) where parent_post_id is not null;
create index if not exists fyi_posts_repostof_idx   on public.fyi_posts (repost_of_id) where repost_of_id is not null;

alter table public.fyi_posts enable row level security;

-- Public read of non-hidden posts (the timeline is public, like the surface).
create policy fyi_posts_public_read on public.fyi_posts
  for select using (is_hidden = false);

-- A Bee posts as themselves, never as another.
create policy fyi_posts_insert_own on public.fyi_posts
  for insert with check (author_bee_id = auth.uid());

-- A Bee edits / soft-deletes only their own post.
create policy fyi_posts_update_own on public.fyi_posts
  for update using (author_bee_id = auth.uid()) with check (author_bee_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. fyi_post_likes — one like per Bee per post.
-- ---------------------------------------------------------------------------
create table if not exists public.fyi_post_likes (
  post_id    uuid not null references public.fyi_posts(id) on delete cascade,
  bee_id     uuid not null references public.bees(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, bee_id)
);

alter table public.fyi_post_likes enable row level security;

-- Like counts are aggregate/public; individual like rows are readable so a Bee
-- can see what they liked. (Tighten to own-row if the owner prefers.)
create policy fyi_post_likes_public_read on public.fyi_post_likes
  for select using (true);
create policy fyi_post_likes_insert_own on public.fyi_post_likes
  for insert with check (bee_id = auth.uid());
create policy fyi_post_likes_delete_own on public.fyi_post_likes
  for delete using (bee_id = auth.uid());

-- NOTE: bee_follows ALREADY EXISTS (follower_bee_id, followed_bee_id,
-- created_at). FYI reuses it for the follow graph — nothing to add here.

-- ---------------------------------------------------------------------------
-- 3. astra_events — THE NERVOUS SYSTEM. The ONE shared envelope every astra
--    emits into and FYI renders as system posts / cross-astra cards.
--    "do NOT invent two formats" — EVENTS2 emits into THIS.
-- ---------------------------------------------------------------------------
create table if not exists public.astra_events (
  id            uuid primary key default gen_random_uuid(),
  -- Which astra emitted it: 'events','groups','bazaar','news','vote', ...
  astra_slug    text not null,
  -- Dotted verb the card renderer switches on:
  --   'event.created','event.starting','group.created','listing.posted',
  --   'broadcast.live','docket.filed', ...
  event_type    text not null,
  -- Who triggered it, when a person did. Null for a system/automated event.
  actor_bee_id  uuid references public.bees(id) on delete set null,
  -- Human-facing headline + one-line summary — already display copy.
  title         text not null,
  summary       text,
  -- Deep link ON THE EMITTING ASTRA (a logical path, e.g. '/e/<slug>'); FYI
  -- composes the absolute cross-astra URL from the astra registry domain.
  link_path     text,
  entity_id     uuid,
  -- Astra-specific card fields (a date, a BLiNG price, an image, a count).
  payload       jsonb not null default '{}'::jsonb,
  visibility    text not null default 'public' check (visibility in ('public','members')),
  created_at    timestamptz not null default now()
);

create index if not exists astra_events_created_idx on public.astra_events (created_at desc);
create index if not exists astra_events_astra_idx    on public.astra_events (astra_slug, created_at desc);

alter table public.astra_events enable row level security;

create policy astra_events_public_read on public.astra_events
  for select using (visibility = 'public');
-- No direct INSERT policy: writes go ONLY through astra_emit_event() below, so
-- an astra cannot emit under another astra's name or forge an actor.

-- The single write path every astra calls. SECURITY DEFINER so the astra's
-- service context can emit; actor is the authenticated caller (or null).
create or replace function public.astra_emit_event(
  p_astra_slug text,
  p_event_type text,
  p_title      text,
  p_summary    text default null,
  p_link_path  text default null,
  p_entity_id  uuid default null,
  p_payload    jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if coalesce(trim(p_astra_slug), '') = '' or coalesce(trim(p_event_type), '') = '' then
    raise exception 'astra_emit_event: astra_slug and event_type are required';
  end if;
  if coalesce(trim(p_title), '') = '' then
    raise exception 'astra_emit_event: title is required';
  end if;

  insert into public.astra_events
    (astra_slug, event_type, actor_bee_id, title, summary, link_path, entity_id, payload)
  values
    (p_astra_slug, p_event_type, auth.uid(), p_title, p_summary, p_link_path, p_entity_id,
     coalesce(p_payload, '{}'::jsonb))
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.astra_emit_event(text,text,text,text,text,uuid,jsonb) to authenticated, service_role;

commit;

-- ============================================================================
-- OPEN QUESTIONS for the owner walkthrough (do not resolve in code):
--   1. The existing FORUM data (forum_threads/forum_posts) — becomes a lane
--      inside FYI, or retired? DO NOT DELETE either way. This proposal leaves
--      the forum tables untouched.
--   2. Tips on a post (BLiNG) and polls are [PROPOSED] in CONCEPTS v1 — deferred
--      to a later proposal; not in this file.
--   3. Reconcile the envelope with EVENTS2's emit side before applying — ONE
--      format. Owner ratifies the shape as canon.
-- ============================================================================
