-- ============================================================================
-- PATCHBOARD2 - THE NODE CATALOG + typed value cascade   (DRAFT - propose-first)
-- MMF s36 + shared/canon/patchboard-pattern.md. Companion to
-- patchboard1_switch_system_v1.sql (the boolean switch system).
-- ----------------------------------------------------------------------------
-- STATUS: DRAFT. NOT APPLIED. Lives in supabase/migrations/_drafts/ so no apply
--   path (rail SWEEP, CLI, apply_migration) picks it up by accident. Intended to
--   land TOGETHER with patchboard1 as one db-lane apply (the switch family is
--   still unapplied). SQL_AUTONOMY v1 permits a code to self-apply additive SQL;
--   sequencing with the unapplied patchboard1 draft + measure-first is why this
--   stays propose-first this pass. Rollback authored first: _rollback.sql.
--
-- WHY THIS EXISTS: PATCHBOARD1 shipped BOOLEAN switches (on/off prefs) + a
--   provider registry. The Node Census (PATCHBOARD2) found the constellation is
--   full of NON-boolean tunables - rates, weights, splits, currency pins, game
--   rules, windows, reward values - that had no home. This adds the missing node
--   KIND: a typed VALUE node, plus a catalog that indexes EVERY tunable (boolean
--   switches, linked existing config tables, and typed value nodes) in one list -
--   the list the owner has never had.
--
-- WHY SAFE: purely additive. Two NEW tables + one resolver RPC + one write RPC.
--   Touches no existing table. Existing config tables (fee_schedule, thermostat_
--   config, rank_multiplier, drops_action_weight, drips_signal_weight,
--   h24_category_band_floor, ui_theme_config, skins) are LINKED (a catalog row
--   points at them) - storage is NEVER duplicated or migrated. Built bling_*
--   untouchable. RLS on both new tables.
-- ============================================================================

BEGIN;

-- == 1. THE NODE CATALOG - one row per tunable in the whole constellation ======
CREATE TABLE IF NOT EXISTS public.patchboard_nodes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_key       text NOT NULL UNIQUE,               -- dotted key, e.g. 'fee.marketplace.platform_pct'
  title          text NOT NULL,
  category       text NOT NULL,                       -- currency|fee|split|weight|reward|game_rule|
                                                       -- content|notification|provider|theme|threshold|
                                                       -- window|rank|thermostat|tier|escrow
  scope_level    text NOT NULL CHECK (scope_level IN ('master','astra','bee')),  -- deepest scope it cascades to
  value_type     text NOT NULL CHECK (value_type IN ('bool','numeric','pct','cents','enum','interval','text','json')),
  default_value  text,                                -- canonical default, as text
  allowed_values text,                                -- enum options (comma list) or NULL
  source_kind    text NOT NULL CHECK (source_kind IN ('switch','linked','value','code_stub','census_only')),
  source_table   text,                                -- for source_kind='linked': the config table
  source_column  text,                                -- the tunable column (NULL if row-keyed)
  source_ref     text,                                -- row key within that table (e.g. a fee_key value)
  currency_law_role text CHECK (currency_law_role IN
                     ('bling_only','fiat_allowed','dual_provisional','fiat_dormant')),  -- CURRENCY_LAW wiring
  where_used     text,                                -- code path / astra that reads it
  status         text NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','dormant','provisional','planned')),
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.patchboard_nodes IS
  'The Node Census (PATCHBOARD2): the canonical index of every tunable in HONEYCOMB. '
  'source_kind: switch=lives in patchboard_switches (boolean); linked=lives in an existing '
  'config table (source_table/column/ref; storage not duplicated); value=typed value node '
  'resolved via patchboard_node_values; code_stub=hardcoded in code, node registered ahead '
  'of backing it; census_only=documented tunable with no store yet.';

CREATE INDEX IF NOT EXISTS patchboard_nodes_category_idx ON public.patchboard_nodes(category);
CREATE INDEX IF NOT EXISTS patchboard_nodes_source_idx   ON public.patchboard_nodes(source_kind, source_table);

-- == 2. TYPED VALUE CASCADE - the missing node kind (non-boolean) ==============
-- Same (bee_id, astra_id) cardinality-encodes-scope convention as
-- patchboard_settings, but stores a TEXT value (cast by the reader per value_type).
CREATE TABLE IF NOT EXISTS public.patchboard_node_values (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_key   text NOT NULL REFERENCES public.patchboard_nodes(node_key) ON DELETE CASCADE,
  bee_id     uuid REFERENCES public.bees(id) ON DELETE CASCADE,   -- NULL = non-Bee scope
  astra_id   uuid,                                                -- NULL = platform/master
  value      text NOT NULL,
  set_at     timestamptz NOT NULL DEFAULT now(),
  set_by     uuid REFERENCES public.bees(id),
  UNIQUE (node_key, bee_id, astra_id)
);
CREATE INDEX IF NOT EXISTS patchboard_node_values_lookup_idx
  ON public.patchboard_node_values(node_key, bee_id, astra_id);
