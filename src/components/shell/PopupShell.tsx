import {
  COMMUNITY_SURFACES,
  type CommunitySurface,
  POPUPS,
  SURFACE_ASTRA_SLUG,
  SURFACE_LABEL,
  popupAccent,
  resolvePopup,
  surfaceFromPath,
} from '@/components/shell/popupRegistry';
import { RouteModal } from '@/components/shell/RouteModal';
import { useAstraRegistry } from '@/lib/astras/useAstraRegistry';
import { cn } from '@/lib/utils';
import { ChevronDown, Maximize2 } from 'lucide-react';
import { type ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react';
import { type Location, useLocation, useNavigate } from 'react-router-dom';

// ═════════════════════════════════════════════════════════════════════
// POPUP SHELL — shared chrome for utility-tail popups. Renders INSIDE
// RouteModal (uniform 80% panel): pinned header (title · Astra scope
// dropdown · Full page) above a padded scrolling body. The wrapped page
// renders unchanged in the body — the popup IS the page, so popup ↔
// full-page parity is structural, not maintained.
//
// ONE scope control (Butch, 2026-07-18): the header dropdown — All Astras
// or a specific surface — replaces the old binary toggle AND any in-page
// filter chips while a popup is open. Pages read it via usePopupScope().
// ═════════════════════════════════════════════════════════════════════

export interface PopupScope {
  /** Selected Astra filter — null = All Astras. */
  surface: CommunitySurface | null;
  /** The surface the Bee is standing on (from the background location). */
  standingOn: CommunitySurface | null;
  /** astra_registry.id for the SELECTED surface — null when All / unmapped. */
  astraId: string | null;
}

const PopupScopeContext = createContext<PopupScope | null>(null);

/**
 * Read the popup scope from a wrapped page. Null on a full-page render —
 * pages treat null as "show everything / own filters" (their existing UI).
 */
export function usePopupScope(): PopupScope | null {
  return useContext(PopupScopeContext);
}

export function PopupShell({ popupKey, children }: { popupKey: string; children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const background = (location.state as { background?: Location } | null)?.background ?? null;
  const standingOn = background ? surfaceFromPath(background.pathname) : null;
  const popup = resolvePopup(popupKey, standingOn);
  const registry = useAstraRegistry();

  // Scoped popups open on the surface the Bee is standing on (plan default)
  // unless the popup declares a constellation default (e.g. Notifications).
  const [selected, setSelected] = useState<CommunitySurface | null>(() =>
    popup?.scoped && popup.defaultScope === 'surface' ? standingOn : null,
  );
  const astraSlug = selected ? (SURFACE_ASTRA_SLUG[selected] ?? null) : null;
  const astraId = astraSlug ? (registry.bySlug.get(astraSlug)?.id ?? null) : null;

  if (!popup) return <>{children}</>;
  const accent = popupAccent(standingOn);
  const Icon = popup.icon;

  return (
    <PopupScopeContext.Provider value={{ surface: selected, standingOn, astraId }}>
      <div className="flex h-full flex-col">
        {/* Pinned header — pr-14 clears RouteModal's absolute close button. */}
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-zinc-100 py-3 pl-6 pr-14">
          <span className="flex min-w-0 items-center gap-2.5">
            <Icon size={18} className="flex-shrink-0" style={{ color: accent }} />
            <span className="truncate font-display text-[16px] font-semibold text-zinc-900">
              {popup.title}
            </span>
          </span>
          <span className="flex flex-shrink-0 items-center gap-2">
            {popup.scoped && (
              <ScopeDropdown selected={selected} standingOn={standingOn} onSelect={setSelected} />
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
        {/* Scrolling body with breathing room on both sides. The chrome above
            IS the title, so any page-level <h1> is hidden UNIVERSALLY here —
            content starts right under the tab, no doubled headings, every
            popup (Butch 2026-07-18). */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-8 [&_h1]:hidden">
          {children}
        </div>
      </div>
    </PopupScopeContext.Provider>
  );
}

/** Astra scope dropdown: All Astras + every community surface. */
function ScopeDropdown({
  selected,
  standingOn,
  onSelect,
}: {
  selected: CommunitySurface | null;
  standingOn: CommunitySurface | null;
  onSelect: (s: CommunitySurface | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    // Capture phase so Esc closes the MENU without also closing the popup —
    // RouteModal's Esc listener is bubble-phase on the same document.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  const label = selected ? SURFACE_LABEL[selected] : 'All Astras';
  const color = selected ? popupAccent(selected) : '#52525b';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Filter by Astra"
        className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1 text-[11.5px] font-semibold transition-colors hover:bg-zinc-50"
      >
        <span style={{ color }}>{label}</span>
        <ChevronDown
          size={13}
          className={cn('text-zinc-400 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
          <MenuRow
            label="All Astras"
            color="#52525b"
            active={selected === null}
            onClick={() => {
              onSelect(null);
              setOpen(false);
            }}
          />
          {COMMUNITY_SURFACES.map((s) => (
            <MenuRow
              key={s}
              label={SURFACE_LABEL[s]}
              color={popupAccent(s)}
              active={selected === s}
              note={s === standingOn ? 'here' : undefined}
              onClick={() => {
                onSelect(s);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MenuRow({
  label,
  color,
  active,
  note,
  onClick,
}: {
  label: string;
  color: string;
  active: boolean;
  note?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] transition-colors hover:bg-zinc-50"
      style={{ color, fontWeight: active ? 700 : 500, background: active ? `${color}14` : undefined }}
    >
      <span
        className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
        style={{ background: color }}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {note && (
        <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-400" data-size="meta">
          {note}
        </span>
      )}
    </button>
  );
}

/**
 * Route element for the popup layer in App.tsx: RouteModal (uniform 80%
 * overlay, close = back to background) wrapping PopupShell (chrome)
 * wrapping the unchanged page component.
 */
export function PopupRoute({ popupKey, children }: { popupKey: string; children: ReactNode }) {
  const def = POPUPS.find((p) => p.key === popupKey);
  return (
    <RouteModal panelClass={def?.panelClass}>
      <PopupShell popupKey={popupKey}>{children}</PopupShell>
    </RouteModal>
  );
}
