/* DingleBERRY — Surface 04 · Shill / Abuse Detection (drill-in).
   ------------------------------------------------------------
   Cross-Astra pattern recognition: coordinated inauthentic behavior caught
   across the whole comb, not one Astra at a time. Ported from the artifact's
   ShillDetection screen and re-skinned to the Slice-A/B conventions. STEP-2:
   fed by useDingleberry()/contract (ShillDetectionData) — never touches Supabase
   (live ring aggregation off bee_affiliate_chain is Step 3).

   The ring list, the cluster detail, and the coordination signals are ALL
   posture-independent (the S02 lesson): every ring renders, sorted worst-first
   by its own severity; nothing is gated by secure/degraded/go-dark. */
import { useState } from 'react';
import { dbIcon } from '@/components/dingleberry/icons';
import { ActionButton, ActionCaption, DbCard, Eyebrow } from '@/components/dingleberry/primitives';
import { DINGLEBERRY_COLOR, STATUS_BLUE, TONE } from '@/components/dingleberry/tone';
import type { Tone } from '@/lib/dingleberry/contract';
import { useDingleberry } from './DingleberryLayout';

/* The mock rings carry richer fields than the contract's ShillRing subset
   (target/justice/payout/signals/oracle). They exist at runtime today; Step-3
   should widen ShillRing to match what the ring-aggregation view surfaces. */
interface S4Ring {
  id: string;
  sev: string;
  name: string;
  actors: number;
  sim: number;
  astra: number;
  status: string;
  target: string;
  justice: boolean;
  payout?: boolean;
  signals: [string, number][];
  oracle: string;
}

const SEV_RANK: Record<string, number> = { critical: 0, watch: 1, info: 2, idle: 3, secure: 4 };
const toneOf = (sev: string): Tone =>
  sev === 'critical' || sev === 'watch' || sev === 'info' || sev === 'idle' ? sev : 'secure';