COMMENT ON TABLE public.patchboard_node_values IS
  'Per-scope overrides for typed VALUE nodes. Cardinality encodes scope exactly as '
  'patchboard_settings: (X,NULL)=Bee platform-wide, (X,Y)=Bee per-Astra, (NULL,Y)=Astra '
  'default, (NULL,NULL)=Master default. Terminal fallback = patchboard_nodes.default_value.';

-- == RLS ======================================================================
ALTER TABLE public.patchboard_nodes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patchboard_node_values  ENABLE ROW LEVEL SECURITY;

-- Catalog is world-readable (no PII); writes admin/service only.
DROP POLICY IF EXISTS patchboard_nodes_read ON public.patchboard_nodes;
CREATE POLICY patchboard_nodes_read ON public.patchboard_nodes FOR SELECT USING (true);

-- Values: a Bee reads its own rows + the non-Bee (Astra/Master) rows that affect
-- it; writes its own rows. Astra/Master writes go through the admin RPC.
DROP POLICY IF EXISTS patchboard_node_values_read ON public.patchboard_node_values;
CREATE POLICY patchboard_node_values_read ON public.patchboard_node_values
  FOR SELECT USING (bee_id IS NULL OR bee_id = auth.uid());
DROP POLICY IF EXISTS patchboard_node_values_write_own ON public.patchboard_node_values;
CREATE POLICY patchboard_node_values_write_own ON public.patchboard_node_values
  FOR ALL USING (bee_id = auth.uid()) WITH CHECK (bee_id = auth.uid());

-- == 3. THE VALUE RESOLVER (mirrors get_effective_switch_state cascade) ========
CREATE OR REPLACE FUNCTION public.patchboard_resolve_value(
  p_node_key text, p_bee_id uuid, p_astra_id uuid
) RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v text;
BEGIN
  -- Bee-Astra -> Bee-platform -> Astra-default -> Master-default, first hit wins.
  SELECT value INTO v FROM public.patchboard_node_values
    WHERE node_key = p_node_key AND bee_id = p_bee_id AND astra_id = p_astra_id LIMIT 1;
  IF FOUND THEN RETURN v; END IF;
  SELECT value INTO v FROM public.patchboard_node_values
    WHERE node_key = p_node_key AND bee_id = p_bee_id AND astra_id IS NULL LIMIT 1;
  IF FOUND THEN RETURN v; END IF;
  SELECT value INTO v FROM public.patchboard_node_values
    WHERE node_key = p_node_key AND bee_id IS NULL AND astra_id = p_astra_id LIMIT 1;
  IF FOUND THEN RETURN v; END IF;
  SELECT value INTO v FROM public.patchboard_node_values
    WHERE node_key = p_node_key AND bee_id IS NULL AND astra_id IS NULL LIMIT 1;
  IF FOUND THEN RETURN v; END IF;
  -- Terminal: the catalog default.
  SELECT default_value INTO v FROM public.patchboard_nodes WHERE node_key = p_node_key LIMIT 1;
  RETURN v;
END $$;

-- Master/Astra value write (admin-gated). Bee-scope writes go direct (RLS above).
CREATE OR REPLACE FUNCTION public.patchboard_set_node_value(
  p_node_key text, p_astra_id uuid, p_value text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'admin required'; END IF;
  INSERT INTO public.patchboard_node_values (node_key, bee_id, astra_id, value, set_by)
  VALUES (p_node_key, NULL, p_astra_id, p_value, auth.uid())
  ON CONFLICT (node_key, bee_id, astra_id)
    DO UPDATE SET value = EXCLUDED.value, set_at = now(), set_by = auth.uid();
END $$;

-- == GRANTS ===================================================================
REVOKE ALL ON FUNCTION public.patchboard_resolve_value(text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.patchboard_resolve_value(text, uuid, uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.patchboard_set_node_value(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.patchboard_set_node_value(text, uuid, text) TO authenticated, service_role;

-- == SEEDS: the census rows are appended by patchboard2_node_seed_v1.sql =======
-- (kept in a separate file so the census list can be regenerated without
--  re-running the DDL). See that file for the full node list.

COMMIT;

-- == DB-LANE PRE-FLIGHT NOTES (fill REPORT.md before apply) ===================
--  * is_platform_admin() must exist (patchboard1 uses it too) - confirm signature.
--  * Apply AFTER (or together with) patchboard1_switch_system_v1.sql - the census
--    references patchboard_switches rows as source_kind='switch' nodes (soft link
--    by node_key text, not a FK, so order is not hard-enforced).
--  * measure-first: node TheMANUAL.tech/scripts/migration-reconcile/reconcile.mjs
--    measure on a clean tree before authoring the real dated pair.
--  * get_advisors(security) after apply - expect no new SECURITY DEFINER warnings
--    beyond the intended search_path-pinned set.
