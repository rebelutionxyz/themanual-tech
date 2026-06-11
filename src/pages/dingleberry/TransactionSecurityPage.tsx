/* DingleBERRY — Surface 02 · Transaction Security (drill-in).
   ------------------------------------------------------------
   Watches the BLiNG! ledger for Path-A invariant violations. "Transactions
   secured" is the headline assurance; during Go Dark, writes queue for clean
   reconcile (nothing lost). Ported from the artifact's S02 screen and re-skinned
   to the Slice-A conventions (dark repo tokens, primitives, green/blue/red — no
   honey/gold). STEP-2: fed entirely by useDingleberry()/contract; never touches
   Supabase. Live wiring (bling_system_state, economy_integrity_check) is Step 3. */
import type { CSSProperties, ReactNode } from 'react';
import { useState } from 'react';
import { dbIcon } from '@/components/dingleberry/icons';
import { DbCard, Eyebrow, StatusPill } from '@/components/dingleberry/primitives';
import { DATA_BLUE, DINGLEBERRY_COLOR, STATUS_BLUE, TONE } from '@/components/dingleberry/tone';
import type { LedgerEntry, Tone } from '@/lib/dingleberry/contract';
import { useDingleberry } from './DingleberryLayout';

/* The mock anomalies carry richer fields than the contract's LedgerAnomaly
   subset (entry/amt/status/check/oracle). They exist at runtime today; Step-3
   should widen LedgerAnomaly to match what economy_integrity_log surfaces. */
interface S2Anomaly {
  id: string;
  sev: string;
  kind: string;
  detail: string;
  entry: string;
  amt: string;
  status: string;
  check: string;
  oracle: string;
}

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

const SANCTIONED_PATHS = ['Drops / Drips', 'affiliate_distribute', 'AtlasOracle credit', 'HoneyPOT'];

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
            style={{ padding: '9px 2px', borderBottom: i < stream.length - 1 ? '1px dashed var(--border, #1F252C)' : 'none' }}
          >
            <span
              className="flex flex-none items-center justify-center rounded-full"
              style={{ width: 20, height: 20, background: tg.tint, color: tg.c }}
            >
              <Glyph size={12} />
            </span>
            <span className="flex-none font-mono tabular-nums text-text-muted" style={{ fontSize: 11.5 }}>
              {e.hash}
            </span>
            <span className="min-w-0 flex-1 truncate text-text-silver" style={{ fontSize: 12.5 }}>
              <b style={{ fontWeight: 600 }}>{e.kind}</b> · {e.from === 'Well' ? 'Well' : `mbr·${e.from}`} →{' '}
              {e.to === 'Well' ? 'Well' : `mbr·${e.to}`}
            </span>
            <span
              className="flex-none rounded-full font-mono font-bold uppercase"
              style={{ fontSize: 9, letterSpacing: '0.05em', padding: '1px 7px', color: tg.c, background: tg.tint }}
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

/* ---- the Well: Path A supply readout ---- */
function SupplyWell({ hardCap }: { hardCap: string }) {
  const Lock = dbIcon('lock');
  const ArrowDown = dbIcon('arrowDown');
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

      <div className="mb-[5px] flex justify-between font-mono text-text-muted" style={{ fontSize: 10.5 }}>
        <span>total_supply freed</span>
        <span>
          <b className="text-text">48.3%</b> of cap
        </span>
      </div>
      <div className="mb-[6px] overflow-hidden rounded-full" style={{ height: 8, background: 'var(--bg-panel2, #14171C)' }}>
        <div
          style={{ height: '100%', width: '48.3%', background: `linear-gradient(90deg, ${TONE.secure.c}, #4FB87A)` }}
        />
      </div>
      <div className="mb-[14px] font-mono text-text-muted" style={{ fontSize: 10 }}>
        cap {hardCap} · 1 ◇ = 1,000,000 FNU
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
        style={{ padding: '9px 11px', background: TONE.watch.tint, border: `1px solid ${TONE.watch.border}` }}
      >
        <ArrowDown size={14} style={{ color: STATUS_BLUE, flex: 'none' }} />
        <span className="text-text-silver" style={{ fontSize: 12.5 }}>
          <b>Demurrage 8 / 5 / 3 / 1%</b> by tier — pulling balances back to the Well, continuously.
        </span>
      </div>
    </DbCard>
  );
}

