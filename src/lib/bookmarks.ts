import { supabase } from './supabase';

// ═════════════════════════════════════════════════════════════════════
// BOOKMARKS — the Bee's whole shelf (entity_saves across every surface).
//
// entity_saves stores bare refs: (source_surface, source_id). This lib
// resolves each save to its entity (title + deep link) with ONE batched
// query per surface present on the shelf. Unsave = direct RLS delete —
// same convention as reactions.toggleSave (trg_drips_saved fires on the
// insert side). Unknown surfaces degrade honestly: raw ref, no dead link.
// ═════════════════════════════════════════════════════════════════════

export interface SavedItem {
  saveId: string;
  surface: string;
  sourceId: string;
  savedAt: string;
  /** Resolved entity title; falls back to a truncated ref when unresolved. */
  title: string;
  /** Deep link — null when the surface has no resolver or the row is gone. */
  url: string | null;
  resolved: boolean;
}

interface Resolver {
  table: string;
  select: string;
  title: (r: Record<string, unknown>) => string;
  url: (r: Record<string, unknown>) => string;
}

/** Per-surface entity resolvers (source_id → title + deep link). */
const RESOLVERS: Record<string, Resolver> = {
  intel: {
    table: 'forum_threads',
    select: 'id, title',
    title: (r) => String(r.title ?? ''),
    url: (r) => `/intel/t/${r.id}`,
  },
  unite: {
    table: 'groups',
    select: 'id, name, slug',
    title: (r) => String(r.name ?? ''),
    url: (r) => `/unite/${r.slug}`,
  },
  rule: {
    table: 'events',
    select: 'id, title',
    title: (r) => String(r.title ?? ''),
    url: (r) => `/rule/${r.id}`,
  },
  give: {
    table: 'give_campaigns',
    select: 'id, title, slug',
    title: (r) => String(r.title ?? ''),
    url: (r) => `/give/${r.slug}`,
  },
  pulse: {
    table: 'pulse_broadcasts',
    select: 'id, title',
    title: (r) => String(r.title ?? ''),
    url: (r) => `/pulse/watch/${r.id}`,
  },
  bazaar: {
    table: 'bazaar_listings',
    select: 'id, title',
    title: (r) => String(r.title ?? ''),
    url: (r) => `/bazaar/${r.id}`,
  },
};

const SHELF_CAP = 200;

/** The Bee's full shelf, newest save first, titles resolved per surface. */
export async function listMySaves(beeId: string): Promise<SavedItem[]> {
  if (!supabase || !beeId) return [];
  const sb = supabase;
  const { data, error } = await sb
    .from('entity_saves')
    .select('id, source_surface, source_id, created_at')
    .eq('bee_id', beeId)
    .order('created_at', { ascending: false })
    .limit(SHELF_CAP);
  if (error) throw new Error(error.message);

  const saves = (data ?? []).map((r) => ({
    saveId: String(r.id),
    surface: String(r.source_surface ?? ''),
    sourceId: String(r.source_id ?? ''),
    savedAt: String(r.created_at ?? ''),
  }));

  // One batched lookup per surface present on the shelf.
  const bySurface = new Map<string, string[]>();
  for (const s of saves) {
    const list = bySurface.get(s.surface) ?? [];
    list.push(s.sourceId);
    bySurface.set(s.surface, list);
  }

  const resolvedBySurface = new Map<string, Map<string, { title: string; url: string }>>();
  await Promise.all(
    Array.from(bySurface.entries()).map(async ([surface, ids]) => {
      const resolver = RESOLVERS[surface];
      if (!resolver) return;
      const { data: rows } = await sb.from(resolver.table).select(resolver.select).in('id', ids);
      const m = new Map<string, { title: string; url: string }>();
      // Dynamic select strings defeat supabase-js's row typing — go via unknown.
      for (const row of (rows ?? []) as unknown as Record<string, unknown>[]) {
        m.set(String(row.id), { title: resolver.title(row), url: resolver.url(row) });
      }
      resolvedBySurface.set(surface, m);
    }),
  );

  return saves.map((s) => {
    const hit = resolvedBySurface.get(s.surface)?.get(s.sourceId);
    return {
      ...s,
      title: hit?.title || `${s.surface || 'unknown'} · ${s.sourceId.slice(0, 8)}…`,
      url: hit?.url ?? null,
      resolved: Boolean(hit),
    };
  });
}

/** Remove one save by its entity_saves id (RLS: owner only). */
export async function unsaveById(saveId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('entity_saves').delete().eq('id', saveId);
  if (error) throw new Error(error.message);
}
