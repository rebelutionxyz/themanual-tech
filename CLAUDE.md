# TheMANUAL.tech — Project Context

This is the **deployed HoneyComb platform** — the production code at https://themanual.tech, hosted on Railway, backed by Supabase, source at github.com/rebelutionxyz/themanual-tech.

The root `HONEYCOMB/CLAUDE.md` provides platform thesis, brand conventions, and Layer 0-5 architecture. **This file adds project-specific build/deploy/code context.**

## Stack

- **Frontend:** Vite + React + TypeScript
- **Styling:** Tailwind CSS (via PostCSS)
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions)
- **Deploy:** Railway (auto-deploy on git push to main)
- **Container:** Dockerfile + nixpacks.toml
- **Lint/Format:** Biome (not ESLint/Prettier)
- **Search:** pg_trgm enabled for fuzzy atom search

## Build commands

```
npm run dev      # Vite dev server, port 3000 (overridden in vite.config.ts)
npm run build    # tsc -b && vite build
npm run preview  # Preview production build
npm run start    # Production preview, host 0.0.0.0, port from $PORT or 3000
npm run lint     # Biome lint ./src
npm run format   # Biome format --write ./src
npm run check    # Biome check --write ./src
```

Always run `npm run build` before considering a change ready. Never push if build fails.

## Deploy workflow

1. Commit changes to a branch (or main if minor)
2. Push to GitHub → Railway auto-deploys to themanual.tech
3. Verify deploy success in Railway dashboard
4. Smoke test live (post an atom, verify BLiNG! transaction, etc.)

**Never deploy without explicit Butch approval if the change is destructive (schema migrations, RLS changes, RPC modifications, env var changes).**

## Schema conventions (BLiNG! v8 — deployed)

- All BLiNG! amounts: `numeric(20,6)` post-Monday 2026-05-11 (Lock 7 widens from `(20,3)`); Bee-facing min send remains 0.1 BLiNG!; internal accounting precision 0.000001
- Primary keys: `uuid DEFAULT gen_random_uuid()`
- Foreign keys: `text` for slug-based IDs (atoms), `uuid` for entity IDs (bees, transactions)
- Timestamps: `timestamptz DEFAULT now()`
- RLS policies: required on every table, no exceptions
- Auto-create-bee trigger (`public.handle_new_bee()`): authored out-of-repo via Studio; body lives only in production catalog. Ratification migration `20260512090000_ratify_handle_new_bee_function.sql` (placeholder Tuesday morning — paste `pg_get_functiondef()` output). Trigger-timing description ("post-insert UPDATE" vs. "AFTER INSERT") is in tension; resolved by the Tuesday recovery. See `../shared/canon/auto-create-bee-trigger-analysis.md`.

**BLiNG! v8 tables in production:**
- `bling_transactions` — all BLiNG! flows
- `bling_orders` — order book offers
- `bling_escrows` — held BLiNG! pending resolution
- `bling_system_state` — global config (curve params, treasury balance, etc.)
- `bling_stripe_events` — webhook idempotency

**BLiNG! v8 RPCs deployed:**
- `bling_send` — peer-to-peer transfer
- `bling_free` — bonding curve free-issuance (renamed from the old name 2026-05-08; always say FREE)
- `bling_create_escrow`, `bling_release_escrow`, `bling_cancel_escrow`, `bling_dispute_escrow` — escrow lifecycle
- `bling_place_order`, `bling_fill_order`, `bling_cancel_order` — order book (CR-5 hardening lands Monday: place_order pre-debits, cancel_order refunds, fill_order companion at `20260511145000_lock_cr5_companion_fill_order.sql` keeps balance accounting consistent on partial fills)
- `bling_credit_purchase` — Stripe webhook credit grant (service-role only)
- `bling_chargeback_clawback` — Stripe dispute handler (service-role only, lands Monday via `20260511130000_lock2_chargeback_infra.sql`)
- Treasury bee: `@combtreasury` (UUID ends in `...0bee`)

v9 security hardening (REVOKE PUBLIC + `auth.uid()` guards on user-callable RPCs) deployed 2026-05-06 — see `../shared/notes/audits/v9-security-production-verification-2026-05-06.md`.

**Tier-1 federation schema (lands Monday 2026-05-11):** Lock 7 precision tightening, Lock 3 discriminators (`astra_or_nova_status` enum + `bling_transactions.currency_type`), Lock 2 chargeback infra, CR-5 order-book hardening + companion, role-hierarchy tables, optional `bees.bio/name/avatar_url` columns. Full plan + verification: `../shared/canon/monday-2026-05-11-execution-plan.md` + `../shared/canon/monday-post-apply-verification.md`. Lock 8 (registries + per-table `astra_id`/`nova_id` + RLS rewrite) deferred to Wednesday 2026-05-13 — see `../shared/canon/wednesday-2026-05-13-lock8-prescope.md`.

## The Manual (taxonomy)

- 14 realms in palindrome order: Justice → Reference → Human Activities → Self → Geography → Health → Society → Math → Science → Philosophy → Tech → History → Culture → Religion
- 4,860 atoms with slug IDs (e.g. `justice/freedom-of-speech`)
- Discovery Ladder: Sourced / Accepted / Emerging / Fringe / Unsourced
- Any Bee can add unlimited pro OR anti sources — both move atom UP the ladder (more evidence = more discovery)
- pg_trgm for fuzzy search on atom titles and content

Atom slug format: `{realm}/{kebab-case-title}`. Always validate slug uniqueness before insert.

## Auth + identity

