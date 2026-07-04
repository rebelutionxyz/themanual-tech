/* app.jsx — assembles the studio board + Tweaks */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "aurora",
  "accent": "honey",
  "density": "regular",
  "typeface": "grotesque"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  React.useEffect(() => {
    const r = document.documentElement;
    r.dataset.theme = t.theme;
    r.dataset.accent = t.accent;
    r.dataset.density = t.density;
    r.dataset.type = t.typeface;
  }, [t]);

  return (
    <div className="board">
      <header className="board-head">
        <Wordmark />
        <div className="phase-tag"><span className="dot" /> Phase 1 · Visual direction · The HoneyComb</div>
      </header>

      <section className="section">
        <div className="section-cap">
          <span className="idx">01</span>
          <h2>Balance & standing</h2>
          <span className="desc">Where a member lands first — their BLiNG! balance, their standing, and the promise that the ledger is honest.</span>
        </div>
        <DesktopFrame url="freedomblings.com/balance">
          <Sidebar active="balance" />
          <Balance />
        </DesktopFrame>
      </section>

      <section className="section">
        <div className="section-cap">
          <span className="idx">02</span>
          <h2>Standing & identity</h2>
          <span className="desc">Who you are in the HoneyComb — a sovereign identity you hold yourself, vouched by guardians you trust, earned by what you contribute and never bought.</span>
        </div>
        <DesktopFrame url="freedomblings.com/standing">
          <Sidebar active="standing" />
          <Standing />
        </DesktopFrame>
      </section>

      <section className="section">
        <div className="section-cap">
          <span className="idx">03</span>
          <h2>Earning — the faucets</h2>
          <span className="desc">The empowering core: BLiNG! is FREE'd to you through Genesis, Drops, and Drips — each shown as a moment of recognition that says why it came. You earn; you never buy in.</span>
        </div>
        <DesktopFrame url="freedomblings.com/earning">
          <Sidebar active="earning" />
          <Faucets />
        </DesktopFrame>
      </section>

      <section className="section">
        <div className="section-cap">
          <span className="idx">04</span>
          <h2>Circulation — the melt</h2>
          <span className="desc">The tone test: idle BLiNG! gently melts back to the well and is FREE'd again to people doing the work. Shown as healthy circulation — never a penalty, never a fee, never to us.</span>
        </div>
        <DesktopFrame url="freedomblings.com/circulation">
          <Sidebar active="circulation" />
          <Circulation />
        </DesktopFrame>
      </section>

      <section className="section">
        <div className="section-cap">
          <span className="idx">05</span>
          <h2>The Ledger</h2>
          <span className="desc">The transparent history — every movement of value, where it was FREEd, given, and got. Append-only and member-owned. Tap any row to trace it.</span>
        </div>
        <DesktopFrame url="freedomblings.com/ledger">
          <Sidebar active="ledger" />
          <Ledger />
        </DesktopFrame>
      </section>

      <section className="section">
        <div className="section-cap">
          <span className="idx">06</span>
          <h2>Provenance — trace any BLiNG!</h2>
          <span className="desc">Tap a movement and follow a unit of value all the way back to the productive act that FREEd it. Public lineage, impossible to rewrite.</span>
        </div>
        <DesktopFrame url="freedomblings.com/ledger" defaultProv={LEDGER[0].rows[1]}>
          <Sidebar active="ledger" />
          <Ledger />
        </DesktopFrame>
      </section>

      <section className="section">
        <div className="section-cap">
          <span className="idx">07</span>
          <h2>The Open Books</h2>
          <span className="desc">The whole economy, public to every member — total value FREEd, what's in circulation, the fixed cap, and a live feed of value entering the ledger. Honesty you can audit.</span>
        </div>
        <DesktopFrame url="freedomblings.com/open-books">
          <Sidebar active="openbooks" />
          <OpenBooks />
        </DesktopFrame>
      </section>

      <section className="section">
        <div className="section-cap">
          <span className="idx">08</span>
          <h2>Commons — shared treasuries</h2>
          <span className="desc">Sovereignty that scales to a community. A commons is a member-owned shared wallet — every tithe in and every GIVE out is public, and no steward can move value in secret.</span>
        </div>
        <DesktopFrame url="freedomblings.com/commons/riverkeepers">
          <Sidebar active="commons" />
          <Commons />
        </DesktopFrame>
      </section>

      <section className="section">
        <div className="section-cap">
          <span className="idx">09</span>
          <h2>The Charter</h2>
          <span className="desc">The readable constitution — the promises that bind the whole economy. The Open Books say the cap is “fixed by the Charter”; this is where any member reads it.</span>
        </div>
        <DesktopFrame url="freedomblings.com/charter">
          <Sidebar active="charter" />
          <Charter />
        </DesktopFrame>
      </section>

      <section className="section">
        <div className="section-cap">
          <span className="idx">10</span>
          <h2>Give · Get · Offer</h2>
          <span className="desc">Moving value the sovereign way — member to member, whole and fee-free. Never buy, never sell.</span>
        </div>
        <DesktopFrame url="freedomblings.com/move">
          <Sidebar active="move" />
          <Move />
        </DesktopFrame>
      </section>

      <section className="section">
        <div className="section-cap">
          <span className="idx">11</span>
          <h2>For business — accept BLiNG!</h2>
          <span className="desc">A merchant console: accept BLiNG! for your OFFERs, and set fair per-member limits by day, week, month, and year — caps every member sees before they GIVE. (Limit values are merchant-chosen, not economic policy.)</span>
        </div>
        <DesktopFrame url="freedomblings.com/business/cedar-smoke">
          <Business />
        </DesktopFrame>
      </section>

      <section className="section">
        <div className="section-cap">
          <span className="idx">12</span>
          <h2>Honey Gradations</h2>
          <span className="desc">Membership tiers ($0 / $3 / $8 / $13) that unlock reach and tools. Paid in fiat at the one-way membrane — membership never buys BLiNG!, and money never converts back out.</span>
        </div>
        <DesktopFrame url="freedomblings.com/gradations">
          <Sidebar active="gradations" />
          <Gradations />
        </DesktopFrame>
      </section>

      <section className="section">
        <div className="section-cap">
          <span className="idx">13</span>
          <h2>Your lineage — the affiliate chain</h2>
          <span className="desc">Welcoming the comb is productive action: value FREEs up your lineage on a Fibonacci curve (34/21/13/8/5, L1–L5) — most to those closest, tapering with distance. Bounded, public, never a pyramid.</span>
        </div>
        <DesktopFrame url="freedomblings.com/lineage">
          <Sidebar active="lineage" />
          <Affiliate />
        </DesktopFrame>
      </section>

      <section className="section">
        <div className="section-cap">
          <span className="idx">14</span>
          <h2>Legacy — retirement &amp; succession</h2>
          <span className="desc">The long arc: BLiNG! rests and accrues across your active years, and a sealed “final waggle” carries it to those you name. Designed with gravity — a life's work, honored.</span>
        </div>
        <DesktopFrame url="freedomblings.com/legacy">
          <Sidebar active="legacy" />
          <Retirement />
        </DesktopFrame>
      </section>

      <section className="section">
        <div className="section-cap">
          <span className="idx">15</span>
          <h2>The comb has your back — mutual aid</h2>
          <span className="desc">An opt-in safety net: a small slice of what you FREE flows to shared mutual aid, and in catastrophe the comb carries you — decided in the open, never an insurer or a gatekeeper.</span>
        </div>
        <DesktopFrame url="freedomblings.com/safety-net">
          <Sidebar active="emergency" />
          <Emergency />
        </DesktopFrame>
      </section>

      <section className="section">
        <div className="section-cap">
          <span className="idx">16</span>
          <h2>Escrow — value held in honor</h2>
          <span className="desc">For OFFERs that need assurance: BLiNG! rests in open escrow, timelocked for fairness and released on agreement — with a transparent dispute path. Trust without a custodian.</span>
        </div>
        <DesktopFrame url="freedomblings.com/escrow/4127">
          <Sidebar active="escrow" />
          <Escrow />
        </DesktopFrame>
      </section>

      <section className="section">
        <div className="section-cap">
          <span className="idx">17</span>
          <h2>The HoneyComb constellation</h2>
          <span className="desc">FreedomBLiNGS is one Astra among siblings — step across to any of them and your BLiNG! balance follows. Tap the brand (or “Astras”) to open the launcher.</span>
        </div>
        <DesktopFrame url="freedomblings.com/balance" defaultOpen={true}>
          <Sidebar active="astras" />
          <Balance />
        </DesktopFrame>
      </section>

      <section className="section">
        <div className="section-cap">
          <span className="idx">18</span>
          <h2>Go Dark — BLiNG! without the grid</h2>
          <span className="desc">Disaster-resilience P2P: when the network is down, your keys sign a transfer offline, you hand it over by QR or tap, and it settles to the ledger the moment you reconnect. (The "MinuteMen relay" for carrying transfers between people is an illustrative concept to reconcile with the built design.)</span>
        </div>
        <div className="pocket-row">
          <div className="phones">
            <div className="phone"><PhoneGoDark /></div>
            <div className="phone"><PhonePending /></div>
          </div>
          <div className="pocket-copy">
            <h3>Disaster-proof, by design.</h3>
            <p>When the grid goes down, BLiNG! keeps moving. Your keys sign a transfer offline; a QR or NFC tap hands it over. The verified core is simple — a transfer carries an <b>offline signature</b> and settles to the ledger the instant any party reconnects, with an offline allowance and signed sequence keeping it honest. Each settled transfer then shows an "offline · signed" mark in its Provenance. <em>How transfers travel between people while dark (the "MinuteMen relay") is an illustrative idea, pending reconciliation with the built offline design.</em></p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-cap">
          <span className="idx">19</span>
          <h2>In your pocket</h2>
          <span className="desc">The same sovereign ledger, responsive — your standing and your movements, wherever you are.</span>
        </div>
        <div className="pocket-row">
          <div className="phones">
            <div className="phone"><PhoneBalance /></div>
            <div className="phone"><PhoneMove /></div>
          </div>
          <div className="pocket-copy">
            <h3>One ledger, honest everywhere.</h3>
            <p>Balance, history, and the GIVE / GET / OFFER flow fold down to a single thumb-reach surface — the same record, the same transparency, the same dignity.</p>
          </div>
        </div>
      </section>

      <footer className="board-foot">
        <span>FreedomBLiNGS — The Sovereign Ledger of the HoneyComb · Phase 1 exploration</span>
        <div className="lang">
          <span>It's <b>BLiNG!</b>, never a token</span>
          <span>Value is <b>FREE</b>d, never minted</span>
          <span>Members <b>GIVE</b> & <b>GET</b>, never buy & sell</span>
        </div>
      </footer>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme" />
        <TweakRadio label="Mode" value={t.theme} options={["aurora", "light", "dark"]}
                    onChange={(v) => setTweak("theme", v)} />
        <TweakRow label="Accent">
          <AccentChips value={t.accent} onChange={(v) => setTweak("accent", v)} />
        </TweakRow>
        <TweakSection label="Layout" />
        <TweakRadio label="Density" value={t.density}
                    options={["compact", "regular", "airy"]}
                    onChange={(v) => setTweak("density", v)} />
        <TweakSection label="Typeface" />
        <TweakSelect label="Pairing" value={t.typeface}
                     options={[
                       { value: "charter",   label: "Charter — Spectral serif" },
                       { value: "grotesque", label: "Grotesque — Hanken sans" },
                       { value: "document",  label: "Document — Newsreader" },
                     ]}
                     onChange={(v) => setTweak("typeface", v)} />
      </TweaksPanel>
    </div>
  );
}

// Custom accent swatches (named oklch presets, so a hex picker won't do)
function AccentChips({ value, onChange }) {
  const opts = [
    { v: "honey",   c: "oklch(0.745 0.128 74)",  label: "Honey" },
    { v: "copper",  c: "oklch(0.70 0.128 46)",   label: "Copper" },
    { v: "verdant", c: "oklch(0.66 0.105 152)",  label: "Verdant" },
  ];
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {opts.map((o) => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)}
          title={o.label}
          style={{
            flex: 1, height: 30, borderRadius: 7, cursor: "pointer",
            border: value === o.v ? "1.5px solid rgba(0,0,0,.7)" : ".5px solid rgba(0,0,0,.15)",
            background: o.c, position: "relative",
          }}>
          {value === o.v && <span style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center",
            justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700,
            textShadow: "0 1px 2px rgba(0,0,0,.4)",
          }}>✓</span>}
        </button>
      ))}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

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
