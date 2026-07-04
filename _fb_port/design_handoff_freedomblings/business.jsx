/* business.jsx — Business console: accept BLiNG! + per-member intake limits.
   Limit values are MERCHANT-CHOSEN (not economic policy) — safe to show concretely. */

const LIMITS = [
  { win: "Per day", on: true, amt: "200" },
  { win: "Per week", on: true, amt: "600" },
  { win: "Per month", on: true, amt: "1,000" },
  { win: "Per year", on: false, amt: "8,000" },
];

function Switch({ on, lg }) {
  return <span className={"sw" + (on ? " on" : "") + (lg ? " lg" : "")} aria-hidden="true"><i /></span>;
}

function Business() {
  return (
    <div className="biz">
      <header className="biz-bar">
        <div className="biz-id">
          <div className="avatar">C</div>
          <div>
            <div className="biz-name">Cedar &amp; Smoke Provisions</div>
            <div className="biz-meta num">@cedarsmoke · Verified business · HoneyComb</div>
          </div>
        </div>
        <div className="biz-accept">
          <span className="ba-label">Accepting BLiNG!</span>
          <Switch on lg />
        </div>
      </header>

      <div className="biz-main">
        <div className="move-top" style={{ marginBottom: "22px" }}>
          <div className="eyebrow">For a business in the comb</div>
          <h1>Accept BLiNG!</h1>
          <div className="sub">Let members GET your OFFERs with BLiNG! — and set fair, transparent limits on how much any one member can move to you.</div>
        </div>

        <div className="move-grid">
          <div className="card composer">
            <div className="field" style={{ gap: "4px" }}>
              <label>Per-member intake limits</label>
              <p className="biz-hint">How much a single member may GIVE you in each window. Caps protect members from over-spending and keep your comb fair — never extractive. A member always sees the cap before they GIVE.</p>
            </div>
            <div className="limits">
              {LIMITS.map((l) => (
                <div className={"limit-row" + (l.on ? "" : " off")} key={l.win}>
                  <Switch on={l.on} />
                  <div className="lim-win">{l.win}</div>
                  <div className="lim-amount">
                    <span className="heromark sm"><span className="d" /><span className="d inner" /></span>
                    <input type="text" defaultValue={l.amt} aria-label={l.win + " limit"} />
                    <span className="lim-u">BLiNG!</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="biz-note">
              <span className="bmark" />
              <span>Limits reset on a rolling window, per member. Raise, lower, or switch any off at any time — changes are public to members the moment they take effect.</span>
            </div>
          </div>

          <div className="move-aside">
            <div className="card aside-card">
              <h3>How a member sees it</h3>
              <div className="checkout">
                <div className="co-head">
                  <div className="avatar sm">C</div>
                  <div>
                    <div className="co-to">GIVE to Cedar &amp; Smoke</div>
                    <div className="co-for num">for the «Cedar &amp; Smoke» set</div>
                  </div>
                </div>
                <div className="co-amount"><span className="num">45</span><span className="co-u">BLiNG!</span></div>
                <div className="co-cap">
                  <div className="co-cap-head"><span>This month, here</span><span className="num">285 / 1,000</span></div>
                  <div className="co-bar"><i style={{ width: "28.5%" }} /><span className="co-bar-add" style={{ left: "24%", width: "4.5%" }} /></div>
                  <div className="co-ok"><span className="bmark fill" /> Within your monthly limit — GIVE freely</div>
                </div>
              </div>
            </div>
            <div className="sovereign-note">
              <span className="sn-mark" />
              <p><b>Whole and fee-free.</b> You GET the value members move to you — no card rails, no chargebacks. A small Comb Tithe supports the commons (rate set in econ v3).</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Business });
