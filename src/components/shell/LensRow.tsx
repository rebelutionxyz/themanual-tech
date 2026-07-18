import { Popup, TimePresetPanel } from '@/components/layout/lensPanels';
import { BlingPopup, readableInk } from '@/components/shell/BottomToolbar';
import { LocationPanel } from '@/components/shell/LocationPanel';
import { ModalLink } from '@/components/shell/ModalLink';
import { RealmTreeContent } from '@/components/shell/RealmTreeSlider';
import { SearchPanel } from '@/components/shell/SearchDropdown';
import { HoneyDrop } from '@/components/ui/HoneyDrop';
import { useAuth } from '@/lib/auth';
import { timePresetLabel } from '@/lib/timePresets';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/stores/useCartStore';
import { useLensStore } from '@/stores/useLensStore';
import { Clock, type LucideIcon, MapPin, Rabbit, Search, ShoppingCart } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';

// Realm + Search joined the anchored-dropdown family 2026-07-18 (Butch) —
// every top-bar control now opens the same way as Location/Time.
type LensId = 'location' | 'time' | 'realm' | 'search';

/**
 * Horizontal lens bar at the top of the community center column —
 * [identity · BLiNG!] left, [Search · Location · Time · Realm · Cart] right.
 * Search and Realm open anchored dropdowns like Location/Time: Search shows
 * its results INSIDE the dropdown; Realm hosts the lazy taxonomy tree.
 */
