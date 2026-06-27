/* DingleBERRY — Surface 01 · Platform & Infra Health (drill-in).
   ------------------------------------------------------------
   Up / degraded / down across the whole comb — one read. A posture-aware
   service grid (Spine · Astras · mesh muscle) + per-service detail. This is the
   DEEP infra view at /dingleberry/infra — distinct from the Slice-A Command
   Center overview (it never duplicates it). Ported from the artifact's S01
   screen and re-skinned to the Slice-A..D conventions. STEP-2: fed by
   useDingleberry()/contract — never touches Supabase (Phase-2 mesh is unbuilt;
   that's why STATE/WORSE below are baked demo content, not live).

   Posture-aware COLORING only — every service always renders; posture recolors
   tiles up/degraded/down (no service is ever gated away). Action controls are
   inert + captioned. */
import { useState } from 'react';
import { dbIcon } from '@/components/dingleberry/icons';
import { ActionButton, ActionCaption, DbCard, Eyebrow, StatusPill } from '@/components/dingleberry/primitives';
import { STATUS_BLUE, TONE } from '@/components/dingleberry/tone';
import type { Posture, Tone } from '@/lib/dingleberry/contract';
import { useDingleberry } from './DingleberryLayout';

/* contract/runtime mismatch: the contract types infraHealth.services as
   ServiceRow[] (objects), but the mock ships TUPLES [name,group,metricLabel,
   value,backend]. Cast to the tuple shape locally; Step-3 should reconcile the
   contract with whatever the live infra source returns. STATE (which services
   degrade per posture) + WORSE (their degraded values) are baked demo content —
   not in the snapshot. */
type ServiceTuple = readonly [name: string, group: string, metricLabel: string, value: string, backend: string];

const DOMAINS = ['Spine', 'Astras', 'Mesh muscle'];
const STATE: Record<Posture, { warn: number[]; crit: number[] }> = {
  secure: { warn: [], crit: [] },
  degraded: { warn: [6, 14, 16], crit: [] },
  critical: { warn: [6, 16, 5], crit: [3, 14] },
};
const WORSE: Record<number, string> = { 6: '198', 14: '1.9%', 16: '97%', 5: 'HELD', 3: '38s' };

const STATUS_LABEL: Record<Tone, string> = { secure: 'Up', watch: 'Degraded', critical: 'Down', info: 'Info', idle: 'Idle' };

/* deterministic mini sparkline (tile) */
function Spark({ seed, tone }: { seed: number; tone: Tone }) {
  const w = 240;
  const h = 22;
  let s = (seed * 2654435761) % 2147483647;
  // biome-ignore lint/suspicious/noAssignInExpressions: verbatim deterministic LCG from the artifact — the in-expression assignment IS the generator step
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const n = 20;
  let y = h / 2;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const amp = tone === 'critical' ? 8 : tone === 'watch' ? 5 : 2.8;
    y += (rnd() - 0.5) * amp;
    if (tone === 'critical' && i > 13) y += 1.2;
    y = Math.max(3, Math.min(h - 3, y));
    pts.push(`${((i / (n - 1)) * w).toFixed(1)},${y.toFixed(1)}`);
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="trend" preserveAspectRatio="none" style={{ width: '100%', height: h, display: 'block' }}>
      <polyline points={pts.join(' ')} fill="none" stroke={TONE[tone].c} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

/* deterministic area graph (detail) with threshold line */
function BigGraph({ seed, tone }: { seed: number; tone: Tone }) {
  const w = 560;
  const h = 120;
  let s = (seed * 2654435761) % 2147483647;
  // biome-ignore lint/suspicious/noAssignInExpressions: verbatim deterministic LCG from the artifact — the in-expression assignment IS the generator step
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const n = 56;
  let y = 72;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const amp = i > 36 && tone !== 'secure' ? (tone === 'critical' ? 15 : 8) : 4;
    y += (rnd() - 0.5) * amp;
    if (tone === 'critical' && i > 38) y -= 2;
    y = Math.max(8, Math.min(h - 8, y));
    pts.push(`${((i / (n - 1)) * w).toFixed(1)},${y.toFixed(1)}`);
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="service trend" preserveAspectRatio="none" style={{ width: '100%', height: 120, display: 'block' }}>
      <polygon points={`0,${h} ${pts.join(' ')} ${w},${h}`} fill={TONE[tone].c} opacity="0.08" />
      <polyline points={pts.join(' ')} fill="none" stroke={TONE[tone].c} strokeWidth="2.2" strokeLinejoin="round" />
      {tone !== 'secure' && (
        <line x1="0" y1="36" x2={w} y2="36" stroke={TONE.critical.c} strokeWidth="1.3" strokeDasharray="5 5" opacity="0.55" />
      )}
    </svg>
  );
}

