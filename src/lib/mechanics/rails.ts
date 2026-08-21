/* ============================================================
   DEPTH SHARED MECHANICS — THE MONEY SEAM (PROPOSE-FIRST, STUBBED).

   Dispatch DEPTH_MECH1 (DEPTH_SLATE v1 E3 / CONCEPTS v2 #4/#5/#6). This is the
   ONE settlement + rail-mount shape that every shared mechanic in this folder
   (AUCTION / RAFFLE / TICKETING / STREAM) speaks, object-agnostic: a mechanic
   settles over an opaque `ref` (an atom slug, a listing id, an event id, an ad
   campaign id) and never over a specific table.

   WHY THIS FILE EXISTS SEPARATELY FROM the games engine:
   REBELUTION.games/src/lib/engine/settlement.ts already ships the SAME shape for
   the games floor. This is NOT a fork of it and does NOT import it (the games
   engine is a standalone repo — copy-port pattern, no cross-repo imports). It is
   the GENERALISATION the dispatch asks for: identical `*_settlements` column
   mirror (pot_total / sink_to_source / source_in) so both the games floor and the
   Bazaar/News/Ads/Events mechanics feed the SAME DEPTH BLiNG rail, never a private
   settlement path. See docs/depth-mechanics-rails-mount.md for the coordination
   note the rail (DEPTH_RAILS1) fills in.

   PROPOSE-FIRST. Nothing in this folder moves money. A mechanic computes a
   `SettlementProposal` — a pure preview the UI renders labelled PROPOSED — and the
   live debit/credit/escrow is the DEPTH BLiNG rail's job. The rail is not built
   yet (DEPTH_RAILS1 in flight), so `UNMOUNTED_RAIL` below is the seam: its methods
   throw `RailNotMountedError`. When the rail lands it supplies a real `RailMount`
   and the mechanics are unchanged — mounting is a wiring change, not a code change.

   All amounts are `numeric(20,6)` in the DB. We keep 6-decimal precision and hand
   any rounding remainder to first place, so payouts + sink always equal the pot to
   the micro-unit — never a rounding leak.
   ============================================================ */

/** The two rails. Uppercase, matching how the money engine names them. */
export type Rail = 'BLING' | 'USD';

export const RAILS: readonly Rail[] = ['BLING', 'USD'] as const;

export function isRail(v: unknown): v is Rail {
  return v === 'BLING' || v === 'USD';
}

