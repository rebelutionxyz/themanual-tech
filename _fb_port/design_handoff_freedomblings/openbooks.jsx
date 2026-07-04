/* openbooks.jsx — The Open Books: public, member-readable truth of the whole economy.
   Numbers VERIFIED against prod (bling_system_state). Supply begins at 0 — genesis truth. */

const SACRED_SUM = "111,222,333,333,222,111"; // the hard cap — an 18-digit palindrome
const OPS_BUCKETS = "333,333,222,111";          // allocated outside the well at genesis

// How the Sacred Sum stands at genesis (the well = cap − supply; supply = 0).
const CAP_ANATOMY = [
  { dia: "fill",  k: "The well · Royal Jelly Treasury", fig: SACRED_SUM, hint: "the unFREE'd remainder — the comb's reserve, held until earned" },
  { dia: "out",   k: "Operations Buckets", fig: OPS_BUCKETS, hint: "allocated outside the well at genesis" },
  { dia: "ghost", k: "FREE'd to Sovereign Beeings", fig: "0", hint: "grows only as members do and create — never pre-seeded" },
];

// The three faucets — how BLiNG! is FREE'd into existence (previews 3c).
const FAUCETS = [
  { k: "Genesis", d: "founding & onboarding issuance" },
  { k: "Drops", d: "yield for productive action — what you do" },
  { k: "Drips", d: "yield for popularity & curation — what others value in what you make" },
];

function OBStat({ k, v, sub }) {
  return (
    <div className="card ob-stat">
      <div className="obs-k">{k}</div>
      <div className="obs-v"><span className="num n">{v}</span></div>
      {sub && <div className="obs-sub">{sub}</div>}
    </div>
  );
}

function OpenBooks() {
  return (
    <main className="app-main">
      <div className="ledger-top">
        <div>
          <div className="eyebrow">Public to every member · always</div>
          <h1>The Open Books</h1>
          <div className="sub">The whole economy, in the open. No member sees a different set of numbers than any other — verified against the ledger itself.</div>
        </div>
        <div className="pill ob-live"><span className="live-dot" />Live · sealed at genesis</div>
      </div>

      <div className="card ob-supply">
        <div className="ob-supply-head">
          <div>
            <div className="eyebrow">The Sacred Sum · lifetime cap, fixed by the Charter</div>
            <div className="ob-supply-fig"><HeroMark /><span className="sacred-num">{SACRED_SUM}</span></div>
            <div className="palindrome">An 18-digit palindrome — the one number that can never grow.</div>
          </div>
          <div className="ob-supply-pct"><span className="num">0<span className="pct-s">%</span></span><span className="ob-pct-l">of the cap FREE'd</span></div>
        </div>
        <div className="supply-meter"><i style={{ width: "0%" }} /></div>
        <div className="supply-legend">
          <span>Supply begins at <b className="num">0</b></span>
          <span>BLiNG! is FREE'd only by what members do</span>
          <span>The well holds the rest</span>
        </div>
      </div>

      <div className="ob-stats">
        <OBStat k="FREE'd to date" v="0" sub="not one BLiNG! pre-seeded" />
        <OBStat k="In Beeings' hands" v="0" sub="grows only by earning" />
        <OBStat k="Operations Buckets" v={OPS_BUCKETS} sub="outside the well, at genesis" />
        <OBStat k="Comb Tithe" v="0.99%" sub="opt-out donation to the commons" />
      </div>

      <div className="ob-grid">
        <div className="card ob-panel">
          <h3>How the Sacred Sum stands</h3>
          <p className="ob-panel-sub">Every BLiNG! is accounted for, at all times — held in the well until it is FREE'd by real, productive action.</p>
          <div className="cap-list">
            {CAP_ANATOMY.map((c) => (
              <div className="cap-row" key={c.k}>
                <div className="cap-name"><span className={"cap-dia " + c.dia} />{c.k}</div>
                <div className="cap-fig num">{c.fig}<span className="cap-u"> BLiNG!</span></div>
                <div className="cap-hint">{c.hint}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card ob-panel">
          <h3>How BLiNG! is FREE'd</h3>
          <p className="ob-panel-sub">It enters existence only through the faucets — never printed, never sold. Each is a moment of recognition.</p>
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
          <span className="ob-feed-live"><span className="live-dot" />Live</span>
        </div>
        <div className="feed-empty">
          <span className="live-dot" />
          Awaiting the first FREE. When a member earns the very first BLiNG!, it appears here — in the open, and stays for all time.
        </div>
      </div>

      <div className="ledger-foot">
        <span className="seal" />
        Append-only and member-owned · sealed at genesis · 1 BLiNG! = 1,000,000 FNU · 6-decimal precision · every figure verified against the ledger.
      </div>
    </main>
  );
}

Object.assign(window, { OpenBooks });
