# Cancel-Recovery — ADR

**Status:** Draft for review · 2026-05-09
**Scope:** Platform posture on transaction cancellation and recovery across the three places where money flows can fail or reverse in HONEYCOMB — Bee-to-Bee transfers, Stripe purchase chargebacks, and the order-book / escrow surface. Pre-frames decisions for **BLiNG! build day · Tue 2026-05-12**.
**Sibling canon:** `federation-tier-1-scoping.md` (Lock 6 / Lock 7 / §32 are referenced here).

---

## Executive summary

This ADR locks three postures on cancel-recovery before BLiNG! build day. **Lock 1** — Bee-to-Bee BLiNG! transfers via `bling_send` are atomic and final; there is no cancel mechanism, no time window, no undo. Recovery from a misdirected send is a social problem (sender contacts receiver, receiver issues a counter-`bling_send` if willing) — it is never a technical one. **Lock 2** — Stripe purchase chargebacks are the primary cancel-recovery problem and require an explicit chargeback handler at the `freedomblings.com` webhook surface. The handler claws back BLiNG! from the chargebacking Bee's balance (negative balance is permitted), burns the same amount from `total_supply`, freezes the Bee from initiating new transactions until the balance returns to zero, and notifies the Bee with a clear breakdown. The existing `bling_stripe_events` table is missing the fields needed to bind a chargeback event back to its originating purchase; this ADR proposes (read-only) the schema deltas. **Lock 3** — Escrow cancellation and dispute mechanics already exist as `bling_cancel_escrow` and `bling_dispute_escrow`; this ADR codifies the policy around when each is used and flags one significant drift from the prompt's framing (escrows have no partial-fill semantics — that property belongs to the order book, not escrows; and the order-book surface is missing a `bling_cancel_order` RPC entirely). Dispute *resolution* mechanics — who decides, on what evidence, by what process — remain out of scope and are deferred to **§32 of the master file (Board of Astras)**.

---

## Lock 1 — Bee-to-Bee transfers are atomic and final

### Decision

A Bee-to-Bee BLiNG! transfer (`public.bling_send`) is **atomic and final**. There is no cancel mechanism, no time window, no undo. Once the RPC commits, the sender's balance is debited and the recipient's balance is credited; both rows are written into `bling_transactions`; if a fee was charged, the treasury credit and audit rows are also written. There is no platform-level path that reverses any of this.

### Rationale

**Philosophical.** HONEYCOMB's posture is sovereignty + accountability. The Bee is responsible for the actions they initiate — including who they send BLiNG! to. "Show me who got it wrong" includes "show me where I clicked send to the wrong Bee." This is the same model digital currencies have proven workable: Bitcoin transactions are uncancellable; people accept that posture for digital currency.

**Technical.** The current `bling_send` RPC is a single atomic SECURITY DEFINER PL/pgSQL function — debit, credit, two transaction rows, optional fee path, all in one statement. Adding a cancel mechanism would require: a new `bling_send_pending` table or status enum on `bling_transactions`, a window-clock on every send, a new RPC, new RLS, and either a settlement worker or a settlement check on every read. None of that is justified.

**Anti-fraud.** Cancellable sends introduce an entire scam category: sender sends, receives value (a delivered service / handed-over goods / a pact honored), then cancels. Eliminating the cancel mechanism eliminates the entire scam class by construction.

### Recovery path for misdirected sends

If a sender sends BLiNG! to the wrong Bee, the recovery path is **social, not technical**:

1. Sender reads their `bling_transactions` ledger (already enforced by the `bling_tx_owner_read` RLS policy; sender owns the `'sent'` row, recipient owns the `'received'` row).
2. Sender identifies the recipient by `counterparty` (text bee_id stamped on the row).
3. Sender contacts the recipient via Bee profile, DM, or external channel.
4. If the recipient agrees to refund, the recipient initiates a **new `bling_send` in the opposite direction**. This is just a normal transfer — there is no special "refund" mechanism. The two transactions are independent ledger events, linked only by social context.

The platform offers no enforcement. Receivers are not obligated to refund; the sender is exposed to the recipient's good faith. **This is the intended posture.** Anything else implies a custodial or arbitral role for the platform that contradicts Lock 1.

### Tier-1 implementation surface

None. `bling_send` is already deployed and behaves exactly as Lock 1 specifies. No schema, no RPC, no RLS, no UI changes.

