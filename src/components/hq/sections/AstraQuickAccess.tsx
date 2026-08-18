// HQ — Astra Quick Access (FRONT82, ORACLE_MF v1.53).
//
// The constellation's ONE admin home as navigation, relocated here from the
// retired per-surface ConstellationRail (v1.52 de-scatter). Operator
// convenience: a jump list to the live astras, admin-gated by HQControlRoom.
//
// LIVE ASTRAS ONLY — v1.53, verbatim: "An astra appears iff it actually mounts
// and routes today. NO stub rows, NO 'coming soon', NO build-state badges for
// worlds that do not exist ... never list the unbuilt at all." So this reads
// `ASTRA_ROOMS` (astra-catalog.ts) — the same `mount !== 'stub'` derivation the
// FRONT80 rooms overlay uses — and shows names + accent ticks + the route only.
// NO statuses. The full catalog WITH build states lives in the separate
// "Astra Status" monitoring panel; this is transport, not a status board.
//
// This is the OPERATOR twin of the user-facing Rooms button — same live-only
// content, a different audience and placement (the /hq cockpit, alongside the
// v1.48 provider switches and the rail board).

import { ASTRA_ROOMS } from '@/lib/astra-catalog';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';

export function AstraQuickAccess() {
  // Alphabetical by wordmark, case-insensitive — same order as the Rooms overlay.
  const rooms = useMemo(
    () =>
      [...ASTRA_ROOMS].sort((a, b) =>
        a.wordmark.localeCompare(b.wordmark, undefined, { sensitivity: 'base' }),
      ),
    [],
  );

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl font-semibold text-text-silver-bright">Quick Access</h2>
        <p className="mt-1 font-mono text-text-muted" style={{ fontSize: '11px' }}>
          {/* Count derived from what mounts, never hard-coded — grows as astras
              flip from stub to a live surface. */}
          {rooms.length} live astras · jump to any surface · live routes only, no stubs
        </p>
      </header>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((entry) => (
          <Link
            key={entry.slug}
            to={entry.route}
            className="group flex items-center gap-2.5 rounded-md border border-border bg-bg-elevated/40 px-3 py-2.5 transition-colors hover:border-border-bright hover:bg-bg-elevated"
          >
            {/* Accent tick — the only non-text mark, matching the Rooms overlay. */}
            <span
              aria-hidden
              className="h-6 w-[3px] flex-shrink-0 rounded-full"
              style={{ background: entry.accent }}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-text-silver group-hover:text-text" style={{ fontSize: '13px' }}>
                {entry.wordmark}
              </span>
              <span className="block truncate font-mono text-text-muted" style={{ fontSize: '11px' }} data-size="meta">
                {entry.route}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
