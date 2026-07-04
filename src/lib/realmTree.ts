import { supabase } from './supabase';

/**
 * The realm taxonomy behind the White Rabbit slider — browsed ONE LEVEL AT A
 * TIME (lazy). `public.realm_children(p_parent_path text[])` returns the DIRECT
 * children of a node from the FULL taxonomy ([] / omit = the root realms). A
 * node is expandable iff NOT `isLeaf` (full taxonomy, so is_leaf is
 * authoritative — unlike the old content-filtered whole-tree RPC).
 */

export interface RealmTreeRow {
  id: string;
  name: string;
  depth: number;
  path: string;
  /** Display-name segments, root-first. Pass these as the parent path to drill. */
  pathParts: string[];
  realmId: string;
  realmName: string;
  isLeaf: boolean;
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

/** Fetch the DIRECT children of a node (one level). `[]` / omit = root realms. */
export async function fetchRealmChildren(parentPathParts: string[] = []): Promise<RealmTreeRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('realm_children', {
    p_parent_path: parentPathParts,
  });
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map(mapRow);
}
