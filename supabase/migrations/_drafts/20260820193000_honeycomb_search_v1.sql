-- ============================================================
-- HONEYCOMB SEARCH v1 (SEARCH1) — one search face over the constellation.
-- Pass SEARCH1 | lane search | workdir honeycomb-search | 2026-08-20 | ASCII only.
-- Canon: SQL_AUTONOMY v1 (self-apply, additive) + CONCEPTS v4.1 (Sis/Furbo
-- bubble-up visibility). CANON GUARDRAIL: READ-ONLY over existing tables —
-- additive function only, ZERO modification of any source table, no bling_*
-- touch.
--
-- WHY SECURITY INVOKER (the visibility guarantee): the function runs as the
-- CALLER, so each source table's RLS applies to the caller (anon on SSR, the
-- signed-in bee in the browser). Private / gated / non-live rows are filtered by
-- Postgres itself — the search can NEVER surface a row the caller could not
-- already read. That is how "respect RLS / never surface private" is enforced
-- structurally rather than by hand. A SECURITY DEFINER search would bypass RLS
-- and leak; we deliberately do not use it.
--
-- ENTITIES (only those with an anon/public SELECT policy today):
--   atom     atoms (status='live' via RLS) + atom_aliases
--   listing  bazaar_listings (status='active')
--   thread   forum_threads
--   event    events
--   press    press_editions (RLS excludes draft/cancelled)
--   person   bees (handle/name/bio only — never email/balance)
--   bill     election_bills
-- OMITTED: games/competitions — RLS is member-scoped (host/participant only), so
--   a public search returns nothing and including it would be misleading. Games
--   are standalone apps, not indexed rows. Recorded, not guessed.
--
-- ROLLBACK (SQL_AUTONOMY step 2 — stated before apply):
--   DROP FUNCTION IF EXISTS public.honeycomb_search(text, integer);
-- ============================================================

create or replace function public.honeycomb_search(p_q text, p_per_kind integer default 6)
returns table (
  kind     text,
  ref      text,
  title    text,
  subtitle text,
  url      text,
  rank     real
)
language plpgsql
security invoker
stable
set search_path = public
as $$
declare
  q   text := btrim(coalesce(p_q, ''));
  pat text;
  per integer := greatest(1, least(coalesce(p_per_kind, 6), 25));
begin
  -- Too-short queries return nothing rather than scanning the whole taxonomy.
  if length(q) < 2 then
    return;
  end if;
  -- Escape LIKE metacharacters so a stray % or _ is a literal, not a wildcard.
  pat := '%' || replace(replace(q, '\', '\\'), '%', '\%') || '%';
  pat := replace(pat, '_', '\_');

  return query
  ( select 'atom'::text, a.id, a.name,
           nullif(coalesce(a.realm_name, '') ||
             case when a.path is not null then ' · ' || a.path else '' end, ''),
           'https://themanual.tech/' || a.path,
           greatest(similarity(a.name, q), similarity(coalesce(a.path, ''), q))::real
      from atoms a
     where a.name ilike pat escape '\' or a.path ilike pat escape '\'
     order by 6 desc, 3 asc
     limit per )
  union all
  ( select 'atom'::text, a.id, a.name || ' (alias)',
           al.alias_path,
           'https://themanual.tech/' || a.path,
           similarity(al.alias_path, q)::real
      from atom_aliases al
      join atoms a on a.id = al.atom_id
     where al.alias_path ilike pat escape '\'
     order by 6 desc
     limit per )
  union all
  ( select 'listing'::text, l.id::text, l.title,
           nullif(coalesce(l.category, ''), ''),
           'https://rebelution.shop/' || l.id::text,
           greatest(similarity(l.title, q), similarity(coalesce(l.description, ''), q))::real
      from bazaar_listings l
     where l.status = 'active'
       and (l.title ilike pat escape '\' or coalesce(l.description, '') ilike pat escape '\')
     order by 6 desc
     limit per )
  union all
  ( select 'thread'::text, t.id::text, t.title,
           'Forum thread'::text,
           'https://themanual.tech/forum/' || t.id::text,
           greatest(similarity(t.title, q), similarity(coalesce(t.body, ''), q))::real
      from forum_threads t
     where t.title ilike pat escape '\' or coalesce(t.body, '') ilike pat escape '\'
     order by 6 desc
     limit per )
  union all
  ( select 'event'::text, e.id::text, e.title,
           nullif(coalesce(e.location_text, ''), ''),
           'https://themanual.tech/events/' || e.id::text,
           greatest(similarity(e.title, q), similarity(coalesce(e.description, ''), q))::real
      from events e
     where e.title ilike pat escape '\' or coalesce(e.description, '') ilike pat escape '\'
     order by 6 desc
     limit per )
  union all
  ( select 'press'::text, p.id::text, coalesce(nullif(p.city, ''), p.slug),
           nullif(coalesce(p.region, ''), ''),
           'https://themanual.tech/press/' || p.slug,
           greatest(similarity(coalesce(p.city, ''), q), similarity(coalesce(p.slug, ''), q))::real
      from press_editions p
     where p.city ilike pat escape '\' or p.slug ilike pat escape '\'
        or coalesce(p.region, '') ilike pat escape '\'
     order by 6 desc
     limit per )
  union all
  ( select 'person'::text, b.id::text, coalesce(nullif(b.name, ''), b.handle),
           '@' || b.handle,
           'https://themanual.tech/@' || b.handle,
           greatest(similarity(coalesce(b.name, ''), q), similarity(coalesce(b.handle, ''), q))::real
      from bees b
     where b.handle ilike pat escape '\' or coalesce(b.name, '') ilike pat escape '\'
     order by 6 desc
     limit per )
  union all
  ( select 'bill'::text, bl.id, bl.title,
           nullif(coalesce(bl.short, ''), ''),
           'https://themanual.tech/bills/' || bl.id,
           greatest(similarity(bl.title, q), similarity(coalesce(bl.short, ''), q))::real
      from election_bills bl
     where bl.title ilike pat escape '\' or coalesce(bl.short, '') ilike pat escape '\'
     order by 6 desc
     limit per )
  order by rank desc nulls last, title asc
  limit (per * 8);
end;
$$;

-- Explicit grants (SQL_AUTONOMY: revoke from PUBLIC, grant named roles). The
-- function is safe for anon because RLS still gates every underlying read.
revoke all on function public.honeycomb_search(text, integer) from public;
grant execute on function public.honeycomb_search(text, integer) to anon, authenticated;

-- Ledger pairing (SQL_AUTONOMY step 3) is inserted at apply time as the final
-- statement so reconcile stays paired:
--   insert into supabase_migrations.schema_migrations (version, name)
--   values ('20260820193000', 'honeycomb_search_v1');
