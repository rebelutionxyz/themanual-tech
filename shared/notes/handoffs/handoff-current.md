# HONEYCOMB — Session Handoff (current)

**Date:** 2026-06-10 (Stripe F6 session)
**Arc:** Stripe F6 — subscription webhook → `subscription_sync()`, shipped live & verified
**Supabase:** `anxmqiehpyznifqgskzc` (prod) · slate certified clean · `total_supply = 0` · `economy_integrity_check()` → `ok: true`
**Launch:** July 4 2026 soft beta (Brains Live Room casual/free) · Sep 11 2026 full Swarm

---

## What this session shipped

**F6 — `stripe-subscription-webhook` — LIVE (v3, ACTIVE, `verify_jwt=false`).** First Stripe edge function. Subscription lifecycle + `invoice.paid` → `subscription_sync()`. Fiat-in services-only; payer never credited BLiNG!; affiliate reward freed from the Reserve on paid periods only.

1. **Migration applied (prod):** `20260610125331_bees_stripe_customer_id` — `bees.stripe_customer_id` + partial-unique index (Stripe customer ↔ Bee cache). Backfilled byte-exact in repo (md5-verified vs prod).
2. **Built for `2026-03-25.dahlia`:** reads moved fields (`items[].current_period_end`, `invoice.parent.subscription_details.subscription`); `invoice.paid` retrieves the subscription once and reads everything off it.
3. **Classification fallback:** `product_type`/`tier` from Price metadata → per-key fallback to Product metadata (locked Prices can't take new metadata).
4. **Two-layer idempotency:** `stripe_events.event_id` (event-level, self-healing at `processed`) + deterministic `invoiceRef` uuid (invoice-level, via `affiliate_holds.source_ref`). Upline freed exactly once per paid invoice.
5. **Real-status fix:** `invoice.paid` records true sub status (trial $0 invoice stays `trialing`, never trips `one-active-per-product`).
6. **Stripe config (Butch):** new `Your account` destination, 4 events (`customer.subscription.{created,updated,deleted}`, `invoice.paid`), Snapshot payloads. Secrets `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET_SUBSCRIPTION` set.

## Applied/deployed via MCP this session

| kind | what |
|---|---|
| migration | 20260610125331 bees_stripe_customer_id |
| edge fn | stripe-subscription-webhook v1 → v2 (product-metadata fallback) → v3 (real status) |

## Canon written (in repo, Code-authored from source)

- `shared/canon/stripe-f6-subscription-rail-v1.md` — full F6 rail canon.
- `shared/canon/mmf-insert-stripe-fiat-f6.md` — staged MMF insert, **§5.13** (beside §5.9 Settlement / Path C, companion to §23 The Exchange). Confirm/renumber on merge, then delete the staging file.

## Repo sync (commit is Butch / GitHub Desktop)

F6 six-file set is on disk, staged-ready (Code did not commit, db push, or functions deploy):
- `supabase/functions/stripe-subscription-webhook/index.ts`
- `supabase/functions/_shared/{stripe,cors,supabase,ids}.ts`
- `supabase/migrations/20260610125331_bees_stripe_customer_id.sql`

**Commit-sweep decision pending:** working tree also holds earlier untracked 06-09 backfills (Stripe F2–F4, affiliate ×6, drops/drips ×7). F6-only → stage selectively; whole rail → all go together (repo == live across the board).

## Verified clean

`stripe_events 0 · subscriptions 0 · affiliate_holds 0 · total_supply 0 · integrity ok`. Test trial-subscription ran the full path (both events processed, product+Bee resolved, customer pinned, row upserted, **no** affiliate on $0); all test artifacts wiped.

## GO-LIVE checklist (carry forward — NOT pre-launch)

- Delete the Stripe test customer/sub (`cus_…`, `sub_1Tgndk…`) — deliberately deferred to go-live.
- Retire legacy `FreedomBLiNGs!` destination — disable → monitor → delete, once F6 carries live traffic.
- Stage-2 validation: real affiliate freeing (`amount > 0`) as a conscious economy-on rehearsal, off the clean slate.

## Next arc (fresh session) — F5, the Fountain

Crowdfunding, **one-time / charge-at-close — not a subscription.** Build order:
1. **DB layer first** (the real work): pledges/contributions table, AON/KWYR close+settle RPC (reward freed from Reserve), Express Connect payout linkage, charge-at-close Pattern B.
2. **Then F5 edge function** (`payment_intent.*` / Connect) on top.
`give_campaigns` exists but has no financial columns yet — that's where the DB layer lands.

## Still open (unchanged)

Thermostat pool sizes (Economic-Constitution values); wire `record_drop`/`record_drip`; daily `pg_cron` for `economy_integrity_check()`; tier taxonomy → `subscriptions.tier` CHECK; ops funding from Treasury (`222,111,111,111`) at end-of-build once Astra count locks; membership grandfathering; atom-kind taxonomy; 4,860-vs-5,790 atom reconcile (Sunday).