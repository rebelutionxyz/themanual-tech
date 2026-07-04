/* flows.jsx — money movement as closeable modal sheets (GIVE / GET / OFFER)
   + the shared BLiNG! store. Sheets reuse the constellation overlay pattern:
   frosted backdrop, click-out to close, an ✕ button, and Escape. */

const MEMBERS = [
  { id: "@nadia", name: "Nadia Reyes", handle: "@nadia · HoneyComb", a: "N" },
  { id: "@amara", name: "Amara Osei", handle: "@amara", a: "A" },
  { id: "@theo", name: "Theo Lind", handle: "@theo", a: "T" },
  { id: "@riverkeepers", name: "Riverkeepers", handle: "@riverkeepers · commons", a: "R" },
  { id: "@jonah", name: "Jonah Pell", handle: "@jonah", a: "J" },
  { id: "@nima", name: "Nima Farsad", handle: "@nima", a: "N" },
];

// Incoming GET requests other Sovereigns have sent you (illustrative).
const INITIAL_REQUESTS = [
  { id: "r1", member: MEMBERS[2], amt: 120, why: "for the «Cedar & Smoke» recipe set" },
  { id: "r2", member: MEMBERS[1], amt: 60, why: "splitting the forum hosting this season" },
];

// OFFERs posted across the comb — things you can GET (illustrative).
const OFFERS = [
  { id: "o1", title: "«Dawn Walks» field guide", by: MEMBERS[0], amt: 250, tag: "Guide", blurb: "A printable guide to the river's morning birds and where to find them." },
  { id: "o2", title: "«Cedar & Smoke» recipe set", by: MEMBERS[2], amt: 180, tag: "Recipes", blurb: "Twelve seasonal recipes from the smokehouse, beautifully typeset." },
  { id: "o3", title: "Hand-thrown honey pots", by: MEMBERS[1], amt: 420, tag: "Craft", blurb: "Stoneware glazed in comb-gold. Made to order, fired in small batches." },
  { id: "o4", title: "Forum moderation, one season", by: MEMBERS[4], amt: 90, tag: "Service", blurb: "Tending the HoneyComb forum — calm, fair, and present every day." },
];

// ── the store ────────────────────────────────────────────────────────────────
// One per app shell (ProtoApp, and each DesktopFrame on the board). Holds the
// live balance + any new ledger rows, and the modal that's currently open.
function useBlingStore(persistKey) {
  const loaded = React.useMemo(() => {
    if (!persistKey) return null;
    try {
      const s = JSON.parse(localStorage.getItem(persistKey));
      if (s && typeof s.balance === "number" && Array.isArray(s.extra)) return s;
    } catch (e) {}
    return null;
  }, [persistKey]);
  const balanceRef = React.useRef(loaded ? loaded.balance : 12480);
  const [balance, setBalance] = React.useState(loaded ? loaded.balance : 12480);
  const [extra, setExtra] = React.useState(loaded ? loaded.extra : []);
  const [modal, setModal] = React.useState(null);
  const [requests, setRequests] = React.useState(() => INITIAL_REQUESTS.map((r) => ({ ...r })));
  const removeRequest = React.useCallback((id) => setRequests((rs) => rs.filter((x) => x.id !== id)), []);

  React.useEffect(() => {
    if (!persistKey) return;
    try { localStorage.setItem(persistKey, JSON.stringify({ balance, extra })); } catch (e) {}
  }, [persistKey, balance, extra]);

  const commitGive = React.useCallback(({ member, amt, note }) => {
    const nb = balanceRef.current - amt;
    balanceRef.current = nb;
    setBalance(nb);
    setExtra((x) => [{
      kind: "given",
      desc: note ? `GAVE to ${member.name} — ${note}` : `GAVE to ${member.name}`,
      who: member.id, amt: String(amt), dir: "neg", run: fmt(nb),
      trace: [
        { tag: "FREEd", desc: "FREEd by your productive action", who: "You · Rosa Maren", when: "earlier", amt: String(amt), kind: "origin" },
        { tag: "GAVE", desc: `You GAVE to ${member.name}${note ? ` — ${note}` : ""}`, who: `You → ${member.id}`, when: "just now", amt: String(amt), kind: "now" },
      ],
    }, ...x]);
  }, []);

  const commitGet = React.useCallback(({ member, amt, note }) => {
    setExtra((x) => [{
      kind: "get",
      desc: note ? `GET requested from ${member.name} — ${note}` : `GET requested from ${member.name}`,
      who: member.id, amt: null, pill: "Requested · pending", run: fmt(balanceRef.current),
    }, ...x]);
  }, []);

  const commitOffer = React.useCallback(({ title, desc }) => {
    setExtra((x) => [{
      kind: "offer",
      desc: `OFFERed «${title}»${desc ? ` — ${desc}` : ""}`,
      who: "Open to the HoneyComb", amt: null, pill: "Posted · open", run: fmt(balanceRef.current),
    }, ...x]);
  }, []);

  const commitWelcome = React.useCallback(({ amt }) => {
    const nb = balanceRef.current + amt;
    balanceRef.current = nb;
    setBalance(nb);
    setExtra((x) => [{
      kind: "freed",
      desc: "FREEd — welcome to the comb",
      who: "Productive action", amt: String(amt), dir: "pos", run: fmt(nb),
      trace: [
        { tag: "FREEd", desc: "FREEd to welcome you to the HoneyComb", who: "The comb", when: "just now", amt: String(amt), kind: "origin" },
        { desc: "Resting in your ledger, ready to move", who: "You · Rosa Maren", when: "now", kind: "now" },
      ],
    }, ...x]);
  }, []);

  const storeValue = React.useMemo(() => ({
    balance, balanceLabel: fmt(balance), extra,
    recent: [...extra, ...window.LEDGER[0].rows].slice(0, 4),
    requests, removeRequest,
    commitGive, commitGet, commitOffer, commitWelcome,
  }), [balance, extra, requests, removeRequest, commitGive, commitGet, commitOffer, commitWelcome]);

  const actions = React.useMemo(() => ({
    give: (payload) => setModal({ type: "give", payload }),
    get: (payload) => setModal({ type: "get", payload }),
    offer: () => setModal({ type: "offer" }),
  }), []);

  return { storeValue, actions, modal, closeModal: () => setModal(null) };
}