- Supabase Auth handles signup/login (email + phone verify required for Tier 1)
- `auth.users` row → trigger creates `bees` row → bee gets handle, ranks, balances
- Reserved handle prefix: `@comb*` (system-only)
- Handle format: `^[a-z0-9_-]{2,30}$`
- Geo-block sanctioned countries (list in middleware)

**Critical:** Use Supabase legacy `eyJ`-format JWT keys for `SUPABASE_SERVICE_ROLE_KEY`. The newer `sb_` format breaks `supabase-js`. This is a real bug from Apr 2026.

## Language firewall (enforce in all UI)

**Banned in any user-facing string:** buy, sell, purchase, invest, trade, market, price, customer, mint, MINT.

**Approved alternatives:** GET, GIVE, OFFER, WIN, EARN, RECEIVE, BANK, DONATE, REDEEM, FREE, SEND, ESCROW.

Examples:
- ❌ "Buy 100 BLiNG!" → ✅ "GET 100 BLiNG!" or "FREE 100 BLiNG!"
- ❌ "Sell on the order book" → ✅ "OFFER on the order book"
- ❌ "Mint BLiNGs" → ✅ "FREE BLiNGs from the curve"
- ❌ "Purchase a Curator page" → ✅ "DONATE to BANK a Curator page" / "OFFER for a Curator page"

When reviewing code, search for banned terms in JSX, string literals, error messages, button labels, ARIA labels. Flag any leak.

## File structure

```
TheMANUAL.tech/
├── src/
│   ├── components/     React components, Tailwind styled
│   ├── lib/            Supabase client, utilities, BLiNG! helpers
│   ├── types/          TypeScript definitions (manual.ts has realm constants)
│   ├── api/            API route handlers (if used)
│   └── pages/          Route components
├── supabase/
│   ├── migrations/     SQL migrations (numbered, idempotent)
│   ├── functions/      Edge Functions (TypeScript)
│   └── seed.sql        Test data
├── db/                 Local DB scripts, dump utilities
├── public/             Static assets
├── scripts/            Build/deploy helpers
├── biome.json          Lint/format config
├── tailwind.config.ts  Tailwind config
├── vite.config.ts      Vite config (port 3000 override here)
├── nixpacks.toml       Railway build config
├── railway.json        Railway deploy config
├── Dockerfile          Container build
└── package.json
```

`themanual-tech_v5.2/` was a stale nested folder — **already pruned from the repo**. Don't recreate.

## Environment variables required

```
# Supabase
SUPABASE_URL=https://[ref].supabase.co
SUPABASE_ANON_KEY=eyJ...    # Public, ok in client
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # SECRET, server-only, legacy format only

# Anthropic (for AtlasOracle runtime)
ANTHROPIC_API_KEY=sk-ant-...

# Stripe (deferred — may go crypto-only)
STRIPE_SECRET_KEY=sk_test_...     # Once decided
STRIPE_WEBHOOK_SECRET=whsec_...   # Once decided

# Railway sets PORT automatically
```

Master credentials live in `HONEYCOMB/shared/credentials/master.env` (gitignored). `.env.local` for local dev (also gitignored).

## Edge Functions (parked from Apr 25)

BLiNG! v8 RPCs are deployed in DB. Edge Functions for HTTP-callable wrapping are scaffolded but **not yet deployed**. Deploy via Claude Code in a fresh dedicated session — never inline. Canary test with `bling-send` first, then fan out.

## Common pitfalls

1. **Don't use `sb_` format Supabase keys.** Use legacy `eyJ` JWT keys only with supabase-js.
2. **Don't auto-deploy schema migrations.** Always show Butch the SQL before applying.
3. **Don't write directly to `bling_transactions`** — always go through RPCs (bling_send, etc.) for trigger consistency.
4. **Don't forget RLS** on new tables. Default policy: deny all, then explicit allow per role.
5. **Don't bypass the language firewall** in error messages or developer-facing strings that might surface to Bees.
6. **Don't skip pg_trgm** when adding searchable text columns.
7. **Don't test against production.** Use local Supabase or staging for destructive ops.

## Current build state

- ea576f7 (BLiNG! v8 schema) + Phase C foundations (commit 7eb71fa) deployed to production
- Production verified via successful Bee post (Apr 27); Phase C smoke-tested 2026-05-08
- 14-realm taxonomy live with 4,860 atoms
- pg_trgm enabled
- Tier-1 federation schema queued for Monday 2026-05-11 (Lock 3/7, chargeback, CR-5, role hierarchy, bees profile cols); Tuesday 2026-05-12 = BLiNG! day; Wednesday 2026-05-13 = Lock 8 (registries + RLS rewrite); Friday 2026-05-15 = BRANDoSOPHIC build day
- Phase 5+ in progress for orchestration system (lives in `../TheWORKSHOP.to/`)

## Where deeper context lives

- `../shared/notes/MMF_v2_3_working.md` — full spec (current MMF working file)
- `../shared/canon/` — locked canon docs (open-questions index, schema-state, astra-readiness, bee-role-hierarchy, federation-tier-1, cancel-recovery ADR, admin-tier conventions, language-firewall sweep, build-day pre-flights + execution plans + verification checklists)
- `../shared/notes/BLING_ABUSE_DETERRENCE_THREAT_MODEL_04-26-26.md` — security architecture
- `../shared/notes/BLING_ORDER_BOOK_WALKING_BRIEF_04-26-26.md` — order book UX flow
- Supabase Studio for live DB schema inspection

🐝🍯
