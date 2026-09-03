/**
 * RoofLayout — ONE_SHELL2 (ONE_ROOF v1, owner 2026-09-03).
 *
 * "One shell. Not a manual shell and a second shell and now this shell. ONE."
 * Every route that used to sit under PlatformLayout (the old TheMANUAL.tech
 * SiteHeader + ticker + promo rail) or bare at the top level now mounts here,
 * inside the same UniversalShell h24 and the community surfaces wear. The
 * old header is deleted, not hidden — "so we never see it again".
 *
 * What changes per section is ONLY tokens + nav:
 *   /freedomblings/*  → BLiNG! gold, the ledger/member nav (its own sidebar retired)
 *   /dingleberry/*    → .icu security tokens (DingleBERRY IS .icu — owner), its nav
 *   /brand/*          → handled by BrandosophicLayout (ONE_SHELL3)
 *   everything else   → the roof itself (FLAGSHIP: white on black, no accent),
 *                       nav = the surface directory grouped as the registry groups it
 *
 * Chrome-free exceptions stay OUTSIDE this layout, named in ONE_ROOF v1:
 * / (front door), /login, /n/:slug (Nova skin). h24 mounts the shell itself.
 */
import { DINGLEBERRY_NAV } from '@/components/dingleberry/DingleberrySidebar';
import { dbIcon } from '@/components/dingleberry/icons';
import { LEDGER_NAV, MEMBER_NAV } from '@/components/freedomblings/FreedomblingsSidebar';
import type { ShellNavGroup, ShellNavItem } from '@/components/shell/UniversalShell';
import { UniversalShell } from '@/components/shell/UniversalShell';
import { useAuth } from '@/lib/auth';
import type { AstraTokens } from '@/lib/shell/astraTokens';
import { ASTRA_TOKENS, FLAGSHIP_TOKENS, astraPath, tokensFromAccent } from '@/lib/shell/astraTokens';
import { SURFACES, type SurfaceGroup } from '@/lib/surfaces';
import { useBlingBalance } from '@/lib/useBlingBalance';
import {
  Activity,
  BookOpen,
  Coins,
  Droplet,
  Layers,
  Sparkles,
  User,
} from 'lucide-react';
import { createElement, type ReactNode } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

/* ── tokens per section ────────────────────────────────────────────────────────── */
const BLING_TOKENS: AstraTokens = {
  ...tokensFromAccent('freedomblings', 'FreedomBLiNGS', '#fad15e', '/freedomblings'),
  logo: 'fist',
};

/** The roof itself. FLAGSHIP's neutral frame, but the strip says where you are
 *  the way h24's does — by name, not by a TLD three astras share. */
const ROOF_TOKENS: AstraTokens = { ...FLAGSHIP_TOKENS, slug: 'manual', tld: 'TheMANUAL' };

function tokensFor(section: string): AstraTokens {
  if (section === 'freedomblings' || section === 'bling') return BLING_TOKENS;
  if (section === 'dingleberry') return ASTRA_TOKENS.security;
  return ROOF_TOKENS;
}

/* ── nav per section ──────────────────────────────────────────────────────── */
const GROUP_ORDER: SurfaceGroup[] = [
  'Currency',
  'Social',
  'Commerce',
  'Knowledge',
  'Safety',
  'Services',
];

function isActive(pathname: string, to: string, exact = false): boolean {
  if (exact || to === '/') return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

function roofNav(pathname: string, go: (to: string) => void): ShellNavGroup[] {
  const top: ShellNavItem[] = [
    { id: 'manual', label: 'The Manual', icon: <BookOpen size={17} />, to: '/manual' },
    { id: 'collections', label: 'Collections', icon: <Layers size={17} />, to: '/collections' },
    { id: 'constellation', label: 'Constellation', icon: <Sparkles size={17} />, to: '/constellation' },
    { id: 'status', label: 'Status', icon: <Activity size={17} />, to: '/status' },
    { id: 'profile', label: 'Profile', icon: <User size={17} />, to: '/profile' },
  ].map(({ to, ...it }) => ({ ...it, active: isActive(pathname, to), onClick: () => go(to) }));

  const groups: ShellNavGroup[] = GROUP_ORDER.map((g) => ({
    id: `surface-${g.toLowerCase()}`,
    label: g,
    items: SURFACES.filter((s) => s.group === g).map((s) => {
      const to = `/${s.slug}`;
      return {
        id: `surface-${s.slug}`,
        label: s.name,
        icon: createElement(s.icon, { size: 17 }),
        active: isActive(pathname, to),
        onClick: () => go(to),
      };
    }),
  })).filter((g) => g.items.length > 0);

  return [{ id: 'roof', items: top }, ...groups];
}

function blingNav(pathname: string, go: (to: string) => void): ShellNavGroup[] {
  const item = (n: { id: string; label: string; path?: string }, icon: ReactNode): ShellNavItem => ({
    id: `bling-${n.id}`,
    label: n.label,
    icon,
    active: n.path ? isActive(pathname, n.path, n.path === '/freedomblings') : false,
    onClick: n.path ? () => go(n.path as string) : undefined,
  });
  return [
    { id: 'ledger', label: 'Ledger', items: LEDGER_NAV.map((n) => item(n, <Coins size={17} />)) },
    { id: 'member', label: 'Member', items: MEMBER_NAV.map((n) => item(n, <Droplet size={17} />)) },
  ];
}

function dingleberryNav(pathname: string, go: (to: string) => void): ShellNavGroup[] {
  return [
    {
      id: 'security',
      label: 'Security',
      items: DINGLEBERRY_NAV.map((n) => ({
        id: `dingleberry-${n.key}`,
        label: n.label,
        icon: createElement(dbIcon(n.icon), { size: 17 }),
        active: isActive(pathname, n.to, n.to === '/dingleberry'),
        hint: n.count || undefined,
        onClick: () => go(n.to),
      })),
    },
  ];
}

/* ── the layout ────────────────────────────────────────────────────────────── */
export function RoofLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { bee } = useAuth();
  const { balance: bling } = useBlingBalance(Boolean(bee));

  const section = pathname.split('/')[1] ?? '';
  const tokens = tokensFor(section);
  const go = (to: string) => navigate(to);
  const nav =
    section === 'freedomblings'
      ? blingNav(pathname, go)
      : section === 'dingleberry'
        ? dingleberryNav(pathname, go)
        : roofNav(pathname, go);

  return (
    <UniversalShell
      tokens={tokens}
      nav={nav}
      bling={bling}
      handle={bee?.handle ?? null}
      onBack={() => navigate(-1)}
      onForward={() => navigate(1)}
      onSearch={() => navigate('/manual')}
      onAvatar={() => navigate('/profile')}
      onOpenLedger={() => navigate('/freedomblings')}
      onTransfer={() => navigate('/freedomblings/move')}
      onSelectAstra={(key) => {
        const to = astraPath(key);
        if (to) navigate(to);
      }}
    >
      <Outlet />
    </UniversalShell>
  );
}
