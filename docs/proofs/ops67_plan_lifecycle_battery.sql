-- OPS67 -- ORACLE PLAN SUBSCRIPTIONS: recurring-lifecycle proof battery
--
-- RUNS AGAINST PRODUCTION INSIDE ONE TRANSACTION THAT ENDS IN ROLLBACK.
-- Nothing is committed. Every routine it calls was checked for transaction
-- control first (pg_proc.prosrc has no COMMIT in any oracle_* routine,
-- subscription_sync or affiliate_on_payment) -- OPS49-Q was burnt by a nested
-- COMMIT inside a "rolled back" battery, so this is verified, not assumed.
--
-- Fixture Bee: 00000000-0000-0000-0000-00000000beef (@honeypot), chosen because
-- it holds ZERO oracle_token_ledger rows, so every number below is produced by
-- this battery alone. Section 0 asserts that precondition and section 9
-- re-asserts it after the ROLLBACK.
--
-- The RPCs are service-role gated, so the battery sets request.jwt.claims to a
-- service_role claim -- the same identity the edge function presents.
--
-- WHERE created_at IS FORCED: oracle_token_available attributes a debit to a
-- grant by TIME WINDOW [grant.created_at, grant.expires_at), so proving cycle
-- behaviour needs grants that started in the past. Those UPDATEs are fixture
-- shaping and are marked FIXTURE below; no RPC does that.
--
-- Run:
--   psql ... -w -v ON_ERROR_STOP=1 -f db/proofs/ops67_plan_lifecycle_battery.sql

\pset format aligned
\timing off

BEGIN;

SET LOCAL request.jwt.claims = '{"role":"service_role"}';

\echo
\echo ================= SECTION 0 -- PRECONDITIONS =================
SELECT auth.role() AS acting_as;
SELECT count(*) AS honeypot_ledger_rows_before
  FROM oracle_token_ledger WHERE bee_id = '00000000-0000-0000-0000-00000000beef';
SELECT count(*) AS honeypot_subscriptions_before
  FROM subscriptions WHERE bee_id = '00000000-0000-0000-0000-00000000beef';

\echo
\echo ================= SECTION 1 -- DOUBLE-FIRED invoice.paid =================
\echo -- Stripe delivers the same paid invoice twice under two event ids. The
\echo -- partial unique index oracle_token_ledger_one_grant_per_invoice_uidx is
\echo -- the guarantee; the RPC turns the violation into duplicate:true.

SELECT jsonb_pretty(oracle_grant_plan_tokens(
  '00000000-0000-0000-0000-00000000beef', 'oracle', 'in_OPS67_A',
  now() + interval '30 days', 2900)) AS fire_1;

SELECT jsonb_pretty(oracle_grant_plan_tokens(
  '00000000-0000-0000-0000-00000000beef', 'oracle', 'in_OPS67_A',
  now() + interval '30 days', 2900)) AS fire_2_same_invoice;

SELECT count(*) AS grant_rows_for_in_OPS67_A, sum(amount_tokens) AS tokens_granted
  FROM oracle_token_ledger
 WHERE bee_id = '00000000-0000-0000-0000-00000000beef'
   AND entry_type = 'grant' AND payment_ref = 'in_OPS67_A';

\echo
\echo ================= SECTION 2 -- RENEWAL = SECOND GRANT, OWN EXPIRY =================
SELECT jsonb_pretty(oracle_grant_plan_tokens(
  '00000000-0000-0000-0000-00000000beef', 'oracle', 'in_OPS67_B',
  now() + interval '60 days', 2900)) AS renewal_invoice;

SELECT payment_ref, amount_tokens, expires_at
  FROM oracle_token_ledger
 WHERE bee_id = '00000000-0000-0000-0000-00000000beef' AND entry_type = 'grant'
 ORDER BY expires_at;

\echo
\echo ================= SECTION 3 -- SPEND ORDER: PLAN BEFORE PURCHASED =================
DELETE FROM oracle_token_ledger WHERE bee_id = '00000000-0000-0000-0000-00000000beef';

SELECT jsonb_pretty(oracle_credit_token_purchase(
  '00000000-0000-0000-0000-00000000beef', 'starter', 'cs_OPS67_1', 500, 'stripe')) AS pack_5000_never_expires;

SELECT jsonb_pretty(oracle_grant_plan_tokens(
  '00000000-0000-0000-0000-00000000beef', 'scout', 'in_OPS67_C',
  now() + interval '29 days', 900)) AS plan_grant_10000_expiring;

-- FIXTURE: push both credits into the past so the debits below land INSIDE the
-- cycle window rather than exactly on its left edge.
UPDATE oracle_token_ledger SET created_at = now() - interval '2 days'
 WHERE bee_id = '00000000-0000-0000-0000-00000000beef' AND entry_type = 'purchase';
UPDATE oracle_token_ledger SET created_at = now() - interval '1 day'
 WHERE bee_id = '00000000-0000-0000-0000-00000000beef' AND entry_type = 'grant';

