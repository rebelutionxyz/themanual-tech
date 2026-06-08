-- =====================================================================
-- Migration 20260608180059 — retire_buy_bling_stripe_remnants
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-08 via apply_migration.
-- Retires the dead buy-BLiNG! Stripe rail remnants so the schema reflects the
-- fiat-never-touches-the-BLiNG!-ledger firewall.
--
-- Context: bling_credit_purchase already dropped (Economy v3); the stripe-create-checkout
-- edge fn is gone (only a dangling comment in _shared/ranks.ts remained). The objects below
-- are the surviving BLiNG!-coupled scaffolding:
--   • bling_tx_stripe_event_fk  — FK linking the BLiNG! ledger to the dead events table.
--   • bling_chargeback_clawback — BLiNG!-credit chargeback fn (no live callers; the only fn
--                                 referencing stripe_event_id, dropped BEFORE the column).
--   • bling_stripe_events       — empty (0-row) events table.
--   • bling_transactions.stripe_event_id — orphaned, 100% NULL column on the live ledger.
--
-- Pre-apply verification (rollback-wrapped dry-run on prod): all four drops execute cleanly;
-- column confirmed 100% NULL; no views/triggers/RLS/other-fn/pg_depend reference the column;
-- no object depends on the function. Order is FK → fn → table → column so the soft in-body
-- reference is gone before the column drops.
--
-- The fiat-IN successor (stripe_events, subscriptions, webhook, charge.dispute.closed
-- reversal) is a fresh build per shared/canon — it does NOT restore any of these objects.
-- =====================================================================

ALTER TABLE public.bling_transactions DROP CONSTRAINT bling_tx_stripe_event_fk;
DROP FUNCTION IF EXISTS public.bling_chargeback_clawback(text,text,uuid,numeric,numeric);
DROP TABLE IF EXISTS public.bling_stripe_events;
ALTER TABLE public.bling_transactions DROP COLUMN stripe_event_id;
