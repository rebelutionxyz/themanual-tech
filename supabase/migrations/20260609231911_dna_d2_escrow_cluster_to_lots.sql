-- DNA D2 Escrow cluster (8 fns): balance->holding = lot_debit (escrow_hold / atlasoracle_escrow);
-- holding->balance = lot_credit(origin 'escrow', born fresh) for release, cancel, timelock, oracle withdraw,
-- emergency & retirement unlock. Escrow/pots/accrual tables are the off-shelf staging layer (Call 3); supply-neutral.
-- All caller checks, escrow-state guards, pot legs, accrual schedule checks, and bling_transactions preserved.
CREATE OR REPLACE FUNCTION public.bling_escrow_create(p_creator_id uuid, p_recipient_id uuid, p_amount numeric, p_kind text, p_memo text DEFAULT NULL, p_timelock_release_at timestamptz DEFAULT NULL)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public' AS $function$
DECLARE v_caller uuid := auth.uid(); v_creator_balance numeric(20,6); v_balance_after numeric(20,6); v_escrow_id bigint; v_tx_id bigint;
BEGIN
    IF v_caller IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
    IF v_caller <> p_creator_id THEN RAISE EXCEPTION 'caller % may not create escrow from bee %', v_caller, p_creator_id; END IF;
    IF p_amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
    IF p_kind NOT IN ('p2p','order_match','crowdfund','campaign','timelock') THEN RAISE EXCEPTION 'invalid kind %', p_kind; END IF;
    IF p_kind = 'timelock' AND p_timelock_release_at IS NULL THEN RAISE EXCEPTION 'timelock kind requires timelock_release_at'; END IF;
    IF p_kind <> 'timelock' AND p_timelock_release_at IS NOT NULL THEN RAISE EXCEPTION 'timelock_release_at only valid for kind=timelock'; END IF;
    SELECT bling_balance INTO v_creator_balance FROM public.bees WHERE id = p_creator_id FOR UPDATE;
    IF v_creator_balance IS NULL THEN RAISE EXCEPTION 'creator bee % not found', p_creator_id; END IF;
    IF v_creator_balance < p_amount THEN RAISE EXCEPTION 'insufficient balance (% < %)', v_creator_balance, p_amount; END IF;
    PERFORM public.lot_debit(p_creator_id, p_amount, 'escrow_hold');
    SELECT bling_balance INTO v_balance_after FROM public.bees WHERE id = p_creator_id;
    INSERT INTO public.bling_escrows (creator_id, recipient_id, amount, kind, memo, timelock_release_at)
    VALUES (p_creator_id, p_recipient_id, p_amount, p_kind, p_memo, p_timelock_release_at) RETURNING id INTO v_escrow_id;
    INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, counterparty_bee_id, ref_escrow_id, memo)
    VALUES (p_creator_id, 'escrow_hold', -p_amount, v_balance_after, p_recipient_id, v_escrow_id, p_memo) RETURNING id INTO v_tx_id;
    RETURN jsonb_build_object('ok',true,'escrow_id',v_escrow_id,'tx_id',v_tx_id,'balance_after',v_balance_after);
END; $function$;