\echo -- expect plan 10000 / purchased 5000 / total 15000
SELECT * FROM oracle_token_available('00000000-0000-0000-0000-00000000beef');

INSERT INTO atlasoracle_directives (id, bee_id, astra_id, directive_category, tier, status)
VALUES ('00000000-0000-0000-0000-0000000d1001', '00000000-0000-0000-0000-00000000beef',
        '05328bac-db82-40ea-905d-ea557017cb6a', 'analyze', 'standard', 'success'),
       ('00000000-0000-0000-0000-0000000d1002', '00000000-0000-0000-0000-00000000beef',
        '05328bac-db82-40ea-905d-ea557017cb6a', 'analyze', 'standard', 'success'),
       ('00000000-0000-0000-0000-0000000d1003', '00000000-0000-0000-0000-00000000beef',
        '05328bac-db82-40ea-905d-ea557017cb6a', 'analyze', 'standard', 'success');

\echo -- debit 8000: must come entirely from the EXPIRING plan grant
SELECT jsonb_pretty(oracle_debit_tokens(
  '00000000-0000-0000-0000-00000000beef', '00000000-0000-0000-0000-0000000d1001',
  8000, 'OPS67 spend-order probe 1')) AS debit_8000;

\echo -- debit 4000: 2000 left in the plan, so 2000 must SPILL into purchased
SELECT jsonb_pretty(oracle_debit_tokens(
  '00000000-0000-0000-0000-00000000beef', '00000000-0000-0000-0000-0000000d1002',
  4000, 'OPS67 spend-order probe 2')) AS debit_4000;

\echo -- replay of the SAME directive must not debit twice
SELECT jsonb_pretty(oracle_debit_tokens(
  '00000000-0000-0000-0000-00000000beef', '00000000-0000-0000-0000-0000000d1002',
  4000, 'OPS67 replay')) AS debit_replay;

SELECT count(*) AS debit_rows FROM oracle_token_ledger
 WHERE bee_id = '00000000-0000-0000-0000-00000000beef' AND entry_type = 'debit';

\echo
\echo ================= SECTION 4 -- CANCEL: NO GRANT, NO CLAWBACK =================
DELETE FROM oracle_token_ledger WHERE bee_id = '00000000-0000-0000-0000-00000000beef';
DELETE FROM subscriptions WHERE bee_id = '00000000-0000-0000-0000-00000000beef';

SELECT jsonb_pretty(oracle_credit_token_purchase(
  '00000000-0000-0000-0000-00000000beef', 'starter', 'cs_OPS67_2', 500, 'stripe')) AS pack_again;
SELECT jsonb_pretty(oracle_grant_plan_tokens(
  '00000000-0000-0000-0000-00000000beef', 'scout', 'in_OPS67_D',
  now() + interval '29 days', 900)) AS plan_grant_again;
UPDATE oracle_token_ledger SET created_at = now() - interval '1 day'
 WHERE bee_id = '00000000-0000-0000-0000-00000000beef';

SELECT jsonb_pretty(subscription_sync(
  '00000000-0000-0000-0000-00000000beef', 'oracle', 'scout', 'sub_OPS67_1', 'cus_OPS67',
  'active', now() + interval '29 days', NULL, NULL)) AS sub_active;

\echo -- expect plan 10000 / purchased 5000 / total 15000 BEFORE cancel
SELECT * FROM oracle_token_available('00000000-0000-0000-0000-00000000beef');

SELECT jsonb_pretty(subscription_sync(
  '00000000-0000-0000-0000-00000000beef', 'oracle', 'scout', 'sub_OPS67_1', 'cus_OPS67',
  'canceled', now() + interval '29 days', NULL, NULL)) AS sub_canceled;

SELECT count(*) AS ledger_rows_after_cancel FROM oracle_token_ledger
 WHERE bee_id = '00000000-0000-0000-0000-00000000beef';
\echo -- expect UNCHANGED 10000 / 5000 / 15000 -- cancel writes nothing to the ledger
SELECT * FROM oracle_token_available('00000000-0000-0000-0000-00000000beef');

\echo -- now let the paid month actually end (FIXTURE: expiry moved into the past)
UPDATE oracle_token_ledger SET expires_at = now() - interval '1 minute'
 WHERE bee_id = '00000000-0000-0000-0000-00000000beef' AND entry_type = 'grant';
\echo -- expect plan 0 / purchased 5000 / total 5000 -- plan tokens lapse, pack tokens do not
SELECT * FROM oracle_token_available('00000000-0000-0000-0000-00000000beef');

\echo
\echo ================= SECTION 5 -- OVERLAPPING CYCLES (DEFECT PROBE) =================
\echo -- Reachable path: Bee cancels on day 5 and re-subscribes on day 25. The
\echo -- grant for the FIRST month is still live -- it expires at the end of the
\echo -- month that was paid for -- while the new cycle grant is already open, so
\echo -- the two attribution windows OVERLAP.
DELETE FROM oracle_token_ledger WHERE bee_id = '00000000-0000-0000-0000-00000000beef';

