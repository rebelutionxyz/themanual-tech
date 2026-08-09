-- ROLLBACK for 20260808235500_db40_press_spot_offer_lock_fix_v1.sql
-- WRITTEN BEFORE THE APPLY, per the MIGRATION AMENDMENT.
--
-- WARNING: this restores the version that CANNOT RUN. Both slot-selection
-- branches combine array_agg(...) with FOR UPDATE, which Postgres rejects
-- outright ("FOR UPDATE is not allowed with aggregate functions"), so
-- press_spot_offer raises on every call down either branch. Measured after the
-- press_is_admin fix, as an authenticated admin, against a real open edition.
--
-- Prior definition captured with pg_get_functiondef() BEFORE the apply.

CREATE OR REPLACE FUNCTION public.press_spot_offer(p_edition uuid, p_slot_ids uuid[], p_side text DEFAULT NULL::text, p_quadrant text DEFAULT NULL::text, p_rate_cents_per_sqin integer DEFAULT NULL::integer, p_business_name text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_expires_hours integer DEFAULT 24, p_affiliate_code text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid(); v_e press_editions; v_slots uuid[]; v_area numeric;
  v_rate int; v_total int; v_adv uuid; v_aff uuid; v_hold uuid; v_is_aff boolean := false;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  select * into v_e from press_editions where id = p_edition and status='open';
  if not found then raise exception 'edition not open'; end if;

  if p_affiliate_code is not null then
    select id into v_aff from press_advertisers where referral_code = upper(p_affiliate_code);
    v_is_aff := v_aff is not null and exists(select 1 from press_advertisers where id=v_aff and auth_user_id=v_uid);
  end if;
  if not (press_is_admin(v_uid) or v_is_aff) then
    raise exception 'only admin or the owning affiliate may issue spot offers'; end if;

  if p_slot_ids is not null then
    select array_agg(s.id) into v_slots from press_slots s
     where s.id = any(p_slot_ids) and s.edition_id=p_edition and s.status='open' for update;
  elsif p_side is not null and p_quadrant is not null then
    select array_agg(s.id) into v_slots
     from press_slots s join press_slot_templates st on st.id=s.slot_template_id
     where s.edition_id=p_edition and st.side=p_side and st.quadrant=p_quadrant
       and st.slot_kind='grid' and s.status='open' for update;
  else raise exception 'give slot_ids or side+quadrant'; end if;
  if v_slots is null then raise exception 'no open slots'; end if;

  v_rate := coalesce(p_rate_cents_per_sqin, v_e.base_rate_cents_per_sqin);
  if v_rate < v_e.rate_floor_cents_per_sqin then
    raise exception 'offer rate % below floor %', v_rate, v_e.rate_floor_cents_per_sqin; end if;

  select sum(st.w_in*st.h_in) into v_area from press_slots s
   join press_slot_templates st on st.id=s.slot_template_id where s.id = any(v_slots);
  v_total := round(v_area * v_rate)::int;

  select id into v_adv from press_advertisers where contact_email = p_email and p_email is not null limit 1;
  if v_adv is null then
    insert into press_advertisers (business_name, contact_email, referred_by)
    values (coalesce(p_business_name,'Spot offer'), p_email, v_aff) returning id into v_adv;
  end if;

  insert into press_holds (edition_id, advertiser_id, status, total_cents, hold_cents, deposit_cents, balance_cents, pending_expires_at)
  values (p_edition, v_adv, 'pending', v_total,
          round(v_total*0.20)::int, round(v_total*0.60)::int,
          v_total - round(v_total*0.20)::int - round(v_total*0.60)::int,
          now() + make_interval(hours => p_expires_hours))
  returning id into v_hold;

  insert into press_hold_slots (hold_id, slot_id) select v_hold, unnest(v_slots);
  update press_slots set status='held', hold_id=v_hold where id = any(v_slots);

  return jsonb_build_object('hold_id', v_hold, 'offered_rate_cents', v_rate,
    'slot_count', array_length(v_slots,1), 'total_cents', v_total,
    'hold_cents', round(v_total*0.20)::int,
    'expires_at', now() + make_interval(hours => p_expires_hours),
    'attributed_affiliate', v_aff);
end $function$;
