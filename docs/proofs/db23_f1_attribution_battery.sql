-- DB23 -- F-1 FIX PROOF BATTERY: explicit FIFO-by-expiry debit attribution
--
-- RUNS AGAINST PRODUCTION INSIDE ONE TRANSACTION THAT ENDS IN ROLLBACK.
-- Nothing is committed -- INCLUDING THE MIGRATION ITSELF, which is \i-included
-- at section 1 so this battery proves the exact file that would be applied
-- rather than a retyped copy of it. Section 9 re-reads after the ROLLBACK.
--
-- Every routine called was checked for transaction control BEFORE running this
-- (pg_proc.prosrc has no COMMIT/ROLLBACK in any oracle_* routine,
-- subscription_sync, affiliate_on_payment or is_platform_admin) -- OPS49-Q was
-- burnt by a nested COMMIT inside a supposedly rolled-back battery, so this is
-- verified, not assumed. Section 0 re-asserts it in-band.
--
-- Fixture Bee: 00000000-0000-0000-0000-00000000beef (@honeypot), which holds
-- ZERO oracle_token_ledger rows, so every number below is this battery's own.
--
-- WHERE created_at IS FORCED: proving cycle behaviour needs grants that opened
-- in the past. Those UPDATEs are fixture shaping, marked FIXTURE. No RPC does it.
--
-- Run from TheMANUAL.tech:
--   psql ... -w -v ON_ERROR_STOP=1 -f docs/proofs/db23_f1_attribution_battery.sql

\pset format aligned
\timing off

BEGIN;

SET LOCAL request.jwt.claims = '{"role":"service_role"}';

\echo
\echo ================= SECTION 0 -- PRECONDITIONS =================
SELECT auth.role() AS acting_as;

\echo -- OPS49-Q lesson: no routine this battery calls may contain transaction control
SELECT proname, (prosrc ~* '(^|[^a-z_])(commit|rollback)([^a-z_]|$)') AS has_txn_control
  FROM pg_proc
 WHERE pronamespace = 'public'::regnamespace
   AND (proname LIKE 'oracle_%' OR proname IN ('subscription_sync','is_platform_admin'))
 ORDER BY 1;

SELECT count(*) AS honeypot_ledger_rows_before
  FROM oracle_token_ledger WHERE bee_id = '00000000-0000-0000-0000-00000000beef';

\echo -- BASELINE: the balance of every real Bee under the OLD time-window authority.
\echo -- Held in a temp table so section 2 can show exactly what the backfill moved.
CREATE TEMP TABLE db23_before ON COMMIT DROP AS
SELECT l.bee_id, a.plan_available, a.purchased_available, a.total_available
  FROM (SELECT DISTINCT bee_id FROM oracle_token_ledger) l,
       LATERAL oracle_token_available(l.bee_id) a;
SELECT * FROM db23_before ORDER BY bee_id;

\echo
\echo ================= SECTION 1 -- APPLY THE MIGRATION, IN-TRANSACTION =================
\echo -- The file itself, not a copy. It rolls back with everything else.
\i supabase/migrations/_drafts/20260803120000_f1_explicit_token_attribution.sql

SELECT count(*) AS consumption_rows_written_by_backfill FROM oracle_token_consumption;

\echo
\echo ================= SECTION 2 -- WHAT THE BACKFILL MOVED =================
\echo -- Any row with a non-zero delta is a balance the OLD function had wrong.
\echo -- A negative purchased_available after backfill would be a STOP condition.
SELECT b.bee_id,
       b.total_available  AS before_total,
       a.total_available  AS after_total,
       a.total_available - b.total_available AS delta,
       a.purchased_available AS after_purchased
  FROM db23_before b, LATERAL oracle_token_available(b.bee_id) a
 ORDER BY b.bee_id;

SELECT count(*) AS bees_with_negative_purchased_after_backfill
  FROM db23_before b, LATERAL oracle_token_available(b.bee_id) a
 WHERE a.purchased_available < 0;

\echo
\echo ================= SECTION 3 -- s3 REPLAY: SIMPLE CASE MUST BE UNCHANGED =================
\echo -- OPS67 s3 numbers exactly: 8000 from the plan, then a 2000 spill.
DELETE FROM oracle_token_consumption WHERE bee_id = '00000000-0000-0000-0000-00000000beef';
DELETE FROM oracle_token_ledger      WHERE bee_id = '00000000-0000-0000-0000-00000000beef';

