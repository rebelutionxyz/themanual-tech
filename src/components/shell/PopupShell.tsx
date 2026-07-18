import { readableInk } from '@/components/shell/BottomToolbar';
import { RouteModal } from '@/components/shell/RouteModal';
import {
  type CommunitySurface,
  POPUPS,
  type PopupScopeMode,
  SURFACE_ASTRA_SLUG,
  popupAccent,
  resolvePopup,
  surfaceFromPath,
} from '@/components/shell/popupRegistry';
import { useAstraRegistry } from '@/lib/astras/useAstraRegistry';
import { Maximize2 } from 'lucide-react';
import { type ReactNode, createContext, useContext, useState } from 'react';
import { type Location, useLocation, useNavigate } from 'react-router-dom';

// ═════════════════════════════════════════════════════════════════════
// POPUP SHELL — shared chrome for utility-tail popups (astra-popups
// Wave 1). Renders INSIDE RouteModal, above the wrapped page component:
// title, surface scope chip/toggle, and "Full page" (same canonical URL,
// background cleared). The page renders unchanged underneath — the popup
// is the page, so popup ↔ full-page parity is structural, not maintained.
// ═════════════════════════════════════════════════════════════════════

export interface PopupScope {
  scope: PopupScopeMode;
  /** Community surface under the popup (from the background location). */
  surface: CommunitySurface | null;
  /** astra_registry.id for the surface's Astra — null when unmapped. */
  astraId: string | null;
}

const PopupScopeContext = createContext<PopupScope | null>(null);

/**
 * Read the popup scope from a wrapped page. Null on a full-page render —
 * pages treat null as constellation scope (their existing behavior).
 */
export function usePopupScope(): PopupScope | null {
  return useContext(PopupScopeContext);
}

export function PopupShell({ popupKey, children }: { popupKey: string; children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const background = (location.state as { background?: Location } | null)?.background ?? null;
  const surface = background ? surfaceFromPath(background.pathname) : null;
  const popup = resolvePopup(popupKey, surface);

  const registry = useAstraRegistry();
  const astraSlug = surface ? (SURFACE_ASTRA_SLUG[surface] ?? null) : null;
  const astraId = astraSlug ? (registry.bySlug.get(astraSlug)?.id ?? null) : null;

  const [scope, setScope] = useState<PopupScopeMode>(popup?.defaultScope ?? 'constellation');

  if (!popup) return <>{children}</>;
  const accent = popupAccent(surface);
  const Icon = popup.icon;

  return (
    <PopupScopeContext.Provider value={{ scope, surface, astraId }}>
      {/* pr-12 clears RouteModal's absolute close button. */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 py-3 pl-5 pr-12">
        <span className="flex min-w-0 items-center gap-2.5">
          <Icon size={18} className="flex-shrink-0" style={{ color: accent }} />
          <span className="truncate font-display text-[16px] font-semibold text-zinc-900">
            {popup.title}
          </span>
        </span>
        <span className="flex flex-shrink-0 items-center gap-2">
          {popup.scoped && surface && (
            <ScopeToggle scope={scope} onChange={setScope} surface={surface} accent={accent} />
          )}
          <button
            type="button"
            onClick={() => navigate(popup.route, { replace: true })}
            title="Open full page"
            aria-label="Open full page"
            className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-2 py-1 text-[11.5px] font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800"
          >
            <Maximize2 size={12} />
            Full page
          </button>
        </span>
      </div>
      {children}
    </PopupScopeContext.Provider>
  );
}

/** Constellation / this-surface segmented toggle. */
function ScopeToggle({
  scope,
  onChange,
  surface,
  accent,
}: {
  scope: PopupScopeMode;
  onChange: (s: PopupScopeMode) => void;
  surface: CommunitySurface;
  accent: string;
}) {
  const ink = readableInk(accent);
  const seg = (mode: PopupScopeMode, label: string) => {
    const active = scope === mode;
    return (
      <button
        type="button"
        onClick={() => onChange(mode)}
        aria-pressed={active}
        className="px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wide transition-colors"
        style={active ? { background: accent, color: ink } : { color: '#71717a' }}
      >
        {label}
      </button>
    );
  };
  return (
    <div className="flex overflow-hidden rounded-md border border-zinc-200">
      {seg('constellation', 'All')}
      {seg('surface', surface)}
    </div>
  );
}

/**
 * Route element for the popup layer in App.tsx: RouteModal (overlay frame,
 * close = back to background) wrapping PopupShell (chrome) wrapping the
 * unchanged page component.
 */
export function PopupRoute({ popupKey, children }: { popupKey: string; children: ReactNode }) {
  const def = POPUPS.find((p) => p.key === popupKey);
  return (
    <RouteModal panelClass={def?.panelClass}>
      <PopupShell popupKey={popupKey}>{children}</PopupShell>
    </RouteModal>
  );
}
