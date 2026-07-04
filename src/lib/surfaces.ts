import type { LucideIcon } from 'lucide-react';
import {
  // Knowledge
  Book,
  Calendar,
  // Currency
  Coins,
  Droplet,
  Eye,
  Gamepad2,
  GraduationCap,
  HeartHandshake,
  Megaphone,
  MessageCircle,
  // Social
  MessagesSquare,
  Radio,
  Scale,
  // Safety
  Shield,
  ShieldAlert,
  // Commerce
  ShoppingBag,
  Store,
  Users,
  Video,
  Vote,
  // Flow
  Waves,
  // Services
  Wrench,
} from 'lucide-react';

export type SurfaceTier = 1 | 2;

export type SurfaceGroup = 'Currency' | 'Social' | 'Commerce' | 'Knowledge' | 'Safety' | 'Services';

export interface SurfaceDef {
  /** URL slug: /s/bling, /s/intel, etc. */
  slug: string;
  /** UPPERCASE brand name shown in UI */
  name: string;
  /** One-line function statement */
  function: string;
  /** Longer description shown on surface landing */
  description: string;
  /** Purpose in the ecosystem (what Bees do here) */
  purpose: string;
  /** Lucide icon */
  icon: LucideIcon;
  /** Accent color for this surface */
  color: string;
  /** Group for sidebar clustering */
  group: SurfaceGroup;
  /** Build tier (1 = fully built, 2 = shell w/ empty state) */
  tier: SurfaceTier;
  /** Special marker (e.g. MANUAL uses its own renderer, BLING uses token treatment) */
  special?: 'manual' | 'bling';
}

/**
 * The Surfaces of HoneyComb. Currently 21; lockable architecture but
 * grows when astras graduate (see MMF v2.2 §6.1 footnote).
 * Each entry pairs `name` (canonical UI label, used across both
 * constellations) with `function` (semantic category / MMF taxonomy term).
 * Both fields are load-bearing — not alternative names.
 * Ordered by group; grouping matters for sidebar presentation.
 * All live at launch — no "coming soon" fakery.
 */
