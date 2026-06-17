import { BMark } from '@/components/freedomblings/marks';
import { fmtBling, toMicros } from '@/lib/freedomblings/ledger';
import { useLineage } from '@/lib/freedomblings/lineage';
/* FreedomBLiNGS — Lineage / affiliate chain (Slice #3) · LIVE own-data, read.
   Ported from affiliate.jsx, but every figure is REAL — the signed-in Bee's own
   downline counts, upline handles, lineage size, and affiliate BLiNG! FREE'd,
   from affiliate_lineage(). The design's illustrative numbers (5,330 keepers,
   +940 FREE'd, the per-level counts) are NOT shipped: genesis Bees honestly read
   empty (0 keepers, "0.000000" FREE'd, no upline). The Fibonacci weights
   (34·21·13·8·5) are frontend-held canon — bounded at 5, lifetime, producer-
   gated. Growing the comb is productive action — never a pyramid, never pay-to-
   signup. The design's "Invite" write affordance is out of scope for this read
   slice and is omitted. CANON: no buy/sell/recruit. Honey-drop mark only. */

// Frontend-held canon (NOT in the DB): Fibonacci weights + level names, L1→L5.
const LEVELS = [
  {
    level: 1,
    name: 'Sponsor',
    weight: 34,
    rel: 'Keepers you welcomed',
    who: 'direct — your own invites',
  },
  { level: 2, name: 'Pathfinder', weight: 21, rel: 'Those they welcomed', who: 'second ring' },
  { level: 3, name: 'Navigator', weight: 13, rel: 'Third ring', who: 'the comb widening' },
  { level: 4, name: 'Pioneer', weight: 8, rel: 'Fourth ring', who: '' },
  { level: 5, name: 'Origin', weight: 5, rel: 'Fifth ring', who: 'the furthest reach' },
];
const TOP_WEIGHT = 34; // L1 — the bar's 100% anchor

export function LineagePage() {
  const lin = useLineage();

  if (lin.status === 'loading') {
    return (
      <main className="app-main">
        <div className="eyebrow">Growing the comb is productive action</div>
        <div className="feed-empty" style={{ marginTop: 16 }}>
          <span className="live-dot" /> Opening your lineage…
        </div>
      </main>
    );
  }

  if (lin.status === 'signed-out') {
    return (
      <main className="app-main">
        <div className="eyebrow">Growing the comb is productive action</div>
        <div className="state-card">
          <h2>Sign in to see your lineage</h2>
          <p>
            When you welcome people and they thrive, value is FREE'd up your lineage on a Fibonacci
            curve. Sign in to see your rings and what's been FREE'd to you.
          </p>
          <a className="signin" href="/login">
            <BMark fill /> Sign in
          </a>
        </div>
      </main>
    );
  }

  if (lin.status === 'unavailable') {
    return (
      <main className="app-main">
        <div className="eyebrow">Growing the comb is productive action</div>
        <div className="state-card">
          <h2>Lineage unavailable</h2>
          <p>
            Couldn't reach your lineage just now. This is a read-only view; try again in a moment.
          </p>
        </div>
      </main>
    );
  }

  // ----- LIVE -----
  const freed = fmtBling(toMicros(lin.freedTotal));
  const isGenesis = lin.lineageSize === 0;
  const byLevel = new Map(lin.levels.map((l) => [l.level, l]));

  return (
    <main className="app-main">
      <div className="commons-top">
        <div>
          <div className="eyebrow">Growing the comb is productive action</div>
          <h1>Your lineage</h1>
          <div className="sub">
            When you welcome people and they thrive, value is FREE'd up your lineage on a Fibonacci
            curve — most to those closest, tapering with distance. Bounded at five, public, never a
            pyramid.
          </div>
        </div>
        <div className="commons-tags">
          <span className="pill">
            <BMark /> Producer-gated · lifetime
          </span>
        </div>
      </div>

      <div className="aff-hero card">
        <div className="ah-item">
          <div className="ah-k">In your lineage</div>
          <div className="ah-v num">{lin.lineageSize.toLocaleString()}</div>
          <div className="ah-s">{lin.lineageSize === 1 ? 'keeper' : 'keepers'} across 5 rings</div>
        </div>
        <div className="ah-item">
          <div className="ah-k">FREE'd to you this season</div>
          <div className="ah-v num" style={{ color: 'var(--accent-deep)' }}>
            {freed}
          </div>
          <div className="ah-s">as your comb grows &amp; thrives</div>
        </div>
        <div className="ah-item">
          <div className="ah-k">The curve</div>
          <div className="ah-v num ah-fib">34·21·13·8·5</div>
          <div className="ah-s">Fibonacci weights, L1 → L5</div>
        </div>
      </div>

      {isGenesis && (
        <div className="feed-empty" style={{ marginTop: 14 }}>
          <span className="live-dot" /> Your lineage forms as Bees join through you — welcome
          someone, and as they do real work, value FREEs up your rings. The structure below is
          waiting to fill.
        </div>
      )}

      <div className="card ob-panel" style={{ marginTop: 14 }}>
        <h3>How value FREEs up the lineage</h3>
        <p className="ob-panel-sub">
          Each level earns a Fibonacci-weighted share when the keepers in it do productive work —
          most to the ring nearest you, gently tapering outward, so it can never grow top-heavy.
        </p>
        <div className="chain-list">
          {LEVELS.map((c) => {
            const live = byLevel.get(c.level);
            const downline = live?.downline ?? 0;
            const upline = live?.uplineHandle ?? null;
            const pct = Math.round((c.weight / TOP_WEIGHT) * 100);
            return (
              <div className="chain-row" key={c.level}>
                <div className="chain-lvl">L{c.level}</div>
                <div className="chain-main">
                  <div className="chain-rel">
                    {c.name}
                    <span className="chain-who">
                      {' '}
                      · {c.rel}
                      {c.who ? ` · ${c.who}` : ''}
                    </span>
                  </div>
                  <div className="chain-bar">
                    <i style={{ width: `${pct}%` }} />
                  </div>
                  {upline && <div className="chain-via">via @{upline}</div>}
                </div>
                <div className="chain-end">
                  <div className="chain-w num">
                    {c.weight}
                    <span className="cw-u">share</span>
                  </div>
                  <div className="chain-n num">
                    {downline.toLocaleString()} {downline === 1 ? 'keeper' : 'keepers'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="ledger-foot">
        <span className="seal" />
        Lineage value is FREE'd for real, productive work done across your comb — never for merely
        signing people up. The weights are fixed (34·21·13·8·5) and bounded at five rings.
      </div>
    </main>
  );
}
