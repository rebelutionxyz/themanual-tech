/* DingleBERRY — Surface 03 · Source Verification (drill-in).
   ------------------------------------------------------------
   Every intel source ranked by its chain-of-verification (the Discovery
   Ladder). No verification, no credibility. Ported from the artifact's S03
   screen and re-skinned to the Slice-A/B conventions. STEP-2: fed by
   useDingleberry()/contract (SourceVerificationData) — never touches Supabase
   (live CoV scoring is Step 3).

   The ranked list + the detail chain are BOTH posture-independent (the S02
   lesson): all sources render, sorted worst-first by tier; nothing here is
   gated by secure/degraded/go-dark. */
import { useState } from 'react';
import { dbIcon } from '@/components/dingleberry/icons';
import { ActionButton, ActionCaption, DbCard, Eyebrow } from '@/components/dingleberry/primitives';
import { TONE } from '@/components/dingleberry/tone';
import type { IntelSource } from '@/lib/dingleberry/contract';
import { useDingleberry } from './DingleberryLayout';

/* Discovery-Ladder tier → on-palette token. Three credible/watch/alarm color
   buckets (green/blue/red only — no gold/orange/purple); the fine-grained tier
   LABELS are preserved, only the color bucket is coarse:
     green = sourced + accepted   (credible)
     blue  = emerging + fringe    (watch)
     red   = unsourced            (alarm)  — plus broken-chain HOPS stay red. */
const GREEN = { c: '#6FCF8F', tint: 'rgba(111,207,143,0.13)' };
const BLUE = { c: '#60A5FA', tint: 'rgba(96,165,250,0.13)' };
const RED = { c: '#C94C4C', tint: 'rgba(201,76,76,0.13)' };
const TIER: Record<string, { c: string; tint: string; word: string }> = {
  sourced: { ...GREEN, word: 'Verified' },
  accepted: { ...GREEN, word: 'Corroborated' },
  emerging: { ...BLUE, word: 'Partial' },
  fringe: { ...BLUE, word: 'Broken chain' },
  unsourced: { ...RED, word: 'Unverified' },
};
const tierOf = (status: string) => TIER[status] ?? TIER.unsourced;

/* worst-first ordering (lower = worse = shown first) */
const TIER_RANK: Record<string, number> = { unsourced: 0, fringe: 1, emerging: 2, accepted: 3, sourced: 4 };

interface Hop {
  st: string;
  label: string;
  detail: string;
  icon: string;
  broken?: boolean;
}

function chainFor(status: string): Hop[] {
  const C: Record<string, Hop[]> = {
    sourced: [
      { st: 'sourced', label: 'Claim received', detail: 'document ingested into the record', icon: 'fileText' },
      { st: 'sourced', label: 'Issuer verified', detail: 'signed by issuing-authority key', icon: 'lock' },
      { st: 'sourced', label: 'Primary document', detail: 'hash matches canonical record', icon: 'fingerprint' },
      { st: 'sourced', label: 'Independent corroboration', detail: '3 sources cross-confirm', icon: 'users' },
      { st: 'sourced', label: 'Chain complete', detail: 'full provenance · credibility granted', icon: 'shieldCheck' },
    ],
    accepted: [
      { st: 'sourced', label: 'Claim received', detail: 'report ingested', icon: 'fileText' },
      { st: 'sourced', label: 'Outlet verified', detail: 'known wire · editorial standards on file', icon: 'lock' },
      { st: 'accepted', label: 'Corroboration', detail: '2 independent outlets agree', icon: 'users' },
      { st: 'emerging', label: 'Primary document', detail: 'not yet obtained · corroborated only', icon: 'fingerprint' },
    ],
    emerging: [
      { st: 'sourced', label: 'Claim received', detail: 'analysis ingested', icon: 'fileText' },
      { st: 'emerging', label: 'Method review', detail: 'reasoning sound · inputs partial', icon: 'activity' },
      { st: 'emerging', label: 'Corroboration', detail: '1 supporting signal · awaiting second', icon: 'users' },
    ],
    fringe: [
      { st: 'unsourced', label: 'Claim received', detail: 'self-asserted by anonymous source', icon: 'fileText' },
      { st: 'emerging', label: 'Secondary corroboration', detail: '1 outlet repeated · no independent confirm', icon: 'users' },
      { st: 'fringe', label: 'Primary document', detail: 'hash mismatch — document not authenticated', icon: 'fingerprint', broken: true },
    ],
    unsourced: [
      { st: 'unsourced', label: 'Claim received', detail: 'unverified handle · no provenance attached', icon: 'fileText' },
      { st: 'unsourced', label: 'No chain', detail: 'nothing to verify against', icon: 'ban', broken: true },
    ],
  };
  return C[status] ?? C.unsourced;
}

