/* ============================================================
   DingleBERRY — Command Center (Core Astra) · JUSTICE design system
   The comb's immune system: posture at a glance + the six surfaces
   + member-mesh oversight + Go Dark monitor + Atlas Oracle.
   ============================================================ */
const DS = window.TheLastWordDesignSystem_a9501e || window.TLW;
const { Button, Badge, Card, Avatar, Tag, TruthStatus, EvidenceMeter } = DS;
const Icon = window.TLWIcon;
const { useState } = React;

/* ---- severity palette (DingleBERRY operational state, on DS tokens) ---- */
const TONE = {
  secure:   { c: 'var(--status-sourced)',  t: 'var(--status-sourced-tint)',  b: '#AFD2BF', label: 'SECURE' },
  watch:    { c: 'var(--honey-600)',        t: 'var(--honey-100)',            b: '#F0C684', label: 'WATCH' },
  critical: { c: 'var(--alert-600)',        t: 'var(--alert-100)',            b: '#E0A99F', label: 'CRITICAL' },
  info:     { c: 'var(--status-accepted)',  t: 'var(--status-accepted-tint)', b: '#A9C5E6', label: 'INFO' },
  idle:     { c: 'var(--slate-400)',        t: 'var(--paper-100)',            b: 'var(--line-strong)', label: 'IDLE' },
};

