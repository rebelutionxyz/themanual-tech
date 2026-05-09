# Federation Tier-1 — Scoping & Locked Decisions

**Status:** Draft for review · 2026-05-09
**Scope:** Tier-1 of the HONEYCOMB federation hooks — the minimum surface required for Astras and Novas to participate in shared BLiNG! and shared identity without committing to anything that future tiers (caching, governance, off-grid coins, sovereign DBs) might want to revise.

---

## Executive summary

Tier-1 federation is **nine locks** plus a resilience sub-section under Lock 1. It establishes that **BLiNG! is Astraversal** — `freedomblings.com` is the single ledger of record, every Astra and every Nova reads and writes through its APIs, and "Astraversal" is the canonical vocabulary for this property (Lock 1). Lock 1.1 commits two resilience flavors (theMANUAL hosts a real-time read replica of the ledger and pulls hourly snapshots) and explicitly rejects the third (active-active hot failover would re-introduce a competing ledger, breaking the Astraversal lock). theMANUAL is offered as an **optional OAuth provider**, not required, with three sub-decisions deferred to BLiNG! build day (Lock 2). Schema gains two non-precluding discriminators (Lock 3) and tightens BLiNG! divisibility from 3 decimals to 6 (Lock 7). The Board of Astras (Lock 5) and DiGiTs / off-grid Novas / private-label coins (Lock 6) are explicitly out of tier-1. Lock 4 bans a custom cache layer until a real performance signal warrants one. **Lock 8** adds `astra_id` and `nova_id` columns plus per-row RLS isolation to all content tables, making the schema logically per-Astra/per-Nova even when physically shared, and preserving the option of migrating any Astra or Nova to its own database without schema rework. **Lock 9** locks the data architecture at exactly **three databases for tier-1**: BLiNG! (`freedomblings.com`, all money flows), theMANUAL spine (`themanual.tech`, atoms / 14-realm taxonomy / canonical Bee identity / Astra-Nova registry), and a Platform database for everything non-money / non-spine / non-regulated; a fourth Regulated Data database is anticipated when the first regulated Astra ships but is not instantiated in tier-1. **HEADQUARTERS is conceptual, not literal** — it is the shorthand for the platform's canonical state across these databases, not a single physical system. **Novas are logical entities** in the Platform database, isolated by `nova_id` + RLS (Lock 8); federation is automatic because all Novas share the underlying databases. Off-grid migration is preserved as a future capability via the Lock 8 tagging, not built in tier-1. **Lock 9.6** productizes off-grid into a three-tier sovereignty framework — **Standard** (shared Platform DB, default), **Dedicated** (HONEYCOMB-operated dedicated project), and **Off-Grid** (operator-managed, optionally jurisdictional / cryptographically sovereign) — with the Lock 9.2 migration primitive serving every tier transition; tier pricing is deferred to its own design session.

---

## Lock 1 — BLiNG! is Astraversal

**Decision.** `freedomblings.com` is the single ledger of record for BLiNG!. Every Astra and every Nova reads and writes balances, orders, escrows, and transactions through `freedomblings.com` APIs. No Astra holds a local mirror of the ledger; no Astra runs its own mint or fee math. **"Astraversal"** is the canonical vocabulary for this property — use it consistently in code, docs, and Bee-facing copy.

