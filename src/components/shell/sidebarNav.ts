import { SURFACE_BY_SLUG } from '@/lib/surfaces';
import {
  Bell,
  Bookmark,
  Briefcase,
  Calendar,
  Clapperboard,
  Crown,
  Flag,
  HeartHandshake,
  Megaphone,
  MessageCircle,
  MessagesSquare,
  Radio,
  Scale,
  Settings,
  Store,
  Users,
} from 'lucide-react';
import type { CSSProperties, ComponentType } from 'react';

/**
 * Icon slot accepted across the shell chrome. LucideIcon satisfies it; so does
 * the custom {@link HoneyDrop} (the BLiNG! mark), letting the gold drop stand in
 * anywhere an icon is expected.
 */
export type ShellIcon = ComponentType<{
  size?: number | string;
  className?: string;
  style?: CSSProperties;
}>;

/**
 * Sidebar item model for the white community shell. An item is one of:
 *   - link    (has `to`)      → <Link>
 *   - action  (no `to`)       → button → onSelect(id)
 *   - soon    (`soon: true`)  → faded, non-interactive
 */
export interface SidebarItem {
  id: string;
  label: string;
  icon: ShellIcon;
  to?: string;
  soon?: boolean;
  badge?: number;
  /**
   * Open `to` as an overlay popup (ModalLink → RouteModal → PopupShell)
   * instead of navigating the center outlet. Direct hits on the same URL
   * still render the full page — the popup and the page are one route.
   */
  modal?: boolean;
  /** Render a thin divider above this item (tail grouping). */
  dividerAbove?: boolean;
}

export const NEUTRAL_INK = '#536471';

/**
 * Common utility tail appended below each surface's own items (relay UNITE
 * pass-1 order). Shared across community surfaces. Items without a built
 * destination are `soon`.
 */
export const COMMON_TAIL: SidebarItem[] = [
  // Divider: each surface's own items above, the shared tail below.
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    to: '/notifications',
    modal: true,
    dividerAbove: true,
  },
  { id: 'report', label: 'Reported', icon: Flag, to: '/intel/reported', modal: true },
  // Saved = the cross-surface shelf popup (/bookmarks). INTEL's own
  // /intel/saved thread view still exists. Badge injected by CommunityLayout.
  { id: 'bookmarks', label: 'Saved', icon: Bookmark, to: '/bookmarks', modal: true },
  // Thin divider: the personal trio above, services below (Butch 2026-07-18).
  {
    id: 'creators',
    label: 'Creators Studio',
    icon: Clapperboard,
    to: '/studio',
    modal: true,
    dividerAbove: true,
  },
  { id: 'premium', label: 'Premium', icon: Crown, to: '/premium', modal: true },
  { id: 'business', label: 'Business', icon: Briefcase, to: '/business', modal: true },
  { id: 'advertising', label: 'Advertise', icon: Megaphone, to: '/promotion', modal: true },
  // Divider: services above, account-level Settings below (Butch 2026-07-18).
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    to: '/settings/handle',
    modal: true,
    dividerAbove: true,
  },
];

/**
 * Friendly per-surface label — the PAGE-HEADER noun ("Explore Groups",
 * "Explore Events"). The Astra dropdown deliberately does NOT use these:
 * it shows the Astra NAMES (UNITE, RULE, …) from ASTRA_SWITCHER
 * (Butch 2026-07-18).
 */
export const SURFACE_FRIENDLY: Record<string, string> = {
  intel: 'INTEL',
  unite: 'Groups',
  rule: 'Events',
  give: 'Give',
  comms: 'COMMs',
};

/** Astra dropdown entries. */
export interface AstraSwitchItem {
  label: string;
  slug: string;
  to: string;
  icon: ShellIcon;
}

export const ASTRA_SWITCHER: AstraSwitchItem[] = [
  // Canonical order + Astra NAMES (Butch 2026-07-18) — the friendly nouns
  // (Groups/Events) stay on the page headers, not here. BLiNG! lives only
  // on the bottom toolbar (FreedomBLiNGS popup).
  { label: 'UNITE', slug: 'unite', to: '/unite', icon: Users },
  { label: 'RULE', slug: 'rule', to: '/rule', icon: Calendar },
  { label: 'PULSE', slug: 'pulse', to: '/pulse', icon: Radio },
  { label: 'JUSTICE', slug: 'justice', to: '/realm/justice', icon: Scale },
  { label: 'GiVE', slug: 'give', to: '/give', icon: HeartHandshake },
  { label: 'INTEL', slug: 'intel', to: '/intel', icon: MessagesSquare },
  { label: 'COMMs', slug: 'comms', to: '/comms', icon: MessageCircle },
  { label: 'BAZAAR', slug: 'bazaar', to: '/bazaar', icon: Store },
];

/** Resolve an Astra/surface color on white. Astra layer (≠ realm color). */
export function astraColor(slug: string): string {
  if (slug === 'intel') return '#1D9BF0';
  if (slug === 'justice') return '#1E40AF'; // Justice ASTRA navy (distinct from INTEL sky)
  return SURFACE_BY_SLUG.get(slug)?.color ?? NEUTRAL_INK;
}