export const SURFACES: SurfaceDef[] = [
  // ═══ CURRENCY ═══
  {
    slug: 'bling',
    name: 'BLiNG!',
    function: 'Currency',
    description: 'Earn. Free. Send. Escrow. The Freedom Ledger.',
    purpose:
      'Every productive action earns Drops. Every popular contribution earns Drips. BLiNG! flows through the whole platform.',
    icon: Coins,
    color: '#FAD15E',
    group: 'Currency',
    tier: 1,
    special: 'bling',
  },
  {
    slug: 'freedomblings',
    name: 'FreedomBLiNGS',
    function: 'The Sovereign Ledger',
    description:
      'The economic heart of the HoneyComb — where your BLiNG! lives, is FREEd, and moves.',
    purpose:
      'See your balance, read your ledger in the open, and trace any BLiNG! to its origin. Member-owned, capped, transparent — never bought or sold.',
    icon: Droplet,
    color: '#FAD15E',
    group: 'Currency',
    tier: 1,
  },

  // ═══ SOCIAL ═══
  {
    slug: 'comms',
    name: 'COMMS',
    function: 'Messaging',
    description: 'Bee-to-Bee direct channels. Private, encrypted, sovereign.',
    purpose:
      'Send messages, share Manual atoms, coordinate quietly. The backbone of sovereign communication.',
    icon: MessageCircle,
    color: '#9B7FC8',
    group: 'Social',
    tier: 1,
  },
  {
    slug: 'chat',
    name: 'CHAT',
    function: 'Live Video Chat',
    description: 'Real-time face-to-face. One-to-one, small rooms, or broadcast.',
    purpose:
      'Spontaneous conversation. Watch parties. Interviews. The warmest layer of the platform.',
    icon: Video,
    color: '#E88AB8',
    group: 'Social',
    tier: 1,
  },
  {
    slug: 'intel',
    name: 'INTEL',
    function: 'Forum',
    description: 'Sovereign threaded discussion. Every topic tagged to the Manual.',
    purpose:
      'Bees post claims, defend them, source them. Threads link to Manual atoms. Nothing is deleted — truth becomes a shape.',
    icon: MessagesSquare,
    color: '#1D9BF0',
    group: 'Social',
    tier: 1,
  },
  {
    slug: 'unite',
    name: 'UNITE',
    function: 'Groups',
    description: 'Organize around shared purpose. Sovereign tribes of Bees.',
    purpose:
      'Create or join a Group. Pin Manual atoms to your cause. Coordinate without platform interference.',
    icon: Users,
    color: '#7C3AED',
    group: 'Social',
    tier: 1,
  },
  {
    slug: 'rule',
    name: 'RULE',
    function: 'Events',
    description: 'Coordinate action in physical and digital space.',
    purpose:
      'Bees host Events, RSVP, show up. From rallies to study circles to livestream watches.',
    icon: Calendar,
    color: '#F97316',
    group: 'Social',
    tier: 1,
  },
  {
    slug: 'give',
    name: 'GIVE',
    function: 'Crowdfunding',
    description: 'Movement funding. Kindness. Productive generosity.',
    purpose:
      'Bees GIVE BLiNG! to campaigns. Zero fees on kindness. The economic opposite of extraction.',
    icon: HeartHandshake,
    color: '#16A34A',
    group: 'Social',
    tier: 1,
  },
  {
    slug: 'pulse',
    name: 'PULSE',
    function: 'Live News Network',
    description: 'Bee-produced news. Sovereign broadcast. No gatekeepers.',
    purpose:
      'Independent correspondents report what matters. Stories tag to Manual atoms for context.',
    icon: Radio,
    color: '#DC2626',
    group: 'Social',
    tier: 1,
  },

  // ═══ COMMERCE ═══
  {
    slug: 'entertheprize',
    name: 'MARKETPLACE',
    function: 'Buy · Auction · Raffle',
    description: 'The marketplace. Offer goods, services, listings.',
    purpose:
      'Bees OFFER and GET. Physical goods, services, rentals, auctions, raffles. Honey flows.',
    icon: ShoppingBag,
    color: '#7F1D1D',
    group: 'Commerce',
    tier: 1,
  },
  {
    slug: 'brand',
    name: 'BRAND',
    function: 'Rebelution Storefront',
    description: 'Official Rebelution merchandise and branded goods.',
    purpose: 'Platform-verified products. Every GET supports the movement. Curated storefronts.',
    icon: Store,
    color: '#C88A6B',
    group: 'Commerce',
    tier: 2,
  },
  {
    slug: 'prize',
    name: 'PRIZE',
    function: 'Private Gaming',
    description: 'Skill games, raffles, bracketed competitions.',
    purpose: 'Bees play for BLiNG!. Private. Entertainment that rewards.',
    icon: Gamepad2,
    color: '#9B7FC8',
    group: 'Commerce',
    tier: 2,
  },
  {
    slug: 'promotion',
    name: 'PROMOTION',
    function: 'Advertising',
    description: 'Bee-funded promotion. Transparent. Opt-in.',
    purpose: 'Bees and businesses promote listings, events, causes. Bees choose what they see.',
    icon: Megaphone,
    color: '#E8A838',
    group: 'Commerce',
    tier: 2,
  },

  // ═══ KNOWLEDGE ═══
  {
    slug: 'manual',
    name: 'MANUAL',
    function: 'The Manual',
    description: '13 realms · the sovereign record.',
    purpose:
      'The knowledge backbone. Every other surface can tag atoms here. Research, verify, add sources.',
    icon: Book,
    color: '#C8D1DA',
    group: 'Knowledge',
    tier: 1,
    special: 'manual',
  },

  // ═══ SAFETY ═══
  {
    slug: 'dingleberry',
    name: 'DingleBERRY',
    function: 'Security Command',
    description: "The comb's immune system. Posture at a glance across six security surfaces.",
    purpose:
      'DingleBERRY watches the platform: infra health, transaction integrity, source verification, shill/abuse detection, dispatch authority, and threat interception. Funded by @combtreasury.defense.',
    icon: ShieldAlert,
    color: '#DC2626',
    group: 'Safety',
    tier: 2,
  },
  {
    slug: 'secure',
    name: 'SECURE',
    function: 'Security',
    description: 'Identity protection. Comms hardening. Digital sovereignty tools.',
    purpose:
      'Best-practice security guides, account hardening, key management, vulnerability alerts.',
    icon: Shield,
    color: '#6FCF8F',
    group: 'Safety',
    tier: 2,
  },
  {
    slug: 'safe',
    name: 'SAFE',
    function: 'Monitoring',
    description: 'Situational awareness. Community-sourced safety signals.',
    purpose: 'Real-time alerts, threat mapping, Bee-to-Bee safety check-ins.',
    icon: Eye,
    color: '#6B94C8',
    group: 'Safety',
    tier: 2,
  },

  // ═══ SERVICES ═══
  {
    slug: 'production',
    name: 'PRODUCTION',
    function: 'Pros Directory',
    description: 'Sovereign Angie\u2019s List. Every trade, every service, reviewed by Bees.',
    purpose: 'Find vetted professionals. Get work done. Review and build Pro reputation.',
    icon: Wrench,
    color: '#8A94A0',
    group: 'Services',
    tier: 2,
  },
  {
    slug: 'waves',
    name: 'WAVES',
    function: 'Motion Flow',
    description: 'Mini Waves. One Ocean at a time. Full 8-level hierarchy of motion.',
    purpose:
      'Orchestrate your life by motion. Vessels, Oceans, Waves, Tides, Flows — tasks tagged by what they feel like, not where they live.',
    icon: Waves,
    color: '#0EA5E9',
    group: 'Services',
    tier: 1,
  },
  {
    slug: 'edu',
    name: 'EDU',
    function: 'Education',
    description: 'Tracks, courses, quizzes. Learn the Manual. Earn certifications.',
    purpose: 'Self-directed learning. Rank up. Teach what you know. Learn what you don\u2019t.',
    icon: GraduationCap,
    color: '#E88938',
    group: 'Services',
    tier: 2,
  },
  {
    slug: 'vote',
    name: 'VOTE',
    function: 'Elections',
    description: 'Governance votes. Rank-weighted. Transparent.',
    purpose: 'Platform governance, campaign endorsements, community referenda.',
    icon: Vote,
    color: '#FAD15E',
    group: 'Services',
    tier: 2,
  },
  {
    slug: 'legal',
    name: 'LEGAL',
    function: 'Legal Resources',
    description: 'Constitutional sheriffs, grand jury kits, rights cards, attorney directory.',
    purpose: 'Know your rights. Find sovereign legal support. Documentation for action.',
    icon: Scale,
    color: '#C94C4C',
    group: 'Services',
    tier: 2,
  },
];

// Lookup helpers
export const SURFACE_BY_SLUG = new Map(SURFACES.map((s) => [s.slug, s]));

export const SURFACE_GROUPS: SurfaceGroup[] = [
  'Currency',
  'Social',
  'Commerce',
  'Knowledge',
  'Services',
  'Safety',
];

export function getSurfacesByGroup(group: SurfaceGroup): SurfaceDef[] {
  return SURFACES.filter((s) => s.group === group);
}
