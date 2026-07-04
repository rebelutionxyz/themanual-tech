/* emergency.jsx — Emergency Fund: opt-in per-Citizen mutual aid. "The comb has your back."
   opt_in_pct + accrual/draw. Disbursement triggers + pool figures illustrative until read from
   bling_emergency_fund_escrows. */

const NET_STEPS = [
  { k: "Accrue", d: "A small, opt-in slice of what you FREE flows into the shared net — quietly, in good times." },
  { k: "Draw", d: "In catastrophe, you request aid — disbursed in the open, decided by the comb, not a company." },
  { k: "Honored", d: "Never forfeited while you're active. It's mutual aid, never a fee or a premium." },
];

function Emergency() {
  const [optedIn, setOptedIn] = React.useState(true);
  return (
    <main className="app-main">
      <div className="commons-top">
        <div>
          <div className="eyebrow">Mutual aid · opt-in</div>
          <h1>The comb has your back</h1>
          <div className="sub">Set aside a little of what you earn into a shared net. When a keeper faces catastrophe, the comb carries them — and the comb carries you.</div>
        </div>
      </div>

      <div className="net-hero card">
        <div className="nh-left">
          <div className="nh-optin">
            <span className={"sw lg" + (optedIn ? " on" : "")} role="switch" aria-checked={optedIn}
                  style={{ cursor: "pointer" }} onClick={() => setOptedIn((v) => !v)}><i /></span>
            <div>
              <div className="nh-status">{optedIn ? "You're in the net" : "You're not in the net"}</div>
              <div className="nh-sub">{optedIn
                ? <>Opted in · <b>2%</b> of what you FREE flows to mutual aid</>
                : <>Opt in to set aside a small slice for mutual aid</>}</div>
            </div>
          </div>
        </div>
        <div className="nh-right">
          <div className="nh-stat"><div className="nh-k">You've set aside</div><div className="nh-v num">96</div><div className="nh-s">this season</div></div>
          <div className="nh-stat"><div className="nh-k">Your cover</div><div className="nh-v num" style={{ color: optedIn ? "var(--accent-deep)" : "var(--ink-faint)" }}>{optedIn ? "Active" : "Paused"}</div><div className="nh-s">{optedIn ? "eligible to draw" : "opt in to cover"}</div></div>
        </div>
      </div>

      <div className="net-grid">
        <div className="card ob-panel">
          <h3>How the net works</h3>
          <p className="ob-panel-sub">Solidarity, made plain — value you set aside in good times carries someone (maybe you) through the worst.</p>
          <div className="net-steps">
            {NET_STEPS.map((s, i) => (
              <div className="net-step" key={s.k}>
                <span className="ns-n num">{i + 1}</span>
                <div>
                  <div className="ns-k">{s.k}</div>
                  <div className="ns-d">{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="net-aside">
          <div className="card ob-panel">
            <h3>The comb's net</h3>
            <div className="net-stats">
              <div className="net-stat"><div className="net-stat-v num">184,200</div><div className="net-stat-k">BLiNG! in the shared net</div></div>
              <div className="net-stat"><div className="net-stat-v num">142</div><div className="net-stat-k">keepers opted in</div></div>
            </div>
            <div className="net-recent"><span className="bmark fill" /> When the south-bank flood hit, <b>14 keepers</b> were carried through — in the open, by the comb.</div>
          </div>
          <div className="sovereign-note">
            <span className="sn-mark" />
            <p><b>No one faces catastrophe alone.</b> The net is opt-in and member-owned. The comb decides who it carries, transparently — never an insurer, never a gatekeeper.</p>
          </div>
        </div>
      </div>

      <div className="ledger-foot">
        <span className="seal" />
        Opt-in, member-owned, and decided in the open. The opt-in slice, pool figures, and disbursement triggers are illustrative until read from the ledger and sealed in econ v3.
      </div>
    </main>
  );
}

Object.assign(window, { Emergency });
