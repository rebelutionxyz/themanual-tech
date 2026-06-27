-- DNA D2 Transfer cluster: bling_send routes through lot_debit(sender) + lot_credit(recipient).
-- Sender jars drain FIFO, partial leftovers keep full DNA; recipient gets a fresh 'transfer' jar with
-- scrubbed ({}) DNA — the departed-portion rule (what leaves carries systemic DNA only). Caller checks,
-- min-send, self-send guard, balance check, both bling_transactions, and return shape all preserved.
CREATE OR REPLACE FUNCTION public.bling_send(p_sender_id uuid, p_recipient_id uuid, p_amount numeric, p_category text DEFAULT NULL, p_memo text DEFAULT NULL)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE
    v_caller uuid := auth.uid();
    v_sender_balance numeric(20,6); v_sender_balance_after numeric(20,6); v_recipient_balance_after numeric(20,6);
    v_min_send constant numeric(20,6) := 0.1; v_debit_tx_id bigint; v_credit_tx_id bigint;
BEGIN
    IF v_caller IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
    IF v_caller <> p_sender_id THEN RAISE EXCEPTION 'caller % may not SEND from bee %', v_caller, p_sender_id; END IF;
    IF p_sender_id = p_recipient_id THEN RAISE EXCEPTION 'cannot SEND to self'; END IF;
    IF p_amount < v_min_send THEN RAISE EXCEPTION 'minimum SEND is % BLiNG!', v_min_send; END IF;
    SELECT bling_balance INTO v_sender_balance FROM public.bees WHERE id = p_sender_id FOR UPDATE;
    IF v_sender_balance IS NULL THEN RAISE EXCEPTION 'sender bee % not found', p_sender_id; END IF;
    IF v_sender_balance < p_amount THEN RAISE EXCEPTION 'insufficient balance (% < %)', v_sender_balance, p_amount; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.bees WHERE id = p_recipient_id) THEN RAISE EXCEPTION 'recipient bee % not found', p_recipient_id; END IF;
    PERFORM public.lot_debit(p_sender_id, p_amount, 'send');
    SELECT bling_balance INTO v_sender_balance_after FROM public.bees WHERE id = p_sender_id;
    PERFORM public.lot_credit(p_recipient_id, p_amount, 'transfer', '{}'::jsonb);
    SELECT bling_balance INTO v_recipient_balance_after FROM public.bees WHERE id = p_recipient_id;
    INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, counterparty_bee_id, category, memo)
    VALUES (p_sender_id, 'send_debit', -p_amount, v_sender_balance_after, p_recipient_id, p_category, p_memo) RETURNING id INTO v_debit_tx_id;
    INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, counterparty_bee_id, category, memo)
    VALUES (p_recipient_id, 'send_credit', p_amount, v_recipient_balance_after, p_sender_id, p_category, p_memo) RETURNING id INTO v_credit_tx_id;
    RETURN jsonb_build_object('ok',true,'debit_tx_id',v_debit_tx_id,'credit_tx_id',v_credit_tx_id,'sender_balance_after',v_sender_balance_after,'recipient_balance_after',v_recipient_balance_after);
END; $function$;
