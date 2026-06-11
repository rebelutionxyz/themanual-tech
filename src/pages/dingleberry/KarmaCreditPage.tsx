/* DingleBERRY — Karma Credit · AI soft-verification (drill-in).
   ------------------------------------------------------------
   A "soft pull" on an actor: an AI scores trust live from comb signals, computes
   UNDER ENCRYPTION, surfaces only a band + contributing signals, leaves NO mark,
   and RETAINS NOTHING. Ported from the artifact's KarmaCredit screen and
   re-skinned to the Slice-A..E conventions. STEP-2: fed by useDingleberry()/
   contract (KarmaCreditData) — never touches Supabase (standing tables are
   mostly unbuilt; live encrypted scoring is Step 3).

   PORT NOTE: the artifact ran a live phase-machine (idle → computing → TTL
   countdown → auto-discard) whose buttons *trigger* a pull. Per the "all action
   controls inert" rule, this is rendered as a READ detail view — selecting an
   actor (a read, like every other screen) shows the assessment directly; the
   pull/re-run/discard affordances are inert + captioned, and the live timers are
   replaced by a static ephemeral strip. No backend, no mutation, retains
   nothing — exactly the screen's thesis. */
import { useState } from 'react';
import { dbIcon } from '@/components/dingleberry/icons';
import { ActionButton, DbCard, Eyebrow } from '@/components/dingleberry/primitives';
import { DINGLEBERRY_COLOR, TONE } from '@/components/dingleberry/tone';
import type { KarmaActor, KarmaSignal } from '@/lib/dingleberry/contract';
import { useDingleberry } from './DingleberryLayout';

/* the mock actors carry `note` beyond the contract KarmaActor; Step-3 should
   widen KarmaActor. signals match KarmaSignal as-is. */
type KarmaActorX = KarmaActor & { note: string };

interface BandDef {
  key: 'trusted' | 'watch' | 'highrisk';
  label: string;
  c: string;
  tint: string;
  icon: string;
}
const BAND: Record<string, BandDef> = {
  trusted: { key: 'trusted', label: 'Trusted', c: TONE.secure.c, tint: TONE.secure.tint, icon: 'shieldCheck' },
  watch: { key: 'watch', label: 'Watch', c: TONE.watch.c, tint: TONE.watch.tint, icon: 'eye' },
  highrisk: { key: 'highrisk', label: 'High-risk', c: TONE.critical.c, tint: TONE.critical.tint, icon: 'ban' },
};
const bandFor = (s: number): BandDef => (s >= 70 ? BAND.trusted : s >= 45 ? BAND.watch : BAND.highrisk);

const scoreOf = (a: KarmaActorX, signals: KarmaSignal[]) =>
  Math.round(signals.reduce((s, sig) => s + sig.w * (a.v[sig.key] ?? 0), 0) * 100);

/* deterministic short hash for the receipt line */
function hashFor(id: string, salt: number) {
  let h = 2166136261;
  const str = `${id}|${salt}`;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const hex = (h >>> 0).toString(16).padStart(8, '0');
  return `0x${hex.slice(0, 4)}…${hex.slice(4, 8)}`;
}

const VERDICT: Record<string, string> = {
  trusted: 'Clear to proceed.',
  watch: 'Proceed with a second eye.',
  highrisk: 'Hold — escalate before acting.',
};

function Initials({ id, size = 40 }: { id: string; size?: number }) {
  const letters = id.replace('@', '').slice(0, 2).toUpperCase();
  return (
    <div
      className="flex flex-none items-center justify-center rounded-full font-mono font-bold text-text-silver"
      style={{ width: size, height: size, background: 'var(--bg-panel2, #14171C)', border: '1px solid var(--border-bright, #2A3138)', fontSize: size * 0.32 }}
    >
      {letters}
    </div>
  );
}

function Dial({ score, band }: { score: number; band: BandDef }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  const pct = score / 100;
  return (
    <div style={{ position: 'relative', width: 132, height: 132, flex: 'none' }}>
      <svg width="132" height="132" viewBox="0 0 132 132" role="img" aria-label={`karma ${score}`}>
        <circle cx="66" cy="66" r={R} fill="none" stroke="var(--border, #1F252C)" strokeWidth="9" />
        <circle
          cx="66"
          cy="66"
          r={R}
          fill="none"
          stroke={band.c}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - pct)}
          transform="rotate(-90 66 66)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif font-bold" style={{ fontSize: 38, lineHeight: 1, color: band.c }}>
          {score}
        </span>
        <span className="font-mono uppercase text-text-muted" style={{ fontSize: 8.5, letterSpacing: '0.12em', marginTop: 2 }}>
          / 100 karma
        </span>
      </div>
    </div>
  );
}

