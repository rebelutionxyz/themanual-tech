/* ============================================================
   RAFFLE — object-agnostic ticketed-draw primitive.

   DEPTH_MECH1 / CONCEPTS v2 #5. One engine, mounted by Bazaar (giveaway lots),
   News (subscriber draws), Events (door prizes), Games (the HoneyPOT floor) alike.
   It runs over an opaque `ref` and knows nothing of what is being raffled.

   PURE + PROPOSE-FIRST. Entry accounting and the DRAW are pure and deterministic:
   given the same entrant set and the same published `seed`, every party recomputes
   the same winners (rng.ts) — the draw is auditable, never a black box. `settle`
   returns a `SettlementProposal` (rails.ts) and moves NO money; ticket GETs and the
   payout land when DEPTH_RAILS1 mounts.

   The games floor's HoneyPOT already ships a raffle in its own repo (copy-port, no
   cross-repo import). This is the shared generalisation it converges on: the SAME
   settlement shape, so both feed the one DEPTH rail rather than a private pot.
   ============================================================ */

import { type Rail, type SettlementProposal, proposeSettlement, roundMoney } from './rails';
import { seededRandom, weightedDrawWithoutReplacement } from './rng';

export interface RaffleConfig {
  /** The object being raffled (lot id, campaign id, session id, ...). */
  ref: string;
  rail: Rail;
  /** Price per ticket. */
  ticketPrice: number;
  /** House share in basis points, sinks to the Well on settle. */
  rakeBps: number;
  /** How many distinct winners are drawn. Default 1. */
  winnersCount?: number;
  /**
   * Payout weights across the drawn places (need not sum to 1). Default single
   * winner-take-all `[1]`. `[0.7, 0.2, 0.1]` pays a top-three.
   */
  prizeSplit?: number[];
  /** Optional Source/faucet seed added into the prize pot. Default 0. */
  sourceIn?: number;
  /** Hard cap on total tickets across all entrants. Omit for uncapped. */
  maxTickets?: number;
  /** Cap on tickets a single entrant may hold. Omit for uncapped. */
  perEntrantCap?: number;
}

export interface RaffleEntry {
  entrantRef: string;
  tickets: number;
}

export interface RaffleState {
  config: RaffleConfig;
  /** One row per distinct entrant; `tickets` is their running total. */
  entries: RaffleEntry[];
}

export type EntryRejection = 'non-positive-qty' | 'exceeds-total-cap' | 'exceeds-entrant-cap';

export type EntryResult =
  | { ok: true; state: RaffleState; entrantTickets: number }
  | { ok: false; reason: EntryRejection };

export function openRaffle(config: RaffleConfig): RaffleState {
  return { config, entries: [] };
}

export function totalTickets(state: RaffleState): number {
  return state.entries.reduce((s, e) => s + e.tickets, 0);
}

/** Gross pot from ticket sales, before any Source seed. */
export function grossPot(state: RaffleState): number {
  return roundMoney(totalTickets(state) * state.config.ticketPrice);
}

/**
 * Add tickets for an entrant (creating or incrementing their row). Pure: returns a
 * new state on success, a typed reason on rejection. Caps are enforced against the
 * resulting totals.
 */
export function enterRaffle(state: RaffleState, entry: RaffleEntry): EntryResult {
  const qty = Math.floor(entry.tickets);
  if (!(qty > 0)) return { ok: false, reason: 'non-positive-qty' };

  const { maxTickets, perEntrantCap } = state.config;
  if (maxTickets != null && totalTickets(state) + qty > maxTickets) {
    return { ok: false, reason: 'exceeds-total-cap' };
  }

  const existing = state.entries.find((e) => e.entrantRef === entry.entrantRef);
  const entrantTickets = (existing?.tickets ?? 0) + qty;
  if (perEntrantCap != null && entrantTickets > perEntrantCap) {
    return { ok: false, reason: 'exceeds-entrant-cap' };
  }

  const entries = existing
    ? state.entries.map((e) =>
        e.entrantRef === entry.entrantRef ? { ...e, tickets: entrantTickets } : e,
      )
    : [...state.entries, { entrantRef: entry.entrantRef, tickets: qty }];

  return { ok: true, state: { ...state, entries }, entrantTickets };
}

export interface RaffleWinner {
  place: number;
  entrantRef: string;
}

export interface DrawResult {
  seed: string;
  winners: RaffleWinner[];
}

/**
 * Draw distinct winners weighted by ticket count, deterministically from `seed`.
 * Draws `min(winnersCount, distinct entrants)` places. Pure and reproducible.
 */
export function drawRaffle(state: RaffleState, seed: string): DrawResult {
  const count = Math.max(1, Math.floor(state.config.winnersCount ?? 1));
  const rand = seededRandom(seed);
  const weights = state.entries.map((e) => e.tickets);
  const idx = weightedDrawWithoutReplacement(weights, count, rand);
  return {
    seed,
    winners: idx.map((i, place) => ({ place: place + 1, entrantRef: state.entries[i].entrantRef })),
  };
}

/**
 * PROPOSE (do not persist) the raffle's settlement. Pot = ticket sales + Source
 * seed; winners are the drawn entrants weighted by `prizeSplit`; the rake sinks to
 * the Well. Returns `null` when nobody was drawn (no eligible entrants).
 */
export function proposeRaffleSettlement(
  state: RaffleState,
  draw: DrawResult,
): SettlementProposal | null {
  if (draw.winners.length === 0) return null;
  const split = state.config.prizeSplit?.length ? state.config.prizeSplit : [1];
  const winners = draw.winners.map((w, i) => ({ ref: w.entrantRef, weight: split[i] ?? 0 }));

  return proposeSettlement({
    grossPot: grossPot(state),
    rakeBps: state.config.rakeBps,
    sourceIn: state.config.sourceIn,
    winners,
    rail: state.config.rail,
  });
}
