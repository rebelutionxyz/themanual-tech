/* ============================================================
   STREAM — object-agnostic live-session primitive.

   DEPTH_MECH1. One engine for any live broadcast surface: Events (live event
   feeds), News (live coverage), Games (the live floor), Ads (sponsored live).
   It runs over an opaque `ref` and knows nothing of what is being streamed.

   Three things, object-agnostic:
     1. LIFECYCLE — a closed, ordered stage set (scheduled → preroll → live →
        paused → ended → archived) with guarded transitions, folded from the many
        free-text status strings surfaces use, so the UI never branches on raw
        strings and an unknown status is an honest "unknown", never a mis-render.
        (Same discipline the games lifecycle uses; copy-port, no cross-repo import.)
     2. PRESENCE — live viewer count and a running peak.
     3. TIPS — PROPOSE-FIRST. A tip appends to the ledger-in-waiting; `settle`
        proposes host payout + Well rake via rails.ts and moves NO money until
        DEPTH_RAILS1 mounts.
   ============================================================ */

import { type Rail, type SettlementProposal, proposeSettlement, roundMoney } from './rails';

/** The closed lifecycle. Order is the arc; index is the progress rank. */
export const STREAM_STAGES = [
  'scheduled',
  'preroll',
  'live',
  'paused',
  'ended',
  'archived',
] as const;

export type StreamStage = (typeof STREAM_STAGES)[number];

export interface StreamStageMeta {
  key: StreamStage;
  label: string;
  blurb: string;
  /** True while the broadcast is on air (live). */
  onAir: boolean;
  /** True once the session is over (ended or archived). */
  terminal: boolean;
}

export const STREAM_STAGE_META: Record<StreamStage, StreamStageMeta> = {
  scheduled: {
    key: 'scheduled',
    label: 'Scheduled',
    blurb: 'Announced, not started yet.',
    onAir: false,
    terminal: false,
  },
  preroll: {
    key: 'preroll',
    label: 'Preroll',
    blurb: 'Host is setting up; audience is gathering.',
    onAir: false,
    terminal: false,
  },
  live: { key: 'live', label: 'Live', blurb: 'On air.', onAir: true, terminal: false },
  paused: {
    key: 'paused',
    label: 'Paused',
    blurb: 'Temporarily off air; expected to resume.',
    onAir: false,
    terminal: false,
  },
  ended: {
    key: 'ended',
    label: 'Ended',
    blurb: 'Broadcast finished.',
    onAir: false,
    terminal: true,
  },
  archived: {
    key: 'archived',
    label: 'Archived',
    blurb: 'Filed to the replay/record.',
    onAir: false,
    terminal: true,
  },
};

/** Raw surface status strings folded onto the closed stage set. */
const STATUS_TO_STAGE: Record<string, StreamStage> = {
  scheduled: 'scheduled',
  upcoming: 'scheduled',
  planned: 'scheduled',
  preroll: 'preroll',
  starting: 'preroll',
  standby: 'preroll',
  live: 'live',
  on_air: 'live',
  broadcasting: 'live',
  paused: 'paused',
  intermission: 'paused',
  ended: 'ended',
  finished: 'ended',
  complete: 'ended',
  archived: 'archived',
  replay: 'archived',
};

/** Map a raw status onto a stage, or `null` when the string is unrecognised. */
export function streamStageOf(status: string | null | undefined): StreamStage | null {
  if (!status) return null;
  return STATUS_TO_STAGE[status.trim().toLowerCase()] ?? null;
}

/** 0-based progress rank along the arc. */
export function streamStageRank(stage: StreamStage): number {
  return STREAM_STAGES.indexOf(stage);
}

/** Guarded transitions: which stages may follow each stage. */
const TRANSITIONS: Record<StreamStage, StreamStage[]> = {
  scheduled: ['preroll', 'live', 'ended', 'archived'],
  preroll: ['live', 'ended'],
  live: ['paused', 'ended'],
  paused: ['live', 'ended'],
  ended: ['archived'],
  archived: [],
};

export function canTransition(from: StreamStage, to: StreamStage): boolean {
  return TRANSITIONS[from].includes(to);
}

export interface StreamConfig {
  /** The object being streamed (event id, session id, campaign id, ...). */
  ref: string;
  rail: Rail;
  /** Who receives tip proceeds — the broadcaster. */
  hostRef: string;
  /** Platform share in basis points, sinks to the Well on settle. */
  rakeBps: number;
  /** Scheduled start (ISO 8601), if announced. */
  scheduledFor?: string;
}

export interface StreamTip {
  tipperRef: string;
  amount: number;
  at: string;
}

export interface StreamState {
  config: StreamConfig;
  stage: StreamStage;
  /** Current live viewer count. */
  presence: number;
  /** Highest presence seen this session. */
  peakPresence: number;
  tips: StreamTip[];
}

export function openStream(config: StreamConfig): StreamState {
  return { config, stage: 'scheduled', presence: 0, peakPresence: 0, tips: [] };
}

export type TransitionResult =
  | { ok: true; state: StreamState }
  | { ok: false; reason: 'illegal-transition' };

/** Move the stream to `to` if the transition is legal. Pure. */
export function transitionStream(state: StreamState, to: StreamStage): TransitionResult {
  if (!canTransition(state.stage, to)) return { ok: false, reason: 'illegal-transition' };
  return { ok: true, state: { ...state, stage: to } };
}

/** Set the live viewer count, updating the running peak. Pure; clamps at 0. */
export function setPresence(state: StreamState, count: number): StreamState {
  const presence = Math.max(0, Math.floor(count));
  return { ...state, presence, peakPresence: Math.max(state.peakPresence, presence) };
}

export type TipRejection = 'not-on-air' | 'non-positive';

export type TipResult = { ok: true; state: StreamState } | { ok: false; reason: TipRejection };

/**
 * Record a tip. PROPOSE-FIRST — this only appends to the tip ledger-in-waiting; no
 * money moves. Tips are accepted only while the stream is on air (live).
 */
export function tip(state: StreamState, t: StreamTip): TipResult {
  if (state.stage !== 'live') return { ok: false, reason: 'not-on-air' };
  if (!(t.amount > 0)) return { ok: false, reason: 'non-positive' };
  return {
    ok: true,
    state: { ...state, tips: [...state.tips, { ...t, amount: roundMoney(t.amount) }] },
  };
}

/** Total tipped so far. */
export function tipTotal(state: StreamState): number {
  return roundMoney(state.tips.reduce((s, t) => s + t.amount, 0));
}

/**
 * PROPOSE (do not persist) the stream's settlement. Pot = total tips; the host is the
 * sole payout claimant; the rake sinks to the Well. Returns `null` when there were no
 * tips (nothing to settle).
 */
export function proposeStreamSettlement(state: StreamState): SettlementProposal | null {
  const gross = tipTotal(state);
  if (gross <= 0) return null;
  return proposeSettlement({
    grossPot: gross,
    rakeBps: state.config.rakeBps,
    winners: [{ ref: state.config.hostRef, weight: 1 }],
    rail: state.config.rail,
  });
}
