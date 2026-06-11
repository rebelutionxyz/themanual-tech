/* DingleBERRY — Surface 06 · Threat Interception (drill-in).
   ------------------------------------------------------------
   Malware / spyware / surveillance caught at the perimeter, traced to source —
   and the on-ramp to collective action. DingleBERRY = detector + on-ramp;
   Justice = the venue. Ported from the artifact's ThreatInterception screen and
   re-skinned to the Slice-A..D conventions. STEP-2: fed by useDingleberry()/
   contract (ThreatInterceptionData) — never touches Supabase (the external
   threat-ingest source is TBD; that's Step 3).

   The threat feed is posture-independent (the S02 lesson): worst-first by its
   own severity; nothing gated by secure/degraded/go-dark. All action controls
   are inert + captioned. */
import { useState } from 'react';
import { dbIcon } from '@/components/dingleberry/icons';
import { ActionButton, ActionCaption, DbCard, Eyebrow } from '@/components/dingleberry/primitives';
import { DATA_BLUE, DINGLEBERRY_COLOR, TONE } from '@/components/dingleberry/tone';
import type { Tone } from '@/lib/dingleberry/contract';
import { useDingleberry } from './DingleberryLayout';

/* The mock threats carry richer fields than the contract's Threat subset
   (target/origin/affected/sample/plain/fix/justice; mock uses `affected`, the
   contract has `members?`). Step-3 should widen Threat to match the ingest feed. */
interface S6Threat {
  id: string;
  name: string;
  kind: string;
  sev: string;
  status: string;
  target: string;
  origin: string;
  affected: number;
  sample: string[];
  plain: string;
  fix: string;
  justice: boolean;
}

const KIND: Record<string, { icon: string; label: string }> = {
  surveillance: { icon: 'radar', label: 'Surveillance' },
  malware: { icon: 'ban', label: 'Malware' },
  stalkerware: { icon: 'eye', label: 'Stalkerware' },
  spyware: { icon: 'eye', label: 'Spyware' },
  phishing: { icon: 'alertTriangle', label: 'Phishing' },
};

const SEV_RANK: Record<string, number> = { critical: 0, watch: 1, info: 2, idle: 3, secure: 4 };
const toneOf = (sev: string): Tone =>
  sev === 'critical' || sev === 'watch' || sev === 'info' || sev === 'idle' ? sev : 'secure';

/* intercepted/blocked/taken-down are "caught" outcomes (green); quarantined is
   the contained-but-live state (red, as the artifact 'struck' verdict). */
const STATUS_BADGE: Record<string, { tone: Tone; label: string }> = {
  intercepted: { tone: 'secure', label: 'Intercepted' },
  quarantined: { tone: 'critical', label: 'Quarantined' },
  blocked: { tone: 'secure', label: 'Blocked' },
  'taken down': { tone: 'secure', label: 'Taken down' },
};

function StatusBadge({ status }: { status: string }) {
  const b = STATUS_BADGE[status] ?? { tone: 'idle' as Tone, label: status };
  const k = TONE[b.tone];
  return (
    <span
      className="inline-flex items-center font-mono font-semibold uppercase"
      style={{ height: 19, padding: '0 8px', fontSize: 9.5, letterSpacing: '0.06em', borderRadius: 999, color: k.c, background: k.tint, border: `1px solid ${k.border}` }}
    >
      {b.label}
    </span>
  );
}

function KindChip({ kind }: { kind: string }) {
  const k = KIND[kind] ?? { icon: 'alertTriangle', label: kind };
  const Icon = dbIcon(k.icon);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-border-bright font-mono font-semibold uppercase text-text-muted"
      style={{ height: 22, padding: '0 10px', fontSize: 11, letterSpacing: '0.06em', background: 'var(--bg-elevated, #0C0E12)' }}
    >
      <Icon size={12} /> {k.label}
    </span>
  );
}

