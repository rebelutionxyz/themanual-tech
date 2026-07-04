/* ============================================================
   DingleBERRY — Surface 03 · Source Verification (drill-in)
   Every intel source ranked by chain-of-verification.
   No verification, no credibility.
   Uses the JUSTICE components TruthStatus + EvidenceMeter — the
   chain-of-verification is literally the Discovery Ladder.
   IIFE-wrapped to keep its top-level consts out of global scope.
   ============================================================ */
(function () {
const DS = window.TheLastWordDesignSystem_a9501e || window.TLW;
const { Card, Button, TruthStatus, EvidenceMeter } = DS;
const Icon = window.TLWIcon;
const { useState } = React;

const TONE = {
  secure:   { c: 'var(--status-sourced)',  t: 'var(--status-sourced-tint)' },
  watch:    { c: 'var(--honey-600)',        t: 'var(--honey-100)' },
  critical: { c: 'var(--alert-600)',        t: 'var(--alert-100)' },
  info:     { c: 'var(--status-accepted)',  t: 'var(--status-accepted-tint)' },
  idle:     { c: 'var(--slate-400)',        t: 'var(--paper-100)' },
};
const MONO = (x = {}) => ({ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', ...x });
const EYEBROW = { fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)' };
const toneOf = (s) => ({ sourced: 'secure', accepted: 'info', emerging: 'watch', fringe: 'critical', unsourced: 'idle' }[s] || 'idle');
const STATUS_WORD = { sourced: 'Verified', accepted: 'Corroborated', emerging: 'Partial', fringe: 'Broken chain', unsourced: 'Unverified' };

/* ---- intel sources DingleBERRY ranks ---- */
const SOURCES = [
  { id: 'SRC-0412', handle: 'treasury-filings', kind: 'Primary document feed', status: 'sourced', cred: 98, depth: 5, last: '2m', str: { e: 5, f: 4, t: 3 } },
  { id: 'SRC-0901', handle: 'court-records', kind: 'Public record', status: 'sourced', cred: 96, depth: 5, last: '1h', str: { e: 5, f: 3, t: 3 } },
  { id: 'SRC-1180', handle: 'wire-desk', kind: 'News wire', status: 'accepted', cred: 88, depth: 4, last: '8m', str: { e: 3, f: 3, t: 2 } },
  { id: 'SRC-0733', handle: 'field-witness-07', kind: 'First-person account', status: 'accepted', cred: 81, depth: 3, last: '15m', str: { e: 2, f: 1, t: 4 } },
  { id: 'SRC-1902', handle: 'analyst-collective', kind: 'Pattern analysis', status: 'emerging', cred: 64, depth: 2, last: '22m', str: { e: 1, f: 1, t: 2 } },
  { id: 'SRC-2140', handle: 'masked-tipster', kind: 'Anonymous tip', status: 'fringe', cred: 31, depth: 1, last: 'now', flag: 'Chain broken at primary', str: { e: 1, f: 0, t: 1 } },
  { id: 'SRC-2255', handle: 'throwaway-9f', kind: 'Unverified handle', status: 'unsourced', cred: 9, depth: 0, last: '5m', str: { e: 0, f: 0, t: 0 } },
];

/* ---- chain-of-verification per source status ---- */
function chainFor(s) {
  const C = {
    sourced: [
      { st: 'sourced', label: 'Claim received', detail: 'document ingested into the record', icon: 'fileText' },
      { st: 'sourced', label: 'Issuer verified', detail: 'signed by issuing-authority key', icon: 'lock' },
      { st: 'sourced', label: 'Primary document', detail: 'hash matches canonical record', icon: 'fingerprint' },
      { st: 'sourced', label: 'Independent corroboration', detail: '3 sources cross-confirm', icon: 'users' },
      { st: 'sourced', label: 'Chain complete', detail: 'full provenance · credibility granted', icon: 'shieldCheck' },
    ],
    accepted: [
      { st: 'sourced', label: 'Claim received', detail: 'report ingested', icon: 'fileText' },
      { st: 'sourced', label: 'Outlet verified', detail: 'known wire · editorial standards on file', icon: 'lock' },
      { st: 'accepted', label: 'Corroboration', detail: '2 independent outlets agree', icon: 'users' },
      { st: 'emerging', label: 'Primary document', detail: 'not yet obtained · corroborated only', icon: 'fingerprint' },
    ],
    emerging: [
      { st: 'sourced', label: 'Claim received', detail: 'analysis ingested', icon: 'fileText' },
      { st: 'emerging', label: 'Method review', detail: 'reasoning sound · inputs partial', icon: 'activity' },
      { st: 'emerging', label: 'Corroboration', detail: '1 supporting signal · awaiting second', icon: 'users' },
    ],
    fringe: [
      { st: 'unsourced', label: 'Claim received', detail: 'self-asserted by anonymous source', icon: 'fileText' },
      { st: 'emerging', label: 'Secondary corroboration', detail: '1 outlet repeated · no independent confirm', icon: 'users' },
      { st: 'fringe', label: 'Primary document', detail: 'hash mismatch — document not authenticated', icon: 'fingerprint', broken: true },
    ],
    unsourced: [
      { st: 'unsourced', label: 'Claim received', detail: 'unverified handle · no provenance attached', icon: 'fileText' },
      { st: 'unsourced', label: 'No chain', detail: 'nothing to verify against', icon: 'ban', broken: true },
    ],
  };
  return C[s.status] || C.unsourced;
}

/* ---- score badge ---- */
function CredBadge({ cred, status, size = 56 }) {
  const k = TONE[toneOf(status)];
  return (
    <div style={{ width: size, height: size, flex: 'none', borderRadius: '50%', border: `2.5px solid ${k.c}`, background: k.t, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
      <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: size * 0.38, color: k.c }}>{cred}</span>
      <span style={MONO({ fontSize: 7.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-faint)', marginTop: 1 })}>cred</span>
    </div>
  );
}

/* ---- a source row in the ranked list ---- */
function SourceRow({ s, active, onClick }) {
  const k = TONE[toneOf(s.status)];
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'left', cursor: 'pointer',
      padding: '12px 14px', border: active ? '1.5px solid var(--navy-600)' : '1px solid var(--line)',
      borderLeft: `var(--bw-frame) solid ${k.c}`, borderRadius: 'var(--radius-sm)',
      background: active ? 'var(--navy-100)' : s.flag ? k.t : 'var(--white)', font: 'inherit',
    }}>
      <CredBadge cred={s.cred} status={s.status} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={MONO({ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)' })}>@{s.handle}</span>
          {s.flag && <Icon name="alertTriangle" size={13} style={{ color: 'var(--alert-600)' }} />}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.kind} · <span style={MONO()}>{s.id}</span></div>
      </div>
      <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
        <TruthStatus status={s.status}>{STATUS_WORD[s.status]}</TruthStatus>
        <span style={MONO({ fontSize: 10.5, color: 'var(--text-faint)' })}>chain {s.depth} · {s.last}</span>
      </div>
    </button>
  );
}

/* ---- the verification chain (provenance hops) ---- */
function Chain({ hops }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {hops.map((h, i) => {
        const tone = toneOf(h.st);
        const k = TONE[tone];
        const last = i === hops.length - 1;
        return (
          <div key={i} style={{ display: 'flex', gap: 13, position: 'relative', paddingBottom: last ? 0 : 16 }}>
            {!last && <span style={{ position: 'absolute', left: 15, top: 32, bottom: 0, width: 2, background: h.broken ? 'var(--alert-600)' : 'var(--line-strong)', backgroundImage: h.broken ? 'none' : 'none' }} />}
            <div style={{ width: 32, height: 32, flex: 'none', borderRadius: '50%', border: `2.5px solid ${k.c}`, background: h.broken ? k.t : 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.c, zIndex: 1 }}>
              <Icon name={h.broken ? 'x' : h.icon} size={15} />
            </div>
            <div style={{ flex: 1, paddingTop: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-strong)' }}>{h.label}</span>
                <TruthStatus status={h.st}>{STATUS_WORD[h.st]}</TruthStatus>
                {h.broken && <span style={MONO({ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--alert-700)' })}>✗ link broken</span>}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{h.detail}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================ */
function SourceVerification({ posture, go }) {
  const [selId, setSel] = useState('SRC-2140');
  const sel = SOURCES.find((s) => s.id === selId) || SOURCES[0];
  const hops = chainFor(sel);
  const flagged = SOURCES.filter((s) => s.status === 'fringe' || s.status === 'unsourced').length;
  const intact = SOURCES.length - flagged;
  const k = TONE[toneOf(sel.status)];
  const broken = sel.status === 'fringe' || sel.status === 'unsourced';

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: '22px 26px 40px' }}>
      {/* header */}
      <Card padding="lg" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ width: 46, height: 46, flex: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--navy-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--navy-700)' }}>
            <Icon name="fingerprint" size={24} />
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={EYEBROW}>Surface 03 · chain-of-verification</div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--size-title-l)', fontWeight: 700, color: 'var(--text-strong)', lineHeight: 1.05, margin: '3px 0 4px' }}>Source verification</h1>
            <div style={{ fontSize: 14.5, color: 'var(--text-body)', maxWidth: 540 }}>Every intel source ranked by its chain of verification. <b>No verification, no credibility.</b></div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[['Sources ranked', '2,140', 'idle'], ['Chains intact', String(intact * 305), 'secure'], ['Flagged', String(flagged), 'critical']].map(([cap, n, tn]) => (
              <div key={cap} style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', minWidth: 96 }}>
                <div style={MONO({ fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 4 })}>{cap}</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 24, color: TONE[tn].c, lineHeight: 1 }}>{n}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="cc-grid" style={{ alignItems: 'start' }}>
        {/* ranked list */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 12px' }}>
            <span style={EYEBROW}>Ranked sources — worst chains surface as flags</span>
            <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {SOURCES.map((s) => <SourceRow key={s.id} s={s} active={s.id === selId} onClick={() => setSel(s.id)} />)}
          </div>
        </div>

        {/* detail: the chain */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 0 }}>
          <Card padding="lg">
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 14 }}>
              <CredBadge cred={sel.cred} status={sel.status} size={56} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={MONO({ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)' })}>@{sel.handle}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 5 }}>{sel.kind}</div>
                <TruthStatus status={sel.status} variant="solid">{STATUS_WORD[sel.status]}</TruthStatus>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={EYEBROW}>Chain strength</span>
              <span style={MONO({ fontSize: 11, color: 'var(--text-muted)' })}>primary · corroboration · attestation</span>
            </div>
            <div style={{ marginBottom: 16 }}>
              <EvidenceMeter evidence={sel.str.e} filings={sel.str.f} testimony={sel.str.t} showLegend={false} />
            </div>

            <div style={EYEBROW}>Verification chain</div>
            <div style={{ height: 10 }} />
            <Chain hops={hops} />

            <div style={{ marginTop: 16, padding: '11px 13px', borderRadius: 'var(--radius-sm)', background: broken ? TONE.critical.t : TONE.secure.t, border: `1px solid ${broken ? '#E0A99F' : '#AFD2BF'}`, display: 'flex', gap: 9, alignItems: 'flex-start' }}>
            <Icon name={broken ? 'alertTriangle' : 'shieldCheck'} size={16} style={{ color: broken ? 'var(--alert-600)' : 'var(--status-sourced)', marginTop: 1 }} />
              <div style={{ fontSize: 12.5, color: 'var(--text-body)', lineHeight: 1.35 }}>
                {broken
                  ? <span><b>Credibility withheld.</b> {sel.flag || 'No chain to verify against'} — DingleBERRY will not let unverified claims earn standing.</span>
                  : <span><b>Credibility granted.</b> Full provenance recorded; this source can carry weight on the record.</span>}
              </div>
            </div>
          </Card>

          {/* actions */}
          <Card padding="lg">
            <div style={{ ...EYEBROW, marginBottom: 10 }}>Act</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button variant="primary" fullWidth iconLeft={<Icon name="activity" size={16} />}>Re-run verification</Button>
              {broken
                ? <Button variant="danger" fullWidth iconLeft={<Icon name="ban" size={16} />}>Withhold credibility</Button>
                : <Button variant="secondary" fullWidth iconLeft={<Icon name="fileText" size={16} />}>Open provenance record</Button>}
              <Button variant="ghost" fullWidth iconLeft={<Icon name="sparkle" size={16} />} onClick={() => go && go('oracle')}>Ask Atlas Oracle to trace it</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

window.DB_SourceVerification = SourceVerification;
})();
