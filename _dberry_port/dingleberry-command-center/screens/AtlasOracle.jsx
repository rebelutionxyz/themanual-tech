/* ============================================================
   DingleBERRY — Atlas Oracle (full copilot conversation)
   The security copilot: explains in plain language, ranks fixes,
   ships the one-click ones, works a cross-surface fix queue.
   IIFE-wrapped to keep top-level consts out of global scope.
   ============================================================ */
(function () {
const DS = window.TheLastWordDesignSystem_a9501e || window.TLW;
const { Card, Button } = DS;
const Icon = window.TLWIcon;

const TONE = {
  secure:   { c: 'var(--status-sourced)',  t: 'var(--status-sourced-tint)' },
  watch:    { c: 'var(--honey-600)',        t: 'var(--honey-100)' },
  critical: { c: 'var(--alert-600)',        t: 'var(--alert-100)' },
};
const MONO = (x = {}) => ({ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', ...x });
const EYEBROW = { fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)' };

function AO({ size = 40 }) {
  return (
    <div style={{ width: size, height: size, flex: 'none', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, var(--gold-400), var(--gold-600))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: size * 0.4, color: 'var(--navy-900)' }}>AO</span>
    </div>
  );
}

function OracleMsg({ children }) {
  return (
    <div style={{ display: 'flex', gap: 12, maxWidth: '92%' }}>
      <AO size={36} />
      <div style={{ border: '1px solid var(--line)', borderRadius: '4px 14px 14px 14px', background: 'var(--white)', padding: '13px 15px', boxShadow: 'var(--shadow-1)' }}>
        <div style={MONO({ fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-700)', marginBottom: 5 })}>Atlas Oracle</div>
        <div style={{ fontSize: 14, color: 'var(--text-body)', lineHeight: 1.5 }}>{children}</div>
      </div>
    </div>
  );
}
function UserMsg({ children }) {
  return (
    <div style={{ display: 'flex', gap: 12, maxWidth: '88%', alignSelf: 'flex-end', flexDirection: 'row-reverse' }}>
      <div style={{ width: 36, height: 36, flex: 'none', borderRadius: '50%', border: '2px solid var(--navy-700)', background: 'var(--navy-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, color: 'var(--navy-700)' }}>OPS</div>
      <div style={{ borderRadius: '14px 4px 14px 14px', background: 'var(--navy-700)', color: '#fff', padding: '11px 15px', fontSize: 14, lineHeight: 1.45 }}>{children}</div>
    </div>
  );
}

const QUEUE = [
  { surface: 'threat', tag: 'Threat', tone: 'critical', title: 'Crypto-miner in shared CDN dependency', sub: '1,204 members · supply chain' },
  { surface: 'shill', tag: 'Shill', tone: 'critical', title: 'Affiliate fraud ring — frozen', sub: 'before affiliate_distribute' },
  { surface: 'source', tag: 'Source', tone: 'watch', title: 'Source #2140 chain broken', sub: 're-rank required' },
  { surface: 'txn', tag: 'Ledger', tone: 'watch', title: 'Velocity spike held', sub: '40× baseline · review' },
];

function AtlasOracle({ posture, go }) {
  const summary = posture === 'critical'
    ? 'The spine is down and we are in Go Dark. I have the mesh serving from cache and relaying P2P, quarantined 14 misbehaving nodes, and I am queuing every ledger write for clean reconcile.'
    : posture === 'degraded'
    ? 'The comb is vigilant — 3 flags open, nothing on fire. I auto-resolved 37 overnight. Three need your call; here is the one I would take first.'
    : 'All six surfaces are nominal. I am watching, and I auto-cleared 37 low-risk items overnight. Nothing needs you right now.';

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: '22px 26px 40px' }}>
      {/* header */}
      <Card padding="lg" style={{ marginBottom: 18, background: 'var(--navy-900)', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <AO size={54} />
          <div style={{ flex: 1, minWidth: 240 }}>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--size-title-l)', fontWeight: 700, color: '#fff', lineHeight: 1, margin: '0 0 5px' }}>Atlas Oracle</h1>
            <div style={{ fontSize: 14, color: '#C7D4E2', maxWidth: 540 }}>Honeycomb’s security copilot — explains every finding in plain language, ships the fix it can, and automates the rest across the whole comb.</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['◇ Explain', '✓ One-click fix', '↻ Automate', '◎ Watch 24/7'].map((c) => (
              <span key={c} style={{ display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: '#E8EEF4', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 'var(--radius-pill)', padding: '5px 11px' }}>{c}</span>
            ))}
          </div>
        </div>
      </Card>

      <div className="cc-grid" style={{ alignItems: 'start' }}>
        {/* conversation */}
        <Card padding="lg" style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <OracleMsg>{summary}</OracleMsg>

            <OracleMsg>
              <b>Mesh node mq-7f3a</b> was serving corrupted storage pieces on the relay tier. I quarantined it the moment the heartbeat hash-check failed, and verified the affected piece-set is intact on two healthy replicas. To fully close it, I’d rebuild its shards onto a fresh device.
              <div style={{ border: '1px solid #AFD2BF', background: 'var(--status-sourced-tint)', borderRadius: 'var(--radius-sm)', padding: '11px 13px', marginTop: 11 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
                  <Icon name="check" size={14} style={{ color: 'var(--status-sourced)' }} />
                  <span style={{ fontWeight: 700, fontSize: 12.5, color: '#1F6F49' }}>Quarantine confirmed · ready to rebuild</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="primary" size="sm" iconLeft={<Icon name="activity" size={14} />}>Run rebuild</Button>
                  <Button variant="secondary" size="sm" onClick={() => go && go('overview')}>Show the affected set</Button>
                </div>
              </div>
            </OracleMsg>

            <UserMsg>Did any member data actually get lost?</UserMsg>

            <OracleMsg>
              No. Every piece mq-7f3a held is replicated three times; the other two copies pass their proof-of-storage challenges right now. Nothing was lost, and nothing bad was served downstream — I blocked it before it reached a reader. Want me to schedule a mesh-wide proof sweep tonight?
            </OracleMsg>

            {/* suggestions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingLeft: 48 }}>
              {['Run the proof sweep', 'Explain the affiliate freeze', 'Why did source #2140 break?', 'Draft the incident note'].map((s) => (
                <span key={s} style={{ fontSize: 12.5, color: 'var(--navy-700)', background: 'var(--navy-100)', border: '1px solid #C5D6E8', borderRadius: 'var(--radius-pill)', padding: '5px 12px', cursor: 'pointer' }}>{s}</span>
              ))}
            </div>

            {/* composer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1.5px solid var(--line-strong)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginTop: 4 }}>
              <Icon name="message" size={17} style={{ color: 'var(--text-faint)' }} />
              <span style={{ flex: 1, fontSize: 14, color: 'var(--text-faint)' }}>Ask Atlas Oracle about any surface, finding, or fix…</span>
              <Button variant="primary" size="sm" iconRight={<Icon name="arrowUp" size={14} />}>Send</Button>
            </div>
          </div>
        </Card>

        {/* right rail: fix queue + scorecard */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 0 }}>
          <Card padding="none" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 15px', borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text-strong)' }}>Fix queue</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 20, color: 'var(--text-strong)' }}>{QUEUE.length}</span>
            </div>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
              {QUEUE.map((q) => (
                <button key={q.title} onClick={() => go && go(q.surface)} style={{ display: 'flex', gap: 10, textAlign: 'left', cursor: 'pointer', font: 'inherit', padding: '10px 11px', border: '1px solid var(--line)', borderLeft: `var(--bw-frame) solid ${TONE[q.tone].c}`, borderRadius: 'var(--radius-sm)', background: 'var(--white)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={MONO({ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: TONE[q.tone].c, fontWeight: 700, background: TONE[q.tone].t, borderRadius: 'var(--radius-pill)', padding: '1px 7px' })}>{q.tag}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-strong)', lineHeight: 1.2 }}>{q.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{q.sub}</div>
                  </div>
                  <Icon name="chevronRight" size={15} style={{ color: 'var(--text-faint)', flex: 'none', alignSelf: 'center' }} />
                </button>
              ))}
            </div>
          </Card>

          <Card padding="lg" style={{ background: 'var(--navy-900)', border: 'none' }}>
            <div style={{ ...EYEBROW, color: 'var(--gold-400)', marginBottom: 12 }}>Oracle · last 30 days</div>
            {[['Fixes shipped', '1,240', '#fff'], ['Auto-resolved overnight', '37', 'var(--status-sourced)'], ['Hours saved (est.)', '410', '#fff'], ['Needs your call', '3', 'var(--honey-500)']].map(([cap, n, col], idx) => (
              <div key={cap} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 9, marginBottom: 9, borderBottom: idx < 3 ? '1px solid rgba(255,255,255,0.10)' : 'none' }}>
                <span style={{ fontSize: 12.5, color: '#9DB0C4' }}>{cap}</span>
                <span style={MONO({ fontWeight: 700, fontSize: 15, color: col })}>{n}</span>
              </div>
            ))}
            <div style={{ fontSize: 11.5, color: '#7E93A9', lineHeight: 1.4, marginTop: 2 }}>Every fix Atlas ships is logged, reversible, and attributable — the audit trail the comb runs on.</div>
          </Card>
        </div>
      </div>
    </div>
  );
}

window.DB_AtlasOracle = AtlasOracle;
})();
