-- FreedomBLiNGS public read layer (additive, SECURITY DEFINER, read-only).
-- SQL_AUTONOMY v1. Touches NO bling_* table/RPC/constraint/trigger — reads only, behind a privacy filter.

create or replace function public.freedom_ledger_public(p_limit integer default 50)
returns table (
  id            bigint,
  created_at    timestamptz,
  kind          text,
  category      text,
  amount        numeric,
  currency_type text
)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select t.id, t.created_at, t.type, t.category, t.amount, t.currency_type
  from public.bling_transactions t
  order by t.created_at desc, t.id desc
  limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;

revoke all on function public.freedom_ledger_public(integer) from public;
grant execute on function public.freedom_ledger_public(integer) to anon, authenticated;

create or replace function public.freedom_supply_public()
returns jsonb
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select jsonb_build_object(
    'freedom_price',      s.freedom_price,
    'freed_supply',       s.total_supply,
    'hard_cap',           s.hard_cap,
    'freeing_multiplier', s.freeing_multiplier,
    'free_active',        s.free_active,
    'circulating',        public.bling_circulating_supply(),
    'updated_at',         s.updated_at
  )
  from public.bling_system_state s
  where s.id = 1;
$$;

revoke all on function public.freedom_supply_public() from public;
grant execute on function public.freedom_supply_public() to anon, authenticated;