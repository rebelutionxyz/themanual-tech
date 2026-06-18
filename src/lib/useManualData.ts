import { useEffect, useState } from 'react';
import type { Atom, AtomType, KettleState, RealmId, TreeNode } from '@/types/manual';
import { buildTree } from '@/lib/tree';
import { buildPathIndexes, type PathIndexes } from '@/lib/graph-neighbors';
import { supabase } from '@/lib/supabase';

interface ManualData {
  atoms: Atom[];
  tree: TreeNode;
  /** Realm slugs in display order (DB realms.display_order). */
  realmOrder: RealmId[];
  themeIndex: Record<string, string[]>;
  pathIndexes: PathIndexes;
  loaded: boolean;
  error: string | null;
}

let cache: ManualData | null = null;

const EMPTY_TREE: TreeNode = {
  name: 'ROOT',
  path: '',
  depth: 0,
  realmId: '',
  atoms: [],
  children: [],
  atomCount: 0,
};

interface RealmRow {
  id: string;
  display_order: number;
}

interface AtomRow {
  id: string;
  name: string;
  path: string;
  path_parts: string[];
  realm_id: string;
  realm_name: string;
  depth: number;
  type: string;
  kettle: string;
  is_leaf: boolean;
  theme_tags: string[] | null;
  realm_tags: string[] | null;
  astra_tags: string[] | null;
  skin_tags: string[] | null;
  geo: Record<string, unknown> | null;
  note: string | null;
  meta: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

function rowToAtom(r: AtomRow): Atom {
  return {
    id: r.id,
    name: r.name,
    path: r.path,
    pathParts: r.path_parts,
    realmId: r.realm_id as RealmId,
    realmName: r.realm_name,
    depth: r.depth,
    type: r.type as AtomType,
    kettle: r.kettle as KettleState,
    isLeaf: r.is_leaf,
    themeTags: r.theme_tags ?? [],
    realmTags: r.realm_tags ?? [],
    astraTags: r.astra_tags ?? [],
    skinTags: r.skin_tags ?? [],
    geo: r.geo,
    note: r.note,
    meta: r.meta ?? {},
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function buildThemeIndex(atoms: Atom[]): Record<string, string[]> {
  const idx: Record<string, string[]> = {};
  for (const a of atoms) {
    for (const tag of a.themeTags) {
      idx[tag] ??= [];
      idx[tag].push(a.id);
    }
  }
  return idx;
}

/**
 * Loads atoms from Supabase once, caches globally.
 *
 * Supabase enforces a 1000-row default limit per request — we page through
 * with .range() to pull all atoms (count grows with Bee contributions).
 */
export function useManualData(): ManualData {
  const [state, setState] = useState<ManualData>(
    cache ?? {
      atoms: [],
      tree: EMPTY_TREE,
      realmOrder: [],
      themeIndex: {},
      pathIndexes: { byId: new Map(), byPath: new Map(), childrenByPath: new Map() },
      loaded: false,
      error: null,
    },
  );

  useEffect(() => {
    if (cache) return;
    let cancelled = false;

    (async () => {
      try {
        if (!supabase) throw new Error('Supabase not configured');

        const PAGE = 1000;
        const all: AtomRow[] = [];
        for (let from = 0; ; from += PAGE) {
          const { data, error } = await supabase
            .from('atoms')
            .select('*')
            .order('id')
            .range(from, from + PAGE - 1);
          if (error) throw error;
          if (!data || data.length === 0) break;
          all.push(...(data as AtomRow[]));
          if (data.length < PAGE) break;
        }

        // Realm display order is DB-driven (realms.display_order) so the nav
        // tracks live taxonomy restructuring without a hardcoded array.
        const { data: realmRows, error: realmErr } = await supabase
          .from('realms')
          .select('id, display_order')
          .order('display_order', { ascending: true });
        if (realmErr) throw realmErr;
        const realmOrder = ((realmRows ?? []) as RealmRow[]).map((r) => r.id as RealmId);

        const atoms = all.map(rowToAtom);
        // Fallback: if the realms table is unreachable/empty, derive order from
        // the atoms' realm roots (first-seen) so the tree still sorts sanely.
        if (realmOrder.length === 0) {
          const seen = new Set<RealmId>();
          for (const a of atoms) {
            if (!seen.has(a.realmId)) {
              seen.add(a.realmId);
              realmOrder.push(a.realmId);
            }
          }
        }
        if (import.meta.env.DEV) {
          const bad = atoms.find((a) => a.path !== a.pathParts.join(' / '));
          if (bad) {
            console.error(
              '[Manual] path invariant violated — childrenByPath/byPath joins will silently fail:',
              bad.id,
              JSON.stringify(bad.path),
              '!==',
              JSON.stringify(bad.pathParts.join(' / ')),
            );
          }
        }
        const themeIndex = buildThemeIndex(atoms);
        const tree = buildTree(atoms, realmOrder);
        const pathIndexes = buildPathIndexes(atoms);

        const data: ManualData = {
          atoms,
          tree,
          realmOrder,
          themeIndex,
          pathIndexes,
          loaded: true,
          error: null,
        };
        cache = data;
        if (!cancelled) setState(data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) setState((s) => ({ ...s, error: msg }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/** Find atom by ID from cache */
export function getAtomById(id: string): Atom | undefined {
  return cache?.atoms.find((a) => a.id === id);
}

/** Find atoms that share any theme tag with the given atom (excluding self) */
export function getRelatedAtoms(atomId: string, maxResults = 40): Atom[] {
  if (!cache) return [];
  const atom = cache.atoms.find((a) => a.id === atomId);
  if (!atom) return [];

  const related = new Map<string, { atom: Atom; shared: number }>();

  for (const tag of atom.themeTags) {
    const ids = cache.themeIndex[tag] ?? [];
    for (const id of ids) {
      if (id === atomId) continue;
      const other = cache.atoms.find((a) => a.id === id);
      if (!other) continue;
      const existing = related.get(id);
      if (existing) existing.shared += 1;
      else related.set(id, { atom: other, shared: 1 });
    }
  }

  return Array.from(related.values())
    .sort((a, b) => b.shared - a.shared)
    .slice(0, maxResults)
    .map((x) => x.atom);
}