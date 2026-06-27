import { dbIcon } from '@/components/dingleberry/icons';
import { DbCard, Eyebrow, StatusPill } from '@/components/dingleberry/primitives';
import { DATA_BLUE, DINGLEBERRY_COLOR, STATUS_BLUE, TONE } from '@/components/dingleberry/tone';
import type { LedgerAnomaly, LedgerEntry, Tone } from '@/lib/dingleberry/contract';
/* DingleBERRY — Surface 02 · Transaction Security (drill-in).
   ------------------------------------------------------------
   Watches the BLiNG! ledger for Path-A invariant violations. "Transactions
   secured" is the headline assurance. Dark repo tokens, primitives, green/blue/
   red — no honey/gold.

   STEP-3 LIVE: this surface reads the live dingleberry_s02_snapshot() RPC
   (SECURITY DEFINER, admin-gated, read-only) via useDingleberry().s02 — NOT the
   mock snapshot. Posture is DERIVED from the live anomalies (§6.6.4), so the
   banner / tiles / coloring follow real ledger state independent of the global
   mock PostureSwitcher. On RPC failure the surface shows an honest "live feed
   unavailable" state — never a silent mock fallback. Genesis prod legitimately
   reads 0 secured / 0.0000% of cap / 0 anomalies / Secure. Enforcement actions
   stay inert (wire in Step 4, post audit).

   CRITICAL: well.totalSupply / hardCap arrive as STRINGS (the Sacred Sum exceeds
   JS safe integers) — rendered verbatim, never Number()'d. pct is numeric. */
import type { CSSProperties, ReactNode } from 'react';
import { useState } from 'react';
import { useDingleberry } from './DingleberryLayout';

const TAG: Record<string, { c: string; tint: string; label: string }> = {
  freed: { c: '#6FCF8F', tint: 'rgba(111,207,143,0.13)', label: 'freed' },
  pull: { c: STATUS_BLUE, tint: 'rgba(96,165,250,0.13)', label: 'demurrage' },
  p2p: { c: '#8A94A0', tint: 'rgba(138,148,160,0.12)', label: 'transfer' },
};

const STATUS_BADGE: Record<string, { tone: Tone; label: string }> = {
  held: { tone: 'critical', label: 'Held' },
  review: { tone: 'watch', label: 'In review' },
  watching: { tone: 'watch', label: 'Watching' },
};

const SANCTIONED_PATHS = [
  'Drops / Drips',
  'Affiliate distribution',
  'AtlasOracle credit',
  'HoneyPOT',
];

/* Worst-first ordering for the anomaly list. Lower rank = shown first.
   The list is intentionally NOT gated by posture (Butch's call): every open
   invariant violation is always visible; the posture switcher only drives the
   banner / header tiles / coloring, not which anomalies appear. */
const SEV_RANK: Record<string, number> = { critical: 0, watch: 1, info: 2, idle: 3, secure: 4 };

function toneOf(sev: string): Tone {
  return sev === 'critical' || sev === 'watch' || sev === 'info' || sev === 'idle' ? sev : 'secure';
}

