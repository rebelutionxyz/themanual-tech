import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { REALM_ORDER, FRONT_ORDER, FRONT_CLASS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Front } from '@/types/manual';

interface RealmBarProps {
  selectedRealm: string | null;
  selectedFront: Front | null;
  selectedL2: string | null;
  onSelectRealm: (realm: string | null) => void;
  onSelectFront: (front: Front | null) => void;
  onSelectL2: (l2: string | null) => void;
  realmSubs?: Record<string, string[]>;
}

const FRONT_SET = new Set<string>(FRONT_ORDER);

/**
 * Reusable horizontally-scrolling row with left/right chevron arrows.
 * Used for the realm row, Power Fronts+L2 row, and plain L2 row.
 */
function ScrollRow({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    // Observe children changes (when subs array updates) for dynamic realm switches
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amt = el.clientWidth * 0.6;
    el.scrollBy({ left: dir === 'left' ? -amt : amt, behavior: 'smooth' });
  };

  return (
    <div className={cn('relative flex items-center', className)}>
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll('left')}
          aria-label="Scroll left"
          className="absolute left-0 top-0 z-10 flex h-full items-center justify-center bg-gradient-to-r from-bg-elevated via-bg-elevated/90 to-transparent px-2 text-text-silver hover:text-text"
        >
          <ChevronLeft size={16} />
        </button>
      )}

      <div
        ref={scrollRef}
        className="scrollbar-none flex flex-1 items-center gap-1 overflow-x-auto px-3 py-2"
        style={{ scrollbarWidth: 'none' }}
      >
        {children}
      </div>

      {canScrollRight && (
        <button
          type="button"
          onClick={() => scroll('right')}
          aria-label="Scroll right"
          className="absolute right-0 top-0 z-10 flex h-full items-center justify-center bg-gradient-to-l from-bg-elevated via-bg-elevated/90 to-transparent px-2 text-text-silver hover:text-text"
        >
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}

export function RealmBar({
  selectedRealm,
  selectedFront,
  selectedL2,
  onSelectRealm,
  onSelectFront,
  onSelectL2,
  realmSubs = {},
}: RealmBarProps) {
  const isPowerActive = selectedRealm === 'Power';
  const allSubs = selectedRealm ? realmSubs[selectedRealm] ?? [] : [];
  const nonFrontSubs = allSubs.filter((s) => !FRONT_SET.has(s));

  const showL2Row = selectedRealm && !isPowerActive && nonFrontSubs.length > 0;
  const showPowerRow = isPowerActive;

  return (
    <div className="sticky top-0 z-30 border-b border-border bg-bg-elevated/95 backdrop-blur-md">
      {/* Primary realm row */}
      <ScrollRow>
        <RealmChip
          label="All"
          active={selectedRealm === null}
          onClick={() => {
            onSelectRealm(null);
            onSelectFront(null);
            onSelectL2(null);
          }}
        />
        <div className="h-5 w-px flex-shrink-0 bg-border" aria-hidden="true" />
        {REALM_ORDER.map((realm) => (
          <RealmChip
            key={realm}
            label={realm}
            active={selectedRealm === realm}
            onClick={() => {
              onSelectRealm(selectedRealm === realm ? null : realm);
              onSelectFront(null);
              onSelectL2(null);
            }}
          />
        ))}
      </ScrollRow>

      {/* POWER ROW: Fronts + L2s with divider (Option B) */}
      {showPowerRow && (
        <ScrollRow className="border-t border-border bg-bg/40">
          {FRONT_ORDER.map((front) => (
            <button
              key={front}
              type="button"
              onClick={() => {
                onSelectFront(selectedFront === front ? null : front);
                onSelectL2(null);
              }}
              className={cn(
                'flex-shrink-0 rounded-md border px-2.5 py-1 transition-colors',
                'font-display tracking-wide',
                FRONT_CLASS[front],
                selectedFront === front
                  ? 'border-current bg-current/10'
                  : 'border-transparent hover:border-current/40 hover:bg-bg-elevated',
              )}
              style={{ fontSize: '13px' }}
            >
              {front}
            </button>
          ))}

          {nonFrontSubs.length > 0 && (
            <div className="mx-2 h-5 w-px flex-shrink-0 bg-border" aria-hidden="true" />
          )}

          {nonFrontSubs.map((sub) => (
            <L2Chip
              key={sub}
              label={sub}
              active={selectedL2 === sub}
              onClick={() => {
                onSelectL2(selectedL2 === sub ? null : sub);
                onSelectFront(null);
              }}
            />
          ))}
        </ScrollRow>
      )}

      {/* L2 row for non-Power realms */}
      {showL2Row && (
        <ScrollRow className="border-t border-border bg-bg/40">
          {nonFrontSubs.map((sub) => (
            <L2Chip
              key={sub}
              label={sub}
              active={selectedL2 === sub}
              onClick={() => onSelectL2(selectedL2 === sub ? null : sub)}
            />
          ))}
        </ScrollRow>
      )}
    </div>
  );
}

function RealmChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-shrink-0 rounded-md border px-3 py-1.5 font-medium tracking-wide transition-all',
        active
          ? 'border-text-silver/50 bg-bg text-text'
          : 'border-transparent text-text-dim hover:bg-bg hover:text-text-silver',
      )}
      style={{ fontSize: '13px' }}
    >
      {label}
    </button>
  );
}

function L2Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-shrink-0 rounded-md border px-2.5 py-1 text-text-silver transition-colors',
        active
          ? 'border-text-silver/40 bg-bg-elevated text-text'
          : 'border-transparent hover:border-border hover:bg-bg-elevated',
      )}
      style={{ fontSize: '12px' }}
    >
      {label}
    </button>
  );
}