**Rationale.** Multiple ledgers across Astras would force reconciliation, allow drift, and make total-supply math unverifiable. A single ledger keeps the economy DB-authoritative (matching the v8 schema's "all balance / supply / fee math runs in PL/pgSQL" stance) and makes `mint_active` a single global kill switch. There is no secondary ledger, no per-Astra ledger, no fallback active ledger.

**Tier-1 implementation surface.**
- API surface lives at `freedomblings.com` (out of repo for tier-1 scoping; treat as upstream contract).
- Astras call the Astraversal API; they do not import `src/lib/bling/` SDKs that bypass it.
- Tables `bling_transactions`, `bling_orders`, `bling_escrows`, `bling_system_state`, `bling_stripe_events` and the nine `bling_*` SECURITY DEFINER RPCs (`bling_send`, `bling_free` (formerly `bling_mint`), `bling_fill_order`, `bling_place_order`, `bling_credit_purchase`, `bling_create_escrow`, `bling_release_escrow`, `bling_cancel_escrow`, `bling_dispute_escrow`) are owned by the `freedomblings.com` instance.
- RLS unchanged from v8: client reads gated per-table; all writes via service-role-key Edge Functions.

**Failure modes.**
- **`freedomblings.com` unavailable** → BLiNG!-touching surfaces in every Astra fail closed. Tier-1 has no caching (Lock 4), so no stale-balance display either; Astras must show an "economy unavailable" affordance instead of a number. Lock 1.1 softens this with a read replica, without breaking the single-ledger guarantee.
- **API contract drift** between `freedomblings.com` and an Astra's call sites → handled out of band; tier-1 does not version the API.

### 1.1 Resilience posture

theMANUAL can be a fallback for `freedomblings.com` without becoming a competing ledger. **A read replica preserves Astraversal because theMANUAL never issues or settles BLiNG! — it only mirrors what `freedomblings.com` already did.** Three flavors of "theMANUAL as a second source" were considered; tier-1 commits to the first two and explicitly rejects the third.

#### 1.1.a Read replica — IN tier-1 scope (~6–10 hr Code)

**Decision.** theMANUAL hosts a real-time logical replica of the `freedomblings.com` BLiNG! tables (`bees`, `bling_transactions`, `bling_orders`, `bling_escrows`, `bling_system_state`, `bling_stripe_events`). During a `freedomblings.com` outage, theMANUAL serves **reads only** (balance lookups, transaction history, order book display); writes are **queued client-side or at the Astra Edge Function layer** and replayed against `freedomblings.com` when it returns.

**Why this preserves Astraversal.** No BLiNG! is freed (formerly minted), sent, settled, or escrowed against theMANUAL. The replica is a read-through cache with the durability of a Postgres logical-decoding stream, not a second ledger. Total supply, free state, and fee math remain derived from a single source. Lock 4 (no custom cache layer) is not violated because this is a disaster-recovery replica, not a performance cache — it does not run during normal operation; reads do not silently route through it.

**Tier-1 implementation surface.**
- Postgres logical replication or Supabase replication slot from `freedomblings.com` → theMANUAL DB. Subscriber instance owned by theMANUAL ops.
- Astra Edge Functions gain a `BLING_READ_FAILOVER_URL` config; reads fail over only after a `freedomblings.com` timeout / 5xx threshold, never as the primary read path.
- Write queue: durable on the Astra side (e.g., a `pending_bling_writes` table local to the Astra) with a replay worker that drains to `freedomblings.com` once primary is back. Replay is idempotent because the existing `bling_stripe_events` idempotency pattern can be generalized — `request_id`-keyed dedupe.
- **Replay ordering policy is deferred** to its own design pass — the likely shape is FIFO with per-Bee partitioning (writes within a single Bee's queue replay in submission order; cross-Bee ordering is not preserved), but the full design (handling of inter-Bee dependencies during long outages, e.g. A→B→C send chains where B's funds depend on A's send completing) is out of tier-1.
- A status flag visible to UIs: "BLiNG! economy is in degraded mode (read-only mirror); your action will complete when the ledger is back."

**Failure modes.**
- **Replica lag during outage** — replica is at most a few seconds behind; balance display will show pre-outage state, which is correct semantics.
- **Long outage with growing write queue** — queued writes against stale balance can fail validation when replayed (e.g., insufficient balance after another queued send drained funds). Resolution: replay surfaces per-write success / failure to the originating Bee; no silent loss.
- **Replica diverges from primary** — logical replication breakage is detectable; ops must reseed rather than serve from a divergent replica. Detection check (replication slot lag + checksum) ships with the replica.

#### 1.1.b Snapshot backup — IN tier-1 scope (~1 hr Code)

**Decision.** theMANUAL pulls **hourly state snapshots** of the `freedomblings.com` BLiNG! tables for disaster-recovery purposes. Snapshots are stored in **theMANUAL's storage bucket** (separate failure domain from `freedomblings.com`). Retention: ≥30 days rolling.

**Why this preserves Astraversal.** Snapshots are write-once archive data, never queried as a live ledger. They exist only for catastrophic-recovery scenarios where the primary AND replica are simultaneously lost.

**Tier-1 implementation surface.**
- Cron-triggered `pg_dump --schema=public --table=bling_*` (plus `bees`) from `freedomblings.com` → theMANUAL object storage.
- Snapshot manifest with timestamp, row counts per table, and a checksum.
- Restore runbook (out of repo for tier-1; lives in ops docs).

**Failure modes.**
- **Snapshot job silently fails** → ops alerting on missing hourly manifest. Standard observability, not novel work.
- **Snapshot used to "rebuild" after a disagreement, not a disaster** → policy issue, not technical: snapshots are restore-only, not authoritative inputs to a ledger merge.

#### 1.1.c Hot failover (active-active two-ledger) — OUT of scope

**Decision.** Tier-1 explicitly **does not** support active-active hot failover where theMANUAL and `freedomblings.com` both accept writes and reconcile.

**Reasoning.**
- **Breaks the Astraversal lock.** Two writeable ledgers are two ledgers. Lock 1 says one ledger.
- **Introduces split-brain.** Concurrent writes during a partition produce divergent states (two Bees each freeing the last unit of supply, two escrows draining the same balance). Reconciliation requires CRDTs, conflict resolution rules, or a consensus protocol — none of which are tier-1 concerns.
- **Complexity disproportionate to current scale.** Active-active is SRE-grade resilience work. Current scale (test bee, single-digit production Bees) does not justify it; the design risk and ongoing operational burden are large multiples of the read-replica option.

**Revisit condition.** Post-Swarm, only if traffic and uptime requirements justify SRE-grade resilience work. Until then, the read replica + snapshot pair is the resilience ceiling for tier-1.

---

## Lock 2 — theMANUAL is an optional OAuth provider

**Decision.** theMANUAL acts as an optional OAuth identity provider, the way "Sign in with Google" does. Each Astra keeps its own native auth (Supabase Auth + RLS, per Open #6 resolution). The Astra signup screen offers "Continue with theMANUAL" alongside the local form. Bees who started local can later **link** their account to a theMANUAL identity.

**Rationale.** Astras must remain autonomous to onboard Bees who do not have or want a theMANUAL identity. Forcing theMANUAL would couple every Astra's signup funnel to a single upstream. Offering it as an option keeps the network-effect benefit (one identity across many Astras) without making it load-bearing.

**Three sub-decisions explicitly deferred** to BLiNG! build day (Tue 2026-05-12):
- **2a** — Default prominence of "Continue with theMANUAL" — big button vs. buried option.
- **2b** — Can local Astra accounts hold BLiNG!? Or is BLiNG! eligibility gated to federated identities?
- **2c** — Account linking mechanics — merge histories, cross-reference, or unified record?

**Tier-1 implementation surface.**
- No DB tables added in tier-1 for OAuth — auth integration lives at the application boundary; `auth.users` rows continue to be the per-Astra source of truth.
- A future `bee_identity_links` table is implied by 2c but **not** built in tier-1.
- The `astra_or_nova_status` enum (Lock 3) is the only schema artifact tier-1 ships that any future linking logic will reference.

**Failure modes.**
- **theMANUAL OAuth outage** → "Continue with theMANUAL" button on every Astra fails. Local signup remains operational; this is the entire point of the optional framing.

---

## Lock 3 — Two non-precluding schema discriminators

**Decision.** Tier-1 adds exactly two discriminators that future federation states can lean on without us committing to those states now:
- **3a — `astra_or_nova_status`** enum: `'active' | 'archived' | 'off_grid'`. Default `'active'`. Type defined here; Lock 8's registries adopt it as a column.
- **3b — `currency_type`** discriminator on `bling_transactions`: `'BLING'` default, `'DIGIT_<id>'` as future expansion namespace. Default for all existing rows: `'BLING'`.

**Rationale.** The Board of Astras (Lock 5) and DiGiTs (Lock 6) are pinned to later work, but if they land without these discriminators in place we will need a backfill migration on a live ledger — exactly what we are trying to avoid. Defining the enum and adding the column now costs ~no runtime overhead and converts a future migration into an additive feature.

**Tier-1 implementation surface.**
- `CREATE TYPE public.astra_or_nova_status AS ENUM ('active', 'archived', 'off_grid')` — type definition. Consumed by Lock 8's `astra_registry` and `nova_registry` (column `status`, default `'active'`).
- `ALTER TABLE public.bling_transactions ADD COLUMN currency_type TEXT NOT NULL DEFAULT 'BLING'` with a CHECK constraint that pins the namespace to `'BLING'` or `'DIGIT_<id>'`.
- No RPC changes required in tier-1: existing `bling_*` RPCs insert without naming `currency_type` and pick up the `'BLING'` default. DiGiTs-aware RPCs land on BLiNG! build day.

**Verification against current v8.**
- `astra_or_nova_status`: **not present** in `schema-v8-bling.sql` or `schema-v8-bling-themanual.sql`. Net new.
- `currency_type` on `bling_transactions`: **not present**. The existing `type` column tracks action (`sent`, `bought`, `minted`, …) and `category` is the bee-to-bee fee carve-out class — neither names the asset being moved.

**Failure modes.**
- A future DiGiT with id colliding with `'BLING'` would need to be rejected by the CHECK; namespacing as `'DIGIT_<id>'` rather than `'<id>'` makes that collision impossible by construction.

---

## Lock 4 — No custom cache layer in tier-1

**Decision.** Tier-1 hits the underlying databases (per Lock 9: BLiNG!, theMANUAL spine, Platform) directly for every read and every write. No Redis, no in-memory cache, no edge-function-level memoization beyond what Supabase / PostgREST ships by default.

**Rationale.** Caching in front of an authoritative ledger is the highest-cardinality source of bugs: stale balances, double-spend windows, inconsistent reads on opposite sides of a transaction. The same logic applies to taxonomy state and per-Astra content. We will pay direct-query latency in tier-1 and only add caching in tier-2 **when an actual performance signal** (Railway metrics, slow page loads, Supabase compute warnings, p95 latency, query-per-second pressure, cost) warrants it. Premature caching has destroyed economies; under-caching has only ever caused slow pages.

**Tier-1 implementation surface.**
- No new tables, no new infra. Explicitly bans introducing a `bling_balance_cache`-style materialized view.
- Astra Edge Functions calling `bling_*` RPCs do so per-request.
- PostgREST's built-in caching headers are acceptable defaults; nothing custom layered on top.

**Failure modes.**
- **Hot path latency** during a viral moment → tier-2 trigger. Document the symptom; do not pre-build the fix.

---

## Lock 5 — Board of Astras governance is out of tier-1

**Decision.** The Board of Astras (the Astra-level governance institution: representative board, elected Head Master, vote-off / vote-in mechanics) is real and canonized but **not** scoped into tier-1 federation. It is referenced here only so the omission is intentional and documented. Its full canon entry will land in **§32 of the master file** (themanual MMF) in a future session.

**Rationale.** Governance design decisions (membership, voting, scope of authority over `freedomblings.com` parameters, election cadence) need their own design pass and stakeholder alignment. Bundling governance with the federation hooks would either rush governance or block hooks. Splitting them lets tier-1 ship and lets §32 take its time.

**Tier-1 implementation surface.** None.

**Failure modes.** None — explicit scope exclusion.

---

## Lock 6 — DiGiTs / off-grid Novas / private-label coins pinned to BLiNG! build day

**Decision.** All three concerns — DiGiTs (per-Astra or per-Nova subsidiary currencies), off-grid Novas (Bee-clones operating without `freedomblings.com`), and private-label coins — are pinned to BLiNG! build day on **Tue 2026-05-12**. Tier-1 does not implement them but does not preclude them.

**Framing.** DiGiTs are intended to **extend** BLiNG!'s reach into off-grid / brand-tied / experimental contexts — not to compete with BLiNG!. Anything that amplifies BLiNG!'s mission is in scope for the future DiGiTs system; anything that lets DiGiTs escape BLiNG!'s philosophy is out of scope.

**Rationale.** These are economy design decisions, not federation hook design decisions, and they slot naturally into the BLiNG! build day where the rest of the economy lives. The Lock 3 discriminators are the only tier-1 artifact that touches them, and they are non-committal by design (the enum has the `'off_grid'` value, the `currency_type` column has the `'DIGIT_*'` namespace).

**Tier-1 implementation surface.**
- Discriminators from Lock 3 (already counted there).
- Lock 8's `nova_id` tagging keeps off-grid migration possible without schema rework.
- No additional tables, columns, RPCs, or RLS changes in tier-1.

**Failure modes.**
- **BLiNG! build day slips** → tier-1 still functions; DiGiTs / off-grid simply remain unimplemented. The Lock 3 discriminators sit unused in production, which is fine.

---

## Lock 7 — BLiNG! divisibility: 6 decimals, 0.000001 minimum

**Decision.** BLiNG! divides to **6 decimal places**. 1 BLiNG! = 1,000,000 minimum units. Minimum unit is **0.000001 BLiNG!**. Schema requirement: `numeric(20, 6)` or equivalent on every BLiNG! amount column. Every CHECK constraint on minimum amounts and every RPC validation must use 6-decimal precision.

**Note on min-send floor.** Lock 7 sets the **internal accounting precision** (yield distributions, fee splits, payouts to many Bees). The Bee-facing minimum send remains **0.1 BLiNG!** per existing memory (anti-spam floor); 6-decimal precision is the substrate, not the everyday Bee transaction granularity.

**Rationale.** 3 decimals (the v8 status quo) prevents micro-payments and forecloses fee / payout designs that distribute very small amounts to many Bees. 6 decimals matches the precision already used for `mint_price` and `total_supply` and gives ~1M-fold headroom under the hard cap (`11_222_333_222_111`) without exceeding `numeric(20, 6)`.

**Verification against current v8 — MISMATCH (Open #21 confirmed real).**

| Column / check                                 | v8 actual            | Tier-1 target           |
|------------------------------------------------|----------------------|-------------------------|
| `bees.bling_balance`                           | `numeric(20, 3)`     | `numeric(20, 6)`        |
| `bling_transactions.amount`                    | `numeric(20, 3)`     | `numeric(20, 6)`        |
| `bling_orders.amount`                          | `numeric(20, 3)`     | `numeric(20, 6)`        |
| `bling_orders.filled`                          | `numeric(20, 3)`     | `numeric(20, 6)`        |
| `bling_orders.amount` CHECK                    | `>= 0.001`           | `>= 0.000001`           |
| `bling_escrows.amount`                         | `numeric(20, 3)`     | `numeric(20, 6)`        |
| `bling_stripe_events.bling_amount`             | `numeric(20, 3)`     | `numeric(20, 6)`        |
| `bling_free` (formerly `bling_mint`) min check | `< 0.001`            | `< 0.000001`            |
| `bling_place_order` minimum check              | `p_amount < 0.001`   | `< 0.000001`            |
| `bling_fill_order` minimum check               | `p_fill_amt < 0.001` | `< 0.000001`            |
| `bling_send` fee `round(..., 3)` last-arg      | `3`                  | `6`                     |
| `bling_system_state.mint_price` / `total_supply` | `numeric(30, 6)`   | unchanged (already 6)   |

**Tier-1 implementation surface.** A migration tightens precision and updates every minimum-unit threshold. Because the existing RPC bodies hardcode `0.001` and `round(..., 3)`, the RPCs must be re-deployed with `CREATE OR REPLACE`; column type changes alone are not sufficient.

**Failure modes.**
- **Existing rows with 3-decimal values** widen losslessly to 6 decimals (`numeric` widening is metadata-only). No data loss.
- **Client UIs that format with 3 decimals** will display correctly until a UI pass tightens display formatting to 6 places. Display drift, not data drift.

---

## Lock 8 — Sovereignty schema posture (per-Astra / per-Nova RLS)

**Decision.** All content tables include `astra_id` and `nova_id` columns with FKs to the respective registries. RLS policies isolate by `astra_id` (and by `nova_id` when present). Cross-Astra / cross-Nova queries must explicitly opt in — no implicit joins across boundaries.

This makes the schema **logically per-Astra / per-Nova even when physically shared** in one database (the Platform DB, per Lock 9). It preserves the capability to migrate any Astra or Nova to its own database in the future without schema rework.

**Rationale.** Sovereignty is an architectural property, not a deployment one. Tagging every content row with its Astra / Nova provenance from day one means a future "lift this Astra into its own DB" or "export this Nova to its own DB" operation is a `WHERE astra_id = X` or `WHERE nova_id = Y` extract, not a schema redesign. Doing this retroactively on a live, populated content DB is the kind of migration we're trying to avoid (echoing the Lock 3 logic).

**Tier-1 implementation surface.** Estimated ~2 hr additional Code work in tier-1 buildout.

- **Registries (net new):**
  - `astra_registry (id uuid pk, slug text unique, name text, status astra_or_nova_status default 'active', created_at timestamptz)`.
  - `nova_registry (id uuid pk, slug text unique, name text, parent_astra_id uuid not null references astra_registry(id), status astra_or_nova_status default 'active', database_url text null, created_at timestamptz)` — `database_url` is null for on-platform Novas, populated only when a Nova migrates off-grid (per Lock 6 / Lock 9).
  - FK `nova_registry.parent_astra_id → astra_registry.id` enables 80/20 affiliate bubbling and lineage.

- **Content table columns (added to every existing platform content table — threads, posts, events, comments, group_memberships, messages, chat rooms, bazaar listings, give campaigns, etc.):**
  - `astra_id uuid not null references astra_registry(id)`.
  - `nova_id uuid null references nova_registry(id)` — null when content originates on the Astra directly; set when content originates on a Nova.

- **RLS policies:** every content table gets a policy that filters by `nova_id` when present, falling back to `astra_id`. Cross-boundary reads require an explicit policy carve-out (no implicit joins).

- **Indexes:** `(astra_id)` and `(nova_id) WHERE nova_id IS NOT NULL` on every content table for predicate pushdown under RLS.

**Inventory of platform content tables this touches (current state, will grow as more Astras land).**
From `schema-v2-surfaces.sql`: `pillars`, `groups`, `group_memberships`, `events`, `event_rsvps`, `forum_threads`, `forum_posts`, `message_threads`, `message_participants`, `messages`, `chat_rooms`, `bazaar_listings`, `give_campaigns`, `give_contributions`, `entity_atom_links`.
From `schema-v6-reactions-saves-shares.sql`: `entity_reactions`, `entity_saves`, `entity_shares`.
From Phase C migrations: `bee_profiles` (debatable — Bee identity is theMANUAL spine, see Lock 9), `promotions`.
**Excluded by definition** (live in BLiNG! DB or theMANUAL spine, not Platform DB): `bling_*` tables, `bees`, `atoms`, `realms`, `atom_sources`, `atom_kettle_votes`, `atom_comments`, `entity_category_links`, `canonical_documents`, `document_versions`.

**Verification against current schema.** `astra_id`, `nova_id`, `astra_registry`, `nova_registry` are **net new** — not present anywhere in `supabase/`. The Phase C foundations migration did not introduce these.

**Failure modes.**
- **Bee-identity tables straddle the spine / platform boundary.** `bee_profiles` was added in Phase C and is more naturally Bee-canonical (theMANUAL spine, Lock 9 DB #2) than per-Astra content. Lock 9's database split flushes this out; tier-1 places `bee_profiles` in the spine DB and does **not** add `astra_id`/`nova_id` to it.
- **Cross-Astra query patterns** (e.g., a "Trending across all Astras" feed) require an explicit RLS policy carve-out plus an indexed scan that ignores the boundary filter. Tier-1 ships no such carve-out by default; first cross-Astra surface will define its own.
- **Forgetting to set `astra_id` on insert** is the single highest-cardinality failure mode — every Astra Edge Function must explicitly stamp `astra_id` on every content write. A NOT NULL column with no default forces this at write time rather than at read time.

---

## Lock 9 — HEADQUARTERS data architecture: three databases (fourth anticipated)

**Decision.** **HEADQUARTERS is conceptual, not literal.** The platform's canonical state lives across exactly **three databases for tier-1**, with a fourth anticipated:

1. **BLiNG! database** (`freedomblings.com`) — all money flows.
   Astras served: **FreedomBlings, Honeypos, atlasADs.biz, The Exchange, BLiNGster**, plus any monetary surface of any other Astra.

2. **theMANUAL spine database** (`themanual.tech`) — atoms, the 14-realm taxonomy, canonical Bee identity, the Astra / Nova registry. The spine.
   Astras served: **TheMANUAL, IndividualWRITES, AtlasOracle**, plus any taxonomy-touching surface of any other Astra.

3. **Platform database** — all non-money, non-spine, non-regulated data.
   Surfaces: threads, posts, events, groups, comments, chat, Workshop builds, BRANDoSOPHIC skins, governance records, votes, AI Tour data, marketplace listings. Per-Astra / per-Nova isolation via Lock 8.

4. **Regulated Data database** — **NOT instantiated in tier-1**. Comes online when the first regulated Astra ships (likely DingleBERRY, FinalWaggle, BeeHold, AtlasResidential, AtlasEnlightened, beeSECURE, beeSafe, or AtlasAdvocate). Compliance requirements (HIPAA, attorney-client privilege, financial records, etc.) should not propagate to non-regulated content; segregation by physical database is the cleanest enforcement boundary.

### 9.1 Novas within this architecture

A Nova is **not its own database**. It is a **logical entity in the Platform database**, isolated by `nova_id` + RLS (per Lock 8). Federation is automatic because all Novas share the underlying databases:

- BLiNG! transactions on Novas hit `freedomblings.com` same as Astras.
- Atom reads on Novas hit theMANUAL spine same as Astras.
- Cross-Nova queries are native (`WHERE nova_id IN (...)`) within the Platform DB.

### 9.2 Off-grid migration path (preserved, not built)

**Off-grid is one of three sovereignty tiers (see Lock 9.6), not a Nova-specific feature.** The migration primitive described below is the same underlying mechanism for every tier transition; "Nova exports to its own DB" is one shape of it. The clean `nova_id` (and `astra_id`) tagging from Lock 8 means a future "export this Nova to its own database" tool can do so without schema rework. Migration path (when built):

1. Export all rows where `nova_id = X` to a new Postgres project.
2. Repoint the Nova's domain at the new database.
3. Mark the Nova in `nova_registry` as `status = 'off_grid'`, populate `nova_registry.database_url` with the new project's URL.
4. Sever federation reads / writes (BLiNG! → DiGiTs per BLiNG! build day decisions in Lock 6).

This is a **future capability**, not committed in tier-1. Tier-1 ships only the schema posture (Lock 8) that makes it possible.

### 9.3 Cross-database query patterns

**Composition happens at the application layer (Astras), not the data layer.** Example: AtlasINTEL displaying a thread with author profile reads the thread from the Platform DB, reads the profile from the theMANUAL spine DB, and composes in the API layer. There is no foreign-data-wrapper, no cross-database view, no DBLink in tier-1.

This is a deliberate cost: cross-database joins in the application layer are slower and more code than native SQL joins. Tier-1 accepts that cost in exchange for clean failure isolation between economy, spine, and platform.

### 9.4 Rationale for three (not more, not fewer)

Operational cost of database boundaries is real (per-project pricing, monitoring, migration coordination, cross-database join logic). With Lock 8's per-Astra / per-Nova RLS, the Platform database handles all non-money, non-spine, non-regulated data cleanly until scale forces a split. Premature splitting is operational debt without proportionate benefit. **Fewer than three** would either re-mix money with platform content (breaks the failure-isolation argument that justifies a separate `freedomblings.com`) or re-mix spine with platform content (couples taxonomy migrations to per-Astra content migrations). **More than three** invites Lock 8's RLS-per-Astra to be re-debated at the database level for every new Astra, which is the operational debt premature splitting creates.

### 9.5 Code recommendation — Platform DB physical layout

**The prompt asks Code for a recommendation: separate Supabase project vs. separate schemas in the theMANUAL Postgres project.**

**Recommendation: separate Supabase project for the Platform DB.**

Reasons:
- **Failure isolation maps to architectural boundaries.** A theMANUAL spine outage should not take down per-Astra threads / events / chat; mixing the two physically couples failure domains that Lock 9 explicitly separates conceptually.
- **Lock 9.3 already commits to application-layer composition.** Cross-database joins are paid in either layout, so there is no join-convenience argument for sharing a project.
- **Lock 8's RLS posture is cleaner in a dedicated project.** A separate project means the Platform DB has its own service-role key, its own RLS policy surface, and its own migration cadence — none of which crowd theMANUAL spine migrations with non-spine schema.
- **Off-grid Nova migration is cleaner from a separate Platform project than from a multi-schema setup.** Repointing one Nova's data is a `pg_dump --schema=public --where='nova_id = X'` extract from a focused project, not a slice across a shared schema with theMANUAL spine tables.
- **Independent scaling / pricing.** Per-Astra content workloads (threads, chat, events) have different read / write profiles than the spine (atoms / taxonomy); independent projects let each tune compute and storage without interference.

**Trade-offs accepted by this recommendation:**
- Two Supabase projects = two bills, two sets of credentials, two migration timelines to coordinate.
- Local dev setup is slightly more involved (two `supabase start` instances or one local + one remote).
- Cross-DB joins exist regardless — they happen at the application layer per Lock 9.3.
- **Cost trajectory compounds as more databases come online.** Platform DB lands in tier-1; the Regulated Data DB (Lock 9 DB #4) is anticipated when the first regulated Astra ships; sovereign Astra / Nova databases (Lock 8 / Lock 9.2) come later as off-grid migration is exercised. Each additional Supabase project adds incremental ops cost (per-project pricing, monitoring, migration coordination, credentials surface). Not a blocker for the recommendation — the failure-isolation argument is stronger than the per-project cost line — but the trajectory should be visible up front so it isn't a surprise at DB #3 or DB #4.
- **The recommendation is not greenfield.** Adopting a separate Platform Supabase project includes **migrating existing platform tables out of the theMANUAL spine** (the `schema-v2-surfaces.sql` family — `forum_threads`, `forum_posts`, `events`, `groups`, `messages`, `chat_rooms`, `bazaar_listings`, `give_campaigns`, etc., plus Phase C additions like `promotions`). This migration cost is paid at **cutover time**, not just at setup time, and is large enough to warrant its own design session — tracked as **Open #30**. Tier-1 ratifies the destination shape; the move itself is scoped separately.

**Ratification — 2026-05-09.** Butch accepted this recommendation. Total committed monthly cost across the three planned Pro projects (BLiNG! + theMANUAL spine + Platform) is **~$75/mo**. Project instantiation is **deferred to trigger events, not pre-created**: the Platform Pro project is created when the Open #30 migration plan kicks off; the Regulated Data DB (DB #4) is instantiated when the first regulated Astra ships (Open #32).

**Not recommended (separate schemas in one project):** mixes failure domains, complicates RLS reasoning across schemas, and makes the future Platform-DB sovereign-Astra migration (Lock 8 / Lock 9.2 endpoints) harder than it needs to be. The cost of "one extra Supabase project" is paid once at setup; the cost of mixing failure domains is paid forever.

### 9.6 Sovereignty tiers

**Decision.** HONEYCOMB offers **three sovereignty tiers** across Astras and Novas. Each tier maps to a specific architectural arrangement already defined in this Lock 9. Tier *pricing* is deferred to the Sovereignty Tiers design session (Open #33); the **tier framework itself** is canonized here.

**Why this section exists.** Lock 9.2 currently reads as a Nova-specific escape hatch — "export this Nova to its own DB." That framing is too narrow. Off-grid is a **generalized capability** that lands across multiple tiers, driven by real use cases: privacy-sensitive enterprise (architecture firms, law practices, design studios), investigative journalism (source protection, subpoena resistance), regulated industries with custom compliance needs, and jurisdictional preferences. 9.6 productizes that capability as a three-tier framework so the migration primitive in 9.2 is understood as the underlying mechanism for **all** tier transitions, not just Nova escape.

**Tier 1 — Standard (default).**
- **Hosting:** shared Platform DB (Lock 9 DB #3).
- **Isolation:** per-Astra / per-Nova RLS via `astra_id` + `nova_id` (Lock 8).
- **Operations:** fully HONEYCOMB-managed.
- **Use cases:** most Astras, most Novas, most Bees. The default experience.
- **Privacy posture:** logical isolation, governance-layer sovereignty.
- **Cost to Bee:** free or minimal (BLiNG!-priced; TBD per Open #33).

**Tier 2 — Dedicated.**
- **Hosting:** dedicated Supabase project, HONEYCOMB-operated.
- **Isolation:** physical database boundary; no co-mingling with other tenants.
- **Operations:** HONEYCOMB-managed (backups, updates, monitoring).
- **Use cases:** privacy-sensitive workspaces (architecture firms, law practices, design studios using MiniWaves or similar Astras as branded internal tools); enterprise customers requiring dedicated-tenancy compliance language; large Astras peeling out from the shared Platform DB for performance reasons.
- **Privacy posture:** physical isolation — "your data, your database."
- **Cost to Bee:** medium (covers dedicated infrastructure + ops overhead).

**Tier 3 — Off-Grid.**
- **Hosting:** dedicated database, optionally in operator-chosen jurisdiction, optionally with operator-managed encryption keys.
- **Isolation:** physical, jurisdictional, cryptographic.
- **Operations:** operator-managed — HONEYCOMB provides tooling, not hosting.
- **Use cases:** investigative journalism (source protection, subpoena resistance), regulated industries with custom compliance needs, geopolitically sensitive operations, individual Bees seeking full physical sovereignty over their Nova.
- **Privacy posture:** maximum — HONEYCOMB-targeted legal process does not reach off-grid data; operator controls keys and jurisdiction.
- **Cost to Bee:** high — operator pays infrastructure directly; HONEYCOMB licenses tooling.
- **Currency note:** off-grid operations may use DiGiTs rather than BLiNG! (per Lock 6), since BLiNG! requires connection to `freedomblings.com`.

**Migration paths between tiers.**
- **Standard → Dedicated:** extract the Astra / Nova's tagged rows (Lock 8 `astra_id` / `nova_id` pattern) into a new HONEYCOMB-managed Supabase project; repoint domain.
- **Standard → Off-Grid:** same extraction, but destination is operator-controlled infrastructure; HONEYCOMB hands off operations.
- **Dedicated → Off-Grid:** HONEYCOMB exports the database; operator imports; HONEYCOMB severs operational connection.
- **Reverse migrations** (Off-Grid → Dedicated, Dedicated → Standard): technically possible, deferred to dedicated design (likely rare in practice).

**Tooling implications.**
- Lock 9.2's off-grid migration path is the **prototype** for Standard → Dedicated and Standard → Off-Grid alike. Same `WHERE nova_id = X` (or `WHERE astra_id = Y`) extract, same domain repoint, different destination ownership.
- This raises the priority of the migration tooling above what Lock 9.2 alone implies — it is the **single primitive underlying every tier transition**, not just a one-off Nova escape hatch.
- **BRANDoSOPHIC** (skinning Astra, build day Fri 2026-05-15) is tightly coupled to Tier 2/3 use cases — privacy-sensitive enterprise customers typically want both branded skin AND dedicated infrastructure. Sovereignty tier selection should be a step in the BRANDoSOPHIC Nova-creation flow, not an afterthought (Open #34).

**Out of scope (cross-reference).**
- **Tier pricing** (BLiNG! amounts, USD equivalents, billing cadence) → Sovereignty Tiers design session, post-BLiNG! build day (Open #33).
- **Off-grid currency mechanics** (DiGiTs issuance, redemption, peg / reserve) → BLiNG! build day, Tue 2026-05-12 (Lock 6).
- **Jurisdiction-specific hosting partnerships** (Rumble Cloud, Switzerland, Iceland, etc.) → infrastructure design session, separate work (Open #35).
- **Compliance certification language** (HIPAA, SOC2, PCI) per tier → compliance session when the first regulated Astra ships (Lock 9 DB #4; Open #32).

**Tier-1 implementation surface.**
- **DB #1 (BLiNG!) — `freedomblings.com`:** already exists. Tier-1 changes here are Lock 3 (`currency_type` discriminator), Lock 7 (precision tightening + RPC re-deploy). Plus Lock 1.1.a logical-replication publisher config.
- **DB #2 (theMANUAL spine) — `themanual.tech`:** already exists. Tier-1 changes here are Lock 8's `astra_registry` and `nova_registry` (the registries belong to the spine, conceptually next to canonical Bee identity), plus Lock 1.1.a replica subscriber config and Lock 1.1.b snapshot bucket.
- **DB #3 (Platform) — new Supabase project (per recommendation):** receives the `astra_id` / `nova_id` columns and RLS from Lock 8 across every content table. Migrations move out of `themanual.tech/supabase/migrations/` — pre-Phase-C platform tables that currently live in theMANUAL spine (`schema-v2-surfaces.sql` and friends) are candidates for migration to this project; the migration plan is **out of tier-1 scope** and tracked as Open #30.
- **DB #4 (Regulated):** not instantiated.

**Failure modes.**
- **Migrating existing platform tables out of theMANUAL spine into a new Platform DB** is the single largest tier-1 operational task and is **deferred to its own design session** (Open #30). Lock 9 ships the **decision**; the **mechanics** are scoped separately so they don't block tier-1.
- **Application-layer composition is slower than SQL joins** during the rare cross-DB read. Acceptable cost; not a tier-2 cache trigger by itself.
- **Forgetting which DB owns which surface** during day-to-day development. Mitigation: every new content table's migration must explicitly state which of the four databases it belongs in (PR template addition, out of repo for tier-1).

---

## Open questions

| #   | Question                                                                                       | Resolves at                                       |
|-----|------------------------------------------------------------------------------------------------|---------------------------------------------------|
| #21 | BLiNG! divisibility mismatch (v8 = 3 decimals, spec = 6). Apply Lock 7 deltas before tier-1 ships. | Pre-tier-1 ship (this doc's deltas)               |
| #22 | Prominence of "Continue with theMANUAL" vs. local signup on Astra signup screen.               | BLiNG! build day · Tue 2026-05-12                 |
| #23 | Are locally-created (non-theMANUAL-linked) accounts BLiNG!-eligible?                           | BLiNG! build day · Tue 2026-05-12                 |
| #24 | Account-linking mechanics (challenge flow, balance / handle conflict resolution).              | BLiNG! build day · Tue 2026-05-12                 |
| #25 | DiGiTs schema: what consumes `currency_type` on the read side? Per-coin balance views?         | BLiNG! build day · Tue 2026-05-12                 |
| #26 | Off-grid Nova mechanics: how does an `astra_or_nova_status = 'off_grid'` row interact with `freedomblings.com`, if at all? | BLiNG! build day · Tue 2026-05-12 |
| #27 | Board of Astras governance: membership, voting, scope of authority over `freedomblings.com` parameters. | §32 of MMF (separate work)                       |
| #28 | Tier-2 cache trigger: which metric (p95 latency? RPC qps? cost) tips us into building a cache layer? | When a real performance signal appears            |
| #29 | API contract & versioning between `freedomblings.com` and Astras (out of repo for tier-1).     | Out of band; track in `freedomblings.com` upstream |
| #30 | Platform DB migration plan: which tables move out of theMANUAL spine, in what order, with what cutover? | Own design session, post-Lock-9 ratification     |
| #31 | Cross-database query layer: when application-level joins between Platform / spine / BLiNG! become routine, do we want a thin "federation read" helper? | Own design session, triggered by frequency       |
| #32 | Regulated Data DB instantiation: which Astra ships first, what compliance frame, what migration of existing data (if any)? | When the first regulated Astra is greenlit       |
| #33 | Sovereignty Tier pricing model: flat BLiNG! upgrade fee, monthly subscription, infrastructure-cost-pass-through, or hybrid? | Sovereignty Tiers design session                  |
| #34 | BRANDoSOPHIC integration: should sovereignty-tier selection be surfaced during Nova creation in BRANDoSOPHIC, or as a post-creation upgrade flow? | BRANDoSOPHIC build day · Fri 2026-05-15           |
| #35 | Off-grid jurisdiction list: which hosting jurisdictions does HONEYCOMB officially ship tooling for, vs. operator-DIY? | Infrastructure design session                     |

---

## Schema deltas (read-only proposal — DO NOT APPLY)

The statements below are the proposed migration body for tier-1. They are written against the live `schema-v8-bling-themanual.sql` shape (themanual.tech-targeted variant) plus the platform tables in `schema-v2-surfaces.sql`. Order matters: type creation before any reference, then registries (Lock 8), then column adds + RLS, then BLiNG! discriminator (Lock 3), then divisibility tightening (Lock 7). **No statement here has been applied; this section exists for review.**

```sql
BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- Lock 3 · Discriminator type (consumed by Lock 8 registries below)
-- ───────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'astra_or_nova_status') THEN
        CREATE TYPE public.astra_or_nova_status AS ENUM ('active', 'archived', 'off_grid');
    END IF;
END $$;

-- ───────────────────────────────────────────────────────────────────────
-- Lock 8 · Registries (live in theMANUAL spine DB, per Lock 9)
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.astra_registry (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            text NOT NULL UNIQUE,
    name            text NOT NULL,
    status          public.astra_or_nova_status NOT NULL DEFAULT 'active',
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nova_registry (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug              text NOT NULL UNIQUE,
    name              text NOT NULL,
    parent_astra_id   uuid NOT NULL REFERENCES public.astra_registry(id),
    status            public.astra_or_nova_status NOT NULL DEFAULT 'active',
    database_url      text NULL,  -- populated only when off-grid (Lock 9.2)
    created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nova_registry_parent_astra_idx
    ON public.nova_registry(parent_astra_id);

ALTER TABLE public.astra_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nova_registry  ENABLE ROW LEVEL SECURITY;

-- Default policy: all authenticated reads of registry rows are allowed
-- (registries are public lookup data); writes are service-role-only.
CREATE POLICY astra_registry_read ON public.astra_registry
    FOR SELECT USING (true);
CREATE POLICY nova_registry_read ON public.nova_registry
    FOR SELECT USING (true);

-- ───────────────────────────────────────────────────────────────────────
-- Lock 8 · Add astra_id / nova_id to every Platform content table.
-- Below is the PATTERN; the migration must enumerate every content table
-- (forum_threads, forum_posts, events, event_rsvps, groups,
-- group_memberships, message_threads, message_participants, messages,
-- chat_rooms, bazaar_listings, give_campaigns, give_contributions,
-- entity_atom_links, entity_reactions, entity_saves, entity_shares,
-- promotions, …). Pattern repeats per table.
-- ───────────────────────────────────────────────────────────────────────

-- Pattern for table T:
-- ALTER TABLE public.T
--     ADD COLUMN IF NOT EXISTS astra_id uuid REFERENCES public.astra_registry(id),
--     ADD COLUMN IF NOT EXISTS nova_id  uuid REFERENCES public.nova_registry(id);
--
-- (Backfill astra_id for existing rows — see migration notes — then:)
-- ALTER TABLE public.T
--     ALTER COLUMN astra_id SET NOT NULL;
--
-- CREATE INDEX IF NOT EXISTS T_astra_id_idx ON public.T(astra_id);
-- CREATE INDEX IF NOT EXISTS T_nova_id_idx  ON public.T(nova_id) WHERE nova_id IS NOT NULL;
--
-- DROP POLICY IF EXISTS T_astra_isolation ON public.T;
-- CREATE POLICY T_astra_isolation ON public.T
--     FOR SELECT USING (
--         astra_id = current_setting('request.astra_id', true)::uuid
--         AND (nova_id IS NULL
--              OR nova_id = current_setting('request.nova_id', true)::uuid)
--     );
--
-- (Cross-Astra reads require an explicit additional policy carve-out.)

-- Backfill notes for the migration author (NOT executed here):
--   1. Insert one row into astra_registry for theMANUAL itself
--      (slug = 'themanual', name = 'TheMANUAL.tech') and capture its uuid.
--   2. UPDATE every content table to set astra_id = <themanual-uuid>
--      where astra_id IS NULL, BEFORE setting NOT NULL.
--   3. Leave nova_id NULL for all existing rows (no Novas yet).
--   4. The current_setting('request.astra_id') pattern requires Astra
--      Edge Functions to set the GUC on every request — that work is
--      part of the tier-1 buildout, not this scoping doc.

-- ───────────────────────────────────────────────────────────────────────
-- Lock 3 · currency_type discriminator on bling_transactions (BLiNG! DB)
-- Default 'BLING' so existing rows + existing RPC inserts stay valid.
-- CHECK pins the namespace to 'BLING' or 'DIGIT_<id>'.
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.bling_transactions
    ADD COLUMN IF NOT EXISTS currency_type TEXT NOT NULL DEFAULT 'BLING';

ALTER TABLE public.bling_transactions
    DROP CONSTRAINT IF EXISTS bling_tx_currency_type_chk;
ALTER TABLE public.bling_transactions
    ADD  CONSTRAINT bling_tx_currency_type_chk
        CHECK (currency_type = 'BLING' OR currency_type LIKE 'DIGIT\_%' ESCAPE '\');

CREATE INDEX IF NOT EXISTS bling_tx_currency_type_idx
    ON public.bling_transactions(currency_type)
    WHERE currency_type <> 'BLING';

-- ───────────────────────────────────────────────────────────────────────
-- Lock 7 · Tighten BLiNG! divisibility from numeric(20,3) → numeric(20,6)
-- Widening is metadata-only on existing data.
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.bees
    ALTER COLUMN bling_balance TYPE numeric(20, 6);

ALTER TABLE public.bling_transactions
    ALTER COLUMN amount TYPE numeric(20, 6);

ALTER TABLE public.bling_orders
    ALTER COLUMN amount TYPE numeric(20, 6),
    ALTER COLUMN filled TYPE numeric(20, 6);

-- Replace the >= 0.001 amount CHECK on bling_orders with the 0.000001 floor.
ALTER TABLE public.bling_orders
    DROP CONSTRAINT IF EXISTS bling_orders_amount_check;
ALTER TABLE public.bling_orders
    ADD CONSTRAINT bling_orders_amount_check CHECK (amount >= 0.000001);

ALTER TABLE public.bling_escrows
    ALTER COLUMN amount TYPE numeric(20, 6);

ALTER TABLE public.bling_stripe_events
    ALTER COLUMN bling_amount TYPE numeric(20, 6);

-- ───────────────────────────────────────────────────────────────────────
-- Lock 7 · RPC bodies hardcode 0.001 and round(..., 3). They must be
-- re-deployed via CREATE OR REPLACE with the new thresholds:
--   bling_free (formerly bling_mint): IF p_amount < 0.000001 THEN RAISE …
--   bling_place_order:                IF … p_amount < 0.000001 THEN RAISE …
--   bling_fill_order:                 IF p_fill_amt > v_remaining
--                                         OR p_fill_amt < 0.000001 THEN RAISE …
--   bling_send:                       v_fee := round(p_amount * v_fee_pct, 6);
--
-- Full RPC bodies omitted from this scoping doc; emit them in the
-- migration alongside these column changes. The change is mechanical:
-- find every literal 0.001 in the bling_* RPCs and replace with 0.000001;
-- find round(..., 3) in bling_send and replace with round(..., 6).
-- ───────────────────────────────────────────────────────────────────────

COMMIT;
```

**Sanity checks to run AFTER the migration applies:**

```sql
-- Lock 3 — Discriminator type exists with the expected three values:
SELECT enumlabel FROM pg_enum
JOIN pg_type t ON t.oid = enumtypid
WHERE t.typname = 'astra_or_nova_status'
ORDER BY enumsortorder;
-- → active, archived, off_grid

-- Lock 3 — currency_type column exists, defaults BLING, rejects bad values:
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'bling_transactions' AND column_name = 'currency_type';

-- Lock 7 — Precision tightened across all amount columns:
SELECT table_name, column_name, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE column_name IN ('bling_balance', 'amount', 'filled', 'bling_amount')
  AND table_schema = 'public'
ORDER BY table_name, column_name;
-- All should report 20, 6 (mint_price / total_supply remain 30, 6).

-- Lock 8 — Registries exist and have FKs wired:
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE conrelid IN ('public.nova_registry'::regclass)
  AND contype = 'f';
-- → nova_registry_parent_astra_id_fkey, nova_registry, astra_registry

-- Lock 8 — Every content table has astra_id NOT NULL:
SELECT table_name
FROM information_schema.columns
WHERE column_name = 'astra_id'
  AND is_nullable = 'NO'
  AND table_schema = 'public'
ORDER BY table_name;
-- → forum_threads, forum_posts, events, … (full content-table list)

-- Lock 8 — Every content table has at least one RLS policy mentioning astra_id:
SELECT schemaname, tablename, policyname, qual
FROM pg_policies
WHERE qual LIKE '%astra_id%'
ORDER BY tablename;
```

---

## Out of scope (cross-reference)

- **Board of Astras governance** → §32 of the master file (Lock 5).
- **DiGiTs / off-grid Novas / private-label coins** → BLiNG! build day, Tue 2026-05-12 (Lock 6).
- **Tier-2 caching layer** → triggered by a real performance signal (Lock 4).
- **`freedomblings.com` API contract & versioning** → out of repo; tracked upstream.
- **Active-active hot failover** → post-Swarm only (Lock 1.1.c).
- **Cross-database query layer / application-level join patterns** → own design session when cross-database queries become routine (Open #31).
- **Per-Astra sovereign databases** → future capability via Lock 8 / Lock 9.2; not committed in tier-1.
- **Regulated Data database** → instantiated when the first regulated Astra ships (Lock 9 DB #4; Open #32).
- **Platform DB migration plan** (moving existing platform tables out of theMANUAL spine into a new Platform Supabase project per Lock 9.5) → own design session (Open #30).
- **Sovereignty Tier pricing** (BLiNG! amounts / USD equivalents / billing cadence per tier) → Sovereignty Tiers design session (Lock 9.6; Open #33).
- **BRANDoSOPHIC tier-selection integration** (whether sovereignty tier is chosen during Nova creation or as a post-creation upgrade) → BRANDoSOPHIC build day, Fri 2026-05-15 (Lock 9.6; Open #34).
- **Off-grid jurisdiction list** (which jurisdictions HONEYCOMB officially ships tooling for vs. operator-DIY) → infrastructure design session (Lock 9.6; Open #35).
