/* demurrage.jsx — Circulation / "the melt". Idle BLiNG! gently returns to the well and is
   FREE'd again — sovereign circulation, never a fee. Fibonacci tiers 8/5/3/1 + OG −0.5%.
   Tier rates are from the pack; tier *triggers* (idle bands) are illustrative until econ v3. */

const MELT_TIERS = [
  { rate: "8%", band: "Long idle", d: "sat still a long while — the most returns to the comb", w: 100 },
  { rate: "5%", band: "Resting", d: "idle a good span", w: 62 },
  { rate: "3%", band: "Stirring", d: "moved not long ago", w: 38 },
  { rate: "1%", band: "In motion", d: "actively circulating — the gentle floor", w: 14, active: true },
];

const FLOW = [
  { k: "Your idle BLiNG!", d: "the part that's sat still" },
  { k: "The well", d: "Royal Jelly Treasury" },
  { k: "FREE'd again", d: "to members doing the work" },
];

function Circulation() {
  return (
    <main className="app-main">
      <div className="commons-top">
        <div>
          <div className="eyebrow">Why your BLiNG! keeps moving</div>
          <h1>Circulation</h1>
          <div className="sub">BLiNG! is meant to flow, not sit. Idle BLiNG! gently melts back to the well — so the comb stays alive and value keeps reaching the people doing the work. Here's exactly how, in the open.</div>
        </div>
      </div>

      <div className="melt-hero card">
        <div className="mh-left">
          <div className="eyebrow">Your BLiNG! right now</div>
          <div className="mh-status"><span className="bmark fill" /> In motion</div>
          <div className="mh-line">A gentle <b>1%</b> applies only to the part you've kept idle. Keep BLiNG! moving — give, get, offer — and the melt all but vanishes.</div>
        </div>
        <div className="mh-right">
          <div className="mh-ret-k">Returned to the well this season</div>
          <div className="mh-ret-v"><span className="num">12</span><span className="mh-u">BLiNG!</span></div>
          <div className="mh-ret-s">→ already FREE'd again to the comb</div>
        </div>
      </div>

      <div className="melt-grid">
        <div className="card ob-panel">
          <h3>The melt, by tier</h3>
          <p className="ob-panel-sub">The longer BLiNG! sits still, the more returns. Keep it circulating and you rest at the gentle 1% floor.</p>
          <div className="tier-list">
            {MELT_TIERS.map((t) => (
              <div className={"tier-row" + (t.active ? " active" : "")} key={t.rate}>
                <div className="tier-rate num">{t.rate}</div>
                <div className="tier-main">
                  <div className="tier-band">{t.band}{t.active && <span className="tier-here">you're here</span>}</div>
                  <div className="tier-d">{t.d}</div>
                </div>
                <div className="tier-bar"><i style={{ width: t.w + "%" }} /></div>
              </div>
            ))}
          </div>
          <div className="og-badge"><span className="bmark" /> OG keepers — a <b>−0.5%</b> reduction on every tier, for being early to the comb.</div>
        </div>

        <div className="melt-aside">
          <div className="card ob-panel">
            <h3>Where the melt goes</h3>
            <p className="ob-panel-sub">Not to us. Never a fee. It returns to the well and is FREE'd again to people doing the work.</p>
            <div className="flow">
              {FLOW.map((f, i) => (
                <React.Fragment key={i}>
                  <div className={"flow-node" + (i === 1 ? " mid" : "")}>
                    <span className="fn-mark" />
                    <div className="fn-k">{f.k}</div>
                    <div className="fn-d">{f.d}</div>
                  </div>
                  {i < FLOW.length - 1 && <span className="flow-arrow" aria-hidden="true" />}
                </React.Fragment>
              ))}
            </div>
          </div>
          <div className="sovereign-note">
            <span className="sn-mark" />
            <p><b>Idle value becomes someone's recognition.</b> The melt is how a sovereign economy stays alive — value circulates back to contributors instead of pooling, untouched, in a few hands.</p>
          </div>
        </div>
      </div>

      <div className="ledger-foot">
        <span className="seal" />
        The melt is not a fee and never leaves the comb. Tier rates are fixed (8 / 5 / 3 / 1%); the idle bands that place you in a tier are illustrative until econ v3 seals them.
      </div>
    </main>
  );
}

Object.assign(window, { Circulation });
