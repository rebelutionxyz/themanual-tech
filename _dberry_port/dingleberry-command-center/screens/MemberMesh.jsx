/* ============================================================
   DingleBERRY — Member Mesh (drill-in) · zero-trust oversight
   The muscle earns no trust. DingleBERRY scores node health per
   layer, runs proof-of-storage, quarantines offenders and triggers
   self-heal. The biggest new Phase-2 job, in depth.
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
  idle:     { c: 'var(--slate-400)',        t: 'var(--paper-100)',           b: 'var(--line-strong)' },
};
const MONO = (x = {}) => ({ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', ...x });
const EYEBROW = { fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)' };

const LAYERS = [
  { key: 'storage', name: 'Member storage', icon: 'server', watch: 'proof-of-storage · heartbeat hash', heaviest: true },
  { key: 'relay', name: 'Mesh relay', icon: 'network', watch: 'drop rate · latency · routing', goDark: true },
  { key: 'cdn', name: 'Edge CDN', icon: 'globe', watch: 'served bytes vs. content hash' },
  { key: 'compute', name: 'Public-good compute', icon: 'cpu', watch: 'sandbox escape · hijack' },
];

const NODES = {
  storage: [
    { id: 'mq-7f3a', score: 11, st: 'critical', region: 'eu-west', note: 'withholding · self-heal rebuilding' },
    { id: 'st-3b1c', score: 99, st: 'secure', region: 'eu-west', note: 'all challenges passed' },
    { id: 'st-9f04', score: 97, st: 'secure', region: 'us-east', note: 'all challenges passed' },
    { id: 'st-2e8f', score: 78, st: 'watch', region: 'us-west', note: '1 slow proof response' },
    { id: 'st-7a21', score: 94, st: 'secure', region: 'ap-south', note: 'all challenges passed' },
  ],
  relay: [
    { id: 'rl-3e91', score: 88, st: 'watch', region: 'eu-west', note: 'drop rate elevated' },
    { id: 'rl-1c2d', score: 98, st: 'secure', region: 'us-east', note: 'routing nominal' },
    { id: 'rl-8b40', score: 96, st: 'secure', region: 'ap-south', note: 'routing nominal' },
    { id: 'rl-6f17', score: 95, st: 'secure', region: 'us-west', note: 'routing nominal' },
  ],
  cdn: [
    { id: 'cdn-5c1', score: 91, st: 'watch', region: 'eu-west', note: '1 tampered copy quarantined' },
    { id: 'cdn-9a4', score: 99, st: 'secure', region: 'us-east', note: 'hashes match' },
    { id: 'cdn-2b7', score: 98, st: 'secure', region: 'ap-south', note: 'hashes match' },
  ],
  compute: [
    { id: 'cmp-4a9', score: 84, st: 'watch', region: 'us-east', note: 'escape attempt blocked' },
    { id: 'cmp-7d2', score: 97, st: 'secure', region: 'eu-west', note: 'sandbox intact' },
    { id: 'cmp-1f6', score: 99, st: 'secure', region: 'us-west', note: 'sandbox intact' },
  ],
};

function checksFor(layer, n) {
  const bad = n.st !== 'secure';
  if (layer === 'storage') return [
    ['Proof-of-storage challenge', n.st === 'critical' ? 'critical' : n.st, n.st === 'critical' ? '3 / 5 failed' : n.st === 'watch' ? 'slow (1.8s)' : '5 / 5 passed'],
    ['Heartbeat hash-check', n.st === 'critical' ? 'critical' : 'secure', n.st === 'critical' ? 'mismatch' : 'matches'],
    ['Replication factor', 'secure', '3× · replicas healthy'],
    ['Reliability score (90d)', n.st === 'critical' ? 'critical' : n.st, n.st === 'critical' ? '0.41' : n.st === 'watch' ? '0.93' : '0.998'],
  ];
  if (layer === 'relay') return [
    ['Drop rate', bad ? 'watch' : 'secure', bad ? '1.9%' : '0.3%'],
    ['p95 latency', bad ? 'watch' : 'secure', bad ? '180ms' : '42ms'],
    ['Routing integrity', 'secure', 'signed · no anomalies'],
    ['Go Dark contribution', bad ? 'watch' : 'secure', bad ? 'flaky — watch' : 'ready'],
  ];
  if (layer === 'cdn') return [
    ['Content hash match', bad ? 'watch' : 'secure', bad ? '1 mismatch · quarantined' : '100%'],
    ['Serving honesty', 'secure', 'claims = delivered'],
    ['Bytes served (24h)', 'secure', '2.1 TB'],
  ];
  return [
    ['Sandbox integrity', bad ? 'watch' : 'secure', bad ? '1 escape blocked' : 'intact'],
    ['Job isolation', 'secure', 'seccomp + cgroup'],
    ['Botnet-hijack watch', bad ? 'watch' : 'secure', bad ? 'job killed · flagged' : 'clean'],
    ['Comb impact', 'secure', 'none — results charitable'],
  ];
}

function heartbeat(seed, tone, w = 300, h = 40) {
  let s = (seed * 2654435761) % 2147483647; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const n = 40; const pts = [];
  for (let i = 0; i < n; i++) {
    let y = h / 2;
    if (i % 7 === 3) y = tone === 'critical' && i > 24 ? h - 4 : 5;
    else y = h / 2 + (rnd() - 0.5) * (tone === 'critical' ? 8 : 3);
    if (tone === 'critical' && i > 27) y += (rnd() - 0.5) * 18;
    y = Math.max(3, Math.min(h - 3, y));
    pts.push(`${(i / (n - 1) * w).toFixed(1)},${y.toFixed(1)}`);
  }
  return <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: h, display: 'block' }}><polyline points={pts.join(' ')} fill="none" stroke={TONE[tone].c} strokeWidth="1.6" strokeLinejoin="round" /></svg>;
}

const STATUS_BADGE = { secure: { verdict: 'affirmed', label: 'Healthy' }, watch: { verdict: 'pending', label: 'Watch' }, critical: { verdict: 'struck', label: 'Quarantined' } };

function NodeRow({ n, active, onClick }) {
  const k = TONE[n.st];
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', cursor: 'pointer', font: 'inherit',
      padding: '11px 13px', border: active ? '1.5px solid var(--navy-600)' : '1px solid var(--line)',
      borderLeft: `var(--bw-frame) solid ${k.c}`, borderRadius: 'var(--radius-sm)', background: active ? 'var(--navy-100)' : n.st === 'critical' ? k.t : 'var(--white)',
    }}>
      <span style={{ width: 9, height: 9, flex: 'none', borderRadius: 99, background: k.c, animation: n.st === 'critical' ? 'dbpulse 1.2s ease-in-out infinite' : 'none' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={MONO({ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)' })}>{n.id}</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.region} · {n.note}</div>
      </div>
      <div style={{ flex: 'none', textAlign: 'right' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 18, color: k.c, lineHeight: 1 }}>{n.score}</div>
        <div style={MONO({ fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-faint)' })}>health</div>
      </div>
    </button>
  );
}

/* ============================================================ */
function MemberMesh({ posture, go }) {
  const [layer, setLayer] = useState('storage');
  const list = NODES[layer];
  const [selId, setSel] = useState(null);
  const sel = list.find((n) => n.id === selId) || list[0];
  const k = TONE[sel.st];
  const L = LAYERS.find((l) => l.key === layer);
  const checks = checksFor(layer, sel);
  const totalNodes = 4182;
  const quar = posture === 'critical' ? 14 : 1;

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: '22px 26px 40px' }}>
      {/* header */}
      <Card padding="lg" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ width: 46, height: 46, flex: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--navy-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--navy-700)' }}>
            <Icon name="network" size={23} />
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={EYEBROW}>Phase 2 · zero-trust muscle oversight</div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--size-title-l)', fontWeight: 700, color: 'var(--text-strong)', lineHeight: 1.05, margin: '3px 0 4px' }}>Member mesh</h1>
            <div style={{ fontSize: 14.5, color: 'var(--text-body)', maxWidth: 560 }}>The muscle earns no trust. DingleBERRY scores every borrowed node, runs proof-of-storage, and <b>quarantines + self-heals</b> the moment one misbehaves.</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[['Nodes', '4,182', 'idle'], ['Healthy', String(totalNodes - quar - 3), 'secure'], ['Quarantined', String(quar), 'critical']].map(([cap, n, tn]) => (
              <div key={cap} style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', minWidth: 92 }}>
                <div style={MONO({ fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 4 })}>{cap}</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 22, color: TONE[tn].c, lineHeight: 1 }}>{n}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* layer selector */}
      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginBottom: 16 }}>
        {LAYERS.map((l, i) => {
          const on = l.key === layer;
          const worst = NODES[l.key].some((n) => n.st === 'critical') ? 'critical' : NODES[l.key].some((n) => n.st === 'watch') ? 'watch' : 'secure';
          return (
            <button key={l.key} onClick={() => { setLayer(l.key); setSel(null); }} style={{
              display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', font: 'inherit',
              padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: on ? '1.5px solid var(--navy-700)' : '1px solid var(--line)',
              background: on ? 'var(--navy-900)' : 'var(--white)', color: on ? '#fff' : 'var(--text-body)',
            }}>
              <span style={MONO({ fontSize: 11, fontWeight: 700, color: on ? 'var(--gold-400)' : 'var(--text-faint)' })}>{i + 1}</span>
              <Icon name={l.icon} size={16} style={{ color: on ? 'var(--gold-400)' : 'var(--navy-700)' }} />
              <span style={{ fontWeight: 700, fontSize: 13.5 }}>{l.name}</span>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: TONE[worst].c, animation: worst === 'critical' ? 'dbpulse 1.2s ease-in-out infinite' : 'none' }} />
            </button>
          );
        })}
      </div>

      <div className="cc-grid" style={{ alignItems: 'start' }}>
        {/* node list */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 12px', flexWrap: 'wrap' }}>
            <span style={EYEBROW}>{L.name} · nodes</span>
            <span style={MONO({ fontSize: 11, color: 'var(--text-faint)' })}>watches: {L.watch}</span>
            {L.goDark && <span style={{ ...MONO({ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gold-700)' }), background: 'var(--gold-100)', border: '1px solid var(--gold-400)', borderRadius: 999, padding: '1px 8px' }}>→ Go Dark</span>}
            <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {list.map((n) => <NodeRow key={n.id} n={n} active={n.id === sel.id} onClick={() => setSel(n.id)} />)}
          </div>
        </div>

        {/* node detail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 0 }}>
          <Card padding="lg">
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 14 }}>
              <div style={{ width: 56, height: 56, flex: 'none', borderRadius: '50%', border: `2.5px solid ${k.c}`, background: k.t, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 21, color: k.c }}>{sel.score}</span>
                <span style={MONO({ fontSize: 7, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-faint)', marginTop: 1 })}>health</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={MONO({ fontSize: 14, fontWeight: 700, color: 'var(--text-strong)' })}>{sel.id}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 5 }}>{L.name} · {sel.region}</div>
                <Badge verdict={STATUS_BADGE[sel.st].verdict} variant="solid">{STATUS_BADGE[sel.st].label}</Badge>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={EYEBROW}>Heartbeat · 40 beats</span>
              <span style={MONO({ fontSize: 11, color: k.c, fontWeight: 700 })}>{sel.st === 'critical' ? 'irregular' : sel.st === 'watch' ? 'jittery' : 'steady'}</span>
            </div>
            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '8px 8px 4px', marginBottom: 14 }}>{heartbeat(sel.id.length * 7 + sel.score, sel.st)}</div>

            <div style={{ ...EYEBROW, marginBottom: 9 }}>Oversight checks</div>
            <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 14 }}>
              {checks.map(([nm, s2, v], idx) => (
                <div key={nm} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0', borderBottom: idx < checks.length - 1 ? '1px dashed var(--line)' : 'none' }}>
                  <span style={{ width: 8, height: 8, flex: 'none', borderRadius: 99, background: TONE[s2].c }} />
                  <span style={{ fontSize: 13, color: 'var(--text-body)', flex: 1 }}>{nm}</span>
                  <span style={MONO({ fontSize: 11.5, fontWeight: 600, color: s2 === 'secure' ? 'var(--text-muted)' : TONE[s2].c })}>{v}</span>
                </div>
              ))}
            </div>

            {sel.st === 'critical' ? (
              <>
                <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '11px 13px', borderRadius: 'var(--radius-sm)', background: 'var(--status-accepted-tint)', border: '1px solid #A9C5E6', marginBottom: 13 }}>
                  <Icon name="activity" size={15} style={{ color: 'var(--status-accepted)', flex: 'none', marginTop: 1 }} />
                  <span style={{ fontSize: 12.5, color: 'var(--text-body)', lineHeight: 1.35 }}><b>Self-heal running.</b> Quarantined and rebuilding its shards onto a fresh device from the 3× replicas. Nothing lost.</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Button variant="primary" fullWidth iconLeft={<Icon name="activity" size={15} />}>Rebuild onto fresh device</Button>
                  <div style={{ display: 'flex', gap: 8 }}><Button variant="secondary" fullWidth>Inspect shards</Button><Button variant="danger" fullWidth iconLeft={<Icon name="ban" size={14} />}>Evict node</Button></div>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sel.st === 'watch' && <Button variant="primary" fullWidth iconLeft={<Icon name="activity" size={15} />}>Drain &amp; re-verify</Button>}
                <div style={{ display: 'flex', gap: 8 }}><Button variant="secondary" fullWidth>View attestations</Button><Button variant="ghost" fullWidth onClick={() => go && go('oracle')}>Ask Atlas Oracle</Button></div>
              </div>
            )}
          </Card>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '11px 13px', borderRadius: 'var(--radius-sm)', background: 'var(--paper-100)', border: '1px solid var(--line)' }}>
            <Icon name="shield" size={15} style={{ color: 'var(--navy-700)', flex: 'none' }} />
            <span style={{ fontSize: 12, color: 'var(--text-body)', lineHeight: 1.35 }}><b>Zero-trust:</b> a node’s score never buys it trust — every piece is re-verified, every beat re-checked.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

window.DB_MemberMesh = MemberMesh;
})();