const STATUS_BADGE: Record<string, { tone: Tone; label: string }> = {
  frozen: { tone: 'critical', label: 'Frozen' },
  throttled: { tone: 'critical', label: 'Throttled' },
  flagged: { tone: 'watch', label: 'Flagged' },
  watching: { tone: 'info', label: 'Watching' },
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

/* ---- cluster graph (data viz of the coordinated ring) ---- */
function Cluster({ count, tone, seedBase }: { count: number; tone: Tone; seedBase: number }) {
  const k = TONE[tone];
  const W = 300;
  const H = 230;
  const cx = W / 2;
  const cy = H / 2 - 4;
  const n = Math.min(count, 11);
  let s = (seedBase * 2654435761) % 2147483647;
  // biome-ignore lint/suspicious/noAssignInExpressions: verbatim deterministic LCG from the artifact — the in-expression assignment IS the generator step
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const sats: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + (rnd() - 0.5) * 0.5;
    const rad = 64 + rnd() * 34;
    sats.push({ x: cx + Math.cos(ang) * rad, y: cy + Math.sin(ang) * rad });
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="coordinated ring cluster" style={{ width: '100%', height: 'auto', display: 'block' }}>
      {sats.map((p, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: positional generated cluster node, no stable id; list never reorders
        <line key={`l${i}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={k.c} strokeWidth={1 + rnd() * 1.4} opacity="0.35" />
      ))}
      {sats.map((p, i) =>
        i % 3 === 0 ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: positional generated cluster node, no stable id; list never reorders
          <line key={`r${i}`} x1={p.x} y1={p.y} x2={sats[(i + 1) % n].x} y2={sats[(i + 1) % n].y} stroke={k.c} strokeWidth="1" opacity="0.2" />
        ) : null,
      )}
      {sats.map((p, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: positional generated cluster node, no stable id; list never reorders
        <circle key={`c${i}`} cx={p.x} cy={p.y} r="7" fill={k.tint} stroke={k.c} strokeWidth="2" />
      ))}
      <circle cx={cx} cy={cy} r="14" fill={k.c} />
      <circle cx={cx} cy={cy} r="14" fill="none" stroke={k.c} strokeWidth="3" opacity="0.3">
        <animate attributeName="r" from="14" to="24" dur="1.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.3" to="0" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <text x={cx} y={cy + 3.5} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fontWeight="700" fill="#fff">
        RING
      </text>
    </svg>
  );
}

function RingRow({ r, active, onClick }: { r: S4Ring; active: boolean; onClick: () => void }) {
  const k = TONE[toneOf(r.sev)];
  const Users = dbIcon('users');
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-md text-left transition-colors"
      style={{
        padding: '12px 14px',
        border: active ? `1.5px solid ${DINGLEBERRY_COLOR}` : '1px solid var(--border, #1F252C)',
        borderLeft: `3px solid ${k.c}`,
        background: active ? 'rgba(220,38,38,0.08)' : r.sev === 'critical' ? k.tint : 'var(--bg-panel, #0F1217)',
      }}
    >
      <div className="flex flex-none items-center justify-center rounded-md" style={{ width: 36, height: 36, background: k.tint, color: k.c }}>
        <Users size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-bold text-text" style={{ fontSize: 14 }}>
          {r.name}
        </div>
        <div className="truncate text-text-muted" style={{ fontSize: 11.5 }}>
          {r.actors} actors · {r.astra} Astra · {r.id}
        </div>
      </div>
      <div className="flex flex-none flex-col items-end gap-1 text-right">
        <StatusBadge status={r.status} />
        <span className="font-mono font-bold" style={{ fontSize: 11, color: k.c }}>
          sim {r.sim.toFixed(2)}
        </span>
      </div>
    </button>
  );
}

/* ============================================================ */
export function ShillDetectionPage() {
  const { data } = useDingleberry();
  const [selId, setSelId] = useState<string | null>(null);

  const Users = dbIcon('users');
  const Ban = dbIcon('ban');
  const Sparkle = dbIcon('sparkle');
  const Scale = dbIcon('scale');

  if (!data) {
    return (
      <div className="mx-auto" style={{ maxWidth: 1320, padding: '22px 26px 40px' }}>
        <DbCard className="p-6 text-text-muted">Loading rings…</DbCard>
      </div>
    );
  }

  const rings = [...(data.shillDetection.rings as unknown as S4Ring[])].sort(
    (a, b) => (SEV_RANK[a.sev] ?? 9) - (SEV_RANK[b.sev] ?? 9),
  );
  const r = rings.find((x) => x.id === selId) ?? rings[0] ?? null;
  const crit = rings.filter((x) => x.sev === 'critical').length;
  const totalActors = rings.reduce((acc, x) => acc + x.actors, 0);

  const headerStats: [string, string, string][] = [
    ['Rings flagged', String(rings.length), TONE.watch.c],
    ['Actors clustered', String(totalActors), TONE.idle.c],
    ['Critical', String(crit), TONE.critical.c],
  ];

  return (
    <div className="mx-auto" style={{ maxWidth: 1320, padding: '22px 26px 40px' }}>
      {/* header */}
      <DbCard className="mb-[18px] p-5">
        <div className="flex flex-wrap items-start gap-[18px]">
          <div className="flex flex-none items-center justify-center rounded-md" style={{ width: 46, height: 46, background: 'rgba(220,38,38,0.12)', color: '#DC2626' }}>
            <Users size={23} />
          </div>
          <div className="min-w-[280px] flex-1">
            <Eyebrow>Surface 04 · cross-Astra pattern recognition</Eyebrow>
            <h1 className="font-serif font-bold text-text" style={{ fontSize: 30, lineHeight: 1.05, margin: '3px 0 4px' }}>
              Shill &amp; abuse detection
            </h1>
            <div className="text-text-silver" style={{ fontSize: 14.5, maxWidth: 540 }}>
              Coordinated inauthentic behavior, caught across the whole comb — not one Astra at a time.
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
        {/* ring list */}
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-[10px]">
            <Eyebrow>Detected rings — worst-first</Eyebrow>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="flex flex-col gap-[9px]">
            {rings.map((x) => (
              <RingRow key={x.id} r={x} active={!!r && x.id === r.id} onClick={() => setSelId(x.id)} />
            ))}
          </div>
        </div>

        {/* detail */}
        {r && (
          <div className="flex flex-col gap-4 self-start lg:sticky lg:top-4">
            <DbCard className="p-5">
              <div className="mb-[10px] flex flex-wrap items-center gap-[9px]">
                <span
                  className={r.sev === 'critical' ? 'animate-pulse' : ''}
                  style={{ width: 11, height: 11, borderRadius: 99, background: TONE[toneOf(r.sev)].c }}
                />
                <StatusBadge status={r.status} />
                <span className="flex-1" />
                <span className="font-mono text-text-muted" style={{ fontSize: 11 }}>
                  {r.id}
                </span>
              </div>
              <h2 className="font-serif font-bold text-text" style={{ fontSize: 20, lineHeight: 1.1, margin: '0 0 3px' }}>
                {r.name}
              </h2>
              <div className="mb-2 text-text-silver" style={{ fontSize: 13 }}>
                {r.target}
              </div>

              <div className="mb-2 rounded-md border border-border bg-bg-elevated" style={{ padding: '6px 6px 2px' }}>
                <Cluster count={r.actors} tone={toneOf(r.sev)} seedBase={Number.parseInt(r.id.slice(-4), 10) || 7} />
              </div>
              <div className="mb-[14px] flex justify-between font-mono text-text-muted" style={{ fontSize: 11 }}>
                <span>
                  <b className="text-text">{r.actors}</b> actors
                </span>
                <span>
                  spans <b className="text-text">{r.astra}</b> Astra
                </span>
                <span>
                  similarity <b style={{ color: TONE[toneOf(r.sev)].c }}>{r.sim.toFixed(2)}</b>
                </span>
              </div>

              {r.payout && (
                <div
                  className="mb-[14px] flex items-start gap-[9px] rounded-md"
                  style={{ padding: '10px 12px', background: TONE.critical.tint, border: `1px solid ${TONE.critical.border}` }}
                >
                  <Ban size={15} style={{ color: TONE.critical.c, flex: 'none', marginTop: 1 }} />
                  <span className="text-text-silver" style={{ fontSize: 12.5, lineHeight: 1.35 }}>
                    <b>Frozen upstream of</b> <span className="font-mono font-bold text-text">affiliate_distribute</span> — the
                    pool never frees from the Well for this chain. No standing gate; this freeze <i>is</i> the
                    affiliate-integrity layer.
                  </span>
                </div>
              )}

              <Eyebrow className="mb-[9px]">What linked them</Eyebrow>
              <div className="mb-[14px] flex flex-col gap-2">
                {r.signals.map(([label, v]) => (
                  <div key={label} className="flex items-center gap-[10px]">
                    <span className="min-w-0 flex-1 text-text-silver" style={{ fontSize: 12 }}>
                      {label}
                    </span>
                    <span
                      className="flex-none overflow-hidden rounded-full"
                      style={{ width: 90, height: 6, background: 'var(--bg-panel2, #14171C)' }}
                    >
                      <span
                        className="block h-full"
                        style={{
                          width: `${Math.round(v * 100)}%`,
                          background: v > 0.85 ? DINGLEBERRY_COLOR : v > 0.7 ? STATUS_BLUE : '#8A94A0',
                        }}
                      />
                    </span>
                    <span className="font-mono font-bold tabular-nums text-text" style={{ fontSize: 11, width: 30, textAlign: 'right' }}>
                      {v.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div
                className="mb-[13px] flex gap-[11px] rounded-md"
                style={{ padding: '12px 13px', background: 'var(--bg-elevated, #0C0E12)', border: '1px solid var(--border, #1F252C)' }}
              >
                <div
                  className="flex flex-none items-center justify-center rounded-md"
                  style={{ width: 30, height: 30, background: `linear-gradient(135deg, ${DINGLEBERRY_COLOR}, #7F1D1D)` }}
                >
                  <Sparkle size={15} style={{ color: '#fff' }} />
                </div>
                <div>
                  <div className="mb-[3px] font-mono uppercase" style={{ fontSize: 9, letterSpacing: '0.1em', color: STATUS_BLUE }}>
                    Atlas Oracle · read
                  </div>
                  <div className="text-text-silver" style={{ fontSize: 12.5, lineHeight: 1.4 }}>
                    {r.oracle}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <ActionButton variant="primary" icon={r.status === 'frozen' ? 'ban' : 'activity'}>
                  {r.status === 'frozen' ? 'Keep frozen · block payout' : r.status === 'throttled' ? 'Quarantine the ring' : 'Throttle reach'}
                </ActionButton>
                <div className="flex gap-2">
                  <ActionButton variant="secondary">Inspect {r.status === 'frozen' ? 'chain' : 'actors'}</ActionButton>
                  <ActionButton variant="ghost">{r.status === 'frozen' ? 'Release to payout' : 'Dismiss'}</ActionButton>
                </div>
                <ActionCaption />
              </div>
            </DbCard>

            {r.justice && (
              <DbCard className="p-5" style={{ borderTop: `3px solid ${DINGLEBERRY_COLOR}` }}>
                <div className="mb-2 flex items-center gap-[9px]">
                  <Scale size={17} style={{ color: DINGLEBERRY_COLOR }} />
                  <span className="font-serif font-bold text-text" style={{ fontSize: 16 }}>
                    This targets a named party
                  </span>
                </div>
                <div className="mb-[11px] text-text-silver" style={{ fontSize: 12.5, lineHeight: 1.4 }}>
                  Coordinated abuse aimed at accountability isn’t just moderation — it’s evidence. DingleBERRY can hand the
                  ring, its signals and its timeline to <b>Justice</b> as a Manual Group.
                </div>
                <ActionButton variant="danger" icon="scale">
                  Refer ring to Justice
                </ActionButton>
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