UI implication (out of repo for this ADR): the send confirmation modal should display the **recipient handle** prominently and require an explicit confirm before calling `bling_send`. This is a UX guard against the misdirected-send case, not a recovery mechanism — once the user confirms and the RPC fires, the send is final.

### Failure modes

- **Sender misdirects** → social recovery only (above). Platform ledger is the source of truth for "what happened"; what to do about it is between the parties.
- **Recipient is unreachable / hostile** → sender absorbs the loss. There is no Lock-1 escape hatch. (If the value is large enough that this is unacceptable, the sender should have used `bling_create_escrow` + a release condition instead of `bling_send`.)
- **None at the technical layer** — uncancellable is the simplest possible posture; no race conditions, no settlement windows, no rollback paths to maintain.

---

## Lock 2 — Stripe chargeback handling

### Decision

Stripe purchase chargebacks are recovered by an explicit **chargeback handler** in the `freedomblings.com` webhook surface. The handler:

1. Validates the inbound Stripe event (`charge.dispute.created` or `charge.refunded`).
2. Looks up the originating purchase via `bling_stripe_events.event_id` (or a derivative key — see "Schema deltas" below).
3. Calls a new SECURITY DEFINER RPC `bling_chargeback_clawback(p_bee_id uuid, p_amount numeric, p_source_event_id text, p_dispute_event_id text)` that **debits the Bee's balance by the BLiNG! amount that was originally freed** (negative balance is permitted), **burns the same amount from `bling_system_state.total_supply`**, writes audit rows into `bling_transactions`, and records the chargeback in `bling_stripe_events`.
4. The Bee is notified via in-app message + email (Bee-facing copy and channel routing belong to the BLiNG! build day deliverable, not this ADR).

The Bee is **transaction-locked while balance < 0**. They cannot SEND, OFFER, or ESCROW until the negative balance is cleared. Existing RPC balance checks already enforce this for sends, escrows, and sell-side order placement; the buy-side of `bling_place_order` and the curve-purchase path also need to refuse a Bee whose balance is below zero (see "Schema deltas").

The Bee can clear the negative balance by:
- Earning BLiNG! (DROPS payouts, learning rewards, kindness tips received) — incoming credits offset the negative.
- Issuing a new Stripe purchase (a normal `bling_credit_purchase` call) — incoming credits offset the negative.

Neither requires special handling. The negative balance is a normal `bling_balance` value, just negative.

### Why a clawback rather than a refund-only model

Stripe's refund and chargeback flows return dollars to the cardholder; they do **not** return BLiNG!. If the platform did nothing on the BLiNG! side, the Bee would hold BLiNG! that was freed against a payment that no longer exists — **`total_supply` would be inflated against nothing**, and the Bee would have committed fraud successfully. Sovereignty + accountability says the Bee committed fraud by chargebacking; the platform must reclaim the BLiNG! and reflect that in supply math. A clawback that simply takes the BLiNG! back is the minimum coherent response.

### Detailed webhook flow

```
Stripe → freedomblings.com /webhook/stripe
  ├── event.type === 'payment_intent.succeeded'
  │     → call bling_credit_purchase(p_bee_id, p_amount)   [existing path]
  │     → INSERT bling_stripe_events (event_id, event_type, bee_id, bling_amount)
  │
  ├── event.type === 'charge.dispute.created'
  │     → look up source purchase by stripe_charge_id (NEW field — see deltas)
  │     → call bling_chargeback_clawback(p_bee_id, p_amount, p_source_event_id, p_dispute_event_id)
  │     → INSERT bling_stripe_events for the dispute event
  │     → notify the Bee
  │
  ├── event.type === 'charge.refunded'  (Stripe-initiated refund OR cardholder-initiated chargeback that resolved as a refund)
  │     → same path as charge.dispute.created
  │
  ├── event.type === 'charge.dispute.closed' (won by HONEYCOMB)
  │     → optional reverse-clawback (see Open #CR-3); not in tier-1 scope
  │
  └── any other event.type
        → INSERT into bling_stripe_events for audit; no balance / supply effect
```

Idempotency for the dispute path mirrors the existing purchase path: the dispute `event_id` is the primary key, so a Stripe retry of `charge.dispute.created` is a no-op on the second insert. Inside the RPC, an additional guard rejects a clawback that has already been applied for the same `p_source_event_id` (defense-in-depth against same-event dual delivery).

### Balance / supply / account state per chargeback outcome

