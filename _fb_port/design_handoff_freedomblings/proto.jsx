/* proto.jsx — FreedomBLiNGS clickable prototype: one routed app shell over the built surfaces. */

const PROTO_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "aurora",
  "accent": "honey",
  "density": "regular",
  "typeface": "grotesque"
}/*EDITMODE-END*/;

const VIEW_MAP = {
  balance: Balance, earning: Faucets, circulation: Circulation, ledger: Ledger,
  openbooks: OpenBooks, charter: Charter, move: Move, escrow: Escrow,
  standing: Standing, gradations: Gradations, commons: Commons,
  lineage: Affiliate, legacy: Retirement, emergency: Emergency, requests: Requests, discover: Discover,
};

// Titles shown in each section popup's header.
const VIEW_TITLE = {
  earning: "Earning · the faucets",
  circulation: "Circulation · the melt",
  ledger: "The Ledger",
  openbooks: "The Open Books",
  charter: "The Charter",
  move: "Give · Get · Offer",
  discover: "Discover · OFFERs",
  requests: "Requests",
  escrow: "Escrow",
  standing: "Standing & identity",
  gradations: "Honey Gradations",
  commons: "Commons",
  lineage: "Your lineage",
  legacy: "Legacy",
  emergency: "The safety net",
};

function ProtoApp() {
  const [t, setTweak] = useTweaks(PROTO_DEFAULTS);
  const [view, setView] = React.useState(() => {
    const h = (location.hash || "").slice(1);
    return VIEW_MAP[h] ? h : "balance";
  });
  const [open, setOpen] = React.useState(false);
  const [prov, setProv] = React.useState(null);
  const bling = useBlingStore("bling_state_v1");
  const Store = window.StoreCtx;
  const scrollPosRef = React.useRef({});
  const [onboard, setOnboard] = React.useState(() => {
    try { return !localStorage.getItem("bling_onboarded_v1"); } catch (e) { return true; }
  });
  const closeOnboard = React.useCallback(() => {
    try { localStorage.setItem("bling_onboarded_v1", "1"); } catch (e) {}
    setOnboard(false);
  }, []);

  React.useEffect(() => {
    const r = document.documentElement;
    r.dataset.theme = t.theme; r.dataset.accent = t.accent;
    r.dataset.density = t.density; r.dataset.type = t.typeface;
  }, [t]);
  React.useEffect(() => { if (location.hash.slice(1) !== view) location.hash = view; }, [view]);
  React.useEffect(() => {
    const onHash = () => { const h = location.hash.slice(1); if (VIEW_MAP[h]) setView(h); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const ctx = React.useMemo(() => ({
    launch: () => setOpen(true),
    trace: (entry) => setProv(entry),
    go: (id) => { if (VIEW_MAP[id]) { setView(id); const m = document.querySelector(".proto-main"); if (m) m.scrollTop = 0; } },
    tour: () => setOnboard(true),
    ...bling.actions,
  }), [bling.actions]);

  const SectionComp = view !== "balance" ? VIEW_MAP[view] : null;

  return (
    <div className="proto">
      <FrameCtx.Provider value={ctx}>
        <Store.Provider value={bling.storeValue}>
          <div className="proto-stage">
            <Sidebar active={view} />
            <div className="proto-main-wrap">
              <main className="proto-main"><Balance /></main>
              {SectionComp && (
                <SectionSheet title={VIEW_TITLE[view] || ""} scrollKey={view}
                              posStore={scrollPosRef.current} onClose={() => ctx.go("balance")}>
                  <SectionComp />
                </SectionSheet>
              )}
            </div>
          </div>
        </Store.Provider>
      </FrameCtx.Provider>
      {open && <ConstellationOverlay onClose={() => setOpen(false)} />}
      {prov && <ProvenanceOverlay entry={prov} onClose={() => setProv(null)} />}
      <ModalHost modal={bling.modal} onClose={bling.closeModal} store={bling.storeValue} />
      {onboard && <OnboardWizard onClose={closeOnboard} onWelcome={bling.storeValue.commitWelcome} />}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme" />
        <TweakRadio label="Mode" value={t.theme} options={["aurora", "light", "dark"]}
                    onChange={(v) => setTweak("theme", v)} />
        <TweakRadio label="Accent" value={t.accent} options={["honey", "copper", "verdant"]}
                    onChange={(v) => setTweak("accent", v)} />
        <TweakSection label="Layout" />
        <TweakRadio label="Density" value={t.density} options={["compact", "regular", "airy"]}
                    onChange={(v) => setTweak("density", v)} />
        <TweakSection label="Typeface" />
        <TweakSelect label="Pairing" value={t.typeface}
                     options={[
                       { value: "grotesque", label: "Grotesque — Hanken sans" },
                       { value: "charter", label: "Charter — Spectral serif" },
                       { value: "document", label: "Document — Newsreader" },
                     ]}
                     onChange={(v) => setTweak("typeface", v)} />
        <TweakSection label="Demo" />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <TweakButton label="Reset balance & ledger" secondary
            onClick={() => { try { localStorage.removeItem("bling_state_v1"); } catch (e) {} location.reload(); }} />
          <TweakButton label="Replay welcome" secondary
            onClick={() => { try { localStorage.removeItem("bling_onboarded_v1"); } catch (e) {} setOnboard(true); }} />
        </div>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<ProtoApp />);

/* Gold sparkle-burst on primary actions — a small moment of delight (aurora only). */
(function () {
  if (window.__blingSpark) return;
  window.__blingSpark = true;
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function burst(x, y) {
    const layer = document.createElement("div");
    layer.className = "spark-burst";
    layer.style.left = x + "px";
    layer.style.top = y + "px";
    const N = 12;
    for (let i = 0; i < N; i++) {
      const s = document.createElement("i");
      const a = (Math.PI * 2 * i) / N + Math.random() * 0.5;
      const dist = 26 + Math.random() * 48;
      s.style.setProperty("--dx", Math.cos(a) * dist + "px");
      s.style.setProperty("--dy", Math.sin(a) * dist + "px");
      s.style.setProperty("--sz", (6 + Math.random() * 8).toFixed(1) + "px");
      s.style.setProperty("--rot", Math.round(Math.random() * 200 - 40) + "deg");
      s.style.animationDelay = Math.round(Math.random() * 70) + "ms";
      layer.appendChild(s);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 1100);
  }
  window.blingBurst = (x, y) => { if (!reduce) burst(x, y); };
  document.addEventListener("click", (e) => {
    if (document.documentElement.dataset.theme !== "aurora" || reduce) return;
    if (e.target.closest(".btn-give, .grad-btn.solid, .ph-act, .sovereign-note .btn-ghost")) {
      burst(e.clientX, e.clientY);
    }
  });
})();
