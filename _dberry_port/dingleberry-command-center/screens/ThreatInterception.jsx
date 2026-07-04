/* ============================================================
   DingleBERRY — Surface 06 · Threat Interception (drill-in)
   Malware / spyware / surveillance caught at the perimeter,
   traced to source — and the on-ramp to collective action.
   DingleBERRY = detector + on-ramp. Justice = the venue.
   Uses JUSTICE components Card/Button/Badge + EscalationLadder
   (the handoff into Justice's accountability flow).
   IIFE-wrapped to keep top-level consts out of global scope.
   ============================================================ */
(function () {
const DS = window.TheLastWordDesignSystem_a9501e || window.TLW;
const { Card, Button, Badge, EscalationLadder } = DS;
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

const KIND = {
  surveillance: { icon: 'radar', label: 'Surveillance' },
  malware:      { icon: 'ban', label: 'Malware' },
  stalkerware:  { icon: 'eye', label: 'Stalkerware' },
  spyware:      { icon: 'eye', label: 'Spyware' },
  phishing:     { icon: 'alertTriangle', label: 'Phishing' },
};

/* ---- intercepted threats (worst-first) · sample data ---- */
const THREATS = [
  { id: 'THR-0884', name: 'Crypto-miner injected in shared CDN dependency', kind: 'malware', sev: 'critical', status: 'intercepted',
    target: 'member surface · @driftwood-bee', origin: 'supply chain — compromised dependency (mesh-utils@4.2.1)', affected: 1204, sample: ['a9', '3e', '7f', 'c1'],
    plain: 'A package thousands of member surfaces depend on was hijacked. The update silently mines in every visitor’s browser — stealing their CPU and battery, and risking a browser-store flag.',
    fix: 'Pin mesh-utils to 4.1.9, purge the poisoned build, add a Content-Security-Policy that blocks the miner pool.', justice: true },
  { id: 'THR-0911', name: 'Zero-click surveillance implant', kind: 'surveillance', sev: 'critical', status: 'quarantined',
    target: 'member device · @larkspur-bee', origin: 'zero-click — malicious dispatch link', affected: 3, sample: ['b2', 'd4', '8a'],
    plain: 'A no-interaction spyware implant that reads messages, location and the mic. DingleBERRY caught its outbound beacon and isolated the device before exfiltration completed.',
    fix: 'Force-revoke the implant’s tokens, rebuild the device from a clean image, rotate the member’s credentials.', justice: true },
  { id: 'THR-0852', name: 'Stalkerware masquerading as a battery optimizer', kind: 'stalkerware', sev: 'critical', status: 'quarantined',
    target: 'member device · @ledger-bee', origin: 'sideloaded package from a lookalike store', affected: 27, sample: ['e3', '1c', 'f7'],
    plain: 'An app posing as a battery optimizer that silently tracks location and reads messages. Signature-matched to a known stalkerware family; 27 members have it installed.',
    fix: 'Walk each member through safe removal, block the publisher signature mesh-wide.', justice: true },
  { id: 'THR-0790', name: 'Credential-stealer browser extension', kind: 'spyware', sev: 'watch', status: 'intercepted',
    target: 'member browser', origin: 'malicious extension update', affected: 42, sample: ['7b', '2d'],
    plain: 'A once-clean extension pushed an update that scrapes form fields and session tokens. Caught on first exfil attempt.',
    fix: 'Auto-disable the extension for affected members, invalidate captured sessions.', justice: false },
  { id: 'THR-0741', name: 'Sandbox-escape attempt on compute node', kind: 'malware', sev: 'watch', status: 'blocked',
    target: 'mesh · public-good compute', origin: 'hijacked charitable job payload', affected: 0, sample: [],
    plain: 'A borrowed-compute job tried to break its sandbox to join a botnet. Contained instantly — results are charitable and never touch platform ops, so no comb impact.',
    fix: 'Kill the job, flag the submitting node, tighten the seccomp profile.', justice: false },
  { id: 'THR-0688', name: 'Phishing kit cloning the BLiNG! sign-in', kind: 'phishing', sev: 'watch', status: 'taken down',
    target: 'members', origin: 'lookalike domain (bl1ng-pay.example)', affected: 18, sample: ['9f', 'a0'],
    plain: 'A pixel-perfect clone of the BLiNG! login harvesting credentials. DingleBERRY flagged the domain and triggered takedown.',
    fix: 'Blocklist the domain mesh-wide, warn the 18 members who clicked, force a credential reset.', justice: true },
];

const STATUS_BADGE = {
  intercepted: { verdict: 'affirmed', label: 'Intercepted' },
  quarantined: { verdict: 'struck', label: 'Quarantined' },
  blocked:     { verdict: 'affirmed', label: 'Blocked' },
  'taken down':{ verdict: 'affirmed', label: 'Taken down' },
};

function KindChip({ kind }) {
  const k = KIND[kind];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 22, padding: '0 10px', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', borderRadius: 'var(--radius-pill)', border: '1px solid var(--line-strong)', color: 'var(--text-muted)', background: 'var(--paper-100)' }}>
      <Icon name={k.icon} size={12} /> {k.label}
    </span>
  );
}

function Dots({ names, n }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      {names.slice(0, 4).map((nm, i) => (
        <span key={i} style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--white)', background: 'var(--navy-600)', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: i ? -7 : 0 }}>{nm}</span>
      ))}
      {n > names.length && <span style={{ marginLeft: 6, ...MONO({ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }) }}>+{(n - 4).toLocaleString()}</span>}
    </span>
  );
}

