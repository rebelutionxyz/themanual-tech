BEGIN;
-- ============================================================================
-- 20260820210000_crypto_nodes1_gateway_registry_v1
-- CRYPTO_NODES1 (GAMES/DEPTH wave) - crypto payment-method NODE SURFACE + registry.
-- Applied under SQL_AUTONOMY v1. ADDITIVE ONLY - no existing table/semantics touched;
-- built bling_* core untouched. Owner ask: "add like 10 to 50 cryptos so users can
-- have many options of payments if we ever wanted to turn them on in the patchboard."
--
-- ARCHITECTURE LAW (CONCEPTS v3.9 / CURRENCY_LAW v1): NONE of these are BLiNG. Each is an
-- EXTERNAL, fiat-side crypto gateway method - KYC-gated (hard switch), and NEVER a
-- crypto->BLiNG auto-credit. This pass builds the SWITCH SURFACE + REGISTRY only: no
-- wallets, no custody, no keys, no funds move. Every node is DORMANT/OFF by default.
-- Code mirror of this catalog: src/lib/patchboard/cryptoNodes.ts (kept in sync).
--
-- ROLLBACK (run to undo this migration):
--   DROP FUNCTION IF EXISTS public.crypto_gateway_is_enabled(text, uuid, uuid);
--   DROP TABLE IF EXISTS public.crypto_gateway_scope_overrides;
--   DROP TABLE IF EXISTS public.crypto_gateway_nodes;
--   DELETE FROM supabase_migrations.schema_migrations WHERE version = '20260820210000';
-- ============================================================================

