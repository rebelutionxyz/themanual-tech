import { CommunityShell } from '@/components/shell/CommunityShell';
import { useAstra } from '@/lib/astras/AstraContext';
import type { SidebarItem } from '@/components/shell/sidebarNav';
import { type ResolvedSkin, resolveSkin } from '@/lib/skins';
import { supabase } from '@/lib/supabase';
import { Boxes, Hexagon, Lock, Palette, Radio, Store } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

// ═════════════════════════════════════════════════════════════════════
// BRANDoSOPHIC layout — the brand-design Astra's shell (MMF §25).
// Duplicates the white community shell with its own menu family:
// STUDIO · BRANDS · NOVAS · STOREFRONT (ETZY slot) · ORDER BOOK (soon).
// Accent + chrome resolve from the live skin layer (skin_resolve).
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
  // On brandosophic.com itself the comb's Astra dropdown is hidden — the domain
  // IS the brand studio. On themanual.tech/brand it stays. (Butch, Jul 24.)
  const activeAstra = useAstra();
  const standalone = activeAstra?.slug === 'brandosophic';
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

  const onSelect = useCallback(
    (id: string) => {
      const item = ITEMS.find((i) => i.id === id);
      if (item?.to) navigate(item.to);
    },
    [navigate],
  );

  const accent = skin?.branding.accentHex ?? '#C88A6B';

  return (
    <CommunityShell
      activeSurface="brand"
      accent={accent}
      branding={skin?.branding}
      hideAstraSwitcher={standalone}
      items={ITEMS}
      activeItemId={itemFromPath(location.pathname)}
      onSelect={onSelect}
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
    </CommunityShell>
  );
}
