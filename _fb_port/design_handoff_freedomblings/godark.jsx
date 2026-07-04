/* godark.jsx — Go Dark / MinuteMen: offline P2P. Sign offline, settle later.
   Maps to offline_signature on transactions. Phone-first (in-person, no grid). */

function FauxQR() {
  const N = 13;
  const cells = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const finder = (r < 4 && c < 4) || (r < 4 && c >= N - 4) || (r >= N - 4 && c < 4);
      const on = finder ? false : ((r * 3 + c * 7 + r * c) % 5 < 2);
      cells.push(on);
    }
  }
  return (
    <div className="qr" style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}>
      {cells.map((on, i) => <span key={i} className={on ? "qr-cell on" : "qr-cell"} />)}
      <span className="qr-finder tl" /><span className="qr-finder tr" /><span className="qr-finder bl" />
    </div>
  );
}

function PhoneGoDark() {
  return (
    <div className="phone-screen">
      <div className="phone-status dark-status">
        <span>9:41</span>
        <span className="dots"><span className="godark-pill">◆ Go Dark · no signal</span></span>
      </div>
      <div className="phone-body">
        <div className="ph-eyebrow">Give offline · signed by your keys</div>
        <div className="gd-qr-wrap">
          <FauxQR />
        </div>
        <div className="gd-give">
          <span className="heromark" style={{ width: 18, height: 18 }}><span className="d" /><span className="d inner" /></span>
          <span className="num gd-give-n">50</span><span className="gd-give-u">BLiNG!</span>
        </div>
        <div className="gd-give-l">Show this to receive · or scan theirs</div>
        <div className="gd-allow">
          <div className="gd-allow-head"><span>Offline allowance</span><span className="num">50 / 200</span></div>
          <div className="co-bar"><i style={{ width: "25%", background: "var(--accent)" }} /></div>
          <div className="gd-allow-s">You can move up to your last-known balance while dark — settles when you reconnect.</div>
        </div>
      </div>
      <div className="phone-tabbar">
        <div className="ptab active"><span className="pt-mark" />Give</div>
        <div className="ptab"><span className="pt-mark" />Scan</div>
        <div className="ptab"><span className="pt-mark" />Pending</div>
      </div>
    </div>
  );
}

const PENDING = [
  { who: "to @theo", amt: "50", when: "2 min ago · here" },
  { who: "from @nadia", amt: "120", when: "1 hr ago", inc: true },
  { who: "to @marsh-crew", amt: "30", when: "3 hrs ago" },
];

function PhonePending() {
  return (
    <div className="phone-screen">
      <div className="phone-status dark-status">
        <span>9:41</span>
        <span className="dots"><span className="godark-pill">◆ Go Dark</span></span>
      </div>
      <div className="phone-body">
        <div className="ph-eyebrow">Pending · settles when you reconnect</div>
        <div className="pending-list">
          {PENDING.map((p, i) => (
            <div className="pending-row" key={i}>
              <span className="pend-seal" />
              <div className="pend-main">
                <div className="pend-who">{p.who}</div>
                <div className="pend-when num">{p.when}</div>
              </div>
              <div className={"pend-amt num" + (p.inc ? " inc" : "")}>{p.inc ? "+" : "−"}{p.amt}</div>
            </div>
          ))}
        </div>
        <div className="relay">
          <div className="relay-head"><span className="relay-dot" /> MinuteMen relay · concept</div>
          <div className="relay-s">One idea for moving signed transfers between people while the grid is down — to reconcile against the built design. Illustrative.</div>
        </div>
        <div className="gd-settle"><span className="bmark" /> Signed offline — settles to the ledger the moment you reconnect.</div>
      </div>
      <div className="phone-tabbar">
        <div className="ptab"><span className="pt-mark" />Give</div>
        <div className="ptab"><span className="pt-mark" />Scan</div>
        <div className="ptab active"><span className="pt-mark" />Pending</div>
      </div>
    </div>
  );
}

Object.assign(window, { PhoneGoDark, PhonePending });
