// PATCHBOARD1 — THE PATCHBOARD (MMF §36 + shared/canon/patchboard-pattern.md).
//
// The Patchboard is the platform-wide switch system. Every feature, content
// category, integration, and behaviour resolves through it across three scopes
// (Master / Astra / Bee) via a fixed cascade, with four immutable hard switches
// sitting ABOVE the cascade.
//
// Lexicon note (MMF_GIST v2.8-r2): member-facing COPY says "user", never "Bee".
// The internal identifiers stay `bee_id` (no-rename-slugs rule) — so this type
// layer keeps `beeId` on the wire and uses "user" only in display strings.

/** The three scopes every switch resolves across (MMF §36.1). */
export type Scope = 'master' | 'astra' | 'bee';

/**
 * Soft switches are user preferences — user sovereignty wins, the user may
 * override them at the Bee scope. Hard switches are participation requirements
 * — the requirement wins and no scope can override them (MMF §36.3).
 */
export type SwitchClass = 'soft' | 'hard';

/**
 * The four hard switches (MMF §36.3). Immutable platform floors that sit above
 * the resolution cascade and can never be turned off by any scope.
 */
export type HardSwitchKey = 'tos' | 'kyc' | 'age_18_plus' | 'geo';

export const HARD_SWITCH_KEYS: readonly HardSwitchKey[] = [
  'tos',
  'kyc',
  'age_18_plus',
  'geo',
] as const;

/** True when a key names one of the four immutable hard switches. */
export function isHardSwitch(key: string): key is HardSwitchKey {
  return (HARD_SWITCH_KEYS as readonly string[]).includes(key);
}

/**
 * Which cascade term produced an effective value. `hard` means a hard switch
 * short-circuited the cascade; `master-fallback-on` is the terminal ON default
 * (MMF §36.2 — the cascade ends "...→ Master-default → ON").
 */
export type ResolutionTerm =
  | 'hard'
  | 'bee-astra'
  | 'bee-platform'
  | 'astra-default'
  | 'master-default'
  | 'fallback-on';

/** A switch definition (the `patchboard_switches` row shape). */
export interface PatchboardSwitch {
  id: string;
  scope: Scope;
  switchKey: string;
  switchClass: SwitchClass;
  /** The system default when no scope has set a value. */
  defaultState: boolean;
  label: string;
  description: string | null;
  /** true = defaults OFF, opt-in (a sensitive category, MMF §36 / pattern §4). */
  sensitive: boolean;
}

/** A concrete setting for a (scope-target, switch) pair (`patchboard_settings`). */
export interface PatchboardSetting {
  switchKey: string;
  /** NULL bee + NULL astra = Master; bee + NULL astra = Bee-platform; etc. */
  beeId: string | null;
  astraId: string | null;
  enabled: boolean;
}

/** The result of resolving one switch for a (user, astra) pair. */
export interface EffectiveState {
  switchKey: string;
  enabled: boolean;
  /** Which cascade term decided it — for the "why" tooltip in the UI. */
  term: ResolutionTerm;
  /** Hard switches render as locked rows; soft switches are user-editable. */
  locked: boolean;
}

// ── Connected Accounts (MMF §36.4) ──────────────────────────────────────────

/** Cost bearer for an integration's API/usage (MMF §36.5 — "Bee-paid vs platform-paid"). */
export type CostBearer = 'user' | 'platform';

/** Coarse grouping used only for display ordering / iconography. */
export type ProviderCategory =
  | 'identity'
  | 'settlement'
  | 'kyc'
  | 'analytics'
  | 'ai'
  | 'calendar'
  | 'distribution'
  | 'email'
  | 'accounting';

/**
 * A provider in the Master-scope registry (MMF §36.5) — the CLOSED set of
 * integrations that may be connected anywhere. Astras offer a subset; users
 * connect from what their Astra offers.
 */
export interface Provider {
  id: string;
  label: string;
  category: ProviderCategory;
  /** Launch cohort — tier 1 = July-4 launch, tier 2 = post-launch. */
  tier: 1 | 2;
  /** Who bears the API/usage cost. */
  costBearer: CostBearer;
  /**
   * true when the third-party service runs an affiliate/referral programme and
   * the integration is wired with HONEYCOMB's referral link (MMF §36.5).
   */
  affiliate: boolean;
  description: string;
}

/**
 * A user's connection record — the OAuth token / Stripe account id / address.
 * This is ACCOUNT DATA, never a switch (MMF §36.4.1). Lives RLS-private in
 * `connected_accounts`. The secret material itself is never read into the
 * browser; the client only ever sees this metadata envelope.
 */
export interface ConnectedAccount {
  id: string;
  beeId: string;
  providerId: string;
  /** A display handle for the connection (e.g. "@user on X"), never the token. */
  externalLabel: string | null;
  /**
   * dormant = the Offer switch was flipped OFF after connection. The record is
   * NEVER deleted (MMF §36.4.2 — dormancy, not deletion); it reactivates if the
   * Offer switch returns.
   */
  status: 'active' | 'dormant';
  connectedAt: string;
}

/**
 * The two switches that govern one provider in one scope (MMF §36.4.1):
 *  - offer: is this provider offered in the scope ("users here may connect X").
 *  - use:   does THIS user surface their connection in a given (bee, astra).
 * Both are genuine permissions that read correctly as default-ON; the thing that
 * cannot sensibly default ON (the token) was never a switch.
 */
export interface ProviderSwitchState {
  providerId: string;
  offered: boolean;
  used: boolean;
  connection: ConnectedAccount | null;
}
