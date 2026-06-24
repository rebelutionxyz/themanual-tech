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

interface LensState {
  realmId: RealmId | null;
  /** Full drilled path of display names; path[0] = realm display name. */
  path: string[];
  l2: string | null;
  l3: string | null;
  source: LensSource;

  setLens: (realmId: RealmId | null, path: string[]) => void;
  /**
   * Facet-lens setter: the prefix IS `path` (display-name segments on
   * forum_threads.realm_path). realmId/l2/l3 are derived for color + breadcrumb
   * convenience. Empty prefix = all threads. Used by the facet RealmTreeSidebar,
   * the INTEL breadcrumb, and the realm_path-contains thread list.
   */
  setPrefix: (prefix: string[]) => void;
  setSource: (source: LensSource) => void;
  reset: () => void;
}

export const useLensStore = create<LensState>()((set) => ({
  realmId: null,
  path: [],
  l2: null,
  l3: null,
  source: 'all',

  setLens: (realmId, path) =>
    set({ realmId, path, l2: path[1] ?? null, l3: path[2] ?? null }),
  setPrefix: (prefix) =>
    set({
      realmId: prefix[0] ? (REALM_ID_BY_NAME[prefix[0]] ?? null) : null,
      path: prefix,
      l2: prefix[1] ?? null,
      l3: prefix[2] ?? null,
    }),
  setSource: (source) => set({ source }),
  reset: () => set({ realmId: null, path: [], l2: null, l3: null, source: 'all' }),
}));
