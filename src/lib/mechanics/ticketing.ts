/* ============================================================
   TICKETING — object-agnostic ticket-issuance primitive.

   DEPTH_MECH1 / CONCEPTS v2 #6. One engine, mounted by Events (admission), Bazaar
   (timed entries), News (paywalled live coverage), Games (bingo/arcade seats) alike.
   It issues tickets against an opaque `ref` and knows nothing of the object.

   Tiers with per-tier quantity caps and per-buyer limits, on-sale windows, and a
   QR-READY token per issued ticket. PURE + PROPOSE-FIRST: issuance and availability
   are pure state transitions; the GET (paid tiers) is a `SettlementProposal`
   (rails.ts) that moves NO money until DEPTH_RAILS1 mounts. Free tiers (RSVP) issue
   with no settlement.

   NOTE ON THE QR TOKEN: it is a stable, encodable identifier ready for a QR
   encoder — NOT a security credential. Cryptographic scan-validation (signing,
   single-use redemption) is the rail/verification pass's job; this primitive only
   guarantees a deterministic, checksummed token shape. No secret is embedded (there
   is none to embed client-side).
   ============================================================ */

import { type Rail, type SettlementProposal, proposeSettlement, roundMoney } from './rails';
import { hashSeed } from './rng';

export interface TicketTier {
  id: string;
  name: string;
  /** Price per ticket in the config rail. 0 = free (RSVP). */
  price: number;
  /** Total tickets available in this tier. Omit for unlimited. */
  quantity?: number;
  /** Max tickets one buyer may hold in this tier. Omit for unlimited. */
  perBuyerLimit?: number;
  /** Optional perks line(s) shown on the tier. */
  perks?: string[];
  /** Sales window (ISO 8601). Omit either bound to leave it open on that side. */
  salesStart?: string;
  salesEnd?: string;
}

export interface TicketingConfig {
  /** The object tickets admit to (event id, session id, ...). */
  ref: string;
  rail: Rail;
  /** Who receives ticket proceeds — the organizer/owner. */
  beneficiaryRef: string;
  /** Platform share in basis points, sinks to the Well on a paid sale. */
  rakeBps: number;
  tiers: TicketTier[];
}

export interface IssuedTicket {
  /** Stable unique id: `{ref}:{tierId}:{serial}`. */
  ticketId: string;
  tierId: string;
  buyerRef: string;
  /** Monotonic serial across the whole object, 1-based. */
  serial: number;
  /** QR-ready token — the string a QR encoder consumes. */
  token: string;
  issuedAt: string;
}

export interface TicketingState {
  config: TicketingConfig;
  issued: IssuedTicket[];
  /** Next serial to assign. */
  nextSerial: number;
}

export function openTicketing(config: TicketingConfig): TicketingState {
  return { config, issued: [], nextSerial: 1 };
}

export function tierOf(state: TicketingState, tierId: string): TicketTier | null {
  return state.config.tiers.find((t) => t.id === tierId) ?? null;
}

function soldInTier(state: TicketingState, tierId: string): number {
  return state.issued.filter((t) => t.tierId === tierId).length;
}

function heldByBuyer(state: TicketingState, tierId: string, buyerRef: string): number {
  return state.issued.filter((t) => t.tierId === tierId && t.buyerRef === buyerRef).length;
}

export interface TierAvailability {
  tierId: string;
  /** Remaining tickets, or `null` when the tier is unlimited. */
  remaining: number | null;
  soldOut: boolean;
  /** Whether the sales window is open at `at`. */
  onSale: boolean;
}

/** Availability of a tier at instant `at` (ISO 8601). */
export function tierAvailability(
  state: TicketingState,
  tierId: string,
  at: string,
): TierAvailability {
  const tier = tierOf(state, tierId);
  if (!tier) return { tierId, remaining: 0, soldOut: true, onSale: false };

  const remaining =
    tier.quantity == null ? null : Math.max(0, tier.quantity - soldInTier(state, tierId));
  const t = Date.parse(at);
  const afterStart = tier.salesStart == null || t >= Date.parse(tier.salesStart);
  const beforeEnd = tier.salesEnd == null || t <= Date.parse(tier.salesEnd);

  return {
    tierId,
    remaining,
    soldOut: remaining === 0,
    onSale: afterStart && beforeEnd,
  };
}