function Tile({
  svc,
  idx,
  st,
  val,
  active,
  onClick,
}: {
  svc: ServiceTuple;
  idx: number;
  st: Tone;
  val: string;
  active: boolean;
  onClick: () => void;
}) {
  const k = TONE[st];
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-[7px] rounded-md text-left transition-colors"
      style={{
        padding: '10px 11px',
        border: active ? '1.5px solid #DC2626' : '1px solid var(--border, #1F252C)',
        borderTop: `3px solid ${k.c}`,
        background: active ? 'rgba(220,38,38,0.08)' : st === 'critical' ? k.tint : 'var(--bg-panel, #0F1217)',
      }}
    >
      <div className="flex items-center gap-[7px]">
        <span
          className={st === 'critical' ? 'animate-pulse' : ''}
          style={{ width: 9, height: 9, flex: 'none', borderRadius: 99, background: k.c }}
        />
        <span className="truncate font-mono font-bold text-text" style={{ fontSize: 12.5 }}>
          {svc[0]}
        </span>
      </div>
      <Spark seed={idx + 5} tone={st} />
      <div className="flex items-baseline justify-between">
        <span className="font-mono uppercase text-text-muted" style={{ fontSize: 9.5, letterSpacing: '0.06em' }}>
          {svc[2]}
        </span>
        <span className="font-mono font-bold" style={{ fontSize: 12.5, color: st === 'secure' ? 'var(--text, #F8F9FA)' : k.c }}>
          {val}
        </span>
      </div>
      <div className="truncate font-mono text-text-muted" style={{ fontSize: 9, letterSpacing: '0.04em' }}>
        {svc[1] === 'Astras' ? `surface · ${svc[4]}` : svc[4]}
      </div>
    </button>
  );
}