SELECT jsonb_pretty(oracle_credit_token_purchase(
  '00000000-0000-0000-0000-00000000beef', 'starter', 'cs_DB23_1', 500, 'stripe')) AS pack_5000_never_expires;
SELECT jsonb_pretty(oracle_grant_plan_tokens(
  '00000000-0000-0000-0000-00000000beef', 'scout', 'in_DB23_C',
  now() + interval '29 days', 900)) AS plan_grant_10000_expiring;

-- FIXTURE: push both credits into the past, exactly as OPS67 s3 did.
UPDATE oracle_token_ledger SET created_at = now() - interval '2 days'
 WHERE bee_id = '00000000-0000-0000-0000-00000000beef' AND entry_type = 'purchase';
UPDATE oracle_token_ledger SET created_at = now() - interval '1 day'
 WHERE bee_id = '00000000-0000-0000-0000-00000000beef' AND entry_type = 'grant';

\echo -- expect plan 10000 / purchased 5000 / total 15000
SELECT * FROM oracle_token_available('00000000-0000-0000-0000-00000000beef');

INSERT INTO atlasoracle_directives (id, bee_id, astra_id, directive_category, tier, status)
VALUES ('00000000-0000-0000-0000-0000000d2001', '00000000-0000-0000-0000-00000000beef',
        '05328bac-db82-40ea-905d-ea557017cb6a', 'analyze', 'standard', 'success'),
       ('00000000-0000-0000-0000-0000000d2002', '00000000-0000-0000-0000-00000000beef',
        '05328bac-db82-40ea-905d-ea557017cb6a', 'analyze', 'standard', 'success'),
       ('00000000-0000-0000-0000-0000000d2003', '00000000-0000-0000-0000-00000000beef',
        '05328bac-db82-40ea-905d-ea557017cb6a', 'analyze', 'standard', 'success'),
       ('00000000-0000-0000-0000-0000000d2004', '00000000-0000-0000-0000-00000000beef',
        '05328bac-db82-40ea-905d-ea557017cb6a', 'analyze', 'standard', 'success'),
       ('00000000-0000-0000-0000-0000000d2005', '00000000-0000-0000-0000-00000000beef',
        '05328bac-db82-40ea-905d-ea557017cb6a', 'analyze', 'standard', 'success');

\echo -- debit 8000: must come entirely from the EXPIRING plan grant
SELECT jsonb_pretty(oracle_debit_tokens(
  '00000000-0000-0000-0000-00000000beef', '00000000-0000-0000-0000-0000000d2001',
  8000, 'DB23 spend-order probe 1')) AS debit_8000;

\echo -- debit 4000: 2000 left in the plan, so 2000 must SPILL into purchased
SELECT jsonb_pretty(oracle_debit_tokens(
  '00000000-0000-0000-0000-00000000beef', '00000000-0000-0000-0000-0000000d2002',
  4000, 'DB23 spend-order probe 2')) AS debit_4000;

\echo -- the attribution rows behind that spill, which OPS67 could not show
SELECT coalesce(src.payment_ref, '(durable pool)') AS source,
       c.amount_tokens
  FROM oracle_token_consumption c
  LEFT JOIN oracle_token_ledger src ON src.id = c.source_id
 WHERE c.bee_id = '00000000-0000-0000-0000-00000000beef'
 ORDER BY c.created_at, source;

\echo
\echo ================= SECTION 4 -- s5 REPLAY: THE OVERLAP CASE, THE WHOLE POINT =================
\echo -- Bee stops on day 5 and restarts on day 25. Cycle 1 is still live while
\echo -- cycle 2 opens, so the two windows overlap. OPS67 measured 1000 against a
\echo -- truth of 13000 -- 12000 Tokens destroyed. Expect 13000 / 13000 / 0.
DELETE FROM oracle_token_consumption WHERE bee_id = '00000000-0000-0000-0000-00000000beef';
DELETE FROM oracle_token_ledger      WHERE bee_id = '00000000-0000-0000-0000-00000000beef';

SELECT jsonb_pretty(oracle_credit_token_purchase(
  '00000000-0000-0000-0000-00000000beef', 'starter', 'cs_DB23_3', 500, 'stripe')) AS pack_5000;
SELECT jsonb_pretty(oracle_grant_plan_tokens(
  '00000000-0000-0000-0000-00000000beef', 'scout', 'in_DB23_E',
  now() + interval '10 days', 900)) AS cycle_1;
