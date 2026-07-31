-- LIVE INCIDENT MITIGATION. Found by DB11 2026-07-31, independently reconfirmed by LEAD
-- before applying, and authorized by Butch in chat ("run security fix").
--
-- PROVEN BEFORE THIS MIGRATION, as role anon, on live row
-- 'tech-transport-technology-rail-transport-famous-trains' (a real atom, "Famous trains"):
--   UPDATE through public.trivia_topic_candidates -> PERMITTED (1 row)
--   identical UPDATE direct on public.atoms       -> DENIED   (0 rows, base RLS)
-- Both probes were no-op self-assignments inside BEGIN/ROLLBACK. No data was altered.
--
-- MECHANISM: the view has no security_invoker, is owned by postgres, and postgres carries
-- rolbypassrls = t. A non-invoker view resolves base-table permissions AS ITS OWNER, so the
-- owner's RLS bypass is inherited by any caller. The view is auto-updatable (single-table
-- SELECT over public.atoms), and Supabase's default GRANT ALL ... TO anon supplied the
-- privilege. Four defaults composing into unauthenticated write access to a 37,437-row table.
--
-- SCOPE: writes only. SELECT is deliberately untouched so nothing reading these views breaks.
-- trivia_topic_candidates is the proven path; the three atom_trending_* views carry the same
-- anon grants without a demonstrated exploit and are included because it costs nothing.
--
-- THIS IS MITIGATION, NOT THE CURE. The correct fix is security_invoker = true on every view
-- in public, which also changes READ resolution and is therefore a deliberate decision, not an
-- emergency one. Tracked for a follow-up pass.
--
-- ROLLBACK (do not run without understanding the above):
--   GRANT INSERT, UPDATE, DELETE, TRUNCATE ON public.trivia_topic_candidates,
--     public.atom_trending_24h, public.atom_trending_7d, public.atom_trending_30d
--     TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON public.trivia_topic_candidates,
     public.atom_trending_24h,
     public.atom_trending_7d,
     public.atom_trending_30d
  FROM anon, authenticated;