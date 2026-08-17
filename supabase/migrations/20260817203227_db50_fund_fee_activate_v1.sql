-- DB50 — ACTIVATE THE FUND PLATFORM FEE (2026-08-17)
-- ROLLBACK: _drafts/20260817190000_db50_fund_fee_activate_v1_rollback.sql
--
-- RULING (Butch, 2026-08-17, FUND_MF v0.1 FEE stanza, option A): activate the
-- EXISTING 2% design. fee_schedule.fee_key='give' has carried platform_pct=2
-- since 2026-06-27 and has sat active=false with the note "dormant until payout
-- rails". The 0% reported before today was the v14 FUNCTION BEHAVIOUR — it never
-- set application_fee_amount at all — and was never a ruling.
--
-- THIS MIGRATION FLIPS ONE BOOLEAN. It changes no rate: platform_pct stays 2,
-- exactly as designed. It is deliberately paired with fountain v15, which reads
-- the rate through fee_resolve('give', …) AT CALL TIME and sets
-- application_fee_amount on the PaymentIntent. The pairing is the whole point —
-- **a live fee row against a function that ignores it is a silent lie**, and so
-- is a deployed v15 against a dormant row (it would charge nothing while the
-- config claims 2%). Neither half is correct alone; they land together.
--
-- WHY active=false IS A REAL KILL SWITCH, not just bookkeeping: fee_resolve()
-- filters on `fs.active`, so a deactivated row resolves to NULL, and v15 treats
-- NULL as "no platform fee" and omits application_fee_amount entirely. The fee
-- can be turned off by this one row without redeploying anything.
--
-- NO CUSTODY, STILL. Pledges remain DIRECT charges on the campaign manager's
-- Connect account. application_fee_amount is the one mechanism by which a
-- platform takes a cut of a direct charge without the funds ever landing in the
-- platform's balance — Stripe splits at settlement. This migration does NOT move
-- the Fountain to destination charges and does not put the platform in the flow
-- of the manager's funds.
--
-- AON INTERACTION. Pledges are manual-capture (Pattern B, charge-at-close). No
-- capture, no charge; no charge, no application fee. So on an AON campaign that
-- misses its goal every authorization is cancelled and **the platform collects
-- nothing** — the fee is only ever collected on a funded campaign. That is a
-- property of manual capture, not of this row.
--
-- ROWS AT RISK: exactly one, and it is configuration, not money. There are no
-- per-astra or per-bee 'give' overrides today (astra_ref and bee_ref are NULL on
-- every fee_schedule row), so the WHERE clause below matches one row and the
-- assertion afterwards proves it.

BEGIN;

UPDATE public.fee_schedule
   SET active = true,
       note = 'Crowdfunding / The Fountain. ACTIVE 2026-08-17 (Butch ruling, FUND_MF v0.1 FEE, option A). '
              'platform_pct read at call time by fountain v15 -> PaymentIntent.application_fee_amount on a '
              'DIRECT charge; no custody. Manual capture means the fee is only ever collected on a funded '
              'campaign. Flip active=false to stop charging it without a redeploy. DB50.',
       updated_at = now()
 WHERE fee_key = 'give' AND astra_ref IS NULL AND bee_ref IS NULL;

-- Read the write back (W-8): the row must now be active, and it must still carry
-- the 2 the ruling activated rather than a rate this migration invented.
DO $$
DECLARE v record; v_n int;
BEGIN
  SELECT count(*) INTO v_n FROM public.fee_schedule
   WHERE fee_key = 'give' AND astra_ref IS NULL AND bee_ref IS NULL;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'DB50 expected exactly 1 global give fee row, found %', v_n;
  END IF;

  SELECT * INTO v FROM public.fee_schedule
   WHERE fee_key = 'give' AND astra_ref IS NULL AND bee_ref IS NULL;
  IF v.active IS NOT TRUE THEN
    RAISE EXCEPTION 'DB50 did not activate the give fee row (active=%)', v.active;
  END IF;
  IF v.platform_pct IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'DB50 refuses to activate a give rate of % — the ruling activated 2', v.platform_pct;
  END IF;

  -- fee_resolve() is the path fountain v15 actually calls. Asserting on the table
  -- alone would not prove the function can see the row.
  IF (SELECT (public.fee_resolve('give')).platform_pct) IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'DB50 activated the row but fee_resolve(give) does not return it';
  END IF;
END $$;

COMMIT;
