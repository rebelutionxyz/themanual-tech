-- ============================================================================
-- PATCHBOARD1 — THE PATCHBOARD switch system   (DRAFT — propose-first)
-- MMF §36 + shared/canon/patchboard-pattern.md §8
-- ----------------------------------------------------------------------------
-- STATUS: DRAFT. NOT APPLIED. Lives in supabase/migrations/_drafts/ so no
--   apply path (rail SWEEP, CLI, apply_migration) ever picks it up by accident.
--   The FRONT lane authored it as the schema PROPOSAL; the DB lane owns the real
--   apply under the MIGRATION AMENDMENT (named dispatch, recorded pre-flight,
--   rollback-first — the rollback is patchboard1_switch_system_v1_rollback.sql,
--   authored first — and the ask-gated human click).
--
-- WHY THIS EXISTS: the front-lane Patchboard build (resolver, Connected Accounts
--   data object, provider registry, Bee-scope + HQ UI) reads/writes through the
--   objects below. The front code is FLOOR-SAFE without them (missing table →
--   canon default), so this can land on the db lane's own schedule.
--
-- WHY SAFE: purely additive — four NEW tables + one read RPC + four write RPCs,
--   all under public. Touches no existing table. RLS is deny-by-default with
--   explicit per-scope allows. `astra_id` is a bare uuid (NObot FK) on purpose:
--   the FK to the Astra registry (patchboard-pattern §8.2) is added by the db
--   lane once that registry table is confirmed in prod — keeping this draft free
--   of a Lock-8 ordering dependency.
--
-- LEXICON: identifiers stay bee_id (no-rename-slugs). "user" is a display word
--   only and never appears in schema names.
-- ============================================================================

BEGIN;

-- ── 1. switch definitions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.patchboard_switches (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope         text NOT NULL CHECK (scope IN ('master','astra','bee')),
  switch_key    text NOT NULL,
  switch_class  text NOT NULL CHECK (switch_class IN ('soft','hard')),
  default_state boolean NOT NULL,
  label         text,
  description   text,
  sensitive     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope, switch_key)
);
COMMENT ON TABLE public.patchboard_switches IS
  'Patchboard switch definitions (MMF §36). One row per (scope, switch_key).';
COMMENT ON COLUMN public.patchboard_switches.switch_class IS
  'soft = user-overridable preference; hard = immutable participation floor (§36.3).';
COMMENT ON COLUMN public.patchboard_switches.sensitive IS
  'true = defaults OFF / opt-in (a sensitive category, patchboard-pattern §4).';

-- ── 2. switch values (scope encoded by the bee_id/astra_id cardinality) ─────
CREATE TABLE IF NOT EXISTS public.patchboard_settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  switch_key  text NOT NULL,
  bee_id      uuid REFERENCES public.bees(id) ON DELETE CASCADE,  -- NULL = non-Bee scope
  astra_id    uuid,                                               -- NULL = platform/master; FK added by db lane
  enabled     boolean NOT NULL,
  set_at      timestamptz NOT NULL DEFAULT now(),
  set_by      uuid REFERENCES public.bees(id),
  UNIQUE (switch_key, bee_id, astra_id)
);
CREATE INDEX IF NOT EXISTS patchboard_settings_lookup_idx
  ON public.patchboard_settings (switch_key, bee_id, astra_id);
COMMENT ON TABLE public.patchboard_settings IS
  'Patchboard switch values. (bee_id, astra_id) cardinality encodes scope: '
  '(X,NULL)=Bee platform-wide, (X,Y)=Bee per-Astra, (NULL,Y)=Astra default, '
  '(NULL,NULL)=Master default (patchboard-pattern §8.2).';