CREATE OR REPLACE FUNCTION public.bling_escrow_release(p_escrow_id bigint, p_actor_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public' AS $function$
DECLARE v_caller uuid := auth.uid(); v_escrow record; v_recipient_balance_after numeric(20,6); v_tx_id bigint;
BEGIN
    IF v_caller IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
    IF v_caller <> p_actor_id THEN RAISE EXCEPTION 'caller may not act as bee %', p_actor_id; END IF;
    SELECT * INTO v_escrow FROM public.bling_escrows WHERE id = p_escrow_id FOR UPDATE;
    IF v_escrow IS NULL THEN RAISE EXCEPTION 'escrow % not found', p_escrow_id; END IF;
    IF v_escrow.status <> 'held' THEN RAISE EXCEPTION 'escrow status is %, cannot release', v_escrow.status; END IF;
    IF v_escrow.creator_id <> p_actor_id THEN RAISE EXCEPTION 'only creator may release this escrow'; END IF;
    UPDATE public.bling_escrows SET status='released', released_at=now() WHERE id = p_escrow_id;
    PERFORM public.lot_credit(v_escrow.recipient_id, v_escrow.amount, 'escrow', jsonb_build_object('escrow_id',p_escrow_id,'kind',v_escrow.kind));
    SELECT bling_balance INTO v_recipient_balance_after FROM public.bees WHERE id = v_escrow.recipient_id;
    INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, counterparty_bee_id, ref_escrow_id, memo)
    VALUES (v_escrow.recipient_id, 'escrow_release', v_escrow.amount, v_recipient_balance_after, v_escrow.creator_id, p_escrow_id, v_escrow.memo) RETURNING id INTO v_tx_id;
    RETURN jsonb_build_object('ok',true,'tx_id',v_tx_id,'recipient_balance_after',v_recipient_balance_after);
END; $function$;

CREATE OR REPLACE FUNCTION public.bling_escrow_cancel(p_escrow_id bigint, p_actor_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public' AS $function$
DECLARE v_caller uuid := auth.uid(); v_escrow record; v_creator_balance_after numeric(20,6); v_tx_id bigint;
BEGIN
    IF v_caller IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
    IF v_caller <> p_actor_id THEN RAISE EXCEPTION 'caller may not act as bee %', p_actor_id; END IF;
    SELECT * INTO v_escrow FROM public.bling_escrows WHERE id = p_escrow_id FOR UPDATE;
    IF v_escrow IS NULL THEN RAISE EXCEPTION 'escrow % not found', p_escrow_id; END IF;
    IF v_escrow.status <> 'held' THEN RAISE EXCEPTION 'escrow status is %, cannot cancel', v_escrow.status; END IF;
    IF v_escrow.creator_id <> p_actor_id THEN RAISE EXCEPTION 'only creator may cancel this escrow'; END IF;
    UPDATE public.bling_escrows SET status='cancelled', cancelled_at=now() WHERE id = p_escrow_id;
    PERFORM public.lot_credit(v_escrow.creator_id, v_escrow.amount, 'escrow', jsonb_build_object('escrow_id',p_escrow_id,'kind',v_escrow.kind,'cancelled',true));
    SELECT bling_balance INTO v_creator_balance_after FROM public.bees WHERE id = v_escrow.creator_id;
    INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, counterparty_bee_id, ref_escrow_id, memo)
    VALUES (v_escrow.creator_id, 'escrow_cancel', v_escrow.amount, v_creator_balance_after, v_escrow.recipient_id, p_escrow_id, v_escrow.memo) RETURNING id INTO v_tx_id;
    RETURN jsonb_build_object('ok',true,'tx_id',v_tx_id,'creator_balance_after',v_creator_balance_after);
END; $function$;

CREATE OR REPLACE FUNCTION public.bling_escrow_timelock(p_escrow_id bigint)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public' AS $function$
DECLARE v_escrow record; v_recipient_balance_after numeric(20,6); v_tx_id bigint;
BEGIN
    SELECT * INTO v_escrow FROM public.bling_escrows WHERE id = p_escrow_id FOR UPDATE;
    IF v_escrow IS NULL THEN RAISE EXCEPTION 'escrow % not found', p_escrow_id; END IF;
    IF v_escrow.kind <> 'timelock' THEN RAISE EXCEPTION 'escrow % is not timelock kind', p_escrow_id; END IF;
    IF v_escrow.status <> 'held' THEN RAISE EXCEPTION 'escrow % status is %, cannot timelock-release', p_escrow_id, v_escrow.status; END IF;
    IF v_escrow.timelock_release_at > now() THEN RAISE EXCEPTION 'timelock not yet elapsed (releases at %)', v_escrow.timelock_release_at; END IF;
    UPDATE public.bling_escrows SET status='released', released_at=now() WHERE id = p_escrow_id;
    PERFORM public.lot_credit(v_escrow.recipient_id, v_escrow.amount, 'escrow', jsonb_build_object('escrow_id',p_escrow_id,'kind','timelock'));
    SELECT bling_balance INTO v_recipient_balance_after FROM public.bees WHERE id = v_escrow.recipient_id;
    INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, counterparty_bee_id, ref_escrow_id, memo)
    VALUES (v_escrow.recipient_id, 'escrow_release', v_escrow.amount, v_recipient_balance_after, v_escrow.creator_id, p_escrow_id, 'timelock auto-release') RETURNING id INTO v_tx_id;
    RETURN jsonb_build_object('ok',true,'tx_id',v_tx_id,'recipient_balance_after',v_recipient_balance_after);
