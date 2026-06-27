import type { IntelView } from '@/components/intel/IntelSidebar';
import type { FeedSort } from '@/lib/forumFeed';
import type { RealmId } from '@/types/manual';
import { create } from 'zustand';

/** Time window options in hours. 0 = All-time */
export type TimeWindow = 1 | 4 | 12 | 24 | 48 | 72 | 0;

interface IntelState {
  selectedRealmId: RealmId | null;
  selectedL2: string | null;
  selectedL3: string | null;
  activeView: IntelView;

  /**
   * INTEL feed sort, driven by the top toolbar's Time lens (pass 13):
   *   'new' = Breaking · 'trending' = Trending · 'top' = Top / all-time.
   * Routed straight into forum_thread_feed via ThreadList's feed path.
   */
  feedSort: FeedSort;

  /** Time window for Hot view (default 24h) */
  hotWindow: TimeWindow;
  /** Time window for Breaking view (default 12h) */
  breakingWindow: TimeWindow;

  setRealmId: (realmId: RealmId | null) => void;
  setL2: (l2: string | null) => void;
  setL3: (l3: string | null) => void;
  setActiveView: (view: IntelView) => void;
  setFeedSort: (sort: FeedSort) => void;
  setHotWindow: (hours: TimeWindow) => void;
  setBreakingWindow: (hours: TimeWindow) => void;

  reset: () => void;
}

export const useIntelStore = create<IntelState>()((set) => ({
  selectedRealmId: null,
  selectedL2: null,
  selectedL3: null,
  activeView: 'home',
  feedSort: 'trending',
  hotWindow: 24,
  breakingWindow: 12,

  setRealmId: (realmId) =>
    set({
      selectedRealmId: realmId,
      selectedL2: null,
      selectedL3: null,
    }),
  setL2: (l2) =>
    set({
      selectedL2: l2,
      selectedL3: null,
    }),
  setL3: (l3) => set({ selectedL3: l3 }),
  setActiveView: (view) => set({ activeView: view }),
  setFeedSort: (sort) => set({ feedSort: sort }),
  setHotWindow: (hours) => set({ hotWindow: hours }),
  setBreakingWindow: (hours) => set({ breakingWindow: hours }),

  reset: () =>
    set({
      selectedRealmId: null,
      selectedL2: null,
      selectedL3: null,
      activeView: 'home',
      feedSort: 'trending',
      hotWindow: 24,
      breakingWindow: 12,
    }),
}));
