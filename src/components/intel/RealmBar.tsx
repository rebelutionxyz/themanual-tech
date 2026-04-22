import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { REALM_ORDER, FRONT_ORDER, FRONT_CLASS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface RealmBarProps {
  selectedRealm: string | null;
  selectedFront: string | null;
  selectedL2: string | null;
  onSelectRealm: (realm: string | null) => void;
  onSelectFront: (front: string | null) => void;
  onSelectL2: (l2: string | null) => void;
  /** Optional: sub-categories per realm (e.g., L2 nodes from the tree) */
  realmSubs?: Record<string, string[]>;
}

/**
 * Top realm bar for INTEL surface.
 * - 13 realms in flow order, horizontally scrollable
 * - Power is last; selecting Power expands to show 5 Fronts
 * - Selecting a realm reveals its L2 sub-categories below
 * - Retractable scroll arrows on desktop for overflow
 */
export function RealmBar({
  selectedRealm,
  selectedFront,
  selectedL2,
  onSelectRealm,
  onSelectFront,
  onSelectL2,
  realmSubs = {},
}: RealmBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Update scroll indicators when content changes or container resizes
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const updateScrollState = () => {
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };

    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.6;
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  const isPowerActive = selectedRealm === 'Power';
  const subs = selectedRealm && selectedRealm !== 'Power' ? realmSubs[selectedRealm] ?? [] : [];

  return (
    <div className="sticky top-0 z-30 border-b border-border bg-bg-elevated/95 backdrop-blur-md">
      {/* Main realm row */}
      <div className="relative flex items-center">
        {/* Scroll left arrow */}
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
          {/* "All" chip — clear realm filter */}
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

          {/* 13 Realms in flow order */}
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
        </div>

        {/* Scroll right arrow */}
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

      {/* Power Fronts — only visible when Power realm is active */}
      {isPowerActive && (
        <div className="flex items-center gap-1 overflow-x-auto border-t border-border bg-bg/40 px-3 py-2">
          <span
            className="mr-2 flex-shrink-0 font-mono uppercase tracking-wider text-text-muted"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            Fronts:
          </span>
          {FRONT_ORDER.map((front) => (
            <button
              key={front}
              type="button"
              onClick={() => onSelectFront(selectedFront === front ? null : front)}
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
        </div>
      )}

      {/* L2 sub-categories — shown when a non-Power realm is active AND has subs */}
      {subs.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto border-t border-border bg-bg/40 px-3 py-2">
          {subs.map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => onSelectL2(selectedL2 === sub ? null : sub)}
              className={cn(
                'flex-shrink-0 rounded-md border px-2.5 py-1 text-text-silver transition-colors',
                selectedL2 === sub
                  ? 'border-text-silver/40 bg-bg-elevated text-text'
                  : 'border-transparent hover:border-border hover:bg-bg-elevated',
              )}
              style={{ fontSize: '12px' }}
            >
              {sub}
            </button>
          ))}
        </div>
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
