import { BMark } from '@/components/freedomblings/marks';
import { useStanding } from '@/lib/freedomblings/standing';
/* FreedomBLiNGS — Standing & identity (Slice #2) · LIVE own-data, read-only.
   Ported from standing.jsx, but every figure is REAL — the signed-in Bee's own
   bling_rank / honeycomb_ring / action_count, read under owner-read RLS. The
   design's illustrative numbers (14/33 · 4/9, the 312/18/2/96 facet counts, the
   named guardians + consent rows) are NOT shipped: genesis Bees honestly read
   low (1/33 · 1/9). "How standing is earned" is a static explainer (no
   fabricated metrics). Guardians + the consent ledger are honest "soon" stubs —
   their management arrives with the Guardians slice (#8); no fake controls.
   CANON: earned, never bought. Honey-drop mark only. */

const RANK_RUNGS = Array.from({ length: 33 });
const RING_RUNGS = Array.from({ length: 9 });

// Static explainer — how Rank + Ring are earned. No fabricated counts.
const EARNED_FACETS = [
  {
    k: 'Action lifts Rank',
    d: 'Your recorded action raises your BLiNG! Rank — retroactively, and impossible to buy.',
  },
  {
    k: 'Rank multiplies earning',
    d: 'Each Rank sets what you FREE per contribution. Higher Rank, more per honest action.',
  },
  {
    k: 'The Ring is lifetime prestige',
    d: 'A slow, standing record across the whole comb. It rises with what you give — never resets, never for sale.',
  },
  {
    k: 'Earned, never bought',
    d: 'No tier can be purchased. Your standing only ever reflects what you have actually done.',
  },
];

export function StandingPage() {
  const s = useStanding();

  if (s.status === 'loading') {
    return (
      <main className="app-main">
        <div className="eyebrow">Your sovereign identity</div>
        <div className="feed-empty" style={{ marginTop: 16 }}>
          <span className="live-dot" /> Opening your standing…
        </div>
      </main>
    );
  }

  if (s.status === 'signed-out') {
    return (
      <main className="app-main">
        <div className="eyebrow">Your sovereign identity</div>
        <div className="state-card">
          <h2>Sign in to see your standing</h2>
          <p>
            Your Rank, your Ring, and your identity are yours — held by you, earned by what you do.
            Sign in to see where you stand in the comb.
          </p>
          <a className="signin" href="/login">
            <BMark fill /> Sign in
          </a>
        </div>
      </main>
    );
  }

  if (s.status === 'unavailable') {
    return (
      <main className="app-main">
        <div className="eyebrow">Your sovereign identity</div>
        <div className="state-card">
          <h2>Standing unavailable</h2>
          <p>
            Couldn't reach your standing just now. This is a read-only view; try again in a moment.
          </p>
        </div>
      </main>
    );
  }

  // ----- LIVE -----
  const initial = (s.name || s.handle || 'B').replace(/^@/, '').charAt(0).toUpperCase() || 'B';

  return (
    <main className="app-main">
      <div className="commons-top">
        <div>
          <div className="eyebrow">Your sovereign identity</div>
          <h1>Standing</h1>
          <div className="sub">
            Who you are in the HoneyComb — held by you, earned by what you do.
          </div>
        </div>
      </div>

      {/* Identity hero */}
      <div className="identity card">
        <div className="id-left">
          {s.avatarUrl ? (
            <img className="avatar lg" src={s.avatarUrl} alt={s.name} />
          ) : (
            <div className="avatar lg">{initial}</div>
          )}
          <div className="id-who">
            <div className="id-name">{s.name}</div>
            <div className="id-handle num">@{s.handle}</div>
            <div className="id-since">
              Sovereign Beeing{s.joinedAt ? ` · since ${s.joinedAt}` : ''}
            </div>
            {s.bio && <div className="id-bio">{s.bio}</div>}
          </div>
        </div>
        <div className="id-right">
          <div className="eyebrow">Standing</div>
          {s.inGoodComb ? (
            <div className="id-standing">In good comb</div>
          ) : (
            <div className="id-standing repair">Standing under repair</div>
          )}
          <span className="id-custody">
            <BMark fill /> Sovereign · self-held keys
          </span>
        </div>
      </div>

      <div className="commons-grid">
        <div className="standing-main">
          {/* Rank + Ring ladders */}
          <div className="card aside-card">
            <div className="consent-head">
              <h3>Your Rank &amp; Ring</h3>
              <span className="ob-panel-sub" style={{ margin: 0 }}>
                Computed from your recorded action — retroactive, and impossible to buy.
              </span>
            </div>

            <div className="ladder">
              <div className="ladder-head">
                <span className="ladder-k">BLiNG! Rank</span>
                <span className="ladder-v num">
                  {s.blingRank} <span className="ladder-of">/ 33</span>
                  {s.currentMultiplier && (
                    <span className="ladder-mult">×{s.currentMultiplier} earning</span>
                  )}
                </span>
              </div>
              <div className="ladder-track">
                {RANK_RUNGS.map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed 33-rung scale, index IS the identity
                  <span key={i} className={`rung${i < s.blingRank ? ' on' : ''}`} />
                ))}
              </div>
            </div>

            <div className="ladder">
              <div className="ladder-head">
                <span className="ladder-k">The Ring</span>
                <span className="ladder-v num">
                  {s.honeycombRing} <span className="ladder-of">/ 9</span>
                </span>
              </div>
              <div className="ladder-track ring">
                {RING_RUNGS.map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed 9-rung scale, index IS the identity
                  <span key={i} className={`rung${i < s.honeycombRing ? ' on' : ''}`} />
                ))}
              </div>
            </div>

            <div className="ladder-note">
              <BMark /> Built from {s.actionCount.toLocaleString()} recorded action
              {s.actionCount === 1 ? '' : 's'}. Both rise only with honest, recorded action —
              earned, never bought.
            </div>
          </div>

          {/* How standing is earned — static explainer */}
          <div className="card aside-card">
            <h3>How your standing is earned</h3>
            <p className="ob-panel-sub">
              Trust, earned by what you contribute — never bought, never sold.
            </p>
            <div className="facet-grid">
              {EARNED_FACETS.map((f) => (
                <div className="facet" key={f.k}>
                  <span className="facet-mark" />
                  <div className="facet-k">{f.k}</div>
                  <div className="facet-d">{f.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="commons-aside">
          {/* Guardians — honest stub (Guardians slice #8) */}
          <div className="card aside-card stub-card">
            <div className="stub-head">
              <h3>Your guardians</h3>
              <span className="stub-soon">
                <span className="live-dot" /> Soon
              </span>
            </div>
            <p className="ob-panel-sub" style={{ margin: '6px 0 0' }}>
              Social recovery — if you lose your keys, keepers you choose vouch you back in, never a
              company. Managing your guardians arrives with the Guardians slice.
            </p>
          </div>

          {/* Consent ledger — honest stub */}
          <div className="card aside-card stub-card">
            <div className="stub-head">
              <h3>Consent ledger</h3>
              <span className="stub-soon">
                <span className="live-dot" /> Soon
              </span>
            </div>
            <p className="ob-panel-sub" style={{ margin: '6px 0 0' }}>
              Every access you grant an Astra becomes a ledger entry you can revoke, any time. The
              consent ledger arrives next.
            </p>
          </div>

          <div className="sovereign-note">
            <span className="sn-mark" />
            <p>
              <b>You hold your standing.</b> Your identity lives in your keys, not our database.
              Carry it across the comb, and no one can lock you out — or let anyone in.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