export function LensRow({ accent }: { accent: string }) {
  const { bee } = useAuth();
  const [openLens, setOpenLens] = useState<LensId | null>(null);
  const [blingOpen, setBlingOpen] = useState(false);
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

  // Wider panels for the content-bearing dropdowns.
  const popWidth =
    openLens === 'search' ? 400 : openLens === 'realm' || openLens === 'location' ? 330 : 300;
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

  // Time lens — selected preset shows inline after the clock; null = "Time".
  const timePreset = useLensStore((s) => s.timePreset);
  const timeLabel = timePresetLabel(timePreset) ?? 'Time';

  // ONE shared lens, two doors (Butch 2026-07-18): topic realms open via
  // the rabbit, Geography (locations live in the realm taxonomy) via the
  // pin. Chips render behind the Astra name; feeds filter via the shared
  // prefix. Counts/labels split by whether the selection is under Geography.
  const selectedRealms = useLensStore((s) => s.selectedRealms);
  const geoSelections = selectedRealms.filter((r) => r.pathParts[0] === 'Geography');
  const topicSelections = selectedRealms.filter((r) => r.pathParts[0] !== 'Geography');
  const realmCount = topicSelections.length;
  const realmLabel = realmCount > 0 ? `Realm · ${realmCount}` : 'Realm';
  const locCount = geoSelections.length;
  const locLabel =
    locCount === 1 ? geoSelections[0].name : locCount > 1 ? `Location · ${locCount}` : 'Location';
  const locActive = locCount > 0;

  return (
    // Spans only the center content column. SOLID Astra accent — matches the
    // bottom toolbar (BottomToolbar uses the same `accent`). Horizontal
    // touch-scroller so the labelled lenses never clip on a narrow viewport.
    <div
      className="flex h-11 flex-shrink-0 items-center gap-1 overflow-x-auto px-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ background: accent }}
    >
      {/* LEFT group — identity + BLiNG!, moved up from the bottom toolbar
          (Butch 2026-07-18). Floats left; the lens group floats right via
          SearchLens's ml-auto. */}
      {bee ? (
        <ModalLink
          to="/profile"
          title={`@${bee.handle}`}
          aria-label={`Profile — @${bee.handle}`}
          className={cn(
            'flex max-w-[160px] flex-shrink-0 items-center gap-2 rounded-md px-1.5 py-1 transition-colors',
            onDark ? 'hover:bg-white/10' : 'hover:bg-black/10',
          )}
        >
          <span
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md font-display text-[13px] font-semibold"
            style={{
              background: onDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.14)',
              color: ink,
            }}
          >
            {bee.handle.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 truncate text-[13px] font-medium" style={{ color: ink }}>
            @{bee.handle}
          </span>
        </ModalLink>
      ) : (
        <Link
          to="/login"
          className={cn(
            'flex-shrink-0 rounded-md px-2.5 py-1.5 text-[13px] font-semibold transition-colors',
            onDark ? 'hover:bg-white/10' : 'hover:bg-black/10',
          )}
          style={{ color: ink }}
        >
          Sign in
        </Link>
      )}
      <button
        type="button"
        onClick={() => setBlingOpen(true)}
        title="BLiNG!"
        aria-label="BLiNG!"
        className={cn(
          'flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] transition-colors',
          onDark ? 'hover:bg-white/10' : 'hover:bg-black/10',
        )}
        style={{ color: ink, opacity: 0.9 }}
      >
        <HoneyDrop size={16} style={{ color: ink }} />
        <span className="hidden md:inline">BLiNG!</span>
      </button>

      {/* ml-auto on the first control floats the lens group (and the trailing
          Cart) to the RIGHT edge of the row. Degrades to 0 when the row
          overflows on narrow screens, so the touch-scroller still reaches
          every control. */}
      <LensButton
        icon={Search}
        label="Search"
        ink={ink}
        onDark={onDark}
        active={openLens === 'search'}
        onClick={(b) => openAt('search', b)}
        className="ml-auto"
      />
      <LensButton
        icon={MapPin}
        label={locLabel}
        ink={ink}
        onDark={onDark}
        active={openLens === 'location' || locActive}
        onClick={(b) => openAt('location', b)}
        mobileText={locActive ? locLabel : undefined}
      />
      <LensButton
        icon={Clock}
        label={timeLabel}
        ink={ink}
        onDark={onDark}
        active={openLens === 'time' || timePreset != null}
        onClick={(b) => openAt('time', b)}
        mobileText={timePreset != null ? timeLabel : undefined}
      />

      {/* White Rabbit — the realm-tree DROPDOWN (2026-07-18), same anchored
          pattern as Location/Time. */}
      <LensButton
        icon={Rabbit}
        label={realmLabel}
        ink={ink}
        onDark={onDark}
        active={openLens === 'realm' || realmCount > 0}
        onClick={(b) => openAt('realm', b)}
        mobileText={realmCount > 0 ? String(realmCount) : undefined}
      />

      {/* Cart — sits at the right end of the floated group. */}
      <CartIcon ink={ink} onDark={onDark} accent={accent} />

      {/* BLiNG! popup — portals itself to <body>. */}
      {blingOpen && <BlingPopup onClose={() => setBlingOpen(false)} />}

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
                {/* The Geography branch of the realm tree — drill USA → NY →
                    NYC → SoHo; picks drive the shared lens. */}
                <div className="max-h-[55vh] overflow-y-auto rounded-md bg-white">
                  <LocationPanel />
                </div>
              </Popup>
            )}
            {openLens === 'time' && (
              <Popup title="Time" style={popStyle} onClose={() => setOpenLens(null)}>
                <TimePresetPanel onClose={() => setOpenLens(null)} />
              </Popup>
            )}
            {openLens === 'realm' && (
              <Popup title="Realm" style={popStyle} onClose={() => setOpenLens(null)}>
                {/* White card inside the silver panel so the tree keeps its
                    own light styling; capped height, own scroll. */}
                <div className="max-h-[55vh] overflow-y-auto rounded-md bg-white">
                  {/* Topic realms only — Geography has its own door (Location). */}
                  <RealmTreeContent excludeRoots={['Geography']} />
                </div>
              </Popup>
            )}
            {openLens === 'search' && (
              <Popup title="Search" style={popStyle} onClose={() => setOpenLens(null)}>
                <SearchPanel
                  standingOn={window.location.pathname.split('/')[1] || 'intel'}
                  onNavigate={() => setOpenLens(null)}
                />
              </Popup>
            )}
          </>,
          document.body,
        )}
    </div>
  );
}

// SearchLens (inline bar-expanding search that filtered the feed) retired
// 2026-07-18 — Search is an anchored dropdown with results inside
// (SearchDropdown.tsx). useLensStore.searchTerm is no longer set from here.

function LensButton({
  icon: Icon,
  label,
  ink,
  onDark,
  active,
  onClick,
  className,
  mobileText,
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
  /** Shown NEXT TO the icon on mobile (informative selections: counts, picks). */
  mobileText?: string;
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
      {/* Desktop: icon + label. Mobile (<md): icon only — unless there's an
          informative selection (mobileText) worth the space (Butch 2026-07-18). */}
      <span className="hidden md:inline">{label}</span>
      {mobileText != null && <span className="md:hidden">{mobileText}</span>}
    </button>
  );
}

// RabbitButton (toggled the right-column realm slide-over) retired
// 2026-07-18 — Realm is now a LensButton opening the anchored dropdown above.

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
