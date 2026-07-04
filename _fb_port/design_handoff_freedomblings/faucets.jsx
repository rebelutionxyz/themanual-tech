/* faucets.jsx — Earning: Genesis / Drops / Drips. BLiNG! FREE'd as recognition, not transaction.
   Amounts + multipliers are illustrative UX — exact values lock with econ v3. */

const FAUCET_TYPES = [
  { key: "Genesis", desc: "Your founding grant — welcomed to the comb.", amt: "500", meta: "one-time · at onboarding", mult: null },
  { key: "Drops", desc: "For productive action — what you do.", amt: "1,420", meta: "this season", mult: "×1.5" },
  { key: "Drips", desc: "For popularity & curation — what others valued.", amt: "620", meta: "this season", mult: "×1.8" },
];

const RECENT_FREES = [
  { type: "Drop", why: "for curating the «Field Notes» collection", amt: "320", when: "today" },
  { type: "Drip", why: "12 keepers valued your «Dawn Walks» guide", amt: "140", when: "today" },
  { type: "Drop", why: "for tending the HoneyComb forum", amt: "60", when: "yesterday" },
  { type: "Drip", why: "your «Cedar & Smoke» set was curated widely", amt: "75", when: "yesterday" },
  { type: "Genesis", why: "welcomed to the comb", amt: "500", when: "Season 3" },
];

function Faucets() {
  return (
    <main className="app-main">
      <div className="commons-top">
        <div>
          <div className="eyebrow">How your BLiNG! is FREE'd</div>
          <h1>Earning</h1>
          <div className="sub">BLiNG! is never bought — it's FREE'd to you for what you do and make. Here's every drop, and exactly why it came.</div>
        </div>
      </div>

      <div className="recog">
        <div className="recog-body">
          <div className="eyebrow">Just FREE'd to you</div>
          <div className="recog-amt">
            <span className="heromark"><span className="d" /><span className="d inner" /></span>
            <span className="recog-plus">+</span><span className="num recog-n">320</span>
            <span className="recog-u">BLiNG!</span>
          </div>
          <div className="recog-why">for curating the «Field Notes» collection</div>
          <div className="recog-foot">
            <span className="recog-tag"><span className="bmark fill" /> A Drop · productive action</span>
            <span className="recog-note">Recognition of real work — not a transaction.</span>
          </div>
        </div>
      </div>

      <div className="faucet-cards">
        {FAUCET_TYPES.map((f) => (
          <div className="card fcard" key={f.key}>
            <div className="fc-top">
              <span className="fc-mark" />
              <span className="fc-name">{f.key}</span>
              {f.mult && <span className="mult num">{f.mult}</span>}
            </div>
            <div className="fc-amt"><span className="num">{f.amt}</span><span className="fc-u">BLiNG!</span></div>
            <div className="fc-desc">{f.desc}</div>
            <div className="fc-meta">{f.meta}</div>
          </div>
        ))}
      </div>

      <div className="recent" style={{ marginTop: "26px" }}>
        <div className="recent-head">
          <div className="eyebrow">Recent FREEs — and why</div>
          <span className="seeall">Every one carries its reason</span>
        </div>
        <div className="free-list">
          {RECENT_FREES.map((r, i) => (
            <div className="free-row" key={i}>
              <div className="fr-ico"><span className="bmark fill" /></div>
              <div className="fr-main">
                <div className="fr-why">FREE'd {r.why}</div>
                <div className="fr-tag">{r.type}</div>
              </div>
              <div className="fr-end">
                <div className="fr-amt num">{r.amt}</div>
                <div className="fr-when num">{r.when}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="ledger-foot">
        <span className="seal" />
        Every BLiNG! here was FREE'd by what you did or made — nothing was bought. Multipliers shown are illustrative until econ v3 seals them.
      </div>
    </main>
  );
}

Object.assign(window, { Faucets });
