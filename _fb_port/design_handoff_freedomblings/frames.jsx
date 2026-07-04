/* frames.jsx — shared chrome: logo mark, wordmark, sidebar, desktop & phone frames */

// One context per DesktopFrame: launch() opens the constellation, trace(entry)
// opens the provenance lineage for a ledger row.
const FrameCtx = React.createContext({ launch: () => {}, trace: () => {}, go: () => {}, give: () => {}, get: () => {}, offer: () => {}, tour: () => {} });

// Diamond emblem — abstract "bling" gem, not a honeycomb. Simple nested squares.
function Mark({ size = 28 }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 32 32" fill="none"
         style={{ display: "block" }} aria-hidden="true">
      <rect x="6" y="6" width="20" height="20" rx="3"
            transform="rotate(45 16 16)" fill="none"
            stroke="var(--accent-deep)" strokeWidth="2" />
      <rect x="11.5" y="11.5" width="9" height="9" rx="1.5"
            transform="rotate(45 16 16)" fill="var(--accent)" />
    </svg>
  );
}

function Wordmark() {
  return (
    <div className="wordmark">
      <Mark size={30} />
      <div className="wm-text">
        <div className="wm-name">Freedom<b>BLiNG</b>S</div>
        <div className="wm-sub">The Sovereign Ledger</div>
      </div>
    </div>
  );
}

// Inline diamond glyph used beside numbers / in prose
function BMark({ fill = false }) {
  return <span className={fill ? "bmark fill" : "bmark"} aria-hidden="true" />;
}

const LEDGER_NAV = [
  { id: "balance", label: "Balance" },
  { id: "earning", label: "Earning" },
  { id: "circulation", label: "Circulation" },
  { id: "ledger", label: "The Ledger" },
  { id: "openbooks", label: "The Open Books" },
  { id: "charter", label: "The Charter" },
  { id: "move", label: "Give · Get · Offer" },
  { id: "discover", label: "Discover" },
  { id: "escrow", label: "Escrow" },
];

function Sidebar({ active }) {
  const ctx = React.useContext(FrameCtx);
  const store = React.useContext(window.StoreCtx);
  const reqCount = store && store.requests ? store.requests.length : 0;
  return (
    <aside className="app-side">
      <button className="side-brand sb-launch" onClick={ctx.launch}
              title="Switch Astra · The HoneyComb">
        <Mark size={24} />
        <div className="nm">Freedom<b>BLiNGS</b></div>
        <LauncherGlyph />
      </button>
      <div className="nav-label">Ledger</div>
      <nav className="nav">
        {LEDGER_NAV.map((n) => (
          <div key={n.id} className={"nav-item" + (active === n.id ? " active" : "")}
               onClick={() => ctx.go(n.id)}>
            <span className="ni-mark" />{n.label}
          </div>
        ))}
      </nav>
      <div className="nav-label">Member</div>
      <nav className="nav">
        <div className={"nav-item" + (active === "requests" ? " active" : "")}
             onClick={() => ctx.go("requests")}>
          <span className="ni-mark" />Requests
          {reqCount > 0 && <span className="ni-tag">{reqCount}</span>}
        </div>
        <div className={"nav-item" + (active === "standing" ? " active" : "")}
             onClick={() => ctx.go("standing")}>
          <span className="ni-mark" />Standing
        </div>
        <div className={"nav-item" + (active === "gradations" ? " active" : "")}
             onClick={() => ctx.go("gradations")}>
          <span className="ni-mark" />Gradations
        </div>
        <div className={"nav-item" + (active === "commons" ? " active" : "")}
             onClick={() => ctx.go("commons")}>
          <span className="ni-mark" />Commons
          <span className="ni-tag">3</span>
        </div>
        <div className={"nav-item" + (active === "lineage" ? " active" : "")}
             onClick={() => ctx.go("lineage")}>
          <span className="ni-mark" />Lineage
        </div>
        <div className={"nav-item" + (active === "legacy" ? " active" : "")}
             onClick={() => ctx.go("legacy")}>
          <span className="ni-mark" />Legacy
        </div>
        <div className={"nav-item" + (active === "emergency" ? " active" : "")}
             onClick={() => ctx.go("emergency")}>
          <span className="ni-mark" />Safety net
        </div>
        <div className={"nav-item" + (active === "astras" ? " active" : "")} onClick={ctx.launch}>
          <span className="ni-mark" />Astras
          <span className="ni-tag">7</span>
        </div>
      </nav>
      <div className="side-foot">
        <button className="member-chip" onClick={ctx.tour} title="Your welcome · sovereign identity"
                style={{ width: "100%", textAlign: "left", font: "inherit", color: "inherit", cursor: "pointer" }}>
          <div className="avatar">R</div>
          <div>
            <div className="mc-name">Rosa Maren</div>
            <div className="mc-role">Sovereign Beeing</div>
          </div>
        </button>
      </div>
    </aside>
  );
}

function DesktopFrame({ url = "freedomblings.com", defaultOpen = false, defaultProv = null, children }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [prov, setProv] = React.useState(defaultProv);
  const bling = useBlingStore();
  const Store = window.StoreCtx;
  const ctx = React.useMemo(() => ({
    launch: () => setOpen(true),
    trace: (entry) => setProv(entry),
    go: () => {},
    ...bling.actions,
  }), [bling.actions]);
  return (
    <div className="desktop-frame">
      <div className="df-bar">
        <div className="df-dots"><i /><i /><i /></div>
        <div className="df-url"><span className="lock" />{url}</div>
      </div>
      <FrameCtx.Provider value={ctx}>
        <Store.Provider value={bling.storeValue}>
          <div className="df-stage">{children}</div>
        </Store.Provider>
      </FrameCtx.Provider>
      {open && <ConstellationOverlay onClose={() => setOpen(false)} />}
      {prov && <ProvenanceOverlay entry={prov} onClose={() => setProv(null)} />}
      <ModalHost modal={bling.modal} onClose={bling.closeModal} store={bling.storeValue} />
    </div>
  );
}

function HeroMark() {
  return (
    <span className="heromark"><span className="d" /><span className="d inner" /></span>
  );
}

Object.assign(window, { Mark, Wordmark, BMark, Sidebar, DesktopFrame, HeroMark, FrameCtx });