END; $function$;

CREATE OR REPLACE FUNCTION public.atlasoracle_deposit_to_escrow(p_amount numeric)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public' AS $function$
DECLARE v_caller uuid := auth.uid(); v_main_balance numeric(20,6); v_main_balance_after numeric(20,6); v_escrow_balance_after numeric(20,6); v_min_amount constant numeric(20,6) := 0.1; v_debit_tx_id bigint; v_credit_tx_id bigint;
BEGIN
    IF v_caller IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
    IF p_amount IS NULL OR p_amount < v_min_amount THEN RAISE EXCEPTION 'minimum deposit is % BLiNG!', v_min_amount; END IF;
    SELECT bling_balance INTO v_main_balance FROM public.bees WHERE id = v_caller FOR UPDATE;
    IF v_main_balance IS NULL THEN RAISE EXCEPTION 'caller bee % not found', v_caller; END IF;
    IF v_main_balance < p_amount THEN RAISE EXCEPTION 'insufficient main balance (% < %)', v_main_balance, p_amount; END IF;
    PERFORM public.lot_debit(v_caller, p_amount, 'atlasoracle_escrow');
    SELECT bling_balance INTO v_main_balance_after FROM public.bees WHERE id = v_caller;
    INSERT INTO public.bling_pots (bee_id, purpose, balance) VALUES (v_caller, 'atlasoracle', p_amount)
    ON CONFLICT (bee_id, purpose) DO UPDATE SET balance = public.bling_pots.balance + EXCLUDED.balance, updated_at = now() RETURNING balance INTO v_escrow_balance_after;
    INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, source_type, memo)
    VALUES (v_caller, 'atlasoracle_escrow_deposit', -p_amount, v_main_balance_after, 'atlasoracle_escrow_deposit', 'AtlasOracle escrow funded') RETURNING id INTO v_debit_tx_id;
    INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, source_type, memo)
    VALUES (v_caller, 'atlasoracle_escrow_deposit', p_amount, v_escrow_balance_after, 'atlasoracle_escrow_deposit', 'AtlasOracle escrow funded (pot leg)') RETURNING id INTO v_credit_tx_id;
    RETURN jsonb_build_object('ok',true,'transaction_id',v_debit_tx_id,'pot_transaction_id',v_credit_tx_id,'main_balance_after',v_main_balance_after,'escrow_balance_after',v_escrow_balance_after);
END; $function$;

