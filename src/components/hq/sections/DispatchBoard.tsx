// HQ — Dispatch Board (launcher). MMF §19.8.
//
// The /mc mission-control board is a chrome-free full-page surface (it wears its
// own board chrome, FRONTHDR2) so it can't render inside the HQ pane. This
// section is its HQ entry point: a one-line summary + a launch link. Read-only;
// spawning stays in local mission control.

import { ArrowUpRight, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';

export function DispatchBoard() {
  return (
    <div>
      <header className="mb-4">
        <h2 className="font-display text-2xl font-semibold text-text-silver-bright">
          Dispatch Board
        </h2>
        <p className="mt-1 font-mono text-text-muted" style={{ fontSize: '11px' }}>
          the ops rail · build-progress board at /mc
        </p>
      </header>

      <p className="mb-6 max-w-2xl text-text-dim" style={{ fontSize: '13px' }}>
        The dispatch board is the live queue of lead-authored passes across every lane — claimed,
        in-flight, and done. It wears its own board chrome, so it opens full-page rather than inside
        HQ. Read-only from here; claiming and heartbeating happen at the terminal.
      </p>

      <Link
        to="/mc"
        className="inline-flex items-center gap-2 rounded-md border border-text-silver/40 bg-bg-elevated px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-bg hover:text-text-silver-bright"
      >
        <Radio size={15} aria-hidden />
        Open the board
        <ArrowUpRight size={14} aria-hidden />
      </Link>
    </div>
  );
}