/* ============================================================ */
export function InfraHealthPage() {
  const { data, posture } = useDingleberry();

  const Server = dbIcon('server');

  if (!data) {
    return (
      <div className="mx-auto" style={{ maxWidth: 1320, padding: '22px 26px 40px' }}>
        <DbCard className="p-6 text-text-muted">Loading services…</DbCard>
      </div>
    );
  }

  const services = data.infraHealth.services as unknown as readonly ServiceTuple[];

  const stFor = (i: number): 'secure' | 'watch' | 'critical' => {
    const m = STATE[posture];
    return m.crit.includes(i) ? 'critical' : m.warn.includes(i) ? 'watch' : 'secure';
  };
  const valFor = (i: number): string => (stFor(i) === 'secure' ? services[i][3] : (WORSE[i] ?? services[i][3]));

  const counts = services.reduce(
    (acc, _s, i) => {
      acc[stFor(i)] += 1;
      return acc;
    },
    { secure: 0, watch: 0, critical: 0 } as Record<'secure' | 'watch' | 'critical', number>,
  );

  const firstBad = services.findIndex((_s, i) => stFor(i) !== 'secure');
  const fallback = Math.min(6, services.length - 1);
  const [selI, setSelI] = useState<number | null>(null);
  const i = selI != null && selI < services.length ? selI : firstBad >= 0 ? firstBad : fallback;
  const st = stFor(i);
  const k = TONE[st];
  const svc = services[i];

  const uptime = posture === 'critical' ? '97.2%' : posture === 'degraded' ? '99.41%' : '99.98%';
  const headerStats: [string, string, Tone][] = [
    ['Up', String(counts.secure), 'secure'],
    ['Degraded', String(counts.watch), 'watch'],
    ['Down', String(counts.critical), 'critical'],
    ['Uptime · 30d', uptime, posture === 'secure' ? 'secure' : 'watch'],
  ];

  const healthChecks: [string, Tone, string][] = [
    ['/healthz liveness', 'secure', '200 · 12ms'],
    ['/readyz readiness', st === 'critical' ? 'critical' : 'secure', st === 'critical' ? 'timeout' : '200 · 18ms'],
    ['dependency probes', st === 'secure' ? 'secure' : 'watch', st === 'secure' ? 'all green' : '1 slow'],
    ['resource headroom', st === 'critical' ? 'critical' : st === 'watch' ? 'watch' : 'secure', st === 'critical' ? 'exhausted' : 'within bounds'],
  ];

  return (
    <div className="mx-auto" style={{ maxWidth: 1320, padding: '22px 26px 40px' }}>
      {/* header */}
      <DbCard className="mb-[18px] p-5">
        <div className="flex flex-wrap items-start gap-[18px]">
          <div className="flex flex-none items-center justify-center rounded-md" style={{ width: 46, height: 46, background: 'rgba(220,38,38,0.12)', color: '#DC2626' }}>
            <Server size={23} />
          </div>
          <div className="min-w-[280px] flex-1">
            <Eyebrow>Surface 01 · platform &amp; infrastructure</Eyebrow>
            <h1 className="font-serif font-bold text-text" style={{ fontSize: 30, lineHeight: 1.05, margin: '3px 0 4px' }}>
              Platform &amp; infra health
            </h1>
            <div className="text-text-silver" style={{ fontSize: 14.5, maxWidth: 540 }}>
              Up, degraded or down across the comb — <b>Spine</b>, the <b>Astras</b>, and the <b>mesh muscle</b>, in one
              read.
            </div>
          </div>
          <div className="flex flex-wrap gap-[10px]">
            {headerStats.map(([cap, n, tn]) => (
              <div key={cap} className="rounded-md border border-border bg-bg-elevated" style={{ padding: '10px 14px', minWidth: 80 }}>
                <div className="mb-1 font-mono uppercase text-text-muted" style={{ fontSize: 9.5, letterSpacing: '0.08em' }}>
                  {cap}
                </div>
                <div className="font-serif font-bold" style={{ fontSize: 24, lineHeight: 1, color: TONE[tn].c }}>
                  {n}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DbCard>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* service grid grouped by domain */}
        <div className="min-w-0">
          {DOMAINS.map((dom) => (
            <div key={dom} className="mb-4">
              <div className="mb-[9px] flex items-center gap-[10px]">
                <Eyebrow>{dom}</Eyebrow>
                <span className="h-px flex-1 bg-border" />
              </div>
              <div className="grid gap-[10px]" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                {services.map((s, idx) =>
                  s[1] === dom ? (
                    <Tile key={s[0]} svc={s} idx={idx} st={stFor(idx)} val={valFor(idx)} active={idx === i} onClick={() => setSelI(idx)} />
                  ) : null,
                )}
              </div>
            </div>
          ))}
        </div>

        {/* service detail */}
        <div className="flex flex-col gap-4 self-start lg:sticky lg:top-4">
          <DbCard className="p-5">
            <div className="mb-2 flex flex-wrap items-center gap-[9px]">
              <span
                className={st === 'critical' ? 'animate-pulse' : ''}
                style={{ width: 11, height: 11, borderRadius: 99, background: k.c }}
              />
              <StatusPill tone={st}>{STATUS_LABEL[st]}</StatusPill>
              <span className="flex-1" />
              <span className="font-mono text-text-muted" style={{ fontSize: 11 }}>
                {svc[1]}
              </span>
            </div>
            <h2 className="font-serif font-bold text-text" style={{ fontSize: 22, lineHeight: 1.05, margin: '0 0 12px' }}>
              {svc[0]}
            </h2>

            <div className="mb-2 flex justify-between">
              <Eyebrow>{svc[2]} · last 6h</Eyebrow>
              <span className="font-mono font-bold" style={{ fontSize: 12, color: st === 'secure' ? 'var(--text, #F8F9FA)' : k.c }}>
                {valFor(i)}
              </span>
            </div>
            <div className="mb-[14px] rounded-md border border-border" style={{ padding: '6px 6px 0' }}>
              <BigGraph seed={i + 11} tone={st} />
            </div>

            <Eyebrow className="mb-[9px]">Health checks</Eyebrow>
            <div className="mb-[14px] flex flex-col">
              {healthChecks.map(([nm, s2, v], idx) => (
                <div
                  key={nm}
                  className="flex items-center gap-[9px]"
                  style={{ padding: '7px 0', borderBottom: idx < 3 ? '1px dashed var(--border, #1F252C)' : 'none' }}
                >
                  <span style={{ width: 8, height: 8, flex: 'none', borderRadius: 99, background: TONE[s2].c }} />
                  <span className="flex-1 text-text-silver" style={{ fontSize: 13 }}>
                    {nm}
                  </span>
                  <span className="font-mono text-text-muted" style={{ fontSize: 11 }}>
                    {v}
                  </span>
                </div>
              ))}
            </div>

            <Eyebrow className="mb-[9px]">Dependencies</Eyebrow>
            <div className="mb-4 flex flex-wrap gap-2">
              {['Ledger', 'Identity', 'Mesh Relay'].map((dep, idx) => (
                <span
                  key={dep}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border"
                  style={{ padding: '4px 10px', fontSize: 12 }}
                >
                  <span
                    style={{ width: 7, height: 7, borderRadius: 99, background: idx === 0 && st !== 'secure' ? STATUS_BLUE : TONE.secure.c }}
                  />
                  <span className="font-mono text-text-silver">{dep}</span>
                </span>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              {st !== 'secure' ? (
                <>
                  <ActionButton variant="primary" icon="activity">
                    {st === 'critical' ? 'Failover & restart' : 'Drain & investigate'}
                  </ActionButton>
                  <div className="flex gap-2">
                    <ActionButton variant="secondary" icon="sparkle">
                      Ask Atlas Oracle
                    </ActionButton>
                    <ActionButton variant="ghost">Runbook</ActionButton>
                  </div>
                </>
              ) : (
                <div className="flex gap-2">
                  <ActionButton variant="secondary">Metrics</ActionButton>
                  <ActionButton variant="ghost">Runbook</ActionButton>
                </div>
              )}
              <ActionCaption />
            </div>
          </DbCard>
        </div>
      </div>
    </div>
  );
}