/**
 * QR-ready token for a ticket. Deterministic and checksummed so a scanner can reject
 * a mistyped/garbled code before any lookup. NOT a signature — see the file header.
 */
export function ticketToken(ref: string, tierId: string, serial: number): string {
  const body = `TKT:${ref}:${tierId}:${serial}`;
  const checksum = hashSeed(body).toString(36).toUpperCase().padStart(7, '0').slice(-7);
  return `${body}:${checksum}`;
}

/** Parse and verify a QR token's checksum. Returns its parts, or `null` if corrupt. */
export function parseTicketToken(
  token: string,
): { ref: string; tierId: string; serial: number } | null {
  const parts = token.split(':');
  if (parts.length !== 5 || parts[0] !== 'TKT') return null;
  const [, ref, tierId, serialStr] = parts;
  const serial = Number(serialStr);
  if (!Number.isInteger(serial)) return null;
  if (ticketToken(ref, tierId, serial) !== token) return null; // checksum must match
  return { ref, tierId, serial };
}

export type IssueRejection =
  | 'unknown-tier'
  | 'non-positive-qty'
  | 'off-sale'
  | 'sold-out'
  | 'over-buyer-limit';

export interface IssueRequest {
  buyerRef: string;
  tierId: string;
  qty: number;
  /** When the request is made (ISO 8601), checked against the sales window. */
  at: string;
}

export type IssueResult =
  | {
      ok: true;
      state: TicketingState;
      tickets: IssuedTicket[];
      settlement: SettlementProposal | null;
    }
  | { ok: false; reason: IssueRejection };

/**
 * Issue `qty` tickets in a tier to a buyer. Pure: returns the new state, the issued
 * ticket records (each with a QR token), and a `SettlementProposal` for paid tiers
 * (null for free/RSVP tiers). Enforces the sales window, remaining quantity, and the
 * per-buyer limit against current state.
 */
export function issueTickets(state: TicketingState, req: IssueRequest): IssueResult {
  const tier = tierOf(state, req.tierId);
  if (!tier) return { ok: false, reason: 'unknown-tier' };

  const qty = Math.floor(req.qty);
  if (!(qty > 0)) return { ok: false, reason: 'non-positive-qty' };

  const avail = tierAvailability(state, req.tierId, req.at);
  if (!avail.onSale) return { ok: false, reason: 'off-sale' };
  if (avail.remaining != null && qty > avail.remaining) return { ok: false, reason: 'sold-out' };

  if (
    tier.perBuyerLimit != null &&
    heldByBuyer(state, req.tierId, req.buyerRef) + qty > tier.perBuyerLimit
  ) {
    return { ok: false, reason: 'over-buyer-limit' };
  }

  const tickets: IssuedTicket[] = [];
  let serial = state.nextSerial;
  for (let i = 0; i < qty; i++) {
    tickets.push({
      ticketId: `${state.config.ref}:${req.tierId}:${serial}`,
      tierId: req.tierId,
      buyerRef: req.buyerRef,
      serial,
      token: ticketToken(state.config.ref, req.tierId, serial),
      issuedAt: req.at,
    });
    serial++;
  }

  const gross = roundMoney(qty * tier.price);
  const settlement =
    gross > 0
      ? proposeSettlement({
          grossPot: gross,
          rakeBps: state.config.rakeBps,
          winners: [{ ref: state.config.beneficiaryRef, weight: 1 }],
          rail: state.config.rail,
        })
      : null;

  return {
    ok: true,
    state: { ...state, issued: [...state.issued, ...tickets], nextSerial: serial },
    tickets,
    settlement,
  };
}
