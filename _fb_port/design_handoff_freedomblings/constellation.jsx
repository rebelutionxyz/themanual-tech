/* constellation.jsx — the HoneyComb constellation launcher (sibling Astras) */

// Astras in the HONEYCOMB constellation — they share the same BLiNG! ledger.
const ASTRAS = [
  { name: "FreedomBLiNGS", role: "BLiNG! · The Sovereign Ledger", status: "here" },
  { name: "FreedomNETWORK", role: "The Live News Network", status: "soon" },
  { name: "TheMANUAL", role: "The knowledge spine", status: "live" },
  { name: "MiniWaves", role: "Mini Waves · your tasks", status: "live" },
  { name: "DingleBERRY", role: "Security & the commons", status: "beta" },
  { name: "BLiNGster", role: "The games arena", status: "soon" },
  { name: "TheWORKSHOP", role: "Clone-mode workshop", status: "soon" },
];

const STATUS = {
  here: { label: "Here", cls: "here" },
  live: { label: "Live", cls: "live" },
  beta: { label: "Beta", cls: "beta" },
  soon: { label: "Soon", cls: "soon" },
};

// App-launcher glyph: a 2×2 cluster of diamonds, one lit — a little constellation.
function LauncherGlyph() {
  return (
    <span className="launch-glyph" aria-hidden="true">
      <i /><i className="lit" /><i /><i />
    </span>
  );
}

function StatusPill({ status }) {
  const s = STATUS[status];
  return <span className={"astra-status " + s.cls}><span className="dot" />{s.label}</span>;
}

function AstraCard({ a, onStep, stepping }) {
  const here = a.status === "here";
  const clickable = !here && a.status !== "soon";
  return (
    <div className={"astra-card" + (here ? " current" : "") + (clickable ? " steppable" : "") + (stepping ? " stepping" : "")}
         onClick={clickable ? () => onStep(a) : undefined}
         title={clickable ? "Step across — your BLiNG! follows you" : undefined}>
      <div className="ac-top">
        <span className="ac-mark" />
        <span className="ac-name">{a.name}</span>
        <StatusPill status={a.status} />
      </div>
      <div className="ac-role">{a.role}</div>
      {here && <div className="ac-here">This ledger · your BLiNG! lives here</div>}
      {stepping && <div className="astra-step"><span className="live-dot" /> Stepping across — your BLiNG! follows you…</div>}
    </div>
  );
}

function ConstellationOverlay({ onClose }) {
  const [stepping, setStepping] = React.useState(null);
  const step = (a) => { setStepping(a); setTimeout(onClose, 1150); };
  return (
    <div className="constel" role="dialog" aria-label="The HoneyComb constellation">
      <div className="constel-backdrop" onClick={onClose} />
      <div className="constel-panel card">
        <div className="constel-head">
          <div>
            <div className="eyebrow">Your constellation</div>
            <h2>The HoneyComb</h2>
            <p className="constel-sub">The Astras that share one honest, member-owned BLiNG! ledger. Step across — your balance follows you.</p>
          </div>
          <button className="constel-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="astra-grid">
          {ASTRAS.map((a) => <AstraCard key={a.name} a={a} onStep={step}
                                        stepping={stepping && stepping.name === a.name} />)}
        </div>
        <div className="constel-foot">
          <span className="seal" />
          Beyond the comb — other constellations: <b>AtlasNation</b> · <b>The Bee Games</b>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ASTRAS, LauncherGlyph, ConstellationOverlay, AstraCard, StatusPill });