| State after handler runs                  | Bee balance                                         | `total_supply`                          | Bee can transact?                                                                                                |
|-------------------------------------------|-----------------------------------------------------|-----------------------------------------|------------------------------------------------------------------------------------------------------------------|
| **Bee held the freed BLiNG!**             | `balance - p_amount` (may go to zero / positive)    | `total_supply - p_amount`               | If new balance ≥ 0 → yes. If < 0 → frozen until cleared.                                                          |
| **Bee already spent some**                | `balance - p_amount` (likely negative)              | `total_supply - p_amount`               | Frozen until cleared.                                                                                            |
| **Bee already spent all**                 | `0 - p_amount` = `-p_amount` (negative)             | `total_supply - p_amount`               | Frozen until cleared.                                                                                            |
| **Bee chargebacks then re-purchases**     | `(balance - p_amount) + p_repurchase` (may clear)   | net of both flows                       | Whenever balance ≥ 0.                                                                                            |
| **Bee chargebacks twice (different cards)** | each call applies independently; sum is debited   | each call burns                         | Frozen while balance < 0.                                                                                        |

The Bee is treated identically regardless of whether they ever held the BLiNG! at the time of chargeback. The clawback is a flat debit; supply is a flat burn.

#### Note on the order-book-fill nuance

When `bling_credit_purchase` runs, BLiNG! delivered to the buyer comes from two sources: (a) BLiNG! transferred from existing sell-order makers (no `total_supply` change), and (b) BLiNG! freed from the curve via `bling_free` (`total_supply` increases). On chargeback, the proposed handler **burns the full chargeback amount from `total_supply` regardless of the original split**. This can momentarily contract supply below the pre-purchase level when the original purchase was mostly order-book-filled. Accepted as a deliberate simplification: tracking the per-purchase decomposition would require additional fields on `bling_stripe_events` and per-purchase accounting that does not justify its weight against a fraud-recovery flow that already accepts negative balances. The order-book-maker on the other side of the original fill **keeps their proceeds** — Lock 1 says receipts are uncancellable, and the chargeback handler does not violate that.

### Verification against current schema

`bling_stripe_events` (per `supabase/schema-v8-bling.sql:244–250`) currently has:

| Column          | Type                | Notes                                                |
|-----------------|---------------------|------------------------------------------------------|
| `event_id`      | `text PRIMARY KEY`  | Stripe's `evt_*` identifier — one row per event      |
| `event_type`    | `text NOT NULL`     | e.g. `'checkout.session.completed'`                  |
| `bee_id`        | `uuid NULL`         | FK → `bees(id) ON DELETE SET NULL`                   |
| `bling_amount`  | `numeric(20,3)`     | for audit / reconciliation                           |
| `processed_at`  | `timestamptz`       | default `now()`                                      |

**Gaps for the chargeback flow:**

1. **No `stripe_charge_id` / `stripe_payment_intent_id`** linking field. A `charge.dispute.created` event references the Stripe charge that was disputed; without storing the charge id from the original `payment_intent.succeeded` row, the handler cannot find the purchase being clawed back.
2. **No reference to a prior `bling_stripe_events` row.** A dispute event is logically a child of the purchase event. Without a self-reference, the handler must fall back to looking up by `bee_id` + `bling_amount`, which is fragile (multiple purchases of the same amount by the same Bee disambiguate poorly).
3. **No `status` field.** "Was this purchase chargebacked? Was the chargeback contested? Was the contest won?" — none of these answers fit anywhere today.
4. **No `usd_amount` field.** Useful for reporting and reconciliation; not strictly required for the clawback math (BLiNG! amount alone suffices).

### Schema deltas (read-only proposal — DO NOT APPLY)

These deltas are written against `bling_stripe_events` as it lives in `freedomblings.com` (mirrored by `schema-v8-bling.sql` and `schema-v8-bling-themanual.sql` here). They are sized so the migration is purely additive — no data migration, no breaking change to the existing webhook path.

