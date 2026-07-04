/* charter.jsx — The Charter: the readable constitution of the ledger */

const ARTICLES = [
  { n: "I", t: "The ledger is honest", p: "Every movement is appended in the open and never secretly edited. What is written stays — readable by any member, for all time." },
  { n: "II", t: "Value is FREEd, never printed", p: "BLiNG! enters existence only through productive action — what members make, tend, and do. No hand conjures it from nothing." },
  { n: "III", t: "The supply is capped", p: "The lifetime supply is fixed by this Charter and bounded beyond any authority to inflate. Scarcity is a promise, not a lever." },
  { n: "IV", t: "You hold your own standing", p: "Your balance and your standing are sovereign and self-held — recoverable through the guardians of your comb, never gated by a company." },
  { n: "V", t: "Members GIVE, GET, and OFFER", p: "Value moves between members whole and free of fee. It is never bought and never sold — only given, gotten, and offered in good faith." },
  { n: "VI", t: "Nothing moves in secret", p: "Every movement is visible to those it concerns. No steward, no treasury, and no Astra may move value out of sight." },
  { n: "VII", t: "The commons answer to their keepers", p: "Shared treasuries are owned by their members and governed in the open — accountable to the comb that fills them, and to no one else." },
  { n: "VIII", t: "The Charter changes only in the open", p: "These articles may be amended by the members, in full view, or not at all. No clause is rewritten quietly." },
];

const AMENDMENTS = [
  { v: "v3", d: "Commons affirmed as member-owned in Article VII", w: "ratified 4 weeks ago" },
  { v: "v2", d: "Self-custody of standing affirmed in Article IV", w: "ratified last season" },
];

function Charter() {
  return (
    <main className="app-main">
      <div className="charter-head">
        <div className="eyebrow">The constitution of the ledger</div>
        <h1>The Charter</h1>
        <div className="sub">The promises that bind FreedomBLiNGS — readable by every member, changeable by no one in secret.</div>
        <div className="charter-meta">
          <span className="pill"><BMark /> Sealed · append-only</span>
          <span className="pill">In force · Charter v3</span>
          <span className="verify" style={{ alignSelf: "center" }}>Read the Open Books<span className="chev" /></span>
        </div>
      </div>

      <div className="charter-body">
        <div className="preamble">
          <p>We, the members of the HoneyComb, hold this ledger in common — that value belongs to those who create it, that the record be honest, and that no one stand above the rules all can read. This Charter binds the economy of FreedomBLiNGS, and binds it equally to all.</p>
        </div>

        <div className="articles">
          {ARTICLES.map((a) => (
            <div className="article" key={a.n}>
              <div className="art-num">
                <div className="lbl">Article</div>
                <div className="rn">{a.n}</div>
              </div>
              <div className="art-body">
                <div className="art-t">{a.t}</div>
                <div className="art-p">{a.p}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="charter-seal card">
        <div className="seal-mark"><i /></div>
        <div className="seal-title">Sealed by the HoneyComb</div>
        <div className="seal-sub">Append-only and member-owned. This Charter stands above every steward and every Astra alike.</div>
        <div className="seal-stats">
          <div className="seal-stat"><div className="k">Ratified by</div><div className="v">18,412 / 18,420</div></div>
          <div className="seal-stat"><div className="k">In force since</div><div className="v">Season 1</div></div>
          <div className="seal-stat"><div className="k">Amendments</div><div className="v">2 · all public</div></div>
        </div>
        <div className="amendments">
          <div className="am-h">Amendment log</div>
          {AMENDMENTS.map((m, i) => (
            <div className="amend" key={i}>
              <span className="av num">{m.v}</span>
              <span className="ad">{m.d}</span>
              <span className="aw">{m.w}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

Object.assign(window, { Charter });
