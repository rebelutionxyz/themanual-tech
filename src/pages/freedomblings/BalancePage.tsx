/* FreedomBLiNGS — Balance (Slice 1) · LIVE own-data.
   Ported pixel-faithfully from the design (surfaces.jsx → Balance), wired to the
   signed-in Bee's REAL ledger (bling_lots + bling_transactions) under owner-read
   RLS. The design's illustrative numbers (12,480 / 2,140 / 880 / 540 and the
   fixed bar widths) are NOT shipped — every figure here is read from prod (README
   rule 2). Genesis truth: no lots → 0.000000, rendered with dignity. Writes
   (GIVE/GET/OFFER) are deferred ("money last") — the action row is inert. */
import { BMark, HeroMark } from '@/components/freedomblings/marks';
import { type MovementRow, useFreedomblingsBalance } from '@/lib/freedomblings/ledger';

const TAG_LABEL: Record<string, string> = {
  freed: 'FREEd',
  got: 'GOT',
  given: 'GAVE',
  offer: 'OFFER',
};

function LedgerRow({ r }: { r: MovementRow }) {
  return (
    <div className="lrow">
      <div className={`l-ico${r.dir === 'pos' ? ' in' : ''}`}>
        <BMark fill={r.dir === 'pos'} />
      </div>
      <div className="l-main">
        <div className="l-desc">{r.desc}</div>
        <div className="l-meta">
          <span className={`l-tag ${r.kind}`}>{TAG_LABEL[r.kind]}</span>
          {r.who && <span className="who">{r.who}</span>}
        </div>
      </div>
      <div className="l-amt">
        <div className={`amt ${r.dir}`}>{r.amt}</div>
        {r.when && <div className="run num">{r.when}</div>}
      </div>
    </div>
  );
}

export function BalancePage() {
  const fb = useFreedomblingsBalance();

  if (fb.status === 'loading') {
    return (
      <main className="app-main">
        <div className="eyebrow">Your standing in the Freedom Ledger</div>
        <div className="feed-empty" style={{ marginTop: 16 }}>
          <span className="live-dot" /> Opening your ledger…
        </div>
      </main>
    );
  }

  if (fb.status === 'signed-out') {
    return (
      <main className="app-main">
        <div className="eyebrow">The Sovereign Ledger</div>
        <div className="state-card">
          <h2>Sign in to open your Freedom Ledger</h2>
          <p>
            Your BLiNG! balance is member-owned and read straight from the ledger. Sign in to see
            what you've FREE'd, GOT, and GAVE — in the open.
          </p>
          <a className="signin" href="/login">
            <BMark fill /> Sign in
          </a>
        </div>
      </main>
    );
  }

  if (fb.status === 'unavailable') {
    return (
      <main className="app-main">
        <div className="eyebrow">The Sovereign Ledger</div>
        <div className="state-card">
          <h2>Ledger unavailable</h2>
          <p>
            Couldn't reach your ledger just now. Nothing is lost — this is a read-only view; try
            again in a moment.
          </p>
        </div>
      </main>
    );
  }

  // ----- LIVE -----
  return (
    <main className="app-main">
      <div className="bal-top">
        <div className="bal-hero">
          <div className="eyebrow">Your standing in the Freedom Ledger</div>
          <div className="bal-amount">
            <HeroMark />
            <div className="big">{fb.balance}</div>
          </div>
          <div className="bal-unit">
            <b>BLiNG!</b> — your balance in the ledger, member-owned and capped
          </div>
        </div>
        <div className="standing-badge">
          <span className="sb-k">Standing</span>
          <span className="sb-v">In good comb</span>
        </div>
      </div>

      {/* GIVE / GET / OFFER — writes are deferred ("money last"); inert in Slice 1 */}
      <div className="bal-actions">
        <button type="button" className="bal-act primary" disabled>
          <BMark fill /> GIVE
        </button>
        <button type="button" className="bal-act" disabled>
          <BMark /> GET
        </button>
        <button type="button" className="bal-act" disabled>
          <BMark /> OFFER
        </button>
      </div>

      <div className="stat-grid">
        <div className="card stat">
          <div className="s-k">
            <span className="verb">FREEd</span> this season
          </div>
          <div className="s-v">
            <span className="n">{fb.freed}</span>
            <span className="u">BLiNG!</span>
          </div>
          <div className="bar">
            <i style={{ width: `${fb.freedPct}%` }} />
          </div>
        </div>
        <div className="card stat">
          <div className="s-k">
            <span style={{ color: 'var(--ink-soft)', fontWeight: 600 }}>GOT</span> from members
          </div>
          <div className="s-v">
            <span className="n">{fb.got}</span>
            <span className="u">BLiNG!</span>
          </div>
          <div className="bar">
            <i style={{ width: `${fb.gotPct}%` }} />
          </div>
        </div>
        <div className="card stat out">
          <div className="s-k">
            <span style={{ color: 'var(--ink-soft)', fontWeight: 600 }}>GAVE</span> to members
          </div>
          <div className="s-v">
            <span className="n">{fb.gave}</span>
            <span className="u">BLiNG!</span>
          </div>
          <div className="bar">
            <i style={{ width: `${fb.gavePct}%` }} />
          </div>
        </div>
      </div>

      <div className="assure">
        <div className="terms">
          <span className="pill">
            <BMark /> Capped supply
          </span>
          <span className="pill">
            <BMark /> Member-owned
          </span>
          <span className="pill">
            <BMark /> Fully transparent
          </span>
        </div>
        <span className="verify">
          Read the open ledger
          <span className="chev" />
        </span>
      </div>

      <div className="creed">
        <div className="eyebrow">The promise</div>
        <p>
          Every BLiNG! here was <em>FREE</em>d by what members make and do. No one prints it. No one
          can quietly take it. The ledger is yours to read, in full.
        </p>
      </div>

      <div className="recent">
        <div className="recent-head">
          <div className="eyebrow">Recent movement</div>
          <span className="seeall">See all in The Ledger →</span>
        </div>
        {fb.recent.length > 0 ? (
          <div className="ledger-list">
            {fb.recent.map((r) => (
              <LedgerRow key={r.id} r={r} />
            ))}
          </div>
        ) : (
          <div className="feed-empty">
            <span className="live-dot" /> No movement yet — your ledger begins the moment you first
            FREE.
          </div>
        )}
      </div>
    </main>
  );
}