UPDATE oracle_token_ledger SET created_at = now() - interval '20 days' WHERE payment_ref = 'in_DB23_E';
SELECT jsonb_pretty(oracle_grant_plan_tokens(
  '00000000-0000-0000-0000-00000000beef', 'scout', 'in_DB23_F',
  now() + interval '25 days', 900)) AS cycle_2;
UPDATE oracle_token_ledger SET created_at = now() - interval '5 days'  WHERE payment_ref = 'in_DB23_F';
UPDATE oracle_token_ledger SET created_at = now() - interval '30 days' WHERE payment_ref = 'cs_DB23_3';

\echo -- TRUTH before any spend: plan 20000 / purchased 5000 / total 25000
SELECT * FROM oracle_token_available('00000000-0000-0000-0000-00000000beef');

\echo -- ONE debit of 12000. TRUTH after: plan 8000 / purchased 5000 / total 13000
SELECT jsonb_pretty(oracle_debit_tokens(
  '00000000-0000-0000-0000-00000000beef', '00000000-0000-0000-0000-0000000d2003',
  12000, 'DB23 overlap probe')) AS debit_12000;

SELECT * FROM oracle_token_available('00000000-0000-0000-0000-00000000beef') AS measured;

\echo -- THE HEADLINE ROW. tokens_lost must be exactly 0.
SELECT 25000 - 12000 AS truth_total,
       (SELECT total_available FROM oracle_token_available('00000000-0000-0000-0000-00000000beef')) AS measured_total,
       (25000 - 12000) - (SELECT total_available FROM oracle_token_available('00000000-0000-0000-0000-00000000beef')) AS tokens_lost;

\echo -- and the record of WHERE the 12000 went: cycle 1 first (soonest expiry), then cycle 2
SELECT coalesce(src.payment_ref, '(durable pool)') AS source,
       src.expires_at,
       c.amount_tokens
  FROM oracle_token_consumption c
  LEFT JOIN oracle_token_ledger src ON src.id = c.source_id
 WHERE c.bee_id = '00000000-0000-0000-0000-00000000beef'
 ORDER BY src.expires_at NULLS LAST;

\echo
\echo ================= SECTION 5 -- RENEWAL OVERLAP: FIFO EXHAUSTS GRANT 1 FIRST =================
-- NOTE: no apostrophes in \echo text. psql reads the rest of the line as a
-- quoted string and dies with "unterminated quoted string".
\echo -- Two live grants, 10000 each. Grant 1 expires sooner. Debit 6000, then
\echo -- 6000 again: the first lands wholly on grant 1, the second takes the
\echo -- last 4000 of grant 1 and spills 2000 onto grant 2. Durable NEVER touched.
DELETE FROM oracle_token_consumption WHERE bee_id = '00000000-0000-0000-0000-00000000beef';
DELETE FROM oracle_token_ledger      WHERE bee_id = '00000000-0000-0000-0000-00000000beef';

SELECT jsonb_pretty(oracle_credit_token_purchase(
  '00000000-0000-0000-0000-00000000beef', 'starter', 'cs_DB23_4', 500, 'stripe')) AS pack_5000;
SELECT jsonb_pretty(oracle_grant_plan_tokens(
  '00000000-0000-0000-0000-00000000beef', 'scout', 'in_DB23_G',
  now() + interval '8 days', 900)) AS grant_1_expires_sooner;
UPDATE oracle_token_ledger SET created_at = now() - interval '22 days' WHERE payment_ref = 'in_DB23_G';
SELECT jsonb_pretty(oracle_grant_plan_tokens(
  '00000000-0000-0000-0000-00000000beef', 'scout', 'in_DB23_H',
  now() + interval '27 days', 900)) AS grant_2_expires_later;
UPDATE oracle_token_ledger SET created_at = now() - interval '3 days' WHERE payment_ref = 'in_DB23_H';

\echo -- debit 6000 -- expect from_plan 6000, entirely against grant 1
SELECT jsonb_pretty(oracle_debit_tokens(
  '00000000-0000-0000-0000-00000000beef', '00000000-0000-0000-0000-0000000d2004',
  6000, 'DB23 fifo probe 1')) AS debit_6000_a;

\echo -- debit 6000 again -- 4000 finishes grant 1, 2000 opens grant 2
SELECT jsonb_pretty(oracle_debit_tokens(
  '00000000-0000-0000-0000-00000000beef', '00000000-0000-0000-0000-0000000d2005',
  6000, 'DB23 fifo probe 2')) AS debit_6000_b;

