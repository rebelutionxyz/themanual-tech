/* DingleBERRY — Atlas Oracle (full copilot conversation).
   ------------------------------------------------------------
   The security copilot: explains findings in plain language, ranks fixes,
   ships the one-click ones, and works a cross-surface fix queue. Ported from
   the artifact's AtlasOracle screen and re-skinned to the Slice-A/B/C
   conventions (the gold AO brand → red identity gradient). STEP-2: the fix
   queue is fed by useDingleberry()/contract (AtlasOracleData); the conversation
   + scorecard are shell-baked demo content. Never touches Supabase.

   The fix queue is posture-independent (the S02 lesson) — every item renders;
   the greeting reads the shared posture via a lookup (no `posture ===` gating).
   Copilot fix controls (run rebuild / send / suggestions) are INERT + captioned;
   the fix-queue rows do read-only routing to the relevant surface. */
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { dbIcon } from '@/components/dingleberry/icons';
import { ActionButton, ActionCaption, DbCard, Eyebrow } from '@/components/dingleberry/primitives';
import { DATA_BLUE, DINGLEBERRY_COLOR, STATUS_BLUE, TONE } from '@/components/dingleberry/tone';
import type { OracleQueueItem, Posture } from '@/lib/dingleberry/contract';
import { useDingleberry } from './DingleberryLayout';

/* posture greeting — lookup (not a `posture ===` conditional) */
const SUMMARY: Record<Posture, string> = {
  critical:
    'The spine is down and we are in Go Dark. I have the mesh serving from cache and relaying P2P, quarantined 14 misbehaving nodes, and I am queuing every ledger write for clean reconcile.',
  degraded:
    'The comb is vigilant — 3 flags open, nothing on fire. I auto-resolved 37 overnight. Three need your call; here is the one I would take first.',
  secure:
    'All six surfaces are nominal. I am watching, and I auto-cleared 37 low-risk items overnight. Nothing needs you right now.',
};

/* surface slug → /dingleberry route (read-only navigation from the fix queue) */
const SURFACE_ROUTE: Record<string, string> = {
  threat: '/dingleberry/threat',
  shill: '/dingleberry/shill',
  source: '/dingleberry/source',
  txn: '/dingleberry/txn',
};

/* AO seal — red identity gradient (was gold) */
function AO({ size = 40 }: { size?: number }) {
  return (
    <div
      className="flex flex-none items-center justify-center rounded-md"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${DINGLEBERRY_COLOR}, #7F1D1D)` }}
    >
      <span className="font-serif font-bold text-white" style={{ fontSize: size * 0.4 }}>
        AO
      </span>
    </div>
  );
}