function TierPill({ status }: { status: string }) {
  const t = tierOf(status);
  return (
    <span
      className="inline-flex items-center font-mono font-semibold uppercase"
      style={{ height: 19, padding: '0 8px', fontSize: 9.5, letterSpacing: '0.06em', borderRadius: 999, color: t.c, background: t.tint, border: `1px solid ${t.c}55` }}
    >
      {t.word}
    </span>
  );
}

function CredBadge({ cred, status, size = 56 }: { cred: number; status: string; size?: number }) {
  const t = tierOf(status);
  return (
    <div
      className="flex flex-none flex-col items-center justify-center rounded-full"
      style={{ width: size, height: size, border: `2.5px solid ${t.c}`, background: t.tint, lineHeight: 1 }}
    >
      <span className="font-serif font-bold" style={{ fontSize: size * 0.38, color: t.c }}>
        {cred}
      </span>
      <span className="font-mono uppercase text-text-muted" style={{ fontSize: 7.5, letterSpacing: '0.06em', marginTop: 1 }}>
        cred
      </span>
    </div>
  );
}

/* compact evidence meter — three 5-segment bars (primary / corroboration / attestation) */
function EvidenceMeter({ str, color }: { str: { e: number; f: number; t: number }; color: string }) {
  const rows: [string, number][] = [
    ['Primary', str.e],
    ['Corrob.', str.f],
    ['Attest.', str.t],
  ];
  return (
    <div className="flex flex-col gap-[6px]">
      {rows.map(([label, v]) => (
        <div key={label} className="flex items-center gap-2">
          <span className="font-mono uppercase text-text-muted" style={{ fontSize: 9, width: 54, letterSpacing: '0.04em' }}>
            {label}
          </span>
          <span className="flex flex-1 gap-[3px]">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="h-[6px] flex-1 rounded-full"
                style={{ background: i < v ? color : 'var(--bg-panel2, #14171C)', border: i < v ? 'none' : '1px solid var(--border, #1F252C)' }}
              />
            ))}
          </span>
          <span className="font-mono font-bold tabular-nums text-text-silver" style={{ fontSize: 10, width: 14, textAlign: 'right' }}>
            {v}
          </span>
        </div>
      ))}
    </div>
  );
}

function SourceRow({ s, active, onClick }: { s: IntelSource; active: boolean; onClick: () => void }) {
  const t = tierOf(s.status);
  const AlertTriangle = dbIcon('alertTriangle');
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-[13px] rounded-md text-left transition-colors"
      style={{
        padding: '12px 14px',
        border: active ? '1.5px solid #DC2626' : '1px solid var(--border, #1F252C)',
        borderLeft: `3px solid ${t.c}`,
        background: active ? 'rgba(220,38,38,0.08)' : s.flag ? t.tint : 'var(--bg-panel, #0F1217)',
      }}
    >
      <CredBadge cred={s.cred} status={s.status} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono font-bold text-text" style={{ fontSize: 13 }}>
            @{s.handle}
          </span>
          {s.flag && <AlertTriangle size={13} style={{ color: '#C94C4C' }} />}
        </div>
        <div className="text-text-muted" style={{ fontSize: 12 }}>
          {s.kind} · <span className="font-mono">{s.id}</span>
        </div>
      </div>
      <div className="flex flex-none flex-col items-end gap-[5px]">
        <TierPill status={s.status} />
        <span className="font-mono text-text-muted" style={{ fontSize: 10.5 }}>
          chain {s.depth} · {s.last}
        </span>
      </div>
    </button>
  );
}

