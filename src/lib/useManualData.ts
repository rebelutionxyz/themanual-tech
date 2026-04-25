import { useEffect, useState } from 'react';
import type { Atom, AtomType, KettleState, RealmId, TreeNode } from '@/types/manual';
import { buildTree } from '@/lib/tree';
import { supabase } from '@/lib/supabase';

interface ManualData {
  atoms: Atom[];
  tree: TreeNode;
  themeIndex: Record<string, string[]>;
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
  pillar_tags: string[] | null;
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
    pillarTags: r.pillar_tags ?? [],
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
      (idx[tag] ??= []).push(a.id);
    }
  }
  return idx;
}

/**
 * Loads atoms from Supabase once, caches globally.
 *
 * Supabase enforces a 1000-row default limit per request — we page through
 * with .range() to pull all 4,860 atoms.
 */
export function useManualData(): ManualData {
  const [state, setState] = useState<ManualData>(
    cache ?? {
      atoms: [],
      tree: EMPTY_TREE,
      themeIndex: {},
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

        const atoms = all.map(rowToAtom);
        const themeIndex = buildThemeIndex(atoms);
        const tree = buildTree(atoms);

        const data: ManualData = {
          atoms,
          tree,
          themeIndex,
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
