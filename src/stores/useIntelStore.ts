import { create } from 'zustand';
import type { Front } from '@/types/manual';
import type { IntelView } from '@/components/intel/IntelSidebar';

interface IntelState {
  selectedRealm: string | null;
  selectedFront: Front | null;
  selectedL2: string | null;
  selectedL3: string | null;
  activeView: IntelView;

  setRealm: (realm: string | null) => void;
  setFront: (front: Front | null) => void;
  setL2: (l2: string | null) => void;
  setL3: (l3: string | null) => void;
  setActiveView: (view: IntelView) => void;

  reset: () => void;
}

export const useIntelStore = create<IntelState>()((set) => ({
  selectedRealm: null,
  selectedFront: null,
  selectedL2: null,
  selectedL3: null,
  activeView: 'home',

  setRealm: (realm) =>
    set({
      selectedRealm: realm,
      selectedFront: null,
      selectedL2: null,
      selectedL3: null,
    }),
  setFront: (front) =>
    set({
      selectedFront: front,
      selectedL2: null,
      selectedL3: null,
    }),
  setL2: (l2) =>
    set({
      selectedL2: l2,
      selectedFront: null, // Front and L2 are sibling alternatives under a realm, mutex
      selectedL3: null,
    }),
  setL3: (l3) => set({ selectedL3: l3 }),
  setActiveView: (view) => set({ activeView: view }),

  reset: () =>
    set({
      selectedRealm: null,
      selectedFront: null,
      selectedL2: null,
      selectedL3: null,
      activeView: 'home',
    }),
}));