-- ---------------------------------------------------------------------------
-- crypto_gateway_nodes : the registry (one row per coin). Master default OFF.
-- The three *_law columns are IMMUTABLE invariants (CHECKed true), not toggles.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crypto_gateway_nodes (
    id                       text PRIMARY KEY,
    symbol                   text NOT NULL,
    name                     text NOT NULL,
    chain                    text NOT NULL,
    adoption_rank            integer NOT NULL,
    stablecoin               boolean NOT NULL DEFAULT false,
    privacy_coin             boolean NOT NULL DEFAULT false,
    lightning                boolean NOT NULL DEFAULT false,
    smart_contract           boolean NOT NULL DEFAULT false,
    onramp                   text NOT NULL DEFAULT 'medium' CHECK (onramp IN ('easy','medium','hard')),
    note                     text,
    -- ARCHITECTURE LAW invariants (cannot be flipped)
    external_gateway         boolean NOT NULL DEFAULT true  CHECK (external_gateway = true),
    kyc_gated                boolean NOT NULL DEFAULT true  CHECK (kyc_gated = true),
    never_auto_credit_bling  boolean NOT NULL DEFAULT true  CHECK (never_auto_credit_bling = true),
    -- Master-scope default state: OFF / DORMANT for every coin.
    enabled_master           boolean NOT NULL DEFAULT false,
    created_at               timestamptz NOT NULL DEFAULT now(),
    updated_at               timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.crypto_gateway_nodes IS
  'CRYPTO_NODES1: external crypto payment-method registry. Fiat-side, KYC-gated, never BLiNG. All OFF by default.';

-- ---------------------------------------------------------------------------
-- crypto_gateway_scope_overrides : Astra/Bee toggles over a node.
-- Master lives on crypto_gateway_nodes.enabled_master; overrides narrow/widen per scope.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crypto_gateway_scope_overrides (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id     text NOT NULL REFERENCES public.crypto_gateway_nodes(id) ON DELETE CASCADE,
    scope       text NOT NULL CHECK (scope IN ('astra','bee')),
    astra_id    uuid,                                              -- set when scope='astra' (soft link)
    bee_id      uuid REFERENCES public.bees(id) ON DELETE CASCADE, -- set when scope='bee'
    enabled     boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT crypto_gw_scope_shape CHECK (
        (scope = 'astra' AND astra_id IS NOT NULL AND bee_id IS NULL) OR
        (scope = 'bee'   AND bee_id  IS NOT NULL AND astra_id IS NULL)
    )
);
CREATE UNIQUE INDEX IF NOT EXISTS crypto_gw_astra_uidx
    ON public.crypto_gateway_scope_overrides (node_id, astra_id) WHERE scope = 'astra';
CREATE UNIQUE INDEX IF NOT EXISTS crypto_gw_bee_uidx
    ON public.crypto_gateway_scope_overrides (node_id, bee_id) WHERE scope = 'bee';

-- ---------------------------------------------------------------------------
-- Resolver: effective enablement for a (node, astra, bee). Bee -> Astra -> Master -> OFF.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crypto_gateway_is_enabled(
    p_node text, p_astra uuid DEFAULT NULL, p_bee uuid DEFAULT NULL
) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER AS $fn$
    SELECT COALESCE(
        (SELECT o.enabled FROM public.crypto_gateway_scope_overrides o
           WHERE o.node_id = p_node AND o.scope = 'bee' AND o.bee_id = p_bee LIMIT 1),
        (SELECT o.enabled FROM public.crypto_gateway_scope_overrides o
           WHERE o.node_id = p_node AND o.scope = 'astra' AND o.astra_id = p_astra LIMIT 1),
        (SELECT n.enabled_master FROM public.crypto_gateway_nodes n WHERE n.id = p_node LIMIT 1),
        false
    );
$fn$;

-- ---------------------------------------------------------------------------
-- RLS: catalog is readable by signed-in users; writes are service-role/admin only.
-- ---------------------------------------------------------------------------
ALTER TABLE public.crypto_gateway_nodes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_gateway_scope_overrides  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crypto_gw_nodes_read ON public.crypto_gateway_nodes;
CREATE POLICY crypto_gw_nodes_read ON public.crypto_gateway_nodes
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS crypto_gw_overrides_read ON public.crypto_gateway_scope_overrides;
CREATE POLICY crypto_gw_overrides_read ON public.crypto_gateway_scope_overrides
    FOR SELECT TO authenticated USING (true);

REVOKE ALL ON public.crypto_gateway_nodes           FROM PUBLIC;
REVOKE ALL ON public.crypto_gateway_scope_overrides FROM PUBLIC;
GRANT SELECT ON public.crypto_gateway_nodes           TO authenticated;
GRANT SELECT ON public.crypto_gateway_scope_overrides TO authenticated;
REVOKE ALL ON FUNCTION public.crypto_gateway_is_enabled(text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crypto_gateway_is_enabled(text, uuid, uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Seed the 40 nodes (1:1 with src/lib/patchboard/cryptoNodes.ts). All OFF.
-- ---------------------------------------------------------------------------
INSERT INTO public.crypto_gateway_nodes
    (id, symbol, name, chain, adoption_rank, stablecoin, privacy_coin, lightning, smart_contract, onramp, note)
VALUES
  ('btc', 'BTC', 'Bitcoin', 'Bitcoin', 1, false, false, false, false, 'easy', NULL),
  ('eth', 'ETH', 'Ethereum', 'Ethereum', 2, false, false, false, true, 'easy', NULL),
  ('usdc', 'USDC', 'USD Coin', 'multi (ETH/SOL/...)', 3, true, false, false, true, 'easy', 'fiat-pegged stablecoin; fiat-side only, never BLiNG'),
  ('usdt', 'USDT', 'Tether', 'multi (ETH/TRX/...)', 4, true, false, false, true, 'easy', 'fiat-pegged stablecoin'),
  ('xmr', 'XMR', 'Monero', 'Monero', 5, false, true, false, false, 'hard', 'privacy-coin, on-ramp-hard; heightened compliance surface'),
  ('sol', 'SOL', 'Solana', 'Solana', 6, false, false, false, true, 'easy', NULL),
  ('xrp', 'XRP', 'XRP', 'XRP Ledger', 7, false, false, false, false, 'easy', NULL),
  ('ltc', 'LTC', 'Litecoin', 'Litecoin', 8, false, false, false, false, 'easy', NULL),
  ('bch', 'BCH', 'Bitcoin Cash', 'Bitcoin Cash', 9, false, false, false, false, 'easy', NULL),
  ('dai', 'DAI', 'Dai', 'Ethereum', 10, true, false, false, true, 'medium', 'crypto-collateralized stablecoin'),
  ('ada', 'ADA', 'Cardano', 'Cardano', 11, false, false, false, true, 'easy', NULL),
  ('doge', 'DOGE', 'Dogecoin', 'Dogecoin', 12, false, false, false, false, 'easy', NULL),
  ('trx', 'TRX', 'Tron', 'Tron', 13, false, false, false, true, 'easy', NULL),
  ('dot', 'DOT', 'Polkadot', 'Polkadot', 14, false, false, false, true, 'medium', NULL),
  ('matic', 'MATIC', 'Polygon', 'Polygon', 15, false, false, false, true, 'easy', NULL),
  ('avax', 'AVAX', 'Avalanche', 'Avalanche', 16, false, false, false, true, 'easy', NULL),
  ('link', 'LINK', 'Chainlink', 'Ethereum', 17, false, false, false, true, 'medium', NULL),
  ('bnb', 'BNB', 'BNB', 'BNB Chain', 18, false, false, false, true, 'medium', NULL),
  ('atom', 'ATOM', 'Cosmos', 'Cosmos Hub', 19, false, false, false, true, 'medium', NULL),
  ('xlm', 'XLM', 'Stellar', 'Stellar', 20, false, false, false, false, 'easy', NULL),
  ('algo', 'ALGO', 'Algorand', 'Algorand', 21, false, false, false, true, 'medium', NULL),
  ('btc_lightning', 'BTC-LN', 'Bitcoin Lightning', 'Bitcoin / Lightning', 22, false, false, true, false, 'medium', 'L2 fast-settlement rail over Bitcoin'),
  ('zec', 'ZEC', 'Zcash', 'Zcash', 23, false, true, false, false, 'hard', 'optional-shielded privacy coin; compliance surface'),
  ('dash', 'DASH', 'Dash', 'Dash', 24, false, true, false, false, 'medium', 'optional-privacy (PrivateSend)'),
  ('ton', 'TON', 'Toncoin', 'TON', 25, false, false, false, true, 'medium', NULL),
  ('near', 'NEAR', 'NEAR Protocol', 'NEAR', 26, false, false, false, true, 'medium', NULL),
  ('fil', 'FIL', 'Filecoin', 'Filecoin', 27, false, false, false, true, 'medium', NULL),
  ('hbar', 'HBAR', 'Hedera', 'Hedera', 28, false, false, false, true, 'medium', NULL),
  ('arb', 'ARB', 'Arbitrum', 'Arbitrum (ETH L2)', 29, false, false, false, true, 'medium', NULL),
  ('op', 'OP', 'Optimism', 'Optimism (ETH L2)', 30, false, false, false, true, 'medium', NULL),
  ('xtz', 'XTZ', 'Tezos', 'Tezos', 31, false, false, false, true, 'medium', NULL),
  ('icp', 'ICP', 'Internet Computer', 'ICP', 32, false, false, false, true, 'medium', NULL),
  ('sui', 'SUI', 'Sui', 'Sui', 33, false, false, false, true, 'medium', NULL),
  ('apt', 'APT', 'Aptos', 'Aptos', 34, false, false, false, true, 'medium', NULL),
  ('inj', 'INJ', 'Injective', 'Injective', 35, false, false, false, true, 'hard', NULL),
  ('kas', 'KAS', 'Kaspa', 'Kaspa', 36, false, false, false, false, 'hard', NULL),
  ('vet', 'VET', 'VeChain', 'VeChain', 37, false, false, false, true, 'medium', NULL),
  ('grt', 'GRT', 'The Graph', 'Ethereum', 38, false, false, false, true, 'hard', NULL),
  ('aave', 'AAVE', 'Aave', 'Ethereum', 39, false, false, false, true, 'hard', NULL),
  ('mkr', 'MKR', 'Maker', 'Ethereum', 40, false, false, false, true, 'hard', NULL)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Ledger pairing (SQL_AUTONOMY v1 #3): stamp the version so reconcile stays exit 0.
-- ---------------------------------------------------------------------------
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260820210000', 'crypto_nodes1_gateway_registry_v1')
ON CONFLICT (version) DO NOTHING;

COMMIT;
