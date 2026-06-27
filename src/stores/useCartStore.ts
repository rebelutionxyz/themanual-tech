import { create } from 'zustand';

/**
 * Minimal cart-count store. The conditional cart icon in the top toolbar
 * renders off `count` — hidden at 0, floating left of the lens row at ≥1.
 * Bazaar / atlasADs / Give checkout flows push into this once they land; for
 * now it's the single source the shell reads so the icon wiring is in place.
 */
interface CartState {
  count: number;
  setCount: (n: number) => void;
  add: (n?: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()((set) => ({
  count: 0,
  setCount: (count) => set({ count: Math.max(0, count) }),
  add: (n = 1) => set((s) => ({ count: Math.max(0, s.count + n) })),
  clear: () => set({ count: 0 }),
}));
