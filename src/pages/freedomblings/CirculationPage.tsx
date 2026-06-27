import { BMark } from '@/components/freedomblings/marks';
import { useCirculation } from '@/lib/freedomblings/circulation';
/* FreedomBLiNGS — Circulation / the melt (Slice #5) · DISPLAY ONLY.
   Mirrors demurrage.jsx's SHELL, but its tier MODEL is dead. The melt is now a
   single FLAT rate — 3% for every Bee, 2.5% for OG Founders — so the old
   MELT_TIERS list (Long idle / Resting / Stirring / In motion) is GONE. Nothing
   about demurrage exists in the DB, so this is a canon explainer, lightly
   personalized by OG status (og-generation.ts). No melt has run, so there is NO
   returned-amount figure — we show the model, never imply a deduction.
   Tone: egalitarian + non-punitive. CANON: flat 3% / OG 2.5%, conservation
   (idle → well → FREE'd again, never a fee). Honey-drop marks; hex decor. */

// The conservation flow — idle BLiNG! returns to the well and is FREE'd again.
const FLOW = [
  { k: 'Your idle BLiNG!', d: 'the part that has sat still' },
  { k: 'The well', d: 'Royal Jelly Treasury · the Source' },
  { k: "FREE'd again", d: 'to people doing the work' },
];

export function CirculationPage() {
  const c = useCirculation();

  if (c.status === 'loading') {
    return (
      <main className="app-main">
        <div className="eyebrow">Why your BLiNG! keeps moving</div>
        <div className="feed-empty" style={{ marginTop: 16 }}>
          <span className="live-dot" /> Opening circulation…
        </div>
      </main>
    );
  }

  return (
    <main className="app-main">
      <div className="commons-top">
        <div>
          <div className="eyebrow">Why your BLiNG! keeps moving</div>
          <h1>Circulation</h1>
          <div className="sub">
            BLiNG! is meant to flow, not sit. Idle BLiNG! gently melts back to the well — so the
            comb stays alive and value keeps reaching the people doing the work. Here's exactly how,
            in the open.
          </div>
        </div>
      </div>

      {/* Hero — lead with circulation, then the rate. Non-punitive. */}
      <div className="melt-hero card">
        <div className="mh-left">
          <div className="eyebrow">Sovereign circulation</div>
          <div className="mh-lead">BLiNG! is meant to flow, not sit still.</div>
          <div className="mh-rate">
            <span className="num">{c.rate}</span>
            <span className="mh-pct">%</span>
          </div>
          <div className="mh-sub">
            {c.isOG ? (
              <>
                Your melt rate — the <b>Founder rate</b>, a loyalty edge for being early to the
                comb.
              </>
            ) : (
              <>
                Your melt rate — <b>the same flat rate for every Bee</b>. Keep BLiNG! moving and it
                barely touches you.
              </>
            )}
          </div>
        </div>
        <div className="mh-right bank-invert">
          <span className="fn-mark" />
          <p>
            A bank quietly skims a few percent off idle savings — and <b>keeps it</b>. Here the melt
            returns to the comb and is <b>FREE'd again</b> to people doing the work.
          </p>
        </div>
      </div>

      <div className="melt-grid">
        {/* The melt, stated plainly — one rate, not a tier list. */}
        <div className="card ob-panel">
          <h3>One rate, for everyone</h3>
          <p className="ob-panel-sub">No tiers, no bands — a single flat melt on idle BLiNG!.</p>
          <div className="flat-rate">
            <span className="fr-mark" />
            <span className="num fr-n">{c.flatRate}</span>
            <span className="fr-pct">%</span>
          </div>
          <p className="flat-egal">
            The same for every Bee — <b>Wildflower to Royal Jelly</b>. No aristocracy of holders, no
            paying your way out of circulation.
          </p>
          <div className="og-line">
            <BMark /> OG Founders rest at <b>{c.ogRate}%</b> — for being early to the comb, not for
            holding more.
          </div>
        </div>

        <div className="melt-aside">
          <div className="card ob-panel">
            <h3>Where the melt goes</h3>
            <p className="ob-panel-sub">
              Not to us. Never a fee. It returns to the well and is FREE'd again to people doing the
              work.
            </p>
            <div className="flow">
              {FLOW.map((f, i) => (
                <div className="flow-step" key={f.k}>
                  <div className={`flow-node${i === 1 ? ' mid' : ''}`}>
                    <span className="fn-mark" />
                    <div className="fn-k">{f.k}</div>
                    <div className="fn-d">{f.d}</div>
                  </div>
                  {i < FLOW.length - 1 && <span className="flow-arrow" aria-hidden="true" />}
                </div>
              ))}
            </div>
          </div>

          <div className="sovereign-note">
            <span className="sn-mark" />
            <p>
              <b>Idle value becomes someone's recognition.</b> The melt is identical for every Bee —
              so value circulates back to contributors instead of pooling, untouched, in a few
              hands.
            </p>
          </div>
        </div>
      </div>

      <div className="ledger-foot">
        <span className="seal" />
        The melt is not a fee and never leaves the comb. A flat 3% for every Bee (OG Founders 2.5%),
        Patchboard-tunable.
      </div>
    </main>
  );
}
