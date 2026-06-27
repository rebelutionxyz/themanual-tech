/* DingleBERRY — Member Mesh (drill-in) · zero-trust oversight.
   ------------------------------------------------------------
   The muscle earns no trust. DingleBERRY scores node health per layer, runs
   proof-of-storage, quarantines offenders and triggers self-heal — the biggest
   Phase-2 job, in depth. Ported from the artifact's MemberMesh screen and
   re-skinned to the Slice-A..E conventions. STEP-2: fed by useDingleberry()/
   contract (MemberMeshData) — never touches Supabase (Phase-2 device-sharing is
   unbuilt; do not fake a backend).

   The node list is posture-independent (the S02 lesson): per-layer nodes,
   worst-first by their own health; posture only recolors the header count. All
   action controls inert + captioned. */
import { useState } from 'react';
import { dbIcon } from '@/components/dingleberry/icons';
import { ActionButton, ActionCaption, DbCard, Eyebrow, StatusPill } from '@/components/dingleberry/primitives';
import { DATA_BLUE, DINGLEBERRY_COLOR, TONE } from '@/components/dingleberry/tone';
import type { MeshLayer, MeshNode, Tone } from '@/lib/dingleberry/contract';
import { useDingleberry } from './DingleberryLayout';

/* the mock relay layer carries goDark beyond the contract MeshLayer; Step-3
   should widen MeshLayer. nodes match MeshNode as-is. */
type MeshLayerX = MeshLayer & { goDark?: boolean };

const STATUS_LABEL: Record<string, string> = { secure: 'Healthy', watch: 'Watch', critical: 'Quarantined' };
const SEV_RANK: Record<string, number> = { critical: 0, watch: 1, secure: 2, info: 3, idle: 4 };

function checksFor(layer: string, n: MeshNode): [string, Tone, string][] {
  const bad = n.st !== 'secure';
  if (layer === 'storage')
    return [
      ['Proof-of-storage challenge', n.st === 'critical' ? 'critical' : n.st, n.st === 'critical' ? '3 / 5 failed' : n.st === 'watch' ? 'slow (1.8s)' : '5 / 5 passed'],
      ['Heartbeat hash-check', n.st === 'critical' ? 'critical' : 'secure', n.st === 'critical' ? 'mismatch' : 'matches'],
      ['Replication factor', 'secure', '3× · replicas healthy'],
      ['Reliability score (90d)', n.st === 'critical' ? 'critical' : n.st, n.st === 'critical' ? '0.41' : n.st === 'watch' ? '0.93' : '0.998'],
    ];
  if (layer === 'relay')
    return [
      ['Drop rate', bad ? 'watch' : 'secure', bad ? '1.9%' : '0.3%'],
      ['p95 latency', bad ? 'watch' : 'secure', bad ? '180ms' : '42ms'],
      ['Routing integrity', 'secure', 'signed · no anomalies'],
      ['Go Dark contribution', bad ? 'watch' : 'secure', bad ? 'flaky — watch' : 'ready'],
    ];
  if (layer === 'cdn')
    return [
      ['Content hash match', bad ? 'watch' : 'secure', bad ? '1 mismatch · quarantined' : '100%'],
      ['Serving honesty', 'secure', 'claims = delivered'],
      ['Bytes served (24h)', 'secure', '2.1 TB'],
    ];
  return [
    ['Sandbox integrity', bad ? 'watch' : 'secure', bad ? '1 escape blocked' : 'intact'],
    ['Job isolation', 'secure', 'seccomp + cgroup'],
    ['Botnet-hijack watch', bad ? 'watch' : 'secure', bad ? 'job killed · flagged' : 'clean'],
    ['Comb impact', 'secure', 'none — results charitable'],
  ];
}

