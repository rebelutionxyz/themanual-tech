import { create } from 'zustand';

/**
 * h24 STOREFRONT open/close — FRONT81.
 *
 * The storefront is a single modal mounted once (in UtilityChrome, so it is
 * present wherever the h24 wallet badge is), but it is opened from several
 * places: the badge's GET control, the badge's 402-failure GET control, and the
 * h24 sidebar Wallet section. A tiny shared store lets any of them open the one
 * modal without threading a callback down every tree.
 */
interface H24StorefrontState {
  open: boolean;
  openStore: () => void;
  closeStore: () => void;
}

export const useH24Storefront = create<H24StorefrontState>()((set) => ({
  open: false,
  openStore: () => set({ open: true }),
  closeStore: () => set({ open: false }),
}));
