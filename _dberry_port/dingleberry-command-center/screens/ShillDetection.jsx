/* ============================================================
   DingleBERRY — Surface 04 · Shill / Abuse Detection (drill-in)
   Cross-Astra pattern recognition: coordinated inauthentic
   behavior caught across the whole comb, not one Astra at a time.
   IIFE-wrapped to keep top-level consts out of global scope.
   ============================================================ */
(function () {
const DS = window.TheLastWordDesignSystem_a9501e || window.TLW;
const { Card, Button, Badge } = DS;
const Icon = window.TLWIcon;
const { useState } = React;

const TONE = {
  secure:   { c: 'var(--status-sourced)',  t: 'var(--status-sourced-tint)', b: '#AFD2BF' },
  watch:    { c: 'var(--honey-600)',        t: 'var(--honey-100)',           b: '#F0C684' },
  critical: { c: 'var(--alert-600)',        t: 'var(--alert-100)',           b: '#E0A99F' },
  info:     { c: 'var(--status-accepted)',  t: 'var(--status-accepted-tint)',b: '#A9C5E6' },
  idle:     { c: 'var(--slate-400)',        t: 'var(--paper-100)',           b: 'var(--line-strong)' },
};
const MONO = (x = {}) => ({ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', ...x });
const EYEBROW = { fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)' };

const RINGS = [
  { id: 'AFFIL-0050', sev: 'critical', name: 'Affiliate fraud ring', actors: 22, sim: 0.93, astra: 2, status: 'frozen',
    target: 'inflating an upline’s 5/3/2/1/1 cascade with fake signups + bot engagement', justice: false, payout: true,
    signals: [['Referral-chain shape anomaly', 0.95], ['Signup-velocity burst', 0.9], ['Engagement is synthetic (bot)', 0.88], ['Device / fingerprint overlap', 0.83], ['Shared funding path', 0.7]],
    oracle: 'A manufactured downline — 22 fake Bees funnelling affiliate weight to one upline. DingleBERRY froze the chain BEFORE affiliate_distribute could free a pool from the Well, so no fraudulent BLiNG! was minted. There’s no standing gate; this freeze is the affiliate-integrity mechanism.' },
  { id: 'SHILL-0042', sev: 'critical', name: 'Coordinated boost ring', actors: 18, sim: 0.91, astra: 3, status: 'throttled',
    target: 'amplifying a single accountability case to fake momentum', justice: true,
    signals: [['Post-timing correlation', 0.94], ['Phrasing similarity (cosine)', 0.91], ['Shared funding path', 0.88], ['Account-age clustering', 0.82], ['Device / fingerprint overlap', 0.6]],
    oracle: '18 accounts across 3 Astra are boosting one case in lockstep — same phrasing, same 4-second windows, funded from one treasury path. Throttled their reach; the case’s real signal is preserved.' },
  { id: 'SHILL-0039', sev: 'watch', name: 'Sockpuppet cluster', actors: 9, sim: 0.84, astra: 2, status: 'flagged',
    target: 'astroturfing a product narrative', justice: false,
    signals: [['Phrasing similarity (cosine)', 0.84], ['Account-age clustering', 0.79], ['Shared IP block', 0.71], ['Post-timing correlation', 0.55]],
    oracle: 'Nine puppets with near-identical bios pushing the same narrative. Medium confidence — flagged for review before any throttle.' },
  { id: 'SHILL-0035', sev: 'watch', name: 'Review brigade', actors: 24, sim: 0.78, astra: 1, status: 'flagged',
    target: 'mass-downvoting a named entity', justice: true,
    signals: [['Action-timing correlation', 0.86], ['Account-age clustering', 0.74], ['Phrasing similarity (cosine)', 0.62]],
    oracle: '24 accounts piling negative actions onto one entity in a burst. Looks coordinated; held for a human call given the entity is a named party.' },
  { id: 'SHILL-0028', sev: 'watch', name: 'Wash-trading ring', actors: 6, sim: 0.88, astra: 1, status: 'flagged',
    target: 'cycling BLiNG! between own accounts to fake volume', justice: false,
    signals: [['Transaction-graph cycles', 0.93], ['Shared funding path', 0.9], ['Account-age clustering', 0.7]],
    oracle: 'Six accounts passing the same value in a closed loop to inflate apparent volume. Cross-checked with the ledger watch — referred to Transaction security.' },
  { id: 'SHILL-0011', sev: 'info', name: 'Bot amplification', actors: 140, sim: 0.69, astra: 4, status: 'watching',
    target: 'low-effort engagement padding', justice: false,
    signals: [['Post-timing correlation', 0.72], ['Device / fingerprint overlap', 0.66], ['Phrasing similarity (cosine)', 0.61]],
    oracle: 'A large but low-confidence amplification swarm. Watching — not enough signal to act without catching real users.' },
];

const STATUS_BADGE = { frozen: { verdict: 'struck', label: 'Frozen' }, throttled: { verdict: 'struck', label: 'Throttled' }, flagged: { verdict: 'pending', label: 'Flagged' }, watching: { verdict: 'pending', label: 'Watching' } };

/* ---- cluster graph (data viz of the coordinated ring) ---- */
function Cluster({ count, tone, seedBase }) {
  const k = TONE[tone];
  const W = 300, H = 230, cx = W / 2, cy = H / 2 - 4;
  const n = Math.min(count, 11);
  let s = (seedBase * 2654435761) % 2147483647;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const sats = [];
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + (rnd() - 0.5) * 0.5;
    const rad = 64 + rnd() * 34;
    sats.push({ x: cx + Math.cos(ang) * rad, y: cy + Math.sin(ang) * rad });
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {sats.map((p, i) => (
        <line key={'l' + i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={k.c} strokeWidth={1 + rnd() * 1.4} opacity="0.35" />
      ))}
      {sats.map((p, i) => i % 3 === 0 && (
        <line key={'r' + i} x1={p.x} y1={p.y} x2={sats[(i + 1) % n].x} y2={sats[(i + 1) % n].y} stroke={k.c} strokeWidth="1" opacity="0.2" />
      ))}
      {sats.map((p, i) => (
        <circle key={'c' + i} cx={p.x} cy={p.y} r="7" fill={k.t} stroke={k.c} strokeWidth="2" />
      ))}
      <circle cx={cx} cy={cy} r="14" fill={k.c} />
      <circle cx={cx} cy={cy} r="14" fill="none" stroke={k.c} strokeWidth="3" opacity="0.3">
        <animate attributeName="r" from="14" to="24" dur="1.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.3" to="0" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <text x={cx} y={cy + 3.5} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fontWeight="700" fill="#fff">RING</text>
    </svg>
  );
}

function RingRow({ r, active, onClick }) {
  const k = TONE[r.sev];
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', cursor: 'pointer',
      padding: '12px 14px', border: active ? '1.5px solid var(--navy-600)' : '1px solid var(--line)',
      borderLeft: `var(--bw-frame) solid ${k.c}`, borderRadius: 'var(--radius-sm)',
      background: active ? 'var(--navy-100)' : r.sev === 'critical' ? k.t : 'var(--white)', font: 'inherit',
    }}>
      <div style={{ width: 36, height: 36, flex: 'none', borderRadius: 'var(--radius-sm)', background: k.t, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.c }}>
        <Icon name="users" size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-strong)' }}>{r.name}</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.actors} actors · {r.astra} Astra · {r.id}</div>
      </div>
      <div style={{ flex: 'none', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <Badge verdict={STATUS_BADGE[r.status].verdict} variant="soft">{STATUS_BADGE[r.status].label}</Badge>
        <span style={MONO({ fontSize: 11, color: k.c, fontWeight: 700 })}>sim {r.sim.toFixed(2)}</span>
      </div>
    </button>
  );
}

/* ============================================================ */
function ShillDetection({ posture, go }) {
  const [selId, setSel] = useState('AFFIL-0050');
  const r = RINGS.find((x) => x.id === selId) || RINGS[0];
  const k = TONE[r.sev];
  const crit = RINGS.filter((x) => x.sev === 'critical').length;
  const totalActors = RINGS.reduce((a, x) => a + x.actors, 0);

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: '22px 26px 40px' }}>
      {/* header */}
      <Card padding="lg" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ width: 46, height: 46, flex: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--navy-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--navy-700)' }}>
            <Icon name="users" size={23} />
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={EYEBROW}>Surface 04 · cross-Astra pattern recognition</div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--size-title-l)', fontWeight: 700, color: 'var(--text-strong)', lineHeight: 1.05, margin: '3px 0 4px' }}>Shill &amp; abuse detection</h1>
            <div style={{ fontSize: 14.5, color: 'var(--text-body)', maxWidth: 540 }}>Coordinated inauthentic behavior, caught across the whole comb — not one Astra at a time.</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[['Rings flagged', String(RINGS.length), 'watch'], ['Actors clustered', String(totalActors), 'idle'], ['Critical', String(crit), 'critical']].map(([cap, n, tn]) => (
              <div key={cap} style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', minWidth: 96 }}>
                <div style={MONO({ fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 4 })}>{cap}</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 24, color: TONE[tn].c, lineHeight: 1 }}>{n}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="cc-grid" style={{ alignItems: 'start' }}>
        {/* ring list */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 12px' }}>
            <span style={EYEBROW}>Detected rings — worst-first</span>
            <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {RINGS.map((x) => <RingRow key={x.id} r={x} active={x.id === selId} onClick={() => setSel(x.id)} />)}
          </div>
        </div>

        {/* detail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 0 }}>
          <Card padding="lg">
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10, flexWrap: 'wrap' }}>
              <span style={{ width: 11, height: 11, borderRadius: 99, background: k.c, animation: r.sev === 'critical' ? 'dbpulse 1.2s ease-in-out infinite' : 'none' }} />
              <Badge verdict={STATUS_BADGE[r.status].verdict} variant="solid">{STATUS_BADGE[r.status].label}</Badge>
              <span style={{ flex: 1 }} />
              <span style={MONO({ fontSize: 11, color: 'var(--text-faint)' })}>{r.id}</span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 20, color: 'var(--text-strong)', lineHeight: 1.1, margin: '0 0 3px' }}>{r.name}</h2>
            <div style={{ fontSize: 13, color: 'var(--text-body)', marginBottom: 8 }}>{r.target}</div>

            <div style={{ background: 'var(--paper-50)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '6px 6px 2px', marginBottom: 8 }}>
              <Cluster count={r.actors} tone={r.sev} seedBase={parseInt(r.id.slice(-4), 10) || 7} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, ...MONO({ fontSize: 11, color: 'var(--text-muted)' }) }}>
              <span><b style={{ color: 'var(--text-strong)' }}>{r.actors}</b> actors</span>
              <span>spans <b style={{ color: 'var(--text-strong)' }}>{r.astra}</b> Astra</span>
              <span>similarity <b style={{ color: k.c }}>{r.sim.toFixed(2)}</b></span>
            </div>

            {r.payout && (
              <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--alert-100)', border: '1px solid #E0A99F', marginBottom: 14 }}>
                <Icon name="ban" size={15} style={{ color: 'var(--alert-600)', flex: 'none', marginTop: 1 }} />
                <span style={{ fontSize: 12.5, color: 'var(--text-body)', lineHeight: 1.35 }}><b>Frozen upstream of</b> <span style={MONO({ color: 'var(--text-strong)', fontWeight: 700 })}>affiliate_distribute</span> — the pool never frees from the Well for this chain. No standing gate; this freeze <i>is</i> the affiliate-integrity layer.</span>
              </div>
            )}

            <div style={{ ...EYEBROW, marginBottom: 9 }}>What linked them</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {r.signals.map(([label, v]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-body)', flex: '1 1 auto', minWidth: 0 }}>{label}</span>
                  <span style={{ width: 90, height: 6, borderRadius: 99, background: 'var(--paper-100)', overflow: 'hidden', flex: 'none' }}>
                    <span style={{ display: 'block', height: '100%', width: `${Math.round(v * 100)}%`, background: v > 0.85 ? 'var(--alert-600)' : v > 0.7 ? 'var(--honey-600)' : 'var(--slate-400)' }} />
                  </span>
                  <span style={MONO({ fontSize: 11, fontWeight: 700, color: 'var(--text-strong)', width: 30, textAlign: 'right' })}>{v.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 11, padding: '12px 13px', borderRadius: 'var(--radius-sm)', background: 'var(--navy-900)', marginBottom: 13 }}>
              <div style={{ width: 30, height: 30, flex: 'none', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, var(--gold-400), var(--gold-600))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="sparkle" size={15} style={{ color: 'var(--navy-900)' }} />
              </div>
              <div>
                <div style={MONO({ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-400)', marginBottom: 3 })}>Atlas Oracle · read</div>
                <div style={{ fontSize: 12.5, color: '#D8E2EC', lineHeight: 1.4 }}>{r.oracle}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button variant="primary" fullWidth iconLeft={<Icon name={r.status === 'frozen' ? 'ban' : 'activity'} size={15} />}>{r.status === 'frozen' ? 'Keep frozen · block payout' : r.status === 'throttled' ? 'Quarantine the ring' : 'Throttle reach'}</Button>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" fullWidth>Inspect {r.status === 'frozen' ? 'chain' : 'actors'}</Button>
                <Button variant="ghost" fullWidth>{r.status === 'frozen' ? 'Release to payout' : 'Dismiss'}</Button>
              </div>
            </div>
          </Card>

          {r.justice && (
            <Card padding="lg" style={{ borderTop: '3px solid var(--gold-600)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                <Icon name="scale" size={17} style={{ color: 'var(--gold-700)' }} />
                <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 16, color: 'var(--text-strong)' }}>This targets a named party</span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-body)', lineHeight: 1.4, marginBottom: 11 }}>
                Coordinated abuse aimed at accountability isn’t just moderation — it’s evidence. DingleBERRY can hand the ring, its signals and its timeline to <b>Justice</b> as a Manual Group.
              </div>
              <Button variant="primary" fullWidth iconLeft={<Icon name="scale" size={16} />} style={{ background: 'var(--gold-600)' }} onClick={() => go && go('justice')}>Refer ring to Justice</Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

window.DB_ShillDetection = ShillDetection;
})();