SELECT jsonb_pretty(oracle_credit_token_purchase(
  '00000000-0000-0000-0000-00000000beef', 'starter', 'cs_OPS67_3', 500, 'stripe')) AS pack_5000;
SELECT jsonb_pretty(oracle_grant_plan_tokens(
  '00000000-0000-0000-0000-00000000beef', 'scout', 'in_OPS67_E',
  now() + interval '10 days', 900)) AS cycle_1;
UPDATE oracle_token_ledger SET created_at = now() - interval '20 days'
 WHERE payment_ref = 'in_OPS67_E';
SELECT jsonb_pretty(oracle_grant_plan_tokens(
  '00000000-0000-0000-0000-00000000beef', 'scout', 'in_OPS67_F',
  now() + interval '25 days', 900)) AS cycle_2;
UPDATE oracle_token_ledger SET created_at = now() - interval '5 days'
 WHERE payment_ref = 'in_OPS67_F';
UPDATE oracle_token_ledger SET created_at = now() - interval '30 days'
 WHERE payment_ref = 'cs_OPS67_3';

\echo -- TRUTH before any spend: plan 20000 / purchased 5000 / total 25000
SELECT * FROM oracle_token_available('00000000-0000-0000-0000-00000000beef');

\echo -- ONE debit of 12000. TRUTH after: plan 8000 / purchased 5000 / total 13000
SELECT jsonb_pretty(oracle_debit_tokens(
  '00000000-0000-0000-0000-00000000beef', '00000000-0000-0000-0000-0000000d1003',
  12000, 'OPS67 overlap probe')) AS debit_12000;

SELECT * FROM oracle_token_available('00000000-0000-0000-0000-00000000beef') AS measured;
SELECT 25000 - 12000 AS truth_total,
       (SELECT total_available FROM oracle_token_available('00000000-0000-0000-0000-00000000beef')) AS measured_total,
       (25000 - 12000) - (SELECT total_available FROM oracle_token_available('00000000-0000-0000-0000-00000000beef')) AS tokens_lost;

\echo
\echo ================= SECTION 6 -- TWO ACTIVE ORACLE SUBS COLLIDE =================
\echo -- subscriptions_one_active_oracle_per_bee_uidx is UNIQUE (bee_id) WHERE
\echo -- product_type='oracle' AND status IN ('active','trialing'). Stripe Checkout
\echo -- always CREATES a subscription, so an upgrade / re-subscribe raises a
\echo -- second sub id. In oracle-webhook the grant call sits AFTER this sync.
DELETE FROM subscriptions WHERE bee_id = '00000000-0000-0000-0000-00000000beef';

SELECT jsonb_pretty(subscription_sync(
  '00000000-0000-0000-0000-00000000beef', 'oracle', 'scout', 'sub_OPS67_X', 'cus_OPS67',
  'active', now() + interval '29 days', NULL, NULL)) AS first_sub;

DO $$
BEGIN
  PERFORM subscription_sync(
    '00000000-0000-0000-0000-00000000beef', 'oracle', 'sovereign', 'sub_OPS67_Y', 'cus_OPS67',
    'active', now() + interval '30 days', NULL, NULL);
  RAISE NOTICE 'SECOND ACTIVE ORACLE SUB ACCEPTED -- no collision';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'SECOND ACTIVE ORACLE SUB REFUSED -- % / %', SQLSTATE, SQLERRM;
END $$;

\echo -- the grant that follows the failed sync in oracle-webhook: does the money
\echo -- write itself have any dependency on the subscription row? (it does not --
\echo -- proving the fix "grant first, then sync" is safe)
SELECT jsonb_pretty(oracle_grant_plan_tokens(
  '00000000-0000-0000-0000-00000000beef', 'sovereign', 'in_OPS67_G',
  now() + interval '30 days', 9900)) AS grant_without_a_subscription_row;

\echo
\echo ================= SECTION 7 -- STRIPE STATUS 'paused' vs THE CHECK =================
DO $$
BEGIN
  PERFORM subscription_sync(
    '00000000-0000-0000-0000-00000000beef', 'oracle', 'scout', 'sub_OPS67_Z', 'cus_OPS67',
    'paused', now() + interval '29 days', NULL, NULL);
  RAISE NOTICE 'status paused ACCEPTED';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'status paused REFUSED -- % / %', SQLSTATE, SQLERRM;
END $$;

\echo
\echo ================= SECTION 8 -- ROLLBACK =================
ROLLBACK;

\echo
\echo ================= SECTION 9 -- NOTHING PERSISTED =================
SELECT count(*) AS honeypot_ledger_rows_after
  FROM oracle_token_ledger WHERE bee_id = '00000000-0000-0000-0000-00000000beef';
SELECT count(*) AS honeypot_subscriptions_after
  FROM subscriptions WHERE bee_id = '00000000-0000-0000-0000-00000000beef';
SELECT count(*) AS honeypot_directives_after
  FROM atlasoracle_directives WHERE bee_id = '00000000-0000-0000-0000-00000000beef';
SELECT count(*) AS total_ledger_rows_platform_wide FROM oracle_token_ledger;
