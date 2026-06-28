import { create } from 'zustand';
import { REALM_ID_BY_NAME } from '@/lib/constants';
import type { RealmId } from '@/types/manual';

/**
 * Platform-wide realm lens (dispatch Part B + full-depth narrowing).
 *
 * Picking a node in the global Top Top toolbar Realms popup sets this lens and
 * routes to the cross-Astra realm feed (/realm/:realmId). The feed narrows by
 * PREFIX on forum_threads.realm_path using `path` — the full drilled path of
 * display names (e.g. ['Justice','Courts','Appeals']). realmId is the slug of
 * path[0], kept for the route + realm color. `source` is the active Source chip
 * ('all' = full cross-Astra feed, else a parent_surface value).
 *
 * l2/l3 are conveniences for the breadcrumb (path[1]/path[2]); `path` is the
 * source of truth for feed narrowing.
 */
export type LensSource = 'all' | string;

/** One selected realm node in the multi-select set. key = pathParts.join('|'). */
export interface SelectedRealm {
  key: string;
  pathParts: string[];
  name: string;
}

const realmKey = (pathParts: string[]) => pathParts.join('|');

function toSelected(pathParts: string[]): SelectedRealm {
  return { key: realmKey(pathParts), pathParts, name: pathParts[pathParts.length - 1] ?? '' };
}

/** Derive the single-prefix lens fields (path/realmId/l2/l3) from a prefix. */
function deriveLens(prefix: string[]) {
  return {
    path: prefix,
    realmId: prefix[0] ? (REALM_ID_BY_NAME[prefix[0]] ?? null) : null,
    l2: prefix[1] ?? null,
    l3: prefix[2] ?? null,
  };
}

interface LensState {
  realmId: RealmId | null;
  /** Full drilled path of display names; path[0] = realm display name. */
  path: string[];
  l2: string | null;
  l3: string | null;
  source: LensSource;
  /**
   * Multi-select realm set (the chip bar). The single-prefix `path` above is
   * ALWAYS derived from the FIRST entry here (or [] when empty) so existing feed
   * consumers keep filtering by the primary selection — interim until the feed
   * RPCs accept a multi-prefix OR.
   */
  selectedRealms: SelectedRealm[];

  setLens: (realmId: RealmId | null, path: string[]) => void;
  /**
   * Facet-lens setter: the prefix IS `path` (display-name segments on
   * forum_threads.realm_path). realmId/l2/l3 are derived for color + breadcrumb
   * convenience. Empty prefix = all threads. SINGLE-select — replaces the
   * selection with this one node (used by atom clicks, breadcrumb, realm pages).
   */
  setPrefix: (prefix: string[]) => void;
  /** Toggle a node in/out of the multi-select set; derives `path` from the new first. */
  toggleRealm: (pathParts: string[]) => void;
  /** Remove one selected realm by key; derives `path` from the new first. */
  removeRealm: (key: string) => void;
  /** Clear the whole selection (all realms). */
  clearRealms: () => void;

  /**
   * Active/last Astra-local search term (cross-realm — ignores the realm
   * selection). '' = no active search; ≥2 chars drives the content-area results.
   * Persists when the lens-row input collapses (remembered for reopen); the
   * input's ✕ clears it back to the normal feed.
   */
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  clearSearch: () => void;

  setSource: (source: LensSource) => void;
  reset: () => void;
}

export const useLensStore = create<LensState>()((set) => ({
  realmId: null,
  path: [],
  l2: null,
  l3: null,
  source: 'all',
  selectedRealms: [],
  searchTerm: '',

  setLens: (realmId, path) =>
    set({
      realmId,
      path,
      l2: path[1] ?? null,
      l3: path[2] ?? null,
      selectedRealms: path.length ? [toSelected(path)] : [],
    }),
  setPrefix: (prefix) =>
    set({ ...deriveLens(prefix), selectedRealms: prefix.length ? [toSelected(prefix)] : [] }),
  toggleRealm: (pathParts) =>
    set((s) => {
      const key = realmKey(pathParts);
      const exists = s.selectedRealms.some((r) => r.key === key);
      const selectedRealms = exists
        ? s.selectedRealms.filter((r) => r.key !== key)
        : [...s.selectedRealms, toSelected(pathParts)];
      return { selectedRealms, ...deriveLens(selectedRealms[0]?.pathParts ?? []) };
    }),
  removeRealm: (key) =>
    set((s) => {
      const selectedRealms = s.selectedRealms.filter((r) => r.key !== key);
      return { selectedRealms, ...deriveLens(selectedRealms[0]?.pathParts ?? []) };
    }),
  clearRealms: () => set({ selectedRealms: [], ...deriveLens([]) }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  clearSearch: () => set({ searchTerm: '' }),
  setSource: (source) => set({ source }),
  reset: () =>
    set({
      realmId: null,
      path: [],
      l2: null,
      l3: null,
      source: 'all',
      selectedRealms: [],
      searchTerm: '',
    }),
}));
