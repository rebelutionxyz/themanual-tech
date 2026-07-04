/* provenance.jsx — "Trace this BLiNG!" public lineage overlay */

const PROV_TAG = { FREEd: "freed", GAVE: "given", GOT: "got", OFFER: "offer" };

function defaultTrace(entry) {
  return [
    { tag: "FREEd", desc: "FREEd into existence for productive action", who: "The HoneyComb", when: "origin", amt: entry.amt, kind: "origin" },
    { desc: entry.desc, who: "You · Rosa Maren", when: "now", kind: "now" },
  ];
}

function Initial({ who }) {
  const ch = (who || "?").replace(/^@/, "").charAt(0).toUpperCase();
  return <span className="avatar sm">{ch}</span>;
}

function ProvNode({ s, last }) {
  const isNow = s.kind === "now";
  return (
    <div className={"prov-node" + (s.kind ? " " + s.kind : "")}>
      <div className="pn-rail">
        <span className="pn-dot" />
        {!last && <span className="pn-stem" />}
      </div>
      <div className="pn-card">
        <div className="pn-top">
          {!isNow && s.tag && <span className={"l-tag " + PROV_TAG[s.tag]}>{s.tag}</span>}
          {isNow && <span className="pn-now-tag">Now</span>}
          {s.when && <span className="pn-when">{s.when}</span>}
          {s.amt && <span className="pn-amt num">{s.amt}</span>}
        </div>
        <div className="pn-desc">{s.desc}</div>
        {s.who && <div className="pn-who"><Initial who={s.who} />{s.who}</div>}
        {s.kind === "origin" && <div className="pn-bucket">Issued from: <b>the well · Royal Jelly Treasury</b></div>}
        {s.kind === "origin" && <div className="pn-label">Origin · FREEd into existence</div>}
        {isNow && <div className="pn-label now">Resting in your ledger</div>}
      </div>
    </div>
  );
}

function ProvenanceOverlay({ entry, onClose }) {
  const steps = entry.trace && entry.trace.length ? entry.trace : defaultTrace(entry);
  const hops = steps.length;
  return (
    <div className="constel" role="dialog" aria-label="Provenance of this BLiNG!">
      <div className="constel-backdrop" onClick={onClose} />
      <div className="prov-panel card">
        <div className="constel-head">
          <div>
            <div className="eyebrow">Provenance · public lineage</div>
            <h2>Trace this BLiNG!</h2>
            <p className="constel-sub">{entry.desc} · <b className="num">{entry.amt} BLiNG!</b>. Every unit remembers how it came to be — here is its whole history, in the open.</p>
            <div className="dna-chip"><span className="dna-k">BLiNG! DNA</span><span className="dna-v num">DROP·F13D9A·20260516·0007</span></div>
          </div>
          <button className="constel-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="prov-line">
          {steps.map((s, i) => <ProvNode key={i} s={s} last={i === hops - 1} />)}
        </div>
        <div className="prov-foot">
          <span className="seal" />
          <span>Origin sealed · {hops} movement{hops > 1 ? "s" : ""} · this lineage is public and cannot be rewritten.</span>
          <span className="prov-verify">Verified ✓</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ProvenanceOverlay });
