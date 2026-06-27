import { BMark } from '@/components/freedomblings/marks';
import { Link } from 'react-router-dom';
/* FreedomBLiNGS — The Charter (Slice #6) · static canon, no DB.
   The readable constitution of the ledger. Mirrors charter.jsx's shell; the eight
   articles are faithful canon and stay verbatim. This is the FOUNDING Charter —
   pre-launch, in force Jul 4, 2026, not yet ratified by a population
   and with no amendments. So the design's fabricated theatre is GONE: no "ratified
   by 18,412", no AMENDMENTS log, no "Charter v3" / "Season 1" version pills.
   Article VIII still states the amend-in-the-open mechanism (a principle, kept) —
   just no invented history. The creed "Take out the greed. Reward giving." (the
   2006 origin of the economy) heads the constitution. Article III shows the real
   Sacred Sum, with the Open Books link as the proof. CANON: honest, founding,
   append-only. Honey-drop marks. */

interface Article {
  n: string; // roman numeral
  t: string;
  p: string;
  cap?: string; // Article III — the real Sacred Sum, verifiable in the Open Books
}

const ARTICLES: Article[] = [
  {
    n: 'I',
    t: 'The ledger is honest',
    p: 'Every movement is appended in the open and never secretly edited. What is written stays — readable by any member, for all time.',
  },
  {
    n: 'II',
    t: 'Value is FREEd, never printed',
    p: 'BLiNG! enters existence only through productive action — what members make, tend, and do. No hand conjures it from nothing.',
  },
  {
    n: 'III',
    t: 'The supply is capped',
    p: 'The lifetime supply is fixed by this Charter and bounded beyond any authority to inflate. Scarcity is a promise, not a lever.',
    cap: '111,222,333,333,222,111',
  },
  {
    n: 'IV',
    t: 'You hold your own standing',
    p: 'Your balance and your standing are sovereign and self-held — recoverable through the guardians of your comb, never gated by a company.',
  },
  {
    n: 'V',
    t: 'Members GIVE, GET, and OFFER',
    p: 'Value moves between members whole and free of fee. It is never bought and never sold — only given, gotten, and offered in good faith.',
  },
  {
    n: 'VI',
    t: 'Nothing moves in secret',
    p: 'Every movement is visible to those it concerns. No steward, no treasury, and no Astra may move value out of sight.',
  },
  {
    n: 'VII',
    t: 'The commons answer to their keepers',
    p: 'Shared treasuries are owned by their members and governed in the open — accountable to the comb that fills them, and to no one else.',
  },
  {
    n: 'VIII',
    t: 'The Charter changes only in the open',
    p: 'These articles may be amended by the members, in full view, or not at all. No clause is rewritten quietly.',
  },
];

export function CharterPage() {
  return (
    <main className="app-main">
      <div className="charter-head">
        <div className="eyebrow">The constitution of the ledger</div>
        <div className="charter-creed">
          <BMark fill /> Take out the greed. Reward giving.
        </div>
        <h1>The Charter</h1>
        <div className="sub">
          The promises that bind FreedomBLiNGS — readable by every member, changeable by no one in
          secret. This is the founding Charter, in force Jul 4, 2026.
        </div>
        <div className="charter-meta">
          <span className="pill">
            <BMark /> Sealed · append-only
          </span>
          <Link className="charter-link" to="/freedomblings/openbooks">
            Read the Open Books
            <span className="chev" />
          </Link>
        </div>
      </div>

      <div className="charter-body">
        <div className="preamble">
          <p>
            We, the members of the HoneyComb, hold this ledger in common — that value belongs to
            those who create it, that the record be honest, and that no one stand above the rules
            all can read. This Charter binds the economy of FreedomBLiNGS, and binds it equally to
            all.
          </p>
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
                {a.cap && (
                  <div className="art-cap">
                    <span className="art-cap-n num">{a.cap}</span>
                    <span className="art-cap-u">BLiNG! — the Sacred Sum, the lifetime cap.</span>
                    <Link className="charter-link" to="/freedomblings/openbooks">
                      See it in the Open Books
                      <span className="chev" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="charter-seal card">
        <div className="seal-mark">
          <i />
        </div>
        <div className="seal-title">Sealed by the HoneyComb</div>
        <div className="seal-sub">
          Append-only and member-owned. This Charter stands above every steward and every Astra
          alike.
        </div>
        <div className="seal-stats">
          <div className="seal-stat">
            <div className="k">Status</div>
            <div className="v">Founding Charter</div>
          </div>
          <div className="seal-stat">
            <div className="k">In force</div>
            <div className="v">Jul 4, 2026</div>
          </div>
          <div className="seal-stat">
            <div className="k">Amendments</div>
            <div className="v">None yet</div>
          </div>
        </div>
      </div>
    </main>
  );
}
