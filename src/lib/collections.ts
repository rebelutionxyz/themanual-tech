import { supabase } from '@/lib/supabase';
import { type AtomRow, rowToAtom } from '@/lib/useManualData';
import type { AtomCollection, AtomCollectionEntry } from '@/types/manual';

/**
 * Connector collections (atom_collections + atom_collection_members).
 *
 * Collections are a separate browse surface, not part of the global atom
 * cache, so they fetch on-demand per page. Read-only and live-gated by RLS;
 * Chat/MCP seeds all rows. Empty until seeded — pages render an empty state.
 */

interface CollectionRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: string;
}

interface MemberRow {
  ordinal: number | null;
  note: string | null;
  atom: AtomRow | null;
}

function rowToCollection(c: CollectionRow): AtomCollection {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    status: c.status,
  };
}

/** All live collections, alphabetical by name. */
export async function fetchCollections(): Promise<AtomCollection[]> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('atom_collections')
    .select('id, slug, name, description, status')
    .order('name', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as CollectionRow[]).map(rowToCollection);
}

/**
 * A single collection by slug plus its gathered atoms ordered by ordinal
 * (null ordinals last). Returns null if no live collection matches the slug.
 */
export async function fetchCollectionBySlug(
  slug: string,
): Promise<{ collection: AtomCollection; entries: AtomCollectionEntry[] } | null> {
  if (!supabase) throw new Error('Supabase not configured');

  const { data: cData, error: cErr } = await supabase
    .from('atom_collections')
    .select('id, slug, name, description, status')
    .eq('slug', slug)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!cData) return null;
  const collection = rowToCollection(cData as CollectionRow);

  const { data: mData, error: mErr } = await supabase
    .from('atom_collection_members')
    .select('ordinal, note, atom:atoms(*)')
    .eq('collection_id', collection.id)
    .order('ordinal', { ascending: true, nullsFirst: false });
  if (mErr) throw mErr;

  const entries: AtomCollectionEntry[] = ((mData ?? []) as unknown as MemberRow[])
    .filter((m) => m.atom != null)
    .map((m) => ({
      atom: rowToAtom(m.atom as AtomRow),
      ordinal: m.ordinal,
      note: m.note,
    }));

  return { collection, entries };
}