/** Round to the DB's 6-decimal money precision. */
export function roundMoney(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/* ---------------- The settlement proposal ---------------- */

export interface Payout {
  /** 1 = first place / sole winner. */
  place: number;
  /** The opaque winner ref (bidder, ticket holder, host). `null` when unknown. */
  ref: string | null;
  amount: number;
}

/** One weighted claimant on the payout pool. Weights need not sum to 1. */
export interface Winner {
  ref: string | null;
  /** Relative share of the payout pool. Non-positive weights are dropped. */
  weight: number;
}

export interface SettlementInputs {
  /** Value already in the pot from stakes / bids / ticket sales, pre-source. */
  grossPot: number;
  /** House share in basis points (100 = 1%). Drains to the Well. */
  rakeBps: number;
  /** Optional Source/faucet value seeded INTO the pot (sponsor, seed). Default 0. */
  sourceIn?: number;
  /**
   * The claimants on the payout pool, weighted. Default is a single winner-take-all
   * claimant with an unknown ref (`[{ ref: null, weight: 1 }]`).
   */
  winners?: Winner[];
  /** The rail this settles in — carried through, never converted. */
  rail: Rail;
}

export interface SettlementProposal {
  /** Always true — this object is a proposal, never a persisted settlement. */
  proposed: true;
  rail: Rail;
  /** Total pot after the Source contribution. Mirrors `pot_total`. */
  potTotal: number;
  /** House share that sinks to the Well. Mirrors `sink_to_source`. */
  sinkToSource: number;
  /** Source/faucet value put into the pot. Mirrors `source_in`. */
  sourceIn: number;
  /** Sum paid out to winners (potTotal - sinkToSource). */
  payoutPool: number;
  /** Per-place payouts; sums to `payoutPool` exactly. */
  payouts: Payout[];
  /** Net value the Well gains: what sank minus what it seeded. Can be negative. */
  netToWell: number;
}

const clampBps = (bps: number): number => Math.max(0, Math.min(10000, bps));

/**
 * Split `pool` across weighted winners at 6-decimal precision, giving any rounding
 * remainder to first place so the parts sum to `pool` exactly.
 */
function distribute(pool: number, winners: Winner[]): Payout[] {
  const valid = winners.filter((w) => w.weight > 0);
  if (pool <= 0 || valid.length === 0) return [];
  const total = valid.reduce((s, w) => s + w.weight, 0);

  const raw = valid.map((w) => roundMoney((pool * w.weight) / total));
  const allocated = raw.reduce((s, a) => s + a, 0);
  const remainder = roundMoney(pool - allocated);
  if (raw.length > 0) raw[0] = roundMoney(raw[0] + remainder);

  return raw.map((amount, i) => ({ place: i + 1, ref: valid[i].ref, amount }));
}

/**
 * Propose (do not persist) a settlement. Pure and deterministic. Every mechanic in
 * this folder funnels its pot through here so the shape the rail persists is
 * identical regardless of whether the pot came from an auction, a raffle, a ticket
 * tier, or a stream's tips.
 */
export function proposeSettlement(inputs: SettlementInputs): SettlementProposal {
  const gross = roundMoney(Math.max(0, inputs.grossPot));
  const sourceIn = roundMoney(Math.max(0, inputs.sourceIn ?? 0));
  const winners = inputs.winners?.length ? inputs.winners : [{ ref: null, weight: 1 }];

  const potTotal = roundMoney(gross + sourceIn);
  const sinkToSource = roundMoney((potTotal * clampBps(inputs.rakeBps)) / 10000);
  const payoutPool = roundMoney(potTotal - sinkToSource);
  const payouts = distribute(payoutPool, winners);
  const netToWell = roundMoney(sinkToSource - sourceIn);

  return {
    proposed: true,
    rail: inputs.rail,
    potTotal,
    sinkToSource,
    sourceIn,
    payoutPool,
    payouts,
    netToWell,
  };
}

/** The house-share percentage as a display string, e.g. "8%". */
export function rakePercent(rakeBps: number): string {
  const pct = clampBps(rakeBps) / 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(2)}%`;
}

/* ---------------- The rail-mount seam ---------------- */

/**
 * Raised by every `UNMOUNTED_RAIL` method. Its presence anywhere at runtime means
 * a mechanic tried to move real money before DEPTH_RAILS1 mounted the rail — which
 * in propose-first posture is a bug in the caller, not an expected path.
 */
export class RailNotMountedError extends Error {
  constructor(op: string) {
    super(
      `DEPTH rail not mounted: '${op}' cannot move money yet. Mechanics are propose-first — render the SettlementProposal as PROPOSED and wait for DEPTH_RAILS1 to supply a live RailMount. See docs/depth-mechanics-rails-mount.md.`,
    );
    this.name = 'RailNotMountedError';
  }
}

/** A held stake/bid awaiting settlement or release. Object-agnostic. */
export interface RailHold {
  ref: string;
  /** The party the value is held from (bidder, buyer). */
  fromRef: string;
  amount: number;
  rail: Rail;
}

/** The receipt a live rail returns once it has actually moved value. */
export interface RailReceipt {
  receiptId: string;
  rail: Rail;
  movedAt: string;
}

export interface RailSettleContext {
  /** The mechanic + object being settled, for the ledger memo. */
  ref: string;
  /** Free-form provenance, e.g. `{ mechanic: 'auction', kind: 'english' }`. */
  meta?: Record<string, unknown>;
}

/**
 * The contract DEPTH_RAILS1 fulfils. A mechanic never imports a concrete rail; it
 * takes a `RailMount` (defaulting to `UNMOUNTED_RAIL`) so the live rail is injected
 * exactly once at the app edge when it exists.
 */
export interface RailMount {
  readonly mounted: boolean;
  /** Persist a proposal as real ledger movements (payouts + sink to the Well). */
  settle(proposal: SettlementProposal, ctx: RailSettleContext): Promise<RailReceipt>;
  /** Hold an entry stake or bid in escrow until settle/release. */
  hold(hold: RailHold): Promise<RailReceipt>;
  /** Refund a held amount (cancelled auction, undrawn raffle, ended stream). */
  release(receiptId: string, reason: string): Promise<RailReceipt>;
}

/**
 * The seam's default. Every method throws — nothing in propose-first should call
 * these. When DEPTH_RAILS1 ships a live `RailMount`, swap this at the app edge and
 * the mechanics are untouched.
 */
export const UNMOUNTED_RAIL: RailMount = {
  mounted: false,
  async settle() {
    throw new RailNotMountedError('settle');
  },
  async hold() {
    throw new RailNotMountedError('hold');
  },
  async release() {
    throw new RailNotMountedError('release');
  },
};

/* ---------------- Display ---------------- */

export const RAIL_LABEL: Record<Rail, string> = {
  BLING: 'BLiNG!',
  USD: 'USD',
};

/**
 * Format an amount in a rail's own convention. BLiNG! shows the mark; USD shows a
 * dollar sign. Amounts are `numeric(20,6)` — trim trailing zeros for display but
 * never round money in logic (that is `proposeSettlement`'s job).
 */
export function formatAmount(amount: number, rail: Rail): string {
  if (rail === 'USD') {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  const n = amount.toLocaleString('en-US', { maximumFractionDigits: 6 });
  return `${n} BLiNG!`;
}
