import { useState, useRef, useEffect, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScrollRowProps {
  className?: string;
  /** Optional label/content pinned to the left, doesn't scroll */
  leading?: ReactNode;
  children: ReactNode;
}

/**
 * Reusable horizontally-scrolling row with left/right chevron arrows.
 * Used in RealmBar (realm row, L2 row, Fronts row) + L3Refinement.
 */
export function ScrollRow({ className, leading, children }: ScrollRowProps) {
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
      {leading && (
        <div className="flex-shrink-0 pl-3 pr-1">
          {leading}
        </div>
      )}

      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll('left')}
          aria-label="Scroll left"
          className="absolute top-0 z-10 flex h-full items-center justify-center bg-gradient-to-r from-bg-elevated via-bg-elevated/90 to-transparent px-2 text-text-silver hover:text-text"
          style={{ left: leading ? 64 : 0 }}
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

/** Small uppercase row label — used as leading prop for Subs, Fronts, Refine */
export function RowLabel({ children }: { children: ReactNode }) {
  return (
    <span
      className="font-mono uppercase tracking-wider text-text-muted"
      style={{ fontSize: '10.5px' }}
      data-size="meta"
    >
      {children}
    </span>
  );
}
