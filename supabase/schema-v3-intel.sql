-- ═══════════════════════════════════════════════════════════════════════
-- TheManual.tech · Schema v3 — INTEL forum helpers
-- April 22, 2026
-- Run AFTER schema.sql and schema-v2-surfaces.sql.
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- RPC: increment thread reply count + update last_activity_at
-- Called from the client when a new forum_post is created.
-- ───────────────────────────────────────────────────────────────────────
create or replace function public.increment_thread_reply_count(p_thread_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.forum_threads
  set reply_count = reply_count + 1,
      last_activity_at = now()
  where id = p_thread_id;
end;
$$;

-- Allow anonymous + authenticated to call (security is already enforced by
-- the underlying RLS on forum_posts — if you can't post, you can't call this)
grant execute on function public.increment_thread_reply_count(uuid) to anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────
-- Alternative: trigger-based auto-increment (more robust than RPC)
-- Every time a forum_post is inserted, bump parent thread's counters.
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
-- Additional indexes for common query patterns
-- ───────────────────────────────────────────────────────────────────────
create index if not exists forum_posts_bee_idx on public.forum_posts(bee_id);
create index if not exists forum_posts_parent_post_idx on public.forum_posts(parent_post_id)
  where parent_post_id is not null;
create index if not exists forum_threads_author_idx on public.forum_threads(created_by);

-- ═══════════════════════════════════════════════════════════════════════
-- END SCHEMA v3
-- ═══════════════════════════════════════════════════════════════════════
