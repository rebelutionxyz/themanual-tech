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

/* ---- the hook ------------------------------------------------------------ */
export function useFreedomblingsBalance(): FbBalance {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<FbBalance>(EMPTY);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !supabase) {
      setState({ ...EMPTY, status: 'signed-out' });
      return;
    }
    let alive = true;
    const client = supabase;
    async function load() {
      const [lotsRes, txRes] = await Promise.all([
        client
          .from('bling_lots')
          .select('amount_remaining')
          .eq('bee_id', user!.id)
          .eq('status', 'active'),
        client
          .from('bling_transactions')
          .select('id, type, amount, counterparty, memo, created_at')
          .eq('bee_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(60),
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
      });
    }
    load();
    return () => {
      alive = false;
    };
  }, [authLoading, user]);

  return state;
}