function Heartbeat({ seed, tone }: { seed: number; tone: Tone }) {
  const w = 300;
  const h = 40;
  let s = (seed * 2654435761) % 2147483647;
  // biome-ignore lint/suspicious/noAssignInExpressions: verbatim deterministic LCG from the artifact — the in-expression assignment IS the generator step
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const n = 40;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    let y = h / 2;
    if (i % 7 === 3) y = tone === 'critical' && i > 24 ? h - 4 : 5;
    else y = h / 2 + (rnd() - 0.5) * (tone === 'critical' ? 8 : 3);
    if (tone === 'critical' && i > 27) y += (rnd() - 0.5) * 18;
    y = Math.max(3, Math.min(h - 3, y));
    pts.push(`${((i / (n - 1)) * w).toFixed(1)},${y.toFixed(1)}`);
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="node heartbeat" preserveAspectRatio="none" style={{ width: '100%', height: h, display: 'block' }}>
      <polyline points={pts.join(' ')} fill="none" stroke={TONE[tone].c} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function NodeRow({ n, active, onClick }: { n: MeshNode; active: boolean; onClick: () => void }) {
  const k = TONE[n.st];
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-md text-left transition-colors"
      style={{
        padding: '11px 13px',
        border: active ? `1.5px solid ${DINGLEBERRY_COLOR}` : '1px solid var(--border, #1F252C)',
        borderLeft: `3px solid ${k.c}`,
        background: active ? 'rgba(220,38,38,0.08)' : n.st === 'critical' ? k.tint : 'var(--bg-panel, #0F1217)',
      }}
    >
      <span
        className={n.st === 'critical' ? 'animate-pulse' : ''}
        style={{ width: 9, height: 9, flex: 'none', borderRadius: 99, background: k.c }}
      />
      <div className="min-w-0 flex-1">
        <div className="font-mono font-bold text-text" style={{ fontSize: 13 }}>
          {n.id}
        </div>
        <div className="truncate text-text-muted" style={{ fontSize: 11.5 }}>
          {n.region} · {n.note}
        </div>
      </div>
      <div className="flex-none text-right">
        <div className="font-serif font-bold" style={{ fontSize: 18, lineHeight: 1, color: k.c }}>
          {n.score}
        </div>
        <div className="font-mono uppercase text-text-muted" style={{ fontSize: 9, letterSpacing: '0.06em' }}>
          health
        </div>
      </div>
    </button>
  );
}

