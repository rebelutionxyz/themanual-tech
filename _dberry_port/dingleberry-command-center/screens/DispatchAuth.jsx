/* ============================================================
   DingleBERRY — Surface 05 · Dispatch (Waggle) Auth (drill-in)
   Every Waggle dispatch hashed; authority gated on the actor's
   monitoring/security DISCIPLINE rank (bee_ranks: discipline,
   rank_level) plus global standing (honeycomb_ring, bling_rank).
   Authority is provable, or it doesn't move.   [sample data]
   IIFE-wrapped to keep top-level consts out of global scope.
   ============================================================ */
(function () {
const DS = window.TheLastWordDesignSystem_a9501e || window.TLW;
const { Card, Button, Badge, Avatar } = DS;
const Icon = window.TLWIcon;
const { useState } = React;

const TONE = {
  secure:   { c: 'var(--status-sourced)',  t: 'var(--status-sourced-tint)' },
  watch:    { c: 'var(--honey-600)',        t: 'var(--honey-100)' },
  critical: { c: 'var(--alert-600)',        t: 'var(--alert-100)' },
};
const MONO = (x = {}) => ({ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', ...x });
const EYEBROW = { fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)' };

const MAXL = 5; // bee_ranks rank_level 1..5 within a discipline
const RANK_NAME = {
  monitoring: { 1: 'BeesWax', 2: 'Drone', 3: 'Forager', 4: 'Keeper', 5: 'Steward' },
  security: { 2: 'Scout', 4: 'Sentinel', 5: 'Guardian' }, // L1, L3 open
};
const rname = (disc, lvl) => (RANK_NAME[disc] && RANK_NAME[disc][lvl]) || ('L' + lvl);

// dispatches gate on the monitoring|security discipline rank + standing
// gates: routine = Forager / Sec Scout+ · quarantine = Keeper / Sentinel · Go Dark = Steward / Guardian + admin
const DISPATCHES = [
  { id: 'WAG-91c0', action: 'Reverse ledger entry LDG-3387', kind: 'ledger', actor: '@ledger-warden', disc: 'security', ar: 2, rr: 4, ring: 3, bling: '#1,204', ok: false, hash: '0x91c0…4d17', t: '2m',
    oracle: 'A Security Scout (L2) tried to reverse a ledger write that needs a Sentinel (L4). Held — discipline rank gates it; standing alone can’t carry it.' },
  { id: 'WAG-d0a4', action: 'Treasury disbursement ◇ 50,000', kind: 'treasury', actor: '@combkeeper', disc: 'security', ar: 4, rr: 5, ring: 2, bling: '#88', ok: false, hash: '0xd0a4…77fe', t: '12m',
    oracle: 'A Security Sentinel (L4) attempting a Guardian-level (L5) + admin treasury move — blocked one level short. Ring 2 standing is high, but rank gates the action.' },
  { id: 'WAG-7f3a', action: 'Quarantine node mq-7f3a', kind: 'mesh control', actor: '@nightwatch', disc: 'monitoring', ar: 4, rr: 4, ring: 2, bling: '#140', ok: true, hash: '0x7f3a…be21', t: 'now',
    oracle: 'A monitoring Keeper (L4) issuing a quarantine — exactly the Keeper gate. Verified against bee_ranks, hash-chained, executed.' },
  { id: 'WAG-2ee8', action: 'Declare Go Dark (mesh blackout)', kind: 'emergency', actor: '@sentinel-prime', disc: 'monitoring', ar: 5, rr: 5, ring: 1, bling: '#12', ok: true, hash: '0x2ee8…a0f3', t: '4m',
    oracle: 'A monitoring Steward (L5) + admin declaring Go Dark — the top gate. Authority provable; broadcast signed and logged as a hard action.' },
  { id: 'WAG-4b71', action: 'Grant Forager rank to a bee', kind: 'governance', actor: '@comb-steward', disc: 'security', ar: 5, rr: 4, ring: 1, bling: '#9', ok: true, hash: '0x4b71…12cc', t: '9m',
    oracle: 'A Security Guardian (L5) performing a rank grant that needs Sentinel. Clean — logged to the grantee’s bee_ranks row.' },
  { id: 'WAG-8c55', action: 'Mute actor across 3 Astra', kind: 'moderation', actor: '@meshwarden', disc: 'monitoring', ar: 3, rr: 3, ring: 3, bling: '#420', ok: true, hash: '0x8c55…3b90', t: '18m',
    oracle: 'A monitoring Forager (L3) routine moderation within authority. Verified.' },
];

function RankLadder({ ar, rr, disc }) {
  const ok = ar >= rr;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
      {Array.from({ length: MAXL }, (_, idx) => {
        const i = idx + 1;
        const filled = i <= ar; const isReq = i === rr; const isActor = i === ar;
        const named = RANK_NAME[disc] && RANK_NAME[disc][i];
        const c = filled ? (ok ? 'var(--status-sourced)' : i >= rr ? 'var(--alert-600)' : 'var(--navy-600)') : 'var(--line-strong)';
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, position: 'relative' }}>
            {isReq && <span style={{ position: 'absolute', top: -16, ...MONO({ fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }) }}>needs</span>}
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <span style={{ flex: 1, height: 2, background: i === 1 ? 'transparent' : (i <= ar ? (ok ? 'var(--status-sourced)' : i > rr ? 'var(--alert-600)' : 'var(--navy-600)') : 'var(--line)') }} />
              <span style={{ width: isActor || isReq ? 16 : 11, height: isActor || isReq ? 16 : 11, borderRadius: 99, flex: 'none', background: filled ? c : 'var(--white)', border: `2px solid ${isReq ? (ok ? 'var(--status-sourced)' : 'var(--alert-600)') : c}`, boxShadow: isActor ? `0 0 0 3px ${ok ? 'var(--status-sourced-tint)' : 'var(--alert-100)'}` : 'none' }} />
              <span style={{ flex: 1, height: 2, background: i === MAXL ? 'transparent' : (i < ar ? (ok ? 'var(--status-sourced)' : i >= rr ? 'var(--alert-600)' : 'var(--navy-600)') : 'var(--line)') }} />
            </div>
            <span style={MONO({ fontSize: 8.5, fontWeight: isActor ? 700 : 500, color: named ? (isActor ? 'var(--text-strong)' : 'var(--text-faint)') : 'var(--line-heavy)', textAlign: 'center', lineHeight: 1.1 })}>{named || ('L' + i)}</span>
            {isActor && <span style={MONO({ fontSize: 8, color: ok ? 'var(--status-sourced)' : 'var(--alert-600)', fontWeight: 700 })}>actor</span>}
          </div>
        );
      })}
    </div>
  );
}

