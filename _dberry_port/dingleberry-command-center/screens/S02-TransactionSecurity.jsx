/* ============================================================
   DingleBERRY — Surface 02 · Transaction Security (drill-in)
   Watches the BLiNG! ledger for anomalies. "Transactions secured"
   is the headline assurance. During Go Dark, writes queue for
   clean reconcile — no transaction lost.
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

/* ---- recent ledger events — sanctioned freeings, transfers, demurrage ---- */
const STREAM = [
  { hash: '0x7f3a…be21', amt: '+12,400', kind: 'affiliate_distribute', tag: 'freed', from: 'Well', to: 'a91f' },
  { hash: '0x91c0…4d17', amt: '+5,000', kind: 'Drops / Drips', tag: 'freed', from: 'Well', to: '77b2' },
  { hash: '0x2ee8…a0f3', amt: '−820', kind: 'demurrage pull', tag: 'pull', from: 'c14d', to: 'Well' },
  { hash: '0x4b71…12cc', amt: '+3,200', kind: 'AtlasOracle credit', tag: 'freed', from: 'Well', to: 'e302' },
  { hash: '0xd0a4…77fe', amt: '1,024', kind: 'member transfer', tag: 'p2p', from: 'aa19', to: 'f8c1' },
  { hash: '0x8c55…3b90', amt: '+640', kind: 'HoneyPOT', tag: 'freed', from: 'Well', to: '6d7e' },
];
const TAG = { freed: { c: 'var(--status-sourced)', t: 'var(--status-sourced-tint)', label: 'freed' }, pull: { c: 'var(--honey-600)', t: 'var(--honey-100)', label: 'demurrage' }, p2p: { c: 'var(--slate-400)', t: 'var(--paper-100)', label: 'transfer' } };

/* ---- anomalies = Path A invariant violations ---- */
const ANOMALIES = [
  { id: 'LDG-3391', sev: 'critical', kind: 'Fiat → BLiNG! sale brokered on-platform', detail: 'an account was credited BLiNG! against an incoming fiat payment', entry: '0x4f2c…91ad', amt: '8,800', status: 'held',
    check: 'Path A invariant · no-sale rule', oracle: 'Under Path A the platform never sells BLiNG! — it is only ever earned and freed from the Well. A fiat-for-BLiNG! credit cannot be legitimate, so its mere appearance is the alarm. Held; nothing settled.' },
  { id: 'LDG-3390', sev: 'critical', kind: 'Unsanctioned freeing', detail: 'total_supply rose with no sanctioned path behind it', entry: '0x77be…02e1', amt: '50,000', status: 'held',
    check: 'Freeing-path attestation', oracle: 'New BLiNG! appeared without a sanctioned freeing path attached. Every increase in total_supply must trace to Drops/Drips, affiliate_distribute, AtlasOracle credit or HoneyPOT. This one does not — held pending trace.' },
  { id: 'LDG-3387', sev: 'watch', kind: 'Demurrage not applied', detail: 'a tier-2 cohort skipped its 5% demurrage cycle', entry: '0x3a90…ccf2', amt: '—', status: 'review',
    check: 'Demurrage scheduler audit', oracle: 'Fibonacci demurrage (8/5/3/1% by tier) should pull continuously. A tier-2 batch missed a cycle — likely a scheduler hiccup, not theft, but balances are drifting above where the model wants them.' },
  { id: 'LDG-3361', sev: 'watch', kind: 'Hard-cap proximity', detail: 'a queued freeing would push total_supply across the cap', entry: '0x0b1e…ffa7', amt: '120', status: 'held',
    check: 'Cap guard · 111,222,333,333,222,111', oracle: 'A pending freeing would breach the palindrome hard cap. The cap guard held it — the Well cannot over-free. Trim the event or let demurrage make room first.' },
];

const ANOM_BY_POSTURE = { secure: [], degraded: ['LDG-3387', 'LDG-3361'], critical: ['LDG-3391', 'LDG-3390', 'LDG-3387', 'LDG-3361'] };
const STATUS_BADGE = { held: { verdict: 'struck', label: 'Held' }, review: { verdict: 'pending', label: 'In review' }, watching: { verdict: 'pending', label: 'Watching' } };

