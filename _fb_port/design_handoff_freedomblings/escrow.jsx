/* escrow.jsx — Escrow + dispute for OFFERs that need assurance. Timelock release + open dispute.
   Held by the ledger, never by us. Maps to bling_escrows (status/timelock_release_at/dispute). */

const ESCROW_STEPS = [
  { k: "Funded", d: "BLiNG! placed in escrow", done: true },
  { k: "Held", d: "awaiting delivery", cur: true },
  { k: "Released", d: "to the creator" },
];

function Escrow() {
  const [state, setState] = React.useState("held"); // held | released | disputed
  const statusLabel = state === "released" ? "Released · complete"
    : state === "disputed" ? "Disputed · in review" : "Held · in escrow";
  const stepState = (i) => state === "released" ? { done: true, cur: i === 2 } : { done: i === 0, cur: i === 1 };
  return (
    <main className="app-main">
      <div className="commons-top">
        <div>
          <div className="eyebrow">For OFFERs that need assurance</div>
          <h1>Escrow</h1>
          <div className="sub">When an OFFER needs trust on both sides, BLiNG! rests in open escrow — released when both are satisfied, timelocked for fairness, and disputed in the open if it ever comes to that.</div>
        </div>
        <div className="commons-tags"><span className="pill"><span className="bmark" /> Held by the ledger · never by us</span></div>
      </div>

      <div className="escrow-grid">
        <div className="card escrow-card">
          <div className="ec-head">
            <span className={"ec-status" + (state === "disputed" ? " disputed" : "")}>{statusLabel}</span>
            <span className="ec-kind num">OFFER escrow · #4127</span>
          </div>
          <div className="ec-parties">
            <div className="ec-party"><div className="avatar sm">A</div><div><div className="ecp-n">Amara Osei</div><div className="ecp-r">getting</div></div></div>
            <span className="ec-arrow" />
            <div className="ec-party"><div className="avatar sm">R</div><div><div className="ecp-n">Rosa Maren</div><div className="ecp-r">offering</div></div></div>
          </div>
          <div className="ec-for">For: <b>«Dawn Walks» — a custom field guide</b></div>
          <div className="ec-amount"><span className="heromark"><span className="d" /><span className="d inner" /></span><span className="num">450</span><span className="ec-u">BLiNG! held</span></div>
          <div className="ec-track">
            {ESCROW_STEPS.map((s, i) => {
              const st = stepState(i);
              return (
              <React.Fragment key={s.k}>
                <div className={"ec-node" + (st.done ? " done" : "") + (st.cur ? " cur" : "")}>
                  <span className="ecn-dot" />
                  <div className="ecn-k">{s.k}</div>
                  <div className="ecn-d">{s.d}</div>
                </div>
                {i < ESCROW_STEPS.length - 1 && <span className={"ec-line" + (stepState(i).done ? " done" : "")} />}
              </React.Fragment>
              );
            })}
          </div>
          {state !== "released" && (
            <div className="ec-timelock"><span className="bmark" /> {state === "disputed"
              ? <>Dispute opened — the comb reviews this in the open. Release is paused until it's resolved.</>
              : <>Auto-releases in <b>5 days</b> — or the moment both sides agree.</>}</div>
          )}
          {state === "released" ? (
            <div className="ec-ok"><span className="bmark fill" /> Released to Rosa · recorded in the open ledger.</div>
          ) : (
            <div className="ec-actions">
              <button className="btn-give" style={{ flex: 1 }} disabled={state === "disputed"}
                      onClick={() => setState("released")}><BMark /> Release to Rosa</button>
              <button className="btn-ghost ec-dispute"
                      onClick={() => setState((s) => (s === "disputed" ? "held" : "disputed"))}>{state === "disputed" ? "Withdraw dispute" : "Open a dispute"}</button>
            </div>
          )}
        </div>

        <div className="escrow-aside">
          <div className="card ob-panel">
            <h3>How escrow protects both</h3>
            <div className="net-steps">
              <div className="net-step"><span className="ns-n num">1</span><div><div className="ns-k">Held by the ledger</div><div className="ns-d">Not by us, never spendable by either side while it rests.</div></div></div>
              <div className="net-step"><span className="ns-n num">2</span><div><div className="ns-k">Timelock</div><div className="ns-d">Releases on agreement, or automatically after the set time — no one can stall forever.</div></div></div>
              <div className="net-step"><span className="ns-n num">3</span><div><div className="ns-k">Dispute in the open</div><div className="ns-d">If something's wrong, the comb reviews it transparently — no hidden arbiter.</div></div></div>
            </div>
          </div>
          <div className="sovereign-note">
            <span className="sn-mark" />
            <p><b>Trust without a middleman.</b> Escrow is just the ledger holding value honestly until a promise is kept — sovereign assurance, no fee, no custodian.</p>
          </div>
        </div>
      </div>

      <div className="ledger-foot">
        <span className="seal" />
        Escrow is optional and used only for OFFERs that ask for it. Timelock windows and dispute resolution are illustrative until read from the ledger and sealed in econ v3.
      </div>
    </main>
  );
}

Object.assign(window, { Escrow });
