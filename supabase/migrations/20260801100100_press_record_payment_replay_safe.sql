-- DB16 / OPS38 draft B -- press_payments replay-safety, part 2 of 2.
--
-- Makes press_record_payment replay-safe. A retried Stripe webhook previously
-- inserted a second payment row AND incremented press_holds.paid_cents a second
-- time, over-crediting the hold and potentially advancing its status. Now the
-- insert defers to the partial unique index from draft A; on a replay the
-- function returns idempotent:true and touches nothing.
--
-- Requires 20260801100000_press_payments_stripe_ref_uidx.sql to be applied and
-- indisvalid FIRST.
--
-- ROLLBACK: re-issue the predecessor definition (quoted verbatim below,
-- captured from pg_get_functiondef() during DB16 pre-flight), then drop the
-- draft A index:
--
--   CREATE OR REPLACE FUNCTION public.press_record_payment(p_hold uuid, p_kind text, p_amount_cents integer, p_method text DEFAULT 'manual'::text, p_external_ref text DEFAULT NULL::text)
--    RETURNS jsonb
--    LANGUAGE plpgsql
--    SECURITY DEFINER
--    SET search_path TO 'public'
--   AS $function$
--   begin
--     perform 1 from press_holds where id = p_hold for update;
--     if not found then raise exception 'hold not found'; end if;
--     insert into press_payments (hold_id, kind, amount_cents, method, external_ref)
--     values (p_hold, p_kind, p_amount_cents, p_method, p_external_ref);
--     update press_holds set paid_cents = paid_cents + p_amount_cents where id = p_hold;
--     perform press_advance_hold_status(p_hold);
--     return jsonb_build_object('hold_id', p_hold,
--       'status', (select status from press_holds where id=p_hold),
--       'paid_cents', (select paid_cents from press_holds where id=p_hold));
--   end $function$;

CREATE OR REPLACE FUNCTION public.press_record_payment(
  p_hold uuid, p_kind text, p_amount_cents integer,
  p_method text DEFAULT 'manual'::text, p_external_ref text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_payment_id uuid;
  v_ref text := nullif(btrim(coalesce(p_external_ref, '')), '');
begin
  perform 1 from press_holds where id = p_hold for update;
  if not found then raise exception 'hold not found'; end if;

  insert into press_payments (hold_id, kind, amount_cents, method, external_ref)
  values (p_hold, p_kind, p_amount_cents, p_method, v_ref)
  on conflict (external_ref) where method = 'stripe' and external_ref is not null
  do nothing
  returning id into v_payment_id;

  if v_payment_id is null then
    return jsonb_build_object(
      'hold_id', p_hold,
      'status', (select status from press_holds where id = p_hold),
      'paid_cents', (select paid_cents from press_holds where id = p_hold),
      'payment_id', null,
      'idempotent', true);
  end if;

  update press_holds set paid_cents = paid_cents + p_amount_cents where id = p_hold;
  perform press_advance_hold_status(p_hold);

  return jsonb_build_object(
    'hold_id', p_hold,
    'status', (select status from press_holds where id = p_hold),
    'paid_cents', (select paid_cents from press_holds where id = p_hold),
    'payment_id', v_payment_id,
    'idempotent', false);
end $function$;
