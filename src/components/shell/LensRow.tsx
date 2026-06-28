import { SearchModal } from '@/components/layout/SearchModal';
import { Popup, StubPanel, TimePanel } from '@/components/layout/lensPanels';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/stores/useCartStore';
import { useLensStore } from '@/stores/useLensStore';
import { useRealmTreeStore } from '@/stores/useRealmTreeStore';
import { Clock, type LucideIcon, MapPin, Rabbit, Search, ShoppingCart } from 'lucide-react';
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
  const [searchOpen, setSearchOpen] = useState(false);
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

  return (
    // Spans only the center content column. Horizontal touch-scroller so the
    // labelled lenses never clip on a narrow viewport. Background is a pale wash
    // of the Astra accent — the light counterpart to the solid-accent bottom bar.
    <div
      className="flex h-11 flex-shrink-0 items-center gap-1 overflow-x-auto border-b border-zinc-200 px-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ background: `${accent}14` }}
    >
      {/* ml-auto on the first control floats the whole Search/Location/Time
          group (and the trailing Cart) to the RIGHT edge of the row. Degrades
          to 0 when the row overflows on narrow screens, so the touch-scroller
          still reaches every control.
          NOTE: there is no "Realm" control in this row — the 14-realm picker is
          the separate persistent RealmStrip below (pass 18). Not added here. */}
      <LensButton
        icon={Search}
        label="Search"
        accent={accent}
        className="ml-auto"
        onClick={() => setSearchOpen(true)}
      />
      <LensButton
        icon={MapPin}
        label="Location"
        accent={accent}
        active={openLens === 'location'}
        onClick={(b) => openAt('location', b)}
      />
      <LensButton
        icon={Clock}
        label="Time"
        accent={accent}
        active={openLens === 'time'}
        onClick={(b) => openAt('time', b)}
      />

      {/* White Rabbit — toggles the right-column realm-tree slider. Reuses the
          lucide Rabbit icon from the INTEL composer's atom picker. The
          data-rabbit-toggle hook lets the slider's click-outside guard ignore
          this button (no close-then-reopen race). */}
      <RabbitButton />

      {/* Cart — sits at the right end of the floated group. */}
      <CartIcon accent={accent} />

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

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

function LensButton({
  icon: Icon,
  label,
  accent,
  active,
  onClick,
  className,
}: {
  icon: LucideIcon;
  label: string;
  accent: string;
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
        active ? 'font-semibold' : 'text-zinc-600 hover:bg-zinc-100',
        className,
      )}
      style={active ? { color: accent, background: `${accent}14` } : undefined}
    >
      <Icon size={16} style={active ? { color: accent } : undefined} />
      {/* Desktop: icon + label. Mobile (<md): icons only. */}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

/** The Realm control (White Rabbit motif) — toggles the right-column realm
    sidebar (multi-select), the single home for realm nav. Shows the SELECTION
    COUNT as a badge and is lit when ≥1 realm is selected. Renders WHITE (the
    white-rabbit motif) to read on the solid-accent toolbar; active = a subtle
    white highlight (not the accent). Icon-only at all breakpoints — no visible
    label (aria-label + title keep it named). */
function RabbitButton() {
  const open = useRealmTreeStore((s) => s.open);
  const toggle = useRealmTreeStore((s) => s.toggle);
  const count = useLensStore((s) => s.selectedRealms.length);
  const lit = open || count > 0;

  return (
    <button
      type="button"
      data-rabbit-toggle
      onClick={() => toggle()}
      title={count > 0 ? `Realms — ${count} selected` : 'Realms'}
      aria-label="Realms"
      aria-pressed={open}
      className={cn(
        'flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] text-white transition-colors',
        lit ? 'font-semibold' : 'hover:bg-white/10',
      )}
      style={lit ? { background: 'rgba(255,255,255,0.22)' } : undefined}
    >
      {/* Always white in every state (default / hover / active) — never the
          accent, which makes it vanish on the toolbar. Icon-only: no visible
          label (aria-label + title keep it named). */}
      <Rabbit size={16} color="#ffffff" />
      {count > 0 && (
        <span className="inline-flex h-4 min-w-4 flex-shrink-0 items-center justify-center rounded-full bg-white/25 px-1 text-[10px] font-semibold leading-none text-white">
          {count}
        </span>
      )}
    </button>
  );
}

/** Cart — right-aligned in the lens row; hidden until something's in it. The
    accent reads cleanly on the row's pale-tint background. */
function CartIcon({ accent }: { accent: string }) {
  const cartCount = useCartStore((s) => s.count);
  if (cartCount === 0) return null;
  return (
    <Link
      to="/cart"
      aria-label={`Cart — ${cartCount} item${cartCount === 1 ? '' : 's'}`}
      title="Cart"
      className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md transition-colors hover:bg-black/5"
      style={{ color: accent }}
    >
      <ShoppingCart size={16} />
      <span
        className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-semibold leading-none text-white"
        style={{ background: accent }}
      >
        {cartCount > 99 ? '99+' : cartCount}
      </span>
    </Link>
  );
}
