import { SearchModal } from '@/components/layout/SearchModal';
import { Popup, StubPanel, TimePanel } from '@/components/layout/lensPanels';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/stores/useCartStore';
import { Clock, type LucideIcon, MapPin, Search, ShoppingCart } from 'lucide-react';
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
      <LensButton
        icon={Search}
        label="Search"
        accent={accent}
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

      {/* Cart — floats hard right (moved here from the old rail header). */}
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
}: {
  icon: LucideIcon;
  label: string;
  accent: string;
  active?: boolean;
  onClick: (btn: HTMLButtonElement) => void;
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
      )}
      style={active ? { color: accent, background: `${accent}14` } : undefined}
    >
      <Icon size={16} style={active ? { color: accent } : undefined} />
      <span>{label}</span>
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
      className="relative ml-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md transition-colors hover:bg-black/5"
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
