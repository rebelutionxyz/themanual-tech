import { BMark, HeroMark } from '@/components/freedomblings/marks';
import { useEarning } from '@/lib/freedomblings/earning';
/* FreedomBLiNGS — Earning / faucets (Slice #4) · LIVE own-data, read-only.
   Ported from faucets.jsx, but every figure is REAL — the signed-in Bee's own
   drops_ledger + drips_ledger, the BLiNG! actually FREE'd per faucet (from
   bling_transactions), and the LIVE public weight tables as the "how you earn"
   content. The design's illustrative figures (500 / 1,420 / 620, ×1.5 / ×1.8,
   the «Field Notes» reasons) and its Genesis faucet card are NOT shipped: genesis
   honestly reads empty. BLiNG! is FREE'd as recognition of real work — never
   bought, never minted. DROPS = what you do; DRIPS = what others valued.
   CANON: no buy/sell. Honey-drop marks; hex decor. */

export function EarningPage() {
  const e = useEarning();

  if (e.status === 'loading') {
    return (
      <main className="app-main">
        <div className="eyebrow">How your BLiNG! is FREE'd</div>
        <div className="feed-empty" style={{ marginTop: 16 }}>
          <span className="live-dot" /> Opening your faucets…
        </div>
      </main>
    );
  }

  if (e.status === 'signed-out') {
    return (
      <main className="app-main">
        <div className="eyebrow">How your BLiNG! is FREE'd</div>
        <div className="state-card">
          <h2>Sign in to see how you earn</h2>
          <p>
            BLiNG! is never bought — it's FREE'd to you for what you do and make. Sign in to see
            every drop, and exactly why it came.
          </p>
          <a className="signin" href="/login">
            <BMark fill /> Sign in
          </a>
        </div>
      </main>
    );
  }

  if (e.status === 'unavailable') {
    return (
      <main className="app-main">
        <div className="eyebrow">How your BLiNG! is FREE'd</div>
        <div className="state-card">
          <h2>Earning unavailable</h2>
          <p>
            Couldn't reach your faucets just now. This is a read-only view; try again in a moment.
          </p>
        </div>
      </main>
    );
  }

  // ----- LIVE -----
  const top = e.top;

  return (
    <main className="app-main">
      <div className="commons-top">
        <div>
          <div className="eyebrow">How your BLiNG! is FREE'd</div>
          <h1>Earning</h1>
          <div className="sub">
            BLiNG! is never bought — it's FREE'd to you for what you do and make. Here's every drop,
            and exactly why it came.
          </div>
        </div>
        <div className="commons-tags">
          <span className={`pill${e.sourceOpen ? '' : ' muted'}`}>
            <span className={`live-dot${e.sourceOpen ? '' : ' off'}`} />
            {e.sourceOpen ? 'The Source is open' : 'The Source is paused'}
          </span>
        </div>
      </div>

      {/* Recognition hero — the single most-recent FREE */}
      {top ? (
        <div className="recog card">
          <div className="recog-body">
            <div className="eyebrow">Just FREE'd to you</div>
            <div className="recog-amt">
              <HeroMark />
              <span className="recog-plus">+</span>
              <span className="num recog-n">{top.amt}</span>
              <span className="recog-u">BLiNG!</span>
            </div>
            <div className="recog-why">FREE'd {top.why}</div>
            <div className="recog-foot">
              <span className="recog-tag">
                <BMark fill />{' '}
                {top.kind === 'drop' ? 'A Drop · productive action' : 'A Drip · curation'}
              </span>
              <span className="recog-note">Recognition of real work — not a transaction.</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="recog card">
          <div className="recog-body">
            <div className="eyebrow">Your faucets</div>
            <div className="recog-why" style={{ marginTop: 10 }}>
              Your first FREE lands when you do or make something. Every BLiNG! here is FREE'd as
              recognition — never bought.
            </div>
          </div>
        </div>
      )}

      {/* The two faucets — DROPS + DRIPS */}
      <div className="faucet-cards">
        {[e.drops, e.drips].map((f) => (
          <div className="card fcard" key={f.key}>
            <div className="fc-top">
              <span className="fc-mark" />
              <span className="fc-name">{f.key}</span>
              {e.multiplier && <span className="mult num">×{e.multiplier}</span>}
            </div>
            <div className="fc-amt">
              <span className="num">{f.freed}</span>
              <span className="fc-u">BLiNG! FREE'd</span>
            </div>
            <div className="fc-desc">{f.desc}</div>
            <div className="fc-meta">
              {f.key === 'Drips'
                ? 'Scaled by your Rank × a legitimacy factor'
                : 'Scaled by your Rank multiplier'}
            </div>
          </div>
        ))}
      </div>

      {/* How you earn — live weight tables */}
      <div className="earn-grid">
        <div className="card ob-panel">
          <h3>How Drops are FREE'd</h3>
          <p className="ob-panel-sub">What you do — each productive action carries a weight.</p>
          <div className="weight-list">
            {e.actions.map((a) => (
              <div className="weight-row" key={a.action}>
                <span className="wr-mark" />
                <div className="wr-main">
                  <div className="wr-note">{a.note}</div>
                  <div className="wr-flags">
                    {a.rankGated && <span className="wr-flag">Rank-gated</span>}
                    {a.isFloor && <span className="wr-flag">Floored · daily cap</span>}
                  </div>
                </div>
                <div className="wr-w num">{a.weight}</div>
              </div>
            ))}
            {!e.actions.length && (
              <div className="feed-empty">
                <span className="live-dot" /> The action table is unavailable right now.
              </div>
            )}
          </div>
        </div>

        <div className="card ob-panel">
          <h3>How Drips are FREE'd</h3>
          <p className="ob-panel-sub">What others valued — signals on your creations.</p>
          <div className="weight-list">
            {e.signals.map((s) => (
              <div className="weight-row" key={s.signal}>
                <span className="wr-mark" />
                <div className="wr-main">
                  <div className="wr-note">{s.note}</div>
                  <div className="wr-flags">
                    <span className="wr-flag">{s.dedupScope}</span>
                  </div>
                </div>
                <div className="wr-w num">{s.weight}</div>
              </div>
            ))}
            {!e.signals.length && (
              <div className="feed-empty">
                <span className="live-dot" /> The signal table is unavailable right now.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent FREEs — merged, each carrying its reason */}
      <div className="recent" style={{ marginTop: 26 }}>
        <div className="recent-head">
          <div className="eyebrow">Recent FREEs — and why</div>
          <span className="seeall">Every one carries its reason</span>
        </div>
        {e.recent.length > 0 ? (
          <div className="free-list">
            {e.recent.slice(0, 12).map((r) => (
              <div className="free-row" key={r.id}>
                <div className="fr-ico">
                  <BMark fill />
                </div>
                <div className="fr-main">
                  <div className="fr-why">FREE'd {r.why}</div>
                  <div className="fr-tag">{r.kind === 'drop' ? 'Drop' : 'Drip'}</div>
                </div>
                <div className="fr-end">
                  <div className="fr-amt num">{r.amt}</div>
                  <div className="fr-when num">{r.when}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="feed-empty">
            <span className="live-dot" /> No FREEs yet — your first lands when you do or make
            something.
          </div>
        )}
      </div>

      <div className="ledger-foot">
        <span className="seal" />
        Every BLiNG! here was FREE'd by what you did or made — nothing was bought.
      </div>
    </main>
  );
}
