/* affiliate.jsx — Affiliate chain L1–L5. Welcoming the comb is productive action that FREEs
   value up your lineage on a Fibonacci decay (34/21/13/8/5). Producer-gated, lifetime.
   The L1–L5 weights are from the pack; person counts/amounts are illustrative until econ v3. */

const CHAIN = [
  { lvl: "L1", w: "34", rel: "Keepers you welcomed", who: "direct — your own invites", n: 14, w_pct: 100 },
  { lvl: "L2", w: "21", rel: "Those they welcomed", who: "second ring", n: 96, w_pct: 62 },
  { lvl: "L3", w: "13", rel: "Third ring", who: "the comb widening", n: 410, w_pct: 38 },
  { lvl: "L4", w: "8", rel: "Fourth ring", who: "", n: 1230, w_pct: 24 },
  { lvl: "L5", w: "5", rel: "Fifth ring", who: "the furthest reach", n: 3580, w_pct: 15 },
];

function Affiliate() {
  const [invite, setInvite] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const link = "freedomblings.com/welcome/rosa-7K2F";
  const copy = () => {
    try { navigator.clipboard && navigator.clipboard.writeText(link).catch(() => {}); } catch (e) {}
    setCopied(true); setTimeout(() => setCopied(false), 1400);
  };
  return (
    <main className="app-main">
      <div className="commons-top">
        <div>
          <div className="eyebrow">Growing the comb is productive action</div>
          <h1>Your lineage</h1>
          <div className="sub">When you welcome people and they thrive, value is FREE'd up your lineage on a Fibonacci curve — most to those closest, tapering with distance. Bounded, public, never a pyramid.</div>
        </div>
        <div className="commons-tags" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span className="pill"><span className="bmark" /> Producer-gated · lifetime</span>
          <button className="bal-act primary" onClick={() => setInvite(true)}><BMark fill /> Invite a Sovereign</button>
        </div>
      </div>

      <div className="aff-hero card">
        <div className="ah-item">
          <div className="ah-k">In your lineage</div>
          <div className="ah-v num">5,330</div>
          <div className="ah-s">keepers across 5 rings</div>
        </div>
        <div className="ah-item">
          <div className="ah-k">FREE'd to you this season</div>
          <div className="ah-v num" style={{ color: "var(--accent-deep)" }}>+ 940</div>
          <div className="ah-s">as your comb grew & thrived</div>
        </div>
        <div className="ah-item">
          <div className="ah-k">The curve</div>
          <div className="ah-v num ah-fib">34·21·13·8·5</div>
          <div className="ah-s">Fibonacci weights, L1 → L5</div>
        </div>
      </div>

      <div className="card ob-panel" style={{ marginTop: "14px" }}>
        <h3>How value FREEs up the lineage</h3>
        <p className="ob-panel-sub">Each level earns a Fibonacci-weighted share when the keepers in it do productive work — most to the ring nearest you, gently tapering outward, so it can never grow top-heavy.</p>
        <div className="chain-list">
          {CHAIN.map((c) => (
            <div className="chain-row" key={c.lvl}>
              <div className="chain-lvl">{c.lvl}</div>
              <div className="chain-main">
                <div className="chain-rel">{c.rel}{c.who && <span className="chain-who"> · {c.who}</span>}</div>
                <div className="chain-bar"><i style={{ width: c.w_pct + "%" }} /></div>
              </div>
              <div className="chain-end">
                <div className="chain-w num">{c.w}<span className="cw-u">share</span></div>
                <div className="chain-n num">{c.n.toLocaleString()} keepers</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="ledger-foot">
        <span className="seal" />
        Lineage rewards are FREE'd for real, productive work done across your comb — never for merely signing people up. Weights are fixed (34/21/13/8/5); counts &amp; amounts are illustrative until econ v3.
      </div>

      {invite && (
        <Sheet eyebrow="Grow your comb" title="Invite a Sovereign"
          sub="Welcome someone to the HoneyComb. When they join and do real work, value FREEs up your lineage — bounded and public."
          onClose={() => setInvite(false)} max={480}
          foot={<>Welcoming is productive action · never a pyramid, never pay-to-signup.</>}>
          <div className="composer sheet-form">
            <div className="field">
              <label>Your welcome link</label>
              <div className="recip" style={{ justifyContent: "space-between" }}>
                <span className="sid num" style={{ fontSize: 13, color: "var(--ink-soft)" }}>{link}</span>
                <button type="button" className="r-change" onClick={copy}
                        style={{ border: 0, background: "transparent", font: "inherit", cursor: "pointer" }}>
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
            <div className="field">
              <label>Or invite by name / @handle</label>
              <input className="note-input" placeholder="e.g. Priya Patel or @priya" />
            </div>
            <button className="btn-give" onClick={() => setInvite(false)}><BMark /> Send welcome</button>
          </div>
        </Sheet>
      )}
    </main>
  );
}

Object.assign(window, { Affiliate });
