import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
/* ============================================================================
   FreedomBLiNGS — live own-ledger data (Slice 1, Balance).
   ----------------------------------------------------------------------------
   Reads the signed-in Bee's REAL data under the existing owner-read RLS — no RPC
   needed:
     · balance  = Σ amount_remaining of their active bling_lots
     · this season (FREEd / GOT / GAVE) = Σ from their bling_transactions
     · recent movement = latest own bling_transactions
   STRING DISCIPLINE (the Sacred-Sum rule, same as S02): every amount is
   numeric(24,6) and arrives as a STRING. We NEVER Number() them — sums are done
   in BigInt micro-units (1 BLiNG! = 1,000,000 FNU) and formatted back to strings.
   Genesis truth: a Bee with no lots reads 0.000000 — rendered with dignity.

   Transaction-type buckets are read from the LIVE taxonomy
   (active_membership_check, 2026-06-09), not from memory.
   ============================================================================ */
import { useEffect, useState } from 'react';

/* ---- BigInt decimal math (micro-units = FNU) ----------------------------- */
const MICROS = 1_000_000n;

/** A numeric(.,6) decimal string → signed BigInt micro-units (FNU). */
export function toMicros(dec: string | number | null | undefined): bigint {
  const s = String(dec ?? '0').trim();
  if (!s) return 0n;
  const neg = s.startsWith('-');
  const body = neg ? s.slice(1) : s;
  const [intPart = '0', fracRaw = ''] = body.split('.');
  const frac = `${fracRaw}000000`.slice(0, 6);
  const micros = BigInt(intPart || '0') * MICROS + BigInt(frac || '0');
  return neg ? -micros : micros;
}

/** Sum decimal strings (as magnitudes) → BigInt micro-units. */
function sumMagnitudes(decs: (string | number)[]): bigint {
  return decs.reduce<bigint>((acc, d) => {
    const m = toMicros(d);
    return acc + (m < 0n ? -m : m);
  }, 0n);
}

