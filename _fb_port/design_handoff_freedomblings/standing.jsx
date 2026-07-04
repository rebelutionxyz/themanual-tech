/* standing.jsx — Standing & identity: sovereign self, guardians, consent */

const FACETS = [
  { n: "312", k: "Honest movements", d: "every one in the open" },
  { n: "18", k: "Created & curated", d: "Astras, guides & collections" },
  { n: "2", k: "Commons tended", d: "+ the HoneyComb forum" },
  { n: "96", k: "Member vouches", d: "keepers who stand for you" },
];

const GUARDIANS = [
  { i: "A", name: "Amara Osei", h: "@amara" },
  { i: "T", name: "Theo Lind", h: "@theo" },
  { i: "J", name: "Jonah Pell", h: "@jonah" },
  { i: "N", name: "Nadia Reyes", h: "@nadia" },
  { i: "M", name: "Mara Quill", h: "@mara" },
];

const CONSENT = [
  { astra: "FreedomNETWORK", perm: "read your standing", when: "3 weeks ago" },
  { astra: "MiniWaves", perm: "post tasks on your behalf", when: "last season" },
  { astra: "TheMANUAL", perm: "show your curations publicly", when: "2 days ago" },
];

function Standing() {
  const [consent, setConsent] = React.useState(CONSENT);
  const [copied, setCopied] = React.useState(false);
  const copyId = () => {
    const id = "comb:rosa · 7K2F·A9D4·9QX2";
    try { navigator.clipboard && navigator.clipboard.writeText(id).catch(() => {}); } catch (e) {}
    setCopied(true); setTimeout(() => setCopied(false), 1400);
  };
  return (
    <main className="app-main">
      <div className="commons-top">
        <div>
          <div className="eyebrow">Your sovereign identity</div>
          <h1>Standing</h1>
          <div className="sub">Who you are in the HoneyComb — held by you, vouched by your comb, earned by what you do.</div>
        </div>
      </div>

      <div className="identity card">
        <div className="id-left">
          <div className="avatar lg">R</div>
          <div className="id-who">
            <div className="id-name">Rosa Maren</div>
            <div className="id-handle num">@rosa</div>
            <div className="id-since">Sovereign Beeing · since Season 3</div>
            <button type="button" className="sovereign-id" onClick={copyId}
                    title="Copy your self-held ID"
                    style={{ cursor: "pointer", appearance: "none", textAlign: "left", font: "inherit", color: "inherit" }}>
              <span className="bmark" /><span className="sid num">comb:rosa · 7K2F·A9D4·9QX2</span>
              <span className="sid-copy">{copied ? "Copied!" : "Self-held"}</span>
            </button>
          </div>
        </div>
        <div className="id-right">
          <div className="eyebrow">Standing</div>
          <div className="id-standing">In good comb</div>
          <div className="id-trust">Trusted by <b className="num">96</b> keepers</div>
          <span className="id-custody"><span className="bmark fill" /> Sovereign · self-held keys</span>
        </div>
      </div>

      <div className="commons-grid">
        <div className="standing-main">
          <div className="card aside-card">
            <div className="consent-head">
              <h3>Your rank &amp; ring</h3>
              <span className="ob-panel-sub" style={{ margin: 0 }}>Computed from your recorded action — retroactive, and impossible to buy.</span>
            </div>
            <div className="ladder">
              <div className="ladder-head"><span className="ladder-k">BLiNG! Rank</span><span className="ladder-v num">14 <span className="ladder-of">/ 33</span></span></div>
              <div className="ladder-track">
                {Array.from({ length: 33 }).map((_, i) => <span key={i} className={"rung" + (i < 14 ? " on" : "")} />)}
              </div>
            </div>
            <div className="ladder">
              <div className="ladder-head"><span className="ladder-k">The Ring</span><span className="ladder-v num">4 <span className="ladder-of">/ 9</span></span></div>
              <div className="ladder-track ring">
                {Array.from({ length: 9 }).map((_, i) => <span key={i} className={"rung" + (i < 4 ? " on" : "")} />)}
              </div>
            </div>
            <div className="ladder-note"><span className="bmark" /> Both rise only with honest, recorded action — never for sale, never pay-to-win.</div>
          </div>

          <div className="card aside-card">
            <h3>How your standing is earned</h3>
            <p className="ob-panel-sub">Trust, earned by what you contribute — never bought, never sold.</p>
            <div className="facet-grid">
              {FACETS.map((f) => (
                <div className="facet" key={f.k}>
                  <span className="facet-mark" />
                  <div className="facet-n num">{f.n}</div>
                  <div className="facet-k">{f.k}</div>
                  <div className="facet-d">{f.d}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card aside-card">
            <div className="consent-head">
              <h3>What you've granted</h3>
              <span className="ob-panel-sub" style={{ margin: 0 }}>Each is a ledger entry — revoke any, any time.</span>
            </div>
            <div className="consent-list">
              {consent.map((c, i) => (
                <div className="consent-row" key={c.astra}>
                  <div className="consent-info">
                    <div className="consent-astra"><span className="ac-mark" />{c.astra}</div>
                    <div className="consent-perm">{c.perm} · granted {c.when}</div>
                  </div>
                  <button className="revoke" onClick={() => setConsent((cs) => cs.filter((_, j) => j !== i))}>Revoke</button>
                </div>
              ))}
              {!consent.length && (
                <div className="feed-empty"><span className="live-dot" /> You've granted no access. Astras see nothing until you allow it.</div>
              )}
            </div>
          </div>
        </div>

        <div className="commons-aside">
          <div className="card aside-card">
            <h3>Your guardians</h3>
            <p className="ob-panel-sub">If you lose your keys, these keepers vouch you back in — never a company.</p>
            <div className="guardian-stack">
              {GUARDIANS.map((g) => <span className="avatar sm" key={g.h} title={g.name}>{g.i}</span>)}
              <span className="threshold">Any <b>3 of 5</b></span>
            </div>
            <div className="people" style={{ marginTop: 6 }}>
              {GUARDIANS.slice(0, 3).map((g) => (
                <div className="person" key={g.h}>
                  <div className="avatar">{g.i}</div>
                  <div><div className="p-name">{g.name}</div><div className="p-handle">{g.h}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div className="sovereign-note">
            <span className="sn-mark" />
            <p><b>You hold your standing.</b> Your identity lives in your keys, not our database. Export it, carry it across the comb, and no one can lock you out — or let anyone in.</p>
            <button className="btn-ghost">Export your identity</button>
          </div>
        </div>
      </div>
    </main>
  );
}

Object.assign(window, { Standing });
