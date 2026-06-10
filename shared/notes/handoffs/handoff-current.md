# HONEYCOMB — Session Handoff

**Date:** 2026-06-10 (later session)
**Arc:** Stripe F6 — subscription webhook → `subscription_sync()`, shipped live & verified
**Supabase:** `anxmqiehpyznifqgskzc` (prod) · slate certified clean · `total_supply = 0` · `economy_integrity_check()` → `ok: true`
**Launch:** July 4 2026 soft beta · Sep 11 2026 full Swarm

---

## What this session shipped

**F6 — `stripe-subscription-webhook` — LIVE (v3, ACTIVE, `verify_jwt=false`).** The first Stripe edge function. Subscription lifecycle + `invoice.paid` → `subscription_sync()`. Fiat-in services-only; payer never credited BLiNG!; affiliate reward freed from the Reserve on paid periods only.

1. **Migration applied (prod):** `20260610125331_bees_stripe_customer_id` — adds `bees.stripe_customer_id` + partial-unique index (Stripe customer ↔ Bee cache).
2. **F6 built for `2026-03-25.dahlia`:** reads moved fields (`items[].current_period_end`, `invoice.parent.subscription_details.subscription`); for `invoice.paid` retrieves the subscription once and reads everything off it.
3. **Classification fallback:** `product_type`/`tier` from Price metadata → falls back per-key to Product metadata (locked Prices can't take new metadata).
4. **Two-layer idempotency:** `stripe_events.event_id` (event-level, self-healing at `processed`) + deterministic `invoiceRef` uuid (invoice-level, via `affiliate_holds.source_ref`). Upline freed exactly once per paid invoice.
5. **Real-status fix:** `invoice.paid` records the true subscription status (trial $0 invoice stays `trialing`, never trips `one-active-per-product`).
6. **Stripe config (Butch):** new `Your account` destination, 4 events (`customer.subscription.{created,updated,deleted}`, `invoice.paid`), Snapshot payloads. Secrets `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET_SUBSCRIPTION` set.

## Deployed / applied via MCP this session

| kind | what |
|---|---|
| migration | 20260610125331 bees_stripe_customer_id |
| edge fn | stripe-subscription-webhook v1 → v2 (product-metadata fallback) → v3 (real status) |

Canon to commit: `stripe-f6-subscription-rail-v1.md`, `mmf-insert-stripe-fiat-f6.md` (slot into MMF fiat/Exchange §).

## Repo sync (Code)

Commit the F6 set (live == these bytes); rename the migration file to the `20260610125331` version. Do **not** `supabase db push` / `functions deploy` (applied/deployed via MCP).
- `TheMANUAL.tech/supabase/functions/stripe-subscription-webhook/index.ts`
- `TheMANUAL.tech/supabase/functions/_shared/{stripe,cors,supabase,ids}.ts`
- `TheMANUAL.tech/supabase/migrations/20260610125331_bees_stripe_customer_id.sql`

## Verified clean

`stripe_events 0 · subscriptions 0 · affiliate_holds 0 · total_supply 0 · integrity ok`. Test trial-subscription ran the full path (both events processed, product+Bee resolved, customer pinned, row upserted, **no** affiliate on $0), then all test artifacts were wiped.

## GO-LIVE checklist (carry forward — do NOT do pre-launch)

- **Delete the Stripe test customer/subscription** (`cus_…`, `sub_1Tgndk…`) at go-live — Butch's call, deliberately deferred.
- **Retire the legacy `FreedomBLiNGs!` destination** — disable→delete once F6 has carried live traffic.
- **Stage-2 validation:** real affiliate freeing (`amount > 0`) as a conscious economy-on rehearsal, not against the clean slate.

## Next arc (fresh session) — F5, the Fountain

Crowdfunding, **one-time / charge-at-close — not a subscription.** Build order:
1. **DB layer first** (the real work): pledges/contributions table, AON/KWYR close+settle RPC (reward freed from Reserve), Express Connect payout linkage, charge-at-close Pattern B.
2. **Then F5 edge function** (`payment_intent.*` / Connect events) on top.
`give_campaigns` exists but has no financial columns yet — that's where the DB layer lands.

## Still open (unchanged)

Thermostat pool sizes (Economic-Constitution values); wire `record_drop`/`record_drip`; daily `pg_cron` for `economy_integrity_check()`; tier taxonomy → `subscriptions.tier` CHECK; ops funding execution from Treasury at end-of-build.