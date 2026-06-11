/* DingleBERRY — Justice Handoff (detector → venue seam).
   ------------------------------------------------------------
   DingleBERRY surfaces the collective-harm angle, packages the evidence, and
   FILES a Manual Group into The Manual's Justice REALM (the record). The legal
   venue/actor that carries the case forward is AtlasADVOCATE. DingleBERRY never
   runs the group and is not the court.

   CANON (per §6.6.1 / §6.6.2): "Justice" here is a taxonomy REALM (the record's
   home), NOT an Astra. The legal Astra is AtlasADVOCATE. The artifact carried
   some "Justice-as-venue" phrasing ("Justice is where you act", "proceeds
   entirely in Justice"); that has been aligned to realm = record, AtlasADVOCATE
   = venue. (Rebelution.app is NOT the legal hub — the actor is AtlasADVOCATE.)

   Ported from the artifact's JusticeHandoff screen and re-skinned to the
   Slice-A..F conventions. STEP-2: the evidence list is fed by useDingleberry()/
   contract (JusticeHandoffData); the Justice-realm record preview (EntityHeader
   + CaseCard) is shell-baked demo content. Never touches Supabase. No posture
   gating. The "file Manual Group" control is a WRITE (creates a Justice-realm
   record) → inert + Step-4 captioned. */
import { useNavigate } from 'react-router-dom';
import { dbIcon } from '@/components/dingleberry/icons';
import { ActionButton, ActionCaption, DbCard, Eyebrow } from '@/components/dingleberry/primitives';
import { DATA_BLUE, DINGLEBERRY_COLOR, TONE } from '@/components/dingleberry/tone';
import { useDingleberry } from './DingleberryLayout';

/* DingleBERRY seal — red identity hex (was navy + gold) */
function DBHex({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="DingleBERRY">
      <circle cx="60" cy="60" r="50" fill="#14171C" stroke={DINGLEBERRY_COLOR} strokeWidth="3" />
      <path d="M60 30 L84 44 L84 72 L60 86 L36 72 L36 44 Z" fill="none" stroke={DINGLEBERRY_COLOR} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="60" cy="58" r="7" fill="none" stroke={DINGLEBERRY_COLOR} strokeWidth="3" />
      <circle cx="60" cy="58" r="2.4" fill={DINGLEBERRY_COLOR} />
    </svg>
  );
}

/* The Manual's Justice-realm record preview — faithful stand-in for Justice's
   own EntityHeader + CaseCard components (not available in this repo). */