\echo -- per-grant consumption: grant 1 = 10000 (exhausted), grant 2 = 2000, durable = nothing
SELECT coalesce(src.payment_ref, '(durable pool)') AS source,
       src.expires_at,
       sum(c.amount_tokens) AS consumed
  FROM oracle_token_consumption c
  LEFT JOIN oracle_token_ledger src ON src.id = c.source_id
 WHERE c.bee_id = '00000000-0000-0000-0000-00000000beef'
 GROUP BY 1, 2 ORDER BY src.expires_at NULLS LAST;

\echo -- expect plan 8000 / purchased 5000 / total 13000
SELECT * FROM oracle_token_available('00000000-0000-0000-0000-00000000beef');

\echo
\echo ================= SECTION 6 -- REPLAY: ONE DIRECTIVE, ONE DEBIT, FOREVER =================
\echo -- W-9. Same directive fired twice more: no second ledger row, and no
\echo -- second consumption row either.
SELECT jsonb_pretty(oracle_debit_tokens(
  '00000000-0000-0000-0000-00000000beef', '00000000-0000-0000-0000-0000000d2005',
  6000, 'DB23 replay 1')) AS replay_1;
SELECT jsonb_pretty(oracle_debit_tokens(
  '00000000-0000-0000-0000-00000000beef', '00000000-0000-0000-0000-0000000d2005',
  6000, 'DB23 replay 2')) AS replay_2;

SELECT count(*) AS debit_rows FROM oracle_token_ledger
 WHERE bee_id = '00000000-0000-0000-0000-00000000beef' AND entry_type = 'debit';
SELECT count(*) AS consumption_rows_for_that_directive
  FROM oracle_token_consumption c
  JOIN oracle_token_ledger d ON d.id = c.debit_id
 WHERE d.directive_id = '00000000-0000-0000-0000-0000000d2005';

\echo -- the independent second guard: (debit_id, source_id) NULLS NOT DISTINCT
SELECT indexdef FROM pg_indexes
 WHERE schemaname='public' AND indexname='oracle_token_consumption_one_per_debit_source_uidx';

\echo
\echo ================= SECTION 7 -- CONSERVATION: CREDITS - CONSUMPTION = AVAILABLE =================
\echo -- The invariant the window model could not hold. Every consumption row is
\echo -- charged exactly once, so no Token can be spent twice or vanish.
SELECT
  (SELECT sum(amount_tokens) FROM oracle_token_ledger
    WHERE bee_id='00000000-0000-0000-0000-00000000beef'
      AND entry_type IN ('purchase','grant','adjustment')) AS credits_issued,
  (SELECT sum(amount_tokens) FROM oracle_token_consumption
    WHERE bee_id='00000000-0000-0000-0000-00000000beef')   AS consumption_recorded,
  (SELECT -sum(amount_tokens) FROM oracle_token_ledger
    WHERE bee_id='00000000-0000-0000-0000-00000000beef' AND entry_type='debit') AS debits_written;

\echo -- consumption recorded must equal debits written, exactly
SELECT (SELECT coalesce(sum(amount_tokens),0) FROM oracle_token_consumption
         WHERE bee_id='00000000-0000-0000-0000-00000000beef')
     + (SELECT coalesce(sum(amount_tokens),0) FROM oracle_token_ledger
         WHERE bee_id='00000000-0000-0000-0000-00000000beef' AND entry_type='debit')
       AS must_be_zero;

\echo
\echo ================= SECTION 8 -- F-3: STATUS paused IS ACCEPTED =================
SELECT pg_get_constraintdef(oid) AS widened_check
  FROM pg_constraint WHERE conname = 'subscriptions_status_check';

\echo -- the status that used to raise 23514 and start a permanent Stripe retry storm
DO $probe$
BEGIN
  -- tier is NOT NULL with no default; omitting it fails on 23502 before the
  -- status CHECK is ever consulted, which would read as a false green.
  INSERT INTO subscriptions (bee_id, product_type, tier, status, stripe_subscription_id)
  VALUES ('00000000-0000-0000-0000-00000000beef', 'oracle', 'scout', 'paused', 'sub_DB23_paused');
  RAISE NOTICE 'status paused ACCEPTED';
EXCEPTION WHEN others THEN
  RAISE NOTICE 'status paused REFUSED -- % / %', SQLSTATE, SQLERRM;
END
$probe$;

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
SELECT to_regclass('public.oracle_token_consumption') AS consumption_table_must_be_null;
SELECT pg_get_constraintdef(oid) AS status_check_must_be_narrow_again
  FROM pg_constraint WHERE conname = 'subscriptions_status_check';