/* ---- a security-severity pill, mono/uppercase like the DS Badge ---- */
function StatusPill({ tone = 'secure', children, pulse }) {
  const k = TONE[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, height: 22, padding: '0 10px',
      fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 11, letterSpacing: '0.08em',
      textTransform: 'uppercase', borderRadius: 'var(--radius-pill)', whiteSpace: 'nowrap',
      lineHeight: 1, color: k.c, background: k.t, border: `1px solid ${k.b}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: k.c, flex: 'none',
        animation: pulse ? 'dbpulse 1.2s ease-in-out infinite' : 'none' }} />
      {children || k.label}
    </span>
  );
}

/* ---- deterministic sparkline ---- */
function Spark({ seed, tone = 'secure', w = 132, h = 30 }) {
  let s = (seed * 2654435761) % 2147483647;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const n = 22; let y = h / 2; const pts = [];
  for (let i = 0; i < n; i++) {
    const amp = tone === 'critical' ? 9 : tone === 'watch' ? 6 : 3.2;
    y += (rnd() - 0.5) * amp;
    if (tone === 'critical' && i > 15) y += 1.4;
    y = Math.max(3, Math.min(h - 3, y));
    pts.push(`${(i / (n - 1) * w).toFixed(1)},${y.toFixed(1)}`);
  }
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <polyline points={pts.join(' ')} fill="none" stroke={TONE[tone].c} strokeWidth="1.8"
        strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

const MONO = (extra = {}) => ({ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', ...extra });
const EYEBROW = { fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)' };

/* ============================================================
   Logo seal — navy roundel, gold watch/hex (Honeycomb + watchtower)
   ============================================================ */
function DBSeal({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="50" fill="#0C1826" stroke="#B8902F" strokeWidth="3" />
      <path d="M60 30 L84 44 L84 72 L60 86 L36 72 L36 44 Z" fill="none" stroke="#D4B65E" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="60" cy="58" r="7" fill="none" stroke="#E5A23A" strokeWidth="3" />
      <circle cx="60" cy="58" r="2.4" fill="#E5A23A" />
      <path d="M44 58 a16 16 0 0 1 32 0" fill="none" stroke="#B8902F" strokeWidth="2.4" opacity="0.6" />
    </svg>
  );
}

/* ============================================================
   DATA (posture-driven)
   ============================================================ */
const SURFACES = [
  { key: 'infra',   icon: 'server',      eyebrow: 'Surface 01', name: 'Platform & infra health',
    secure: { st: 'secure', main: '99.98%', sub: '142 services · all regions' },
    degraded: { st: 'watch', main: '99.41%', sub: '3 services degraded · EU edge' },
    critical: { st: 'critical', main: '97.2%', sub: '2 core services down · ledger relay' } },
  { key: 'txn',     icon: 'lock',        eyebrow: 'Surface 02', name: 'Transaction security',
    secure: { st: 'secure', main: '1,284,902', sub: 'secured today · 0 anomalies on BLiNG!' },
    degraded: { st: 'watch', main: '1,051,210', sub: '2 ledger anomalies under review' },
    critical: { st: 'critical', main: 'HELD', sub: 'writes queued · go-dark reconcile mode' } },
  { key: 'source',  icon: 'fingerprint', eyebrow: 'Surface 03', name: 'Source verification',
    secure: { st: 'secure', main: '2,140', sub: 'sources ranked · chain intact' },
    degraded: { st: 'watch', main: '2,140', sub: '3 sources flagged · verification gap' },
    critical: { st: 'watch', main: '2,140', sub: '6 unverified sources quarantined' } },
  { key: 'shill',   icon: 'users',       eyebrow: 'Surface 04', name: 'Shill / abuse detection',
    secure: { st: 'secure', main: '0', sub: 'active patterns · cross-Astra clean' },
    degraded: { st: 'watch', main: '2', sub: 'coordinated patterns flagged' },
    critical: { st: 'critical', main: '7', sub: 'brigading surge · 3 realms' } },
  { key: 'dispatch',icon: 'zap',         eyebrow: 'Surface 05', name: 'Dispatch (Waggle) auth',
    secure: { st: 'secure', main: '3,402', sub: 'dispatches hashed · rank-verified' },
    degraded: { st: 'secure', main: '3,402', sub: 'dispatches hashed · rank-verified' },
    critical: { st: 'watch', main: '3,388', sub: '14 dispatches failed rank check' } },
  { key: 'threat',  icon: 'shieldCheck', eyebrow: 'Surface 06', name: 'Threat interception',
    secure: { st: 'secure', main: '0', sub: 'live threats · 1 intercepted today' },
    degraded: { st: 'watch', main: '1', sub: 'malware intercepted · 1 member device' },
    critical: { st: 'critical', main: '3', sub: 'active surveillance attempt · mesh' } },
];

function getHeader(p) {
  if (p === 'secure') return {
    tone: 'secure', word: 'The comb is secure.',
    sub: 'All six surfaces nominal. Member mesh healthy. Astra is watching.',
    stats: [['Transactions secured · 24h', '1.28M', 'secure'], ['Uptime · 30d', '99.98%', 'secure'], ['Threats intercepted · 24h', '1', 'secure'], ['Mesh nodes healthy', '4,181 / 4,182', 'secure']],
  };
  if (p === 'degraded') return {
    tone: 'watch', word: 'Vigilant — 3 flags open.',
    sub: 'Core surfaces holding. Two patterns and one device need a human call.',
    stats: [['Transactions secured · 24h', '1.05M', 'watch'], ['Uptime · 30d', '99.41%', 'watch'], ['Threats intercepted · 24h', '1', 'watch'], ['Mesh nodes healthy', '4,180 / 4,182', 'watch']],
  };
  return {
    tone: 'critical', word: 'Spine unreachable — Go Dark.',
    sub: 'Mesh holding the line: serving from cache, relaying P2P, queuing ledger writes for reconcile.',
    stats: [['Ledger writes queued', '12,408', 'critical'], ['Uptime · 30d', '97.2%', 'critical'], ['Active threats', '3', 'critical'], ['Mesh nodes quarantined', '14 / 4,182', 'critical']],
  };
}

function getFlags(p) {
  const base = [
    { tone: 'critical', icon: 'cpu', title: 'Mesh node serving corrupted storage pieces', where: 'node mq-7f3a · relay tier · auto-quarantined', meta: '2m ago · MESH-Q-0007', justice: true },
    { tone: 'watch', icon: 'fingerprint', title: 'Source verification chain broken', where: 'intel source #2140 · re-rank required', meta: '9m ago · SRC-2140' },
    { tone: 'watch', icon: 'users', title: 'Coordinated shill pattern across 3 Astra', where: '18 actors · similarity 0.91', meta: '14m ago · SHILL-0042' },
  ];
  if (p === 'secure') return [base[0]];
  if (p === 'degraded') return base;
  return [
    { tone: 'critical', icon: 'wifiOff', title: 'Spine unreachable — Go Dark engaged', where: 'mesh in alive-not-transacting mode', meta: 'now · GODARK-01' },
    { tone: 'critical', icon: 'eye', title: 'Surveillance attempt on member mesh', where: 'sandboxed compute tried to escape · contained', meta: '1m ago · THREAT-0911', justice: true },
    ...base,
  ];
}

/* ============================================================
   Sidebar
   ============================================================ */
const NAV = [
  { key: 'overview', icon: 'radar', label: 'Command center', count: '' },
  { key: 'infra', icon: 'server', label: 'Infra health', count: '142' },
  { key: 'txn', icon: 'lock', label: 'Transactions', count: '1.2M' },
  { key: 'source', icon: 'fingerprint', label: 'Source verification', count: '2.1k' },
  { key: 'shill', icon: 'users', label: 'Shill / abuse', count: '2' },
  { key: 'dispatch', icon: 'zap', label: 'Dispatch auth', count: '3.4k' },
  { key: 'threat', icon: 'shieldCheck', label: 'Threat interception', count: '1' },
  { key: 'mesh', icon: 'network', label: 'Member mesh', count: '4.1k' },
  { key: 'karma', icon: 'scale', label: 'Karma Credit', count: 'AI' },
  { key: 'godark', icon: 'wifiOff', label: 'Go Dark monitor', count: '' },
];

function NavItem({ item, active, onClick }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '9px 12px', border: 0,
        cursor: 'pointer', textAlign: 'left', borderRadius: 'var(--radius-xs)', fontFamily: 'var(--font-text)',
        fontWeight: active ? 700 : 500, fontSize: 13.5, color: active ? '#fff' : '#AEC0D4',
        background: active ? 'rgba(184,144,47,0.16)' : h ? 'rgba(255,255,255,0.05)' : 'transparent',
        borderLeft: active ? '2px solid #C9A227' : '2px solid transparent',
      }}>
      <Icon name={item.icon} size={16.5} stroke={active ? 2.2 : 1.8} style={{ color: active ? 'var(--gold-400)' : '#7E93A9' }} />
      <span style={{ flex: 1 }}>{item.label}</span>
      <span style={MONO({ fontSize: 10.5, color: active ? 'var(--gold-400)' : '#5E748C' })}>{item.count}</span>
    </button>
  );
}

function Sidebar({ posture, route, go }) {
  const k = TONE[getHeader(posture).tone];
  return (
    <aside style={{
      width: 252, flex: 'none', height: '100%', boxSizing: 'border-box', background: 'var(--navy-900)',
      display: 'flex', flexDirection: 'column', padding: '22px 14px 16px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.035) 1px, transparent 0)', backgroundSize: '20px 20px', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 11, padding: '0 6px 20px' }}>
        <DBSeal />
        <div>
          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 18, letterSpacing: '0.02em', color: '#fff', lineHeight: 1 }}>DingleBERRY</div>
          <div style={MONO({ fontSize: 8.5, letterSpacing: '0.2em', color: 'var(--gold-400)', textTransform: 'uppercase', marginTop: 3 })}>the immune system</div>
        </div>
      </div>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 12px', borderRadius: 'var(--radius-xs)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', marginBottom: 16 }}>
        <Icon name="search" size={15} style={{ color: '#7E93A9' }} />
        <input placeholder="Scan a target, node, source…" style={{ border: 0, background: 'transparent', outline: 'none', flex: 1, fontFamily: 'var(--font-text)', fontSize: 12.5, color: '#E8EEF4' }} />
      </div>

      <div style={{ position: 'relative', padding: '0 8px 8px', ...MONO({ fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5E748C' }) }}>Surfaces under watch</div>
      <nav style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {NAV.map((it) => <NavItem key={it.key} item={it} active={it.key === route} onClick={() => go(it.key)} />)}
      </nav>

      <div style={{ flex: 1, minHeight: 14 }} />

      <div style={{ position: 'relative', border: `1px solid ${'rgba(255,255,255,0.12)'}`, borderRadius: 'var(--radius-sm)', padding: 13, display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: k.c, animation: posture === 'critical' ? 'dbpulse 1.2s ease-in-out infinite' : 'none' }} />
          <span style={MONO({ fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7E93A9' })}>Comb posture</span>
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 18, color: '#fff', lineHeight: 1.05 }}>{k.label}</div>
        <div style={{ fontFamily: 'var(--font-text)', fontSize: 11.5, color: '#7E93A9' }}>Funded · @combtreasury.defense</div>
      </div>
    </aside>
  );
}

/* ============================================================
   Top bar — assurance line + posture switcher
   ============================================================ */
function TopBar({ posture, setPosture, onOracle, route, onBack }) {
  const postures = [['secure', 'Secure'], ['degraded', 'Degraded'], ['critical', 'Go Dark']];
  return (
    <header style={{ minHeight: 62, flex: 'none', boxSizing: 'border-box', borderBottom: '1px solid var(--line)', background: 'var(--white)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, rowGap: 10, padding: '10px 24px' }}>
      {route !== 'overview' ? (
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 'none', border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontFamily: 'var(--font-text)', fontSize: 14, fontWeight: 600, padding: '6px 8px', marginLeft: -8 }}>
          <Icon name="chevronLeft" size={18} /> Command center
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 200px', minWidth: 0 }}>
          <Icon name="lock" size={15} style={{ color: 'var(--status-sourced)', flex: 'none' }} />
          <span style={MONO({ fontSize: 11, letterSpacing: '0.04em', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' })}>
            <b style={{ color: 'var(--text-strong)' }}>1,284,902</b> transactions secured · <b style={{ color: 'var(--text-strong)' }}>4,182</b> mesh nodes watched · <b style={{ color: 'var(--text-strong)' }}>0</b> unverified sources trusted
          </span>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 auto', minWidth: 0, marginLeft: 'auto', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <span style={{ ...MONO({ fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)' }), border: '1px dashed var(--line-strong)', borderRadius: 999, padding: '3px 9px' }}>sample data</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '4px 4px 4px 10px', background: 'var(--paper-50)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: TONE[getHeader(posture).tone].c, animation: posture === 'critical' ? 'dbpulse 1.2s ease-in-out infinite' : 'none' }} />
            <span style={MONO({ fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)' })}>Observed</span>
          </span>
          <span style={{ width: 1, height: 22, background: 'var(--line)' }} />
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }} title="Operator override — gated to top monitoring/security rank + admin. Logged as a hard action.">
            <Icon name="lock" size={11} style={{ color: 'var(--gold-700)' }} />
            <span style={MONO({ fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold-700)' })}>Override</span>
          </span>
          <div style={{ display: 'flex', border: '1px solid var(--line-strong)', borderRadius: 'var(--radius-xs)', overflow: 'hidden' }}>
            {postures.map(([k, label]) => (
              <button key={k} onClick={() => setPosture(k)} title="Hard action · logged" style={{
                fontFamily: 'var(--font-text)', fontSize: 12.5, fontWeight: posture === k ? 700 : 500,
                border: 0, borderRight: '1px solid var(--line-strong)', padding: '5px 11px', cursor: 'pointer',
                background: posture === k ? (k === 'secure' ? 'var(--status-sourced)' : k === 'degraded' ? 'var(--honey-600)' : 'var(--alert-600)') : 'var(--white)',
                color: posture === k ? '#fff' : 'var(--text-muted)',
              }}>{label}</button>
            ))}
          </div>
        </div>
        <Button variant="primary" iconLeft={<Icon name="sparkle" size={16} />} onClick={onOracle}>Atlas Oracle</Button>
        <button style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--ink-700)', padding: 6, position: 'relative' }}>
          <Icon name="bell" size={19} stroke={1.9} />
          <span style={{ position: 'absolute', top: 5, right: 6, width: 7, height: 7, borderRadius: 99, background: 'var(--alert-600)', border: '1.5px solid var(--white)' }} />
        </button>
        <Avatar name="Astra Ops" size="md" ring />
      </div>
    </header>
  );
}

/* ============================================================
   Posture banner
   ============================================================ */
function PostureBanner({ posture }) {
  const h = getHeader(posture);
  const k = TONE[h.tone];
  return (
    <Card padding="lg" style={{ borderLeft: `var(--bw-frame) solid ${k.c}`, background: posture === 'secure' ? 'var(--white)' : k.t, marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ width: 13, height: 13, borderRadius: 99, background: k.c, animation: posture === 'critical' ? 'dbpulse 1.2s ease-in-out infinite' : 'none' }} />
            <StatusPill tone={h.tone} pulse={posture === 'critical'} />
            <span style={MONO({ fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)' })}>Core Astra · dingleberry.tech</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--size-title-xl)', fontWeight: 700, color: 'var(--text-strong)', lineHeight: 1.05, letterSpacing: '-0.01em', margin: '0 0 6px' }}>{h.word}</h1>
          <div style={{ fontSize: 15, color: 'var(--text-body)', maxWidth: 560 }}>{h.sub}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(140px, 1fr))', gap: 10 }}>
          {h.stats.map(([cap, num, tone]) => (
            <div key={cap} style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '10px 13px', background: 'var(--white)' }}>
              <div style={MONO({ fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 4 })}>{cap}</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 24, color: TONE[tone].c, lineHeight: 1 }}>{num}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

/* ============================================================
   Surface tile
   ============================================================ */
function SurfaceTile({ s, posture, onOpen }) {
  const d = s[posture];
  const k = TONE[d.st];
  return (
    <Card padding="none" interactive onClick={onOpen} style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: onOpen ? 'pointer' : 'default' }}>
      <div style={{ height: 4, background: k.c }} />
      <div style={{ padding: 15, display: 'flex', flexDirection: 'column', gap: 11, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, flex: 'none', borderRadius: 'var(--radius-sm)', background: k.t, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.c }}>
            <Icon name={s.icon} size={17} stroke={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={EYEBROW}>{s.eyebrow}</div>
            <div style={{ fontFamily: 'var(--font-text)', fontWeight: 700, fontSize: 14.5, color: 'var(--text-strong)', lineHeight: 1.1, marginTop: 2 }}>{s.name}</div>
          </div>
          {onOpen && <Icon name="chevronRight" size={16} style={{ color: 'var(--text-faint)' }} />}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 26, color: 'var(--text-strong)', lineHeight: 1 }}>{d.main}</span>
          <StatusPill tone={d.st} pulse={d.st === 'critical'} />
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.3 }}>{d.sub}</div>
        <div style={{ marginTop: 'auto', paddingTop: 4 }}><Spark seed={s.key.length * 13 + 7} tone={d.st} w={260} h={26} /></div>
      </div>
    </Card>
  );
}

/* ============================================================
   Member-mesh oversight (Phase 2) — the per-layer monitoring map.
   Four muscle layers, ordered by build sequence; load scales 1→4.
   ============================================================ */
const MESH_LAYERS = [
  { n: 1, key: 'cdn', icon: 'globe', name: 'Edge CDN', watch: 'served bytes vs. content hash', load: 1, note: 'lightest · automatic via hashing',
    secure:   { st: 'secure',   sig: '0 hash mismatches', sub: '1,204 nodes · content verified' },
    degraded: { st: 'secure',   sig: '0 hash mismatches', sub: '1,204 nodes · content verified' },
    critical: { st: 'watch',    sig: '2 tampered copies',  sub: 'quarantined · re-served from origin' } },
  { n: 2, key: 'relay', icon: 'network', name: 'Mesh relay', watch: 'drop rate · latency · routing', load: 3, goDark: true, note: 'relay health is the Go Dark signal',
    secure:   { st: 'secure',   sig: 'drop 0.3% · p95 42ms',  sub: '988 relays · routing nominal' },
    degraded: { st: 'watch',    sig: 'drop 1.9% · p95 180ms', sub: 'spine flaky · Go Dark armed' },
    critical: { st: 'critical', sig: 'spine unreachable',     sub: 'Go Dark engaged · relaying P2P' } },
  { n: 3, key: 'compute', icon: 'cpu', name: 'Public-good compute', watch: 'sandbox escape · hijack', load: 1, note: 'lightest stakes · results charitable',
    secure:   { st: 'secure', sig: '0 escape attempts', sub: '312 jobs · isolated' },
    degraded: { st: 'secure', sig: '0 escape attempts', sub: '312 jobs · isolated' },
    critical: { st: 'watch',  sig: '1 escape blocked',  sub: 'job killed · node flagged' } },
  { n: 4, key: 'storage', icon: 'server', name: 'Member storage', watch: 'proof-of-storage · heartbeat hash', load: 4, heal: true, note: 'heaviest · self-heal + rebuild',
    secure:   { st: 'secure',   sig: '100% pieces verified', sub: '1,678 nodes · reliability 99.4' },
    degraded: { st: 'critical', sig: '1 node withholding',   sub: 'mq-7f3a quarantined · self-heal running' },
    critical: { st: 'critical', sig: '14 nodes gone dark',   sub: 'rebuilding onto fresh devices' } },
];

function LoadDots({ load }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {[1, 2, 3, 4].map((i) => (
        <span key={i} style={{ width: 5, height: 5, borderRadius: 99, background: i <= load ? 'var(--navy-600)' : 'var(--line-strong)' }} />
      ))}
    </span>
  );
}

function LayerRow({ L, posture }) {
  const d = L[posture];
  const k = TONE[d.st];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, rowGap: 8, flexWrap: 'wrap', padding: '12px 14px', border: '1px solid var(--line)', borderLeft: `var(--bw-frame) solid ${k.c}`, borderRadius: 'var(--radius-sm)', background: d.st === 'critical' ? k.t : 'var(--white)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, flex: 'none' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--text-faint)' }}>{L.n}</span>
        <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', background: k.t, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.c }}>
          <Icon name={L.icon} size={18} />
        </div>
      </div>
      <div style={{ flex: '1 1 180px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text-strong)' }}>{L.name}</span>
          {L.goDark && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gold-700)', background: 'var(--gold-100)', border: '1px solid var(--gold-400)', borderRadius: 'var(--radius-pill)', padding: '1px 8px' }}>→ Go Dark</span>}
          {L.heal && d.st === 'critical' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--status-accepted)', background: 'var(--status-accepted-tint)', border: '1px solid #A9C5E6', borderRadius: 'var(--radius-pill)', padding: '1px 8px' }}>self-heal</span>}
        </div>
        <div style={{ ...MONO({ fontSize: 11, color: 'var(--text-faint)' }), marginTop: 2 }}>watches: {L.watch}</div>
      </div>
      <div style={{ flex: '1 1 140px', minWidth: 0, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
        <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 16, color: k.c, lineHeight: 1.05 }}>{d.sig}</span>
        <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{d.sub}</span>
      </div>
      <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, width: 88 }}>
        <StatusPill tone={d.st} pulse={d.st === 'critical'} />
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={MONO({ fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-faint)' })}>load</span>
          <LoadDots load={L.load} />
        </span>
      </div>
    </div>
  );
}

function MeshOversight({ posture, go }) {
  const quarantined = posture === 'critical' ? 14 : posture === 'degraded' ? 1 : 0;
  return (
    <Card padding="lg" style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 6 }}>
        <Icon name="network" size={18} style={{ color: 'var(--navy-700)' }} />
        <div style={{ flex: 1 }}>
          <div style={EYEBROW}>Phase 2 · zero-trust muscle oversight</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 19, color: 'var(--text-strong)', lineHeight: 1.1 }}>Member mesh — per-layer monitoring map</div>
        </div>
        <span style={MONO({ fontSize: 12, color: 'var(--text-muted)' })}>4,182 nodes</span>
        {quarantined > 0 && <StatusPill tone="critical">{quarantined} quarantined</StatusPill>}
        {go && <button onClick={() => go('mesh')} style={{ display: 'flex', alignItems: 'center', gap: 4, font: 'inherit', cursor: 'pointer', border: '1px solid var(--line-strong)', background: 'var(--white)', borderRadius: 'var(--radius-xs)', padding: '5px 10px', fontSize: 12.5, fontWeight: 600, color: 'var(--navy-700)' }}>All nodes <span style={{ fontSize: 14 }}>→</span></button>}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>
        Each muscle layer adds one surface to watch — and load scales in build order, so the watchtower grows one manageable layer at a time.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {MESH_LAYERS.map((L) => <LayerRow key={L.key} L={L} posture={posture} />)}
      </div>
    </Card>
  );
}

/* ============================================================
   Go Dark monitor strip
   ============================================================ */
function GoDark({ posture }) {
  const dark = posture === 'critical';
  const k = dark ? TONE.critical : TONE.secure;
  return (
    <Card padding="md" style={{ background: dark ? 'var(--navy-900)' : 'var(--white)', border: dark ? 'none' : '1px solid var(--line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <div style={{ width: 38, height: 38, flex: 'none', borderRadius: 'var(--radius-sm)', background: dark ? 'rgba(255,255,255,0.06)' : k.t, display: 'flex', alignItems: 'center', justifyContent: 'center', color: dark ? 'var(--honey-500)' : k.c }}>
          <Icon name={dark ? 'wifiOff' : 'globe'} size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={MONO({ fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: dark ? 'var(--gold-400)' : 'var(--text-faint)' })}>Go Dark monitor</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 16, color: dark ? '#fff' : 'var(--text-strong)', lineHeight: 1.15 }}>
            {dark ? 'Spine unreachable — mesh in alive-not-transacting mode' : 'Spine nominal — mesh ready, reconcile queue empty'}
          </div>
        </div>
        {dark
          ? <span style={{ display: 'flex', gap: 6 }}><StatusPill tone="watch">cache serving</StatusPill><StatusPill tone="watch">P2P relay</StatusPill><StatusPill tone="critical" pulse>writes queued</StatusPill></span>
          : <StatusPill tone="secure">standby</StatusPill>}
      </div>
    </Card>
  );
}

/* ============================================================
   Right rail — live flags + Atlas Oracle
   ============================================================ */
function Flag({ f }) {
  const k = TONE[f.tone];
  return (
    <div style={{ border: '1px solid var(--line)', borderLeft: `var(--bw-frame) solid ${k.c}`, borderRadius: 'var(--radius-sm)', background: f.tone === 'critical' ? k.t : 'var(--white)', padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name={f.icon} size={15} style={{ color: k.c }} />
        <StatusPill tone={f.tone} pulse={f.tone === 'critical'} />
        <span style={{ flex: 1 }} />
        <span style={MONO({ fontSize: 10, color: 'var(--text-faint)' })}>{f.meta.split(' · ')[0]}</span>
      </div>
      <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-strong)', lineHeight: 1.2 }}>{f.title}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.where}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 2, flexWrap: 'wrap' }}>
        <button style={{ fontFamily: 'var(--font-text)', fontSize: 12, fontWeight: 600, color: 'var(--navy-700)', background: 'var(--navy-100)', border: 0, borderRadius: 'var(--radius-xs)', padding: '4px 10px', cursor: 'pointer' }}>Investigate</button>
        {f.justice && (
          <button style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-text)', fontSize: 12, fontWeight: 600, color: 'var(--gold-700)', background: 'var(--gold-100)', border: '1px solid var(--gold-400)', borderRadius: 'var(--radius-xs)', padding: '4px 10px', cursor: 'pointer' }}>
            <Icon name="scale" size={13} /> Form a group in Justice
          </button>
        )}
      </div>
    </div>
  );
}

function RightRail({ posture, onOracle }) {
  const flags = getFlags(posture);
  const crit = flags.filter((f) => f.tone === 'critical').length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 0 }}>
      <Card padding="none" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 15px', borderBottom: '1px solid var(--line)' }}>
          <span style={{ width: 9, height: 9, borderRadius: 99, background: crit ? TONE.critical.c : TONE.secure.c, animation: crit ? 'dbpulse 1.2s ease-in-out infinite' : 'none' }} />
          <span style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text-strong)' }}>Live flags</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 20, color: 'var(--text-strong)' }}>{flags.length}</span>
        </div>
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflowY: 'auto' }}>
          {flags.length ? flags.map((f, i) => <Flag key={i} f={f} />)
            : <div style={{ padding: '28px 10px', textAlign: 'center', fontFamily: 'var(--font-serif)', fontSize: 17, color: 'var(--text-faint)' }}>All clear — nothing flagged.</div>}
        </div>
      </Card>

      {/* Atlas Oracle */}
      <Card padding="lg" style={{ background: 'var(--navy-900)', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, flex: 'none', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, var(--gold-600), var(--gold-400))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="sparkle" size={20} style={{ color: 'var(--navy-900)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 18, color: '#fff', lineHeight: 1 }}>Atlas Oracle</div>
            <div style={MONO({ fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-400)', marginTop: 3 })}>Security copilot · on watch</div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: '#C7D4E2', lineHeight: 1.4, marginBottom: 13 }}>
          {posture === 'critical'
            ? 'Spine is down. I’ve put the mesh in Go Dark, quarantined 14 misbehaving nodes, and I’m queuing ledger writes for clean reconcile. One surveillance attempt contained.'
            : 'Node mq-7f3a was serving corrupted pieces — I quarantined it and verified the affected storage set. The source-chain break on #2140 needs your re-rank.'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[['Fixes shipped · 30d', '1,240'], ['Auto-resolved overnight', '37'], ['Needs your call', crit || 1]].map(([cap, n], i) => (
            <div key={cap} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 7, borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.10)' : 'none' }}>
              <span style={{ fontSize: 12.5, color: i === 2 ? 'var(--honey-300)' : '#9DB0C4' }}>{cap}</span>
              <span style={MONO({ fontWeight: 700, fontSize: 13, color: i === 2 ? 'var(--honey-500)' : '#fff' })}>{n}</span>
            </div>
          ))}
        </div>
        <button onClick={onOracle} style={{ marginTop: 14, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 42, fontFamily: 'var(--font-text)', fontWeight: 700, fontSize: 14, color: 'var(--navy-900)', background: 'linear-gradient(135deg, var(--gold-400), var(--gold-600))', border: 'none', borderRadius: 'var(--radius-xs)', cursor: 'pointer' }}>
          <Icon name="sparkle" size={16} /> Open Atlas Oracle
        </button>
      </Card>
    </div>
  );
}

/* ============================================================
   App
   ============================================================ */
function App() {
  const [posture, setPosture] = useState('degraded');
  const [route, setRoute] = useState('overview');
  const onOracle = () => go('oracle');
  const DRILLS = { source: window.DB_SourceVerification, threat: window.DB_ThreatInterception, txn: window.DB_TransactionSecurity, shill: window.DB_ShillDetection, dispatch: window.DB_DispatchAuth, infra: window.DB_InfraHealth, oracle: window.DB_AtlasOracle, justice: window.DB_JusticeHandoff, mesh: window.DB_MemberMesh, godark: window.DB_MemberMesh, karma: window.DB_KarmaCredit };
  const go = (key) => setRoute(key === 'overview' || DRILLS[key] ? key : route);
  const Drill = DRILLS[route];
  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg-canvas)' }}>
      <Sidebar posture={posture} route={route} go={go} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar posture={posture} setPosture={setPosture} onOracle={onOracle} route={route} onBack={() => setRoute('overview')} />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {route !== 'overview' && Drill
            ? <Drill posture={posture} go={go} />
            : (
            <div className="cc-grid" style={{ maxWidth: 1320, margin: '0 auto', padding: '22px 26px 40px', alignItems: 'start' }}>
              <div style={{ minWidth: 0 }}>
                <PostureBanner posture={posture} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 12px' }}>
                  <span style={EYEBROW}>The six surfaces</span>
                  <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                </div>
                <div className="surf-grid" style={{ marginBottom: 18 }}>
                  {SURFACES.map((s) => <SurfaceTile key={s.key} s={s} posture={posture} onOpen={DRILLS[s.key] ? () => go(s.key) : null} />)}
                </div>
                <MeshOversight posture={posture} go={go} />
                <GoDark posture={posture} />
              </div>
              <RightRail posture={posture} onOracle={onOracle} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const _rootEl = document.getElementById('db-root');
if (!_rootEl.hasAttribute('data-db-mounted')) {
  _rootEl.setAttribute('data-db-mounted', '1');
  ReactDOM.createRoot(_rootEl).render(<App />);
}
