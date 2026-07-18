import { supabase } from './supabase';

// ═════════════════════════════════════════════════════════════════════
// QUICK SEARCH — powers the top-toolbar Search dropdown (results render
// INSIDE the dropdown; picking one jumps to it). One batched title query
// per surface, merged. Same resolver spirit as lib/bookmarks.
// ═════════════════════════════════════════════════════════════════════

export interface QuickHit {
  surface: string;
  title: string;
  url: string;
}

interface Source {
  surface: string;
  table: string;
  select: string;
  titleCol: string;
  toUrl: (r: Record<string, unknown>) => string;
}

const SOURCES: Source[] = [
  {
    surface: 'intel',
    table: 'forum_threads',
    select: 'id, title',
    titleCol: 'title',
    toUrl: (r) => `/intel/t/${r.id}`,
  },
  {
    surface: 'unite',
    table: 'groups',
    select: 'id, name, slug',
    titleCol: 'name',
    toUrl: (r) => `/unite/${r.slug}`,
  },
  {
    surface: 'rule',
    table: 'events',
    select: 'id, title',
    titleCol: 'title',
    toUrl: (r) => `/rule/${r.id}`,
  },
  {
    surface: 'give',
    table: 'give_campaigns',
    select: 'id, title, slug',
    titleCol: 'title',
    toUrl: (r) => `/give/${r.slug}`,
  },
  {
    surface: 'pulse',
    table: 'pulse_broadcasts',
    select: 'id, title',
    titleCol: 'title',
    toUrl: (r) => `/pulse/watch/${r.id}`,
  },
  {
    surface: 'bazaar',
    table: 'bazaar_listings',
    select: 'id, title',
    titleCol: 'title',
    toUrl: (r) => `/bazaar/${r.id}`,
  },
];

/**
 * Title search across every community surface (RLS scopes visibility).
 * Returns up to `perSurface` hits per surface, in SOURCES order — the
 * panel re-sorts the standing surface to the top.
 */
export async function quickSearch(term: string, perSurface = 5): Promise<QuickHit[]> {
  const q = term.trim();
  if (!supabase || q.length < 2) return [];
  const sb = supabase;
  // Escape PostgREST ilike wildcards so a literal % / _ in the term matches itself.
  const like = `%${q.replace(/([%_])/g, '\\$1')}%`;

  const groups = await Promise.all(
    SOURCES.map(async (src) => {
      try {
        const { data } = await sb
          .from(src.table)
          .select(src.select)
          .ilike(src.titleCol, like)
          .limit(perSurface);
        return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
          surface: src.surface,
          title: String(r[src.titleCol] ?? ''),
          url: src.toUrl(r),
        }));
      } catch {
        return [] as QuickHit[];
      }
    }),
  );
  return groups.flat();
}