-- ── 3. provider registry (Master scope, §36.5) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.patchboard_providers (
  id           text PRIMARY KEY,                 -- e.g. 'stripe_connect'
  label        text NOT NULL,
  category     text NOT NULL,
  tier         smallint NOT NULL CHECK (tier IN (1,2)),
  cost_bearer  text NOT NULL CHECK (cost_bearer IN ('user','platform')),
  affiliate    boolean NOT NULL DEFAULT false,
  description  text,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.patchboard_providers IS
  'The closed set of integrations that may be connected anywhere (MMF §36.5). '
  'Astras offer a subset; users connect from what their Astra offers.';

-- ── 4. connection records (RLS-private account data, NEVER a switch, §36.4.1) ─
CREATE TABLE IF NOT EXISTS public.connected_accounts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bee_id         uuid NOT NULL REFERENCES public.bees(id) ON DELETE CASCADE,
  provider_id    text NOT NULL REFERENCES public.patchboard_providers(id),
  external_label text,                            -- display handle, NEVER the token
  secret_name    text,                            -- name of the vault secret, not the secret
  status         text NOT NULL DEFAULT 'active' CHECK (status IN ('active','dormant')),
  connected_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bee_id, provider_id)
);
COMMENT ON TABLE public.connected_accounts IS
  'A user connection record (OAuth token ref / account id / address). RLS-private. '
  'Dormancy, not deletion (§36.4.2): Offer-off sets status=dormant, never DELETE.';
COMMENT ON COLUMN public.connected_accounts.secret_name IS
  'Name/handle of the vault entry holding the credential — the credential itself '
  'is NEVER stored in this table and NEVER read into the browser.';

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.patchboard_switches  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patchboard_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patchboard_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connected_accounts   ENABLE ROW LEVEL SECURITY;

-- Definitions + registry are world-readable (they carry no PII); writes are
-- admin-only and go through the write RPCs / service role.
DROP POLICY IF EXISTS patchboard_switches_read  ON public.patchboard_switches;
CREATE POLICY patchboard_switches_read  ON public.patchboard_switches  FOR SELECT USING (true);
DROP POLICY IF EXISTS patchboard_providers_read ON public.patchboard_providers;
CREATE POLICY patchboard_providers_read ON public.patchboard_providers FOR SELECT USING (true);

-- Settings: a Bee reads its own rows plus the non-Bee (Astra/Master) rows that
-- affect it; a Bee writes only its own rows. Astra/Master writes go through the
-- write RPCs (SECURITY DEFINER, admin/Director-gated).
DROP POLICY IF EXISTS patchboard_settings_read ON public.patchboard_settings;
CREATE POLICY patchboard_settings_read ON public.patchboard_settings
  FOR SELECT USING (bee_id IS NULL OR bee_id = auth.uid());
DROP POLICY IF EXISTS patchboard_settings_write_own ON public.patchboard_settings;
CREATE POLICY patchboard_settings_write_own ON public.patchboard_settings
  FOR ALL USING (bee_id = auth.uid()) WITH CHECK (bee_id = auth.uid());

-- Connection records: strictly the owning Bee.
DROP POLICY IF EXISTS connected_accounts_own ON public.connected_accounts;
CREATE POLICY connected_accounts_own ON public.connected_accounts
  FOR ALL USING (bee_id = auth.uid()) WITH CHECK (bee_id = auth.uid());

-- ── The resolver RPC (patchboard-pattern §8.3; cascade MMF §36.2) ───────────
CREATE OR REPLACE FUNCTION public.get_effective_switch_state(
  p_bee_id uuid, p_astra_id uuid, p_switch_key text
) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v boolean;
BEGIN
  -- Hard switches sit above the cascade — always ON.
  IF p_switch_key IN ('tos','kyc','age_18_plus','geo') THEN
    RETURN true;
  END IF;

  -- Bee-Astra → Bee-platform → Astra-default → Master-default, first hit wins.
  SELECT enabled INTO v FROM public.patchboard_settings
    WHERE switch_key = p_switch_key AND bee_id = p_bee_id AND astra_id = p_astra_id LIMIT 1;
  IF FOUND THEN RETURN v; END IF;

  SELECT enabled INTO v FROM public.patchboard_settings
    WHERE switch_key = p_switch_key AND bee_id = p_bee_id AND astra_id IS NULL LIMIT 1;
  IF FOUND THEN RETURN v; END IF;

  SELECT enabled INTO v FROM public.patchboard_settings
    WHERE switch_key = p_switch_key AND bee_id IS NULL AND astra_id = p_astra_id LIMIT 1;
  IF FOUND THEN RETURN v; END IF;

  SELECT enabled INTO v FROM public.patchboard_settings
    WHERE switch_key = p_switch_key AND bee_id IS NULL AND astra_id IS NULL LIMIT 1;
  IF FOUND THEN RETURN v; END IF;

  -- Terminal: sensitive categories default OFF, everything else ON.
  RETURN NOT EXISTS (
    SELECT 1 FROM public.patchboard_switches
     WHERE switch_key = p_switch_key AND sensitive = true
  );