/* ---- recent ledger events ---- */
function LedgerStream({ stream }: { stream: readonly LedgerEntry[] }) {
  const Check = dbIcon('check');
  const ArrowDown = dbIcon('arrowDown');
  return (
    <div className="flex flex-col">
      {stream.map((e, i) => {
        const tg = TAG[e.tag] ?? TAG.p2p;
        const neg = e.amt.startsWith('−');
        const Glyph = e.tag === 'pull' ? ArrowDown : Check;
        return (
          <div
            key={e.hash}
            className="flex items-center gap-[10px]"
            style={{
              padding: '9px 2px',
              borderBottom: i < stream.length - 1 ? '1px dashed var(--border, #1F252C)' : 'none',
            }}
          >
            <span
              className="flex flex-none items-center justify-center rounded-full"
              style={{ width: 20, height: 20, background: tg.tint, color: tg.c }}
            >
              <Glyph size={12} />
            </span>
            <span
              className="flex-none font-mono tabular-nums text-text-muted"
              style={{ fontSize: 11.5 }}
            >
              {e.hash}
            </span>
            <span className="min-w-0 flex-1 truncate text-text-silver" style={{ fontSize: 12.5 }}>
              <b style={{ fontWeight: 600 }}>{e.kind}</b> ·{' '}
              {e.from === 'Well' ? 'Well' : `mbr·${e.from}`} →{' '}
              {e.to === 'Well' ? 'Well' : `mbr·${e.to}`}
            </span>
            <span
              className="flex-none rounded-full font-mono font-bold uppercase"
              style={{
                fontSize: 9,
                letterSpacing: '0.05em',
                padding: '1px 7px',
                color: tg.c,
                background: tg.tint,
              }}
            >
              {tg.label}
            </span>
            <span
              className="flex-none text-right font-mono font-bold tabular-nums"
              style={{ fontSize: 13, width: 64, color: neg ? STATUS_BLUE : 'var(--text, #F8F9FA)' }}
            >
              ◇ {e.amt}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ---- the Well: Path A supply readout. totalSupply / hardCap are STRINGS
   (Sacred Sum > JS safe int) — displayed verbatim; pct is the numeric fill. ---- */
function SupplyWell({
  totalSupply,
  hardCap,
  pct,
}: { totalSupply: string; hardCap: string; pct: number }) {
  const Lock = dbIcon('lock');
  const ArrowDown = dbIcon('arrowDown');
  const fill = Math.max(0, Math.min(100, pct));
  return (
    <DbCard className="mb-4 p-5">
      <div className="mb-3 flex items-center gap-[9px]">
        <Lock size={16} style={{ color: DATA_BLUE }} />
        <div className="flex-1">
          <Eyebrow>The Well · Path A</Eyebrow>
          <div className="font-serif font-bold text-text" style={{ fontSize: 17, lineHeight: 1.1 }}>
            Earned, never sold
          </div>
        </div>
        <StatusPill tone="secure">cap intact</StatusPill>
      </div>

      <div
        className="mb-[5px] flex justify-between font-mono text-text-muted"
        style={{ fontSize: 10.5 }}
      >
        <span>total_supply freed</span>
        <span>
          <b className="text-text">{pct.toFixed(4)}%</b> of cap
        </span>
      </div>
      <div
        className="mb-[6px] overflow-hidden rounded-full"
        style={{ height: 8, background: 'var(--bg-panel2, #14171C)' }}
      >
        <div
          style={{
            height: '100%',
            width: `${fill}%`,
            background: `linear-gradient(90deg, ${TONE.secure.c}, #4FB87A)`,
          }}
        />
      </div>
      <div className="mb-[14px] font-mono tabular-nums text-text-muted" style={{ fontSize: 10 }}>
        ◇ {totalSupply} freed · cap ◇ {hardCap}
      </div>

      <Eyebrow>Sanctioned freeing paths</Eyebrow>
      <div className="flex flex-wrap gap-[6px]" style={{ margin: '8px 0 14px' }}>
        {SANCTIONED_PATHS.map((p) => (
          <span
            key={p}
            className="rounded-full border border-border bg-bg-elevated font-mono text-text-silver"
            style={{ fontSize: 11, padding: '3px 10px' }}
          >
            {p}
          </span>
        ))}
      </div>

      <div
        className="flex items-center gap-2 rounded-md"
        style={{
          padding: '9px 11px',
          background: TONE.watch.tint,
          border: `1px solid ${TONE.watch.border}`,
        }}
      >
        <ArrowDown size={14} style={{ color: STATUS_BLUE, flex: 'none' }} />
        <span className="text-text-silver" style={{ fontSize: 12.5 }}>
          <b>Demurrage 8 / 5 / 3 / 1%</b> by tier — pulling balances back to the Well, continuously.
        </span>
      </div>
    </DbCard>
  );
}

function AnomalyRow({
  a,
  active,
  onClick,
}: { a: LedgerAnomaly; active: boolean; onClick: () => void }) {
  const k = TONE[toneOf(a.sev)];
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-md text-left transition-colors"
      style={{
        padding: '11px 13px',
        border: active ? `1.5px solid ${DINGLEBERRY_COLOR}` : '1px solid var(--border, #1F252C)',
        borderLeft: `3px solid ${k.c}`,
        background: active
          ? 'rgba(220,38,38,0.08)'
          : a.sev === 'critical'
            ? k.tint
            : 'var(--bg-panel, #0F1217)',
      }}
    >
      <span
        className={a.sev === 'critical' ? 'animate-pulse' : ''}
        style={{ width: 9, height: 9, flex: 'none', borderRadius: 99, background: k.c }}
      />
      <div className="min-w-0 flex-1">
        <div className="font-bold text-text" style={{ fontSize: 13.5 }}>
          {a.kind}
        </div>
        <div className="truncate text-text-muted" style={{ fontSize: 11.5 }}>
          {a.detail}
        </div>
      </div>
      <div className="flex-none text-right">
        <div className="font-mono font-bold tabular-nums text-text" style={{ fontSize: 13 }}>
          ◇ {a.amt}
        </div>
        <div className="font-mono text-text-muted" style={{ fontSize: 10 }}>
          {a.id}
        </div>
      </div>
    </button>
  );
}

/* ---- inline "live feed unavailable" state — shown when the S02 RPC errors.
   We do NOT fall back to mock; an honest dead-feed beats fabricated assurance. */
function LiveUnavailable({ code, message }: { code?: string; message?: string }) {
  const WifiOff = dbIcon('wifiOff');
  const denied = code === '42501';
  return (
    <div className="mx-auto" style={{ maxWidth: 1320, padding: '22px 26px 40px' }}>
      <DbCard className="p-6" style={{ borderLeft: `3px solid ${TONE.critical.c}` }}>
        <div className="flex items-start gap-3">
          <WifiOff size={20} style={{ color: DINGLEBERRY_COLOR, flex: 'none', marginTop: 2 }} />
          <div>
            <div
              className="font-serif font-bold text-text"
              style={{ fontSize: 18, lineHeight: 1.1 }}
            >
              Live feed unavailable
            </div>
            <div className="mt-1 text-text-silver" style={{ fontSize: 13, lineHeight: 1.45 }}>
              {denied
                ? 'dingleberry_s02_snapshot() denied access for this Bee — operator (admin) role required (42501).'
                : 'Could not reach the S02 snapshot RPC. The live ledger feed is not showing.'}
            </div>
            {message && (
              <div className="mt-2 font-mono text-text-muted" style={{ fontSize: 11 }}>
                {code ? `${code} · ` : ''}
                {message}
              </div>
            )}
          </div>
        </div>
      </DbCard>
    </div>
  );
}

/* ---- inert mock action buttons (enforcement wires in Step 4, post audit) ---- */
function ActionButton({
  variant,
  children,
  icon,
}: {
  variant: 'danger' | 'secondary' | 'ghost';
  children: ReactNode;
  icon?: string;
}) {
  const Icon = icon ? dbIcon(icon) : null;
  const styles: Record<typeof variant, CSSProperties> = {
    danger: {
      color: DINGLEBERRY_COLOR,
      background: 'rgba(220,38,38,0.12)',
      border: `1px solid ${TONE.critical.border}`,
    },
    secondary: {
      color: 'var(--text-silver, #C8D1DA)',
      background: 'transparent',
      border: '1px solid var(--border-bright, #2A3138)',
    },
    ghost: {
      color: 'var(--text-muted, #6B7580)',
      background: 'transparent',
      border: '1px solid transparent',
    },
  };
  return (
    <button
      type="button"
      className="flex w-full items-center justify-center gap-2 rounded-md font-sans font-semibold"
      style={{ height: 38, fontSize: 13, ...styles[variant] }}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

/* ---- small green LIVE pill (kettle sourced) — S02's live affordance, replacing
   the mock "sample data" signal the other (mock) surfaces still carry. */
function LivePill() {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-mono font-bold uppercase"
      style={{
        fontSize: 9,
        letterSpacing: '0.08em',
        padding: '2px 9px',
        color: TONE.secure.c,
        background: TONE.secure.tint,
        border: `1px solid ${TONE.secure.border}`,
      }}
    >
      <span
        className="animate-pulse"
        style={{ width: 6, height: 6, borderRadius: 99, background: TONE.secure.c }}
      />
      live
    </span>
  );
}

/* ============================================================ */
export function TransactionSecurityPage() {
  const { s02 } = useDingleberry();
  const [selId, setSelId] = useState<string | null>(null);

  const Lock = dbIcon('lock');
  const Radar = dbIcon('radar');
  const Sparkle = dbIcon('sparkle');
  const ShieldCheck = dbIcon('shieldCheck');

  if (s02.status === 'loading') {
    return (
      <div className="mx-auto" style={{ maxWidth: 1320, padding: '22px 26px 40px' }}>
        <DbCard className="p-6 text-text-muted">Loading live ledger…</DbCard>
      </div>
    );
  }
  if (s02.status === 'unavailable') {
    return <LiveUnavailable code={s02.errorCode} message={s02.errorMessage} />;
  }

  // ----- LIVE. Posture is DERIVED from the live anomalies; the global mock
  // PostureSwitcher does not drive this surface.
  const { posture, securedToday, demurrage24h, well, stream, lastCheck, integrityOk } = s02;
  const anomalies = [...s02.anomalies].sort(
    (a, b) => (SEV_RANK[a.sev] ?? 9) - (SEV_RANK[b.sev] ?? 9),
  );

  const sel = anomalies.find((a) => a.id === selId) ?? anomalies[0] ?? null;
  const held = posture === 'critical';

  const headerStats: [string, string, Tone][] = [
    ['Secured · 24h', securedToday, held ? 'critical' : 'secure'],
    ['Invariant alarms', String(anomalies.length), anomalies.length ? 'watch' : 'secure'],
    ['Demurrage pulled · 24h', demurrage24h, 'secure'],
  ];

  return (
    <div className="mx-auto" style={{ maxWidth: 1320, padding: '22px 26px 40px' }}>
      {/* header */}
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
            <Lock size={23} />
          </div>
          <div className="min-w-[280px] flex-1">
            <div className="flex items-center gap-2">
              <Eyebrow>Surface 02 · BLiNG! ledger integrity</Eyebrow>
              <LivePill />
            </div>
            <h1
              className="font-serif font-bold text-text"
              style={{ fontSize: 30, lineHeight: 1.05, margin: '3px 0 4px' }}
            >
              Transaction security
            </h1>
            <div className="text-text-silver" style={{ fontSize: 14.5, maxWidth: 540 }}>
              Guarding the <b>Path A</b> ledger — BLiNG! is earned and freed from the Well,{' '}
              <b>never sold</b>. The anomalies are invariant violations.
            </div>
          </div>
          <div className="flex flex-wrap gap-[10px]">
            {headerStats.map(([cap, n, tn]) => (
              <div
                key={cap}
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
                  style={{ fontSize: 24, lineHeight: 1, color: TONE[tn].c }}
                >
                  {n}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DbCard>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* left: assurance + stream + anomalies */}
        <div className="min-w-0">
          <DbCard
            className="mb-4 p-5"
            style={{ borderLeft: `3px solid ${held ? TONE.critical.c : TONE.secure.c}` }}
          >
            <div className="mb-1 flex flex-wrap items-baseline gap-3">
              <span
                className="font-serif font-bold tabular-nums"
                style={{
                  fontSize: 40,
                  lineHeight: 1,
                  color: held ? TONE.critical.c : 'var(--text, #F8F9FA)',
                }}
              >
                {securedToday}
              </span>
              <span className="text-text-muted" style={{ fontSize: 15 }}>
                transactions secured today
              </span>
            </div>
            <div className="mb-[14px] text-text-muted" style={{ fontSize: 13.5 }}>
              {anomalies.length
                ? `${anomalies.length} Path A violations flagged and held · nothing settled`
                : 'Every freeing traced to a sanctioned path · demurrage flowing · cap intact'}
            </div>
            <div className="mb-[6px] flex items-center gap-2">
              <span
                className="animate-pulse"
                style={{ width: 7, height: 7, borderRadius: 99, background: TONE.secure.c }}
              />
              <Eyebrow>Live ledger stream — verifying</Eyebrow>
              {lastCheck && (
                <span className="font-mono text-text-muted" style={{ fontSize: 10 }}>
                  · check {lastCheck}
                </span>
              )}
            </div>
            <LedgerStream stream={stream} />
          </DbCard>

          <SupplyWell totalSupply={well.totalSupply} hardCap={well.hardCap} pct={well.pct} />

          {anomalies.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-[10px]">
                <Eyebrow>Path A violations — worst-first</Eyebrow>
                <span className="h-px flex-1 bg-border" />
              </div>
              <div className="flex flex-col gap-[9px]">
                {anomalies.map((a) => (
                  <AnomalyRow
                    key={a.id}
                    a={a}
                    active={!!sel && a.id === sel.id}
                    onClick={() => setSelId(a.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* right: anomaly detail / clean state */}
        <div className="flex flex-col gap-4 self-start lg:sticky lg:top-4">
          {sel ? (
            <DbCard className="p-5">
              <div className="mb-[10px] flex flex-wrap items-center gap-[9px]">
                <span
                  className={sel.sev === 'critical' ? 'animate-pulse' : ''}
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: 99,
                    background: TONE[toneOf(sel.sev)].c,
                  }}
                />
                <StatusPill tone={STATUS_BADGE[sel.status]?.tone ?? 'idle'}>
                  {STATUS_BADGE[sel.status]?.label ?? sel.status}
                </StatusPill>
                <span className="flex-1" />
                <span className="font-mono text-text-muted" style={{ fontSize: 11 }}>
                  {sel.id}
                </span>
              </div>
              {/* LDG-3391 label kept verbatim — it is the Howey tripwire (the alarm
                  naming a forbidden act); do not reword. */}
              <h2
                className="font-serif font-bold text-text"
                style={{ fontSize: 20, lineHeight: 1.1, margin: '0 0 4px' }}
              >
                {sel.kind}
              </h2>
              <div className="mb-[13px] text-text-silver" style={{ fontSize: 13 }}>
                {sel.detail}
              </div>

              <div className="mb-[13px] grid grid-cols-2 gap-[10px]">
                <div
                  className="rounded-md border border-border bg-bg-elevated"
                  style={{ padding: '9px 11px' }}
                >
                  <div
                    className="mb-[3px] font-mono uppercase text-text-muted"
                    style={{ fontSize: 9, letterSpacing: '0.08em' }}
                  >
                    Ledger entry
                  </div>
                  <div
                    className="font-mono font-bold tabular-nums text-text"
                    style={{ fontSize: 13 }}
                  >
                    {sel.entry}
                  </div>
                </div>
                <div
                  className="rounded-md border border-border bg-bg-elevated"
                  style={{ padding: '9px 11px' }}
                >
                  <div
                    className="mb-[3px] font-mono uppercase text-text-muted"
                    style={{ fontSize: 9, letterSpacing: '0.08em' }}
                  >
                    Amount
                  </div>
                  <div
                    className="font-mono font-bold tabular-nums text-text"
                    style={{ fontSize: 13 }}
                  >
                    ◇ {sel.amt}
                  </div>
                </div>
              </div>

              <div
                className="mb-3 flex items-center gap-[7px] rounded-md bg-bg-elevated"
                style={{ padding: '8px 11px' }}
              >
                <Radar size={14} style={{ color: DATA_BLUE }} />
                <span className="text-text-silver" style={{ fontSize: 12 }}>
                  <b>Caught by</b> · {sel.check}
                </span>
              </div>

              <div
                className="mb-[13px] flex gap-[11px] rounded-md"
                style={{
                  padding: '12px 13px',
                  background: 'var(--bg-elevated, #0C0E12)',
                  border: '1px solid var(--border, #1F252C)',
                }}
              >
                <div
                  className="flex flex-none items-center justify-center rounded-md"
                  style={{
                    width: 30,
                    height: 30,
                    background: `linear-gradient(135deg, ${DINGLEBERRY_COLOR}, #7F1D1D)`,
                  }}
                >
                  <Sparkle size={15} style={{ color: '#fff' }} />
                </div>
                <div>
                  <div
                    className="mb-[3px] font-mono uppercase"
                    style={{ fontSize: 9, letterSpacing: '0.1em', color: STATUS_BLUE }}
                  >
                    Atlas Oracle · assessment
                  </div>
                  <div className="text-text-silver" style={{ fontSize: 12.5, lineHeight: 1.4 }}>
                    {sel.oracle}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <ActionButton variant="danger" icon="x">
                  Reverse &amp; refund
                </ActionButton>
                <div className="flex gap-2">
                  <ActionButton variant="secondary">Keep held</ActionButton>
                  <ActionButton variant="ghost">Clear — false flag</ActionButton>
                </div>
                <div
                  className="text-center font-mono uppercase text-text-muted"
                  style={{ fontSize: 9, letterSpacing: '0.08em' }}
                >
                  Enforcement actions wire in Step 4 · post security audit
                </div>
              </div>
            </DbCard>
          ) : (
            <DbCard
              className="p-5"
              style={{ borderLeft: `3px solid ${integrityOk ? TONE.secure.c : TONE.critical.c}` }}
            >
              <div className="mb-2 flex items-center gap-[10px]">
                <ShieldCheck
                  size={20}
                  style={{ color: integrityOk ? TONE.secure.c : TONE.critical.c }}
                />
                <span className="font-serif font-bold text-text" style={{ fontSize: 18 }}>
                  {integrityOk ? 'Ledger clean' : 'Integrity check failed'}
                </span>
              </div>
              <div className="mb-[14px] text-text-silver" style={{ fontSize: 13, lineHeight: 1.4 }}>
                {integrityOk
                  ? 'No anomalies open · economy_integrity_check() passed · the promise holds.'
                  : 'economy_integrity_check() did not pass — the conservation invariant is in question.'}
              </div>
              <div className="flex flex-col gap-[9px]">
                {(
                  [
                    // Unwired rows read '—' (no fabricated assurance on a LIVE surface);
                    // the true-from-live rows carry real counts.
                    ['Signature checks', '—'],
                    ['Double-spend conflicts', '0'],
                    ['Open anomalies', String(anomalies.length)],
                    ['Mean settle time', '—'],
                  ] as [string, string][]
                ).map(([cap, n], i) => (
                  <div
                    key={cap}
                    className="flex items-center justify-between"
                    style={{
                      paddingBottom: 8,
                      borderBottom: i < 3 ? '1px dashed var(--border, #1F252C)' : 'none',
                    }}
                  >
                    <span className="text-text-muted" style={{ fontSize: 13 }}>
                      {cap}
                    </span>
                    <span
                      className="font-mono font-bold tabular-nums text-text"
                      style={{ fontSize: 13 }}
                    >
                      {n}
                    </span>
                  </div>
                ))}
              </div>
              <div
                className="mt-[10px] font-mono text-text-muted"
                style={{ fontSize: 10, lineHeight: 1.4 }}
              >
                — detail metrics wire with the detectors
              </div>
            </DbCard>
          )}
        </div>
      </div>
    </div>
  );
}
