/* FreedomBLiNGS — The Open Books (Slice 3) · PUBLIC, LIVE.
   Ported from openbooks.jsx: the genesis-truth economy dashboard. Renders for
   everyone (no auth gate) off the public-read bling_system_state row. Verified
   from prod — see useOpenBooks(). No fabricated numbers: the Sacred Sum, well,
   supply %, and Operations Buckets are live; the Comb Tithe carries an
   "illustrative until wired" note while offer_donation_pct ≠ canon. */
import { HeroMark } from '@/components/freedomblings/marks';
import { useOpenBooks } from '@/lib/freedomblings/openbooks';

function OBStat({ k, v, sub }: { k: string; v: string; sub: string }) {
  return (
    <div className="card ob-stat">
      <div className="obs-k">{k}</div>
      <div className="obs-v">
        <span className="num n">{v}</span>
      </div>
      <div className="obs-sub">{sub}</div>
    </div>
  );
}

const FAUCETS = [
  { k: 'Genesis', d: 'founding & onboarding issuance' },
  { k: 'Drops', d: 'yield for productive action — what you do' },
  { k: 'Drips', d: 'yield for popularity & curation — what others value in what you make' },
];

export function OpenBooksPage() {
  const ob = useOpenBooks();

  if (ob.status === 'loading') {
    return (
      <main className="app-main">
        <div className="eyebrow">Public to every member · always</div>
        <div className="feed-empty" style={{ marginTop: 16 }}>
          <span className="live-dot" /> Opening the books…
        </div>
      </main>
    );
  }

  if (ob.status === 'unavailable') {
    return (
      <main className="app-main">
        <div className="eyebrow">The Open Books</div>
        <div className="state-card">
          <h2>The books are unreachable</h2>
          <p>
            Couldn't read the economy state just now. This is a public read-only view; try again in
            a moment.
          </p>
        </div>
      </main>
    );
  }

  // ----- LIVE -----
  const capAnatomy = [
    {
      dia: 'fill',
      k: 'The well · Royal Jelly Treasury',
      fig: ob.well,
      hint: "the live unFREE'd reserve — drains as BLiNG! is FREE'd, refills as it melts back",
    },
    {
      dia: 'out',
      k: 'Operations Buckets',
      fig: ob.opsBuckets,
      hint: 'a protected carve-out, allocated outside the well at genesis',
    },
    {
      dia: 'ghost',
      k: "FREE'd to Sovereign Beeings",
      fig: ob.totalSupply,
      hint: 'grows only as members do and create — never pre-seeded',
    },
  ];

  return (
    <main className="app-main">
      <div className="ledger-top">
        <div>
          <div className="eyebrow">Public to every member · always</div>
          <h1>The Open Books</h1>
          <div className="sub">
            The whole economy, in the open. No member sees a different set of numbers than any other
            — verified against the ledger itself.
          </div>
        </div>
        <div className="pill ob-live">
          <span className="live-dot" />
          Live · sealed at genesis
        </div>
      </div>

      <div className="card ob-supply">
        <div className="ob-supply-head">
          <div>
            <div className="eyebrow">The Sacred Sum · lifetime cap, fixed by the Charter</div>
            <div className="ob-supply-fig">
              <HeroMark />
              <span className="sacred-num">{ob.sacredSum}</span>
            </div>
            <div className="palindrome">
              An 18-digit palindrome — the one number that can never grow.
            </div>
          </div>
          <div className="ob-supply-pct">
            <span className="num">
              {ob.freedPctLabel}
              <span className="pct-s">%</span>
            </span>
            <span className="ob-pct-l">of the cap FREE'd</span>
          </div>
        </div>
        <div className="supply-meter">
          <i style={{ width: `${Math.max(0, Math.min(100, ob.freedPct))}%` }} />
        </div>
        <div className="supply-legend">
          <span>
            Supply begins at <b className="num">0</b>
          </span>
          <span>BLiNG! is FREE'd only by what members do</span>
          <span>The well holds the rest</span>
        </div>
      </div>

      <div className="ob-stats">
        <OBStat k="FREE'd to date" v={ob.totalSupply} sub="not one BLiNG! pre-seeded" />
        <OBStat k="In Beeings' hands" v={ob.totalSupply} sub="grows only by earning" />
        <OBStat k="Operations Buckets" v={ob.opsBuckets} sub="outside the well, at genesis" />
        <OBStat
          k="Comb Tithe"
          v={ob.combTithe}
          sub={
            ob.titheIllustrative
              ? 'opt-out donation · illustrative until wired'
              : 'opt-out donation to the commons'
          }
        />
      </div>

      <div className="ob-grid">
        <div className="card ob-panel">
          <h3>How the Sacred Sum stands</h3>
          <p className="ob-panel-sub">
            Every BLiNG! is accounted for, at all times — held in the well until it is FREE'd by
            real, productive action.
          </p>
          {ob.balanced ? (
            <div className="cap-list">
              {capAnatomy.map((c) => (
                <div className="cap-row" key={c.k}>
                  <div className="cap-name">
                    <span className={`cap-dia ${c.dia}`} />
                    {c.k}
                  </div>
                  <div className="cap-fig num">
                    {c.fig}
                    <span className="cap-u"> BLiNG!</span>
                  </div>
                  <div className="cap-hint">{c.hint}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="ob-imbalance">
              <span className="live-dot" />
              <div>
                <b>Books out of balance.</b> The well, Operations Buckets and FREE'd total don't sum
                to the Sacred Sum. The slices are held back until the ledger reconciles — better a
                visible flag than wrong numbers.
              </div>
            </div>
          )}
        </div>

        <div className="card ob-panel">
          <h3>How BLiNG! is FREE'd</h3>
          <p className="ob-panel-sub">
            It enters existence only through the faucets — never printed, never sold. Each is a
            moment of recognition.
          </p>
          <div className="faucet-list">
            {FAUCETS.map((f) => (
              <div className="faucet-item" key={f.k}>
                <span className="fi-mark" />
                <div>
                  <div className="fi-k">{f.k}</div>
                  <div className="fi-d">{f.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card ob-feed">
        <div className="ob-feed-head">
          <h3>Just FREE'd across the comb</h3>
          <span className="ob-feed-live">
            <span className="live-dot" />
            Live
          </span>
        </div>
        <div className="feed-empty">
          <span className="live-dot" />
          Awaiting the first FREE. When a member earns the very first BLiNG!, it appears here — in
          the open, and stays for all time.
        </div>
      </div>

      <div className="ledger-foot">
        <span className="seal" />
        Append-only and member-owned · sealed at genesis · 1 BLiNG! = 1,000,000 FNU · 6-decimal
        precision · every figure verified against the ledger.
      </div>
    </main>
  );
}