/* ============================================================ */
export function MemberMeshPage() {
  const { data, posture } = useDingleberry();
  const [layer, setLayer] = useState('storage');
  const [selId, setSelId] = useState<string | null>(null);

  const Network = dbIcon('network');
  const Activity = dbIcon('activity');
  const Shield = dbIcon('shield');

  if (!data) {
    return (
      <div className="mx-auto" style={{ maxWidth: 1320, padding: '22px 26px 40px' }}>
        <DbCard className="p-6 text-text-muted">Loading mesh…</DbCard>
      </div>
    );
  }

  const layers = data.memberMesh.layers as unknown as MeshLayerX[];
  const nodeMap = data.memberMesh.nodes as Record<string, MeshNode[]>;
  const L = layers.find((l) => l.key === layer) ?? layers[0];
  const list = [...(nodeMap[L.key] ?? [])].sort((a, b) => (SEV_RANK[a.st] ?? 9) - (SEV_RANK[b.st] ?? 9));
  const sel = list.find((n) => n.id === selId) ?? list[0] ?? null;
  const checks = sel ? checksFor(L.key, sel) : [];

  const quar = posture === 'critical' ? 14 : 1;
  const headerStats: [string, string, Tone][] = [
    ['Nodes', '4,182', 'idle'],
    ['Healthy', String(4182 - quar - 3), 'secure'],
    ['Quarantined', String(quar), 'critical'],
  ];

  return (
    <div className="mx-auto" style={{ maxWidth: 1320, padding: '22px 26px 40px' }}>
      {/* header */}
      <DbCard className="mb-[18px] p-5">
        <div className="flex flex-wrap items-start gap-[18px]">
          <div className="flex flex-none items-center justify-center rounded-md" style={{ width: 46, height: 46, background: 'rgba(220,38,38,0.12)', color: '#DC2626' }}>
            <Network size={23} />
          </div>
          <div className="min-w-[280px] flex-1">
            <Eyebrow>Phase 2 · zero-trust muscle oversight</Eyebrow>
            <h1 className="font-serif font-bold text-text" style={{ fontSize: 30, lineHeight: 1.05, margin: '3px 0 4px' }}>
              Member mesh
            </h1>
            <div className="text-text-silver" style={{ fontSize: 14.5, maxWidth: 560 }}>
              The muscle earns no trust. DingleBERRY scores every borrowed node, runs proof-of-storage, and{' '}
              <b>quarantines + self-heals</b> the moment one misbehaves.
            </div>
          </div>
          <div className="flex flex-wrap gap-[10px]">
            {headerStats.map(([cap, n, tn]) => (
              <div key={cap} className="rounded-md border border-border bg-bg-elevated" style={{ padding: '10px 14px', minWidth: 92 }}>
                <div className="mb-1 font-mono uppercase text-text-muted" style={{ fontSize: 9.5, letterSpacing: '0.08em' }}>
                  {cap}
                </div>
                <div className="font-serif font-bold" style={{ fontSize: 22, lineHeight: 1, color: TONE[tn].c }}>
                  {n}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DbCard>

      {/* layer selector */}
      <div className="mb-4 flex flex-wrap gap-[9px]">
        {layers.map((l, idx) => {
          const on = l.key === layer;
          const nodes = nodeMap[l.key] ?? [];
          const worst: Tone = nodes.some((n) => n.st === 'critical') ? 'critical' : nodes.some((n) => n.st === 'watch') ? 'watch' : 'secure';
          const Icon = dbIcon(l.icon);
          return (
            <button
              key={l.key}
              type="button"
              onClick={() => {
                setLayer(l.key);
                setSelId(null);
              }}
              className="flex items-center gap-[9px] rounded-md transition-colors"
              style={{
                padding: '10px 14px',
                border: on ? `1.5px solid ${DINGLEBERRY_COLOR}` : '1px solid var(--border, #1F252C)',
                background: on ? 'var(--bg-panel2, #14171C)' : 'var(--bg-panel, #0F1217)',
                color: on ? 'var(--text, #F8F9FA)' : 'var(--text-silver, #C8D1DA)',
              }}
            >
              <span className="font-mono font-bold" style={{ fontSize: 11, color: on ? DINGLEBERRY_COLOR : 'var(--text-muted, #6B7580)' }}>
                {idx + 1}
              </span>
              <Icon size={16} style={{ color: on ? DINGLEBERRY_COLOR : 'var(--text-muted, #6B7580)' }} />
              <span className="font-bold" style={{ fontSize: 13.5 }}>
                {l.name}
              </span>
              <span
                className={worst === 'critical' ? 'animate-pulse' : ''}
                style={{ width: 8, height: 8, borderRadius: 99, background: TONE[worst].c }}
              />
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* node list */}
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-[10px]">
            <Eyebrow>{L.name} · nodes</Eyebrow>
            <span className="font-mono text-text-muted" style={{ fontSize: 11 }}>
              watches: {L.watch}
            </span>
            {L.goDark && (
              <span
                className="rounded-full font-mono font-bold uppercase"
                style={{ fontSize: 9, letterSpacing: '0.06em', padding: '1px 8px', color: TONE.watch.c, background: TONE.watch.tint, border: `1px solid ${TONE.watch.border}` }}
              >
                → Go Dark
              </span>
            )}
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="flex flex-col gap-[9px]">
            {list.map((n) => (
              <NodeRow key={n.id} n={n} active={!!sel && n.id === sel.id} onClick={() => setSelId(n.id)} />
            ))}
          </div>
        </div>

        {/* node detail */}
        {sel && (
          <div className="flex flex-col gap-4 self-start lg:sticky lg:top-4">
            <DbCard className="p-5">
              <div className="mb-[14px] flex items-center gap-[13px]">
                <div
                  className="flex flex-none flex-col items-center justify-center rounded-full"
                  style={{ width: 56, height: 56, border: `2.5px solid ${TONE[sel.st].c}`, background: TONE[sel.st].tint, lineHeight: 1 }}
                >
                  <span className="font-serif font-bold" style={{ fontSize: 21, color: TONE[sel.st].c }}>
                    {sel.score}
                  </span>
                  <span className="font-mono uppercase text-text-muted" style={{ fontSize: 7, letterSpacing: '0.06em', marginTop: 1 }}>
                    health
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-mono font-bold text-text" style={{ fontSize: 14 }}>
                    {sel.id}
                  </div>
                  <div className="mb-[5px] text-text-muted" style={{ fontSize: 12 }}>
                    {L.name} · {sel.region}
                  </div>
                  <StatusPill tone={sel.st}>{STATUS_LABEL[sel.st] ?? sel.st}</StatusPill>
                </div>
              </div>

              <div className="mb-[6px] flex justify-between">
                <Eyebrow>Heartbeat · 40 beats</Eyebrow>
                <span className="font-mono font-bold" style={{ fontSize: 11, color: TONE[sel.st].c }}>
                  {sel.st === 'critical' ? 'irregular' : sel.st === 'watch' ? 'jittery' : 'steady'}
                </span>
              </div>
              <div className="mb-[14px] rounded-md border border-border" style={{ padding: '8px 8px 4px' }}>
                <Heartbeat seed={sel.id.length * 7 + sel.score} tone={sel.st} />
              </div>

              <Eyebrow className="mb-[9px]">Oversight checks</Eyebrow>
              <div className="mb-[14px] flex flex-col">
                {checks.map(([nm, s2, v], idx) => (
                  <div
                    key={nm}
                    className="flex items-center gap-[9px]"
                    style={{ padding: '8px 0', borderBottom: idx < checks.length - 1 ? '1px dashed var(--border, #1F252C)' : 'none' }}
                  >
                    <span style={{ width: 8, height: 8, flex: 'none', borderRadius: 99, background: TONE[s2].c }} />
                    <span className="flex-1 text-text-silver" style={{ fontSize: 13 }}>
                      {nm}
                    </span>
                    <span className="font-mono font-semibold" style={{ fontSize: 11.5, color: s2 === 'secure' ? 'var(--text-muted, #6B7580)' : TONE[s2].c }}>
                      {v}
                    </span>
                  </div>
                ))}
              </div>

              {sel.st === 'critical' ? (
                <>
                  <div
                    className="mb-[13px] flex items-start gap-[9px] rounded-md"
                    style={{ padding: '11px 13px', background: 'rgba(59,130,246,0.12)', border: `1px solid ${TONE.info.border}` }}
                  >
                    <Activity size={15} style={{ color: DATA_BLUE, flex: 'none', marginTop: 1 }} />
                    <span className="text-text-silver" style={{ fontSize: 12.5, lineHeight: 1.35 }}>
                      <b>Self-heal running.</b> Quarantined and rebuilding its shards onto a fresh device from the 3×
                      replicas. Nothing lost.
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <ActionButton variant="primary" icon="activity">
                      Rebuild onto fresh device
                    </ActionButton>
                    <div className="flex gap-2">
                      <ActionButton variant="secondary">Inspect shards</ActionButton>
                      <ActionButton variant="danger" icon="ban">
                        Evict node
                      </ActionButton>
                    </div>
                    <ActionCaption />
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  {sel.st === 'watch' && (
                    <ActionButton variant="primary" icon="activity">
                      Drain &amp; re-verify
                    </ActionButton>
                  )}
                  <div className="flex gap-2">
                    <ActionButton variant="secondary">View attestations</ActionButton>
                    <ActionButton variant="ghost" icon="sparkle">
                      Ask Atlas Oracle
                    </ActionButton>
                  </div>
                  <ActionCaption />
                </div>
              )}
            </DbCard>

            <div
              className="flex items-center gap-2 rounded-md border border-border bg-bg-elevated"
              style={{ padding: '11px 13px' }}
            >
              <Shield size={15} style={{ color: DATA_BLUE, flex: 'none' }} />
              <span className="text-text-silver" style={{ fontSize: 12, lineHeight: 1.35 }}>
                <b>Zero-trust:</b> a node’s score never buys it trust — every piece is re-verified, every beat
                re-checked.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