/** BigInt micro-units → 'X,XXX.XXXXXX' (grouped integer · 6 decimals). */
export function fmtMicros(micros: bigint): string {
  const neg = micros < 0n;
  const m = neg ? -micros : micros;
  const intPart = m / MICROS;
  const frac = (m % MICROS).toString().padStart(6, '0');
  const grouped = intPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${neg ? '-' : ''}${grouped}.${frac}`;
}

/** Like fmtMicros but drops a .000000 tail — for whole-BLiNG! economy aggregates
    (cap, well, ops). Keeps 6 decimals only when the fraction is non-zero. */
export function fmtBling(micros: bigint): string {
  const full = fmtMicros(micros);
  return full.endsWith('.000000') ? full.slice(0, -7) : full;
}

/* ---- transaction taxonomy → member-facing meaning ------------------------ */
// FREEd = newly FREE'd into the Bee's ledger (issuance).
const FREED_TYPES = new Set([
  'free',
  'newbee_bonus',
  'drops',
  'drips',
  'drips_royalty',
  'affiliate',
  'competition_source_reward',
  'competition_payout',
]);

interface TypeMeta {
  kind: 'freed' | 'got' | 'given' | 'offer';
  dir: 'pos' | 'neg';
  label: string;
}
const TYPE_META: Record<string, TypeMeta> = {
  free: { kind: 'freed', dir: 'pos', label: 'FREEd into your ledger' },
  newbee_bonus: { kind: 'freed', dir: 'pos', label: 'Welcome FREE — newbee grant' },
  drops: { kind: 'freed', dir: 'pos', label: 'FREEd — Drops for productive action' },
  drips: { kind: 'freed', dir: 'pos', label: 'FREEd — Drips for a popular contribution' },
  drips_royalty: { kind: 'freed', dir: 'pos', label: 'FREEd — Drips royalty' },
  affiliate: { kind: 'freed', dir: 'pos', label: 'FREEd — lineage credit' },
  competition_source_reward: { kind: 'freed', dir: 'pos', label: 'FREEd — source reward' },
  competition_payout: { kind: 'freed', dir: 'pos', label: 'FREEd — competition payout' },
  send_credit: { kind: 'got', dir: 'pos', label: 'GOT from a member' },
  send_debit: { kind: 'given', dir: 'neg', label: 'GAVE to a member' },
  escrow_release: { kind: 'got', dir: 'pos', label: 'Released to you from escrow' },
  escrow_unlock: { kind: 'got', dir: 'pos', label: 'Escrow unlocked to you' },
  escrow_cancel: { kind: 'got', dir: 'pos', label: 'Escrow returned' },
  atlasoracle_escrow_withdraw: { kind: 'got', dir: 'pos', label: 'AtlasOracle escrow withdrawn' },
  escrow_hold: { kind: 'given', dir: 'neg', label: 'Placed into escrow' },
  competition_stake_escrow: { kind: 'given', dir: 'neg', label: 'Staked into a competition' },
  affiliate_clawback: { kind: 'given', dir: 'neg', label: 'Lineage clawback' },
  atlasoracle_escrow_deposit: { kind: 'given', dir: 'neg', label: 'AtlasOracle escrow deposit' },
};
function metaFor(type: string): TypeMeta {
  return TYPE_META[type] ?? { kind: 'got', dir: 'pos', label: type };
}

/** magnitude (absolute) of a decimal string in micro-units. */
function absMicros(amount: string | number): bigint {
  const m = toMicros(amount);
  return m < 0n ? -m : m;
}

export const TAG_LABEL: Record<string, string> = {
  freed: 'FREEd',
  got: 'GOT',
  given: 'GAVE',
  offer: 'OFFER',
};

/* ---- shapes -------------------------------------------------------------- */
export interface MovementRow {
  id: string;
  kind: 'freed' | 'got' | 'given' | 'offer';
  dir: 'pos' | 'neg';
  desc: string;
  who: string;
  amt: string; // formatted magnitude, 6 decimals
  when: string; // 'D MMM' relative-ish
}

export interface FbBalance {
  status: 'loading' | 'signed-out' | 'live' | 'unavailable';
  balance: string; // formatted, 6 decimals
  freed: string;
  got: string;
  gave: string;
  // bar fills (0-100), proportional to the max of the three — real proportions, not the design's illustrative widths
  freedPct: number;
  gotPct: number;
  gavePct: number;
  recent: MovementRow[];
  inGoodComb: boolean; // bling_deficit nets to zero — drives the standing badge
}

const ZERO = '0.000000';
const EMPTY: FbBalance = {
  status: 'loading',
  balance: ZERO,
  freed: ZERO,
  got: ZERO,
  gave: ZERO,
  freedPct: 0,
  gotPct: 0,
  gavePct: 0,
  recent: [],
  inGoodComb: true,
};

function pctOf(v: bigint, max: bigint): number {
  if (max <= 0n) return 0;
  // ratio is bounded 0..1 → safe to Number
  return Number((v * 10000n) / max) / 100;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function whenLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/* ---- mutation signal ----------------------------------------------------- */
// There is no global query cache here (the read hooks own their own state), so a
// write surface (GIVE) calls notifyLedgerChanged() after a confirmed bling_send
// to make every mounted Balance/Ledger hook refetch immediately — the new row
// and balance land without a manual reload.
const ledgerListeners = new Set<() => void>();
export function notifyLedgerChanged(): void {
  for (const cb of ledgerListeners) cb();
}
function useLedgerVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    const cb = () => setV((x) => x + 1);
    ledgerListeners.add(cb);
    return () => {
      ledgerListeners.delete(cb);
    };
  }, []);
  return v;
}

/* ---- the hook ------------------------------------------------------------ */
export function useFreedomblingsBalance(): FbBalance {
  const { user, loading: authLoading } = useAuth();
  const version = useLedgerVersion();
  const [state, setState] = useState<FbBalance>(EMPTY);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `version` is a deliberate refetch trigger — bumped by notifyLedgerChanged() after a write; not read in the body.
  useEffect(() => {
    if (authLoading) return;
    if (!user || !supabase) {
      setState({ ...EMPTY, status: 'signed-out' });
      return;
    }
    let alive = true;
    const client = supabase;
    async function load() {
      const [lotsRes, txRes, beeRes] = await Promise.all([
        client
          .from('bling_lots')
          // ::text — numeric past 2^53 is clipped by PostgREST's JSON before String()
          .select('amount_remaining::text')
          .eq('bee_id', user!.id)
          .eq('status', 'active'),
        client
          .from('bling_transactions')
          .select('id, type, amount::text, counterparty, memo, created_at')
          .eq('bee_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(60),
        // Standing health for the badge — deficit can exceed 2^53, so ::text.
        client
          .from('bees')
          .select('bling_deficit::text')
          .eq('id', user!.id)
          .maybeSingle(),
      ]);
      if (!alive) return;
      if (lotsRes.error || txRes.error) {
        setState({ ...EMPTY, status: 'unavailable' });
        return;
      }
      // biome-ignore lint/suspicious/noExplicitAny: untyped DB client rows → narrowed below
      const lots = (lotsRes.data ?? []) as any[];
      // biome-ignore lint/suspicious/noExplicitAny: untyped DB client rows → narrowed below
      const txs = (txRes.data ?? []) as any[];
      // biome-ignore lint/suspicious/noExplicitAny: untyped DB row → narrowed below
      const bee = (beeRes.data ?? null) as any;
      // Default to in-good-standing if the deficit read missed — never accuse falsely.
      const inGoodComb = beeRes.error ? true : toMicros(String(bee?.bling_deficit ?? '0')) === 0n;

      const balMicros = sumMagnitudes(lots.map((l) => String(l.amount_remaining)));

      // "this season" = the current vintage year (UTC), matching bling_lots.vintage.
      const year = String(new Date().getUTCFullYear());
      const seasonTxs = txs.filter((t) => String(t.created_at).slice(0, 4) === year);
      const freedMicros = sumMagnitudes(
        seasonTxs.filter((t) => FREED_TYPES.has(t.type)).map((t) => t.amount),
      );
      const gotMicros = sumMagnitudes(
        seasonTxs.filter((t) => t.type === 'send_credit').map((t) => t.amount),
      );
      const gaveMicros = sumMagnitudes(
        seasonTxs.filter((t) => t.type === 'send_debit').map((t) => t.amount),
      );
      const maxMicros =
        freedMicros > gotMicros
          ? freedMicros > gaveMicros
            ? freedMicros
            : gaveMicros
          : gotMicros > gaveMicros
            ? gotMicros
            : gaveMicros;

      const recent: MovementRow[] = txs.slice(0, 6).map((t) => {
        const m = metaFor(t.type);
        const mag = toMicros(t.amount);
        return {
          id: String(t.id),
          kind: m.kind,
          dir: m.dir,
          desc: t.memo || m.label,
          who: t.counterparty || (m.kind === 'freed' ? 'Productive action' : ''),
          amt: fmtMicros(mag < 0n ? -mag : mag),
          when: whenLabel(t.created_at),
        };
      });

      setState({
        status: 'live',
        balance: fmtMicros(balMicros),
        freed: fmtMicros(freedMicros),
        got: fmtMicros(gotMicros),
        gave: fmtMicros(gaveMicros),
        freedPct: pctOf(freedMicros, maxMicros),
        gotPct: pctOf(gotMicros, maxMicros),
        gavePct: pctOf(gaveMicros, maxMicros),
        recent,
        inGoodComb,
      });
    }
    load();
    return () => {
      alive = false;
    };
  }, [authLoading, user, version]);

  return state;
}

/* ============================================================================
   THE LEDGER (Slice 2) — grouped-by-day own history + running balance.
   ============================================================================ */
const MONTHS_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Raw own-tx fields a Provenance trace needs. */
export interface ProvTx {
  id: string;
  type: string;
  amount: string; // raw numeric string
  counterparty: string | null;
  memo: string | null;
  created_at: string;
}

export interface LedgerTx {
  id: string;
  kind: 'freed' | 'got' | 'given' | 'offer';
  dir: 'pos' | 'neg';
  desc: string;
  who: string;
  amt: string; // formatted magnitude
  run: string; // formatted running balance AFTER this tx
  tx: ProvTx;
}

export interface LedgerDay {
  day: string;
  sum: string; // signed net for the day, e.g. '+ 370' / '− 90'
  rows: LedgerTx[];
}

export interface LedgerState {
  status: 'loading' | 'signed-out' | 'live' | 'unavailable';
  groups: LedgerDay[];
  balance: string;
  weekDelta: string; // signed, last 7 days
}

const LEDGER_INITIAL: LedgerState = {
  status: 'loading',
  groups: [],
  balance: ZERO,
  weekDelta: '+ 0.000000',
};

function signedFmt(micros: bigint): string {
  const neg = micros < 0n;
  const body = fmtMicros(neg ? -micros : micros);
  return `${neg ? '−' : '+'} ${body}`;
}

function dayLabel(iso: string, todayKey: string, yesterdayKey: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const tail = `${d.getUTCDate()} ${MONTHS_FULL[d.getUTCMonth()]}`;
  const key = iso.slice(0, 10);
  if (key === todayKey) return `Today · ${tail}`;
  if (key === yesterdayKey) return `Yesterday · ${tail}`;
  return tail;
}

export function useFreedomblingsLedger(): LedgerState {
  const { user, loading: authLoading } = useAuth();
  const version = useLedgerVersion();
  const [state, setState] = useState<LedgerState>(LEDGER_INITIAL);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `version` is a deliberate refetch trigger — bumped by notifyLedgerChanged() after a write; not read in the body.
  useEffect(() => {
    if (authLoading) return;
    if (!user || !supabase) {
      setState({ ...LEDGER_INITIAL, status: 'signed-out' });
      return;
    }
    let alive = true;
    const client = supabase;
    async function load() {
      const [lotsRes, txRes] = await Promise.all([
        client
          .from('bling_lots')
          // ::text — numeric past 2^53 is clipped by PostgREST's JSON before String()
          .select('amount_remaining::text')
          .eq('bee_id', user!.id)
          .eq('status', 'active'),
        client
          .from('bling_transactions')
          .select('id, type, amount::text, counterparty, memo, created_at, balance_after::text')
          .eq('bee_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(200),
      ]);
      if (!alive) return;
      if (lotsRes.error || txRes.error) {
        setState({ ...LEDGER_INITIAL, status: 'unavailable' });
        return;
      }
      // biome-ignore lint/suspicious/noExplicitAny: untyped DB rows → narrowed below
      const lots = (lotsRes.data ?? []) as any[];
      // biome-ignore lint/suspicious/noExplicitAny: untyped DB rows → narrowed below
      const txs = (txRes.data ?? []) as any[];

      const balMicros = sumMagnitudes(lots.map((l) => String(l.amount_remaining)));

      // Running balance: prefer the authoritative per-row balance_after column
      // (populated by the write paths — exact). Fall back to backward
      // reconstruction (from the live total through signed deltas) only for rows
      // whose balance_after is still null; an authoritative row re-anchors the
      // reconstruction for the older rows below it.
      let runningAfter = balMicros;
      const rows: LedgerTx[] = txs.map((t) => {
        const m = metaFor(t.type);
        const mag = absMicros(t.amount);
        const delta = m.dir === 'pos' ? mag : -mag;
        const ba = t.balance_after;
        const hasBA = ba !== null && ba !== undefined && String(ba).trim() !== '';
        const runMicros = hasBA ? toMicros(String(ba)) : runningAfter;
        // anchor for the next (older) row = this row's before-balance
        runningAfter = runMicros - delta;
        return {
          id: String(t.id),
          kind: m.kind,
          dir: m.dir,
          desc: t.memo || m.label,
          who: t.counterparty || (m.kind === 'freed' ? 'Productive action' : ''),
          amt: fmtMicros(mag),
          run: fmtMicros(runMicros),
          tx: {
            id: String(t.id),
            type: t.type,
            amount: String(t.amount),
            counterparty: t.counterparty ?? null,
            memo: t.memo ?? null,
            created_at: String(t.created_at),
          },
        };
      });

      // group by UTC day (newest first; oldest last within a group)
      const now = new Date();
      const todayKey = now.toISOString().slice(0, 10);
      const yesterdayKey = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);
      const weekAgoIso = new Date(now.getTime() - 7 * 86_400_000).toISOString();

      const groups: LedgerDay[] = [];
      let weekMicros = 0n;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const t = txs[i];
        const delta = r.dir === 'pos' ? absMicros(t.amount) : -absMicros(t.amount);
        if (t.created_at >= weekAgoIso) weekMicros += delta;
        const label = dayLabel(String(t.created_at), todayKey, yesterdayKey);
        let g = groups[groups.length - 1];
        if (!g || g.day !== label) {
          g = { day: label, sum: '+ 0.000000', rows: [] };
          groups.push(g);
        }
        g.rows.push(r);
      }
      // day sums (signed net per group)
      for (const g of groups) {
        let net = 0n;
        for (const r of g.rows) net += r.dir === 'pos' ? toMicros(r.amt) : -toMicros(r.amt);
        g.sum = signedFmt(net);
      }

      setState({
        status: 'live',
        groups,
        balance: fmtMicros(balMicros),
        weekDelta: signedFmt(weekMicros),
      });
    }
    load();
    return () => {
      alive = false;
    };
  }, [authLoading, user, version]);

  return state;
}

/* ============================================================================
   PROVENANCE (Slice 2) — LIVE-HONEST. Renders only what the Bee's OWN records
   prove. Issuance resolves to the well (+ the originating own-lot when it can be
   tightly matched — there is no tx↔lot FK, so we match on amount + a ±2-min
   freed_at window and only claim a lot on a UNIQUE hit). Cross-member hops are
   RLS-blocked by design (privacy); we say so honestly rather than fabricate.
   ============================================================================ */
export interface ProvNode {
  kind: 'origin' | 'now' | 'beyond';
  tag?: string;
  when?: string;
  amt?: string;
  desc: string;
  who?: string;
}

export interface ResolvedLot {
  origin: string;
  vintage: string;
  dnaCode: string;
  sealed: boolean;
}

export interface ProvState {
  status: 'loading' | 'ready';
  nodes: ProvNode[];
  lot: ResolvedLot | null;
  isIssuance: boolean;
}

function fullWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()} ${MONTHS_FULL[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function useProvenance(tx: ProvTx): ProvState {
  const { user } = useAuth();
  const [state, setState] = useState<ProvState>({
    status: 'loading',
    nodes: [],
    lot: null,
    isIssuance: false,
  });

  useEffect(() => {
    const meta = metaFor(tx.type);
    const isIssuance = FREED_TYPES.has(tx.type);
    const amtFmt = fmtMicros(absMicros(tx.amount));
    const when = fullWhen(tx.created_at);
    const who = tx.counterparty || (isIssuance ? 'The HoneyComb · the well' : '');
    const desc = tx.memo || meta.label;

    // the "now" node — always present: what rests in the Bee's own ledger today.
    const nowNode: ProvNode = {
      kind: 'now',
      desc: meta.dir === 'neg' ? `${desc} — it now rests in another member's ledger` : desc,
      who: tx.counterparty || undefined,
      amt: amtFmt,
      when: 'now',
    };

    const nodes: ProvNode[] = [];
    if (isIssuance) {
      nodes.push({
        kind: 'origin',
        tag: 'FREEd',
        desc: meta.label,
        who,
        amt: amtFmt,
        when,
      });
      nodes.push(nowNode);
    } else if (meta.dir === 'pos') {
      // GOT from a member / escrow — upstream is another's private record.
      nodes.push({
        kind: 'beyond',
        desc: 'Trail continues beyond your ledger — this BLiNG! reached you from another member. Their upstream lineage is private; disclosure arrives with the consent model.',
      });
      nodes.push(nowNode);
    } else {
      // GAVE / placed — it now lives in the counterparty's private ledger.
      nodes.push(nowNode);
      nodes.push({
        kind: 'beyond',
        desc: 'Trail continues beyond your ledger — the onward lineage is the recipient’s to disclose, under the consent model.',
      });
    }

    if (!isIssuance || !user || !supabase) {
      setState({ status: 'ready', nodes, lot: null, isIssuance });
      return;
    }

    let alive = true;
    const client = supabase;
    async function resolveLot() {
      // Tight, honest match: same amount, born within ±2 min of the tx. Only
      // claim a lot on a UNIQUE hit (no tx↔lot FK yet).
      const created = new Date(tx.created_at).getTime();
      const lo = new Date(created - 120_000).toISOString();
      const hi = new Date(created + 120_000).toISOString();
      const { data, error } = await client
        .from('bling_lots')
        // ::text on the numerics (2^53 clip guard); the .eq filter below compares
        // tx.amount (string) against the DB-side numeric — that comparison is fine.
        .select(
          'origin, vintage, dna, sealed_multiplier::text, sealed_revealed, amount_original::text',
        )
        .eq('bee_id', user!.id)
        .eq('amount_original', tx.amount)
        .gte('freed_at', lo)
        .lte('freed_at', hi);
      if (!alive) return;
      // biome-ignore lint/suspicious/noExplicitAny: untyped DB rows
      const matches = (error ? [] : (data ?? [])) as any[];
      let lot: ResolvedLot | null = null;
      if (matches.length === 1) {
        const l = matches[0];
        const named = l.dna?.naming?.display as string | undefined;
        lot = {
          origin: String(l.origin),
          vintage: String(l.vintage),
          dnaCode: named || `DROP·${l.vintage}·${String(l.origin).toUpperCase()}`,
          sealed: l.sealed_revealed === false && l.sealed_multiplier != null,
        };
      }
      setState({ status: 'ready', nodes, lot, isIssuance });
    }
    resolveLot();
    return () => {
      alive = false;
    };
  }, [tx, user]);

  return state;
}