function DispatchRow({ d, active, onClick }) {
  const k = d.ok ? TONE.secure : TONE.critical;
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', cursor: 'pointer',
      padding: '11px 13px', border: active ? '1.5px solid var(--navy-600)' : '1px solid var(--line)',
      borderLeft: `var(--bw-frame) solid ${k.c}`, borderRadius: 'var(--radius-sm)',
      background: active ? 'var(--navy-100)' : d.ok ? 'var(--white)' : TONE.critical.t, font: 'inherit',
    }}>
      <span style={{ width: 22, height: 22, flex: 'none', borderRadius: 99, background: k.t, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.c }}>
        <Icon name={d.ok ? 'check' : 'x'} size={13} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.action}</div>
        <div style={MONO({ fontSize: 11, color: 'var(--text-muted)' })}>{d.hash} · {d.actor} · {rname(d.disc, d.ar)}</div>
      </div>
      <div style={{ flex: 'none', textAlign: 'right' }}>
        <Badge verdict={d.ok ? 'affirmed' : 'struck'} variant="soft">{d.ok ? 'Verified' : 'Held'}</Badge>
        <div style={MONO({ fontSize: 10, color: 'var(--text-faint)', marginTop: 3 })}>needs {rname(d.disc, d.rr)}</div>
      </div>
    </button>
  );
}