```sql
-- ───────────────────────────────────────────────────────────────────────
-- Lock 2 · bling_stripe_events — chargeback support
-- All new columns are nullable; the existing purchase path keeps working
-- without modification (the new fields are populated by the chargeback
-- branch only).
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.bling_stripe_events
    ADD COLUMN IF NOT EXISTS stripe_charge_id          text,
    ADD COLUMN IF NOT EXISTS stripe_payment_intent_id  text,
    ADD COLUMN IF NOT EXISTS source_event_id           text REFERENCES public.bling_stripe_events(event_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS status                    text NOT NULL DEFAULT 'recorded'
        CHECK (status IN ('recorded','clawback_applied','clawback_failed','contest_won','contest_lost')),
    ADD COLUMN IF NOT EXISTS usd_amount                numeric(12, 2);

CREATE INDEX IF NOT EXISTS bling_stripe_events_charge_idx
    ON public.bling_stripe_events(stripe_charge_id)
    WHERE stripe_charge_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS bling_stripe_events_source_idx
    ON public.bling_stripe_events(source_event_id)
    WHERE source_event_id IS NOT NULL;

-- ───────────────────────────────────────────────────────────────────────
-- Lock 2 · bling_transactions — chargeback type values
-- The 'minted' value is preserved (rename of bling_mint to bling_free is
-- RPC-only; the transaction `type` value enum was not migrated).
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.bling_transactions
    DROP CONSTRAINT IF EXISTS bling_transactions_type_check;
ALTER TABLE public.bling_transactions
    ADD  CONSTRAINT bling_transactions_type_check
        CHECK (type IN (
            'sent','received','bought','sold','minted','fee','fee_received',
            'escrow_created','escrow_released','escrow_disputed','escrow_cancelled',
            'chargeback_clawback','chargeback_burn'
        ));

-- ───────────────────────────────────────────────────────────────────────
-- Lock 2 · bling_chargeback_clawback RPC (skeleton — full body in build-day migration)
-- Service-role exclusive (Stripe webhook path). REVOKE from PUBLIC and
-- authenticated. Atomicity: balance debit + supply burn + audit rows in
-- one transaction. Idempotent on (p_source_event_id, p_dispute_event_id).
-- ───────────────────────────────────────────────────────────────────────
-- CREATE OR REPLACE FUNCTION public.bling_chargeback_clawback(
--     p_bee_id            uuid,
--     p_amount            numeric,
--     p_source_event_id   text,        -- the original payment_intent.succeeded event_id
--     p_dispute_event_id  text         -- the charge.dispute.created / charge.refunded event_id
-- ) RETURNS jsonb
-- LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
-- AS $$ ...
--   1. Idempotency guard: if a 'chargeback_clawback' tx row already exists
--      for (p_bee_id, p_dispute_event_id), return success no-op.
--   2. Lock bee row, debit p_amount (negative balance permitted).
--   3. Lock bling_system_state, decrement total_supply by p_amount.
--   4. INSERT bling_transactions row type='chargeback_clawback', counterparty='stripe'.
--   5. INSERT bling_transactions row type='chargeback_burn', counterparty='supply'.
--   6. UPDATE bling_stripe_events SET status='clawback_applied' WHERE event_id = p_source_event_id.
-- $$;
```

### Failure modes

- **Bee with persistent negative balance** — they cannot transact. They can still log in, read their ledger, see the chargeback notification, and read why. They can clear it by earning or by re-purchasing. Persistent negative balance with no recovery is **the intended consequence of fraud**, not a bug.
- **Bee chargebacks then re-purchases on a different card** — the new purchase fires a normal `payment_intent.succeeded`; balance increments. If the new payment also chargebacks, the handler fires again; balance decrements again. Each event is independently idempotent on its `event_id`. No special composition logic required.
- **Stripe `charge.dispute.closed` arrives later (HONEYCOMB won the dispute)** — Open #CR-3 (below). Tier-1 does not auto-reverse the clawback; ops manually reconciles via a TBD admin tool. Audit trail is preserved in `bling_stripe_events.status`.
- **Bee was a Maker on an order book fill that paid out from this purchase** — the Maker keeps their proceeds (Lock 1 invariant: receipts are uncancellable). The platform absorbs the asymmetry via the supply burn.
- **Bee was the recipient of a `bling_send` from the chargebacking Bee** — the recipient keeps the BLiNG!. Lock 1 again. The chargebacking Bee owns the negative balance.
- **Bee has open escrows where they are the creator** — the BLiNG! in those escrows is already debited from their balance (per `bling_create_escrow` semantics). The clawback hits the *current* balance, which does not include escrowed amounts. The negative balance is therefore tighter than "everything they have"; if they want to free up BLiNG!, they can call `bling_cancel_escrow` on their open escrows themselves to refund their own balance.
- **Webhook delivery fails / retries** — `event_id` PK on `bling_stripe_events` plus the inner-RPC idempotency guard on `(bee_id, dispute_event_id)` make retries safe.
- **Webhook handler crashes mid-flow** — RPC is single-transaction; partial state is impossible. Either every effect lands or none do.

