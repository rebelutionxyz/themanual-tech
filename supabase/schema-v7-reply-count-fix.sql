-- ═══════════════════════════════════════════════════════════════════════
-- TheManual.tech · Schema v7 — Reply count trigger re-apply + backfill
-- April 23, 2026
--
-- Fixes E: forum_threads.reply_count not incrementing on reply.
--
-- What this does:
-- 1. Re-applies the on_forum_post_insert trigger from schema-v3-intel.sql
--    (idempotent — safe to run multiple times). If v3 was never applied to
--    production, this installs the trigger now.
-- 2. Recomputes reply_count + last_activity_at for every existing thread
--    by counting actual rows in forum_posts. Fixes any historical drift.
--
-- This migration is fully idempotent — run as many times as you like.
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- 1. Re-install trigger function (idempotent)
-- ───────────────────────────────────────────────────────────────────────
create or replace function public.handle_forum_post_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.forum_threads
  set reply_count = reply_count + 1,
      last_activity_at = now()
  where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists on_forum_post_insert on public.forum_posts;
create trigger on_forum_post_insert
  after insert on public.forum_posts
  for each row execute function public.handle_forum_post_insert();

-- ───────────────────────────────────────────────────────────────────────
-- 2. Install DELETE trigger — decrement when posts are removed
--    (v3 only handled INSERT; if any posts have been deleted, counts
--    would be off. Adding DELETE closes that gap going forward.)
-- ───────────────────────────────────────────────────────────────────────
create or replace function public.handle_forum_post_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.forum_threads
  set reply_count = greatest(reply_count - 1, 0)
  where id = old.thread_id;
  return old;
end;
$$;

drop trigger if exists on_forum_post_delete on public.forum_posts;
create trigger on_forum_post_delete
  after delete on public.forum_posts
  for each row execute function public.handle_forum_post_delete();

-- ───────────────────────────────────────────────────────────────────────
-- 3. Backfill: recompute reply_count + last_activity_at for all threads.
--    Single UPDATE with subquery — O(n) scan, fine for current scale.
-- ───────────────────────────────────────────────────────────────────────
update public.forum_threads t
set
  reply_count = coalesce(p.cnt, 0),
  last_activity_at = coalesce(p.last_at, t.created_at)
from (
  select
    thread_id,
    count(*) as cnt,
    max(created_at) as last_at
  from public.forum_posts
  group by thread_id
) p
where t.id = p.thread_id;

-- Also reset threads with zero posts to reply_count = 0 (in case drift
-- left them positive).
update public.forum_threads t
set reply_count = 0
where not exists (
  select 1 from public.forum_posts p where p.thread_id = t.id
)
and t.reply_count <> 0;

-- ───────────────────────────────────────────────────────────────────────
-- 4. Sanity check query (run this after to confirm):
--
--   select
--     t.id,
--     t.title,
--     t.reply_count as stored_count,
--     (select count(*) from public.forum_posts p where p.thread_id = t.id) as actual_count
--   from public.forum_threads t
--   where t.reply_count <> (
--     select count(*) from public.forum_posts p where p.thread_id = t.id
--   );
--
-- Should return 0 rows after this migration.
-- ───────────────────────────────────────────────────────────────────────
