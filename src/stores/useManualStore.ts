import { create } from 'zustand';
import type { AtomType, KettleState, ViewMode } from '@/types/manual';

interface ManualState {
  view: ViewMode;
  searchQuery: string;
  selectedRealm: string | null;
  selectedKettle: KettleState | null;
  selectedType: AtomType | 'all';
  selectedTags: string[];
  selectedAtomId: string | null;
  expandedPaths: Set<string>;

  setView: (view: ViewMode) => void;
  setSearchQuery: (q: string) => void;
  setSelectedRealm: (r: string | null) => void;
  setSelectedKettle: (k: KettleState | null) => void;
  setSelectedType: (t: AtomType | 'all') => void;
  toggleTag: (tag: string) => void;
  clearTags: () => void;
  selectAtom: (id: string | null) => void;
  toggleExpanded: (path: string) => void;
  expandPath: (path: string) => void;
  collapseAll: () => void;
  clearFilters: () => void;
}

export const useManualStore = create<ManualState>((set) => ({
  view: 'outlook',
  searchQuery: '',
  selectedRealm: null,
  selectedKettle: null,
  selectedType: 'all',
  selectedTags: [],
  selectedAtomId: null,
  expandedPaths: new Set<string>(),

  setView: (view) => set({ view }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedRealm: (selectedRealm) => set({ selectedRealm }),
  setSelectedKettle: (selectedKettle) => set({ selectedKettle }),
  setSelectedType: (selectedType) => set({ selectedType }),
  toggleTag: (tag) =>
    set((s) => ({
      selectedTags: s.selectedTags.includes(tag)
        ? s.selectedTags.filter((t) => t !== tag)
        : [...s.selectedTags, tag],
    })),
  clearTags: () => set({ selectedTags: [] }),
  selectAtom: (selectedAtomId) => set({ selectedAtomId }),
  toggleExpanded: (path) =>
    set((s) => {
      const next = new Set(s.expandedPaths);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return { expandedPaths: next };
    }),
  expandPath: (path) =>
    set((s) => {
      const next = new Set(s.expandedPaths);
      // Expand this path and all ancestors
      const parts = path.split(' / ');
      for (let i = 1; i <= parts.length; i++) {
        next.add(parts.slice(0, i).join(' / '));
      }
      return { expandedPaths: next };
    }),
  collapseAll: () => set({ expandedPaths: new Set() }),
  clearFilters: () =>
    set({
      searchQuery: '',
      selectedKettle: null,
      selectedType: 'all',
      selectedTags: [],
    }),
}));