### Edge cases handled

- **Repeated chargeback events on the same purchase** (Stripe duplicates) → idempotent at PK + RPC layer.
- **Chargeback for an amount different from the original purchase BLiNG! amount** — should not happen in practice (Stripe disputes are for charge amounts, not BLiNG! amounts), but the handler trusts the value stored in the source `bling_stripe_events.bling_amount` rather than re-deriving from the dispute event.
- **Bee deleted while chargeback pending** — `bling_stripe_events.bee_id` has `ON DELETE SET NULL`; the chargeback row remains for audit. Live deletion of bees is presently not a supported operation, so this is largely defensive.

---

## Lock 3 — Order book / escrow cancellation

### Decision

The escrow surface — `bling_cancel_escrow` and `bling_dispute_escrow` — exists in production and behaves correctly for the cases this ADR scopes. Policy is locked here. **The order-book surface, however, is missing a `bling_cancel_order` RPC entirely** (drift from prompt — see verification section). That gap is flagged here and a read-only proposal is included; the implementation lands on BLiNG! build day.

#### 3a. Escrow — cancel before release

A Bee who created an escrow may cancel it via `bling_cancel_escrow(p_escrow_id, p_actor_id)` while the escrow is in `'open'` status. The full escrowed amount is refunded to the creator's balance; the escrow row is marked `'cancelled'`; an `'escrow_cancelled'` audit row is written. Only the creator can cancel; the recipient has no cancel right.

#### 3b. Escrow — partial fill is not a thing

**There is no partial fill of an escrow.** Each `bling_escrows` row holds a single `amount`; the row's lifecycle is `'open' → 'released' | 'cancelled' | 'disputed'`. The prompt's "sender places offer, partial fill, sender cancels remaining: cancel returns unfilled portion only" describes **order-book** semantics, not escrow semantics. (See 3d.)

#### 3c. Escrow — disagreement after release

If the creator and recipient disagree on whether the escrow's external condition was satisfied, **either party** can call `bling_dispute_escrow(p_escrow_id, p_actor_id)` while the escrow is in `'open'` status. This sets the escrow's status to `'disputed'` without altering balances. Resolution of the dispute — who decides, on what evidence, with what authority — is **out of scope for tier-1 cancel-recovery**; it is governance work, deferred to **§32 of the master file (Board of Astras)** and tracked here as Open #CR-4.

#### 3d. Order book — cancel an open offer (drift from prompt)

The order-book equivalent of "cancel my offer before it fills" **does not exist as an RPC**. `bling_orders.status` allows `'cancelled'` as a value, but no deployed function transitions a row into that state. A Bee whose offer is open cannot recall it.

This is independent of the rest of the prompt's framing and is flagged for BLiNG! build day. A `bling_cancel_order` RPC should land alongside the divisibility / DiGiTs work; it is small.

A second drift compounds the first: **`bling_place_order` does not pre-debit / pre-lock the placer's balance**. Schema comment at `supabase/schema-v8-bling.sql:582–583` documents the gap explicitly: *"Inherited from server.js: does NOT pre-debit/lock balance on place. v9 hardening: add locked_balance column + pre-debit / refund-on-cancel."* v9 was security work; the locked_balance hardening did not land. Until it does:

- Cancelling an open order is a no-op for balance (there is no escrow to refund).
- A Bee may place a sell order, then `bling_send` the same BLiNG! away, and then a Taker hitting the order will fail with insufficient balance at fill time. This is a deliverability problem on the order book, not a cancel-recovery problem per se — but the cancel-recovery posture below assumes the v9-hardening work eventually lands and the order has a locked balance to refund.

#### 3e. Receiver of BLiNG! from escrow

When `bling_release_escrow` runs, the recipient receives the BLiNG! into their balance. The receipt is final and uncancellable per **Lock 1** — once it lands in the recipient's `bling_balance`, it is theirs. There is no recipient-side cancel of an escrow release.

### Verification against current RPC bodies

Read against `schema-v8-bling.sql:742–801` and migration `23_v9_0_security.sql:339–408`.

