import { useEffect, useState } from 'react';
import type { Atom, TreeNode } from '@/types/manual';
import { buildTree } from '@/lib/tree';

interface ManualData {
  atoms: Atom[];
  tree: TreeNode;
  themeIndex: Record<string, string[]>;
  loaded: boolean;
  error: string | null;
}

let cache: ManualData | null = null;

/**
 * Loads atoms.json + theme_index.json once, caches globally.
 */
export function useManualData(): ManualData {
  const [state, setState] = useState<ManualData>(
    cache ?? {
      atoms: [],
      tree: {
        name: 'ROOT',
        path: '',
        depth: 0,
        realm: '',
        atoms: [],
        children: [],
        atomCount: 0,
      },
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
        const [atomsRes, tagsRes] = await Promise.all([
          fetch('/atoms.json'),
          fetch('/theme_index.json'),
        ]);
        if (!atomsRes.ok) throw new Error(`atoms.json: ${atomsRes.status}`);
        if (!tagsRes.ok) throw new Error(`theme_index.json: ${tagsRes.status}`);
        const atoms: Atom[] = await atomsRes.json();
        const themeIndex: Record<string, string[]> = await tagsRes.json();
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
