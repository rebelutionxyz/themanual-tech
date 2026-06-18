/* DingleBERRY — Surface 05 · Dispatch (Waggle) Auth (drill-in).
   ------------------------------------------------------------
   Every Waggle dispatch is hashed; authority is gated on the actor's
   monitoring/security DISCIPLINE rank (bee_ranks) plus global standing.
   Provable, or it doesn't move. Ported from the artifact's S05 screen and
   re-skinned to the Slice-A/B/C conventions. STEP-2: fed by
   useDingleberry()/contract (DispatchAuthData) — never touches Supabase.

   The stream is posture-independent (the S02 lesson): held-first by its own
   verdict, nothing gated by secure/degraded/go-dark.

   ⚠ THIS IS THE ENFORCEMENT-AUTHORIZATION SURFACE — the highest-risk mutation
   layer. EVERY action control (re-auth / escalate / reject / view / audit) is
   INERT with the Step-4 caption. No handlers. No mutations. No exceptions. */
import type { ReactNode } from 'react';
import { useState } from 'react';
import { dbIcon } from '@/components/dingleberry/icons';
import { ActionButton, ActionCaption, DbCard, Eyebrow } from '@/components/dingleberry/primitives';
import { DATA_BLUE, DINGLEBERRY_COLOR, TONE } from '@/components/dingleberry/tone';
import { useDingleberry } from './DingleberryLayout';

/* The mock dispatches carry richer fields than the contract's Dispatch subset
   (ar/rr/ring/bling/ok/hash/t/oracle). They exist at runtime today; Step-3
   should widen Dispatch to match what the rank-gate RPC surfaces. */
interface S5Dispatch {
  id: string;
  action: string;
  kind: string;
  actor: string;
  disc: string;
  ar: number; // actor rank level
  rr: number; // required rank level
  ring: number; // honeycomb_ring standing
  bling: string; // bling_rank standing
  ok: boolean; // rank verified?
  hash: string;
  t: string;
  oracle: string;
}