| Behavior described above                                              | RPC body confirms                                                                                                                                                                                                                          | Drift                                          |
|-----------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------|
| Escrow cancel: only creator, only while `'open'`, full-amount refund  | `IF v_escrow.creator_id <> p_actor_id THEN RAISE 'Only creator can cancel'`. `IF NOT FOUND OR v_escrow.status <> 'open' THEN RAISE 'Escrow not open'`. `UPDATE public.bees SET bling_balance = bling_balance + v_escrow.amount`.            | None.                                          |
| Escrow dispute: either party, only while `'open'`, no balance change  | `IF p_actor_id NOT IN (v_escrow.creator_id, v_escrow.recipient_id) THEN RAISE 'Only escrow parties can dispute'`. `UPDATE public.bling_escrows SET status = 'disputed'`. (No balance UPDATE.)                                              | None.                                          |
| `bling_cancel_escrow` returns "unfilled portion only" on partial fill | **No partial-fill semantics on `bling_escrows`.** The table has a single `amount` column, status enum `(open, released, disputed, cancelled)`, no `filled` column. The prompt's framing applies to `bling_orders`, not `bling_escrows`.    | **Yes — flagged in 3b.**                       |
| `bling_cancel_order` exists                                           | `pg_proc` lookup returns no row matching `bling_cancel_order`. The 9 deployed RPCs are: `bling_send`, `bling_free` (renamed from `bling_mint`), `bling_fill_order`, `bling_place_order`, `bling_credit_purchase`, `bling_create_escrow`, `bling_release_escrow`, `bling_cancel_escrow`, `bling_dispute_escrow`. | **Yes — flagged in 3d.**                       |
| `bling_place_order` pre-debits balance                                | Body checks `v_balance < p_amount` (sell side) or `v_balance < (p_price * p_amount)` (buy side) but does **not** UPDATE the bee's balance. The schema comment acknowledges the gap and pins it as v9 hardening that did not land.           | **Yes — flagged in 3d as compounding drift.**  |
| `auth.uid() = p_actor_id` enforced at RPC entry                       | `IF auth.uid() IS NULL OR auth.uid() <> p_actor_id THEN RAISE 'unauthorized: actor must match auth.uid()'` — added in `23_v9_0_security.sql` for `cancel_escrow`, `dispute_escrow`, and four other user-facing RPCs.                        | None. Note: this guard means the chargeback handler's clawback RPC (Lock 2) cannot be one of these — it must be service-role only and either omit the `auth.uid()` guard or have its own posture. |

### Tier-1 implementation surface

- **Escrow:** none. Existing `bling_cancel_escrow` and `bling_dispute_escrow` are correct.
- **Order book:** add `bling_cancel_order(p_order_id bigint, p_actor_id uuid)` per the read-only proposal below. Conditional on the v9-hardening pre-debit work also landing — without pre-debit, `bling_cancel_order` is a status update with no balance refund, which is technically correct given the current state but masks the underlying placement-without-lock problem.

### Schema deltas (read-only proposal — DO NOT APPLY)

```sql
-- ───────────────────────────────────────────────────────────────────────
-- Lock 3d · bling_cancel_order — fill the missing RPC
-- Mirrors the bling_cancel_escrow shape: actor must equal placer; only
-- 'open' orders are cancellable; status moves to 'cancelled'; if a
-- locked_balance column exists (v9 hardening — separate work), refund the
-- unfilled portion.
-- ───────────────────────────────────────────────────────────────────────
-- CREATE OR REPLACE FUNCTION public.bling_cancel_order(
--     p_order_id  bigint,
--     p_actor_id  uuid
-- ) RETURNS jsonb
-- LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
-- AS $$
-- DECLARE v_order public.bling_orders%ROWTYPE;
-- BEGIN
--     IF auth.uid() IS NULL OR auth.uid() <> p_actor_id THEN
--         RAISE EXCEPTION 'unauthorized: actor must match auth.uid()';
--     END IF;
--
--     SELECT * INTO v_order FROM public.bling_orders WHERE id = p_order_id FOR UPDATE;
--     IF NOT FOUND OR v_order.status <> 'open' THEN
--         RAISE EXCEPTION 'Order not open';
--     END IF;
--     IF v_order.bee_id <> p_actor_id THEN
--         RAISE EXCEPTION 'Only placer can cancel';
--     END IF;
--
--     UPDATE public.bling_orders
--         SET status = 'cancelled', updated_at = now()
--         WHERE id = p_order_id;
--
--     -- Refund unfilled portion (CONDITIONAL on v9 pre-debit hardening).
--     -- IF placement was pre-debited:
--     --   v_unfilled := v_order.amount - v_order.filled;
--     --   UPDATE public.bees SET bling_balance = bling_balance + v_unfilled WHERE id = p_actor_id;
--     --   INSERT into bling_transactions (..., type='order_cancelled', amount=v_unfilled, ref_order_id=p_order_id);
--     -- ELSE (current state — no pre-debit):
--     --   no balance UPDATE; record an audit-only row.
--
--     RETURN jsonb_build_object('success', true, 'cancelled_amount', v_order.amount - v_order.filled);
-- END;
-- $$;
--
-- REVOKE EXECUTE ON FUNCTION public.bling_cancel_order(bigint, uuid) FROM PUBLIC;
-- GRANT  EXECUTE ON FUNCTION public.bling_cancel_order(bigint, uuid) TO authenticated;
```

