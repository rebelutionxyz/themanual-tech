import { Popup, StubPanel, TimePanel } from '@/components/layout/lensPanels';
import { readableInk } from '@/components/shell/BottomToolbar';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/stores/useCartStore';
import { useLensStore } from '@/stores/useLensStore';
import { useRealmTreeStore } from '@/stores/useRealmTreeStore';
import { Clock, type LucideIcon, MapPin, Rabbit, Search, ShoppingCart, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';

// Realm moved out of the lens popups into the persistent RealmStrip (pass 18).
type LensId = 'location' | 'time';

/**
 * Horizontal lens bar at the top of the community center column — Search ·
 * Location · Time. (Realm is now the persistent strip below this row.)
 */
export function LensRow({ accent }: { accent: string }) {
  const [openLens, setOpenLens] = useState<LensId | null>(null);
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null);
  // The trigger button for the open lens — re-measured on scroll/resize so the
  // popup tracks it instead of drifting.
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!openLens) return;
    const reposition = () => {
      const btn = triggerRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      setAnchor({ left: r.left, top: r.bottom + 4 });
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenLens(null);
    // capture:true catches scrolls inside the lens row / any nested scroller.
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
      document.removeEventListener('keydown', onKey);
    };
  }, [openLens]);

  function openAt(id: LensId, btn: HTMLButtonElement) {
    if (openLens === id) {
      setOpenLens(null);
      return;
    }
    triggerRef.current = btn;
    const r = btn.getBoundingClientRect();
    setAnchor({ left: r.left, top: r.bottom + 4 });
    setOpenLens(id);
  }

  const popWidth = 300;
  const popStyle: React.CSSProperties = anchor
    ? {
        position: 'fixed',
        left: Math.max(8, Math.min(anchor.left, window.innerWidth - popWidth - 8)),
        top: anchor.top,
        width: popWidth,
        zIndex: 60,
      }
    : {};

  // Contrast-aware ink against the SOLID accent bar — the SAME helper the bottom
  // toolbar uses, so the two bars flip ink identically per accent.
  const ink = readableInk(accent);
  const onDark = ink === '#ffffff';

  return (
    // Spans only the center content column. SOLID Astra accent — matches the
    // bottom toolbar (BottomToolbar uses the same `accent`). Horizontal
    // touch-scroller so the labelled lenses never clip on a narrow viewport.
    <div
      className="flex h-11 flex-shrink-0 items-center gap-1 overflow-x-auto px-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ background: accent }}
    >
      {/* ml-auto on the first control floats the whole Search/Location/Time
          group (and the trailing Cart) to the RIGHT edge of the row. Degrades
          to 0 when the row overflows on narrow screens, so the touch-scroller
          still reaches every control.
          NOTE: there is no "Realm" control in this row — the 14-realm picker is
          the separate persistent RealmStrip below (pass 18). Not added here. */}
      <SearchLens ink={ink} onDark={onDark} className="ml-auto" />
      <LensButton
        icon={MapPin}
        label="Location"
        ink={ink}
        onDark={onDark}
        active={openLens === 'location'}
        onClick={(b) => openAt('location', b)}
      />
      <LensButton
        icon={Clock}
        label="Time"
        ink={ink}
        onDark={onDark}
        active={openLens === 'time'}
        onClick={(b) => openAt('time', b)}
      />

      {/* White Rabbit — toggles the right-column realm-tree slider. Reuses the
          lucide Rabbit icon from the INTEL composer's atom picker. The
          data-rabbit-toggle hook lets the slider's click-outside guard ignore
          this button (no close-then-reopen race). */}
      <RabbitButton ink={ink} onDark={onDark} />

      {/* Cart — sits at the right end of the floated group. */}
      <CartIcon ink={ink} onDark={onDark} accent={accent} />

      {/* Popups are PORTALED to <body> — the lens row's backdrop-filter +
          overflow-x would otherwise become the containing block for our
          position:fixed popup (origin shifts to the row) and clip the dropdown. */}
      {openLens &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-50"
              onMouseDown={() => setOpenLens(null)}
              aria-hidden="true"
            />
            {openLens === 'location' && (
              <Popup title="Location" style={popStyle} onClose={() => setOpenLens(null)}>
                <StubPanel
                  line="No location field wired yet."
                  note="Geo scoping attaches here once content carries a location."
                />
              </Popup>
            )}
            {openLens === 'time' && (
              <Popup title="Time" style={popStyle} onClose={() => setOpenLens(null)}>
                <TimePanel />
              </Popup>
            )}
          </>,
          document.body,
        )}
    </div>
  );
}

/**
 * Inline Astra-local search (replaces the old popup). Collapsed = a magnifier;
 * click → an input expands IN the lens row. Typing drives useLensStore.searchTerm
 * (≥2 chars runs the surface's content search, cross-realm — the per-surface RPC
 * is wired in the content component, e.g. ThreadList → forumSearch). Click-out
 * collapses + REMEMBERS the term; reopening prefills it; the ✕ clears it back to
 * the normal feed. Icon shows lit when a search is active.
 */
