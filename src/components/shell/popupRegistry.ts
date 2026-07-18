import type { ShellIcon } from '@/components/shell/sidebarNav';
import { SURFACE_BY_SLUG } from '@/lib/surfaces';
import {
  Bell,
  Briefcase,
  Clapperboard,
  Crown,
  Flag,
  Megaphone,
  Settings,
  User,
} from 'lucide-react';

// ═════════════════════════════════════════════════════════════════════
// POPUP REGISTRY — the utility-tail popup layer (astra-popups Wave 1).
//
// Each tail item can open as an overlay popup (ModalLink → RouteModal →
// PopupShell) while keeping its canonical full-page route — the popup IS
// the page, rendered in an overlay, so parity is structural.
//
// Resolution cascade seam: (surface, popup) override beats the (popup)
// default — same specificity model as fee_resolve() in the DB and
// resolveSlotConfig() in astra.types. Wave 1 ships defaults only;
// per-surface overrides land when a popup genuinely differs (Creators
// Studio is the expected first customer).
// ═════════════════════════════════════════════════════════════════════

/** Community surfaces that host the white shell + utility tail. */
export type CommunitySurface = 'intel' | 'unite' | 'rule' | 'give' | 'pulse' | 'bazaar' | 'comms';

/**
 * Mirror of CommunityLayout's path→surface derivation. Kept here (not
 * imported from the layout) because App.tsx renders the popup layer OUTSIDE
 * CommunityLayout — the background location is the source of truth.
 */
export function surfaceFromPath(pathname: string): CommunitySurface {
  if (pathname.startsWith('/unite')) return 'unite';
  if (pathname.startsWith('/rule')) return 'rule';
  if (pathname.startsWith('/give')) return 'give';
  if (pathname.startsWith('/pulse')) return 'pulse';
  if (pathname.startsWith('/bazaar')) return 'bazaar';
  if (pathname.startsWith('/comms')) return 'comms';
  return 'intel';
}

/**
 * Surface → astra_registry slug, for scope filters that need the Astra UUID
 * (resolved live via useAstraRegistry). Surfaces without a registered Astra
 * stay unmapped — scoped views render their honest empty state.
 */
export const SURFACE_ASTRA_SLUG: Partial<Record<CommunitySurface, string>> = {
  intel: 'atlasintel',
  unite: 'atlasunited',
  comms: 'atlascomms',
  pulse: 'pulse',
  bazaar: 'bazaar',
};

/**
 * Accent for a surface — mirrors CommunityLayout.ACCENT. Bazaar has no
 * SURFACE_BY_SLUG row (MARKETPLACE's registry slug is 'entertheprize'),
 * so its accent is pinned here like the layout pins BAZAAR_ACCENT.
 */
export function popupAccent(surface: CommunitySurface | null): string {
  if (surface === 'intel' || surface === null) return '#1D9BF0';
  if (surface === 'unite') return '#7C3AED';
  if (surface === 'rule') return '#F97316';
  if (surface === 'give') return '#16A34A';
  if (surface === 'bazaar') return '#7F1D1D';
  return SURFACE_BY_SLUG.get(surface)?.color ?? '#1D9BF0';
}

export type PopupScopeMode = 'constellation' | 'surface';

export interface PopupDef {
  /** Registry key — matches the tail SidebarItem id where one exists. */
  key: string;
  title: string;
  icon: ShellIcon;
  /** Canonical route — the popup's shareable full-page URL. */
  route: string;
  /** Whether the popup offers the constellation / this-surface scope toggle. */
  scoped: boolean;
  /**
   * Default scope. Notifications defaults to constellation: astra_id is null
   * on all existing rows (producers don't tag yet), so the surface scope
   * shows an honest empty state until notify() callers pass p_astra_id.
   */
  defaultScope: PopupScopeMode;
  /** Panel width class — RouteModal defaults to max-w-2xl when absent. */
  panelClass?: string;
  /** Per-surface overrides — most specific wins. */
  surfaceOverrides?: Partial<
    Record<CommunitySurface, Partial<Pick<PopupDef, 'title' | 'scoped' | 'defaultScope'>>>
  >;
}

export const POPUPS: PopupDef[] = [
  {
    key: 'notifications',
    title: 'Notifications',
    icon: Bell,
    route: '/notifications',
    scoped: true,
    defaultScope: 'constellation',
  },
  {
    key: 'report',
    title: 'Reported',
    icon: Flag,
    route: '/intel/reported',
    scoped: false,
    defaultScope: 'constellation',
  },
  {
    key: 'creators',
    title: 'Creators Studio',
    icon: Clapperboard,
    route: '/studio',
    scoped: false,
    defaultScope: 'constellation',
    // The deepest popup — give it room.
    panelClass: 'max-w-5xl',
  },
  {
    key: 'premium',
    title: 'Premium',
    icon: Crown,
    route: '/premium',
    scoped: false,
    defaultScope: 'constellation',
  },
  {
    key: 'business',
    title: 'Business',
    icon: Briefcase,
    route: '/business',
    scoped: false,
    defaultScope: 'constellation',
  },
  {
    key: 'advertising',
    title: 'Advertise',
    icon: Megaphone,
    route: '/promotion',
    scoped: false,
    defaultScope: 'constellation',
  },
  {
    key: 'settings',
    title: 'Settings',
    icon: Settings,
    route: '/settings/handle',
    scoped: false,
    defaultScope: 'constellation',
    panelClass: 'max-w-3xl',
  },
  {
    key: 'profile',
    title: 'Profile',
    icon: User,
    route: '/profile',
    scoped: false,
    defaultScope: 'constellation',
  },
];

/** Resolve a popup for a surface: (surface, popup) override beats (popup). */
export function resolvePopup(key: string, surface: CommunitySurface | null): PopupDef | null {
  const base = POPUPS.find((p) => p.key === key) ?? null;
  if (!base) return null;
  const override = surface ? base.surfaceOverrides?.[surface] : undefined;
  return override ? { ...base, ...override } : base;
}