### Failure modes

- **Creator tries to cancel an already-released escrow** → `'Escrow not open'` raised by status guard. No state change.
- **Recipient tries to cancel an escrow** → `'Only creator can cancel'`. The recipient's recourse is `bling_dispute_escrow`, not cancel.
- **Either party calls dispute on a non-open escrow** → `'Escrow not open'`. Status enum protects against double-disputing.
- **Order placer tries to cancel before `bling_cancel_order` ships** → no path. The order remains open until filled or until ops manually resolves. (This is the gap, not a behavior of the gap.)
- **Order partial-fill cancel before v9 pre-debit hardening** → `bling_cancel_order` would mark the row `'cancelled'` and report `(amount - filled)` as the cancelled portion, but no balance refund happens because no pre-debit happened. UI must communicate this honestly until pre-debit lands.
- **Disputed escrow with no resolution mechanism** → BLiNG! is locked indefinitely in the escrow row (status `'disputed'`, balance still debited from creator, never credited to recipient). This is the explicit consequence of deferring dispute resolution to §32; the BLiNG! is not lost, just frozen pending governance work.

### Cross-references

- **Dispute resolution mechanics** → §32 of the master file (Board of Astras). Tracked as **Open #CR-4** below and as **Open #27** in `federation-tier-1-scoping.md`.
- **`bling_cancel_order` RPC and order-book pre-debit hardening** → BLiNG! build day, Tue 2026-05-12. Tracked as **Open #CR-5**.

---

## Open Questions

| #     | Question                                                                                                                                                                       | Resolves at                                  |
|-------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------|
| #CR-1 | Chargeback handler implementation lives at `freedomblings.com` (per Lock 1 of federation doc, the upstream API surface). Build it on or before BLiNG! build day.               | BLiNG! build day · Tue 2026-05-12            |
| #CR-2 | Bee notification channels for chargeback events — in-app banner, email, both, with what copy. Bee-facing copy must honor the language firewall (no "fraud", "violation", etc; use plain factual language). | BLiNG! build day · Tue 2026-05-12 |
| #CR-3 | `charge.dispute.closed` (HONEYCOMB won the dispute) — does the platform auto-reverse the clawback, or require ops to reconcile manually? Tier-1 default is manual; revisit when chargeback volume justifies an auto-reverse path. | When chargeback volume justifies it          |
| #CR-4 | Dispute resolution mechanics for `'disputed'` escrows — adjudicator, evidence model, timeouts, BLiNG! disposition (split / refund-creator / pay-recipient).                    | §32 of MMF (Board of Astras)                 |
| #CR-5 | `bling_cancel_order` RPC + `bling_place_order` pre-debit hardening — both must land together for the cancel path to refund a meaningful amount.                                | BLiNG! build day · Tue 2026-05-12            |
| #CR-6 | DiGiTs / off-grid Nova currency cancel-recovery posture — does a Nova running its own DiGiT have its own chargeback model, or does it inherit Lock 2 by extension?             | BLiNG! build day · Tue 2026-05-12 (Lock 6 of federation doc) |
| #CR-7 | Chargeback notification routing for Bees who chargeback then delete their account before the webhook fires — fall back to email-on-file? Out of tier-1; defensive.             | BLiNG! build day · Tue 2026-05-12            |

---

## Out of scope (cross-reference)

