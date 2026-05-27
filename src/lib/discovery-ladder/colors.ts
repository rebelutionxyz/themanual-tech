// Discovery Ladder color + label canon.
//
// Single source of truth for tier visual representation. Per
// shared/canon/manual-spine-api-v1-amendment-1.md §2.1 (5-tier + colors)
// and shared/canon/ux-rules-canon-v1.md (no red anywhere in the ladder).
//
// If colors need to change, edit this file once. DiscoveryTierChip reads from
// here; constants.ts KETTLE_COLORS re-exports the bg color for back-compat
// with the existing OutlookView + GraphView consumers.

export type DiscoveryTier =
  | 'Sourced'
  | 'Accepted'
  | 'Emerging'
  | 'Fringe'
  | 'Unsourced';

export interface DiscoveryTierStyle {
  bg: string;
  text: string;
  label: DiscoveryTier;
  description: string;
}

// Ordered most-supported → least-supported. Matches amendment §2.1.
export const DISCOVERY_TIERS_ORDERED: DiscoveryTier[] = [
  'Sourced',
  'Accepted',
  'Emerging',
  'Fringe',
  'Unsourced',
];

export const DISCOVERY_TIER_COLORS: Record<DiscoveryTier, DiscoveryTierStyle> = {
  Sourced:   { bg: '#16a34a', text: '#ffffff', label: 'Sourced',   description: 'Well-sourced with strong consensus' },
  Accepted:  { bg: '#eab308', text: '#000000', label: 'Accepted',  description: 'Broadly accepted classification' },
  Emerging:  { bg: '#f97316', text: '#ffffff', label: 'Emerging',  description: 'Still developing consensus' },
  Fringe:    { bg: '#9ca3af', text: '#000000', label: 'Fringe',    description: 'Minority view with some sources' },
  Unsourced: { bg: '#4b5563', text: '#ffffff', label: 'Unsourced', description: 'No sources attached' },
};
