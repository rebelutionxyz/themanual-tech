import { dbIcon } from '@/components/dingleberry/icons';
import { ActionButton, ActionCaption, DbCard, Eyebrow } from '@/components/dingleberry/primitives';
import { DATA_BLUE, DINGLEBERRY_COLOR, TONE } from '@/components/dingleberry/tone';
import type { DarkEpisode, GoDarkState, Tone } from '@/lib/dingleberry/contract';
/* DingleBERRY — Go Dark monitor (drill-in) · the blackout protocol surface.
   ------------------------------------------------------------
   Go Dark = "alive, not transacting." When the spine (central coordination +
   the BLiNG! ledger) goes unreachable, the member mesh keeps serving, every
   ledger-touching write becomes a queued intent, and on the spine's return the
   queue reconciles EXACTLY ONCE. Canon §6.6.5. DingleBERRY owns the protocol;
   the dangerous moment is reconnection (the drain).

   FRESH DESIGN — no artifact screen exists for Go Dark; this is built from
   §6.6.5, not ported. STEP-2: fed by useDingleberry()/contract (GoDarkData) —
   never touches Supabase (Phase-2 spine + mesh telemetry is unbuilt; do not fake
   a backend).

   The six panels per spec §6:
     (1) state header — Secure→Degraded→Dark→Reconciling machine, current lit;
         depth (Brownout/Blackout) · entry mode · time-in-state
     (2) spine heartbeat — trace + missed-beat counters vs N/T + gossip consensus
     (3) queue — global intent depth, per-type breakdown, oldest-intent age,
         replication health
     (4) reconcile console — idle summary at Secure; live drain (progress,
         applied/rejected, rejection reasons, integrity status, DROPS) when dark
     (5) dark history — episodes → expandable attested post-mortems
     (6) commanded Go Dark — the highest-ceremony control on the platform, inert

   POSTURE RECOLORS, NEVER HIDES. All six panels render at every posture; the
   live-telemetry slice is selected by posture (secure→Secure, degraded→Degraded,
   critical→Dark). No `posture === …` gates any panel's existence. */
import { useState } from 'react';
import { useDingleberry } from './DingleberryLayout';

/* the state machine, in canon order — current node lit by live.state */
const MACHINE: { key: GoDarkState; label: string; tone: Tone }[] = [
  { key: 'secure', label: 'Secure', tone: 'secure' },
  { key: 'degraded', label: 'Degraded', tone: 'watch' },
  { key: 'dark', label: 'Dark', tone: 'critical' },
  { key: 'reconciling', label: 'Reconciling', tone: 'info' },
];

const DEPTH_LABEL: Record<string, string> = { brownout: 'Brownout', blackout: 'Blackout' };
const ENTRY_LABEL: Record<string, string> = {
  derived: 'Derived (suffered)',
  commanded: 'Commanded',
};

/* deterministic spine trace — flat beats when reachable, flatlining when gone.
   Verbatim LCG style from the repo (MemberMesh.Heartbeat). */
function SpineTrace({ seed, tone, dead }: { seed: number; tone: Tone; dead: boolean }) {
  const w = 520;
  const h = 46;
  let s = (seed * 2654435761) % 2147483647;
  // biome-ignore lint/suspicious/noAssignInExpressions: verbatim deterministic LCG — the in-expression assignment IS the generator step
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const n = 60;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    let y = h / 2;
    const beating = !dead || i < n * 0.55; // tail flatlines once the spine is gone
    if (beating && i % 6 === 2) y = 5;
    else if (beating)
      y = h / 2 + (rnd() - 0.5) * (tone === 'critical' ? 7 : tone === 'watch' ? 4 : 2);
    else y = h / 2 + (rnd() - 0.5) * 0.6; // flat
    y = Math.max(3, Math.min(h - 3, y));
    pts.push(`${((i / (n - 1)) * w).toFixed(1)},${y.toFixed(1)}`);
  }
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label="spine heartbeat"
      preserveAspectRatio="none"
      style={{ width: '100%', height: h, display: 'block' }}
    >
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={TONE[tone].c}
        strokeWidth="1.7"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.92"
      />
    </svg>
  );
}

