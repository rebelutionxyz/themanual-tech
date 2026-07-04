/* surfaces.jsx — the three ledger surfaces + phone screens */

// Shared display helper + reactive store. The store is provided by the app
// shell (ProtoApp / each DesktopFrame); surfaces fall back to literal defaults
// when there is no provider (e.g. isolated rendering).
function fmt(n){ return Number(n || 0).toLocaleString("en-US"); }
const StoreCtx = React.createContext(null);

// Tween a number toward its target (used by the live balance). Respects
// reduced-motion and only animates when the value actually changes.
function useCountUp(target, ms = 650){
  const [val, setVal] = React.useState(target);
  const ref = React.useRef(target);
  React.useEffect(() => {
    const from = ref.current, to = target;
    if (from === to) return;
    const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { ref.current = to; setVal(to); return; }
    let raf; const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      const cur = Math.round(from + (to - from) * e);
      ref.current = cur; setVal(cur);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [target, ms]);
  return val;
}

/* ---- Ledger data (no economic mechanics — just honest descriptions) ------ */
const LEDGER = [
  { day: "Today · 6 June", sum: "+ 370", rows: [
    { kind: "freed", desc: "FREEd for curating the «Field Notes» collection", who: "Productive action", amt: "320", dir: "pos", run: "12,480",
      trace: [
        { tag: "FREEd", desc: "FREEd for curating the «Field Notes» collection", who: "You · Rosa Maren", when: "today · 6 June", amt: "320", kind: "origin" },
        { desc: "Resting in your ledger, ready to move", who: "You · Rosa Maren", when: "now", kind: "now" },
      ] },
    { kind: "got", desc: "GOT from Amara Osei — for your «Dawn Walks» guide", who: "@amara", amt: "140", dir: "pos", run: "12,160",
      trace: [
        { tag: "FREEd", desc: "FREEd for tending the HoneyComb forum", who: "@jonah · Jonah Pell", when: "3 weeks ago", amt: "140", kind: "origin" },
        { tag: "GAVE", desc: "Jonah GAVE to Amara — for moderating together", who: "@jonah → @amara", when: "9 days ago", amt: "140" },
        { tag: "GOT", desc: "Amara GAVE to you — for your «Dawn Walks» guide", who: "@amara → You", when: "today", amt: "140", kind: "now" },
      ] },
    { kind: "given", desc: "GAVE to the Riverkeepers commons", who: "@riverkeepers", amt: "90", dir: "neg", run: "12,020",
      trace: [
        { tag: "FREEd", desc: "FREEd for moderating the HoneyComb forum", who: "You · Rosa Maren", when: "last week", amt: "90", kind: "origin" },
        { tag: "GAVE", desc: "You GAVE to the Riverkeepers commons", who: "You → @riverkeepers", when: "today", amt: "90", kind: "now" },
      ] },
  ]},
  { day: "Yesterday · 5 June", sum: "+ 135", rows: [
    { kind: "got", desc: "GOT from Theo Lind — for the «Cedar & Smoke» set", who: "@theo", amt: "75", dir: "pos", run: "12,110",
      trace: [
        { tag: "FREEd", desc: "FREEd for a FreedomNETWORK dispatch", who: "@theo · Theo Lind", when: "1 month ago", amt: "75", kind: "origin" },
        { tag: "GOT", desc: "Theo GAVE to you — for the «Cedar & Smoke» set", who: "@theo → You", when: "yesterday", amt: "75", kind: "now" },
      ] },
    { kind: "freed", desc: "FREEd for tending the HoneyComb forum", who: "Productive action", amt: "60", dir: "pos", run: "12,035",
      trace: [
        { tag: "FREEd", desc: "FREEd for tending the HoneyComb forum", who: "You · Rosa Maren", when: "yesterday", amt: "60", kind: "origin" },
        { desc: "Resting in your ledger", who: "You · Rosa Maren", when: "now", kind: "now" },
      ] },
    { kind: "offer", desc: "OFFERed «Cedar & Smoke» — a recipe Astra", who: "Open to the HoneyComb", amt: null, run: "11,975" },
  ]},
  { day: "4 June", sum: "+ 60", rows: [
    { kind: "freed", desc: "FREEd for translating the community charter", who: "Creating & curating", amt: "210", dir: "pos", run: "11,975",
      trace: [
        { tag: "FREEd", desc: "FREEd for translating the community charter", who: "You · Rosa Maren", when: "4 June", amt: "210", kind: "origin" },
        { desc: "Resting in your ledger", who: "You · Rosa Maren", when: "now", kind: "now" },
      ] },
    { kind: "given", desc: "GAVE to Nadia Reyes — a welcome to the comb", who: "@nadia", amt: "150", dir: "neg", run: "11,765",
      trace: [
        { tag: "FREEd", desc: "FREEd for curating the «Field Notes» collection", who: "You · Rosa Maren", when: "2 weeks ago", amt: "150", kind: "origin" },
        { tag: "GAVE", desc: "You GAVE to Nadia — a welcome to the comb", who: "You → @nadia", when: "4 June", amt: "150", kind: "now" },
      ] },
  ]},
];

const TAG_LABEL = { freed: "FREEd", got: "GOT", given: "GAVE", offer: "OFFER", get: "GET" };

function LedgerRow({ r }) {
  const ctx = React.useContext(FrameCtx);
  const clickable = r.amt != null;
  return (
    <div className={"lrow" + (clickable ? " clickable" : "")}
         onClick={clickable ? () => ctx.trace(r) : undefined}
         title={clickable ? "Trace this BLiNG! — see its full lineage" : undefined}>
      <div className={"l-ico" + (r.dir === "pos" ? " in" : "")}><BMark fill={r.dir === "pos"} /></div>
      <div className="l-main">
        <div className="l-desc">{r.desc}</div>
        <div className="l-meta">
          <span className={"l-tag " + r.kind}>{TAG_LABEL[r.kind]}</span>
          <span className="who">{r.who}</span>
        </div>
      </div>
      <div className="l-amt">
        {r.amt
          ? <div className={"amt " + r.dir}>{r.amt}</div>
          : <div className="pill" style={{ fontSize: "10px" }}>{r.pill || "Posted · open"}</div>}
        <div className="run num">{r.run} bal.</div>
      </div>
      <div className="l-go" aria-hidden="true">{clickable ? "›" : ""}</div>
    </div>
  );
}

/* ======================= BALANCE ======================= */
function Balance() {
  const ctx = React.useContext(FrameCtx);
  const store = React.useContext(StoreCtx);
  const shown = useCountUp(store ? store.balance : 12480);
  const balanceLabel = fmt(shown);
  const recent = store ? store.recent : LEDGER[0].rows;
  return (
    <main className="app-main">
      <div className="bal-top">
        <div className="bal-hero">
          <div className="eyebrow">Your standing in the Freedom Ledger</div>
          <div className="bal-amount">
            <HeroMark />
            <div className="big">{balanceLabel}</div>
          </div>
          <div className="bal-unit"><b>BLiNG!</b> — your balance in the ledger, member-owned and capped</div>
        </div>
        <div className="standing-badge">
          <span className="sb-k">Standing</span>
          <span className="sb-v">In good comb</span>
        </div>
      </div>

      <div className="bal-actions">
        <button className="bal-act primary" onClick={() => ctx.give && ctx.give()}><BMark fill /> GIVE</button>
        <button className="bal-act" onClick={() => ctx.get && ctx.get()}><BMark /> GET</button>
        <button className="bal-act" onClick={() => ctx.offer && ctx.offer()}><BMark /> OFFER</button>
      </div>

      <div className="stat-grid">
        <div className="card stat">
          <div className="s-k"><span className="verb">FREEd</span> this season</div>
          <div className="s-v"><span className="n">2,140</span><span className="u">BLiNG!</span></div>
          <div className="bar"><i style={{ width: "72%" }} /></div>
        </div>
        <div className="card stat">
          <div className="s-k"><span style={{ color: "var(--ink-soft)", fontWeight: 600 }}>GOT</span> from members</div>
          <div className="s-v"><span className="n">880</span><span className="u">BLiNG!</span></div>
          <div className="bar"><i style={{ width: "46%" }} /></div>
        </div>
        <div className="card stat out">
          <div className="s-k"><span style={{ color: "var(--ink-soft)", fontWeight: 600 }}>GAVE</span> to members</div>
          <div className="s-v"><span className="n">540</span><span className="u">BLiNG!</span></div>
          <div className="bar"><i style={{ width: "30%" }} /></div>
        </div>
      </div>

      <div className="assure">
        <div className="terms">
          <span className="pill"><BMark /> Capped supply</span>
          <span className="pill"><BMark /> Member-owned</span>
          <span className="pill"><BMark /> Fully transparent</span>
        </div>
        <span className="verify" onClick={() => ctx.go("openbooks")} role="button" tabIndex={0}>Read the open ledger<span className="chev" /></span>
      </div>

      <div className="creed">
        <div className="eyebrow">The promise</div>
        <p>Every BLiNG! here was <em>FREE</em>d by what members make and do. No one prints it. No one can quietly take it. The ledger is yours to read, in full.</p>
      </div>

      <div className="recent">
        <div className="recent-head">
          <div className="eyebrow">Recent movement</div>
          <span className="seeall" onClick={() => ctx.go("ledger")} role="button" tabIndex={0}>See all in The Ledger →</span>
        </div>
        <div className="ledger-list">
          {recent.map((r, i) => <LedgerRow key={i} r={r} />)}
        </div>
      </div>
    </main>
  );
}

/* ======================= THE LEDGER ======================= */
function Ledger() {
  const store = React.useContext(StoreCtx);
  const balanceLabel = store ? store.balanceLabel : "12,480";
  const extra = store ? store.extra : [];
  const [filter, setFilter] = React.useState("all");
  const base = LEDGER.map((g, i) => (i === 0 ? { ...g, rows: [...extra, ...g.rows] } : g));
  const groups = base
    .map((g) => ({ ...g, rows: g.rows.filter((r) => filter === "all" || r.kind === filter) }))
    .filter((g) => g.rows.length);
  const filters = [
    { k: "all", label: "All movement" },
    { k: "freed", label: "FREEd" },
    { k: "got", label: "GOT" },
    { k: "given", label: "GAVE" },
    { k: "offer", label: "OFFERS" },
  ];
  return (
    <main className="app-main">
      <div className="ledger-top">
        <div>
          <div className="eyebrow">The Sovereign Ledger</div>
          <h1>The Ledger</h1>
          <div className="sub">Every movement of your BLiNG!, in the open — where it came from and where it went.</div>
        </div>
        <div className="ledger-summary">
          <div className="ls-item">
            <div className="k">Balance</div>
            <div className="v"><BMark fill /> {balanceLabel}</div>
          </div>
          <div className="ls-item">
            <div className="k">This week</div>
            <div className="v" style={{ color: "var(--accent-deep)" }}>+ 565</div>
          </div>
        </div>
      </div>

      <div className="filters">
        {filters.map((f) => {
          const on = filter === f.k;
          return (
            <span key={f.k} className={"chip" + (on ? " active" : "")}
                  onClick={() => setFilter(f.k)} role="button" tabIndex={0}>
              {on && <BMark />}{f.label}
            </span>
          );
        })}
      </div>

      <div className="ledger-list">
        {groups.map((g, gi) => (
          <React.Fragment key={gi}>
            <div className="day-head">
              <span className="d-label">{g.day}</span>
              <span className="d-line" />
              {filter === "all" && <span className="d-sum">{g.sum} BLiNG!</span>}
            </div>
            {g.rows.map((r, i) => <LedgerRow key={i} r={r} />)}
          </React.Fragment>
        ))}
        {!groups.length && (
          <div className="feed-empty"><span className="live-dot" /> No movement to show under this filter.</div>
        )}
      </div>

      <div className="ledger-foot">
        <span className="seal" />
        Append-only and member-owned. Nothing here can be edited or erased — only added to, in the open.
      </div>
    </main>
  );
}

/* ======================= GIVE · GET · OFFER ======================= */
function Move() {
  const ctx = React.useContext(FrameCtx);
  const [amt, setAmt] = React.useState("250");
  const nadia = { id: "@nadia", name: "Nadia Reyes", handle: "@nadia · HoneyComb", a: "N" };
  const n = Math.max(0, Math.floor(Number(amt) || 0));
  const persons = [
    { a: "A", name: "Amara Osei", handle: "@amara", id: "@amara" },
    { a: "T", name: "Theo Lind", handle: "@theo", id: "@theo" },
    { a: "R", name: "Riverkeepers", handle: "@riverkeepers", id: "@riverkeepers" },
    { a: "J", name: "Jonah Pell", handle: "@jonah", id: "@jonah" },
  ];
  return (
    <main className="app-main">
      <div className="move-top">
        <div className="eyebrow">Move value</div>
        <h1>Give · Get · Offer</h1>
        <div className="sub">Sovereign and whole — value moves between members free of any fee.</div>
      </div>

      <div className="move-grid">
        <div>
          <div className="mode-tabs">
            <div className="mode-tab active" onClick={() => ctx.give({ member: nadia, amount: n })}>
              <div className="mt-k"><BMark fill /> GIVE</div>
              <div className="mt-d">Send BLiNG! to a member, no strings.</div>
            </div>
            <div className="mode-tab" onClick={() => ctx.get()}>
              <div className="mt-k"><BMark /> GET</div>
              <div className="mt-d">Ask a member for value you're owed.</div>
            </div>
            <div className="mode-tab" onClick={() => ctx.offer()}>
              <div className="mt-k"><BMark /> OFFER</div>
              <div className="mt-d">Post an Astra others can GET.</div>
            </div>
          </div>

          <div className="card composer">
            <div className="field">
              <label>To member</label>
              <div className="recip">
                <div className="avatar">N</div>
                <div>
                  <div className="r-name">Nadia Reyes</div>
                  <div className="r-handle">@nadia · HoneyComb</div>
                </div>
                <span className="r-change" onClick={() => ctx.give({ member: nadia, amount: n })}>Change</span>
              </div>
            </div>

            <div className="field">
              <label>Amount to GIVE</label>
              <div className="amount-field">
                <span className="heromark"><span className="d" /><span className="d inner" /></span>
                <input type="text" value={amt} inputMode="numeric" aria-label="Amount"
                  onChange={(e) => setAmt(e.target.value.replace(/[^0-9]/g, ""))} />
                <span className="cur">BLiNG!</span>
              </div>
            </div>

            <div className="summary">
              <div className="srow"><span className="sk">They receive</span><span className="sv">{fmt(n)} BLiNG!</span></div>
              <div className="srow fee"><span className="sk">Platform fee</span><span className="sv">None — value moves whole</span></div>
              <div className="srow total"><span className="sk">Leaves your balance</span><span className="sv">{fmt(n)} BLiNG!</span></div>
            </div>

            <button className="btn-give" onClick={() => ctx.give({ member: nadia, amount: n })}><BMark /> GIVE {fmt(n)} BLiNG! to Nadia</button>
          </div>
        </div>

        <div className="move-aside">
          <div className="card aside-card">
            <h3>Recent members</h3>
            <div className="people">
              {persons.map((p, i) => (
                <div className="person pick" key={i} onClick={() => ctx.give({ member: p, amount: n })}>
                  <div className="avatar">{p.a}</div>
                  <div>
                    <div className="p-name">{p.name}</div>
                    <div className="p-handle">{p.handle}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="sovereign-note">
            <span className="sn-mark" />
            <p><b>Sovereign by design.</b> You GIVE, GET, and OFFER directly with other members. No middle cut, no held funds — the ledger simply records that value moved, whole.</p>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ======================= PHONE SCREENS ======================= */
function PhoneStatus() {
  return (
    <div className="phone-status">
      <span>9:41</span>
      <span className="dots"><i /><i /><i /><span style={{ marginLeft: 4 }}>BLiNG!</span></span>
    </div>
  );
}

function PhoneBalance() {
  return (
    <div className="phone-screen">
      <PhoneStatus />
      <div className="phone-body">
        <div className="ph-eyebrow">Your standing</div>
        <div className="ph-hero">
          <span className="heromark"><span className="d" /><span className="d inner" /></span>
          <span className="big">12,480</span>
        </div>
        <div className="ph-standing"><span className="k">Standing</span><span className="v">In good comb</span></div>
        <div className="ph-actions">
          <div className="ph-act"><span className="pa-mark fill" /><span className="pa-k">GIVE</span></div>
          <div className="ph-act"><span className="pa-mark" /><span className="pa-k">GET</span></div>
          <div className="ph-act"><span className="pa-mark" /><span className="pa-k">OFFER</span></div>
        </div>
        <div className="ph-sec">Recent movement</div>
        <div>
          {[["FREEd for curating «Field Notes»", "FREEd", "320", "pos"],
            ["GOT from Amara Osei", "GOT", "140", "pos"],
            ["GAVE to Riverkeepers commons", "GAVE", "90", "neg"],
            ["FREEd for tending the forum", "FREEd", "60", "pos"]].map((r, i) => (
            <div className="ph-row" key={i}>
              <div>
                <div className="pr-desc">{r[0]}</div>
                <div className="pr-tag">{r[1]}</div>
              </div>
              <div className={"pr-amt " + r[3]}>{r[2]}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="phone-tabbar">
        <div className="ptab active"><span className="pt-mark" />Balance</div>
        <div className="ptab"><span className="pt-mark" />Ledger</div>
        <div className="ptab"><span className="pt-mark" />Move</div>
      </div>
    </div>
  );
}

function PhoneMove() {
  return (
    <div className="phone-screen">
      <PhoneStatus />
      <div className="phone-body">
        <div className="ph-eyebrow">Move value · free of fees</div>
        <div className="ph-actions" style={{ marginTop: 14 }}>
          <div className="ph-act" style={{ borderColor: "var(--accent-deep)", background: "var(--accent-soft)" }}><span className="pa-mark fill" /><span className="pa-k">GIVE</span></div>
          <div className="ph-act"><span className="pa-mark" /><span className="pa-k">GET</span></div>
          <div className="ph-act"><span className="pa-mark" /><span className="pa-k">OFFER</span></div>
        </div>
        <div className="ph-sec">To member</div>
        <div className="recip" style={{ marginBottom: 16 }}>
          <div className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>N</div>
          <div><div className="r-name">Nadia Reyes</div><div className="r-handle">@nadia</div></div>
        </div>
        <div className="ph-sec">Amount</div>
        <div className="amount-field" style={{ padding: "14px 16px", marginBottom: 16 }}>
          <span className="heromark" style={{ width: 22, height: 22 }}><span className="d" /><span className="d inner" /></span>
          <input type="text" defaultValue="250" style={{ fontSize: 28 }} aria-label="Amount" />
          <span className="cur">BLiNG!</span>
        </div>
        <div className="summary" style={{ marginBottom: 16 }}>
          <div className="srow fee"><span className="sk">Platform fee</span><span className="sv">None</span></div>
          <div className="srow total"><span className="sk">Leaves balance</span><span className="sv">250</span></div>
        </div>
        <button className="btn-give" style={{ width: "100%" }}><BMark /> GIVE 250 BLiNG!</button>
      </div>
      <div className="phone-tabbar">
        <div className="ptab"><span className="pt-mark" />Balance</div>
        <div className="ptab"><span className="pt-mark" />Ledger</div>
        <div className="ptab active"><span className="pt-mark" />Move</div>
      </div>
    </div>
  );
}

Object.assign(window, { Balance, Ledger, Move, PhoneBalance, PhoneMove, LEDGER, fmt, StoreCtx });
