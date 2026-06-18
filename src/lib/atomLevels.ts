import { supabase } from './supabase';

/**
 * Lazy, per-level taxonomy access via the get_atom_level(parent_path) RPC.
 *
 * Replaces the unscoped all-atoms fetch (useManualData) for tree-drilling UI:
 * the toolbar pulls only the level it's showing — 13 realm roots up front, then
 * one node's direct children on expand. Light rows only. Cached per parent_path
 * so re-expanding never refetches (per-session, matching useManualData's cache
 * model; the live taxonomy edits land on next load).
 */
export interface AtomLevelRow {
  id: string;
  name: string;
  /** Display-name path, e.g. "Self / Mind and thought". '' for roots' parent. */
  path: string;
  type: string;
  isLeaf: boolean;
  depth: number;
}

interface RpcRow {
  id: string;
  name: string;
  path: string;
  type: string;
  is_leaf: boolean;
  depth: number;
}

// key: parent_path, or '' for the realm roots (no parent).
const levelCache = new Map<string, AtomLevelRow[]>();

/**
 * Direct children of `parentPath` (display-name path), or the 13 realm roots
 * when null. Cached per path.
 */
export async function getAtomLevel(parentPath: string | null): Promise<AtomLevelRow[]> {
  const key = parentPath ?? '';
  const cached = levelCache.get(key);
  if (cached) return cached;
  if (!supabase) return [];

  const { data, error } = parentPath
    ? await supabase.rpc('get_atom_level', { parent_path: parentPath })
    : await supabase.rpc('get_atom_level');

  if (error) {
    console.warn('[atomLevels] get_atom_level failed:', error.message);
    return [];
  }

  const rows: AtomLevelRow[] = ((data ?? []) as RpcRow[]).map((r) => ({
    id: r.id,
    name: r.name,
    path: r.path,
    type: r.type,
    isLeaf: r.is_leaf,
    depth: r.depth,
  }));
  levelCache.set(key, rows);
  return rows;
}

// Realm display order (realms.display_order) — the RPC returns roots
// alphabetically, so we re-sort to the locked DB order. Tiny (13 rows), cached.
let realmOrderNames: string[] | null = null;

/** Realm display names in display_order. */
export async function getRealmOrderNames(): Promise<string[]> {
  if (realmOrderNames) return realmOrderNames;
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('realms')
    .select('name, display_order')
    .order('display_order', { ascending: true });
  if (error) {
    console.warn('[atomLevels] realm order fetch failed:', error.message);
    return [];
  }
  realmOrderNames = (data ?? []).map((r) => (r as { name: string }).name);
  return realmOrderNames;
}
