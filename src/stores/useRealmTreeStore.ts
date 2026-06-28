import { create } from 'zustand';

/**
 * Open/close state for the right-column realm-tree slider (the White Rabbit).
 * Shared between the toolbar rabbit button (LensRow) and the slider itself
 * (CommunityShell), so neither has to prop-drill through the shell.
 */
interface RealmTreeState {
  open: boolean;
  toggle: () => void;
  close: () => void;
}

export const useRealmTreeStore = create<RealmTreeState>()((set) => ({
  open: false,
  toggle: () => set((s) => ({ open: !s.open })),
  close: () => set({ open: false }),
}));
