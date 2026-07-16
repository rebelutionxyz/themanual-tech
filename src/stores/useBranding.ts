import {
  BRANDING_DEFAULTS,
  type BrandingConfig,
  applyFavicon,
  fetchBranding,
} from '@/lib/branding';
import { create } from 'zustand';

/**
 * Platform branding — mirrors the useRealmColors pattern: baked defaults
 * render immediately, one DB load per session overrides them, and the HQ
 * Branding editor pushes fresh values in via setLocal() after save.
 * Favicon follows the config on every change.
 */
interface BrandingState {
  branding: BrandingConfig;
  loaded: boolean;
  load: () => Promise<void>;
  setLocal: (cfg: BrandingConfig) => void;
}

export const useBranding = create<BrandingState>()((set, get) => ({
  branding: { ...BRANDING_DEFAULTS },
  loaded: false,
  load: async () => {
    if (get().loaded) return;
    set({ loaded: true });
    const branding = await fetchBranding();
    set({ branding });
    applyFavicon(branding.faviconUrl);
  },
  setLocal: (branding) => {
    set({ branding });
    applyFavicon(branding.faviconUrl);
  },
}));
