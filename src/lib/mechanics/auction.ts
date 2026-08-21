/* ============================================================
   AUCTION — object-agnostic ascending (English) auction primitive.

   DEPTH_MECH1 / CONCEPTS v2 #4. One engine, mounted by Bazaar (listing auctions),
   News (headline slots), Ads (placement bids), Events (charity lots) alike. It runs
   over an opaque `ref` — it does not know or care what is being auctioned.

   PURE + PROPOSE-FIRST. `placeBid` / `close` are pure state transitions (they take
   the clock as input, never read it), so a caller can replay a bid history and get
   the same board every time. `settle` returns a `SettlementProposal` (rails.ts) and
   moves NO money — the seller's payout and the Well rake land when DEPTH_RAILS1
   mounts. The winning bidder's stake is what a live rail would `hold`; here it is
   only proposed.
   ============================================================ */

import {
  proposeSettlement,
  roundMoney,
  type Rail,
  type SettlementProposal,
} from './rails';

export type AuctionStatus = 'open' | 'closed';

export interface AntiSnipe {
  /** A bid landing within this many seconds of the end extends the auction. */
  windowSec: number;
  /** How many seconds to push the end out by when a late bid lands. */
  extendSec: number;
}

export interface AuctionConfig {
  /** The object under auction (listing id, slot id, campaign id, ...). */
  ref: string;
  /** Who receives the payout pool — the object's owner/seller. */
  sellerRef: string;
  rail: Rail;
  /** Opening price; the first bid must meet it. */
  startPrice: number;
  /** Minimum raise over the standing high bid. */
  minIncrement: number;
  /** Hidden floor; below it the auction is a NO-SALE even with bids. Default 0. */
  reserve?: number;
  /** House share in basis points, sinks to the Well on settle. */
  rakeBps: number;
  /** Scheduled end (ISO 8601). Anti-snipe can push it later. */
  endsAt: string;
  /** Optional late-bid extension. Omit for a hard close. */
  antiSnipe?: AntiSnipe;
}

export interface Bid {
  bidderRef: string;
  amount: number;
  /** When the bid was placed (ISO 8601). */
  at: string;
}

export interface AuctionState {
  config: AuctionConfig;
  status: AuctionStatus;
  /** Full ordered bid history, oldest first. */
  bids: Bid[];
  /** Live end, moved forward by anti-snipe extensions. */
  endsAt: string;
}

export type BidRejection =
  | 'auction-closed'
  | 'after-end'
  | 'below-start'
  | 'below-min-increment'
  | 'self-outbid'
  | 'non-positive';

export type BidResult =
  | { ok: true; state: AuctionState; extended: boolean }
  | { ok: false; reason: BidRejection };

/** Fresh auction from a config. */
export function openAuction(config: AuctionConfig): AuctionState {
  return { config, status: 'open', bids: [], endsAt: config.endsAt };
}

/** The standing high bid, or `null` before any bid. */
export function highBid(state: AuctionState): Bid | null {
  return state.bids.length ? state.bids[state.bids.length - 1] : null;
}

/** The smallest amount a new bid must reach to be valid right now. */
export function nextValidBid(state: AuctionState): number {
  const high = highBid(state);
  if (!high) return roundMoney(state.config.startPrice);
  return roundMoney(high.amount + state.config.minIncrement);
}

function withinSnipeWindow(state: AuctionState, at: string): boolean {
  const snipe = state.config.antiSnipe;
  if (!snipe) return false;
  const remainingMs = Date.parse(state.endsAt) - Date.parse(at);
  return remainingMs > 0 && remainingMs <= snipe.windowSec * 1000;
}

/**
 * Validate and apply a bid. Pure: returns a new state on success, a typed reason on
 * rejection. Anti-snipe extension is applied to the returned state's `endsAt`.
 */
export function placeBid(state: AuctionState, bid: Bid): BidResult {
  if (state.status !== 'open') return { ok: false, reason: 'auction-closed' };
  if (!(bid.amount > 0)) return { ok: false, reason: 'non-positive' };
  if (Date.parse(bid.at) > Date.parse(state.endsAt)) return { ok: false, reason: 'after-end' };

  const high = highBid(state);
  if (!high) {
    if (bid.amount < state.config.startPrice) return { ok: false, reason: 'below-start' };
  } else {
    if (high.bidderRef === bid.bidderRef) return { ok: false, reason: 'self-outbid' };
    if (bid.amount < roundMoney(high.amount + state.config.minIncrement)) {
      return { ok: false, reason: 'below-min-increment' };
    }
  }

  const extended = withinSnipeWindow(state, bid.at);
  const endsAt = extended
    ? new Date(Date.parse(state.endsAt) + state.config.antiSnipe!.extendSec * 1000).toISOString()
    : state.endsAt;

  return {
    ok: true,
    extended,
    state: {
      ...state,
      bids: [...state.bids, { ...bid, amount: roundMoney(bid.amount) }],
      endsAt,
    },
  };
}

export interface AuctionOutcome {
  status: 'closed';
  /** True when the reserve was met and there is a winner. */
  sold: boolean;
  winner: Bid | null;
  /** Price the winner pays — the standing high bid. `null` on a no-sale. */
  clearingPrice: number | null;
  reserveMet: boolean;
}

/** Close the auction and read its outcome. Pure; does not settle money. */
export function closeAuction(state: AuctionState): { state: AuctionState; outcome: AuctionOutcome } {
  const high = highBid(state);
  const reserve = state.config.reserve ?? 0;
  const reserveMet = high != null && high.amount >= reserve;
  const sold = reserveMet && high != null;

  return {
    state: { ...state, status: 'closed' },
    outcome: {
      status: 'closed',
      sold,
      winner: sold ? high : null,
      clearingPrice: sold ? high!.amount : null,
      reserveMet,
    },
  };
}

/**
 * PROPOSE (do not persist) the auction's settlement. The winning bid is the pot; the
 * seller is the sole payout claimant; the rake sinks to the Well. Returns `null` on a
 * no-sale (nothing to settle). A live rail would `hold` the winner's bid on placement
 * and `settle` this proposal at close.
 */
export function proposeAuctionSettlement(
  config: AuctionConfig,
  outcome: AuctionOutcome,
): SettlementProposal | null {
  if (!outcome.sold || outcome.clearingPrice == null) return null;
  return proposeSettlement({
    grossPot: outcome.clearingPrice,
    rakeBps: config.rakeBps,
    winners: [{ ref: config.sellerRef, weight: 1 }],
    rail: config.rail,
  });
}
