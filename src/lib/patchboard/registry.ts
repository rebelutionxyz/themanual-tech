// PATCHBOARD1 — Master-scope canon (MMF §36.3, §36.4, §36.5).
//
// This is the CODE mirror of the Master-scope registry: the four hard switches,
// the sensitive-default-OFF category list, and the closed provider set. The
// production `patchboard_providers` / `patchboard_switches` tables are the live
// source of truth once the db-lane migration lands; until then (and as the
// resolver floor) these constants ARE the sanctioned set. Keep the two in sync.

import type { HardSwitchKey, Provider } from './types';

/** The four immutable hard switches (MMF §36.3). Above the cascade, non-overridable. */
export const HARD_SWITCHES: Record<HardSwitchKey, { label: string; description: string }> = {
  tos: {
    label: 'Terms of Service',
    description:
      'Acceptance of the current Terms is required to participate. It cannot be turned off.',
  },
  kyc: {
    label: 'Identity (KYC)',
    description:
      'Identity verification is required at your first order-book OFFER (not at signup, so browsing stays pseudonymous). It cannot be turned off.',
  },
  age_18_plus: {
    label: '18+',
    description:
      'HONEYCOMB is 18+. The age floor is a platform requirement and cannot be turned off.',
  },
  geo: {
    label: 'Region',
    description:
      'Access from sanctioned regions is blocked by law. This floor cannot be turned off.',
  },
};

/**
 * Sensitive categories default OFF / opt-in (patchboard-pattern §4). Everything
 * else defaults ON. A key in this set flips the system default to false.
 */
export const SENSITIVE_DEFAULT_OFF: readonly string[] = [
  'graphic_content',
  'explicit_content',
  'location_sharing',
  'notification_firehose',
  'cross_astra_data_sharing',
] as const;

/** true when a soft switch key is a sensitive (default-OFF) category. */
export function isSensitiveCategory(key: string): boolean {
  return SENSITIVE_DEFAULT_OFF.includes(key);
}

/**
 * The system default for a soft switch: sensitive categories start OFF, all
 * other switches start ON (patchboard-pattern §4). Hard switches never route
 * through here — they are handled above the cascade.
 */
export function systemDefaultFor(switchKey: string): boolean {
  return !isSensitiveCategory(switchKey);
}

/**
 * THE PROVIDER REGISTRY (MMF §36.5). The closed set of integrations that may be
 * connected anywhere in the constellation. Tier 1 = July-4 launch cohort; Tier 2
 * = post-launch. `costBearer` records who bears the API/usage cost; `affiliate`
 * marks providers wired with HONEYCOMB's referral link.
 *
 * NOTE: costBearer values follow the canon intent (settlement/analytics/identity
 * /ai carried by the platform; a user's own distribution/calendar/office
 * accounts carried by the user). The live Master registry row is authoritative
 * and overrides these once the db-lane table lands — revenue routing within the
 * economy is still an open item (MMF §36.5).
 */
export const PROVIDER_REGISTRY: readonly Provider[] = [
  // ── Tier 1 — launch integrations ──────────────────────────────────────────
  {
    id: 'stripe_connect',
    label: 'Stripe Connect',
    category: 'settlement',
    tier: 1,
    costBearer: 'platform',
    affiliate: false,
    description:
      'Settlement rail for order-book OFFERs and payouts. Inherits the 18+ and KYC hard switches.',
  },
  {
    id: 'google_analytics',
    label: 'Google Analytics',
    category: 'analytics',
    tier: 1,
    costBearer: 'platform',
    affiliate: false,
    description: 'Traffic and surface analytics for Astra operators.',
  },
  {
    id: 'x',
    label: 'X',
    category: 'distribution',
    tier: 1,
    costBearer: 'user',
    affiliate: false,
    description: 'Surface your posts to your own X account. A distribution connection.',
  },
  {
    id: 'openai_anthropic',
    label: 'OpenAI / Anthropic',
    category: 'ai',
    tier: 1,
    costBearer: 'platform',
    affiliate: false,
    description: 'AI runtime for h24 and Astra copilots.',
  },
  {
    id: 'google_calendar',
    label: 'Google Calendar',
    category: 'calendar',
    tier: 1,
    costBearer: 'user',
    affiliate: false,
    description: 'Sync RULE events to your own calendar.',
  },
  // ── Tier 2 — post-launch integrations ─────────────────────────────────────
  {
    id: 'mailchimp',
    label: 'Mailchimp',
    category: 'email',
    tier: 2,
    costBearer: 'user',
    affiliate: false,
    description: 'Email campaigns for Astra operators and stores.',
  },
  {
    id: 'quickbooks',
    label: 'QuickBooks',
    category: 'accounting',
    tier: 2,
    costBearer: 'user',
    affiliate: false,
    description: 'Export store/pro-services accounting.',
  },
  {
    id: 'slack',
    label: 'Slack',
    category: 'distribution',
    tier: 2,
    costBearer: 'user',
    affiliate: false,
    description: 'Route notifications to a Slack workspace.',
  },
  {
    id: 'mastodon',
    label: 'Mastodon',
    category: 'distribution',
    tier: 2,
    costBearer: 'user',
    affiliate: false,
    description: 'Surface your posts to a Mastodon instance.',
  },
  {
    id: 'bluesky',
    label: 'BlueSky',
    category: 'distribution',
    tier: 2,
    costBearer: 'user',
    affiliate: false,
    description: 'Surface your posts to your BlueSky account.',
  },
] as const;

const PROVIDER_BY_ID: ReadonlyMap<string, Provider> = new Map(
  PROVIDER_REGISTRY.map((p) => [p.id, p]),
);

/** Look up a provider by id, or null if it is not in the sanctioned set. */
export function getProvider(id: string): Provider | null {
  return PROVIDER_BY_ID.get(id) ?? null;
}

/** Providers in a launch tier, in registry order. */
export function providersByTier(tier: 1 | 2): Provider[] {
  return PROVIDER_REGISTRY.filter((p) => p.tier === tier);
}
