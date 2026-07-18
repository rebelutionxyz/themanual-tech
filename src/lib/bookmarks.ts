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
  /** Realm id + display name + color when the entity carries one (bazaar doesn't). */
  realmId: string | null;
  realmName: string | null;
  realmColor: string | null;
  resolved: boolean;
}

interface Resolver {
  table: string;
  select: string;
  title: (r: Record<string, unknown>) => string;
  url: (r: Record<string, unknown>) => string;
  realm?: (r: Record<string, unknown>) => string | null;
}

/** primary_realm when set, else the realm_path root. */
function realmFromRow(r: Record<string, unknown>): string | null {
  const primary = r.primary_realm;
  if (typeof primary === 'string' && primary) return primary;
  const path = r.realm_path;
  if (Array.isArray(path) && path.length > 0 && typeof path[0] === 'string') return path[0];
  return null;
}

/** Per-surface entity resolvers (source_id → title + deep link + realm). */
const RESOLVERS: Record<string, Resolver> = {
  intel: {
    table: 'forum_threads',
    select: 'id, title, primary_realm, realm_path',
    title: (r) => String(r.title ?? ''),
    url: (r) => `/intel/t/${r.id}`,
    realm: realmFromRow,
  },
  unite: {
    table: 'groups',
    select: 'id, name, slug, realm_path',
    title: (r) => String(r.name ?? ''),
    url: (r) => `/unite/${r.slug}`,
    realm: realmFromRow,
  },
  rule: {
    table: 'events',
    select: 'id, title, realm_path',
    title: (r) => String(r.title ?? ''),
    url: (r) => `/rule/${r.id}`,
    realm: realmFromRow,
  },
  give: {
    table: 'give_campaigns',
    select: 'id, title, slug, realm_path',
    title: (r) => String(r.title ?? ''),
    url: (r) => `/give/${r.slug}`,
    realm: realmFromRow,
  },
  pulse: {
    table: 'pulse_broadcasts',
    select: 'id, title, primary_realm, realm_path',
    title: (r) => String(r.title ?? ''),
    url: (r) => `/pulse/watch/${r.id}`,
    realm: realmFromRow,
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

  const resolvedBySurface = new Map<
    string,
    Map<string, { title: string; url: string; realm: string | null }>
  >();
  await Promise.all(
    Array.from(bySurface.entries()).map(async ([surface, ids]) => {
      const resolver = RESOLVERS[surface];
      if (!resolver) return;
      const { data: rows } = await sb.from(resolver.table).select(resolver.select).in('id', ids);
      const m = new Map<string, { title: string; url: string; realm: string | null }>();
      // Dynamic select strings defeat supabase-js's row typing — go via unknown.
      for (const row of (rows ?? []) as unknown as Record<string, unknown>[]) {
        m.set(String(row.id), {
          title: resolver.title(row),
          url: resolver.url(row),
          realm: resolver.realm ? resolver.realm(row) : null,
        });
      }
      resolvedBySurface.set(surface, m);
    }),
  );

  // Resolve realm display names in one shot (realms is anon-readable).
  const realmIds = new Set<string>();
  for (const m of resolvedBySurface.values()) {
    for (const v of m.values()) if (v.realm) realmIds.add(v.realm);
  }
  const realmNames = new Map<string, string>();
  const realmColors = new Map<string, string | null>();
  if (realmIds.size > 0) {
    const { data: realmRows } = await sb
      .from('realms')
      .select('id, name, color')
      .in('id', Array.from(realmIds));
    for (const r of realmRows ?? []) {
      realmNames.set(String(r.id), String(r.name ?? r.id));
      realmColors.set(String(r.id), (r.color as string | null) ?? null);
    }
  }

  return saves.map((s) => {
    const hit = resolvedBySurface.get(s.surface)?.get(s.sourceId);
    const realmId = hit?.realm ?? null;
    return {
      ...s,
      title: hit?.title || `${s.surface || 'unknown'} · ${s.sourceId.slice(0, 8)}…`,
      url: hit?.url ?? null,
      realmId,
      realmName: realmId ? (realmNames.get(realmId) ?? realmId) : null,
      realmColor: realmId ? (realmColors.get(realmId) ?? null) : null,
      resolved: Boolean(hit),
    };
  });
}

/**
 * Count of the Bee's saves on ONE surface. The tail badge uses this so the
 * number previews what the Saved popup opens to (it defaults to the surface
 * the Bee is standing on) — a shelf-wide count next to a scoped view reads
 * as a bug (Butch, 2026-07-18).
 */
export async function countMySavesForSurface(beeId: string, surface: string): Promise<number> {
  if (!supabase || !beeId) return 0;
  const { count } = await supabase
    .from('entity_saves')
    .select('*', { count: 'exact', head: true })
    .eq('bee_id', beeId)
    .eq('source_surface', surface);
  return count ?? 0;
}

/** Remove one save by its entity_saves id (RLS: owner only). */
export async function unsaveById(saveId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('entity_saves').delete().eq('id', saveId);
  if (error) throw new Error(error.message);
}