CREATE OR REPLACE FUNCTION public.atlasoracle_withdraw_from_escrow(p_amount numeric)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public' AS $function$
DECLARE v_caller uuid := auth.uid(); v_escrow_balance numeric(20,6); v_escrow_balance_after numeric(20,6); v_main_balance_after numeric(20,6); v_min_amount constant numeric(20,6) := 0.1; v_debit_tx_id bigint; v_credit_tx_id bigint;
BEGIN
    IF v_caller IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
    IF p_amount IS NULL OR p_amount < v_min_amount THEN RAISE EXCEPTION 'minimum withdrawal is % BLiNG!', v_min_amount; END IF;
    SELECT balance INTO v_escrow_balance FROM public.bling_pots WHERE bee_id = v_caller AND purpose = 'atlasoracle' FOR UPDATE;
    IF v_escrow_balance IS NULL THEN RAISE EXCEPTION 'no atlasoracle escrow pot for bee %', v_caller; END IF;
    IF v_escrow_balance < p_amount THEN RAISE EXCEPTION 'insufficient escrow balance (% < %)', v_escrow_balance, p_amount; END IF;
    UPDATE public.bling_pots SET balance = balance - p_amount, updated_at = now() WHERE bee_id = v_caller AND purpose = 'atlasoracle' RETURNING balance INTO v_escrow_balance_after;
    PERFORM public.lot_credit(v_caller, p_amount, 'escrow', jsonb_build_object('purpose','atlasoracle'));
    SELECT bling_balance INTO v_main_balance_after FROM public.bees WHERE id = v_caller;
    INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, source_type, memo)
    VALUES (v_caller, 'atlasoracle_escrow_withdraw', -p_amount, v_escrow_balance_after, 'atlasoracle_escrow_withdraw', 'Withdrawn from AtlasOracle escrow (pot leg)') RETURNING id INTO v_debit_tx_id;
    INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, source_type, memo)
    VALUES (v_caller, 'atlasoracle_escrow_withdraw', p_amount, v_main_balance_after, 'atlasoracle_escrow_withdraw', 'Withdrawn from AtlasOracle escrow') RETURNING id INTO v_credit_tx_id;
    RETURN jsonb_build_object('ok',true,'transaction_id',v_credit_tx_id,'pot_transaction_id',v_debit_tx_id,'main_balance_after',v_main_balance_after,'escrow_balance_after',v_escrow_balance_after);
END; $function$;

CREATE OR REPLACE FUNCTION public.emergency_fund_escrow_unlock(p_bee_id uuid, p_unlock_amount numeric)
 RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public' AS $function$
DECLARE v_escrow public.bling_emergency_fund_escrows%ROWTYPE; v_current_year INT := EXTRACT(YEAR FROM now())::INT; v_year_on_schedule INT; v_active BOOLEAN; v_tx_id BIGINT; v_new_balance NUMERIC(20,6);
BEGIN
  IF p_unlock_amount IS NULL OR p_unlock_amount <= 0 THEN RAISE EXCEPTION 'unlock amount must be > 0 (got %)', p_unlock_amount; END IF;
  SELECT * INTO v_escrow FROM public.bling_emergency_fund_escrows WHERE bee_id = p_bee_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'no emergency fund escrow row for bee %', p_bee_id; END IF;
  IF v_escrow.unlock_state IN ('suspended','banned','deceased') THEN RAISE EXCEPTION 'emergency fund escrow state=% — unlock not permitted', v_escrow.unlock_state; END IF;
  IF v_escrow.first_accrual_year IS NULL THEN RAISE EXCEPTION 'first_accrual_year not set on emergency fund escrow for bee %', p_bee_id; END IF;
  v_year_on_schedule := v_current_year - v_escrow.first_accrual_year + 1;
  IF v_year_on_schedule < 1 THEN RAISE EXCEPTION 'invalid year_on_schedule % for emergency fund unlock', v_year_on_schedule; END IF;
  IF v_escrow.total_unlocked + p_unlock_amount > v_escrow.total_accrued THEN RAISE EXCEPTION 'unlock would exceed total_accrued (% + % > %)', v_escrow.total_unlocked, p_unlock_amount, v_escrow.total_accrued; END IF;
  v_active := public.active_membership_check(p_bee_id, 365);
  IF NOT v_active THEN RAISE EXCEPTION 'bee % not active in past 365 days; emergency fund unlock delayed (spec §6.1)', p_bee_id; END IF;
  UPDATE public.bling_emergency_fund_escrows SET total_unlocked = total_unlocked + p_unlock_amount, last_active_year = v_current_year,
        unlock_state = CASE WHEN total_unlocked + p_unlock_amount >= total_accrued THEN 'fully_unlocked' ELSE 'unlocking' END, updated_at = now() WHERE bee_id = p_bee_id;
  PERFORM public.lot_credit(p_bee_id, p_unlock_amount, 'escrow', jsonb_build_object('category','emergency_fund'));
  SELECT bling_balance INTO v_new_balance FROM public.bees WHERE id = p_bee_id;
  UPDATE public.bees SET updated_at = now() WHERE id = p_bee_id;
  INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, currency_type, category, origin_restricted)
  VALUES (p_bee_id, 'escrow_unlock', p_unlock_amount, v_new_balance, 'BLiNG', 'emergency_fund', TRUE) RETURNING id INTO v_tx_id;
  RETURN v_tx_id;