// ── shared sheet shell ────────────────────────────────────────────────────────
function useEsc(onClose) {
  React.useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
}

function Sheet({ eyebrow, title, sub, onClose, children, foot, max = 520 }) {
  useEsc(onClose);
  return (
    <div className="constel sheet" role="dialog" aria-modal="true" aria-label={title}>
      <div className="constel-backdrop" onClick={onClose} />
      <div className="constel-panel card" style={{ width: `min(${max}px, 100%)` }}>
        <div className="constel-head">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h2>{title}</h2>
            {sub && <p className="constel-sub">{sub}</p>}
          </div>
          <button className="constel-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
        {foot && <div className="constel-foot"><span className="seal" />{foot}</div>}
      </div>
    </div>
  );
}

function QuickSet({ onPick }) {
  return (
    <div className="quickset">
      {[100, 250, 500, 1000].map((q) => (
        <button key={q} type="button" className="qpill" onClick={() => onPick(q)}>{fmt(q)}</button>
      ))}
    </div>
  );
}

function PickerSheet({ current, onClose, onPick, title = "Choose a member", eyebrow = "To member" }) {
  const [q, setQ] = React.useState("");
  const list = MEMBERS.filter((m) => (m.name + " " + m.id).toLowerCase().includes(q.toLowerCase()));
  return (
    <Sheet eyebrow={eyebrow} title={title} onClose={onClose} max={460}>
      <input className="note-input" style={{ marginBottom: 12 }} placeholder="Search members…"
             value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      <div className="people">
        {list.map((m) => (
          <div key={m.id} className={"person pick" + (current && current.id === m.id ? " on" : "")}
               onClick={() => onPick(m)}>
            <div className="avatar">{m.a}</div>
            <div><div className="p-name">{m.name}</div><div className="p-handle">{m.handle}</div></div>
            {current && current.id === m.id && <span className="pick-on">Selected</span>}
          </div>
        ))}
        {!list.length && <div className="pick-empty">No members match “{q}”.</div>}
      </div>
    </Sheet>
  );
}

