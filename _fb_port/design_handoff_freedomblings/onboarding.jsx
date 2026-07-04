/* onboarding.jsx — first-run welcome: claim a sovereign identity, choose
   guardians, and FREE your first BLiNG! Closeable like every other popup. */

function OnboardWizard({ onClose, onWelcome }) {
  useEsc(onClose);
  const [step, setStep] = React.useState(0);
  const [guardians, setGuardians] = React.useState([]);
  const [query, setQuery] = React.useState("");
  const [invited, setInvited] = React.useState([]);
  const welcomedRef = React.useRef(false);
  const grant = 500;

  const toggleG = (m) => setGuardians((g) =>
    g.includes(m.id) ? g.filter((x) => x !== m.id) : (g.length < 5 ? [...g, m.id] : g));

  React.useEffect(() => {
    if (step !== 3 || welcomedRef.current) return;
    welcomedRef.current = true;
    onWelcome && onWelcome({ amt: grant });
    if (window.blingBurst) {
      const r = document.querySelector(".constel-panel");
      if (r) { const b = r.getBoundingClientRect(); window.blingBurst(b.left + b.width / 2, b.top + b.height * 0.32); }
    }
  }, [step]);

  const Dots = () => (
    <div className="onb-dots" aria-hidden="true">
      {[0, 1, 2].map((i) => <span key={i} className={"onb-dot" + (i <= Math.min(step, 2) ? " on" : "")} />)}
    </div>
  );

  // Step 0 — welcome
  if (step === 0) return (
    <Sheet eyebrow="Welcome to the HoneyComb" title="FreedomBLiNGS"
      sub="A sovereign ledger you hold yourself — no bank, no middle cut. Value you FREE by what you make and do."
      onClose={onClose} max={480} foot={<>Member-owned · capped · fully in the open.</>}>
      <div className="onb">
        <div className="onb-gem"><span className="heromark"><span className="d" /><span className="d inner" /></span></div>
        <Dots />
        <p className="onb-lead">Three quick steps and your BLiNG! is live.</p>
        <div className="onb-list">
          <div className="onb-li"><span className="bmark fill" /> Claim a self-held identity</div>
          <div className="onb-li"><span className="bmark fill" /> Choose guardians you trust</div>
          <div className="onb-li"><span className="bmark fill" /> FREE your first BLiNG!</div>
        </div>
        <button className="btn-give" onClick={() => setStep(1)}><BMark /> Get started</button>
        <button className="onb-skip" onClick={onClose}>Skip for now</button>
      </div>
    </Sheet>
  );

  // Step 1 — identity
  if (step === 1) return (
    <Sheet eyebrow="Step 1 · Your identity" title="Claim your sovereign ID"
      sub="This identity lives in your keys — held by you, never in a company's database."
      onClose={onClose} max={480} foot={<>Carry it across every Astra in the comb.</>}>
      <div className="onb">
        <Dots />
        <div className="sovereign-id onb-id" title="Your self-held identity">
          <span className="bmark" /><span className="sid num">comb:rosa · 7K2F·A9D4·9QX2</span>
          <span className="sid-copy">Self-held</span>
        </div>
        <p className="onb-note">No one can lock you out — or let anyone in. Lose your device and your guardians vouch you back. That's next.</p>
        <button className="btn-give" onClick={() => setStep(2)}><BMark /> This is mine — continue</button>
        <button className="onb-skip" onClick={() => setStep(0)}>Back</button>
      </div>
    </Sheet>
  );

  // Step 2 — guardians
  if (step === 2) {
    const need = 3 - guardians.length;
    const roster = [...invited, ...MEMBERS];
    const q = query.trim().toLowerCase();
    const list = q ? roster.filter((m) => (m.name + " " + m.id).toLowerCase().includes(q)) : roster;
    const slug = query.trim().replace(/^@+/, "").replace(/\s+/g, "-").toLowerCase();
    const existsExact = roster.some((m) =>
      m.id.toLowerCase() === "@" + slug || m.name.toLowerCase() === query.trim().toLowerCase());
    const canInvite = query.trim().length > 1 && !existsExact;
    const invite = () => {
      const m = { id: "@" + slug, name: query.trim(), handle: "@" + slug + " · invited",
        a: (query.trim()[0] || "?").toUpperCase(), invited: true };
      setInvited((iv) => [m, ...iv]);
      setGuardians((g) => (g.length < 5 && !g.includes(m.id) ? [...g, m.id] : g));
      setQuery("");
    };
    return (
      <Sheet eyebrow="Step 2 · Guardians" title="Choose 3 guardians"
        sub="If you ever lose your keys, any 3 of these keepers vouch you back in — never a company."
        onClose={onClose} max={480} foot={<>You can change your guardians anytime.</>}>
        <div className="onb">
          <Dots />
          <input className="note-input" placeholder="Search the comb, or invite by name / @handle…"
                 value={query} onChange={(e) => setQuery(e.target.value)} />
          {canInvite && (
            <button type="button" className="onb-invite" onClick={invite}>
              <span className="onb-invite-ic">+</span>
              <span>Invite <b>“{query.trim()}”</b> to be a guardian</span>
            </button>
          )}
          <div className="people onb-people">
            {list.map((m) => {
              const on = guardians.includes(m.id);
              return (
                <div key={m.id} className={"person pick" + (on ? " on" : "")} onClick={() => toggleG(m)}>
                  <div className="avatar">{m.a}</div>
                  <div><div className="p-name">{m.name}</div><div className="p-handle">{m.handle}</div></div>
                  {m.invited && <span className="onb-invited">Invited</span>}
                  <span className="onb-check" data-on={on ? "1" : "0"}>{on ? "✓" : ""}</span>
                </div>
              );
            })}
            {!list.length && <div className="pick-empty">No keepers match “{query}”. Invite them above.</div>}
          </div>
          <button className="btn-give" disabled={guardians.length < 3} onClick={() => setStep(3)}>
            <BMark /> {need > 0 ? `Pick ${need} more` : "Set my guardians"}
          </button>
          <button className="onb-skip" onClick={() => setStep(1)}>Back</button>
        </div>
      </Sheet>
    );
  }

  // Step 3 — celebrate
  return (
    <div className="constel sheet" role="dialog" aria-modal="true" aria-label="Welcome">
      <div className="constel-backdrop" onClick={onClose} />
      <div className="constel-panel card" style={{ width: "min(460px, 100%)" }}>
        <button className="constel-x done-x" onClick={onClose} aria-label="Close">✕</button>
        <div className="give-done">
          <div className="gd-gem"><span className="heromark"><span className="d" /><span className="d inner" /></span></div>
          <div className="gd-lead">Welcome to the comb</div>
          <div className="gd-amt">+{fmt(grant)} <span className="gd-u">BLiNG!</span></div>
          <div className="gd-line">FREE'd to you — your first, just for being here.</div>
          <div className="gd-foot">It's in your ledger now. Everything you make and do can FREE more. Welcome to the comb, Sovereign Beeing.</div>
          <button className="btn-give gd-done-btn" onClick={onClose}>Enter FreedomBLiNGS</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { OnboardWizard });