- **Dispute resolution mechanics** for `'disputed'` escrows → §32 of the master file (Board of Astras). Lock 5 of `federation-tier-1-scoping.md` is the canonical placeholder.
- **DiGiTs / off-grid Nova / private-label coin cancel-recovery posture** → BLiNG! build day, Tue 2026-05-12. Lock 6 of `federation-tier-1-scoping.md`.
- **Off-grid Nova currency cancel-recovery semantics** when off-grid means *no connection to `freedomblings.com`* (Lock 9.6 Tier 3 of federation doc) → BLiNG! build day; will be a Nova-by-Nova choice.
- **Order-book pre-debit / `locked_balance` column** ("v9 hardening" per `schema-v8-bling.sql:583`) → BLiNG! build day; pairs with Open #CR-5.
- **Admin tooling for manual reconciliation** of chargeback contests, ops adjustments, etc. → out of repo for tier-1; Code 1's `src/admin/` HQ scaffolding will house the eventual UI.
- **Active-active reconciliation between `freedomblings.com` and the theMANUAL read replica** during a `freedomblings.com` outage → explicitly out of scope per Lock 1.1.c of `federation-tier-1-scoping.md`. Chargeback events are durable in Stripe and replay safely once the primary returns.

---

## Glossary additions to merge later

(Per Code 1 / Code 2 concurrent-edit avoidance; do not edit the glossary file from this session. Butch merges these after both Code 1 and Code 2 finish.)

- **Atomic transfer.** A `bling_send` between Bees. Single PL/pgSQL transaction; debit + credit + audit rows + optional fee path all commit together or none do. Once committed, **final** — no cancel mechanism, no time window, no undo. Recovery from a misdirected atomic transfer is social, not technical: the recipient may issue a counter-`bling_send` if they choose, but the platform offers no enforcement. (See Lock 1 of cancel-recovery ADR.)

- **Chargeback handler.** The webhook surface at `freedomblings.com` that processes Stripe `charge.dispute.created` and `charge.refunded` events. On receipt, claws back the originally-freed BLiNG! amount from the chargebacking Bee's balance (negative balance is permitted), burns the same amount from `bling_system_state.total_supply`, freezes the Bee from initiating new transactions until balance ≥ 0, and notifies the Bee. Idempotent on Stripe `event_id`. (See Lock 2 of cancel-recovery ADR.)

- **Negative balance.** A `bees.bling_balance` value below zero, produced exclusively by the chargeback handler clawing back BLiNG! the Bee no longer holds. While balance < 0, the Bee cannot SEND, OFFER, ESCROW, or trigger curve FREE — existing RPC balance checks reject these naturally. The Bee clears the negative balance by earning BLiNG! (DROPS payouts, kindness tips received, learning rewards) or by issuing a non-disputed Stripe purchase. Persistent negative balance is the intended consequence of fraud, not a bug. (See Lock 2 of cancel-recovery ADR.)

---

## Appendix — Drift flagged during investigation

This ADR's investigation surfaced four drifts between described state and actual codebase state. Flagged here (not fixed; fixing is out of scope for this read-only ADR):

1. **`bling_cancel_order` RPC is missing.** The order-book status enum allows `'cancelled'`, but no RPC transitions a row into that state. Lock 3d flags this; Open #CR-5 tracks it.

2. **`bling_place_order` does not pre-debit balance.** Schema comment at `supabase/schema-v8-bling.sql:582–583` acknowledges this as "v9 hardening" that did not land. Lock 3d flags this as compounding drift; same Open #CR-5 tracks it.

3. **`bling_credit_purchase` body still calls `bling_mint` by name** (`schema-v8-bling.sql:659`), but `bling_mint` was renamed to `bling_free` on 2026-05-08 via `supabase/migrations/20260508120100_phase_c_b4_bling_rename.sql`. PostgreSQL's `ALTER FUNCTION ... RENAME TO ...` does not rewrite the bodies of other functions that reference the renamed function by name. **Either `bling_credit_purchase` was re-deployed alongside the rename (not visible in the migrations directory), or the Stripe purchase path is currently broken.** This is unrelated to cancel-recovery, but visible from this investigation; flagging for separate triage.

4. **Prompt-vs-CLAUDE.md drift on RPC names.** The prompt and federation tier-1 doc use `bling_cancel_escrow` / `bling_dispute_escrow` (matching the actual deployed function names per `schema-v8-bling.sql:742, 775`). `CLAUDE.md:59` lists `bling_escrow_cancel` / `bling_escrow_release` (reversed word order). The deployed names are authoritative; CLAUDE.md is mildly stale. Not load-bearing for this ADR; surfaced for cleanup.

🐝🍯