function AnomalyRow({ a, active, onClick }: { a: S2Anomaly; active: boolean; onClick: () => void }) {
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
        background: active ? 'rgba(220,38,38,0.08)' : a.sev === 'critical' ? k.tint : 'var(--bg-panel, #0F1217)',
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

function ReconcilePanel() {
  const queued = ['0x4f2c…91ad', '0x77be…02e1', '0x3a90…ccf2', '0x9d10…44b8', '0x1ce7…a0d2'];
  const WifiOff = dbIcon('wifiOff');
  const Clock = dbIcon('clock');
  const ShieldCheck = dbIcon('shieldCheck');
  return (
    <DbCard className="p-5" style={{ background: 'var(--bg-elevated, #0C0E12)', borderColor: TONE.watch.border }}>
      <div className="mb-3 flex items-center gap-[11px]">
        <div
          className="flex flex-none items-center justify-center rounded-md"
          style={{ width: 38, height: 38, background: TONE.watch.tint, color: STATUS_BLUE }}
        >
          <WifiOff size={19} />
        </div>
        <div className="flex-1">
          <Eyebrow>Go Dark · reconcile queue</Eyebrow>
          <div className="font-serif font-bold text-text" style={{ fontSize: 17, lineHeight: 1.1 }}>
            Ledger writes held safely
          </div>
        </div>
      </div>
      <div className="mb-3 flex items-baseline gap-2">
        <span className="font-serif font-bold" style={{ fontSize: 34, lineHeight: 1, color: STATUS_BLUE }}>
          12,408
        </span>
        <span className="text-text-silver" style={{ fontSize: 13 }}>
          writes queued for reconcile
        </span>
      </div>
      <div className="mb-3 flex flex-col gap-[6px]">
        {queued.map((h, i) => (
          <div
            key={h}
            className="flex items-center gap-[9px] rounded"
            style={{ padding: '6px 9px', background: 'var(--bg-panel, #0F1217)' }}
          >
            <Clock size={13} style={{ color: STATUS_BLUE }} />
            <span className="flex-1 font-mono tabular-nums text-text-silver" style={{ fontSize: 11.5 }}>
              {h}
            </span>
            <span className="font-mono text-text-muted" style={{ fontSize: 10 }}>
              {i === 0 ? 'queued' : 'pending'}
            </span>
          </div>
        ))}
        <div className="pt-1 text-center font-mono text-text-muted" style={{ fontSize: 11 }}>
          + 12,403 more
        </div>
      </div>
      <div
        className="flex items-start gap-2 rounded-md"
        style={{ padding: '10px 11px', background: TONE.watch.tint, border: `1px solid ${TONE.watch.border}` }}
      >
        <ShieldCheck size={15} style={{ color: STATUS_BLUE, flex: 'none', marginTop: 1 }} />
        <span className="text-text-silver" style={{ fontSize: 12, lineHeight: 1.35 }}>
          Spine unreachable — DingleBERRY is queuing every write in order. They auto-reconcile when the spine returns.{' '}
          <b className="text-text">No transaction is lost, none settle twice.</b>
        </span>
      </div>
    </DbCard>
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
    danger: { color: DINGLEBERRY_COLOR, background: 'rgba(220,38,38,0.12)', border: `1px solid ${TONE.critical.border}` },
    secondary: { color: 'var(--text-silver, #C8D1DA)', background: 'transparent', border: '1px solid var(--border-bright, #2A3138)' },
    ghost: { color: 'var(--text-muted, #6B7580)', background: 'transparent', border: '1px solid transparent' },
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

/* ============================================================ */
export function TransactionSecurityPage() {
  const { data, posture } = useDingleberry();
  const [selId, setSelId] = useState<string | null>(null);

  const Lock = dbIcon('lock');
  const Radar = dbIcon('radar');
  const Sparkle = dbIcon('sparkle');
  const ShieldCheck = dbIcon('shieldCheck');

  if (!data) {
    return (
      <div className="mx-auto" style={{ maxWidth: 1320, padding: '22px 26px 40px' }}>
        <DbCard className="p-6 text-text-muted">Loading ledger…</DbCard>
      </div>
    );
  }

  const tx = data.transactionSecurity;
  // All open anomalies, worst-first — visibility is independent of posture.
  // (tx.anomByPosture is left unused here; it no longer gates the list.)
  const anomalies = [...(tx.anomalies as unknown as S2Anomaly[])].sort(
    (a, b) => (SEV_RANK[a.sev] ?? 9) - (SEV_RANK[b.sev] ?? 9),
  );

  const sel = anomalies.find((a) => a.id === selId) ?? anomalies[0] ?? null;
  const held = posture === 'critical';
  const secured = posture === 'secure' ? '1,284,902' : posture === 'degraded' ? '1,051,210' : 'HELD';

  const headerStats: [string, string, Tone][] = [
    ['Secured · 24h', secured, held ? 'critical' : 'secure'],
    ['Invariant alarms', String(anomalies.length), anomalies.length ? 'watch' : 'secure'],
    held ? ['Queued for reconcile', '12,408', 'watch'] : ['Demurrage pulled · 24h', '−1.9M', 'secure'],
  ];

  return (
    <div className="mx-auto" style={{ maxWidth: 1320, padding: '22px 26px 40px' }}>
      {/* header */}
      <DbCard className="mb-[18px] p-5">
        <div className="flex flex-wrap items-start gap-[18px]">
          <div
            className="flex flex-none items-center justify-center rounded-md"
            style={{ width: 46, height: 46, background: 'rgba(220,38,38,0.12)', color: DINGLEBERRY_COLOR }}
          >
            <Lock size={23} />
          </div>
          <div className="min-w-[280px] flex-1">
            <Eyebrow>Surface 02 · BLiNG! ledger integrity</Eyebrow>
            <h1 className="font-serif font-bold text-text" style={{ fontSize: 30, lineHeight: 1.05, margin: '3px 0 4px' }}>
              Transaction security
            </h1>
            <div className="text-text-silver" style={{ fontSize: 14.5, maxWidth: 540 }}>
              Guarding the <b>Path A</b> ledger — BLiNG! is earned and freed from the Well, <b>never sold</b>. The
              anomalies are invariant violations.
            </div>
          </div>
          <div className="flex flex-wrap gap-[10px]">
            {headerStats.map(([cap, n, tn]) => (
              <div
                key={cap}
                className="rounded-md border border-border bg-bg-elevated"
                style={{ padding: '10px 14px', minWidth: 104 }}
              >
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
        {/* left: assurance + stream + anomalies */}
        <div className="min-w-0">
          <DbCard className="mb-4 p-5" style={{ borderLeft: `3px solid ${held ? TONE.critical.c : TONE.secure.c}` }}>
            <div className="mb-1 flex flex-wrap items-baseline gap-3">
              <span
                className="font-serif font-bold"
                style={{ fontSize: 40, lineHeight: 1, color: held ? TONE.critical.c : 'var(--text, #F8F9FA)' }}
              >
                {secured === 'HELD' ? 'Writes held' : secured}
              </span>
              {secured !== 'HELD' && (
                <span className="text-text-muted" style={{ fontSize: 15 }}>
                  transactions secured today
                </span>
              )}
            </div>
            <div className="mb-[14px] text-text-muted" style={{ fontSize: 13.5 }}>
              {held
                ? 'Spine unreachable — every write is queued in order for clean reconcile.'
                : anomalies.length
                  ? `${anomalies.length} Path A violations flagged and held · nothing settled`
                  : 'Every freeing traced to a sanctioned path · demurrage flowing · cap intact'}
            </div>
            <div className="mb-[6px] flex items-center gap-2">
              <span className="animate-pulse" style={{ width: 7, height: 7, borderRadius: 99, background: TONE.secure.c }} />
              <Eyebrow>Live ledger stream — verifying</Eyebrow>
            </div>
            <LedgerStream stream={tx.stream} />
          </DbCard>

          <SupplyWell hardCap={tx.hardCap} />

          {anomalies.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-[10px]">
                <Eyebrow>Path A violations — worst-first</Eyebrow>
                <span className="h-px flex-1 bg-border" />
              </div>
              <div className="flex flex-col gap-[9px]">
                {anomalies.map((a) => (
                  <AnomalyRow key={a.id} a={a} active={!!sel && a.id === sel.id} onClick={() => setSelId(a.id)} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* right: reconcile (go dark) + anomaly detail / clean state */}
        <div className="flex flex-col gap-4 self-start lg:sticky lg:top-4">
          {held && <ReconcilePanel />}

          {sel ? (
            <DbCard className="p-5">
              <div className="mb-[10px] flex flex-wrap items-center gap-[9px]">
                <span
                  className={sel.sev === 'critical' ? 'animate-pulse' : ''}
                  style={{ width: 11, height: 11, borderRadius: 99, background: TONE[toneOf(sel.sev)].c }}
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
              <h2 className="font-serif font-bold text-text" style={{ fontSize: 20, lineHeight: 1.1, margin: '0 0 4px' }}>
                {sel.kind}
              </h2>
              <div className="mb-[13px] text-text-silver" style={{ fontSize: 13 }}>
                {sel.detail}
              </div>

              <div className="mb-[13px] grid grid-cols-2 gap-[10px]">
                <div className="rounded-md border border-border bg-bg-elevated" style={{ padding: '9px 11px' }}>
                  <div className="mb-[3px] font-mono uppercase text-text-muted" style={{ fontSize: 9, letterSpacing: '0.08em' }}>
                    Ledger entry
                  </div>
                  <div className="font-mono font-bold tabular-nums text-text" style={{ fontSize: 13 }}>
                    {sel.entry}
                  </div>
                </div>
                <div className="rounded-md border border-border bg-bg-elevated" style={{ padding: '9px 11px' }}>
                  <div className="mb-[3px] font-mono uppercase text-text-muted" style={{ fontSize: 9, letterSpacing: '0.08em' }}>
                    Amount
                  </div>
                  <div className="font-mono font-bold tabular-nums text-text" style={{ fontSize: 13 }}>
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
                <div className="text-center font-mono uppercase text-text-muted" style={{ fontSize: 9, letterSpacing: '0.08em' }}>
                  Enforcement actions wire in Step 4 · post security audit
                </div>
              </div>
            </DbCard>
          ) : (
            <DbCard className="p-5" style={{ borderLeft: `3px solid ${TONE.secure.c}` }}>
              <div className="mb-2 flex items-center gap-[10px]">
                <ShieldCheck size={20} style={{ color: TONE.secure.c }} />
                <span className="font-serif font-bold text-text" style={{ fontSize: 18 }}>
                  Ledger clean
                </span>
              </div>
              <div className="mb-[14px] text-text-silver" style={{ fontSize: 13, lineHeight: 1.4 }}>
                No anomalies open. Every write in the last 24h passed signature, rank and conflict checks. The promise
                holds.
              </div>
              <div className="flex flex-col gap-[9px]">
                {([['Signature checks', '100%'], ['Double-spend conflicts', '0'], ['Rank-gate failures', '0'], ['Mean settle time', '0.4s']] as [string, string][]).map(
                  ([cap, n], i) => (
                    <div
                      key={cap}
                      className="flex items-center justify-between"
                      style={{ paddingBottom: 8, borderBottom: i < 3 ? '1px dashed var(--border, #1F252C)' : 'none' }}
                    >
                      <span className="text-text-muted" style={{ fontSize: 13 }}>
                        {cap}
                      </span>
                      <span className="font-mono font-bold tabular-nums text-text" style={{ fontSize: 13 }}>
                        {n}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </DbCard>
          )}
        </div>
      </div>
    </div>
  );
}