END $$;

-- ── Write RPCs (the front code's propose-first callsites) ───────────────────
-- Bee-scope write: a user sets one of their own switches.
CREATE OR REPLACE FUNCTION public.patchboard_set_bee_switch(
  p_switch_key text, p_astra_id uuid, p_enabled boolean
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_switch_key IN ('tos','kyc','age_18_plus','geo') THEN
    RAISE EXCEPTION 'hard switches are immutable';
  END IF;
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  INSERT INTO public.patchboard_settings (switch_key, bee_id, astra_id, enabled, set_by)
  VALUES (p_switch_key, auth.uid(), p_astra_id, p_enabled, auth.uid())
  ON CONFLICT (switch_key, bee_id, astra_id)
    DO UPDATE SET enabled = EXCLUDED.enabled, set_at = now(), set_by = auth.uid();
END $$;

-- Master-scope write: HQ sets a platform default (also used for a provider's
-- master offer, key connect_offer:<id>). is_admin gated.
CREATE OR REPLACE FUNCTION public.patchboard_set_master_switch(
  p_switch_key text, p_enabled boolean
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_switch_key IN ('tos','kyc','age_18_plus','geo') THEN
    RAISE EXCEPTION 'hard switches are immutable floors';
  END IF;
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'admin required'; END IF;
  INSERT INTO public.patchboard_settings (switch_key, bee_id, astra_id, enabled, set_by)
  VALUES (p_switch_key, NULL, NULL, p_enabled, auth.uid())
  ON CONFLICT (switch_key, bee_id, astra_id)
    DO UPDATE SET enabled = EXCLUDED.enabled, set_at = now(), set_by = auth.uid();
END $$;

-- Connected Accounts: Use switch (surface my connection here).
CREATE OR REPLACE FUNCTION public.patchboard_set_use(
  p_provider_id text, p_astra_id uuid, p_used boolean
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  INSERT INTO public.patchboard_settings (switch_key, bee_id, astra_id, enabled, set_by)
  VALUES ('connect_use:' || p_provider_id, auth.uid(), p_astra_id, p_used, auth.uid())
  ON CONFLICT (switch_key, bee_id, astra_id)
    DO UPDATE SET enabled = EXCLUDED.enabled, set_at = now(), set_by = auth.uid();
END $$;

-- Connected Accounts: begin a connection flow. STUB — the real OAuth/redirect
-- wiring is a follow-on db+edge dispatch; returns NULL redirect for now.
CREATE OR REPLACE FUNCTION public.patchboard_connect_begin(
  p_provider_id text
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  PERFORM 1 FROM public.patchboard_providers WHERE id = p_provider_id AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown provider'; END IF;
  RETURN json_build_object('redirect_url', NULL);
END $$;

-- Connected Accounts: disconnect = dormate (never delete, §36.4.2).
CREATE OR REPLACE FUNCTION public.patchboard_disconnect(
  p_provider_id text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  UPDATE public.connected_accounts
     SET status = 'dormant'
   WHERE bee_id = auth.uid() AND provider_id = p_provider_id;
END $$;

-- ── Seeds: hard switches + provider registry ────────────────────────────────
INSERT INTO public.patchboard_switches (scope, switch_key, switch_class, default_state, label, description, sensitive)
VALUES
  ('master','tos',        'hard', true, 'Terms of Service', 'Acceptance required to participate.', false),
  ('master','kyc',        'hard', true, 'Identity (KYC)',   'Required at first order-book OFFER.', false),
  ('master','age_18_plus','hard', true, '18+',              'Platform age floor.', false),
  ('master','geo',        'hard', true, 'Region',           'Sanctioned-region block.', false),
  ('bee','graphic_content',          'soft', false, 'Graphic content',            'Gore / violence imagery.', true),
  ('bee','explicit_content',         'soft', false, 'Explicit content (18+)',     'Sexual material; gated by 18+.', true),
  ('bee','location_sharing',         'soft', false, 'Location sharing',           'Precise / real-time location.', true),
  ('bee','notification_firehose',    'soft', false, 'High-volume notifications',  'Every-action push / email.', true),
  ('bee','cross_astra_data_sharing', 'soft', false, 'Cross-Astra data sharing',   'One Astra''s data in another.', true),
  ('bee','push_notifications',       'soft', true,  'Push notifications',         NULL, false),
  ('bee','email_notifications',      'soft', true,  'Email notifications',        NULL, false),
  ('bee','recommendations',          'soft', true,  'Recommendations',            NULL, false),
  ('bee','social_proof',             'soft', true,  'Social proof',               NULL, false)
ON CONFLICT (scope, switch_key) DO NOTHING;

INSERT INTO public.patchboard_providers (id, label, category, tier, cost_bearer, affiliate, description)
VALUES
  ('stripe_connect',  'Stripe Connect',     'settlement',   1, 'platform', false, 'Settlement rail; inherits 18+/KYC.'),
  ('google_analytics','Google Analytics',   'analytics',    1, 'platform', false, 'Surface analytics for operators.'),
  ('x',               'X',                  'distribution', 1, 'user',     false, 'Surface posts to your X account.'),
  ('openai_anthropic','OpenAI / Anthropic', 'ai',           1, 'platform', false, 'AI runtime for h24 + copilots.'),
  ('google_calendar', 'Google Calendar',    'calendar',     1, 'user',     false, 'Sync RULE events to your calendar.'),
  ('mailchimp',       'Mailchimp',          'email',        2, 'user',     false, 'Email campaigns.'),
  ('quickbooks',      'QuickBooks',         'accounting',   2, 'user',     false, 'Export accounting.'),
  ('slack',           'Slack',              'distribution', 2, 'user',     false, 'Route notifications to Slack.'),
  ('mastodon',        'Mastodon',           'distribution', 2, 'user',     false, 'Surface posts to Mastodon.'),
  ('bluesky',         'BlueSky',            'distribution', 2, 'user',     false, 'Surface posts to BlueSky.')
ON CONFLICT (id) DO NOTHING;

-- Grants: read RPC to anon+authenticated; write RPCs to authenticated only.
REVOKE ALL ON FUNCTION public.get_effective_switch_state(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_effective_switch_state(uuid, uuid, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.patchboard_set_bee_switch(text, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.patchboard_set_bee_switch(text, uuid, boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.patchboard_set_master_switch(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.patchboard_set_master_switch(text, boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.patchboard_set_use(text, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.patchboard_set_use(text, uuid, boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.patchboard_connect_begin(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.patchboard_connect_begin(text) TO authenticated;
REVOKE ALL ON FUNCTION public.patchboard_disconnect(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.patchboard_disconnect(text) TO authenticated;

COMMIT;

-- ── DB-LANE PRE-FLIGHT NOTES (fill in REPORT.md before apply) ───────────────
--  * is_platform_admin() must exist (HQ uses it) — confirm signature.
--  * decide astra_id FK target (astra registry table) and add it as a follow-up.
--  * REVOKE-from-role check: this project grants anon/authenticated via ALTER
--    DEFAULT PRIVILEGES — verify pg_proc.proacl after apply (rail README rule).
--  * get_advisors(security) after apply — expect no new SECURITY DEFINER warnings
--    beyond the intended search_path-pinned set.
