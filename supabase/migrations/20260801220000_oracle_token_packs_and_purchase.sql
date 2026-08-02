-- ============================================================================
-- 20260801220000_oracle_token_packs_and_purchase.sql
--
-- OPS50 / carries OPS35 s7a + s7b forward unchanged in substance.
-- Pack canon + the one-time-payment credit path for ORACLE Tokens.
--
-- NOTHING HERE TOUCHES stripe_events: 'oracle' has always been in its
-- product_type CHECK (OPS35 s1, re-verified live by OPS50). Do not write a
-- widen migration for it.
--
-- W-9 (money idempotency): the guarantee is the partial unique index on the
-- money row itself -- oracle_token_ledger_one_purchase_per_payment_uidx --
-- not a check-then-act in the webhook. Same shape as the existing
-- oracle_token_ledger_one_debit_per_directive_uidx.
--
-- W-10 (naming): the billing unit is "Tokens", never "Oracle Tokens", in every
-- string a Bee can read. entry_type='purchase' is a DB-layer enum that predates
-- this file and is never rendered -- do not "fix" it, the CHECK depends on it.
--
-- LANGUAGE FIREWALL: display_name is Bee-facing (it reaches the Stripe Checkout
-- page through oracle-checkout). GET / GIVE / EARN only. No buy, sell, purchase,
-- price, customer, mint.
-- ============================================================================
BEGIN;

-- ---------------------------------------------------------------------------
-- (1) THE IDEMPOTENCY KEY for pack credits.
--     payment_ref holds the Stripe Checkout Session id (cs_...). The session id
--     -- not the event id -- is the invariant that identifies the money: Stripe
--     can emit checkout.session.completed more than once for one session, each
--     delivery with a different event.id.
--
--     Safe to create: exactly one existing purchase row (payment_ref
--     'DB8-SEED-001'), no duplicates. Verified live by OPS50, not assumed.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS oracle_token_ledger_one_purchase_per_payment_uidx
  ON public.oracle_token_ledger (payment_ref)
  WHERE (entry_type = 'purchase' AND payment_ref IS NOT NULL);

-- ---------------------------------------------------------------------------
-- (2) THE IDEMPOTENCY KEY for refunds.
--     A refund is a money write, so W-9 binds it too. Key = the Stripe refund
--     id (re_...). Safe to create: all four existing adjustment rows carry a
--     NULL payment_ref. Verified live by OPS50.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS oracle_token_ledger_one_adjustment_per_refund_uidx
  ON public.oracle_token_ledger (payment_ref)
  WHERE (entry_type = 'adjustment' AND payment_ref IS NOT NULL);

-- ---------------------------------------------------------------------------
-- (3) Pack canon, server-side. The client names a pack_code, NEVER an amount.
--     A client that can name an amount can name 1.
--     Values are ORACLE_MF v0.16 s5 verbatim -- not re-derived.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.oracle_token_packs (
  pack_code     text PRIMARY KEY CHECK (pack_code ~ '^[a-z0-9_]{2,32}$'),
  usd_cents     integer NOT NULL CHECK (usd_cents >= 500),   -- 5 USD floor, canon
  tokens        numeric NOT NULL CHECK (tokens > 0),
  display_name  text    NOT NULL,
  sort_order    integer NOT NULL DEFAULT 0,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.oracle_token_packs (pack_code, usd_cents, tokens, display_name, sort_order) VALUES
  ('starter',  500,   5000, 'Starter',  1),   -- 1,000 Tokens / USD  (anchor, no bonus)
  ('regular', 1000,  11000, 'Regular',  2),   -- 1,100 / USD  (+10%)
  ('plus',    2500,  30000, 'Plus',     3),   -- 1,200 / USD  (+20%)
  ('pro',     6000,  78000, 'Pro',      4)    -- 1,300 / USD  (+30%)
ON CONFLICT (pack_code) DO NOTHING;

ALTER TABLE public.oracle_token_packs ENABLE ROW LEVEL SECURITY;

-- Postgres default privileges auto-grant on new public tables in this project,
-- so the REVOKE is required -- RLS alone would otherwise be the only guard.
REVOKE ALL ON public.oracle_token_packs FROM anon, authenticated;
GRANT SELECT ON public.oracle_token_packs TO anon, authenticated, service_role;

DROP POLICY IF EXISTS oracle_token_packs_public_read ON public.oracle_token_packs;
CREATE POLICY oracle_token_packs_public_read ON public.oracle_token_packs
  FOR SELECT USING (active = true);
-- No INSERT/UPDATE/DELETE policy: pack canon changes by migration only.

-- ---------------------------------------------------------------------------
-- (4) oracle_credit_token_purchase -- the ONLY way pack Tokens are credited.
--     SECURITY DEFINER so it can insert past the ledger's no-INSERT-policy
--     posture. service_role / platform admin only.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.oracle_credit_token_purchase(
  p_bee_id       uuid,
  p_pack_code    text,
  p_payment_ref  text,
  p_amount_cents integer,
  p_method       text DEFAULT 'stripe'
) RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_pack public.oracle_token_packs; v_id uuid; v_existing uuid;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'oracle_credit_token_purchase is service-role / admin only';
  END IF;
  IF p_payment_ref IS NULL OR btrim(p_payment_ref) = '' THEN
    RAISE EXCEPTION 'payment_ref required';   -- without it the unique guard does not apply
  END IF;
  IF NOT EXISTS (SELECT 1 FROM bees WHERE id = p_bee_id) THEN
    RAISE EXCEPTION 'bee % not found', p_bee_id;
  END IF;

  SELECT * INTO v_pack FROM oracle_token_packs WHERE pack_code = p_pack_code AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown or inactive pack %', p_pack_code; END IF;

  -- Stripe is the source of truth for WHETHER money moved; this table is the
  -- source of truth for HOW MUCH. A mismatch is refused, never absorbed.
  IF p_amount_cents IS DISTINCT FROM v_pack.usd_cents THEN
    RAISE EXCEPTION 'amount % does not match pack % (%)',
      p_amount_cents, p_pack_code, v_pack.usd_cents;
  END IF;

  BEGIN
    INSERT INTO oracle_token_ledger
      (bee_id, entry_type, amount_tokens, payment_ref, payment_method, memo)
    VALUES
      (p_bee_id, 'purchase', v_pack.tokens, p_payment_ref, p_method,
       'pack ' || p_pack_code || ' @ '
         || btrim(to_char(v_pack.usd_cents / 100.0, 'FM999999990.00')) || ' USD')
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    -- The guard fired. Already credited. NOT an error -- tell the caller to stop.
    SELECT id INTO v_existing FROM oracle_token_ledger
     WHERE entry_type = 'purchase' AND payment_ref = p_payment_ref;
    RETURN jsonb_build_object('credited', false, 'duplicate', true,
                              'ledger_id', v_existing, 'payment_ref', p_payment_ref);
  END;

  RETURN jsonb_build_object('credited', true, 'duplicate', false,
                            'ledger_id', v_id, 'tokens', v_pack.tokens,
                            'pack_code', p_pack_code);
END $function$;

REVOKE ALL ON FUNCTION public.oracle_credit_token_purchase(uuid,text,text,integer,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.oracle_credit_token_purchase(uuid,text,text,integer,text)
  TO service_role;

COMMIT;
