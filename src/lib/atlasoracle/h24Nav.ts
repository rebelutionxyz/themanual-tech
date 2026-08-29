// H24_FIX1 — the h24 sidebar nav, factored out so the console, the routing-log
// page, and the Vault page all wire the SAME items to the SAME destinations.
// Before this pass each surface would have re-typed the nav array, which is
// exactly how the Vault item drifted onto the wrong destination in the first
// place (defect 8: it silently pointed at Creator Studio's content vault).

import type { ShellNavGroup } from '@/components/shell/UniversalShell';
import { formatTokens } from '@/lib/atlasoracle/tokens';
import type { NavigateFunction } from 'react-router-dom';
import {
  Activity,
  CalendarClock,
  FolderKanban,
  Images,
  type LucideIcon,
  Radio,
  SlidersHorizontal,
  SquarePen,
  Wallet,
} from 'lucide-react';
import { createElement } from 'react';

/** Which h24 surface is currently mounted — drives the sidebar's `active` dot. */
export type H24ActiveSurface = 'console' | 'log' | 'vault' | 'customize';

function icon(Icon: LucideIcon) {
  return createElement(Icon, { size: 17 });
}

export function buildH24Nav(opts: {
  navigate: NavigateFunction;
  /** Start a fresh directive — always routes to the console home. */
  onNew: () => void;
  signedIn: boolean;
  tokenBalance: number | null;
  onOpenWallet: () => void;
  active: H24ActiveSurface;
}): ShellNavGroup[] {
  const { navigate, onNew, signedIn, tokenBalance, onOpenWallet, active } = opts;

  return [
    {
      id: 'top',
      items: [
        { id: 'new', label: 'New', icon: icon(SquarePen), onClick: onNew },
        { id: 'projects', label: 'Projects', icon: icon(FolderKanban), hint: 'soon' },
        {
          id: 'artifacts',
          label: 'Artifacts',
          icon: icon(Images),
          onClick: () => navigate('/studio'),
        },
        { id: 'scheduled', label: 'Scheduled', icon: icon(CalendarClock), hint: 'soon' },
        { id: 'dispatch', label: 'Dispatch', icon: icon(Radio), onClick: () => navigate('/mc') },
        // H24_BYOK2 — Customize is now h24's real BYOK-key management home
        // (was a placeholder pointing at the generic /account hub, which has
        // nothing BYOK-specific on it; /account stays reachable via the
        // avatar and the handle drawer, so nothing is lost).
        {
          id: 'customize',
          label: 'Customize',
          icon: icon(SlidersHorizontal),
          onClick: () => navigate('/h24/customize'),
          active: active === 'customize',
        },
      ],
    },
    {
      id: 'h24',
      label: 'h24',
      items: [
        // H24_FIX1 defect 8 — h24's OWN Vault (saved directive artifacts), not
        // Creator Studio's content vault. Two different things share the name
        // "Vault" in canon; this one gets its own surface at /h24/vault.
        {
          id: 'vault',
          label: 'Vault',
          icon: icon(Images),
          onClick: () => navigate('/h24/vault'),
          active: active === 'vault',
        },
        // H24_FIX1 defect 9 — Activity now opens the full routing-log page; the
        // console still shows a compact inline log as a "last directive" summary.
        {
          id: 'activity',
          label: 'Activity',
          icon: icon(Activity),
          onClick: () => navigate('/h24/log'),
          active: active === 'log',
        },
        {
          id: 'wallet',
          label: 'Wallet',
          icon: icon(Wallet),
          onClick: () => signedIn && onOpenWallet(),
          hint: tokenBalance === null ? undefined : formatTokens(tokenBalance),
        },
      ],
    },
  ];
}
