import { create } from 'zustand';
import type { RealmId } from '@/types/manual';

/**
 * PULSE / Freedom Network UI state.
 *
 * v1 only needs the realm filter that drives `realm_prefix` for the
 * live-now + library queries. Parallel to useIntelStore but intentionally
 * minimal — FN filters at realm level only (single-element prefix).
 */
interface PulseState {
  selectedRealmId: RealmId | null;
  setRealmId: (realmId: RealmId | null) => void;
  reset: () => void;
}

export const usePulseStore = create<PulseState>()((set) => ({
  selectedRealmId: null,
  setRealmId: (realmId) => set({ selectedRealmId: realmId }),
  reset: () => set({ selectedRealmId: null }),
}));
