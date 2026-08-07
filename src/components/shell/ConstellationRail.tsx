/* FRONT21 — the RIGHT sidebar: the rotating constellation.
   MMF §15.1 (locked Apr 25), restored to the record by ORACLE_MF v1.23: two
   sidebars by design — LEFT wears the current realm accent, RIGHT rotates
   through the Astra accent colours per page change. That rotation is
   CONSTELLATION IDENTITY, not taxonomy: it says "you are inside a constellation
   of many worlds", independent of which realm you are reading.

   The rail lists the FULL derived Astra set (lib/astra-catalog.ts) — every
   entry is a live route inside themanual.tech per ORACLE_MF v1.24, so nothing
   in this list is a dead link. */
import { ASTRA_CATALOG, effectiveStatus } from '@/lib/astra-catalog';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

/** The rotation ring — every Astra accent, in catalog order. */
const ACCENT_RING = ASTRA_CATALOG.map((a) => a.accent);

/** Module-scope so the rotation advances across surface navigations, not per
 *  mount. The rail is mounted once by PlatformLayout and persists. */
let rotationIndex = 0;

export function ConstellationRail({ className }: { className?: string }) {
  const { pathname } = useLocation();
  const [accent, setAccent] = useState(() => ACCENT_RING[rotationIndex % ACCENT_RING.length]);

  // One step per page change. `pathname` is the TRIGGER, not an input — the
  // next accent comes off the ring, not off the path — so the linter reads it
  // as an unnecessary dependency. It is the whole mechanism: dropping it would
  // rotate once per mount instead of once per page. Query and hash changes are
  // deliberately not triggers; they are the same page.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the rotation trigger, by design
  useEffect(() => {
    rotationIndex = (rotationIndex + 1) % ACCENT_RING.length;
    setAccent(ACCENT_RING[rotationIndex]);
  }, [pathname]);

  return (
    <aside
      className={cn('flex min-h-0 flex-col border-l border-border', className)}
      aria-label="The constellation"
      data-constellation-rail=""
    >
      {/* The rotating band — the constellation-identity signal itself. */}
      <div
        aria-hidden
        className="h-[3px] w-full flex-shrink-0 transition-colors duration-500"
        style={{ background: accent }}
      />
      <Link
        to="/constellation"
        className="flex-shrink-0 px-3 py-2.5 transition-colors hover:bg-bg-elevated"
      >
        <span
          className="block font-mono uppercase tracking-wider text-text-muted"
          style={{ fontSize: '10px' }}
          data-size="meta"
        >
          The HoneyComb
        </span>
        <span
          className="mt-0.5 block font-display font-semibold tracking-wide"
          style={{ fontSize: '13px', color: accent }}
        >
          {ASTRA_CATALOG.length} Astras
        </span>
      </Link>

      <nav className="min-h-0 flex-1 overflow-y-auto pb-3">
        {ASTRA_CATALOG.map((a) => {
          const active = pathname === a.route || pathname.startsWith(`${a.route}/`);
          return (
            <Link
              key={a.slug}
              to={a.route}
              className={cn(
                'flex items-center gap-2 px-3 py-1 transition-colors hover:bg-bg-elevated',
                active && 'bg-bg-elevated',
              )}
              title={`${a.wordmark} — ${effectiveStatus(a)}`}
            >
              <span
                aria-hidden
                className="h-3.5 w-[2px] flex-shrink-0 rounded-full"
                style={{ background: a.accent, opacity: active ? 1 : 0.55 }}
              />
              <span
                className={cn(
                  'min-w-0 flex-1 truncate',
                  active ? 'text-text' : 'text-text-silver',
                )}
                style={{ fontSize: '12px' }}
              >
                {a.wordmark}
              </span>
              {a.mount === 'stub' && (
                <span
                  className="flex-shrink-0 font-mono uppercase tracking-wider text-text-muted"
                  style={{ fontSize: '9px' }}
                  data-size="meta"
                >
                  stub
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