/* small labelled stat block, tone-colored */
function Stat({ cap, val, tone = 'idle' }: { cap: string; val: string; tone?: Tone }) {
  return (
    <div
      className="rounded-md border border-border bg-bg-elevated"
      style={{ padding: '10px 14px', minWidth: 104 }}
    >
      <div
        className="mb-1 font-mono uppercase text-text-muted"
        style={{ fontSize: 9.5, letterSpacing: '0.08em' }}
      >
        {cap}
      </div>
      <div
        className="font-serif font-bold"
        style={{ fontSize: 20, lineHeight: 1, color: TONE[tone].c }}
      >
        {val}
      </div>
    </div>
  );
}

/* ============================================================ */
export function GoDarkMonitorPage() {
  const { data, posture } = useDingleberry();
  const [openEp, setOpenEp] = useState<string | null>(null);

  const WifiOff = dbIcon('wifiOff');
  const Activity = dbIcon('activity');
  const Server = dbIcon('server');
  const ShieldCheck = dbIcon('shieldCheck');
  const Lock = dbIcon('lock');
  const Clock = dbIcon('clock');
  const ChevronDown = dbIcon('chevronDown');
  const ChevronRight = dbIcon('chevronRight');
  const AlertTriangle = dbIcon('alertTriangle');

  if (!data) {
    return (
      <div className="mx-auto" style={{ maxWidth: 1320, padding: '22px 26px 40px' }}>
        <DbCard className="p-6 text-text-muted">Loading Go Dark monitor…</DbCard>
      </div>
    );
  }

  const { episodes, ceremony } = data.goDark;
  const live = data.goDark.byPosture[posture];
  const cur = MACHINE.find((m) => m.key === live.state) ?? MACHINE[0];
  const curTone = cur.tone;
  const hb = live.heartbeat;
  const q = live.queue;
  const rc = live.reconcile;
  const dark = live.state === 'dark' || live.state === 'reconciling';
  const qMax = Math.max(1, ...q.byType.map((t) => t.count));

  return (
    <div className="mx-auto" style={{ maxWidth: 1320, padding: '22px 26px 40px' }}>
      {/* ---- identity header ---- */}
      <DbCard className="mb-[18px] p-5">
        <div className="flex flex-wrap items-start gap-[18px]">
          <div
            className="flex flex-none items-center justify-center rounded-md"
            style={{
              width: 46,
              height: 46,
              background: 'rgba(220,38,38,0.12)',
              color: DINGLEBERRY_COLOR,
            }}
          >
            <WifiOff size={23} />
          </div>
          <div className="min-w-[280px] flex-1">
            <Eyebrow>The blackout protocol · §6.6.5</Eyebrow>
            <h1
              className="font-serif font-bold text-text"
              style={{ fontSize: 30, lineHeight: 1.05, margin: '3px 0 4px' }}
            >
              Go Dark monitor
            </h1>
            <div className="text-text-silver" style={{ fontSize: 14.5, maxWidth: 600 }}>
              <b>Alive, not transacting.</b> When the spine goes unreachable the mesh keeps serving
              and every ledger-touching write becomes a <b>queued intent</b>. On the spine’s return
              the queue reconciles <b>exactly once</b> — fast to get dark, slow to get bright.
            </div>
          </div>
        </div>
      </DbCard>

      {/* =========================================================
          PANEL 1 — STATE MACHINE HEADER
          ========================================================= */}
      <DbCard className="mb-4 p-5" style={{ borderTop: `3px solid ${TONE[curTone].c}` }}>
        <div className="mb-[14px] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-[9px]">
            <Activity size={17} style={{ color: DINGLEBERRY_COLOR }} />
            <Eyebrow>Protocol state</Eyebrow>
          </div>
          <div className="flex flex-wrap items-center gap-[9px]">
            <Stat
              cap="Depth"
              val={live.depth ? DEPTH_LABEL[live.depth] : '—'}
              tone={live.depth ? curTone : 'idle'}
            />
            <Stat
              cap="Entry"
              val={live.entryMode ? ENTRY_LABEL[live.entryMode] : '—'}
              tone={live.entryMode ? 'watch' : 'idle'}
            />
            <Stat
              cap="Time in state"
              val={live.timeInState}
              tone={live.timeInState === '—' ? 'idle' : curTone}
            />
          </div>
        </div>

        {/* the live machine — Secure → Degraded → Dark → Reconciling */}
        <div className="flex flex-wrap items-center gap-2">
          {MACHINE.map((m, idx) => {
            const lit = m.key === live.state;
            const k = TONE[m.tone];
            return (
              <div key={m.key} className="flex items-center gap-2">
                <div
                  className={lit && m.key === 'dark' ? 'animate-pulse' : ''}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 15px',
                    borderRadius: 8,
                    border: lit ? `1.5px solid ${k.c}` : '1px solid var(--border, #1F252C)',
                    background: lit ? k.tint : 'var(--bg-panel, #0F1217)',
                  }}
                >
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      flex: 'none',
                      borderRadius: 99,
                      background: lit ? k.c : 'var(--text-muted, #6B7580)',
                    }}
                  />
                  <span
                    className="font-serif font-bold"
                    style={{ fontSize: 15, color: lit ? k.c : 'var(--text-muted, #6B7580)' }}
                  >
                    {m.label}
                  </span>
                  {lit && (
                    <span
                      className="font-mono uppercase"
                      style={{ fontSize: 8.5, letterSpacing: '0.07em', color: k.c, opacity: 0.85 }}
                    >
                      ● live
                    </span>
                  )}
                </div>
                {idx < MACHINE.length - 1 && <ChevronRight size={16} className="text-text-muted" />}
              </div>
            );
          })}
          <span className="ml-auto font-mono text-text-muted" style={{ fontSize: 10.5 }}>
            asymmetric · fast to dark (safety) · slow to bright (integrity)
          </span>
        </div>
      </DbCard>

      {/* =========================================================
          PANELS 2 + 3 — HEARTBEAT  ·  QUEUE
          ========================================================= */}
      <div className="mb-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {/* PANEL 2 — spine heartbeat + gossip consensus */}
        <DbCard className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-[9px]">
              <Activity
                size={16}
                style={{ color: hb.spineReachable ? DATA_BLUE : DINGLEBERRY_COLOR }}
              />
              <Eyebrow>Spine heartbeat</Eyebrow>
            </div>
            <span
              className={!hb.spineReachable ? 'animate-pulse' : ''}
              style={{
                fontSize: 11,
                fontWeight: 700,
                fontFamily: 'monospace',
                color: hb.spineReachable ? TONE.secure.c : TONE.critical.c,
              }}
            >
              {hb.spineReachable ? 'spine reachable' : 'spine unreachable'}
            </span>
          </div>

          <div
            className="mb-[13px] rounded-md border border-border"
            style={{ padding: '8px 10px 4px' }}
          >
            <SpineTrace
              seed={hb.consensusPct + hb.missedBeats * 13 + 7}
              tone={curTone}
              dead={!hb.spineReachable}
            />
          </div>

          {/* missed-beat counter vs N/T */}
          <div
            className="mb-[11px] flex items-center gap-3 rounded-md border border-border bg-bg-elevated"
            style={{ padding: '11px 13px' }}
          >
            <div className="flex-1">
              <div
                className="font-mono uppercase text-text-muted"
                style={{ fontSize: 9.5, letterSpacing: '0.08em' }}
              >
                Missed beats
              </div>
              <div
                className="font-serif font-bold"
                style={{
                  fontSize: 22,
                  lineHeight: 1.1,
                  color:
                    hb.missedBeats >= hb.threshold
                      ? TONE.critical.c
                      : hb.missedBeats > 0
                        ? TONE.watch.c
                        : TONE.secure.c,
                }}
              >
                {hb.missedBeats}{' '}
                <span className="text-text-muted" style={{ fontSize: 13 }}>
                  / {hb.threshold}
                </span>
              </div>
            </div>
            <div
              className="text-right font-mono text-text-muted"
              style={{ fontSize: 11, lineHeight: 1.5 }}
            >
              N = {hb.threshold} beats
              <br />T = {hb.windowSec}s window
              <br />
              beat: <span style={{ color: TONE[curTone].c }}>{hb.beat}</span>
            </div>
          </div>

          {/* gossip consensus */}
          <div
            className="flex items-center gap-[9px] rounded-md"
            style={{
              padding: '11px 13px',
              background: 'rgba(59,130,246,0.10)',
              border: `1px solid ${TONE.info.border}`,
            }}
          >
            <Server size={15} style={{ color: DATA_BLUE, flex: 'none' }} />
            <span className="text-text-silver" style={{ fontSize: 12.5, lineHeight: 1.4 }}>
              <b>Gossip consensus:</b> {hb.consensusNodes.toLocaleString()} nodes ·{' '}
              <span style={{ color: TONE[curTone].c, fontWeight: 700 }}>{hb.consensusPct}%</span>{' '}
              report the spine reachable. Darkness is the emergent aggregate — no center declares
              its own death.
            </span>
          </div>
        </DbCard>

        {/* PANEL 3 — queued-intent backlog */}
        <DbCard className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-[9px]">
              <Server size={16} style={{ color: DATA_BLUE }} />
              <Eyebrow>Queued intents</Eyebrow>
            </div>
            <span className="font-mono text-text-muted" style={{ fontSize: 10.5 }}>
              signed · nonced · replicated
            </span>
          </div>

          <div className="mb-3 flex items-end gap-3">
            <span
              className="font-serif font-bold"
              style={{
                fontSize: 34,
                lineHeight: 1,
                color: q.depth > 0 ? TONE[curTone].c : TONE.secure.c,
              }}
            >
              {q.depth.toLocaleString()}
            </span>
            <span className="text-text-muted" style={{ fontSize: 12.5, paddingBottom: 3 }}>
              {q.depth > 0
                ? 'intents held against last-confirmed balance'
                : 'nothing queued — spine settling live'}
            </span>
          </div>

          {/* per-type breakdown */}
          {q.byType.length > 0 ? (
            <div className="mb-3 flex flex-col gap-[7px]">
              {q.byType.map((t) => (
                <div key={t.type} className="flex items-center gap-[10px]">
                  <span
                    className="w-[150px] flex-none truncate text-text-silver"
                    style={{ fontSize: 12 }}
                  >
                    {t.type}
                  </span>
                  <span className="h-[7px] flex-1 overflow-hidden rounded-full bg-bg-elevated">
                    <span
                      style={{
                        display: 'block',
                        height: '100%',
                        width: `${(t.count / qMax) * 100}%`,
                        background: TONE[curTone].c,
                        opacity: 0.7,
                      }}
                    />
                  </span>
                  <span
                    className="w-[64px] flex-none text-right font-mono text-text-muted"
                    style={{ fontSize: 11.5 }}
                  >
                    {t.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="mb-3 rounded-md border border-border bg-bg-elevated text-text-muted"
              style={{ padding: '12px 13px', fontSize: 12.5 }}
            >
              No queued intents — the ledger is settling live.
            </div>
          )}

          <div className="flex flex-wrap gap-[9px]">
            <Stat
              cap="Oldest intent"
              val={q.oldestIntentAge}
              tone={q.oldestIntentAge === '—' ? 'idle' : curTone}
            />
            <Stat
              cap="Replication"
              val={`${q.replicationFactor}× · ${q.replicationPct}%`}
              tone={q.replicationPct >= 95 ? 'secure' : 'watch'}
            />
          </div>
        </DbCard>
      </div>

      {/* =========================================================
          PANEL 4 — RECONCILE CONSOLE (the drain)
          ========================================================= */}
      <DbCard
        className="mb-4 p-5"
        style={dark ? { borderLeft: `3px solid ${TONE.critical.c}` } : undefined}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-[9px]">
            <ShieldCheck
              size={16}
              style={{ color: rc.mode === 'draining' ? DINGLEBERRY_COLOR : DATA_BLUE }}
            />
            <Eyebrow>Reconcile console · the drain</Eyebrow>
          </div>
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 10,
              letterSpacing: '0.08em',
              color:
                rc.mode === 'idle'
                  ? TONE.secure.c
                  : rc.mode === 'holding'
                    ? TONE.watch.c
                    : TONE.critical.c,
            }}
          >
            {rc.mode === 'idle' ? 'idle' : rc.mode === 'holding' ? 'standing by' : 'draining'}
          </span>
        </div>

        {rc.mode === 'idle' && (
          <div
            className="flex items-start gap-[9px] rounded-md"
            style={{
              padding: '13px 15px',
              background: 'rgba(111,207,143,0.10)',
              border: `1px solid ${TONE.secure.border}`,
            }}
          >
            <ShieldCheck size={16} style={{ color: TONE.secure.c, flex: 'none', marginTop: 1 }} />
            <div className="text-text-silver" style={{ fontSize: 13, lineHeight: 1.45 }}>
              <b>Last reconcile:</b> {rc.lastSummary}.
              <div className="mt-1 font-mono text-text-muted" style={{ fontSize: 11 }}>
                {rc.lastWhen}
              </div>
            </div>
          </div>
        )}

        {rc.mode === 'holding' && (
          <div
            className="flex items-start gap-[9px] rounded-md"
            style={{
              padding: '13px 15px',
              background: 'rgba(96,165,250,0.10)',
              border: `1px solid ${TONE.watch.border}`,
            }}
          >
            <Clock size={16} style={{ color: TONE.watch.c, flex: 'none', marginTop: 1 }} />
            <div className="text-text-silver" style={{ fontSize: 13, lineHeight: 1.45 }}>
              <b>Drain standing by.</b> Spine flaky — intents are accumulating against
              last-confirmed balances; nothing settles until the spine returns. The drain runs at
              priority on reconnect.{' '}
              <span className="font-mono text-text-muted">integrity gate: {rc.integrityCheck}</span>
            </div>
          </div>
        )}

        {rc.mode === 'draining' && (
          <div className="flex flex-col gap-[14px]">
            {/* progress */}
            <div>
              <div
                className="mb-[6px] flex items-center justify-between font-mono"
                style={{ fontSize: 11.5 }}
              >
                <span className="text-text-silver">
                  Draining {q.depth.toLocaleString()} intents · exactly-once
                </span>
                <span style={{ color: DINGLEBERRY_COLOR, fontWeight: 700 }}>{rc.progress}%</span>
              </div>
              <span className="block h-[9px] w-full overflow-hidden rounded-full bg-bg-elevated">
                <span
                  style={{
                    display: 'block',
                    height: '100%',
                    width: `${rc.progress}%`,
                    background: DINGLEBERRY_COLOR,
                  }}
                />
              </span>
            </div>

            {/* applied / rejected / drops */}
            <div className="flex flex-wrap gap-[9px]">
              <Stat cap="Applied" val={rc.applied.toLocaleString()} tone="secure" />
              <Stat cap="Rejected" val={rc.rejected.toLocaleString()} tone="critical" />
              <Stat cap="DROPS settled" val={rc.drops} tone="watch" />
              <Stat
                cap="Integrity gate"
                val={rc.integrityCheck}
                tone={rc.integrityCheck === 'passed' ? 'secure' : 'watch'}
              />
            </div>

            {/* rejection reasons — nothing silent */}
            <div>
              <Eyebrow className="mb-[7px]">Rejections — returned to actor with a reason</Eyebrow>
              <div className="flex flex-col">
                {rc.rejections.map((r, idx) => (
                  <div
                    key={r.reason}
                    className="flex items-center gap-[9px]"
                    style={{
                      padding: '8px 0',
                      borderBottom:
                        idx < rc.rejections.length - 1
                          ? '1px dashed var(--border, #1F252C)'
                          : 'none',
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        flex: 'none',
                        borderRadius: 99,
                        background: TONE.critical.c,
                      }}
                    />
                    <span className="flex-1 text-text-silver" style={{ fontSize: 12.5 }}>
                      {r.reason}
                    </span>
                    <span
                      className="font-mono font-semibold"
                      style={{ fontSize: 11.5, color: TONE.critical.c }}
                    >
                      {r.count.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="flex items-center gap-[9px] rounded-md border border-border bg-bg-elevated"
              style={{ padding: '11px 13px' }}
            >
              <AlertTriangle size={15} style={{ color: DINGLEBERRY_COLOR, flex: 'none' }} />
              <span className="text-text-silver" style={{ fontSize: 12, lineHeight: 1.4 }}>
                <b>Promotion gate:</b> <span className="font-mono">economy_integrity_check()</span>{' '}
                must pass before Reconciling → Secure. The conservation invariant is Go Dark’s exit
                exam.
              </span>
            </div>
          </div>
        )}
      </DbCard>

      {/* =========================================================
          PANEL 5 — DARK HISTORY (attested post-mortems)
          ========================================================= */}
      <DbCard className="mb-4 p-5">
        <div className="mb-3 flex items-center gap-[9px]">
          <Clock size={16} style={{ color: DATA_BLUE }} />
          <Eyebrow>Dark history · attested post-mortems</Eyebrow>
          <span className="h-px flex-1 bg-border" />
          <span className="font-mono text-text-muted" style={{ fontSize: 10.5 }}>
            {episodes.length} episodes
          </span>
        </div>

        <div className="flex flex-col gap-[9px]">
          {episodes.map((ep) => (
            <EpisodeRow
              key={ep.id}
              ep={ep}
              open={openEp === ep.id}
              onToggle={() => setOpenEp(openEp === ep.id ? null : ep.id)}
              ChevronDown={ChevronDown}
              ChevronRight={ChevronRight}
            />
          ))}
        </div>
      </DbCard>

      {/* =========================================================
          PANEL 6 — COMMANDED GO DARK (highest-ceremony control · inert)
          ========================================================= */}
      <DbCard
        className="p-5"
        style={{ border: `2px solid ${TONE.critical.border}`, background: 'rgba(220,38,38,0.06)' }}
      >
        <div className="mb-[14px] flex flex-wrap items-start gap-[14px]">
          <div
            className="flex flex-none items-center justify-center rounded-md"
            style={{
              width: 44,
              height: 44,
              background: 'rgba(220,38,38,0.14)',
              color: DINGLEBERRY_COLOR,
              border: `1px solid ${TONE.critical.border}`,
            }}
          >
            <Lock size={21} />
          </div>
          <div className="min-w-[260px] flex-1">
            <Eyebrow className="mb-[3px]">Highest-ceremony control on the platform</Eyebrow>
            <h2
              className="font-serif font-bold text-text"
              style={{ fontSize: 21, lineHeight: 1.1 }}
            >
              Commanded Go Dark
            </h2>
            <div
              className="mt-1 text-text-silver"
              style={{ fontSize: 13, lineHeight: 1.45, maxWidth: 620 }}
            >
              Keyholders may deliberately darken the platform as a defensive maneuver. This is{' '}
              <b>never a mere button</b> — entry is a Waggle dispatch under a Patchboard master
              switch, discipline-rank + keyholder-gated.
            </div>
          </div>
        </div>

        {/* ceremony gates */}
        <div className="mb-[14px] grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            ['Master switch', ceremony.masterSwitch],
            ['Dispatch', ceremony.dispatch],
            ['Rank gate', ceremony.rankGate],
            ['Keyholder sign-off', ceremony.keyholdersLabel],
          ].map(([cap, val]) => (
            <div
              key={cap}
              className="flex items-center gap-[9px] rounded-md border border-border bg-bg-panel"
              style={{ padding: '10px 13px' }}
            >
              <Lock size={13} style={{ color: DINGLEBERRY_COLOR, flex: 'none' }} />
              <span
                className="font-mono uppercase text-text-muted"
                style={{ fontSize: 9, letterSpacing: '0.07em', width: 92, flex: 'none' }}
              >
                {cap}
              </span>
              <span className="text-text-silver" style={{ fontSize: 12.5 }}>
                {val}
              </span>
            </div>
          ))}
        </div>

        {/* keyholder pips + scenarios */}
        <div className="mb-[14px] flex flex-wrap items-center gap-[14px]">
          <div className="flex items-center gap-2">
            {Array.from({ length: ceremony.keyholdersTotal }).map((_, i) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length decorative pip row, no identity beyond position
                key={i}
                style={{
                  width: 13,
                  height: 13,
                  borderRadius: 99,
                  background:
                    i < ceremony.keyholdersRequired ? 'rgba(220,38,38,0.18)' : 'transparent',
                  border: `1.5px solid ${i < ceremony.keyholdersRequired ? DINGLEBERRY_COLOR : 'var(--border-bright, #2A3138)'}`,
                }}
              />
            ))}
            <span className="ml-1 font-mono text-text-muted" style={{ fontSize: 10.5 }}>
              {ceremony.keyholdersRequired} / {ceremony.keyholdersTotal} required
            </span>
          </div>
          <span className="h-[14px] w-px bg-border" />
          <div className="flex flex-wrap gap-[7px]">
            {ceremony.scenarios.map((sc) => (
              <span
                key={sc}
                className="rounded-full font-mono uppercase"
                style={{
                  fontSize: 9,
                  letterSpacing: '0.05em',
                  padding: '2px 9px',
                  color: DINGLEBERRY_COLOR,
                  background: 'rgba(220,38,38,0.10)',
                  border: `1px solid ${TONE.critical.border}`,
                }}
              >
                {sc}
              </span>
            ))}
          </div>
        </div>

        {/* the inert control */}
        <div className="flex flex-col gap-2" style={{ maxWidth: 360 }}>
          <ActionButton variant="danger" icon="wifiOff">
            Arm commanded Go Dark
          </ActionButton>
          <ActionCaption />
        </div>
      </DbCard>
    </div>
  );
}

/* ---- one dark-history episode row → expandable attested post-mortem ---- */
function EpisodeRow({
  ep,
  open,
  onToggle,
  ChevronDown,
  ChevronRight,
}: {
  ep: DarkEpisode;
  open: boolean;
  onToggle: () => void;
  ChevronDown: ReturnType<typeof dbIcon>;
  ChevronRight: ReturnType<typeof dbIcon>;
}) {
  const depthTone: Tone = ep.depth === 'blackout' ? 'critical' : 'watch';
  const intResult = ep.integrityResult === 'passed' ? 'secure' : 'critical';
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <div
      className="overflow-hidden rounded-md"
      style={{
        border: open ? `1.5px solid ${DINGLEBERRY_COLOR}` : '1px solid var(--border, #1F252C)',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-[11px] text-left transition-colors"
        style={{
          padding: '11px 13px',
          background: open ? 'rgba(220,38,38,0.06)' : 'var(--bg-panel, #0F1217)',
        }}
      >
        <Chevron size={15} className="flex-none text-text-muted" />
        <span className="font-mono font-bold text-text" style={{ fontSize: 12.5, flex: 'none' }}>
          {ep.id}
        </span>
        <span
          className="rounded-full font-mono font-bold uppercase"
          style={{
            fontSize: 8.5,
            letterSpacing: '0.05em',
            padding: '1px 8px',
            color: TONE[depthTone].c,
            background: TONE[depthTone].tint,
            border: `1px solid ${TONE[depthTone].border}`,
            flex: 'none',
          }}
        >
          {DEPTH_LABEL[ep.depth]}
        </span>
        <span
          className="rounded-full font-mono uppercase"
          style={{
            fontSize: 8.5,
            letterSpacing: '0.05em',
            padding: '1px 8px',
            color: ep.entryMode === 'commanded' ? DINGLEBERRY_COLOR : 'var(--text-muted, #6B7580)',
            border: `1px solid ${ep.entryMode === 'commanded' ? TONE.critical.border : 'var(--border, #1F252C)'}`,
            flex: 'none',
          }}
        >
          {ENTRY_LABEL[ep.entryMode]}
        </span>
        <span className="min-w-0 flex-1 truncate text-text-muted" style={{ fontSize: 12 }}>
          {ep.trigger}
        </span>
        <span className="flex-none font-mono text-text-muted" style={{ fontSize: 11 }}>
          {ep.duration}
        </span>
      </button>

      {open && (
        <div className="border-t border-border bg-bg" style={{ padding: '14px 15px' }}>
          <div className="mb-[10px] grid grid-cols-2 gap-[9px] sm:grid-cols-4">
            {[
              ['Queued', ep.queuedIntents.toLocaleString(), 'idle'],
              ['Applied', ep.applied.toLocaleString(), 'secure'],
              ['Rejected', ep.rejected.toLocaleString(), 'critical'],
              ['DROPS paid', ep.dropsPaid, 'watch'],
            ].map(([cap, val, tn]) => (
              <div
                key={cap}
                className="rounded-md border border-border bg-bg-elevated"
                style={{ padding: '9px 12px' }}
              >
                <div
                  className="mb-[2px] font-mono uppercase text-text-muted"
                  style={{ fontSize: 9, letterSpacing: '0.07em' }}
                >
                  {cap}
                </div>
                <div
                  className="font-serif font-bold"
                  style={{ fontSize: 17, lineHeight: 1, color: TONE[tn as Tone].c }}
                >
                  {val}
                </div>
              </div>
            ))}
          </div>

          <dl className="flex flex-col gap-[7px]">
            {[
              ['Onset', ep.onset],
              ['Consensus', ep.consensusOnset],
              ['Rejections', ep.rejectionDetail],
              ['Attestation', ep.attestation],
              ['Notes', ep.notes],
            ].map(([cap, val]) => (
              <div key={cap} className="flex gap-[10px]" style={{ fontSize: 12.5 }}>
                <dt
                  className="flex-none font-mono uppercase text-text-muted"
                  style={{ fontSize: 9.5, letterSpacing: '0.06em', width: 92, paddingTop: 2 }}
                >
                  {cap}
                </dt>
                <dd className="flex-1 text-text-silver" style={{ lineHeight: 1.4 }}>
                  {val}
                </dd>
              </div>
            ))}
          </dl>

          <div
            className="mt-[11px] flex items-center gap-[9px] rounded-md"
            style={{
              padding: '9px 12px',
              background: TONE[intResult].tint,
              border: `1px solid ${TONE[intResult].border}`,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                flex: 'none',
                borderRadius: 99,
                background: TONE[intResult].c,
              }}
            />
            <span
              className="font-mono uppercase"
              style={{ fontSize: 10.5, letterSpacing: '0.06em', color: TONE[intResult].c }}
            >
              economy_integrity_check() · {ep.integrityResult}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
