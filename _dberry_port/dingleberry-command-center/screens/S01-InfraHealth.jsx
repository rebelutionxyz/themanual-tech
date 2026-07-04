/* ============================================================
   DingleBERRY — Surface 01 · Platform & Infra Health (drill-in)
   Up / degraded / down across the whole comb — one read.
   Posture-aware service grid + service detail.
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

const DOMAINS = ['Spine', 'Astras', 'Mesh muscle'];
// [name, group, metricLabel, value, subLabel(surface_type | substrate)]
const SERVICES = [
  ['Ledger', 'Spine', 'writes/s', '4.1k', 'Supabase · pg'], ['Identity', 'Spine', 'p95', '22ms', 'Supabase · auth'], ['Canon', 'Spine', 'reads/s', '8.0k', 'Railway'], ['Source', 'Spine', 'lag', '0.4s', 'Railway'], ['Treasury', 'Spine', 'flow', 'ok', 'Supabase · pg'],
  ['BLiNG!', 'Astras', 'secured', '1.2M', 'bling'], ['Intel', 'Astras', 'feeds', '240', 'intel'], ['Unite', 'Astras', 'groups', '1.1k', 'unite'], ['Manual', 'Astras', 'edits', '64', 'manual'], ['Justice', 'Astras', 'cases', '318', 'legal'], ['Vault', 'Astras', 'p95', '31ms', 'secure'], ['Comms', 'Astras', 'msgs', '9.2k', 'comms'], ['Vote', 'Astras', 'tallies', 'live', 'vote'],
  ['Edge CDN', 'Mesh muscle', 'hit', '98%', '1,204 nodes'], ['Mesh Relay', 'Mesh muscle', 'drop', '0.3%', '988 relays'], ['Public-good Compute', 'Mesh muscle', 'jobs', '312', 'sandboxed'], ['Member Storage', 'Mesh muscle', 'proofs', '100%', '1,678 nodes'],
];
const STATE = {
  secure:   { warn: [], crit: [] },
  degraded: { warn: [6, 14, 16], crit: [] },
  critical: { warn: [6, 16, 5], crit: [3, 14] },
};
const WORSE = { 6: '198', 14: '1.9%', 16: '97%', 5: 'HELD', 3: '38s' };
function stFor(i, p) { const m = STATE[p]; return m.crit.includes(i) ? 'critical' : m.warn.includes(i) ? 'watch' : 'secure'; }
function valFor(i, p) { const s = stFor(i, p); return s === 'secure' ? SERVICES[i][3] : (WORSE[i] || SERVICES[i][3]); }

function spark(seed, tone, w = 240, h = 28) {
  let s = (seed * 2654435761) % 2147483647; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const n = 20; let y = h / 2; const pts = [];
  for (let i = 0; i < n; i++) { const amp = tone === 'critical' ? 8 : tone === 'watch' ? 5 : 2.8; y += (rnd() - 0.5) * amp; if (tone === 'critical' && i > 13) y += 1.2; y = Math.max(3, Math.min(h - 3, y)); pts.push(`${(i / (n - 1) * w).toFixed(1)},${y.toFixed(1)}`); }
  return <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: h, display: 'block' }}><polyline points={pts.join(' ')} fill="none" stroke={TONE[tone].c} strokeWidth="1.8" strokeLinejoin="round" /></svg>;
}
function bigGraph(seed, tone) {
  let s = (seed * 2654435761) % 2147483647; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const w = 560, h = 120, n = 56; let y = 72; const pts = [];
  for (let i = 0; i < n; i++) { const amp = i > 36 && tone !== 'secure' ? (tone === 'critical' ? 15 : 8) : 4; y += (rnd() - 0.5) * amp; if (tone === 'critical' && i > 38) y -= 2; y = Math.max(8, Math.min(h - 8, y)); pts.push(`${(i / (n - 1) * w).toFixed(1)},${y.toFixed(1)}`); }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 120, display: 'block' }}>
      <polygon points={`0,${h} ${pts.join(' ')} ${w},${h}`} fill={TONE[tone].c} opacity="0.08" />
      <polyline points={pts.join(' ')} fill="none" stroke={TONE[tone].c} strokeWidth="2.2" strokeLinejoin="round" />
      {tone !== 'secure' && <line x1="0" y1="36" x2={w} y2="36" stroke="var(--alert-600)" strokeWidth="1.3" strokeDasharray="5 5" opacity="0.55" />}
    </svg>
  );
}
const STATUS_BADGE = { secure: { verdict: 'affirmed', label: 'Up' }, watch: { verdict: 'pending', label: 'Degraded' }, critical: { verdict: 'struck', label: 'Down' } };

function Tile({ i, posture, active, onClick }) {
  const st = stFor(i, posture); const k = TONE[st]; const s = SERVICES[i];
  return (
    <button onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', gap: 7, textAlign: 'left', cursor: 'pointer', font: 'inherit',
      padding: '10px 11px', border: active ? '1.5px solid var(--navy-600)' : '1px solid var(--line)',
      borderRadius: 'var(--radius-sm)', background: active ? 'var(--navy-100)' : st === 'critical' ? k.t : 'var(--white)', borderTop: `3px solid ${k.c}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 9, height: 9, flex: 'none', borderRadius: 99, background: k.c, animation: st === 'critical' ? 'dbpulse 1.2s ease-in-out infinite' : 'none' }} />
        <span style={MONO({ fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>{s[0]}</span>
      </div>
      {spark(i + 5, st, 240, 22)}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={MONO({ fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-faint)' })}>{s[2]}</span>
        <span style={MONO({ fontSize: 12.5, fontWeight: 700, color: st === 'secure' ? 'var(--text-strong)' : k.c })}>{valFor(i, posture)}</span>
      </div>
      <div style={MONO({ fontSize: 9, letterSpacing: '0.04em', color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>{s[1] === 'Astras' ? 'surface · ' + s[4] : s[4]}</div>
    </button>
  );
}

/* ============================================================ */
function InfraHealth({ posture, go }) {
  const counts = SERVICES.reduce((a, _, i) => { const s = stFor(i, posture); a[s]++; return a; }, { secure: 0, watch: 0, critical: 0 });
  const firstBad = SERVICES.findIndex((_, i) => stFor(i, posture) !== 'secure');
  const [selI, setSel] = useState(firstBad >= 0 ? firstBad : 6);
  const i = stFor(selI, posture) !== undefined ? selI : 6;
  const st = stFor(i, posture); const k = TONE[st]; const svc = SERVICES[i];

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: '22px 26px 40px' }}>
      <Card padding="lg" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ width: 46, height: 46, flex: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--navy-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--navy-700)' }}>
            <Icon name="server" size={23} />
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={EYEBROW}>Surface 01 · platform &amp; infrastructure</div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--size-title-l)', fontWeight: 700, color: 'var(--text-strong)', lineHeight: 1.05, margin: '3px 0 4px' }}>Platform &amp; infra health</h1>
            <div style={{ fontSize: 14.5, color: 'var(--text-body)', maxWidth: 540 }}>Up, degraded or down across the comb — <b>Spine</b>, the <b>Astras</b>, and the <b>mesh muscle</b>, in one read.</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[['Up', String(counts.secure), 'secure'], ['Degraded', String(counts.watch), 'watch'], ['Down', String(counts.critical), 'critical'], ['Uptime · 30d', posture === 'critical' ? '97.2%' : posture === 'degraded' ? '99.41%' : '99.98%', posture === 'secure' ? 'secure' : 'watch']].map(([cap, n, tn]) => (
              <div key={cap} style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', minWidth: 80 }}>
                <div style={MONO({ fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 4 })}>{cap}</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 24, color: TONE[tn].c, lineHeight: 1 }}>{n}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="cc-grid" style={{ alignItems: 'start' }}>
        {/* service grid grouped by domain */}
        <div style={{ minWidth: 0 }}>
          {DOMAINS.map((dom) => (
            <div key={dom} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 9px' }}>
                <span style={EYEBROW}>{dom}</span>
                <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                {SERVICES.map((s, idx) => s[1] === dom && <Tile key={s[0]} i={idx} posture={posture} active={idx === i} onClick={() => setSel(idx)} />)}
              </div>
            </div>
          ))}
        </div>

        {/* service detail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 0 }}>
          <Card padding="lg">
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ width: 11, height: 11, borderRadius: 99, background: k.c, animation: st === 'critical' ? 'dbpulse 1.2s ease-in-out infinite' : 'none' }} />
              <Badge verdict={STATUS_BADGE[st].verdict} variant="solid">{STATUS_BADGE[st].label}</Badge>
              <span style={{ flex: 1 }} />
              <span style={MONO({ fontSize: 11, color: 'var(--text-faint)' })}>{svc[1]}</span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 22, color: 'var(--text-strong)', lineHeight: 1.05, margin: '0 0 12px' }}>{svc[0]}</h2>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={EYEBROW}>{svc[2]} · last 6h</span>
              <span style={MONO({ fontSize: 12, fontWeight: 700, color: st === 'secure' ? 'var(--text-strong)' : k.c })}>{valFor(i, posture)}</span>
            </div>
            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '6px 6px 0', marginBottom: 14 }}>{bigGraph(i + 11, st)}</div>

            <div style={{ ...EYEBROW, marginBottom: 9 }}>Health checks</div>
            <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 14 }}>
              {[['/healthz liveness', 'secure', '200 · 12ms'], ['/readyz readiness', st === 'critical' ? 'critical' : 'secure', st === 'critical' ? 'timeout' : '200 · 18ms'], ['dependency probes', st === 'secure' ? 'secure' : 'watch', st === 'secure' ? 'all green' : '1 slow'], ['resource headroom', st === 'critical' ? 'critical' : st === 'watch' ? 'watch' : 'secure', st === 'critical' ? 'exhausted' : 'within bounds']].map(([nm, s2, v], idx) => (
                <div key={nm} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', borderBottom: idx < 3 ? '1px dashed var(--line)' : 'none' }}>
                  <span style={{ width: 8, height: 8, flex: 'none', borderRadius: 99, background: TONE[s2].c }} />
                  <span style={{ fontSize: 13, color: 'var(--text-body)', flex: 1 }}>{nm}</span>
                  <span style={MONO({ fontSize: 11, color: 'var(--text-muted)' })}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ ...EYEBROW, marginBottom: 9 }}>Dependencies</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {['Ledger', 'Identity', 'Mesh Relay'].map((d, idx) => (
                <span key={d} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', border: '1px solid var(--line)', borderRadius: 'var(--radius-pill)', fontSize: 12 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 99, background: idx === 0 && st !== 'secure' ? 'var(--honey-600)' : 'var(--status-sourced)' }} />
                  <span style={MONO()}>{d}</span>
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {st !== 'secure'
                ? <><Button variant="primary" fullWidth iconLeft={<Icon name="activity" size={15} />}>{st === 'critical' ? 'Failover & restart' : 'Drain & investigate'}</Button>
                   <div style={{ display: 'flex', gap: 8 }}><Button variant="secondary" fullWidth iconLeft={<Icon name="sparkle" size={14} />}>Ask Atlas Oracle</Button><Button variant="ghost" fullWidth>Runbook</Button></div></>
                : <div style={{ display: 'flex', gap: 8 }}><Button variant="secondary" fullWidth>Metrics</Button><Button variant="ghost" fullWidth>Runbook</Button></div>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

window.DB_InfraHealth = InfraHealth;
})();
