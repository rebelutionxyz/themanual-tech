import { supabase } from './supabase';

/**
 * The realm taxonomy tree behind the White Rabbit slider.
 *
 * `public.realm_tree()` returns a FLAT list of nodes (no args); we build the
 * tree client-side from `pathParts`. v1 is 3 levels: ALL L1 realms (depth 1) +
 * ALL L2 (depth 2) + only the L3 nodes (depth 3) that have content posted
 * at/below them (content-filtered — most L2s therefore have no children yet,
 * which is correct, not a bug).
 */

export interface RealmTreeRow {
  id: string;
  name: string;
  depth: number;
  path: string;
  /** Display-name segments, root-first. A node's parent has pathParts minus the last. */
  pathParts: string[];
  realmId: string;
  realmName: string;
  isLeaf: boolean;
}

export interface RealmTreeNode extends RealmTreeRow {
  children: RealmTreeNode[];
}

type Row = Record<string, unknown>;

function mapRow(r: Row): RealmTreeRow {
  return {
    id: String(r.id),
    name: String(r.name),
    depth: Number(r.depth),
    path: r.path == null ? '' : String(r.path),
    pathParts: Array.isArray(r.path_parts) ? r.path_parts.map(String) : [],
    realmId: r.realm_id == null ? '' : String(r.realm_id),
    realmName: r.realm_name == null ? '' : String(r.realm_name),
    isLeaf: r.is_leaf === true,
  };
}

/** Fetch the flat node list from the RPC. */
export async function fetchRealmTree(): Promise<RealmTreeRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('realm_tree');
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map(mapRow);
}

const keyOf = (parts: string[]) => JSON.stringify(parts);

/**
 * Build the nested tree from the flat rows. Parent = the node whose pathParts
 * equals this node's pathParts minus its last element; roots = depth 1. A node
 * is expandable iff `children.length > 0` (i.e. children are actually PRESENT in
 * the result) — computed from the data, never from `is_leaf`.
 */
export function buildRealmTree(rows: RealmTreeRow[]): RealmTreeNode[] {
  const nodes: RealmTreeNode[] = rows.map((r) => ({ ...r, children: [] }));
  const byKey = new Map<string, RealmTreeNode>();
  for (const n of nodes) byKey.set(keyOf(n.pathParts), n);

  const roots: RealmTreeNode[] = [];
  for (const n of nodes) {
    if (n.depth <= 1) {
      roots.push(n);
      continue;
    }
    const parent = byKey.get(keyOf(n.pathParts.slice(0, -1)));
    if (parent) parent.children.push(n);
    else roots.push(n); // orphan fallback (shouldn't happen for a well-formed tree)
  }
  return roots;
}