/* ---- a threat row in the list ---- */
function ThreatRow({ x, active, onClick }) {
  const k = TONE[x.sev];
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'left', cursor: 'pointer',
      padding: '12px 14px', border: active ? '1.5px solid var(--navy-600)' : '1px solid var(--line)',
      borderLeft: `var(--bw-frame) solid ${k.c}`, borderRadius: 'var(--radius-sm)',
      background: active ? 'var(--navy-100)' : x.sev === 'critical' ? k.t : 'var(--white)', font: 'inherit',
    }}>
      <div style={{ width: 36, height: 36, flex: 'none', borderRadius: 'var(--radius-sm)', background: k.t, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.c }}>
        <Icon name={KIND[x.kind].icon} size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-strong)', lineHeight: 1.2 }}>{x.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
          <span style={MONO({ fontSize: 11, color: 'var(--text-faint)' })}>{x.id}</span>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>· {x.target}</span>
        </div>
      </div>
      <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
        <Badge verdict={STATUS_BADGE[x.status].verdict} variant="soft">{STATUS_BADGE[x.status].label}</Badge>
        <span style={MONO({ fontSize: 10.5, color: x.affected > 0 ? 'var(--alert-600)' : 'var(--text-faint)' })}>{x.affected > 0 ? `${x.affected.toLocaleString()} affected` : 'no spread'}</span>
      </div>
    </button>
  );
}