function OracleMsg({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3" style={{ maxWidth: '92%' }}>
      <AO size={36} />
      <div className="border border-border bg-bg-panel" style={{ borderRadius: '4px 14px 14px 14px', padding: '13px 15px' }}>
        <div className="mb-[5px] font-mono uppercase" style={{ fontSize: 9.5, letterSpacing: '0.1em', color: STATUS_BLUE }}>
          Atlas Oracle
        </div>
        <div className="text-text-silver" style={{ fontSize: 14, lineHeight: 1.5 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function UserMsg({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-row-reverse gap-3 self-end" style={{ maxWidth: '88%' }}>
      <div
        className="flex flex-none items-center justify-center rounded-full font-mono font-bold"
        style={{ width: 36, height: 36, border: `2px solid ${DATA_BLUE}`, background: 'rgba(59,130,246,0.12)', fontSize: 12, color: DATA_BLUE }}
      >
        OPS
      </div>
      <div
        className="text-text-silver-bright"
        style={{ borderRadius: '14px 4px 14px 14px', background: 'var(--bg-panel2, #14171C)', border: '1px solid var(--border-bright, #2A3138)', padding: '11px 15px', fontSize: 14, lineHeight: 1.45 }}
      >
        {children}
      </div>
    </div>
  );
}

function FixQueueRow({ q, onOpen }: { q: OracleQueueItem; onOpen: () => void }) {
  const k = TONE[q.tone];
  const ChevronRight = dbIcon('chevronRight');
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex gap-[10px] rounded-md text-left transition-colors hover:border-border-bright"
      style={{ padding: '10px 11px', border: '1px solid var(--border, #1F252C)', borderLeft: `3px solid ${k.c}`, background: 'var(--bg-panel, #0F1217)' }}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-[3px] flex items-center gap-[6px]">
          <span
            className="rounded-full font-mono font-bold uppercase"
            style={{ fontSize: 9, letterSpacing: '0.08em', padding: '1px 7px', color: k.c, background: k.tint }}
          >
            {q.tag}
          </span>
        </div>
        <div className="font-bold text-text" style={{ fontSize: 13, lineHeight: 1.2 }}>
          {q.title}
        </div>
        <div className="text-text-muted" style={{ fontSize: 11.5 }}>
          {q.sub}
        </div>
      </div>
      <ChevronRight size={15} className="flex-none self-center text-text-muted" />
    </button>
  );
}

/* ============================================================ */
export function AtlasOraclePage() {
  const { data, posture } = useDingleberry();
  const navigate = useNavigate();

  const Check = dbIcon('check');
  const Message = dbIcon('message');

  if (!data) {
    return (
      <div className="mx-auto" style={{ maxWidth: 1320, padding: '22px 26px 40px' }}>
        <DbCard className="p-6 text-text-muted">Loading Atlas Oracle…</DbCard>
      </div>
    );
  }

  const queue = data.atlasOracle.queue;
  const summary = SUMMARY[posture];
  const suggestions = ['Run the proof sweep', 'Explain the affiliate freeze', 'Why did source #2140 break?', 'Draft the incident note'];
  const scorecard: [string, string, string][] = [
    ['Fixes shipped', '1,240', 'var(--text, #F8F9FA)'],
    ['Auto-resolved overnight', '37', TONE.secure.c],
    ['Hours saved (est.)', '410', 'var(--text, #F8F9FA)'],
    ['Needs your call', '3', STATUS_BLUE],
  ];

  return (
    <div className="mx-auto" style={{ maxWidth: 1320, padding: '22px 26px 40px' }}>
      {/* header */}
      <DbCard className="mb-[18px] p-5" style={{ background: 'var(--bg-elevated, #0C0E12)' }}>
        <div className="flex flex-wrap items-center gap-4">
          <AO size={54} />
          <div className="min-w-[240px] flex-1">
            <h1 className="font-serif font-bold text-text" style={{ fontSize: 30, lineHeight: 1, margin: '0 0 5px' }}>
              Atlas Oracle
            </h1>
            <div className="text-text-silver" style={{ fontSize: 14, maxWidth: 540 }}>
              Honeycomb’s security copilot — explains every finding in plain language, ships the fix it can, and automates
              the rest across the whole comb.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {['◇ Explain', '✓ One-click fix', '↻ Automate', '◎ Watch 24/7'].map((c) => (
              <span
                key={c}
                className="inline-flex items-center rounded-full border border-border-bright font-mono text-text-silver"
                style={{ fontSize: 11.5, padding: '5px 11px' }}
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </DbCard>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* conversation */}
        <DbCard className="min-w-0 p-5">
          <div className="flex flex-col gap-4">
            <OracleMsg>{summary}</OracleMsg>

            <OracleMsg>
              <b>Mesh node mq-7f3a</b> was serving corrupted storage pieces on the relay tier. I quarantined it the moment
              the heartbeat hash-check failed, and verified the affected piece-set is intact on two healthy replicas. To
              fully close it, I’d rebuild its shards onto a fresh device.
              <div
                className="mt-[11px] rounded-md"
                style={{ border: `1px solid ${TONE.secure.border}`, background: TONE.secure.tint, padding: '11px 13px' }}
              >
                <div className="mb-[9px] flex items-center gap-[7px]">
                  <Check size={14} style={{ color: TONE.secure.c }} />
                  <span className="font-bold" style={{ fontSize: 12.5, color: TONE.secure.c }}>
                    Quarantine confirmed · ready to rebuild
                  </span>
                </div>
                <div className="flex gap-2">
                  <ActionButton variant="primary" icon="activity">
                    Run rebuild
                  </ActionButton>
                  <ActionButton variant="secondary">Show the affected set</ActionButton>
                </div>
              </div>
            </OracleMsg>

            <UserMsg>Did any member data actually get lost?</UserMsg>

            <OracleMsg>
              No. Every piece mq-7f3a held is replicated three times; the other two copies pass their proof-of-storage
              challenges right now. Nothing was lost, and nothing bad was served downstream — I blocked it before it
              reached a reader. Want me to schedule a mesh-wide proof sweep tonight?
            </OracleMsg>

            {/* suggestions (inert) */}
            <div className="flex flex-wrap gap-2" style={{ paddingLeft: 48 }}>
              {suggestions.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-border bg-bg-elevated text-text-silver"
                  style={{ fontSize: 12.5, padding: '5px 12px' }}
                >
                  {s}
                </span>
              ))}
            </div>

            {/* composer (inert display) */}
            <div
              className="mt-1 flex items-center gap-[10px] rounded-md"
              style={{ border: '1.5px solid var(--border-bright, #2A3138)', padding: '10px 14px' }}
            >
              <Message size={17} className="text-text-muted" />
              <span className="flex-1 text-text-muted" style={{ fontSize: 14 }}>
                Ask Atlas Oracle about any surface, finding, or fix…
              </span>
              <div style={{ width: 92 }}>
                <ActionButton variant="primary" icon="arrowUp">
                  Send
                </ActionButton>
              </div>
            </div>
            <ActionCaption />
          </div>
        </DbCard>

        {/* right rail: fix queue + scorecard */}
        <div className="flex flex-col gap-4 self-start lg:sticky lg:top-4">
          <DbCard className="overflow-hidden p-0">
            <div className="flex items-center gap-[9px] border-b border-border" style={{ padding: '13px 15px' }}>
              <span className="font-bold text-text" style={{ fontSize: 14.5 }}>
                Fix queue
              </span>
              <span className="flex-1" />
              <span className="font-serif font-bold text-text" style={{ fontSize: 20 }}>
                {queue.length}
              </span>
            </div>
            <div className="flex flex-col gap-[9px]" style={{ padding: 12 }}>
              {queue.map((q) => (
                <FixQueueRow
                  key={q.title}
                  q={q}
                  onOpen={() => {
                    const route = SURFACE_ROUTE[q.surface];
                    if (route) navigate(route);
                  }}
                />
              ))}
            </div>
          </DbCard>

          <DbCard className="p-5" style={{ background: 'var(--bg-elevated, #0C0E12)' }}>
            <Eyebrow className="mb-3" >
              <span style={{ color: STATUS_BLUE }}>Oracle · last 30 days</span>
            </Eyebrow>
            {scorecard.map(([capLabel, n, col], idx) => (
              <div
                key={capLabel}
                className="flex items-center justify-between"
                style={{ paddingBottom: 9, marginBottom: 9, borderBottom: idx < 3 ? '1px solid var(--border, #1F252C)' : 'none' }}
              >
                <span className="text-text-silver" style={{ fontSize: 12.5 }}>
                  {capLabel}
                </span>
                <span className="font-mono font-bold tabular-nums" style={{ fontSize: 15, color: col }}>
                  {n}
                </span>
              </div>
            ))}
            <div className="mt-[2px] text-text-muted" style={{ fontSize: 11.5, lineHeight: 1.4 }}>
              Every fix Atlas ships is logged, reversible, and attributable — the audit trail the comb runs on.
            </div>
          </DbCard>
        </div>
      </div>
    </div>
  );
}
