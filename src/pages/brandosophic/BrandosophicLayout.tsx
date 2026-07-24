import { CommunityShell } from '@/components/shell/CommunityShell';
import type { SidebarItem } from '@/components/shell/sidebarNav';
import { type ResolvedSkin, resolveSkin } from '@/lib/skins';
import { Boxes, Hexagon, Lock, Palette, Store } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

// ═════════════════════════════════════════════════════════════════════
// BRANDoSOPHIC layout — the brand-design Astra's shell (MMF §25).
// Duplicates the white community shell with its own menu family:
// STUDIO · BRANDS · NOVAS · STOREFRONT (ETZY slot) · ORDER BOOK (soon).
// Accent + chrome resolve from the live skin layer (skin_resolve).
// ═════════════════════════════════════════════════════════════════════

export interface BrandosophicOutletCtx {
  skin: ResolvedSkin;
  /** Re-resolve after an edit/clone so chrome follows the skin layer. */
  reloadSkin: () => void;
}

const ITEMS: SidebarItem[] = [
  { id: 'studio', label: 'Studio', icon: Palette, to: '/brandosophic' },
  { id: 'brands', label: 'My Brands', icon: Hexagon, to: '/brandosophic/brands' },
  { id: 'novas', label: 'Novas', icon: Boxes, to: '/brandosophic/novas' },
  { id: 'storefront', label: 'Storefront', icon: Store, to: '/brandosophic/storefront' },
  // Skin order book — deferred (§25.3). Rendered, locked, honest.
  { id: 'orderbook', label: 'Order Book', icon: Lock, soon: true, dividerAbove: true },
];

function itemFromPath(pathname: string): string {
  if (pathname.startsWith('/brandosophic/brands')) return 'brands';
  if (pathname.startsWith('/brandosophic/novas')) return 'novas';
  if (pathname.startsWith('/brandosophic/storefront')) return 'storefront';
  return 'studio';
}

export function BrandosophicLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [skin, setSkin] = useState<ResolvedSkin | null>(null);

  const load = useCallback(() => {
    // Astra-owned skin first; server falls back to the platform default.
    void resolveSkin('astra', null).then(setSkin);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

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
      activeSurface="brandosophic"
      accent={accent}
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
