# Crypto payment-method nodes — CRYPTO_NODES1

**Pass:** CRYPTO_NODES1 (GAMES/DEPTH wave, SQL_AUTONOMY v1)
**Canon:** CURRENCY_LAW v1/v1.1 · CONCEPTS v3.9 (architecture law) · PATCHBOARD_NODES v1 (census) · MMF §36
**Code mirror:** `src/lib/patchboard/cryptoNodes.ts` · **Table:** `crypto_gateway_nodes` (+ `crypto_gateway_scope_overrides`, resolver `crypto_gateway_is_enabled`)
**Migration:** `supabase/migrations/20260820210000_crypto_nodes1_gateway_registry_v1.sql`

## What this is (and is not)

The owner asked for "like 10 to 50 cryptos so users can have many options of payments
if we ever wanted to turn them on in the patchboard." This pass delivers the **switch
surface + registry only** — a Patchboard node per coin, **all DORMANT/OFF by default**,
owner-toggleable at Master / Astra / Bee scope.

It is **NOT** a wallet integration: no custody, no keys, no addresses, no funds move.
Turning any node ON later is a separate integration pass.

## Architecture law (non-negotiable, CONCEPTS v3.9 / CURRENCY_LAW v1)

- **None of these are BLiNG.** Each node is an **external, fiat-side gateway method** —
  it pays for a good/service on the firewall side exactly as USD does.
- **KYC-gated** under the hard `kyc` switch. **Never crypto → BLiNG auto-credit.**
- These three properties are stored as **CHECK-locked invariant columns**
  (`external_gateway`, `kyc_gated`, `never_auto_credit_bling` — all forced `true`);
  the Patchboard toggle only decides whether a coin is *offered*, never these.

## The catalog (40 nodes, ordered by adoption — all OFF)

The 30 named in the dispatch plus 10 for "room for more". Reality flags recorded so a
future integration pass reads the truth, not a guess:

- **Stablecoins:** USDC, USDT, DAI (fiat-side only, never BLiNG).
- **Privacy coins (hard compliance surface):** XMR (on-ramp-hard), ZEC, DASH (optional-privacy).
- **L2 / fast rail:** BTC-Lightning.
- **Smart-contract chains/tokens:** ETH, SOL, ADA, DOT, MATIC, AVAX, LINK, BNB, ATOM, ALGO,
  TRX, TON, NEAR, FIL, HBAR, ARB, OP, XTZ, ICP, SUI, APT, INJ, VET, GRT, AAVE, MKR.
- **Base chains:** BTC, LTC, BCH, XRP, DOGE, XLM, KAS.

Full row-level flags (chain, adoption rank, stablecoin/privacy/lightning/contract, on-ramp
difficulty, notes) live in the code mirror and the seeded table, kept 1:1.

## Resolution

`crypto_gateway_is_enabled(node, astra, bee)` = **Bee override → Astra override →
Master default (`enabled_master`) → OFF**. Every node's Master default is `false`.

## Admin surface

HQ → Patchboard → **Crypto payment methods** (`components/hq/sections/PatchboardAdmin.tsx`,
`CryptoNodesBlock`). Lists all coins with on/off toggles + reality-flag chips + the
architecture-law banner. **Display/propose-first** — the toggle write is propose-first
(`setMasterSwitch`), no funds move.

## Apply status

The migration is **authored and apply-ready but NOT yet applied** — `reconcile.mjs measure`
was exit 1 at claim time due to a pre-existing unpaired sibling migration
(`20260820144500 gamematch1_vs_world_layer_v1`, applied with no repo file). Per the
migration amendment, a discrepancy that is not this pass's own pending file halts the apply.
Filed as `CRYPTO_NODES1-Q`. Once the ledger reconciles, the apply is one `execute_sql` of
the migration file above.
