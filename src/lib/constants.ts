import type { KettleState, RealmId } from '@/types/manual';

/**
 * REALM_ORDER — palindrome display order locked April 25, 2026.
 *
 * Reads same forward and backward — Bees scrolling either direction
 * pass through a coherent arc. Pairings 1↔14, 2↔13, ..., 7↔8 are intentional.
 */
export const REALM_ORDER: RealmId[] = [
  'justice',           // 1
  'reference',         // 2
  'human_activities',  // 3
  'self',              // 4
  'geography',         // 5
  'health',            // 6
  'society',           // 7
  'math',              // 8
  'science',           // 9
  'philosophy',        // 10
  'tech',              // 11
  'history',           // 12
  'culture',           // 13
  'religion',          // 14
];

/**
 * REALM_NAMES — display labels for each realm id.
 *
 * Note: "Human activities" is intentionally lowercase 'a' (matches source data
 * from the 4,860-atom canonical taxonomy).
 */
export const REALM_NAMES: Record<RealmId, string> = {
  justice: 'Justice',
  reference: 'Reference',
  human_activities: 'Human activities',
  self: 'Self',
  geography: 'Geography',
  health: 'Health',
  society: 'Society',
  math: 'Math',
  science: 'Science',
  philosophy: 'Philosophy',
  tech: 'Tech',
  history: 'History',
  culture: 'Culture',
  religion: 'Religion',
};

/**
 * REALM_COLORS — accent colors for realm chips, breadcrumbs, card highlights.
 *
 * Colors carry semantic continuity from the prior 13-realm palette where
 * meaningful (Justice inherits Power's gravity, Health inherits Nature's vitality, etc.).
 * Override individual realms by editing this map. UI re-renders automatically.
 */
export const REALM_COLORS: Record<RealmId, string> = {
  justice: '#C94C4C',           // crimson — authority, gravity
  reference: '#8A94A0',         // gunmetal — neutral, lookup
  human_activities: '#E8A868',  // terracotta — making, doing
  self: '#E88AB8',              // rose — personal, vitality
  geography: '#9AC97A',         // sage — global, place
  health: '#6FCF8F',            // green — wellness
  society: '#7AA8D4',           // steel blue — collective
  math: '#B8A8F0',              // lavender — abstraction
  science: '#4FC3E8',           // cyan — discovery
  philosophy: '#F0C878',        // gold — wisdom
  tech: '#6B94C8',              // cool blue — digital
  history: '#D4A574',           // warm tan — antiquity
  culture: '#F78FB3',           // coral — expression
  religion: '#9B7FC8',          // violet — sacred
};

/**
 * REALM_ID_BY_NAME — reverse lookup from display name to RealmId slug.
 *
 * Used when parsing category paths (e.g. "Justice / Government / ...") back
 * to a typed RealmId. Returns undefined for non-realm names.
 */
export const REALM_ID_BY_NAME: Record<string, RealmId> = Object.fromEntries(
  REALM_ORDER.map((id) => [REALM_NAMES[id], id]),
) as Record<string, RealmId>;

/**
 * BEE_COLOR — soft amber, honey family.
 *
 * Used for user-authored content (My Threads), profile identity, and any
 * "this is you / yours" affordance. Distinct from BLiNG! honey (#FAD15E)
 * and Saved gold — lives in the same warm family without competing.
 *
 * v1: single fixed color for all Bees. Future: per-Bee chosen color
 * stored in bees.accent_color with this as the default.
 */
export const BEE_COLOR = '#E8B86E';

/**
 * KETTLE_STATES — the 4 states of the Discovery Ladder.
 *
 * Locked April 24, 2026 alongside the taxonomy migration.
 * Old states 'Sourced' and 'Unsourced' retired — every atom now lands
 * in one of these 4 boil-states based on evidence weight.
 *
 * Kettle metaphor:
 *   Fringe    = steam (minority claim with evidence)
 *   Emerging  = bubbling (gaining credibility)
 *   Contested = disputed (evidence on both sides)
 *   Accepted  = rolling boil (mainstream acknowledged)
 */
export const KETTLE_STATES: KettleState[] = [
  'Accepted',
  'Contested',
  'Emerging',
  'Fringe',
];

export const KETTLE_COLORS: Record<KettleState, string> = {
  Accepted: '#6B94C8',
  Contested: '#E8A838',
  Emerging: '#E88938',
  Fringe: '#9B7FC8',
};

export const KETTLE_ABBREV: Record<KettleState, string> = {
  Accepted: 'ACC',
  Contested: 'CON',
  Emerging: 'EME',
  Fringe: 'FRI',
};

export const KETTLE_DESCRIPTIONS: Record<KettleState, string> = {
  Accepted: 'Rolling boil — mainstream acknowledged',
  Contested: 'Disputed — evidence on both sides',
  Emerging: 'Bubbling — gaining credibility',
  Fringe: 'Steam — minority claim with evidence',
};

export const ATOM_TYPE_COLORS = {
  person: '#6B94C8',
  event: '#E88938',
  document: '#6FCF8F',
  organization: '#C94C4C',
  place: '#9B7FC8',
};