const MAXL = 5; // bee_ranks rank_level 1..5 within a discipline
const RANK_NAME: Record<string, Record<number, string>> = {
  monitoring: { 1: 'BeesWax', 2: 'Drone', 3: 'Forager', 4: 'Keeper', 5: 'Steward' },
  security: { 2: 'Scout', 4: 'Sentinel', 5: 'Guardian' }, // L1, L3 open
};
const rname = (disc: string, lvl: number) => RANK_NAME[disc]?.[lvl] ?? `L${lvl}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const GREEN = TONE.secure.c;
const RED = TONE.critical.c;

function Initials({ handle }: { handle: string }) {
  const letters = handle.replace('@', '').slice(0, 2).toUpperCase();
  return (
    <div
      className="flex flex-none items-center justify-center rounded-full font-mono font-bold text-text-silver"
      style={{ width: 32, height: 32, background: 'var(--bg-panel2, #14171C)', border: '1px solid var(--border-bright, #2A3138)', fontSize: 11 }}
    >
      {letters}
    </div>
  );
}

/* ---- discipline rank-gate ladder (bee_ranks) ---- */
function RankLadder({ ar, rr, disc }: { ar: number; rr: number; disc: string }) {
  const ok = ar >= rr;
  return (
    <div className="flex items-end">
      {Array.from({ length: MAXL }, (_, idx) => {
        const i = idx + 1;
        const filled = i <= ar;
        const isReq = i === rr;
        const isActor = i === ar;
        const named = RANK_NAME[disc]?.[i];
        // filled color: verified→green, at/above the requirement when short→red, below-req filled→structural blue
        const dotC = filled ? (ok ? GREEN : i >= rr ? RED : DATA_BLUE) : 'var(--border-bright, #2A3138)';
        const segC = (active: boolean) =>
          active ? (ok ? GREEN : i >= rr ? RED : DATA_BLUE) : 'var(--border, #1F252C)';
        return (
          <div key={i} className="relative flex flex-1 flex-col items-center gap-1">
            {isReq && (
              <span
                className="absolute font-mono font-bold uppercase text-text-muted"
                style={{ top: -16, fontSize: 8, letterSpacing: '0.06em' }}
              >
                needs
              </span>
            )}
            <div className="flex w-full items-center">
              <span style={{ flex: 1, height: 2, background: i === 1 ? 'transparent' : segC(i <= ar) }} />
              <span
                className="flex-none rounded-full"
                style={{
                  width: isActor || isReq ? 16 : 11,
                  height: isActor || isReq ? 16 : 11,
                  background: filled ? dotC : 'var(--bg-elevated, #0C0E12)',
                  border: `2px solid ${isReq ? (ok ? GREEN : RED) : dotC}`,
                  boxShadow: isActor ? `0 0 0 3px ${ok ? TONE.secure.tint : TONE.critical.tint}` : 'none',
                }}
              />
              <span style={{ flex: 1, height: 2, background: i === MAXL ? 'transparent' : segC(i < ar) }} />
            </div>
            <span
              className="text-center font-mono"
              style={{
                fontSize: 8.5,
                fontWeight: isActor ? 700 : 500,
                color: named ? (isActor ? 'var(--text, #F8F9FA)' : 'var(--text-muted, #6B7580)') : 'var(--border-bright, #2A3138)',
                lineHeight: 1.1,
              }}
            >
              {named ?? `L${i}`}
            </span>
            {isActor && (
              <span className="font-mono font-bold" style={{ fontSize: 8, color: ok ? GREEN : RED }}>
                actor
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function VerdictBadge({ ok, children }: { ok: boolean; children: ReactNode }) {
  const k = ok ? TONE.secure : TONE.critical;
  return (
    <span
      className="inline-flex items-center font-mono font-semibold uppercase"
      style={{ height: 19, padding: '0 8px', fontSize: 9.5, letterSpacing: '0.06em', borderRadius: 999, color: k.c, background: k.tint, border: `1px solid ${k.border}` }}
    >
      {children}
    </span>
  );
}

function DispatchRow({ d, active, onClick }: { d: S5Dispatch; active: boolean; onClick: () => void }) {
  const k = d.ok ? TONE.secure : TONE.critical;
  const Glyph = dbIcon(d.ok ? 'check' : 'x');
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-md text-left transition-colors"
      style={{
        padding: '11px 13px',
        border: active ? `1.5px solid ${DINGLEBERRY_COLOR}` : '1px solid var(--border, #1F252C)',
        borderLeft: `3px solid ${k.c}`,
        background: active ? 'rgba(220,38,38,0.08)' : d.ok ? 'var(--bg-panel, #0F1217)' : k.tint,
      }}
    >
      <span className="flex flex-none items-center justify-center rounded-full" style={{ width: 22, height: 22, background: k.tint, color: k.c }}>
        <Glyph size={13} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-bold text-text" style={{ fontSize: 13.5 }}>
          {d.action}
        </div>
        <div className="font-mono text-text-muted" style={{ fontSize: 11 }}>
          {d.hash} · {d.actor} · {rname(d.disc, d.ar)}
        </div>
      </div>
      <div className="flex flex-none flex-col items-end gap-1 text-right">
        <VerdictBadge ok={d.ok}>{d.ok ? 'Verified' : 'Held'}</VerdictBadge>
        <span className="font-mono text-text-muted" style={{ fontSize: 10 }}>
          needs {rname(d.disc, d.rr)}
        </span>
      </div>
    </button>
  );
}

/* ============================================================ */
export function DispatchAuthPage() {
  const { data } = useDingleberry();
  const [selId, setSelId] = useState<string | null>(null);

  const Zap = dbIcon('zap');
  const Check = dbIcon('check');
  const AlertTriangle = dbIcon('alertTriangle');
  const Sparkle = dbIcon('sparkle');

  if (!data) {
    return (
      <div className="mx-auto" style={{ maxWidth: 1320, padding: '22px 26px 40px' }}>
        <DbCard className="p-6 text-text-muted">Loading dispatches…</DbCard>
      </div>
    );
  }

  // held-first (worst-first by verdict): ok=false sorts before ok=true
  const sorted = [...(data.dispatchAuth.dispatches as unknown as S5Dispatch[])].sort(
    (a, b) => Number(a.ok) - Number(b.ok),
  );
  const d = sorted.find((x) => x.id === selId) ?? sorted[0] ?? null;
  const failed = sorted.filter((x) => !x.ok).length;

  const headerStats: [string, string, string][] = [
    ['Hashed · 24h', '3,402', TONE.secure.c],
    ['Rank-verified', '3,388', TONE.secure.c],
    ['Failed rank check', String(failed + 12), TONE.critical.c],
  ];

  return (
    <div className="mx-auto" style={{ maxWidth: 1320, padding: '22px 26px 40px' }}>
      {/* header */}
      <DbCard className="mb-[18px] p-5">
        <div className="flex flex-wrap items-start gap-[18px]">
          <div className="flex flex-none items-center justify-center rounded-md" style={{ width: 46, height: 46, background: 'rgba(220,38,38,0.12)', color: '#DC2626' }}>
            <Zap size={23} />
          </div>
          <div className="min-w-[280px] flex-1">
            <Eyebrow>Surface 05 · dispatch authentication</Eyebrow>
            <h1 className="font-serif font-bold text-text" style={{ fontSize: 30, lineHeight: 1.05, margin: '3px 0 4px' }}>
              Dispatch auth
            </h1>
            <div className="text-text-silver" style={{ fontSize: 14.5, maxWidth: 560 }}>
              Every Waggle dispatch hashed; authority gated on the actor’s <b>monitoring / security discipline rank</b> +
              standing. <b>Provable, or it doesn’t move.</b>
            </div>
          </div>
          <div className="flex flex-wrap gap-[10px]">
            {headerStats.map(([c2, n, c]) => (
              <div key={c2} className="rounded-md border border-border bg-bg-elevated" style={{ padding: '10px 14px', minWidth: 96 }}>
                <div className="mb-1 font-mono uppercase text-text-muted" style={{ fontSize: 9.5, letterSpacing: '0.08em' }}>
                  {c2}
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
        {/* stream */}
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-[10px]">
            <Eyebrow>Dispatch stream — held first</Eyebrow>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="flex flex-col gap-[9px]">
            {sorted.map((x) => (
              <DispatchRow key={x.id} d={x} active={!!d && x.id === d.id} onClick={() => setSelId(x.id)} />
            ))}
          </div>
        </div>

        {/* detail */}
        {d && (
          <div className="flex flex-col gap-4 self-start lg:sticky lg:top-4">
            <DbCard className="p-5">
              <div className="mb-[10px] flex flex-wrap items-center gap-[9px]">
                <span
                  className={!d.ok ? 'animate-pulse' : ''}
                  style={{ width: 11, height: 11, borderRadius: 99, background: d.ok ? GREEN : RED }}
                />
                <VerdictBadge ok={d.ok}>{d.ok ? 'Rank verified' : 'Rank insufficient'}</VerdictBadge>
                <span className="flex-1" />
                <span className="font-mono text-text-muted" style={{ fontSize: 11 }}>
                  {d.id}
                </span>
              </div>
              <h2 className="font-serif font-bold text-text" style={{ fontSize: 19, lineHeight: 1.12, margin: '0 0 12px' }}>
                {d.action}
              </h2>

              <div className="mb-[14px] grid grid-cols-2 gap-[10px]">
                <div className="rounded-md border border-border bg-bg-elevated" style={{ padding: '9px 11px' }}>
                  <div className="mb-[3px] font-mono uppercase text-text-muted" style={{ fontSize: 9, letterSpacing: '0.08em' }}>
                    Dispatch hash
                  </div>
                  <div className="font-mono font-bold text-text" style={{ fontSize: 13 }}>
                    {d.hash}
                  </div>
                </div>
                <div className="rounded-md border border-border bg-bg-elevated" style={{ padding: '9px 11px' }}>
                  <div className="mb-[3px] font-mono uppercase text-text-muted" style={{ fontSize: 9, letterSpacing: '0.08em' }}>
                    Class
                  </div>
                  <div className="font-bold capitalize text-text" style={{ fontSize: 13 }}>
                    {d.kind}
                  </div>
                </div>
              </div>

              {/* actor + standing */}
              <div className="mb-[14px] rounded-md border border-border" style={{ padding: '11px 12px' }}>
                <div className="mb-[10px] flex items-center gap-[11px]">
                  <Initials handle={d.actor} />
                  <div className="flex-1">
                    <div className="font-mono font-bold text-text" style={{ fontSize: 13 }}>
                      {d.actor}
                    </div>
                    <div className="font-mono text-text-muted" style={{ fontSize: 11 }}>
                      {rname(d.disc, d.ar)} · {cap(d.disc)} L{d.ar}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono uppercase text-text-muted" style={{ fontSize: 9, letterSpacing: '0.08em' }}>
                      requires
                    </div>
                    <div className="font-mono font-bold" style={{ fontSize: 13, color: d.ok ? GREEN : RED }}>
                      {rname(d.disc, d.rr)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-[7px] border-t border-dashed border-border pt-[9px]">
                  <span className="font-mono uppercase text-text-muted" style={{ fontSize: 9.5, letterSpacing: '0.06em' }}>
                    global standing
                  </span>
                  {[`honeycomb_ring · ${d.ring}`, `bling_rank · ${d.bling}`].map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full font-mono font-bold"
                      style={{ fontSize: 11, padding: '1px 9px', color: DATA_BLUE, background: 'rgba(59,130,246,0.12)' }}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>

              <Eyebrow className="mb-[18px]">{cap(d.disc)} rank-gate (bee_ranks)</Eyebrow>
              <RankLadder ar={d.ar} rr={d.rr} disc={d.disc} />

              <div
                className="mt-4 flex items-start gap-[9px] rounded-md"
                style={{
                  padding: '11px 13px',
                  background: d.ok ? TONE.secure.tint : TONE.critical.tint,
                  border: `1px solid ${d.ok ? TONE.secure.border : TONE.critical.border}`,
                }}
              >
                {d.ok ? (
                  <Check size={15} style={{ color: GREEN, flex: 'none', marginTop: 1 }} />
                ) : (
                  <AlertTriangle size={15} style={{ color: RED, flex: 'none', marginTop: 1 }} />
                )}
                <span className="text-text-silver" style={{ fontSize: 12.5, lineHeight: 1.35 }}>
                  {d.ok ? (
                    <span>
                      <b>Authority proven.</b> {d.actor} holds {rname(d.disc, d.ar)} ({cap(d.disc)} L{d.ar}) ≥ required{' '}
                      {rname(d.disc, d.rr)}, standing in good order. Signed and hash-chained.
                    </span>
                  ) : (
                    <span>
                      <b>
                        Short by {d.rr - d.ar} level{d.rr - d.ar > 1 ? 's' : ''}.
                      </b>{' '}
                      {d.actor} ({rname(d.disc, d.ar)}) can’t issue a {rname(d.disc, d.rr)}-gated dispatch — standing
                      doesn’t override discipline rank. Held.
                    </span>
                  )}
                </span>
              </div>

              {/* Atlas Oracle note — red identity gradient (was gold) */}
              <div
                className="mb-[13px] mt-3 flex gap-[11px] rounded-md"
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
                    Atlas Oracle · note
                  </div>
                  <div className="text-text-silver" style={{ fontSize: 12.5, lineHeight: 1.4 }}>
                    {d.oracle}
                  </div>
                </div>
              </div>

              {/* ENFORCEMENT-AUTHORIZATION controls — INERT (Step 4) */}
              <div className="flex flex-col gap-2">
                {d.ok ? (
                  <div className="flex gap-2">
                    <ActionButton variant="secondary" icon="fileText">
                      View payload
                    </ActionButton>
                    <ActionButton variant="ghost">Audit trail</ActionButton>
                  </div>
                ) : (
                  <>
                    <ActionButton variant="primary" icon="arrowUp">
                      Request re-auth at {rname(d.disc, d.rr)}
                    </ActionButton>
                    <div className="flex gap-2">
                      <ActionButton variant="secondary">Escalate</ActionButton>
                      <ActionButton variant="danger">Reject dispatch</ActionButton>
                    </div>
                  </>
                )}
                <ActionCaption />
              </div>
            </DbCard>
          </div>
        )}
      </div>
    </div>
  );
}