function Chain({ hops }: { hops: Hop[] }) {
  const X = dbIcon('x');
  return (
    <div className="flex flex-col">
      {hops.map((h, i) => {
        const t = tierOf(h.st);
        // broken-chain hops stay red even when their tier bucket is blue/green
        const hc = h.broken ? RED.c : t.c;
        const ht = h.broken ? RED.tint : t.tint;
        const last = i === hops.length - 1;
        const Glyph = h.broken ? X : dbIcon(h.icon);
        return (
          <div key={`${h.label}-${i}`} className="relative flex gap-[13px]" style={{ paddingBottom: last ? 0 : 16 }}>
            {!last && (
              <span
                className="absolute"
                style={{ left: 15, top: 32, bottom: 0, width: 2, background: h.broken ? RED.c : 'var(--border-bright, #2A3138)' }}
              />
            )}
            <div
              className="z-[1] flex flex-none items-center justify-center rounded-full"
              style={{ width: 32, height: 32, border: `2.5px solid ${hc}`, background: h.broken ? ht : 'var(--bg-panel, #0F1217)', color: hc }}
            >
              <Glyph size={15} />
            </div>
            <div className="flex-1" style={{ paddingTop: 1 }}>
              <div className="flex flex-wrap items-center gap-[9px]">
                <span className="font-bold text-text" style={{ fontSize: 14 }}>
                  {h.label}
                </span>
                <TierPill status={h.st} />
                {h.broken && (
                  <span className="font-mono font-bold uppercase" style={{ fontSize: 10, letterSpacing: '0.06em', color: '#C94C4C' }}>
                    ✗ link broken
                  </span>
                )}
              </div>
              <div className="text-text-muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                {h.detail}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================ */
export function SourceVerificationPage() {
  const { data } = useDingleberry();
  const [selId, setSelId] = useState<string | null>(null);

  const Fingerprint = dbIcon('fingerprint');
  const ShieldCheck = dbIcon('shieldCheck');
  const AlertTriangle = dbIcon('alertTriangle');

  if (!data) {
    return (
      <div className="mx-auto" style={{ maxWidth: 1320, padding: '22px 26px 40px' }}>
        <DbCard className="p-6 text-text-muted">Loading sources…</DbCard>
      </div>
    );
  }

  const sources = [...data.sourceVerification.sources].sort(
    (a, b) => (TIER_RANK[a.status] ?? 9) - (TIER_RANK[b.status] ?? 9),
  );
  const sel = sources.find((s) => s.id === selId) ?? sources[0] ?? null;
  const flagged = sources.filter((s) => s.status === 'fringe' || s.status === 'unsourced').length;
  const intact = sources.length - flagged;
  const hops = sel ? chainFor(sel.status) : [];
  const broken = sel ? sel.status === 'fringe' || sel.status === 'unsourced' : false;

  const headerStats: [string, string, string][] = [
    ['Sources ranked', '2,140', TONE.idle.c],
    ['Chains intact', String(intact * 305), TONE.secure.c],
    ['Flagged', String(flagged), TONE.critical.c],
  ];

  return (
    <div className="mx-auto" style={{ maxWidth: 1320, padding: '22px 26px 40px' }}>
      {/* header */}
      <DbCard className="mb-[18px] p-5">
        <div className="flex flex-wrap items-start gap-[18px]">
          <div
            className="flex flex-none items-center justify-center rounded-md"
            style={{ width: 46, height: 46, background: 'rgba(220,38,38,0.12)', color: '#DC2626' }}
          >
            <Fingerprint size={24} />
          </div>
          <div className="min-w-[280px] flex-1">
            <Eyebrow>Surface 03 · chain-of-verification</Eyebrow>
            <h1 className="font-serif font-bold text-text" style={{ fontSize: 30, lineHeight: 1.05, margin: '3px 0 4px' }}>
              Source verification
            </h1>
            <div className="text-text-silver" style={{ fontSize: 14.5, maxWidth: 540 }}>
              Every intel source ranked by its chain of verification. <b>No verification, no credibility.</b>
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
        {/* ranked list */}
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-[10px]">
            <Eyebrow>Ranked sources — worst chains surface as flags</Eyebrow>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="flex flex-col gap-[9px]">
            {sources.map((s) => (
              <SourceRow key={s.id} s={s} active={!!sel && s.id === sel.id} onClick={() => setSelId(s.id)} />
            ))}
          </div>
        </div>

        {/* detail: the chain */}
        {sel && (
          <div className="flex flex-col gap-4 self-start lg:sticky lg:top-4">
            <DbCard className="p-5">
              <div className="mb-[14px] flex items-center gap-[13px]">
                <CredBadge cred={sel.cred} status={sel.status} size={56} />
                <div className="min-w-0 flex-1">
                  <div className="font-mono font-bold text-text" style={{ fontSize: 13 }}>
                    @{sel.handle}
                  </div>
                  <div className="mb-[5px] text-text-muted" style={{ fontSize: 12 }}>
                    {sel.kind}
                  </div>
                  <TierPill status={sel.status} />
                </div>
              </div>

              <div className="mb-2 flex items-center justify-between">
                <Eyebrow>Chain strength</Eyebrow>
                <span className="font-mono text-text-muted" style={{ fontSize: 11 }}>
                  primary · corroboration · attestation
                </span>
              </div>
              <div className="mb-4">
                <EvidenceMeter str={sel.str} color={tierOf(sel.status).c} />
              </div>

              <Eyebrow>Verification chain</Eyebrow>
              <div style={{ height: 10 }} />
              <Chain hops={hops} />

              <div
                className="mt-4 flex items-start gap-[9px] rounded-md"
                style={{
                  padding: '11px 13px',
                  background: broken ? TONE.critical.tint : TONE.secure.tint,
                  border: `1px solid ${broken ? TONE.critical.border : TONE.secure.border}`,
                }}
              >
                {broken ? (
                  <AlertTriangle size={16} style={{ color: TONE.critical.c, marginTop: 1, flex: 'none' }} />
                ) : (
                  <ShieldCheck size={16} style={{ color: TONE.secure.c, marginTop: 1, flex: 'none' }} />
                )}
                <div className="text-text-silver" style={{ fontSize: 12.5, lineHeight: 1.35 }}>
                  {broken ? (
                    <span>
                      <b>Credibility withheld.</b> {sel.flag || 'No chain to verify against'} — DingleBERRY will not let
                      unverified claims earn standing.
                    </span>
                  ) : (
                    <span>
                      <b>Credibility granted.</b> Full provenance recorded; this source can carry weight on the record.
                    </span>
                  )}
                </div>
              </div>
            </DbCard>

            {/* actions (inert mock) */}
            <DbCard className="p-5">
              <Eyebrow className="mb-[10px]">Act</Eyebrow>
              <div className="flex flex-col gap-2">
                <ActionButton variant="primary" icon="activity">
                  Re-run verification
                </ActionButton>
                {broken ? (
                  <ActionButton variant="danger" icon="ban">
                    Withhold credibility
                  </ActionButton>
                ) : (
                  <ActionButton variant="secondary" icon="fileText">
                    Open provenance record
                  </ActionButton>
                )}
                <ActionButton variant="ghost" icon="sparkle">
                  Ask Atlas Oracle to trace it
                </ActionButton>
                <ActionCaption />
              </div>
            </DbCard>
          </div>
        )}
      </div>
    </div>
  );
}