// ── the success moment ────────────────────────────────────────────────────────
function SuccessSheet({ kind, lead, member, custom, amt, foot, onClose }) {
  useEsc(onClose);
  React.useEffect(() => {
    if (!window.blingBurst) return;
    const r = document.querySelector(".constel-panel");
    if (r) { const b = r.getBoundingClientRect(); window.blingBurst(b.left + b.width / 2, b.top + b.height * 0.32); }
  }, []);
  return (
    <div className="constel sheet" role="dialog" aria-modal="true" aria-label={lead}>
      <div className="constel-backdrop" onClick={onClose} />
      <div className="constel-panel card" style={{ width: "min(440px, 100%)" }}>
        <button className="constel-x done-x" onClick={onClose} aria-label="Close">✕</button>
        <div className="give-done">
          <div className="gd-gem"><span className="heromark"><span className="d" /><span className="d inner" /></span></div>
          <div className="gd-lead">{lead}</div>
          {amt != null && <div className="gd-amt">{fmt(amt)} <span className="gd-u">BLiNG!</span></div>}
          <div className="gd-line">
            {kind === "GIVE" && <>to <b>{member.name}</b>, whole and fee-free.</>}
            {kind === "GET" && <>asked of <b>{member.name}</b>.</>}
            {kind === "OFFER" && <><b>{custom}</b> is live.</>}
          </div>
          <div className="gd-foot">{foot}</div>
          <button className="btn-give gd-done-btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

// ── GIVE ──────────────────────────────────────────────────────────────────────
function GiveSheet({ initial, onClose, onCommit }) {
  const [member, setMember] = React.useState(initial.member || MEMBERS[0]);
  const [amt, setAmt] = React.useState(String(initial.amount != null ? initial.amount : 250));
  const [note, setNote] = React.useState(initial.note || "");
  const [pick, setPick] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const n = Math.max(0, Math.floor(Number(amt) || 0));

  if (done) return <SuccessSheet kind="GIVE" lead="GIVEN" member={member} amt={n}
    foot={<>Recorded in the open ledger · trace it anytime.</>} onClose={onClose} />;
  if (pick) return <PickerSheet current={member} title="Give to…" onClose={() => setPick(false)}
    onPick={(m) => { setMember(m); setPick(false); }} />;

  return (
    <Sheet eyebrow="Move value · free of fees" title="GIVE BLiNG!"
      sub="Sovereign and whole — value moves member to member, with no fee and no middle cut."
      onClose={onClose} max={520}
      foot={<>No platform fee · the ledger records that value moved, <b>whole</b>.</>}>
      <div className="composer sheet-form">
        <div className="field">
          <label>To member</label>
          <div className="recip">
            <div className="avatar">{member.a}</div>
            <div><div className="r-name">{member.name}</div><div className="r-handle">{member.handle}</div></div>
            <span className="r-change" onClick={() => setPick(true)}>Change</span>
          </div>
        </div>
        <div className="field">
          <label>Amount to GIVE</label>
          <div className="amount-field">
            <span className="heromark"><span className="d" /><span className="d inner" /></span>
            <input type="text" inputMode="numeric" value={amt}
              onChange={(e) => setAmt(e.target.value.replace(/[^0-9]/g, ""))} aria-label="Amount" />
            <span className="cur">BLiNG!</span>
          </div>
          <QuickSet onPick={(q) => setAmt(String(q))} />
        </div>
        <div className="field">
          <label>A note (optional)</label>
          <input className="note-input" type="text" value={note} placeholder="What's this for?"
            onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="summary">
          <div className="srow"><span className="sk">They receive</span><span className="sv">{fmt(n)} BLiNG!</span></div>
          <div className="srow fee"><span className="sk">Platform fee</span><span className="sv">None — value moves whole</span></div>
          <div className="srow total"><span className="sk">Leaves your balance</span><span className="sv">{fmt(n)} BLiNG!</span></div>
        </div>
        <button className="btn-give" disabled={n <= 0}
          onClick={() => { onCommit({ member, amt: n, note }); setDone(true); }}>
          <BMark /> GIVE {fmt(n)} BLiNG! to {member.name.split(" ")[0]}
        </button>
      </div>
    </Sheet>
  );
}

// ── GET (request) ──────────────────────────────────────────────────────────────
function GetSheet({ initial, onClose, onCommit }) {
  const [member, setMember] = React.useState(initial.member || MEMBERS[1]);
  const [amt, setAmt] = React.useState(String(initial.amount != null ? initial.amount : 120));
  const [note, setNote] = React.useState(initial.note || "");
  const [pick, setPick] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const n = Math.max(0, Math.floor(Number(amt) || 0));

  if (done) return <SuccessSheet kind="GET" lead="REQUEST SENT" member={member} amt={n}
    foot={<>{member.name} will see your GET in their ledger — they stay in control.</>} onClose={onClose} />;
  if (pick) return <PickerSheet current={member} title="Ask…" eyebrow="From member" onClose={() => setPick(false)}
    onPick={(m) => { setMember(m); setPick(false); }} />;

  return (
    <Sheet eyebrow="Ask for value you're owed" title="GET BLiNG!"
      sub="Send a request to a member. Nothing moves until they choose to GIVE — sovereign on both sides."
      onClose={onClose} max={520}
      foot={<>A GET is an invitation, never a pull · they stay in control.</>}>
      <div className="composer sheet-form">
        <div className="field">
          <label>From member</label>
          <div className="recip">
            <div className="avatar">{member.a}</div>
            <div><div className="r-name">{member.name}</div><div className="r-handle">{member.handle}</div></div>
            <span className="r-change" onClick={() => setPick(true)}>Change</span>
          </div>
        </div>
        <div className="field">
          <label>Amount to GET</label>
          <div className="amount-field">
            <span className="heromark"><span className="d" /><span className="d inner" /></span>
            <input type="text" inputMode="numeric" value={amt}
              onChange={(e) => setAmt(e.target.value.replace(/[^0-9]/g, ""))} aria-label="Amount" />
            <span className="cur">BLiNG!</span>
          </div>
          <QuickSet onPick={(q) => setAmt(String(q))} />
        </div>
        <div className="field">
          <label>What's it for? (optional)</label>
          <input className="note-input" type="text" value={note} placeholder="A short reason"
            onChange={(e) => setNote(e.target.value)} />
        </div>
        <button className="btn-give" disabled={n <= 0}
          onClick={() => { onCommit({ member, amt: n, note }); setDone(true); }}>
          <BMark /> Ask {member.name.split(" ")[0]} for {fmt(n)} BLiNG!
        </button>
      </div>
    </Sheet>
  );
}

// ── OFFER (post) ────────────────────────────────────────────────────────────────
function OfferSheet({ onClose, onCommit }) {
  const [title, setTitle] = React.useState("");
  const [amt, setAmt] = React.useState("");
  const [desc, setDesc] = React.useState("");
  const [done, setDone] = React.useState(false);
  const n = Math.max(0, Math.floor(Number(amt) || 0));

  if (done) return <SuccessSheet kind="OFFER" lead="OFFER POSTED" custom={title.trim() || "Your Astra"}
    amt={n || null} foot={<>Open to the HoneyComb · members can GET it from your ledger.</>} onClose={onClose} />;

  return (
    <Sheet eyebrow="Post something others can GET" title="OFFER an Astra"
      sub="Share what you make or do. Members discover it and GET it — value flows to you, whole."
      onClose={onClose} max={520}
      foot={<>An OFFER is public and member-owned · edit or withdraw it anytime.</>}>
      <div className="composer sheet-form">
        <div className="field">
          <label>What are you offering?</label>
          <input className="note-input" value={title} placeholder="e.g. «Dawn Walks» field guide"
            onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label>Suggested value (optional)</label>
          <div className="amount-field">
            <span className="heromark"><span className="d" /><span className="d inner" /></span>
            <input type="text" inputMode="numeric" value={amt} placeholder="0"
              onChange={(e) => setAmt(e.target.value.replace(/[^0-9]/g, ""))} aria-label="Suggested value" />
            <span className="cur">BLiNG!</span>
          </div>
          <QuickSet onPick={(q) => setAmt(String(q))} />
        </div>
        <div className="field">
          <label>A short description (optional)</label>
          <input className="note-input" value={desc} placeholder="What members can expect"
            onChange={(e) => setDesc(e.target.value)} />
        </div>
        <button className="btn-give" disabled={!title.trim()}
          onClick={() => { onCommit({ title: title.trim(), desc }); setDone(true); }}>
          <BMark /> Post OFFER
        </button>
      </div>
    </Sheet>
  );
}

// ── section popup ─────────────────────────────────────────────────────────────
// A whole app section rendered as a large, scrollable, closeable popup over the
// main area. The component inside is mounted only while open (render-on-click)
// and unmounted on close — so we never build every screen up front.
// Opens at the top the first time; remembers your scroll position after that
// (positions live in `posStore`, owned by the app shell, keyed by section id).
function SectionSheet({ title, scrollKey, posStore, onClose, children }) {
  useEsc(onClose);
  const ref = React.useRef(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = (posStore && posStore[scrollKey] != null) ? posStore[scrollKey] : 0;
  }, [scrollKey]);
  const onScroll = (e) => { if (posStore) posStore[scrollKey] = e.currentTarget.scrollTop; };
  return (
    <div className="constel section-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="constel-backdrop" onClick={onClose} />
      <div className="section-panel card">
        <div className="section-head">
          <div className="sh-title"><span className="bmark fill" />{title}</div>
          <button className="constel-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="section-scroll" ref={ref} onScroll={onScroll}>{children}</div>
      </div>
    </div>
  );
}

// ── Requests inbox ────────────────────────────────────────────────────────────
// Incoming GETs: Fulfill (opens GIVE prefilled) or Decline. Closes the GET loop.
function Requests() {
  const ctx = React.useContext(FrameCtx);
  const store = React.useContext(StoreCtx);
  const reqs = store ? store.requests : INITIAL_REQUESTS;
  return (
    <main className="app-main">
      <div className="commons-top">
        <div>
          <div className="eyebrow">People asking to GET</div>
          <h1>Requests</h1>
          <div className="sub">Members can ask you for value — nothing moves until you choose to GIVE. Sovereign on both sides.</div>
        </div>
        <div className="commons-tags"><span className="pill"><span className="live-dot" /> {reqs.length} open</span></div>
      </div>

      {reqs.length ? (
        <div className="req-list">
          {reqs.map((r) => (
            <div className="card req-row" key={r.id}>
              <div className="avatar">{r.member.a}</div>
              <div className="req-main">
                <div className="req-who">{r.member.name}<span className="req-handle num">{r.member.id}</span></div>
                <div className="req-why">asks for value — {r.why}</div>
              </div>
              <div className="req-amt num">{fmt(r.amt)} <span>BLiNG!</span></div>
              <div className="req-actions">
                <button className="bal-act primary" onClick={() => { ctx.give({ member: r.member, amount: r.amt, note: r.why }); store && store.removeRequest(r.id); }}>Fulfill</button>
                <button className="bal-act" onClick={() => store && store.removeRequest(r.id)}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="feed-empty"><span className="live-dot" /> No open requests. When a Sovereign asks you for value, it appears here.</div>
      )}

      <div className="ledger-foot">
        <span className="seal" />
        A GET is only ever an invitation — you stay in control. Fulfilling one is a normal GIVE, recorded whole in the open ledger.
      </div>
    </main>
  );
}

// ── Discover (OFFERs marketplace) ────────────────────────────────────────────
// Browse OFFERs; GETting one is a GIVE to its maker. Closes the OFFER loop.
function Discover() {
  const ctx = React.useContext(FrameCtx);
  return (
    <main className="app-main">
      <div className="commons-top">
        <div>
          <div className="eyebrow">What Sovereigns are offering</div>
          <h1>Discover</h1>
          <div className="sub">OFFERs posted across the comb. GET one and value flows to its maker, whole — never a fee, never a middle cut.</div>
        </div>
        <div className="commons-tags">
          <button className="bal-act primary" onClick={() => ctx.offer()}><BMark fill /> Post an OFFER</button>
        </div>
      </div>

      <div className="offer-grid">
        {OFFERS.map((o) => (
          <div className="card offer-card" key={o.id}>
            <div className="offer-ph" aria-hidden="true" />
            <div className="offer-body">
              <span className="offer-tag">{o.tag}</span>
              <div className="offer-title">{o.title}</div>
              <div className="offer-blurb">{o.blurb}</div>
              <div className="offer-by"><span className="avatar sm">{o.by.a}</span> {o.by.name}</div>
              <div className="offer-foot">
                <div className="offer-amt num">{fmt(o.amt)} <span>BLiNG!</span></div>
                <button className="bal-act primary"
                        onClick={() => ctx.give({ member: o.by, amount: o.amt, note: `for «${o.title}»` })}>GET this</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="ledger-foot">
        <span className="seal" />
        Suggested values are set by each maker. GETting an OFFER is a normal GIVE to them — whole, fee-free, and recorded in the open.
      </div>
    </main>
  );
}

// ── host ────────────────────────────────────────────────────────────────────────
function ModalHost({ modal, onClose, store }) {
  if (!modal) return null;
  if (modal.type === "give") return <GiveSheet initial={modal.payload || {}} onClose={onClose} onCommit={store.commitGive} />;
  if (modal.type === "get") return <GetSheet initial={modal.payload || {}} onClose={onClose} onCommit={store.commitGet} />;
  if (modal.type === "offer") return <OfferSheet onClose={onClose} onCommit={store.commitOffer} />;
  return null;
}

Object.assign(window, {
  MEMBERS, useBlingStore, Sheet, QuickSet, PickerSheet,
  SuccessSheet, GiveSheet, GetSheet, OfferSheet, SectionSheet, ModalHost, Requests, Discover,
});