function DispatchAuth({ posture, go }) {
  const sorted = [...DISPATCHES].sort((a, b) => Number(a.ok) - Number(b.ok));
  const [selId, setSel] = useState('WAG-d0a4');
  const d = DISPATCHES.find((x) => x.id === selId) || sorted[0];
  const k = d.ok ? TONE.secure : TONE.critical;
  const failed = DISPATCHES.filter((x) => !x.ok).length;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: '22px 26px 40px' }}>
      <Card padding="lg" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ width: 46, height: 46, flex: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--navy-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--navy-700)' }}>
            <Icon name="zap" size={23} />
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={EYEBROW}>Surface 05 · dispatch authentication</div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--size-title-l)', fontWeight: 700, color: 'var(--text-strong)', lineHeight: 1.05, margin: '3px 0 4px' }}>Dispatch auth</h1>
            <div style={{ fontSize: 14.5, color: 'var(--text-body)', maxWidth: 560 }}>Every Waggle dispatch hashed; authority gated on the actor’s <b>monitoring / security discipline rank</b> + standing. <b>Provable, or it doesn’t move.</b></div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[['Hashed · 24h', '3,402', 'secure'], ['Rank-verified', '3,388', 'secure'], ['Failed rank check', String(failed + 12), 'critical']].map(([cap2, n, tn]) => (
              <div key={cap2} style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', minWidth: 96 }}>
                <div style={MONO({ fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 4 })}>{cap2}</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 24, color: TONE[tn].c, lineHeight: 1 }}>{n}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="cc-grid" style={{ alignItems: 'start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 12px' }}>
            <span style={EYEBROW}>Dispatch stream — held first</span>
            <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {sorted.map((x) => <DispatchRow key={x.id} d={x} active={x.id === d.id} onClick={() => setSel(x.id)} />)}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 0 }}>
          <Card padding="lg">
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10, flexWrap: 'wrap' }}>
              <span style={{ width: 11, height: 11, borderRadius: 99, background: k.c, animation: !d.ok ? 'dbpulse 1.2s ease-in-out infinite' : 'none' }} />
              <Badge verdict={d.ok ? 'affirmed' : 'struck'} variant="solid">{d.ok ? 'Rank verified' : 'Rank insufficient'}</Badge>
              <span style={{ flex: 1 }} />
              <span style={MONO({ fontSize: 11, color: 'var(--text-faint)' })}>{d.id}</span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 19, color: 'var(--text-strong)', lineHeight: 1.12, margin: '0 0 12px' }}>{d.action}</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '9px 11px' }}>
                <div style={MONO({ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 3 })}>Dispatch hash</div>
                <div style={MONO({ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)' })}>{d.hash}</div>
              </div>
              <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '9px 11px' }}>
                <div style={MONO({ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 3 })}>Class</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)', textTransform: 'capitalize' }}>{d.kind}</div>
              </div>
            </div>

            {/* actor + standing */}
            <div style={{ padding: '11px 12px', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 10 }}>
                <Avatar name={d.actor.replace('@', '')} size="sm" />
                <div style={{ flex: 1 }}>
                  <div style={MONO({ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)' })}>{d.actor}</div>
                  <div style={MONO({ fontSize: 11, color: 'var(--text-muted)' })}>{rname(d.disc, d.ar)} · {cap(d.disc)} L{d.ar}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={MONO({ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)' })}>requires</div>
                  <div style={MONO({ fontSize: 13, fontWeight: 700, color: d.ok ? 'var(--status-sourced)' : 'var(--alert-600)' })}>{rname(d.disc, d.rr)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', borderTop: '1px dashed var(--line)', paddingTop: 9 }}>
                <span style={MONO({ fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-faint)' })}>global standing</span>
                <span style={{ ...MONO({ fontSize: 11, color: 'var(--navy-700)', fontWeight: 700 }), background: 'var(--navy-100)', borderRadius: 999, padding: '1px 9px' }}>honeycomb_ring · {d.ring}</span>
                <span style={{ ...MONO({ fontSize: 11, color: 'var(--navy-700)', fontWeight: 700 }), background: 'var(--navy-100)', borderRadius: 999, padding: '1px 9px' }}>bling_rank · {d.bling}</span>
              </div>
            </div>

            <div style={{ ...EYEBROW, marginBottom: 18 }}>{cap(d.disc)} rank-gate (bee_ranks)</div>
            <RankLadder ar={d.ar} rr={d.rr} disc={d.disc} />

            <div style={{ marginTop: 16, display: 'flex', gap: 9, alignItems: 'flex-start', padding: '11px 13px', borderRadius: 'var(--radius-sm)', background: d.ok ? 'var(--status-sourced-tint)' : 'var(--alert-100)', border: `1px solid ${d.ok ? '#AFD2BF' : '#E0A99F'}` }}>
              <Icon name={d.ok ? 'check' : 'alertTriangle'} size={15} style={{ color: k.c, flex: 'none', marginTop: 1 }} />
              <span style={{ fontSize: 12.5, color: 'var(--text-body)', lineHeight: 1.35 }}>
                {d.ok
                  ? <span><b>Authority proven.</b> {d.actor} holds {rname(d.disc, d.ar)} ({cap(d.disc)} L{d.ar}) ≥ required {rname(d.disc, d.rr)}, standing in good order. Signed and hash-chained.</span>
                  : <span><b>Short by {d.rr - d.ar} level{d.rr - d.ar > 1 ? 's' : ''}.</b> {d.actor} ({rname(d.disc, d.ar)}) can’t issue a {rname(d.disc, d.rr)}-gated dispatch — standing doesn’t override discipline rank. Held.</span>}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 11, padding: '12px 13px', borderRadius: 'var(--radius-sm)', background: 'var(--navy-900)', marginTop: 12, marginBottom: 13 }}>
              <div style={{ width: 30, height: 30, flex: 'none', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, var(--gold-400), var(--gold-600))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="sparkle" size={15} style={{ color: 'var(--navy-900)' }} />
              </div>
              <div>
                <div style={MONO({ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-400)', marginBottom: 3 })}>Atlas Oracle · note</div>
                <div style={{ fontSize: 12.5, color: '#D8E2EC', lineHeight: 1.4 }}>{d.oracle}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {d.ok
                ? <div style={{ display: 'flex', gap: 8 }}><Button variant="secondary" fullWidth iconLeft={<Icon name="fileText" size={15} />}>View payload</Button><Button variant="ghost" fullWidth>Audit trail</Button></div>
                : <><Button variant="primary" fullWidth iconLeft={<Icon name="arrowUp" size={15} />}>Request re-auth at {rname(d.disc, d.rr)}</Button>
                   <div style={{ display: 'flex', gap: 8 }}><Button variant="secondary" fullWidth>Escalate</Button><Button variant="danger" fullWidth>Reject dispatch</Button></div></>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

window.DB_DispatchAuth = DispatchAuth;
})();