END; $function$;

CREATE OR REPLACE FUNCTION public.retirement_escrow_unlock(p_bee_id uuid, p_unlock_amount numeric)
 RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public' AS $function$
DECLARE v_escrow public.bling_retirement_escrows%ROWTYPE; v_current_year INT := EXTRACT(YEAR FROM now())::INT; v_year_on_schedule INT; v_active BOOLEAN; v_tx_id BIGINT; v_new_balance NUMERIC(20,6);
BEGIN
  IF p_unlock_amount IS NULL OR p_unlock_amount <= 0 THEN RAISE EXCEPTION 'unlock amount must be > 0 (got %)', p_unlock_amount; END IF;
  SELECT * INTO v_escrow FROM public.bling_retirement_escrows WHERE bee_id = p_bee_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'no retirement escrow row for bee %', p_bee_id; END IF;
  IF v_escrow.unlock_state IN ('suspended','banned','deceased') THEN RAISE EXCEPTION 'retirement escrow state=% — unlock not permitted', v_escrow.unlock_state; END IF;
  IF v_escrow.first_active_year IS NULL THEN RAISE EXCEPTION 'first_active_year not set on retirement escrow for bee %', p_bee_id; END IF;
  v_year_on_schedule := v_current_year - v_escrow.first_active_year + 1;
  IF v_year_on_schedule < 6 THEN RAISE EXCEPTION 'retirement cliff not passed (year % of schedule; need >= 6 per spec §5.1)', v_year_on_schedule; END IF;
  IF v_escrow.total_unlocked + p_unlock_amount > v_escrow.total_accrued THEN RAISE EXCEPTION 'unlock would exceed total_accrued (% + % > %)', v_escrow.total_unlocked, p_unlock_amount, v_escrow.total_accrued; END IF;
  v_active := public.active_membership_check(p_bee_id, 365);
  IF NOT v_active THEN RAISE EXCEPTION 'bee % not active in past 365 days; retirement unlock delayed (spec §6.1)', p_bee_id; END IF;
  UPDATE public.bling_retirement_escrows SET total_unlocked = total_unlocked + p_unlock_amount, last_active_year = v_current_year,
        unlock_state = CASE WHEN total_unlocked + p_unlock_amount >= total_accrued THEN 'fully_unlocked' ELSE 'unlocking' END, updated_at = now() WHERE bee_id = p_bee_id;
  PERFORM public.lot_credit(p_bee_id, p_unlock_amount, 'escrow', jsonb_build_object('category','retirement'));
  SELECT bling_balance INTO v_new_balance FROM public.bees WHERE id = p_bee_id;
  UPDATE public.bees SET updated_at = now() WHERE id = p_bee_id;
  INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, currency_type, category, origin_restricted)
  VALUES (p_bee_id, 'escrow_unlock', p_unlock_amount, v_new_balance, 'BLiNG', 'retirement', FALSE) RETURNING id INTO v_tx_id;
  RETURN v_tx_id;
END; $function$;
