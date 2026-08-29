-- ═══════════════════════════════════════════════════════════════════════
-- H24_BYOK1 · 0004_byok_keys — real BYOK key storage (Bring-Your-Own-Key)
--
-- PROPOSE-FIRST (SQL_AUTONOMY v1.1 + dispatch: schema apply is GATED, propose
-- do not apply). Authored, NOT applied. ROLLBACK: db/proposals/0004_byok_keys_rollback.sql.
--
-- WHAT / WHY (COMPOSER v1.2 + KNOW_SPEC v0.2 + VOTE_APIS v1.2 key discipline).
-- H24_COMPOSER1 shipped a BYOK *slot* that stored the raw provider key in
-- browser sessionStorage — flagged there as an open decision, not the real
-- thing. This is the real thing: the raw key never touches a table we own.
-- It is handed once, over HTTPS, to the byok-key Edge Function, which
-- validates it live against the provider and hands it to Supabase Vault
-- (pgsodium-backed; confirmed already provisioned on this project — the
-- 2026-07-28 restore-verification report lists `vault.secrets`,
-- `vault.create_secret(text,text,text,uuid)` and `vault.decrypted_secrets`
-- as present, with `vault.secrets` holding 0 rows — this is Vault's first
-- real tenant). `public.bee_byok_keys` stores only a POINTER to the vault
-- secret plus masked metadata (provider, last4, validation status) —
-- nothing in this table is itself sensitive, so a stray `select *` cannot
-- leak a key.
--
-- KEY DISCIPLINE (VOTE_APIS v1.2, applied to server storage):
--   - byok_key_store is SECURITY DEFINER, EXECUTE granted to service_role
--     ONLY. It is called by the byok-key Edge Function AFTER that function
--     has verified the caller's JWT itself and validated the key live
--     against the provider — the bee_id passed in is the edge function's
--     own server-derived value, never a client-supplied field, so a forged
--     bee_id cannot plant a key on someone else's row.
--   - byok_key_revoke is SECURITY DEFINER, EXECUTE granted to `authenticated`,
--     and uses auth.uid() internally — no Edge Function round-trip is needed
--     to revoke, so revoke keeps working even before that function ships.
--   - byok_key_read_raw is SECURITY DEFINER, EXECUTE granted to service_role
--     ONLY, and is RESERVED for the AUTOTIER1 routing layer — NOT called by
--     anything in this pass. It is the server-side equivalent of byok.ts's
--     old `readByokRawForRouting`, now living where a raw key belongs.
--   - bee_byok_keys itself carries no raw-key column, ever.
--
-- Conventions: RLS on; bees.id = auth.uid(); SECDEF writes; named-role grants.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.bee_byok_keys (
  id              uuid primary key default gen_random_uuid(),
  bee_id          uuid not null references public.bees(id) on delete cascade,
  provider        text not null
    check (provider in ('anthropic', 'openai', 'xai', 'meta', 'mistral', 'deepseek')),
  vault_secret_id uuid not null references vault.secrets(id) on delete cascade,
  last4           text,
  status          text not null default 'unvalidated'
    check (status in ('unvalidated', 'valid', 'invalid')),
  validated_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (bee_id, provider)
);

comment on table public.bee_byok_keys is
  'BYOK key pointers (COMPOSER v1.2): one row per Bee+provider; the raw key lives ONLY in Supabase Vault (vault_secret_id). No raw-key column exists here. H24_BYOK1 2026-08-29.';

create index if not exists bee_byok_keys_bee_idx on public.bee_byok_keys (bee_id);

alter table public.bee_byok_keys enable row level security;

drop policy if exists bee_byok_keys_read_own on public.bee_byok_keys;
create policy bee_byok_keys_read_own on public.bee_byok_keys
  for select using (bee_id = auth.uid());

-- No INSERT/UPDATE/DELETE policies → direct writes denied; RPCs only.

-- ── store a validated key (edge-function-only; bee_id is server-derived) ───
create or replace function public.byok_key_store(p_bee_id uuid, p_provider text, p_raw_key text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_last4 text;
  v_existing_secret uuid;
  v_secret_id uuid;
  v_row_id uuid;
begin
  if p_bee_id is null then
    raise exception 'p_bee_id required';
  end if;
  if p_provider not in ('anthropic', 'openai', 'xai', 'meta', 'mistral', 'deepseek') then
    raise exception 'invalid provider';
  end if;
  if p_raw_key is null or length(trim(p_raw_key)) = 0 then
    raise exception 'p_raw_key required';
  end if;

  v_last4 := right(trim(p_raw_key), 4);

  select vault_secret_id into v_existing_secret
    from bee_byok_keys where bee_id = p_bee_id and provider = p_provider;

  if v_existing_secret is not null then
    -- Replace flow: rotate the same vault secret rather than orphaning it.
    perform vault.update_secret(v_existing_secret, trim(p_raw_key));
    v_secret_id := v_existing_secret;
  else
    v_secret_id := vault.create_secret(
      trim(p_raw_key),
      'byok:' || p_bee_id::text || ':' || p_provider,
      'BYOK provider key (COMPOSER v1.2)'
    );
  end if;

  insert into bee_byok_keys (bee_id, provider, vault_secret_id, last4, status, validated_at)
  values (p_bee_id, p_provider, v_secret_id, v_last4, 'valid', now())
  on conflict (bee_id, provider) do update
    set vault_secret_id = excluded.vault_secret_id,
        last4 = excluded.last4,
        status = 'valid',
        validated_at = now(),
        updated_at = now()
  returning id into v_row_id;

  return jsonb_build_object('ok', true, 'id', v_row_id, 'provider', p_provider, 'last4', v_last4);
end
$$;

-- ── revoke a key (self-serve; no Edge Function round-trip needed) ──────────
create or replace function public.byok_key_revoke(p_provider text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_secret_id uuid;
begin
  if v_me is null then
    raise exception 'auth required';
  end if;

  select vault_secret_id into v_secret_id
    from bee_byok_keys where bee_id = v_me and provider = p_provider;

  if v_secret_id is null then
    return jsonb_build_object('ok', true, 'provider', p_provider, 'revoked', false);
  end if;

  delete from bee_byok_keys where bee_id = v_me and provider = p_provider;
  delete from vault.secrets where id = v_secret_id;

  return jsonb_build_object('ok', true, 'provider', p_provider, 'revoked', true);
end
$$;

-- ── RESERVED for AUTOTIER1 routing — not called anywhere in this pass ──────
create or replace function public.byok_key_read_raw(p_bee_id uuid, p_provider text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_secret text;
begin
  select s.decrypted_secret into v_secret
    from bee_byok_keys k
    join vault.decrypted_secrets s on s.id = k.vault_secret_id
   where k.bee_id = p_bee_id and k.provider = p_provider and k.status = 'valid';
  return v_secret;
end
$$;

-- ── Grants (named roles; REVOKE PUBLIC + anon-execute stance from v9) ──────
revoke all on public.bee_byok_keys from public;
grant select on public.bee_byok_keys to authenticated;   -- rows still RLS-scoped

revoke all on function public.byok_key_store(uuid, text, text)   from public;
revoke all on function public.byok_key_revoke(text)              from public;
revoke all on function public.byok_key_read_raw(uuid, text)      from public;
grant execute on function public.byok_key_store(uuid, text, text)   to service_role;
grant execute on function public.byok_key_revoke(text)              to authenticated;
grant execute on function public.byok_key_read_raw(uuid, text)      to service_role;
