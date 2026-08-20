// PATCHBOARD1 — Bee-scope Patchboard store (MMF §36).
//
// Loads the effective switch states + connected-account view for the current
// user in an optional Astra context, in one place, floor-safe. Mirrors the
// useLensStore pattern: create<State>()((set, get) => ({...})).

import {
  HARD_SWITCH_KEYS,
  PROVIDER_REGISTRY,
  SENSITIVE_DEFAULT_OFF,
  composeProviderStates,
  getEffectiveSwitchStates,
  listConnections,
  offerSwitchKey,
  useSwitchKey,
} from '@/lib/patchboard';
import type { EffectiveState, ProviderSwitchState } from '@/lib/patchboard';
import { create } from 'zustand';

/**
 * The soft switches the Bee Patchboard surfaces by default. Sensitive
 * categories (default-OFF) plus the everyday preference switches. Astra-specific
 * inventories extend this per patchboard-pattern §10.
 */
export const DEFAULT_SOFT_SWITCHES: readonly string[] = [
  ...SENSITIVE_DEFAULT_OFF,
  'push_notifications',
  'email_notifications',
  'recommendations',
  'social_proof',
] as const;

interface PatchboardState {
  beeId: string | null;
  astraId: string | null;
  loading: boolean;
  loaded: boolean;
  error: string | null;
  /** Effective state per switch key, after cascade resolution. */
  switches: Record<string, EffectiveState>;
  /** Per-provider offer/use/connection view for the current user. */
  providers: ProviderSwitchState[];
  /** Resolve everything for a (user, astra) pair. Safe to call repeatedly. */
  load: (beeId: string | null, astraId: string | null) => Promise<void>;
  /** The effective boolean for a key, defaulting to false if not yet loaded. */
  isOn: (switchKey: string) => boolean;
  reset: () => void;
}

const EMPTY: Pick<PatchboardState, 'switches' | 'providers'> = {
  switches: {},
  providers: [],
};

export const usePatchboardStore = create<PatchboardState>()((set, get) => ({
  beeId: null,
  astraId: null,
  loading: false,
  loaded: false,
  error: null,
  ...EMPTY,

  load: async (beeId, astraId) => {
    set({ loading: true, error: null, beeId, astraId });

    // Every key we want resolved this pass: hard switches, the default soft
    // set, and the offer/use switch pair for each registry provider.
    const providerKeys = PROVIDER_REGISTRY.flatMap((p) => [
      offerSwitchKey(p.id),
      useSwitchKey(p.id),
    ]);
    const allKeys = [...HARD_SWITCH_KEYS, ...DEFAULT_SOFT_SWITCHES, ...providerKeys];

    try {
      const [switches, connections] = await Promise.all([
        getEffectiveSwitchStates(allKeys, beeId, astraId),
        beeId ? listConnections(beeId) : Promise.resolve([]),
      ]);

      const offered: Record<string, boolean> = {};
      const used: Record<string, boolean> = {};
      for (const p of PROVIDER_REGISTRY) {
        offered[p.id] = switches[offerSwitchKey(p.id)]?.enabled ?? true;
        used[p.id] = switches[useSwitchKey(p.id)]?.enabled ?? true;
      }

      set({
        switches,
        providers: composeProviderStates(connections, offered, used, PROVIDER_REGISTRY),
        loading: false,
        loaded: true,
        error: null,
      });
    } catch (e) {
      // Floor: never leave the UI stuck — surface the error and hold defaults.
      set({
        ...EMPTY,
        loading: false,
        loaded: true,
        error: e instanceof Error ? e.message : 'Failed to load Patchboard state',
      });
    }
  },

  isOn: (switchKey) => get().switches[switchKey]?.enabled ?? false,

  reset: () =>
    set({ ...EMPTY, beeId: null, astraId: null, loading: false, loaded: false, error: null }),
}));
