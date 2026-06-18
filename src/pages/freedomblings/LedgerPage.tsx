import { LedgerRow } from '@/components/freedomblings/LedgerRow';
import { ProvenanceOverlay } from '@/components/freedomblings/ProvenanceOverlay';
import { BMark } from '@/components/freedomblings/marks';
import { type ProvTx, useFreedomblingsLedger } from '@/lib/freedomblings/ledger';
/* FreedomBLiNGS — The Ledger (Slice 2) · LIVE own-data.
   Ported from surfaces.jsx → Ledger: grouped-by-day history, append-only footer,
   filter chips. Fed by the signed-in Bee's real bling_transactions under
   owner-read RLS (latest 200, newest first, oldest last within a day). Every
   amount obeys the Sacred-Sum string discipline (BigInt micros). Genesis truth:
   an empty ledger renders the dignified empty state. Rows with an amount are
   clickable → Provenance. */
import { useState } from 'react';

const FILTERS = [
  { k: 'all', label: 'All movement' },
  { k: 'freed', label: 'FREEd' },
  { k: 'got', label: 'GOT' },
  { k: 'given', label: 'GAVE' },
  { k: 'offer', label: 'OFFERS' },
];

export function LedgerPage() {
  const led = useFreedomblingsLedger();
  const [filter, setFilter] = useState('all');
  const [prov, setProv] = useState<ProvTx | null>(null);

  if (led.status === 'loading') {
    return (
      <main className="app-main">
        <div className="eyebrow">The Sovereign Ledger</div>
        <div className="feed-empty" style={{ marginTop: 16 }}>
          <span className="live-dot" /> Opening your ledger…
        </div>
      </main>
    );
  }

  if (led.status === 'signed-out') {
    return (
      <main className="app-main">
        <div className="eyebrow">The Sovereign Ledger</div>
        <div className="state-card">
          <h2>Sign in to read your ledger</h2>
          <p>
            Every movement of your BLiNG! is member-owned and read straight from the ledger. Sign in
            to see where it came from and where it went.
          </p>
          <a className="signin" href="/login">
            <BMark fill /> Sign in
          </a>
        </div>
      </main>
    );
  }

  if (led.status === 'unavailable') {
    return (
      <main className="app-main">
        <div className="eyebrow">The Sovereign Ledger</div>
        <div className="state-card">
          <h2>Ledger unavailable</h2>
          <p>
            Couldn't reach your ledger just now. This is a read-only view; try again in a moment.
          </p>
        </div>
      </main>
    );
  }

  // ----- LIVE -----
  const groups = led.groups
    .map((g) => ({ ...g, rows: g.rows.filter((r) => filter === 'all' || r.kind === filter) }))
    .filter((g) => g.rows.length);

  return (
    <main className="app-main">
      <div className="ledger-top">
        <div>
          <div className="eyebrow">The Sovereign Ledger</div>
          <h1>The Ledger</h1>
          <div className="sub">
            Every movement of your BLiNG!, in the open — where it came from and where it went.
          </div>
        </div>
        <div className="ledger-summary">
          <div className="ls-item">
            <div className="k">Balance</div>
            <div className="v">
              <BMark fill /> {led.balance}
            </div>
          </div>
          <div className="ls-item">
            <div className="k">This week</div>
            <div className="v" style={{ color: 'var(--accent-deep)' }}>
              {led.weekDelta}
            </div>
          </div>
        </div>
      </div>

      <div className="filters">
        {FILTERS.map((f) => {
          const on = filter === f.k;
          return (
            <button
              key={f.k}
              type="button"
              className={`chip${on ? ' active' : ''}`}
              onClick={() => setFilter(f.k)}
            >
              {on && <BMark />}
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="ledger-list">
        {groups.map((g) => (
          <div key={g.day}>
            <div className="day-head">
              <span className="d-label">{g.day}</span>
              <span className="d-line" />
              {filter === 'all' && <span className="d-sum">{g.sum} BLiNG!</span>}
            </div>
            {g.rows.map((r) => (
              <LedgerRow
                key={r.id}
                r={{
                  kind: r.kind,
                  dir: r.dir,
                  desc: r.desc,
                  who: r.who,
                  amt: r.amt,
                  sub: `${r.run} bal.`,
                }}
                onTrace={() => setProv(r.tx)}
              />
            ))}
          </div>
        ))}
        {!groups.length && (
          <div className="feed-empty">
            <span className="live-dot" />{' '}
            {filter === 'all'
              ? 'No movement yet — your ledger begins the moment you first FREE.'
              : 'No movement to show under this filter.'}
          </div>
        )}
      </div>

      <div className="ledger-foot">
        <span className="seal" />
        Append-only and member-owned. Nothing here can be edited or erased — only added to, in the
        open.
      </div>

      {prov && <ProvenanceOverlay entry={prov} onClose={() => setProv(null)} />}
    </main>
  );
}