function Dots({ names, n }: { names: string[]; n: number }) {
  return (
    <span className="inline-flex items-center">
      {names.slice(0, 4).map((nm, i) => (
        <span
          key={nm}
          className="flex items-center justify-center rounded-full font-mono font-bold text-white"
          style={{ width: 24, height: 24, border: '2px solid var(--bg-panel, #0F1217)', background: DATA_BLUE, fontSize: 9, marginLeft: i ? -7 : 0 }}
        >
          {nm}
        </span>
      ))}
      {n > names.length && (
        <span className="font-mono font-bold text-text-muted" style={{ marginLeft: 6, fontSize: 12 }}>
          +{(n - 4).toLocaleString()}
        </span>
      )}
    </span>
  );
}

function ThreatRow({ x, active, onClick }: { x: S6Threat; active: boolean; onClick: () => void }) {
  const k = TONE[toneOf(x.sev)];
  const Icon = dbIcon(KIND[x.kind]?.icon ?? 'alertTriangle');
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-[13px] rounded-md text-left transition-colors"
      style={{
        padding: '12px 14px',
        border: active ? `1.5px solid ${DINGLEBERRY_COLOR}` : '1px solid var(--border, #1F252C)',
        borderLeft: `3px solid ${k.c}`,
        background: active ? 'rgba(220,38,38,0.08)' : x.sev === 'critical' ? k.tint : 'var(--bg-panel, #0F1217)',
      }}
    >
      <div className="flex flex-none items-center justify-center rounded-md" style={{ width: 36, height: 36, background: k.tint, color: k.c }}>
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-bold text-text" style={{ fontSize: 14, lineHeight: 1.2 }}>
          {x.name}
        </div>
        <div className="mt-[3px] flex flex-wrap items-center gap-2">
          <span className="font-mono text-text-muted" style={{ fontSize: 11 }}>
            {x.id}
          </span>
          <span className="text-text-muted" style={{ fontSize: 11.5 }}>
            · {x.target}
          </span>
        </div>
      </div>
      <div className="flex flex-none flex-col items-end gap-[5px]">
        <StatusBadge status={x.status} />
        <span className="font-mono" style={{ fontSize: 10.5, color: x.affected > 0 ? TONE.critical.c : 'var(--text-muted, #6B7580)' }}>
          {x.affected > 0 ? `${x.affected.toLocaleString()} affected` : 'no spread'}
        </span>
      </div>
    </button>
  );
}

/* compact escalation ladder — first rung active, labels hidden (Justice on-ramp entry) */
function EscalationLadder() {
  return (
    <div className="flex items-center">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex flex-1 items-center">
          <span
            className="flex-none rounded-full"
            style={{
              width: i === 0 ? 13 : 10,
              height: i === 0 ? 13 : 10,
              background: i === 0 ? DINGLEBERRY_COLOR : 'var(--bg-panel2, #14171C)',
              border: `2px solid ${i === 0 ? DINGLEBERRY_COLOR : 'var(--border-bright, #2A3138)'}`,
            }}
          />
          {i < 4 && <span className="flex-1" style={{ height: 2, background: 'var(--border, #1F252C)' }} />}
        </div>
      ))}
    </div>
  );
}

