import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

/**
 * Live astra_registry loader (durable source for the INTEL Astras grid + the
 * realm → Astra jump). Replaces the static frontend surface list.
 *
 * RLS note: `astra_registry` SELECT is authenticated-only, so anon Bees get an
 * empty registry (the grid renders a sign-in empty state). `realms` is
 * anon-readable, so the realm → astra_slug map loads for everyone — but the
 * resolved Astra row (name/status) is null for anon.
 */

export type AstraStatus = 'active' | 'archived' | 'off_grid';

export interface AstraRow {
  /** astra_registry.id (uuid) — scope filters match notifications.astra_id etc. */
  id: string;
  slug: string;
  /** Canonical/function name (e.g. "Forum", "Legal"). Grid label. */
  defaultName: string;
  /** Branded display name (e.g. "AtlasINTEL", "AtlasADVOCATE"). */
  displayName: string;
  domain: string | null;
  status: AstraStatus;
  gridGroup: string | null;
  showInGrid: boolean;
  /** If set, the grid item links to this target slug's surface, not its own. */
  linkRedirectSlug: string | null;
}

export interface AstraGridGroup {
  group: string;
  astras: AstraRow[];
}

interface AstraRegistryData {
  rows: AstraRow[];
  bySlug: Map<string, AstraRow>;
  gridGroups: AstraGridGroup[];
  /** realmId → astra_slug (soft ref from realms.astra_slug; null when unset). */
  realmAstraSlug: Record<string, string | null>;
  loaded: boolean;
  error: string | null;
}

// Group ordering for the grid. astra_grid_group is set for every show_in_grid
// row in prod, so we group purely from the DB value (no frontend fallback).
// Order: Community, then Services. Unknown groups sort last.
const GROUP_ORDER = ['Community', 'Services'];

interface AstraRegistryRow {
  id: string;
  slug: string;
  default_name: string | null;
  display_name: string;
  domain: string | null;
  status: AstraStatus;
  astra_grid_group: string | null;
  show_in_grid: boolean;
  link_redirect_slug: string | null;
}

interface RealmAstraRow {
  id: string;
  astra_slug: string | null;
}

let cache: AstraRegistryData | null = null;

const EMPTY: AstraRegistryData = {
  rows: [],
  bySlug: new Map(),
  gridGroups: [],
  realmAstraSlug: {},
  loaded: false,
  error: null,
};

function buildGridGroups(rows: AstraRow[]): AstraGridGroup[] {
  const buckets = new Map<string, AstraRow[]>();
  for (const r of rows) {
    if (!r.showInGrid) continue;
    const group = r.gridGroup || 'Other';
    const list = buckets.get(group) ?? [];
    list.push(r);
    buckets.set(group, list);
  }
  const orderOf = (g: string) => {
    const i = GROUP_ORDER.indexOf(g);
    return i === -1 ? GROUP_ORDER.length : i;
  };
  return Array.from(buckets.entries())
    .map(([group, astras]) => ({
      group,
      astras: astras.sort((a, b) => a.defaultName.localeCompare(b.defaultName)),
    }))
    .sort((a, b) => orderOf(a.group) - orderOf(b.group) || a.group.localeCompare(b.group));
}

export function useAstraRegistry(): AstraRegistryData {
  const [state, setState] = useState<AstraRegistryData>(cache ?? EMPTY);

  useEffect(() => {
    if (cache) return;
    let cancelled = false;

    (async () => {
      if (!supabase) {
        if (!cancelled) setState({ ...EMPTY, loaded: true });
        return;
      }
      try {
        const [astraRes, realmRes] = await Promise.all([
          supabase
            .from('astra_registry')
            .select(
              'id,slug,default_name,display_name,domain,status,astra_grid_group,show_in_grid,link_redirect_slug',
            ),
          supabase.from('realms').select('id,astra_slug'),
        ]);
        if (astraRes.error) throw astraRes.error;
        if (realmRes.error) throw realmRes.error;

        const rows: AstraRow[] = ((astraRes.data ?? []) as AstraRegistryRow[]).map((r) => ({
          id: r.id,
          slug: r.slug,
          defaultName: r.default_name ?? r.display_name,
          displayName: r.display_name,
          domain: r.domain,
          status: r.status,
          gridGroup: r.astra_grid_group,
          showInGrid: r.show_in_grid,
          linkRedirectSlug: r.link_redirect_slug,
        }));

        const realmAstraSlug: Record<string, string | null> = {};
        for (const r of (realmRes.data ?? []) as RealmAstraRow[]) {
          realmAstraSlug[r.id] = r.astra_slug;
        }

        const data: AstraRegistryData = {
          rows,
          bySlug: new Map(rows.map((r) => [r.slug, r])),
          gridGroups: buildGridGroups(rows),
          realmAstraSlug,
          loaded: true,
          error: null,
        };
        cache = data;
        if (!cancelled) setState(data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) setState({ ...EMPTY, loaded: true, error: msg });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
