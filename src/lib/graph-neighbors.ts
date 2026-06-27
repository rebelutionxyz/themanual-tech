import type { Atom } from '@/types/manual';

export type EdgeType = 'parent' | 'child' | 'sibling' | 'tag';

export interface GraphEdge {
  source: string;
  target: string;
  type: EdgeType;
  strength: number; // structural > tag; used for link width/opacity
}

export interface PathIndexes {
  byId: Map<string, Atom>;
  byPath: Map<string, Atom>;
  childrenByPath: Map<string, Atom[]>; // direct children keyed by PARENT path
}

export interface NeighborResult {
  centerKey: string | null;
  centerLabel: string;
  neighborIds: Set<string>; // excludes center
  edges: GraphEdge[];
}

const STRENGTH: Record<EdgeType, number> = { parent: 3, child: 3, sibling: 2, tag: 1 };
const parentPathOf = (a: Atom): string | null =>
  a.pathParts.length > 1 ? a.pathParts.slice(0, -1).join(' / ') : null;

export function buildPathIndexes(atoms: Atom[]): PathIndexes {
  const byId = new Map<string, Atom>();
  const byPath = new Map<string, Atom>();
  const childrenByPath = new Map<string, Atom[]>();
  for (const a of atoms) {
    byId.set(a.id, a);
    byPath.set(a.path, a);
  }
  for (const a of atoms) {
    const pp = parentPathOf(a);
    if (pp == null) continue;
    const arr = childrenByPath.get(pp);
    if (arr) arr.push(a);
    else childrenByPath.set(pp, [a]);
  }
  return { byId, byPath, childrenByPath };
}

/**
 * Build a bounded neighborhood around a center.
 * Center = an atom (by id) OR a category/realm path.
 *  - Leaf/atom center: parent + siblings + children (1-hop), then grandparent (2-hop), capped.
 *  - Category/realm center (has children): direct children (first ring) + grandchildren, capped.
 * Theme-tag co-members are added as an ADDITIVE overlay (capped) — sparse today, enriches post-Route-B.
 */
export function getNeighbors(
  center: { atomId?: string; path?: string },
  idx: PathIndexes,
  themeIndex: Record<string, string[]>,
  opts: { hops?: number; cap?: number } = {},
): NeighborResult {
  const cap = opts.cap ?? 28;
  const hops = opts.hops ?? 2;
  const centerAtom = center.atomId
    ? idx.byId.get(center.atomId)
    : center.path
      ? idx.byPath.get(center.path)
      : undefined;
  const centerPath = centerAtom?.path ?? center.path ?? null;
  if (!centerPath) return { centerKey: null, centerLabel: '', neighborIds: new Set(), edges: [] };

  const centerKey = centerAtom?.id ?? centerPath;
  const centerLabel = centerAtom?.name ?? centerPath.split(' / ').pop() ?? centerPath;
  const ids = new Set<string>();
  const edges: GraphEdge[] = [];

  const add = (t: Atom, type: EdgeType, source = centerKey) => {
    if (t.id === centerKey || ids.has(t.id) || ids.size >= cap) return;
    ids.add(t.id);
    edges.push({ source, target: t.id, type, strength: STRENGTH[type] });
  };

  const children = idx.childrenByPath.get(centerPath) ?? [];
  const isCategory = children.length > 0 && (!centerAtom || !centerAtom.isLeaf);

  if (isCategory) {
    for (const c of children) add(c, 'child');
    for (const c of children) {
      for (const gc of idx.childrenByPath.get(c.path) ?? []) add(gc, 'child', c.id);
    }
  } else if (centerAtom) {
    const ppath = parentPathOf(centerAtom);
    const parent = ppath ? idx.byPath.get(ppath) : undefined;
    if (parent) {
      ids.add(parent.id);
      edges.push({ source: parent.id, target: centerKey, type: 'parent', strength: STRENGTH.parent });
    }
    for (const c of idx.childrenByPath.get(centerAtom.path) ?? []) add(c, 'child');
    if (ppath) {
      for (const sib of idx.childrenByPath.get(ppath) ?? []) {
        if (sib.id !== centerAtom.id) add(sib, 'sibling', parent?.id ?? centerKey);
      }
    }
    if (hops >= 2 && parent) {
      const gpath = parentPathOf(parent);
      const gp = gpath ? idx.byPath.get(gpath) : undefined;
      if (gp && !ids.has(gp.id) && ids.size < cap) {
        ids.add(gp.id);
        edges.push({ source: gp.id, target: parent.id, type: 'parent', strength: STRENGTH.parent });
      }
    }
  }

  // Additive theme-tag overlay (capped) — only when center is an atom carrying tags.
  if (centerAtom?.themeTags?.length) {
    const TAG_CAP = 6;
    let added = 0;
    for (const tag of centerAtom.themeTags) {
      for (const oid of themeIndex[tag] ?? []) {
        if (added >= TAG_CAP || ids.size >= cap) break;
        if (oid === centerAtom.id || ids.has(oid)) continue;
        const o = idx.byId.get(oid);
        if (!o) continue;
        ids.add(oid);
        added++;
        edges.push({ source: centerKey, target: oid, type: 'tag', strength: STRENGTH.tag });
      }
    }
  }

  return { centerKey, centerLabel, neighborIds: ids, edges };
}
