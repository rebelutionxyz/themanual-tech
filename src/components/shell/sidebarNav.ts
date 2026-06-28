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
}

export const NEUTRAL_INK = '#536471';

/**
 * Common utility tail appended below each surface's own items (relay UNITE
 * pass-1 order). Shared across community surfaces. Items without a built
 * destination are `soon`.
 */
export const COMMON_TAIL: SidebarItem[] = [
  { id: 'bookmarks', label: 'Bookmarked', icon: Bookmark, soon: true },
  { id: 'notifications', label: 'Notifications', icon: Bell, to: '/notifications' },
  { id: 'report', label: 'Reported', icon: Flag, to: '/intel/reported' },
  { id: 'creators', label: 'Creators Studio', icon: Clapperboard, soon: true },
  { id: 'premium', label: 'Premium', icon: Crown, soon: true },
  { id: 'business', label: 'Business', icon: Briefcase, soon: true },
  { id: 'advertising', label: 'Advertise', icon: Megaphone, to: '/promotion' },
  { id: 'settings', label: 'Settings', icon: Settings, to: '/settings/handle' },
];

/** Friendly per-surface label shown as the Astra dropdown's current value. */
export const SURFACE_FRIENDLY: Record<string, string> = {
  intel: 'INTEL',
  unite: 'Groups',
  rule: 'Events',
  give: 'Give',
};

/** Astra dropdown entries (relay order; "Marketplace" → Bazaar for firewall). */
export interface AstraSwitchItem {
  label: string;
  slug: string;
  to: string;
  icon: ShellIcon;
}

export const ASTRA_SWITCHER: AstraSwitchItem[] = [
  // Alpha order; BLiNG! lives only on the bottom toolbar (FreedomBLiNGS popup).
  { label: 'COMMs', slug: 'chat', to: '/chat', icon: MessageCircle },
  { label: 'Events', slug: 'rule', to: '/rule', icon: Calendar },
  { label: 'INTEL', slug: 'intel', to: '/intel', icon: MessagesSquare },
  { label: 'Give', slug: 'give', to: '/give', icon: HeartHandshake },
  { label: 'Groups', slug: 'unite', to: '/unite', icon: Users },
  { label: 'Justice', slug: 'justice', to: '/realm/justice', icon: Scale },
  { label: 'Marketplace', slug: 'entertheprize', to: '/entertheprize', icon: Store },
  { label: 'Pulse', slug: 'pulse', to: '/pulse', icon: Radio },
];

/** Resolve an Astra/surface color on white. Astra layer (≠ realm color). */
export function astraColor(slug: string): string {
  if (slug === 'intel') return '#1D9BF0';
  if (slug === 'justice') return '#1E40AF'; // Justice ASTRA navy (distinct from INTEL sky)
  return SURFACE_BY_SLUG.get(slug)?.color ?? NEUTRAL_INK;
}
