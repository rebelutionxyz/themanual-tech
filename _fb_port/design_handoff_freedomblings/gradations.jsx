/* gradations.jsx — Honey Gradations: subscription tiers $0/$3/$8/$13.
   Subscriptions are fiat-IN (the one-way membrane) — membership that unlocks, never "buying BLiNG!".
   Prices are from the pack; per-tier perk details are illustrative until confirmed. */

const TIERS = [
  { key: "Wildflower", price: "0", cadence: "free", tag: "Every Sovereign Beeing",
    perks: ["A sovereign wallet & honest ledger", "FREE BLiNG! by what you do", "Read the Open Books"], cur: true },
  { key: "Clover", price: "3", cadence: "/mo", tag: "",
    perks: ["Everything in Wildflower", "Higher Drip reach on what you make", "Custom standing display"] },
  { key: "Manuka", price: "8", cadence: "/mo", tag: "Most chosen", feature: true,
    perks: ["Everything in Clover", "Priority in OFFERs & the marketplace", "Steward your own commons"] },
  { key: "Royal Jelly", price: "13", cadence: "/mo", tag: "",
    perks: ["Everything in Manuka", "Deepest curation & faucet reach", "Founding voice in the comb"] },
];

function Gradations() {
  const [current, setCurrent] = React.useState((TIERS.find((t) => t.cur) || {}).key || "Wildflower");
  return (
    <main className="app-main">
      <div className="commons-top">
        <div>
          <div className="eyebrow">Membership in the comb</div>
          <h1>Honey Gradations</h1>
          <div className="sub">Choose how deep you tend the comb. Membership unlocks reach and tools — it never buys BLiNG!. Money only ever flows in.</div>
        </div>
        <div className="commons-tags"><span className="pill"><span className="bmark" /> Billed in fiat · never converts to BLiNG!</span></div>
      </div>

      <div className="grad-grid">
        {TIERS.map((t) => {
          const isCur = current === t.key;
          return (
          <div className={"grad-card" + (t.feature ? " feature" : "") + (isCur ? " current" : "")} key={t.key}>
            {t.tag && <div className="grad-tag">{t.tag}</div>}
            <div className="grad-name">{t.key}</div>
            <div className="grad-price">
              <span className="gp-cur">$</span><span className="num gp-n">{t.price}</span>
              <span className="gp-cad">{t.cadence}</span>
            </div>
            <ul className="grad-perks">
              {t.perks.map((p, i) => (
                <li key={i}><span className="gp-tick" />{p}</li>
              ))}
            </ul>
            <button className={"grad-btn" + (t.feature && !isCur ? " solid" : "") + (isCur ? " ghost" : "")}
                    onClick={() => setCurrent(t.key)}>
              {isCur ? "Your tier" : "Choose " + t.key}
            </button>
          </div>
          );
        })}
      </div>

      <div className="ledger-foot">
        <span className="seal" />
        Honey Gradations are a membership, paid in fiat at the one-way membrane — they unlock reach and tools and never convert to or from BLiNG! Per-tier perks are illustrative until confirmed.
      </div>
    </main>
  );
}

Object.assign(window, { Gradations });
