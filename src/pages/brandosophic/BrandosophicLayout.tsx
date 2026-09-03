import { type ShellNavGroup, UniversalShell } from '@/components/shell/UniversalShell';
import type { SidebarItem } from '@/components/shell/sidebarNav';
import { useAuth } from '@/lib/auth';
import { type AstraTokens, astraPath, tokensFromAccent } from '@/lib/shell/astraTokens';
import { type ResolvedSkin, resolveSkin } from '@/lib/skins';
import { supabase } from '@/lib/supabase';
import { useBlingBalance } from '@/lib/useBlingBalance';
import { Boxes, Hexagon, Lock, Palette, Radio, Store } from 'lucide-react';
import { createElement, useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

// ═════════════════════════════════════════════════════════════════════
// BRANDoSOPHIC layout — the brand-design Astra's shell (MMF §25).
// ONE_SHELL3 (ONE_ROOF v1): wears UniversalShell, same as every other
// community surface (CommunityLayout) — its own menu family: STUDIO ·
// BRANDS · NOVAS · STOREFRONT (ETZY slot) · ORDER BOOK (soon). Accent +
// chrome resolve from the live skin layer (skin_resolve); tokens are
// DERIVED (tokensFromAccent) since Brandosophic has no ASTRA_TOKENS row
// yet (astraTokens.ts: "Brandosophic is unruled").
// ═════════════════════════════════════════════════════════════════════

/** astra_registry.id for slug 'brandosophic' (prod). */
const BRANDOSOPHIC_ASTRA_ID = '35283e63-c5a8-4376-bc7f-5db21323eb13';

export interface BrandosophicOutletCtx {
  skin: ResolvedSkin;
  /** Re-resolve after an edit/clone so chrome follows the skin layer. */
  reloadSkin: () => void;
}

const ITEMS: SidebarItem[] = [
  { id: 'studio', label: 'Studio', icon: Palette, to: '/brand' },
  { id: 'brands', label: 'My Brands', icon: Hexagon, to: '/brand/brands' },
  { id: 'novas', label: 'Novas', icon: Boxes, to: '/brand/novas' },
  { id: 'storefront', label: 'Storefront', icon: Store, to: '/brand/storefront' },
  // BRAND/Broadcast — make it seen (autoposting/socials). Soon-tile per the
  // BRAND-family frame (Butch, Jul 24); wired on Autopost day.
  { id: 'broadcast', label: 'Broadcast', icon: Radio, soon: true },
  // Skin order book — deferred (§25.3). Rendered, locked, honest.
  { id: 'orderbook', label: 'Order Book', icon: Lock, soon: true, dividerAbove: true },
];

function itemFromPath(pathname: string): string {
  if (pathname.startsWith('/brand/brands')) return 'brands';
  if (pathname.startsWith('/brand/novas')) return 'novas';
  if (pathname.startsWith('/brand/storefront')) return 'storefront';
  return 'studio';
}

export function BrandosophicLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { bee } = useAuth();
  const { balance: blingBalance } = useBlingBalance(Boolean(bee));
  const [skin, setSkin] = useState<ResolvedSkin | null>(null);

  const load = useCallback(() => {
    // BRANDoSOPHIC's own astra skin (Deep Maroon row, Jul 24); server falls
    // back to the platform default if it's ever archived.
    void resolveSkin('astra', BRANDOSOPHIC_ASTRA_ID).then(setSkin);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  // Analytics rail (append-only, fire-and-forget — page_view_log never throws).
  useEffect(() => {
    if (supabase) {
      void supabase.rpc('page_view_log', {
        p_path: location.pathname,
        p_astra_slug: 'brandosophic',
        p_referrer: document.referrer || null,
      });
    }
  }, [location.pathname]);

  const accent = skin?.branding.accentHex ?? '#C88A6B';
  const activeItemId = itemFromPath(location.pathname);
  const toNav = (it: SidebarItem) => ({
    id: it.id,
    label: it.label,
    icon: createElement(it.icon, { size: 17 }),
    onClick: it.to ? () => navigate(it.to as string) : undefined,
    active: it.id === activeItemId,
    hint: it.soon ? 'soon' : undefined,
  });
  const tailStart = ITEMS.findIndex((it) => it.dividerAbove);
  const nav: ShellNavGroup[] =
    tailStart > 0
      ? [
          { id: 'brand', items: ITEMS.slice(0, tailStart).map(toNav) },
          { id: 'brand-tail', items: ITEMS.slice(tailStart).map(toNav) },
        ]
      : [{ id: 'brand', items: ITEMS.map(toNav) }];

  // Brandosophic has no ASTRA_TOKENS row yet ("unruled") — tokens are derived
  // from the live skin accent, same fallback CommunityLayout uses for any
  // surface without a ratified/proposed row.
  const tokens: AstraTokens = tokensFromAccent('brandosophic', '.com', accent);

  return (
    <UniversalShell
      tokens={tokens}
      nav={nav}
      bling={blingBalance}
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
      <Outlet
        context={
          {
            skin: skin ?? {
              skinId: null,
              name: 'Rebelution',
              branding: {
                wordmarkPre: 'Rebel',
                wordmarkAccent: 'U',
                wordmarkPost: 'tion',
                wordmarkSuffix: '.app',
                accentHex: '#DC2626',
                logoUrl: '/rebelution-logo.png',
                faviconUrl: '/rebelution-favicon.png',
              },
              backgroundSoftness: 0.9,
            },
            reloadSkin: load,
          } satisfies BrandosophicOutletCtx
        }
      />
    </UniversalShell>
  );
}