/* ============================================================ */
export function ThreatInterceptionPage() {
  const { data } = useDingleberry();
  const [selId, setSelId] = useState<string | null>(null);

  const ShieldCheck = dbIcon('shieldCheck');
  const Sparkle = dbIcon('sparkle');
  const Check = dbIcon('check');
  const Scale = dbIcon('scale');

  if (!data) {
    return (
      <div className="mx-auto" style={{ maxWidth: 1320, padding: '22px 26px 40px' }}>
        <DbCard className="p-6 text-text-muted">Loading threats…</DbCard>
      </div>
    );
  }

  const threats = [...(data.threatInterception.threats as unknown as S6Threat[])].sort(
    (a, b) => (SEV_RANK[a.sev] ?? 9) - (SEV_RANK[b.sev] ?? 9),
  );
  const x = threats.find((t) => t.id === selId) ?? threats[0] ?? null;
  const crit = threats.filter((t) => t.sev === 'critical').length;
  const protectedN = threats.reduce((acc, t) => acc + t.affected, 0);

  const headerStats: [string, string, string][] = [
    ['Intercepted · 24h', String(threats.length), TONE.critical.c],
    ['Members protected', protectedN.toLocaleString(), TONE.secure.c],
    ['Critical open', String(crit), TONE.critical.c],
  ];

  return (
    <div className="mx-auto" style={{ maxWidth: 1320, padding: '22px 26px 40px' }}>
      {/* header */}
      <DbCard className="mb-[18px] p-5">
        <div className="flex flex-wrap items-start gap-[18px]">
          <div className="flex flex-none items-center justify-center rounded-md" style={{ width: 46, height: 46, background: TONE.critical.tint, color: TONE.critical.c }}>
            <ShieldCheck size={24} />
          </div>
          <div className="min-w-[280px] flex-1">
            <Eyebrow>Surface 06 · perimeter defense</Eyebrow>
            <h1 className="font-serif font-bold text-text" style={{ fontSize: 30, lineHeight: 1.05, margin: '3px 0 4px' }}>
              Threat interception
            </h1>
            <div className="text-text-silver" style={{ fontSize: 14.5, maxWidth: 560 }}>
              Malware, spyware and surveillance — caught at the perimeter, traced to source, and routed to collective
              action.
            </div>
          </div>
          <div className="flex flex-wrap gap-[10px]">
            {headerStats.map(([cap, n, c]) => (
              <div key={cap} className="rounded-md border border-border bg-bg-elevated" style={{ padding: '10px 14px', minWidth: 96 }}>
                <div className="mb-1 font-mono uppercase text-text-muted" style={{ fontSize: 9.5, letterSpacing: '0.08em' }}>
                  {cap}
                </div>
                <div className="font-serif font-bold" style={{ fontSize: 24, lineHeight: 1, color: c }}>
                  {n}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DbCard>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* threat list */}
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-[10px]">
            <Eyebrow>Intercepted threats — worst-first</Eyebrow>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="flex flex-col gap-[9px]">
            {threats.map((t) => (
              <ThreatRow key={t.id} x={t} active={!!x && t.id === x.id} onClick={() => setSelId(t.id)} />
            ))}
          </div>
        </div>

        {/* detail */}
        {x && (
          <div className="flex flex-col gap-4 self-start lg:sticky lg:top-4">
            <DbCard className="p-5">
              <div className="mb-[10px] flex flex-wrap items-center gap-[9px]">
                <span
                  className={x.sev === 'critical' ? 'animate-pulse' : ''}
                  style={{ width: 11, height: 11, borderRadius: 99, background: TONE[toneOf(x.sev)].c }}
                />
                <KindChip kind={x.kind} />
                <StatusBadge status={x.status} />
                <span className="flex-1" />
                <span className="font-mono text-text-muted" style={{ fontSize: 11 }}>
                  {x.id}
                </span>
              </div>
              <h2 className="font-serif font-bold text-text" style={{ fontSize: 20, lineHeight: 1.12, margin: '0 0 10px' }}>
                {x.name}
              </h2>

              <div className="mb-[14px] flex flex-col gap-[9px]">
                {([['Target', x.target], ['Origin', x.origin]] as [string, string][]).map(([label, val]) => (
                  <div key={label} className="flex gap-[10px]">
                    <span className="flex-none pt-[2px]">
                      <Eyebrow>
                        <span style={{ width: 58, display: 'inline-block' }}>{label}</span>
                      </Eyebrow>
                    </span>
                    <span className="text-text-silver" style={{ fontSize: 13 }}>
                      {val}
                    </span>
                  </div>
                ))}
              </div>

              {/* Atlas Oracle plain-language — red identity gradient (was gold) */}
              <div
                className="mb-3 flex gap-[11px] rounded-md"
                style={{ padding: '12px 13px', background: 'var(--bg-elevated, #0C0E12)', border: '1px solid var(--border, #1F252C)' }}
              >
                <div
                  className="flex flex-none items-center justify-center rounded-md"
                  style={{ width: 30, height: 30, background: `linear-gradient(135deg, ${DINGLEBERRY_COLOR}, #7F1D1D)` }}
                >
                  <Sparkle size={15} style={{ color: '#fff' }} />
                </div>
                <div>
                  <div className="mb-[3px] font-mono uppercase" style={{ fontSize: 9, letterSpacing: '0.1em', color: DATA_BLUE }}>
                    Atlas Oracle · what it is
                  </div>
                  <div className="text-text-silver" style={{ fontSize: 12.5, lineHeight: 1.4 }}>
                    {x.plain}
                  </div>
                </div>
              </div>

              {/* recommended fix */}
              <div className="mb-[14px] rounded-md" style={{ padding: '11px 13px', background: TONE.secure.tint, border: `1px solid ${TONE.secure.border}` }}>
                <div className="mb-[5px] flex items-center gap-[7px]">
                  <Check size={14} style={{ color: TONE.secure.c }} />
                  <span className="font-bold" style={{ fontSize: 12.5, color: TONE.secure.c }}>
                    Recommended fix
                  </span>
                </div>
                <div className="mb-[9px] text-text-silver" style={{ fontSize: 12.5, lineHeight: 1.35 }}>
                  {x.fix}
                </div>
                <div style={{ maxWidth: 220 }}>
                  <ActionButton variant="primary" icon="sparkle">
                    Apply with Atlas Oracle
                  </ActionButton>
                </div>
              </div>

              {/* blast radius */}
              {x.affected > 0 && (
                <div>
                  <Eyebrow className="mb-2">Blast radius</Eyebrow>
                  <div className="flex items-center gap-3">
                    <Dots names={x.sample} n={x.affected} />
                    <span className="font-serif font-bold" style={{ fontSize: 20, lineHeight: 1, color: TONE.critical.c }}>
                      {x.affected.toLocaleString()}
                    </span>
                    <span className="text-text-muted" style={{ fontSize: 12 }}>
                      members hit by the same payload
                    </span>
                  </div>
                </div>
              )}
              <div className="mt-3">
                <ActionCaption />
              </div>
            </DbCard>

            {/* Justice on-ramp — red identity (was gold) */}
            {x.justice && (
              <DbCard className="p-5" style={{ borderTop: `3px solid ${DINGLEBERRY_COLOR}` }}>
                <div className="mb-[9px] flex items-center gap-[9px]">
                  <Scale size={18} style={{ color: DINGLEBERRY_COLOR }} />
                  <span className="font-serif font-bold text-text" style={{ fontSize: 17 }}>
                    This is bigger than one member
                  </span>
                </div>
                <div className="mb-3 text-text-silver" style={{ fontSize: 13, lineHeight: 1.4 }}>
                  <b>{x.affected.toLocaleString()} members</b> were hit by the same payload from the same source.
                  DingleBERRY found it — <b>Justice</b> is where you act on it together. It enters as a Manual Group at the
                  first rung:
                </div>
                <div className="mb-3 rounded-md border border-border bg-bg-elevated" style={{ padding: '12px 10px' }}>
                  <EscalationLadder />
                </div>
                <ActionButton variant="danger" icon="scale">
                  Form a Manual Group in Justice
                </ActionButton>
                <div className="mt-2 text-center font-mono text-text-muted" style={{ fontSize: 10.5 }}>
                  DingleBERRY = detector + on-ramp · Justice = the venue
                </div>
                <div className="mt-2">
                  <ActionCaption />
                </div>
              </DbCard>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
