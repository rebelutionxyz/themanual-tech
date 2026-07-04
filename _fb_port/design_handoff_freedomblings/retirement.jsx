/* retirement.jsx — Legacy: retirement accrual + succession ("the final waggle").
   Sensitive subsystem — designed with gravity & warmth. Accrual/unlock rules are
   illustrative until read from bling_retirement_escrows. */

const HEIRS = [
  { i: "N", name: "Nadia Reyes", h: "@nadia", share: 50 },
  { i: "R", name: "The Riverkeepers commons", h: "@riverkeepers", share: 30 },
  { i: "T", name: "Theo Lind", h: "@theo", share: 20 },
];

function Retirement() {
  return (
    <main className="app-main">
      <div className="commons-top">
        <div>
          <div className="eyebrow">For the long arc of a life in the comb</div>
          <h1>Legacy</h1>
          <div className="sub">The BLiNG! you earn can rest and accrue across your active years — and, when the time comes, pass to those you name. The comb honors a life's work.</div>
        </div>
      </div>

      <div className="legacy-grid">
        <div className="card ob-panel">
          <h3>Your retirement accrual</h3>
          <p className="ob-panel-sub">A portion of what you earn quietly gathers over your active years — yours, held in your name, to draw on later in life.</p>
          <div className="accrual">
            <div className="acc-amt"><span className="heromark"><span className="d" /><span className="d inner" /></span><span className="num">2,480</span><span className="acc-u">BLiNG!</span></div>
            <div className="acc-meta"><b className="num">4</b> active years · accruing</div>
          </div>
          <div className="years">
            {["Y1", "Y2", "Y3", "Y4", "Y5", "Y6"].map((y, i) => (
              <div className={"year" + (i < 4 ? " on" : "")} key={y}><span className="yr-bar" /><span className="yr-l">{y}</span></div>
            ))}
          </div>
          <div className="acc-state"><span className="bmark" /> Vests with your active years — unlocks at retirement, never forfeited while you tend the comb.</div>
        </div>

        <div className="legacy-aside">
          <div className="card ob-panel">
            <h3>Your succession</h3>
            <p className="ob-panel-sub">Name who inherits your BLiNG!. Declared and sealed — change it any time; it stays private until your final waggle.</p>
            <div className="heirs">
              {HEIRS.map((h) => (
                <div className="heir" key={h.h}>
                  <div className="avatar sm">{h.i}</div>
                  <div className="heir-main">
                    <div className="heir-name">{h.name}</div>
                    <div className="heir-bar"><i style={{ width: h.share + "%" }} /></div>
                  </div>
                  <div className="heir-share num">{h.share}%</div>
                </div>
              ))}
            </div>
            <div className="seal-line"><span className="bmark fill" /> Declared &amp; sealed · 3 heirs</div>
          </div>

          <div className="waggle-note">
            <span className="wn-mark" />
            <div>
              <div className="wn-title">The final waggle</div>
              <p>A bee's last dance. When a keeper passes, their sealed declaration carries their BLiNG! onward to those they named — whole, honest, and without a middle hand. A life's contribution is never lost to the comb.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="ledger-foot">
        <span className="seal" />
        Held in your name, member-owned, and honored on your terms. Accrual and unlock rules are illustrative until read from the ledger and sealed in econ v3.
      </div>
    </main>
  );
}

Object.assign(window, { Retirement });
