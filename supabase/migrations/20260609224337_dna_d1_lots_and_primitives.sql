-- DNA/Heritage D1: the jar substrate + the two universal choke points. ADDITIVE — primitives are
-- dormant (nothing calls them yet); D2 rewires the ~21 balance functions to flow through them and
-- demotes bees.bling_balance to a maintained cache (= sum of active remaining lots). Locks 2026-06-09:
-- (1) lots = truth, balance = cache; (2) DNA = hot cols + jsonb hybrid; (3) lots born at maturation (holds/escrow stay pre-lot).
CREATE TABLE public.bling_lots (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bee_id uuid NOT NULL REFERENCES public.bees(id),
  amount_original numeric(24,6) NOT NULL CHECK (amount_original > 0),
  amount_remaining numeric(24,6) NOT NULL CHECK (amount_remaining >= 0),
  origin text NOT NULL,                          -- freeing mechanism: genesis|drop|drip|drip_royalty|affiliate|birthday|anniversary|system
  vintage text NOT NULL,                         -- sticky-through-recycle birth vintage (e.g. '2026')
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','spent','recycled')),
  sealed_multiplier numeric,                     -- sealed bomb (NULL=none; 2/3/10/100) — D4 fires
  sealed_revealed boolean NOT NULL DEFAULT false,
  dna jsonb NOT NULL DEFAULT '{}'::jsonb,         -- the rest of DNA: {campaign:{kind,ref,redemption_policy_ref}, naming:{author,display,named}, inscriptions:[...]}
  freed_at timestamptz NOT NULL DEFAULT now(),    -- this freeing event (updates on re-free; vintage persists)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bling_lots_remaining_le_original CHECK (amount_remaining <= amount_original)
);

CREATE INDEX bling_lots_shelf_idx ON public.bling_lots (bee_id, status, id);

ALTER TABLE public.bling_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY bling_lots_owner_read ON public.bling_lots FOR SELECT USING ((bee_id = auth.uid()) OR (auth.role() = 'service_role'));

COMMENT ON TABLE public.bling_lots IS 'The shelf of jars: BLiNG! lots = source of truth; bees.bling_balance is the maintained cache (= sum of active remaining). DNA hot-cols + jsonb. D1 2026-06-09; wired in D2. Reserved dna keys: campaign{kind,ref,redemption_policy_ref}, naming{author,display,named}, inscriptions[].';

CREATE OR REPLACE FUNCTION public.lot_credit(p_bee_id uuid, p_amount numeric, p_origin text, p_dna jsonb DEFAULT '{}'::jsonb, p_vintage text DEFAULT NULL, p_sealed_multiplier numeric DEFAULT NULL)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE v_id bigint; v_vintage text := COALESCE(p_vintage, to_char(now(),'YYYY'));
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'lot_credit: amount must be > 0'; END IF;
  IF p_origin IS NULL OR length(btrim(p_origin))=0 THEN RAISE EXCEPTION 'lot_credit: origin required'; END IF;
  INSERT INTO public.bling_lots (bee_id, amount_original, amount_remaining, origin, vintage, dna, sealed_multiplier)
  VALUES (p_bee_id, p_amount, p_amount, p_origin, v_vintage, COALESCE(p_dna,'{}'::jsonb), p_sealed_multiplier)
  RETURNING id INTO v_id;
  UPDATE public.bees SET bling_balance = bling_balance + p_amount WHERE id = p_bee_id;
  RETURN v_id;
END; $fn$;

REVOKE EXECUTE ON FUNCTION public.lot_credit(uuid,numeric,text,jsonb,text,numeric) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.lot_debit(p_bee_id uuid, p_amount numeric, p_reason text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE v_need numeric := p_amount; v_take numeric; v_avail numeric; r record; v_touched int := 0;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'lot_debit: amount must be > 0'; END IF;
  SELECT COALESCE(sum(amount_remaining),0) INTO v_avail FROM public.bling_lots WHERE bee_id=p_bee_id AND status='active';
  IF v_avail < p_amount THEN RAISE EXCEPTION 'lot_debit: insufficient (% available, % requested)', v_avail, p_amount; END IF;
  FOR r IN SELECT id, amount_remaining FROM public.bling_lots WHERE bee_id=p_bee_id AND status='active' ORDER BY id FOR UPDATE LOOP
    EXIT WHEN v_need <= 0;
    v_take := LEAST(r.amount_remaining, v_need);
    UPDATE public.bling_lots SET amount_remaining = amount_remaining - v_take,
      status = CASE WHEN amount_remaining - v_take <= 0 THEN 'spent' ELSE 'active' END, updated_at = now()
    WHERE id = r.id;
    v_need := v_need - v_take; v_touched := v_touched + 1;
  END LOOP;
  UPDATE public.bees SET bling_balance = bling_balance - p_amount WHERE id = p_bee_id;
  RETURN v_touched;
END; $fn$;

REVOKE EXECUTE ON FUNCTION public.lot_debit(uuid,numeric,text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.lot_reconcile_balance(p_bee_id uuid)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE v_sum numeric;
BEGIN
  SELECT COALESCE(sum(amount_remaining),0) INTO v_sum FROM public.bling_lots WHERE bee_id=p_bee_id AND status='active';
  UPDATE public.bees SET bling_balance = v_sum WHERE id = p_bee_id;
  RETURN v_sum;
END; $fn$;

REVOKE EXECUTE ON FUNCTION public.lot_reconcile_balance(uuid) FROM PUBLIC;
