# DEPTH Shared Mechanics → BLiNG Rail — mount coordination

**Pass:** DEPTH_MECH1 (DEPTH_SLATE v1 E3 / CONCEPTS v2 #4/#5/#6)
**Produced by:** the shared mechanics in `src/lib/mechanics/`
**Consumed by:** DEPTH_RAILS1 (E1 — MONEY ENGINES / BLiNG rails), workdir `TheMANUAL.tech-db`
**Status:** PROPOSE-FIRST. Nothing here moves money. This doc is the mechanics side
of the seam the rail fills. It is written because `docs/depth-rails-interface.md`
(the rail's own contract, named in the DEPTH_MECH1 dispatch) does not exist yet —
DEPTH_RAILS1 is still in flight. When that doc lands, reconcile the two; where they
disagree the rail's doc wins and the stub in `rails.ts` is adjusted to match.

## Why a seam and not a call

The mechanics are additive and dormant. No route imports them yet, so a deploy
activates nothing (deploy-guarded). Each primitive computes a **`SettlementProposal`**
— a pure preview the UI renders labelled PROPOSED — and never persists it. The live
debit/credit/escrow is the rail's job. `rails.ts` exports `UNMOUNTED_RAIL`, whose
methods throw `RailNotMountedError`; that is the single injection point the rail
replaces at the app edge. Mounting the real rail is a wiring change, not a code
change to any mechanic.

## The shape the rail must persist — `SettlementProposal`

Deliberately mirrors the games floor's `*_settlements` columns
(`REBELUTION.games/src/lib/engine/settlement.ts`) so the games floor and these
mechanics converge on one rail rather than a fork:

| proposal field  | `*_settlements` column | meaning |
|-----------------|------------------------|---------|
| `potTotal`      | `pot_total`            | gross pot + `sourceIn` |
| `sinkToSource`  | `sink_to_source`       | house rake that drains to the Well |
| `sourceIn`      | `source_in`            | Source/faucet value seeded into the pot |
| `payoutPool`    | (derived)              | `potTotal − sinkToSource` |
| `payouts[]`     | payout rows            | `{ place, ref, amount }`, sums to `payoutPool` exactly |
| `netToWell`     | (derived)             | `sinkToSource − sourceIn` |

All amounts `numeric(20,6)`. Remainders are handed to first place so
`Σ payouts + sinkToSource == potTotal` to the micro-unit — the rail can persist the
proposal verbatim and must not recompute the split.

## The `RailMount` contract (`rails.ts`)

DEPTH_RAILS1 supplies an object implementing:

- `settle(proposal, ctx)` — persist a proposal as real ledger movements (payouts to
  each `payouts[].ref`, `sinkToSource` to the Well). Idempotent on `ctx.ref`.
- `hold(hold)` — escrow an entry stake / winning bid until settle or release.
- `release(receiptId, reason)` — refund a held amount (cancelled auction, undrawn
  raffle, ended-with-no-tips stream).

Where each mechanic would call the rail once it is live:

| mechanic   | `hold` on            | `settle` on            | `release` on |
|------------|----------------------|------------------------|--------------|
| auction    | each accepted bid    | close, if `sold`       | outbid / no-sale |
| raffle     | each ticket GET      | after `drawRaffle`     | draw voided |
| ticketing  | each paid issue      | paid issue (proceeds → beneficiary) | refund/cancel |
| stream     | (tips are immediate) | stream end, if tipped  | reversed tip |

## Firewall + rail selection

`Rail` is `'BLING' | 'USD'`; mechanics carry it through and never convert. USD always
buys the good/service, never BLiNG (MMF §5.13). Per-session rail selection is the
Patchboard's job (see the games `currency.ts` resolver); these primitives accept the
resolved `Rail` on their config and do not re-resolve it.

## Canon guardrails honoured

- Built `bling_*` core and existing manual tables are **untouchable**; this pass adds
  no schema and no migration — pure TS lib modules.
- All money/settlement hooks are **propose-first stubs**. `RailNotMountedError` makes
  any accidental live call fail loud rather than move value.
- Does **not** fork the games engine — no cross-repo import; it generalises the shape
  the games floor already ships so both mount this one rail.