function SearchLens({
  ink,
  onDark,
  className,
}: {
  ink: string;
  onDark: boolean;
  className?: string;
}) {
  const term = useLensStore((s) => s.searchTerm);
  const setSearchTerm = useLensStore((s) => s.setSearchTerm);
  const clearSearch = useLensStore((s) => s.clearSearch);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const active = term.trim().length >= 2;

  // Collapse on click-outside (the term is kept — remembered for reopen).
  useEffect(() => {
    if (!expanded) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setExpanded(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [expanded]);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => {
          setExpanded(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        title={active ? `Searching: ${term}` : 'Search'}
        aria-label="Search"
        className={cn(
          'flex flex-shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors',
          active ? 'font-semibold' : onDark ? 'hover:bg-white/10' : 'hover:bg-black/10',
          className,
        )}
        style={
          active
            ? { color: ink, background: onDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' }
            : { color: ink, opacity: 0.85 }
        }
      >
        <Search size={16} />
      </button>
    );
  }

  return (
    <div
      ref={wrapRef}
      className={cn('flex h-8 flex-shrink-0 items-center gap-1.5 rounded-md px-2', className)}
      style={{ background: onDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.10)', color: ink }}
    >
      <Search size={16} className="flex-shrink-0" style={{ color: ink }} />
      <input
        ref={inputRef}
        type="search"
        value={term}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setExpanded(false);
        }}
        placeholder="Search this Astra…"
        aria-label="Search"
        className="w-40 bg-transparent text-[13px] outline-none placeholder:opacity-60 sm:w-56"
        style={{ color: ink }}
      />
      {term && (
        <button
          type="button"
          onClick={() => {
            clearSearch();
            inputRef.current?.focus();
          }}
          aria-label="Clear search"
          title="Clear search"
          className="flex flex-shrink-0 items-center justify-center rounded p-0.5 opacity-80 transition-opacity hover:opacity-100"
          style={{ color: ink }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

function LensButton({
  icon: Icon,
  label,
  ink,
  onDark,
  active,
  onClick,
  className,
}: {
  icon: LucideIcon;
  label: string;
  /** Contrast ink for the solid accent bar (white on dark accents, near-black on light). */
  ink: string;
  /** True when the accent is dark (light ink) — picks the hover/active overlay. */
  onDark: boolean;
  active?: boolean;
  onClick: (btn: HTMLButtonElement) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => onClick(e.currentTarget)}
      title={label}
      aria-label={label}
      className={cn(
        'flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] transition-colors',
        active ? 'font-semibold' : onDark ? 'hover:bg-white/10' : 'hover:bg-black/10',
        className,
      )}
      style={
        active
          ? { color: ink, background: onDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' }
          : { color: ink, opacity: 0.85 }
      }
    >
      <Icon size={16} />
      {/* Desktop: icon + label. Mobile (<md): icons only. */}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

/** The Realm control (White Rabbit motif) — toggles the right-column realm
    sidebar (multi-select). Renders IDENTICALLY to the other lens controls
    (mirrors LensButton's classes/structure): rabbit icon + "Realm" label,
    contrast ink, same hover, and the same active treatment when its panel (the
    realm sidebar) is open. No badge — selected realms show as chips. Keeps
    data-rabbit-toggle so the sidebar's outside-click dismiss ignores it. */
function RabbitButton({ ink, onDark }: { ink: string; onDark: boolean }) {
  const open = useRealmTreeStore((s) => s.open);
  const toggle = useRealmTreeStore((s) => s.toggle);

  return (
    <button
      type="button"
      data-rabbit-toggle
      onClick={() => toggle()}
      title="Realm"
      aria-label="Realm"
      aria-pressed={open}
      className={cn(
        'flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] transition-colors',
        open ? 'font-semibold' : onDark ? 'hover:bg-white/10' : 'hover:bg-black/10',
      )}
      style={
        open
          ? { color: ink, background: onDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' }
          : { color: ink, opacity: 0.85 }
      }
    >
      <Rabbit size={16} />
      <span className="hidden md:inline">Realm</span>
    </button>
  );
}

/** Cart — right-aligned in the lens row; hidden until something's in it. Ink
    flips for contrast against the solid accent bar; the count badge is the ink
    color with accent text so it reads on the bar. */
function CartIcon({ ink, onDark, accent }: { ink: string; onDark: boolean; accent: string }) {
  const cartCount = useCartStore((s) => s.count);
  if (cartCount === 0) return null;
  return (
    <Link
      to="/cart"
      aria-label={`Cart — ${cartCount} item${cartCount === 1 ? '' : 's'}`}
      title="Cart"
      className={cn(
        'relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md transition-colors',
        onDark ? 'hover:bg-white/10' : 'hover:bg-black/10',
      )}
      style={{ color: ink }}
    >
      <ShoppingCart size={16} />
      <span
        className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-semibold leading-none"
        style={{ background: ink, color: accent }}
      >
        {cartCount > 99 ? '99+' : cartCount}
      </span>
    </Link>
  );
}
