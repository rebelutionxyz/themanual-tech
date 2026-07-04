/* CANON (Jun-11): DingleBERRY = SECURITY Astra; this screen = class-action LAUNCHER.
   'Justice realm' below = TheMANUAL atom realm (the class-action record), NOT an Astra.
   Legal Astra = AtlasADVOCATE. The designed copy is canon-correct — do not rewrite. */
/* ============================================================
   DingleBERRY — Justice Handoff (detector → venue seam)
   DingleBERRY surfaces the collective-harm angle and hands the
   evidence over; the Manual Group forms and proceeds in The
   Manual's Justice realm. DingleBERRY never runs the group.
   Renders Justice's own components (EntityHeader, CaseCard,
   EscalationLadder) so the case takes shape as it crosses over.
   IIFE-wrapped to keep top-level consts out of global scope.
   ============================================================ */
(function () {
const DS = window.TheLastWordDesignSystem_a9501e || window.TLW;
const { Card, Button, EntityHeader, CaseCard } = DS;
const Icon = window.TLWIcon;

const MONO = (x = {}) => ({ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', ...x });
const EYEBROW = { fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)' };

function DBhex({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="50" fill="#0C1826" stroke="#B8902F" strokeWidth="3" />
      <path d="M60 30 L84 44 L84 72 L60 86 L36 72 L36 44 Z" fill="none" stroke="#D4B65E" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="60" cy="58" r="7" fill="none" stroke="#E5A23A" strokeWidth="3" />
      <circle cx="60" cy="58" r="2.4" fill="#E5A23A" />
    </svg>
  );
}

const EVIDENCE = [
  { icon: 'ban', label: 'Malware payload', v: 'crypto-miner · hash 0x4f2c…91ad', note: 'isolated sample' },
  { icon: 'gitBranch', label: 'Origin chain', v: 'mesh-utils@4.2.1 · maintainer account hijacked', note: 'provenance traced' },
  { icon: 'users', label: 'Affected members', v: '1,204 member sites served the payload', note: 'the eligible class' },
  { icon: 'clock', label: 'Timeline', v: 'injected 6d ago · detected + blocked today', note: 'with timestamps' },
];

function JusticeHandoff({ posture, go }) {
  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: '22px 26px 40px' }}>
      {/* seam band */}
      <Card padding="lg" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <DBhex size={36} />
            <Icon name="chevronRight" size={20} style={{ color: 'var(--text-faint)' }} />
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--navy-900)', border: '2px solid var(--gold-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-400)' }}>
              <Icon name="scale" size={19} />
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={EYEBROW}>Detector → venue · the handoff</div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--size-title-l)', fontWeight: 700, color: 'var(--text-strong)', lineHeight: 1.05, margin: '3px 0 4px' }}>DingleBERRY found it. Justice is where you act.</h1>
            <div style={{ fontSize: 14.5, color: 'var(--text-body)', maxWidth: 560 }}>1,204 members were hit by the same payload from the same source. DingleBERRY packages the evidence; the group forms as a <b>Manual Group in The Manual’s Justice realm</b>.</div>
          </div>
        </div>
      </Card>

      <div className="cc-grid" style={{ alignItems: 'start' }}>
        {/* left — what DingleBERRY hands over */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 12px' }}>
            <span style={EYEBROW}>What DingleBERRY hands over</span>
            <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>
          <Card padding="lg" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {EVIDENCE.map((e) => (
                <div key={e.label} style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
                  <div style={{ width: 34, height: 34, flex: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--paper-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--navy-700)' }}>
                    <Icon name={e.icon} size={17} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-strong)' }}>{e.label}</span>
                      <span style={{ ...MONO({ fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gold-700)' }), background: 'var(--gold-100)', borderRadius: 'var(--radius-pill)', padding: '1px 7px' }}>{e.note}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{e.v}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '13px 15px', borderRadius: 'var(--radius-sm)', background: 'var(--paper-100)', border: '1px solid var(--line)' }}>
            <Icon name="shield" size={16} style={{ color: 'var(--navy-700)', flex: 'none', marginTop: 1 }} />
            <div style={{ fontSize: 12.5, color: 'var(--text-body)', lineHeight: 1.4 }}>
              <b>DingleBERRY is the detector and the on-ramp — not the court.</b> It packages findings and surfaces the affected class. The Manual Group forms, organizes and proceeds entirely in Justice. <span style={MONO({ color: 'var(--text-muted)' })}>No finding is entered here.</span>
            </div>
          </div>
        </div>

        {/* right — the Manual Group, in Justice's own components */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 0 }}>
          <div style={{ ...EYEBROW, display: 'flex', alignItems: 'center', gap: 7 }}>
            <Icon name="scale" size={13} style={{ color: 'var(--gold-700)' }} /> Preview · The Manual’s Justice realm
          </div>
          <div style={{ border: '2px solid var(--navy-800)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <EntityHeader
              name="Mesh-Utils Pkg"
              kind="Open-source package"
              sector="Open-source supply chain"
              geo="Comb-wide · 3 Astra"
              realmPath={['Society', 'Software']}
              contestedTags={[{ label: 'Upstream of THR-0884', lean: 'negative' }]}
            />
            <div style={{ background: 'var(--bg-canvas)', padding: 14 }}>
              <CaseCard
                id="JX-MESHUTILS-001"
                target="Mesh-Utils Pkg"
                title="Supply-chain malware served to 1,204 member sites"
                summary="A maintained dependency was hijacked to inject a crypto-miner into every site that pulled the update. DingleBERRY detected and blocked it; this group forms to seek accountability."
                status="emerging"
                rung="see"
                evidence={4}
                filings={1}
                testimony={0}
                geo="Comb-wide · 3 Astra"
                joined={1204}
              />
            </div>
          </div>

          <Card padding="lg">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 26, color: 'var(--gold-700)', lineHeight: 1 }}>1,204</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>members eligible to join the group</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button variant="primary" fullWidth iconLeft={<Icon name="scale" size={16} />} style={{ background: 'var(--gold-600)' }}>Create Manual Group in Justice</Button>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" fullWidth iconLeft={<Icon name="fileText" size={14} />}>Edit the filing</Button>
                <Button variant="ghost" fullWidth onClick={() => go && go('threat')}>Back to threat</Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

window.DB_JusticeHandoff = JusticeHandoff;
})();