function LedgerStream() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {STREAM.map((e, i) => {
        const tg = TAG[e.tag]; const neg = e.amt.startsWith('−');
        return (
          <div key={e.hash} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 2px', borderBottom: i < STREAM.length - 1 ? '1px dashed var(--line)' : 'none' }}>
            <span style={{ width: 20, height: 20, flex: 'none', borderRadius: 99, background: tg.t, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tg.c }}>
              <Icon name={e.tag === 'pull' ? 'arrowDown' : 'check'} size={12} />
            </span>
            <span style={MONO({ fontSize: 11.5, color: 'var(--text-faint)', flex: 'none' })}>{e.hash}</span>
            <span style={{ fontSize: 12.5, color: 'var(--text-body)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <b style={{ fontWeight: 600 }}>{e.kind}</b> · {e.from === 'Well' ? 'Well' : 'mbr·' + e.from} → {e.to === 'Well' ? 'Well' : 'mbr·' + e.to}
            </span>
            <span style={{ ...MONO({ fontSize: 9, letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 700, color: tg.c }), background: tg.t, borderRadius: 999, padding: '1px 7px', flex: 'none' }}>{tg.label}</span>
            <span style={MONO({ fontSize: 13, fontWeight: 700, color: neg ? 'var(--honey-600)' : 'var(--text-strong)', flex: 'none', width: 58, textAlign: 'right' })}>◇ {e.amt}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ---- the Well: Path A supply readout ---- */
function SupplyWell() {
  return (
    <Card padding="lg" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
        <Icon name="lock" size={16} style={{ color: 'var(--navy-700)' }} />
        <div style={{ flex: 1 }}>
          <div style={EYEBROW}>The Well · Path A</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 17, color: 'var(--text-strong)', lineHeight: 1.1 }}>Earned, never sold</div>
        </div>
        <span style={{ ...MONO({ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--status-sourced)' }), background: 'var(--status-sourced-tint)', border: '1px solid #AFD2BF', borderRadius: 999, padding: '2px 9px' }}>cap intact</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', ...MONO({ fontSize: 10.5, color: 'var(--text-muted)' }), marginBottom: 5 }}>
        <span>total_supply freed</span><span><b style={{ color: 'var(--text-strong)' }}>48.3%</b> of cap</span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: 'var(--paper-100)', overflow: 'hidden', marginBottom: 6 }}>
        <div style={{ height: '100%', width: '48.3%', background: 'linear-gradient(90deg, var(--gold-600), var(--gold-400))' }} />
      </div>
      <div style={MONO({ fontSize: 10, color: 'var(--text-faint)', marginBottom: 14 })}>cap 111,222,333,333,222,111 · 1 ◇ = 1,000,000 FNU</div>

      <div style={EYEBROW}>Sanctioned freeing paths</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0 14px' }}>
        {['Drops / Drips', 'affiliate_distribute', 'AtlasOracle credit', 'HoneyPOT'].map((p) => (
          <span key={p} style={{ ...MONO({ fontSize: 11, color: 'var(--navy-700)' }), background: 'var(--navy-100)', border: '1px solid #C5D6E8', borderRadius: 999, padding: '3px 10px' }}>{p}</span>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', borderRadius: 'var(--radius-sm)', background: 'var(--honey-100)', border: '1px solid #F0C684' }}>
        <Icon name="arrowDown" size={14} style={{ color: 'var(--honey-600)' }} />
        <span style={{ fontSize: 12.5, color: 'var(--text-body)' }}><b>Demurrage 8 / 5 / 3 / 1%</b> by tier — pulling balances back to the Well, continuously.</span>
      </div>
    </Card>
  );
}

function AnomalyRow({ a, active, onClick }) {
  const k = TONE[a.sev];
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', cursor: 'pointer',
      padding: '11px 13px', border: active ? '1.5px solid var(--navy-600)' : '1px solid var(--line)',
      borderLeft: `var(--bw-frame) solid ${k.c}`, borderRadius: 'var(--radius-sm)',
      background: active ? 'var(--navy-100)' : a.sev === 'critical' ? k.t : 'var(--white)', font: 'inherit',
    }}>
      <span style={{ width: 9, height: 9, flex: 'none', borderRadius: 99, background: k.c, animation: a.sev === 'critical' ? 'dbpulse 1.2s ease-in-out infinite' : 'none' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-strong)' }}>{a.kind}</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.detail}</div>
      </div>
      <div style={{ flex: 'none', textAlign: 'right' }}>
        <div style={MONO({ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)' })}>◇ {a.amt}</div>
        <div style={MONO({ fontSize: 10, color: 'var(--text-faint)' })}>{a.id}</div>
      </div>
    </button>
  );
}

function ReconcilePanel() {
  const queued = ['0x4f2c…91ad', '0x77be…02e1', '0x3a90…ccf2', '0x9d10…44b8', '0x1ce7…a0d2'];
  return (
    <Card padding="lg" style={{ background: 'var(--navy-900)', border: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
        <div style={{ width: 38, height: 38, flex: 'none', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--honey-500)' }}>
          <Icon name="wifiOff" size={19} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={MONO({ fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold-400)' })}>Go Dark · reconcile queue</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 17, color: '#fff', lineHeight: 1.1 }}>Ledger writes held safely</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 34, color: 'var(--honey-500)', lineHeight: 1 }}>12,408</span>
        <span style={{ fontSize: 13, color: '#9DB0C4' }}>writes queued for reconcile</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        {queued.map((h, i) => (
          <div key={h} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 9px', borderRadius: 'var(--radius-xs)', background: 'rgba(255,255,255,0.04)' }}>
            <Icon name="clock" size={13} style={{ color: 'var(--honey-300)' }} />
            <span style={MONO({ fontSize: 11.5, color: '#C7D4E2', flex: 1 })}>{h}</span>
            <span style={MONO({ fontSize: 10, color: '#7E93A9' })}>{i === 0 ? 'queued' : 'pending'}</span>
          </div>
        ))}
        <div style={MONO({ fontSize: 11, color: '#7E93A9', textAlign: 'center', paddingTop: 4 })}>+ 12,403 more</div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 11px', borderRadius: 'var(--radius-sm)', background: 'rgba(217,136,28,0.12)', border: '1px solid rgba(217,136,28,0.3)' }}>
        <Icon name="shieldCheck" size={15} style={{ color: 'var(--honey-400, var(--honey-500))', flex: 'none', marginTop: 1, color: 'var(--honey-500)' }} />
        <span style={{ fontSize: 12, color: '#E8EEF4', lineHeight: 1.35 }}>Spine unreachable — DingleBERRY is queuing every write in order. They auto-reconcile when the spine returns. <b>No transaction is lost, none settle twice.</b></span>
      </div>
    </Card>
  );
}

/* ============================================================ */
function TransactionSecurity({ posture, go }) {
  const anomIds = ANOM_BY_POSTURE[posture];
  const anomalies = ANOMALIES.filter((a) => anomIds.includes(a.id));
  const [selId, setSel] = useState(null);
  const sel = anomalies.find((a) => a.id === selId) || anomalies[0] || null;
  const held = posture === 'critical';
  const secured = posture === 'secure' ? '1,284,902' : posture === 'degraded' ? '1,051,210' : 'HELD';

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: '22px 26px 40px' }}>
      {/* header */}
      <Card padding="lg" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ width: 46, height: 46, flex: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--navy-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--navy-700)' }}>
            <Icon name="lock" size={23} />
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={EYEBROW}>Surface 02 · BLiNG! ledger integrity</div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--size-title-l)', fontWeight: 700, color: 'var(--text-strong)', lineHeight: 1.05, margin: '3px 0 4px' }}>Transaction security</h1>
            <div style={{ fontSize: 14.5, color: 'var(--text-body)', maxWidth: 540 }}>Guarding the <b>Path A</b> ledger — BLiNG! is earned and freed from the Well, <b>never sold</b>. The anomalies are invariant violations.</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[['Secured · 24h', secured, held ? 'critical' : 'secure'], ['Invariant alarms', String(anomalies.length), anomalies.length ? 'watch' : 'secure'], held ? ['Queued for reconcile', '12,408', 'watch'] : ['Demurrage pulled · 24h', '−1.9M', 'secure']].map(([cap, n, tn]) => (
              <div key={cap} style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', minWidth: 104 }}>
                <div style={MONO({ fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 4 })}>{cap}</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 24, color: TONE[tn].c, lineHeight: 1 }}>{n}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="cc-grid" style={{ alignItems: 'start' }}>
        {/* left: assurance + stream + anomalies */}
        <div style={{ minWidth: 0 }}>
          <Card padding="lg" style={{ marginBottom: 16, borderLeft: `var(--bw-frame) solid ${held ? 'var(--alert-600)' : 'var(--status-sourced)'}` }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 40, color: held ? 'var(--alert-600)' : 'var(--text-strong)', lineHeight: 1 }}>{secured === 'HELD' ? 'Writes held' : secured}</span>
              {secured !== 'HELD' && <span style={{ fontSize: 15, color: 'var(--text-muted)' }}>transactions secured today</span>}
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 14 }}>
              {held ? 'Spine unreachable — every write is queued in order for clean reconcile.' : anomalies.length ? `${anomalies.length} Path A violations flagged and held · nothing settled` : 'Every freeing traced to a sanctioned path · demurrage flowing · cap intact'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--status-sourced)', animation: 'dbpulse 1.2s ease-in-out infinite' }} />
              <span style={EYEBROW}>Live ledger stream — verifying</span>
            </div>
            <LedgerStream />
          </Card>

          <SupplyWell />

          {anomalies.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 12px' }}>
                <span style={EYEBROW}>Path A violations — worst-first</span>
                <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {anomalies.map((a) => <AnomalyRow key={a.id} a={a} active={sel && a.id === sel.id} onClick={() => setSel(a.id)} />)}
              </div>
            </div>
          )}
        </div>

        {/* right: reconcile (go dark) + anomaly detail / clean state */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 0 }}>
          {held && <ReconcilePanel />}

          {sel ? (
            <Card padding="lg">
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ width: 11, height: 11, borderRadius: 99, background: TONE[sel.sev].c, animation: sel.sev === 'critical' ? 'dbpulse 1.2s ease-in-out infinite' : 'none' }} />
                <Badge verdict={STATUS_BADGE[sel.status].verdict} variant="solid">{STATUS_BADGE[sel.status].label}</Badge>
                <span style={{ flex: 1 }} />
                <span style={MONO({ fontSize: 11, color: 'var(--text-faint)' })}>{sel.id}</span>
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 20, color: 'var(--text-strong)', lineHeight: 1.1, margin: '0 0 4px' }}>{sel.kind}</h2>
              <div style={{ fontSize: 13, color: 'var(--text-body)', marginBottom: 13 }}>{sel.detail}</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 13 }}>
                <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '9px 11px' }}>
                  <div style={MONO({ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 3 })}>Ledger entry</div>
                  <div style={MONO({ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)' })}>{sel.entry}</div>
                </div>
                <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '9px 11px' }}>
                  <div style={MONO({ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 3 })}>Amount</div>
                  <div style={MONO({ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)' })}>◇ {sel.amt}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 7, alignItems: 'center', padding: '8px 11px', borderRadius: 'var(--radius-sm)', background: 'var(--paper-100)', marginBottom: 12 }}>
                <Icon name="radar" size={14} style={{ color: 'var(--navy-700)' }} />
                <span style={{ fontSize: 12, color: 'var(--text-body)' }}><b>Caught by</b> · {sel.check}</span>
              </div>

              <div style={{ display: 'flex', gap: 11, padding: '12px 13px', borderRadius: 'var(--radius-sm)', background: 'var(--navy-900)', marginBottom: 13 }}>
                <div style={{ width: 30, height: 30, flex: 'none', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, var(--gold-400), var(--gold-600))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="sparkle" size={15} style={{ color: 'var(--navy-900)' }} />
                </div>
                <div>
                  <div style={MONO({ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-400)', marginBottom: 3 })}>Atlas Oracle · assessment</div>
                  <div style={{ fontSize: 12.5, color: '#D8E2EC', lineHeight: 1.4 }}>{sel.oracle}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Button variant="danger" fullWidth iconLeft={<Icon name="x" size={15} />}>Reverse &amp; refund</Button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="secondary" fullWidth>Keep held</Button>
                  <Button variant="ghost" fullWidth>Clear — false flag</Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card padding="lg" style={{ borderLeft: '3px solid var(--status-sourced)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Icon name="shieldCheck" size={20} style={{ color: 'var(--status-sourced)' }} />
                <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 18, color: 'var(--text-strong)' }}>Ledger clean</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.4, marginBottom: 14 }}>No anomalies open. Every write in the last 24h passed signature, rank and conflict checks. The promise holds.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {[['Signature checks', '100%'], ['Double-spend conflicts', '0'], ['Rank-gate failures', '0'], ['Mean settle time', '0.4s']].map(([cap, n], i) => (
                  <div key={cap} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: i < 3 ? '1px dashed var(--line)' : 'none' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{cap}</span>
                    <span style={MONO({ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)' })}>{n}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

window.DB_TransactionSecurity = TransactionSecurity;
})();