function SignalRow({ sig, val, band }: { sig: KarmaSignal; val: number; band: BandDef }) {
  return (
    <div className="flex items-center gap-3 border-b border-border" style={{ padding: '9px 0' }}>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-text" style={{ fontSize: 13 }}>
            {sig.label}
          </span>
          <span className="font-mono text-text-muted" style={{ fontSize: 9.5 }}>
            w {sig.w.toFixed(2)}
          </span>
        </div>
        <div className="text-text-muted" style={{ fontSize: 11, marginTop: 1 }}>
          {sig.hint}
        </div>
      </div>
      <div className="flex-none" style={{ width: 132 }}>
        <div className="overflow-hidden rounded-full" style={{ height: 7, background: 'var(--bg-panel2, #14171C)' }}>
          <div className="h-full rounded-full" style={{ width: `${val * 100}%`, background: band.c }} />
        </div>
      </div>
      <span className="font-mono font-bold tabular-nums text-text" style={{ fontSize: 12, width: 40, textAlign: 'right' }}>
        {Math.round(val * 100)}
      </span>
    </div>
  );
}

function Guard({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  const Icon = dbIcon(icon);
  return (
    <div className="flex items-start gap-[11px]">
      <div
        className="flex flex-none items-center justify-center rounded"
        style={{ width: 30, height: 30, background: 'rgba(220,38,38,0.14)', border: `1px solid ${TONE.critical.border}` }}
      >
        <Icon size={15} style={{ color: DINGLEBERRY_COLOR }} />
      </div>
      <div className="flex-1">
        <div className="font-bold text-text" style={{ fontSize: 12.5, lineHeight: 1.2 }}>
          {title}
        </div>
        <div className="text-text-muted" style={{ fontSize: 11.5, lineHeight: 1.35, marginTop: 2 }}>
          {sub}
        </div>
      </div>
    </div>
  );
}

/* ============================================================ */
export function KarmaCreditPage() {
  const { data } = useDingleberry();

  const Scale = dbIcon('scale');
  const Clock = dbIcon('clock');
  const Ban = dbIcon('ban');

  const actors = (data?.karmaCredit.actors as unknown as KarmaActorX[]) ?? [];
  const signals = data?.karmaCredit.signals ?? [];
  const [selId, setSelId] = useState<string | null>(null);

  if (!data || actors.length === 0) {
    return (
      <div className="mx-auto" style={{ maxWidth: 1320, padding: '22px 26px 40px' }}>
        <DbCard className="p-6 text-text-muted">Loading actors…</DbCard>
      </div>
    );
  }

  const actor = actors.find((a) => a.id === selId) ?? actors[0];
  const score = scoreOf(actor, signals);
  const band = bandFor(score);
  const BandIcon = dbIcon(band.icon);

  const sessionLog: [string, number, string][] = [
    ['@meshwarden', 82, '6m'],
    ['@forager-7f3a', 55, '22m'],
    ['@upline-0050', 28, '41m'],
  ];

  return (
    <div className="mx-auto" style={{ maxWidth: 1320, padding: '22px 26px 40px' }}>
      {/* header */}
      <DbCard className="mb-[18px] p-5" style={{ background: 'var(--bg-elevated, #0C0E12)' }}>
        <div className="flex flex-wrap items-center gap-4">
          <div
            className="flex flex-none items-center justify-center rounded-md"
            style={{ width: 54, height: 54, background: `linear-gradient(135deg, ${DINGLEBERRY_COLOR}, #7F1D1D)` }}
          >
            <Scale size={26} style={{ color: '#fff' }} />
          </div>
          <div className="min-w-[240px] flex-1">
            <div className="mb-[5px] font-mono uppercase" style={{ fontSize: 10, letterSpacing: '0.16em', color: '#60A5FA' }}>
              AI soft-verification · encrypted · ephemeral
            </div>
            <h1 className="font-serif font-bold text-text" style={{ fontSize: 30, lineHeight: 1, margin: '0 0 5px' }}>
              Karma Credit
            </h1>
            <div className="text-text-silver" style={{ fontSize: 14, maxWidth: 560 }}>
              A soft pull on any actor — like a soft credit check. The model scores trust live from comb signals,{' '}
              <b className="text-text">computes under encryption</b>, returns a band, and{' '}
              <b className="text-text">retains nothing</b>. It leaves no mark and doesn’t touch the member’s standing.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {([['lock', 'Encrypted'], ['clock', 'Ephemeral'], ['check', 'No mark left'], ['scale', 'Soft pull']] as [string, string][]).map(([ic, c]) => {
              const Icon = dbIcon(ic);
              return (
                <span
                  key={c}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border-bright font-mono text-text-silver"
                  style={{ fontSize: 11, padding: '5px 11px' }}
                >
                  <Icon size={12} style={{ color: DINGLEBERRY_COLOR }} /> {c}
                </span>
              );
            })}
          </div>
        </div>
      </DbCard>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* main column */}
        <div className="flex min-w-0 flex-col gap-4">
          {/* actor picker */}
          <DbCard className="overflow-hidden p-0">
            <div className="flex items-center gap-[9px] border-b border-border" style={{ padding: '13px 16px' }}>
              {(() => {
                const Fingerprint = dbIcon('fingerprint');
                return <Fingerprint size={16} className="text-text-muted" />;
              })()}
              <span className="font-bold text-text" style={{ fontSize: 14.5 }}>
                Run a soft pull on…
              </span>
            </div>
            <div className="grid gap-[10px]" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', padding: 14 }}>
              {actors.map((a) => {
                const on = a.id === actor.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelId(a.id)}
                    className="flex items-center gap-[11px] rounded-md text-left transition-colors"
                    style={{
                      padding: '11px 12px',
                      background: on ? 'rgba(220,38,38,0.08)' : 'var(--bg-panel, #0F1217)',
                      border: on ? `1.5px solid ${DINGLEBERRY_COLOR}` : '1px solid var(--border, #1F252C)',
                    }}
                  >
                    <Initials id={a.id} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-mono font-bold text-text" style={{ fontSize: 12.5 }}>
                        {a.id}
                      </div>
                      <div className="truncate text-text-muted" style={{ fontSize: 11 }}>
                        {a.rank}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </DbCard>

          {/* result card */}
          <DbCard className="p-5">
            <div className="mb-4 flex flex-wrap items-center gap-[13px]">
              <Initials id={actor.id} size={48} />
              <div className="min-w-[180px] flex-1">
                <div className="font-mono font-bold text-text" style={{ fontSize: 14 }}>
                  {actor.id}
                </div>
                <div className="text-text-muted" style={{ fontSize: 12.5 }}>
                  {actor.rank} · joined {actor.joined}
                </div>
              </div>
            </div>

            {/* verdict strip */}
            <div
              className="flex flex-wrap items-center gap-[18px] rounded-md"
              style={{ padding: '16px 18px', background: band.tint, border: `1px solid ${band.c}`, borderLeft: `3px solid ${band.c}` }}
            >
              <Dial score={score} band={band} />
              <div className="min-w-[200px] flex-1">
                <div className="mb-[6px] flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full" style={{ padding: '3px 11px', background: band.c }}>
                    <BandIcon size={14} style={{ color: '#fff' }} />
                    <span className="font-mono font-bold uppercase text-white" style={{ fontSize: 10.5, letterSpacing: '0.08em' }}>
                      {band.label}
                    </span>
                  </span>
                  <span className="font-mono text-text-muted" style={{ fontSize: 10.5 }}>
                    soft pull · {hashFor(actor.id, actor.id.length)}
                  </span>
                </div>
                <div className="font-serif font-bold text-text" style={{ fontSize: 22, lineHeight: 1.15 }}>
                  {VERDICT[band.key]}
                </div>
                <div className="text-text-silver" style={{ fontSize: 13, marginTop: 4 }}>
                  {actor.note}
                </div>
              </div>
            </div>

            {/* ephemeral (static) */}
            <div
              className="mt-3 flex items-center gap-3 rounded"
              style={{ padding: '9px 14px', background: 'var(--bg-elevated, #0C0E12)', border: '1px solid var(--border, #1F252C)' }}
            >
              <Clock size={15} style={{ color: '#60A5FA' }} />
              <span className="flex-1 font-mono uppercase text-text-muted" style={{ fontSize: 10.5, letterSpacing: '0.06em' }}>
                Ephemeral — auto-discards, retains nothing
              </span>
              <span className="font-mono font-bold" style={{ fontSize: 11, color: '#60A5FA' }}>
                30s
              </span>
            </div>

            {/* signal breakdown */}
            <div className="mt-[18px]">
              <div className="mb-1 flex items-center gap-[9px]">
                <Eyebrow>What moved the score</Eyebrow>
                <span className="h-px flex-1 bg-border" />
                <span className="font-mono text-text-muted" style={{ fontSize: 10 }}>
                  weighted · 0–100
                </span>
              </div>
              {signals.map((sig) => (
                <SignalRow key={sig.key} sig={sig} val={actor.v[sig.key] ?? 0} band={band} />
              ))}
            </div>

            {/* inert footer action */}
            <div className="mt-4 flex flex-col gap-2">
              <div style={{ maxWidth: 220 }}>
                <ActionButton variant="secondary" icon="activity">
                  Re-run (fresh compute)
                </ActionButton>
              </div>
              <div className="font-mono uppercase text-text-muted" style={{ fontSize: 9, letterSpacing: '0.08em' }}>
                Soft-pull compute is simulated on sample signals · live encrypted scoring wires in Step 3
              </div>
            </div>
          </DbCard>
        </div>

        {/* right rail */}
        <div className="flex flex-col gap-4 self-start lg:sticky lg:top-4">
          {/* privacy guarantees */}
          <DbCard className="p-5" style={{ background: 'var(--bg-elevated, #0C0E12)' }}>
            <Eyebrow className="mb-[14px]">
              <span style={{ color: '#60A5FA' }}>The guarantee</span>
            </Eyebrow>
            <div className="flex flex-col gap-[14px]">
              <Guard icon="lock" title="Encrypted end to end" sub="Signals are sealed in flight and stay encrypted through compute — never decrypted into a readable record." />
              <Guard icon="clock" title="Ephemeral by design" sub="The result lives in-session only and auto-discards. No score, no inputs, no log row is persisted." />
              <Guard icon="check" title="No mark on the member" sub="A soft pull leaves no hard inquiry. The member isn’t notified and isn’t penalized." />
              <Guard icon="scale" title="Standing untouched" sub="Karma Credit reads standing; it never writes it. A pull can’t move anyone’s rank." />
            </div>
            <div className="mt-4 border-t border-border pt-[14px]">
              <div className="mb-2 font-mono uppercase text-text-muted" style={{ fontSize: 9.5, letterSpacing: '0.1em' }}>
                We never keep
              </div>
              <div className="flex flex-wrap gap-[6px]">
                {['the score', 'the raw signals', 'the inputs', 'who you pulled'].map((x) => (
                  <span
                    key={x}
                    className="inline-flex items-center gap-[5px] rounded-full border border-border font-mono text-text-silver"
                    style={{ fontSize: 10.5, padding: '3px 9px' }}
                  >
                    <Ban size={11} style={{ color: TONE.critical.c }} /> {x}
                  </span>
                ))}
              </div>
            </div>
          </DbCard>

          {/* session-only history (static mock) */}
          <DbCard className="overflow-hidden p-0">
            <div className="flex items-center gap-[9px] border-b border-border" style={{ padding: '13px 15px' }}>
              <span className="font-bold text-text" style={{ fontSize: 14.5 }}>
                This session’s pulls
              </span>
              <span className="flex-1" />
              <span className="font-mono uppercase text-text-muted" style={{ fontSize: 9.5, letterSpacing: '0.06em' }}>
                discarded
              </span>
            </div>
            <div className="flex flex-col gap-2" style={{ padding: 12 }}>
              {sessionLog.map(([id, sc, t]) => {
                const b = bandFor(sc);
                return (
                  <div
                    key={id}
                    className="flex items-center gap-[10px] rounded-md"
                    style={{ padding: '9px 11px', border: '1px solid var(--border, #1F252C)', borderLeft: `3px solid ${b.c}`, background: 'var(--bg-panel, #0F1217)' }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-mono font-bold text-text" style={{ fontSize: 12 }}>
                        {id}
                      </div>
                      <div className="font-mono text-text-muted" style={{ fontSize: 9.5 }}>
                        {hashFor(id, sc)} · result purged
                      </div>
                    </div>
                    <span
                      className="font-mono font-bold uppercase"
                      style={{ fontSize: 9.5, letterSpacing: '0.06em', color: b.c, background: b.tint, borderRadius: 999, padding: '2px 8px' }}
                    >
                      {b.label}
                    </span>
                    <span className="font-mono text-text-muted" style={{ fontSize: 10, width: 30, textAlign: 'right' }}>
                      {t}
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: '0 14px 13px' }}>
              <div className="text-text-muted" style={{ fontSize: 11, lineHeight: 1.4 }}>
                Only the band and a salted hash survive — enough to show a pull happened, never enough to reconstruct it.
                Cleared on sign-out.
              </div>
            </div>
          </DbCard>
        </div>
      </div>
    </div>
  );
}