/* ============================================================ */
function ThreatInterception({ posture, go }) {
  const [selId, setSel] = useState('THR-0884');
  const x = THREATS.find((t) => t.id === selId) || THREATS[0];
  const k = TONE[x.sev];
  const crit = THREATS.filter((t) => t.sev === 'critical').length;
  const protectedN = THREATS.reduce((a, t) => a + t.affected, 0);

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: '22px 26px 40px' }}>
      {/* header */}
      <Card padding="lg" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ width: 46, height: 46, flex: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--alert-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--alert-600)' }}>
            <Icon name="shieldCheck" size={24} />
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={EYEBROW}>Surface 06 · perimeter defense</div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--size-title-l)', fontWeight: 700, color: 'var(--text-strong)', lineHeight: 1.05, margin: '3px 0 4px' }}>Threat interception</h1>
            <div style={{ fontSize: 14.5, color: 'var(--text-body)', maxWidth: 560 }}>Malware, spyware and surveillance — caught at the perimeter, traced to source, and routed to collective action.</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[['Intercepted · 24h', String(THREATS.length), 'critical'], ['Members protected', protectedN.toLocaleString(), 'secure'], ['Critical open', String(crit), 'critical']].map(([cap, n, tn]) => (
              <div key={cap} style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', minWidth: 96 }}>
                <div style={MONO({ fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 4 })}>{cap}</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 24, color: TONE[tn].c, lineHeight: 1 }}>{n}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="cc-grid" style={{ alignItems: 'start' }}>
        {/* threat list */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 12px' }}>
            <span style={EYEBROW}>Intercepted threats — worst-first</span>
            <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {THREATS.map((t) => <ThreatRow key={t.id} x={t} active={t.id === selId} onClick={() => setSel(t.id)} />)}
          </div>
        </div>

        {/* detail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 0 }}>
          <Card padding="lg">
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10, flexWrap: 'wrap' }}>
              <span style={{ width: 11, height: 11, borderRadius: 99, background: k.c, animation: x.sev === 'critical' ? 'dbpulse 1.2s ease-in-out infinite' : 'none' }} />
              <KindChip kind={x.kind} />
              <Badge verdict={STATUS_BADGE[x.status].verdict} variant="solid">{STATUS_BADGE[x.status].label}</Badge>
              <span style={{ flex: 1 }} />
              <span style={MONO({ fontSize: 11, color: 'var(--text-faint)' })}>{x.id}</span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 20, color: 'var(--text-strong)', lineHeight: 1.12, margin: '0 0 10px' }}>{x.name}</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ ...EYEBROW, flex: 'none', width: 58, paddingTop: 2 }}>Target</span>
                <span style={{ fontSize: 13, color: 'var(--text-body)' }}>{x.target}</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ ...EYEBROW, flex: 'none', width: 58, paddingTop: 2 }}>Origin</span>
                <span style={{ fontSize: 13, color: 'var(--text-body)' }}>{x.origin}</span>
              </div>
            </div>

            {/* Atlas Oracle plain-language */}
            <div style={{ display: 'flex', gap: 11, padding: '12px 13px', borderRadius: 'var(--radius-sm)', background: 'var(--navy-900)', marginBottom: 12 }}>
              <div style={{ width: 30, height: 30, flex: 'none', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, var(--gold-400), var(--gold-600))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="sparkle" size={15} style={{ color: 'var(--navy-900)' }} />
              </div>
              <div>
                <div style={MONO({ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-400)', marginBottom: 3 })}>Atlas Oracle · what it is</div>
                <div style={{ fontSize: 12.5, color: '#D8E2EC', lineHeight: 1.4 }}>{x.plain}</div>
              </div>
            </div>

            {/* fix */}
            <div style={{ padding: '11px 13px', borderRadius: 'var(--radius-sm)', background: 'var(--status-sourced-tint)', border: '1px solid #AFD2BF', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                <Icon name="check" size={14} style={{ color: 'var(--status-sourced)' }} />
                <span style={{ fontWeight: 700, fontSize: 12.5, color: '#1F6F49' }}>Recommended fix</span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-body)', lineHeight: 1.35, marginBottom: 9 }}>{x.fix}</div>
              <Button variant="primary" size="sm" iconLeft={<Icon name="sparkle" size={14} />}>Apply with Atlas Oracle</Button>
            </div>

            {/* blast radius */}
            {x.affected > 0 && (
              <div>
                <div style={{ ...EYEBROW, marginBottom: 8 }}>Blast radius</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Dots names={x.sample} n={x.affected} />
                  <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 20, color: 'var(--alert-600)', lineHeight: 1 }}>{x.affected.toLocaleString()}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>members hit by the same payload</span>
                </div>
              </div>
            )}
          </Card>

          {/* Justice on-ramp — the hero handoff */}
          {x.justice && (
            <Card padding="lg" style={{ borderTop: '3px solid var(--gold-600)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9 }}>
                <Icon name="scale" size={18} style={{ color: 'var(--gold-700)' }} />
                <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 17, color: 'var(--text-strong)' }}>This is bigger than one member</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.4, marginBottom: 12 }}>
                <b>{x.affected.toLocaleString()} members</b> were hit by the same payload from the same source. DingleBERRY found it — <b>Justice</b> is where you act on it together. It enters as a Manual Group at the first rung:
              </div>
              <div style={{ background: 'var(--paper-50)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '12px 10px', marginBottom: 12 }}>
                <EscalationLadder current="see" compact showLabels={false} />
              </div>
              <Button variant="primary" fullWidth iconLeft={<Icon name="scale" size={16} />} style={{ background: 'var(--gold-600)' }} onClick={() => go && go('justice')}>Form a Manual Group in Justice</Button>
              <div style={{ ...MONO({ fontSize: 10.5, color: 'var(--text-faint)' }), textAlign: 'center', marginTop: 8 }}>DingleBERRY = detector + on-ramp · Justice = the venue</div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

window.DB_ThreatInterception = ThreatInterception;
})();