function RecordPreview() {
  return (
    <div className="overflow-hidden rounded-lg" style={{ border: `2px solid ${TONE.critical.border}` }}>
      {/* EntityHeader stand-in */}
      <div className="border-b border-border bg-bg-elevated" style={{ padding: '14px 16px' }}>
        <div className="mb-[6px] flex items-center gap-2 font-mono text-text-muted" style={{ fontSize: 10 }}>
          <span>Society</span>
          <span>›</span>
          <span>Software</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-serif font-bold text-text" style={{ fontSize: 18, lineHeight: 1.1 }}>
            Mesh-Utils Pkg
          </h3>
          <span
            className="rounded-full font-mono font-bold uppercase"
            style={{ fontSize: 9, letterSpacing: '0.06em', padding: '1px 8px', color: TONE.critical.c, background: TONE.critical.tint, border: `1px solid ${TONE.critical.border}` }}
          >
            Upstream of THR-0884
          </span>
        </div>
        <div className="mt-[5px] text-text-muted" style={{ fontSize: 12 }}>
          Open-source package · Open-source supply chain · Comb-wide · 3 Astra
        </div>
      </div>
      {/* CaseCard stand-in */}
      <div className="bg-bg" style={{ padding: 14 }}>
        <div className="rounded-md border border-border bg-bg-panel" style={{ padding: '13px 14px' }}>
          <div className="mb-[6px] flex flex-wrap items-center gap-2">
            <span className="font-mono text-text-muted" style={{ fontSize: 11 }}>
              JX-MESHUTILS-001
            </span>
            <span
              className="rounded-full font-mono font-bold uppercase"
              style={{ fontSize: 9, letterSpacing: '0.06em', padding: '1px 8px', color: TONE.watch.c, background: TONE.watch.tint, border: `1px solid ${TONE.watch.border}` }}
            >
              Emerging · rung: see
            </span>
          </div>
          <div className="font-serif font-bold text-text" style={{ fontSize: 15, lineHeight: 1.2 }}>
            Supply-chain malware served to 1,204 member sites
          </div>
          <div className="mt-[5px] text-text-silver" style={{ fontSize: 12.5, lineHeight: 1.4 }}>
            A maintained dependency was hijacked to inject a crypto-miner into every site that pulled the update.
            DingleBERRY detected and blocked it; this group forms to seek accountability.
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-text-muted" style={{ fontSize: 11 }}>
            <span>
              <b className="text-text-silver">4</b> evidence
            </span>
            <span>
              <b className="text-text-silver">1</b> filing
            </span>
            <span>
              <b className="text-text-silver">0</b> testimony
            </span>
            <span>Comb-wide · 3 Astra</span>
            <span>
              <b className="text-text-silver">1,204</b> joined
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================ */
export function JusticeHandoffPage() {
  const { data } = useDingleberry();
  const navigate = useNavigate();

  const ChevronRight = dbIcon('chevronRight');
  const Scale = dbIcon('scale');
  const Shield = dbIcon('shield');

  if (!data) {
    return (
      <div className="mx-auto" style={{ maxWidth: 1320, padding: '22px 26px 40px' }}>
        <DbCard className="p-6 text-text-muted">Loading handoff…</DbCard>
      </div>
    );
  }

  const evidence = data.justiceHandoff.evidence;

  return (
    <div className="mx-auto" style={{ maxWidth: 1320, padding: '22px 26px 40px' }}>
      {/* seam band */}
      <DbCard className="mb-[18px] p-5">
        <div className="flex flex-wrap items-center gap-[18px]">
          <div className="flex items-center gap-[13px]">
            <div className="flex flex-col items-center gap-1">
              <DBHex size={36} />
              <span className="font-mono uppercase text-text-muted" style={{ fontSize: 8, letterSpacing: '0.06em' }}>
                DingleBERRY
              </span>
            </div>
            <ChevronRight size={20} className="text-text-muted" />
            <div className="flex flex-col items-center gap-1">
              <div
                className="flex items-center justify-center rounded-full"
                style={{ width: 36, height: 36, background: 'var(--bg-elevated, #0C0E12)', border: `2px solid ${DINGLEBERRY_COLOR}`, color: DINGLEBERRY_COLOR }}
              >
                <Scale size={19} />
              </div>
              <span className="font-mono uppercase text-text-muted" style={{ fontSize: 8, letterSpacing: '0.06em' }}>
                AtlasADVOCATE
              </span>
            </div>
          </div>
          <div className="min-w-[260px] flex-1">
            <Eyebrow>Detector → venue · the handoff</Eyebrow>
            <h1 className="font-serif font-bold text-text" style={{ fontSize: 28, lineHeight: 1.05, margin: '3px 0 4px' }}>
              DingleBERRY found it. AtlasADVOCATE is where you act.
            </h1>
            <div className="text-text-silver" style={{ fontSize: 14.5, maxWidth: 580 }}>
              1,204 members were hit by the same payload from the same source. DingleBERRY packages the evidence and
              files a <b>Manual Group into The Manual’s Justice realm</b> — the record. <b>AtlasADVOCATE</b> is the legal
              Astra that carries it forward.
            </div>
          </div>
        </div>
      </DbCard>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* left — what DingleBERRY hands over */}
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-[10px]">
            <Eyebrow>What DingleBERRY hands over</Eyebrow>
            <span className="h-px flex-1 bg-border" />
          </div>
          <DbCard className="mb-4 p-5">
            <div className="flex flex-col gap-3">
              {evidence.map((e) => {
                const Icon = dbIcon(e.icon);
                return (
                  <div key={e.label} className="flex items-start gap-[13px]">
                    <div
                      className="flex flex-none items-center justify-center rounded-md bg-bg-elevated"
                      style={{ width: 34, height: 34, color: DATA_BLUE }}
                    >
                      <Icon size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-text" style={{ fontSize: 13.5 }}>
                          {e.label}
                        </span>
                        <span
                          className="rounded-full font-mono uppercase"
                          style={{ fontSize: 9, letterSpacing: '0.06em', padding: '1px 7px', color: DATA_BLUE, background: 'rgba(59,130,246,0.12)' }}
                        >
                          {e.note}
                        </span>
                      </div>
                      <div className="text-text-muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                        {e.v}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </DbCard>

          <div
            className="flex items-start gap-[9px] rounded-md border border-border bg-bg-elevated"
            style={{ padding: '13px 15px' }}
          >
            <Shield size={16} style={{ color: DATA_BLUE, flex: 'none', marginTop: 1 }} />
            <div className="text-text-silver" style={{ fontSize: 12.5, lineHeight: 1.4 }}>
              <b>DingleBERRY is the detector and the on-ramp — not the court.</b> It packages findings and surfaces the
              affected class, then files the Manual Group into the Justice realm. The case is carried forward in{' '}
              <b>AtlasADVOCATE</b>, the legal Astra; its record lives in the Justice realm.{' '}
              <span className="font-mono text-text-muted">No finding is entered here.</span>
            </div>
          </div>
        </div>

        {/* right — the Manual Group, previewed in the Justice realm */}
        <div className="flex flex-col gap-[14px] self-start lg:sticky lg:top-4">
          <div className="flex items-center gap-[7px]">
            <Scale size={13} style={{ color: DINGLEBERRY_COLOR }} />
            <Eyebrow>Preview · The Manual’s Justice realm</Eyebrow>
          </div>

          <RecordPreview />

          <DbCard className="p-5">
            <div className="mb-3 flex items-baseline gap-2">
              <span className="font-serif font-bold" style={{ fontSize: 26, lineHeight: 1, color: DINGLEBERRY_COLOR }}>
                1,204
              </span>
              <span className="text-text-muted" style={{ fontSize: 13 }}>
                members eligible to join the group
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <ActionButton variant="danger" icon="scale">
                File Manual Group into the Justice realm
              </ActionButton>
              <div className="flex gap-2">
                <ActionButton variant="secondary" icon="fileText">
                  Edit the filing
                </ActionButton>
                <button
                  type="button"
                  onClick={() => navigate('/dingleberry/threat')}
                  className="flex w-full items-center justify-center gap-2 rounded-md font-sans font-semibold text-text-muted"
                  style={{ height: 38, fontSize: 13, border: '1px solid transparent' }}
                >
                  Back to threat
                </button>
              </div>
              <ActionCaption />
            </div>
          </DbCard>
        </div>
      </div>
    </div>
  );
}
