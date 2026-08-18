import { ASTRA_ROOMS } from '@/lib/astra-catalog';
import { cn } from '@/lib/utils';
import { LayoutGrid, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * THE ROOMS BUTTON — platform chrome, on EVERY SiteHeader, so it appears on
 * every non-community / non-chrome-free surface including /h24 (FRONT80,
 * ORACLE_MF v1.42 / v1.52 / v1.53, H24 DESIGN SPEC v0.7).
 *
 * It is TRANSPORT, NEVER A CONTROL: an on-demand grid-icon button that opens a
 * names-only overlay of the live astras and navigates on pick. The owner's line
 * verbatim — "constellations arent a dropdown that control your h24 experience."
 * So: no build states, no stub badges, no statuses of ANY kind reach a user
 * here (FRONT31 stands — states are admin). Names + accent ticks only.
 *
 * The list is `ASTRA_ROOMS` (astra-catalog.ts) = every astra that actually
 * mounts a live surface today (`mount !== 'stub'`); the derivation lives with
 * the data, not here, so it can never drift from the router.
 */
export function RoomsButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Rooms"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Rooms"
        className={cn(
          'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-text-silver transition-colors',
          'hover:bg-bg-elevated hover:text-text',
        )}
        data-rooms-button
      >
        <LayoutGrid size={16} />
      </button>

      {open && <RoomsOverlay onClose={() => setOpen(false)} />}
    </>
  );
}

function RoomsOverlay({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  // Names only, sorted for scannability. localeCompare is case-insensitive so
  // 'h24' and 'The Manual' sort by letter, not by case.
  const rooms = useMemo(
    () =>
      [...ASTRA_ROOMS].sort((a, b) =>
        a.wordmark.localeCompare(b.wordmark, undefined, { sensitivity: 'base' }),
      ),
    [],
  );

  // The astra whose route owns the current first path segment — marked
  // aria-current for the keyboard/AT reader. NOT a visible status.
  const activeSlug = pathname.split('/').filter(Boolean)[0] ?? '';

  // Focus the first room on open so the overlay is immediately keyboard-driven.
  useEffect(() => {
    const t = setTimeout(() => firstItemRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  // Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Click outside the panel closes. Delay so the opening click doesn't
  // immediately re-close it (SearchModal idiom).
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) onClose();
    };
    const t = setTimeout(() => document.addEventListener('mousedown', onDown), 50);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onDown);
    };
  }, [onClose]);

  const go = (route: string) => {
    onClose();
    navigate(route);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-20 md:pt-24"
      aria-modal="true"
      aria-label="Rooms"
      // biome-ignore lint/a11y/useSemanticElements: div+role=dialog for manual focus + outside-click handling, matching SearchModal.
      role="dialog"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative w-full max-w-lg animate-slide-in-right rounded-lg border border-border bg-bg-elevated shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span
            className="font-mono uppercase tracking-wider text-text-muted"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            Rooms
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close rooms"
            className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-bg hover:text-text"
          >
            <X size={14} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
            {rooms.map((entry, i) => {
              const isCurrent = entry.route === `/${activeSlug}`;
              return (
                <button
                  key={entry.slug}
                  ref={i === 0 ? firstItemRef : undefined}
                  type="button"
                  onClick={() => go(entry.route)}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={cn(
                    'group flex items-center gap-2.5 rounded-md px-3 py-2.5 text-left transition-colors',
                    'hover:bg-bg focus-visible:bg-bg focus-visible:outline-none',
                    isCurrent && 'bg-bg',
                  )}
                >
                  {/* Accent tick — the only non-text mark, per spec. */}
                  <span
                    aria-hidden
                    className="h-4 w-[3px] flex-shrink-0 rounded-full"
                    style={{ background: entry.accent }}
                  />
                  <span
                    className="min-w-0 truncate font-display font-medium text-text-silver group-hover:text-text"
                    style={{ fontSize: '14px' }}
                  >
                    {entry.wordmark}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
