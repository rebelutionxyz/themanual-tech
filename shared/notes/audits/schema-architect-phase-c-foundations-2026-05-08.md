# Schema Architect — Phase C Foundations Migration

**Date:** 2026-05-08
**Author:** schema-architect (Claude) — supervised by Butch
**Status:** **APPLIED to production.** Verified + smoke-tested. Not yet committed to git.
**Migration paths:**
- `supabase/migrations/20260508120000_phase_c_schema_foundations.sql` (B-1, B-2, B-3)
- `supabase/migrations/20260508120100_phase_c_b4_bling_rename.sql` (B-4 — micro-migration, see B-4 section)
**Driving audit:** `shared/notes/audits/code-21-schema-drift-audit-2026-05-08.md` (Code 21)

---

## Summary

Single migration file covering the four schema items Code 21 flagged as Phase C blockers:

| Block | Item | Type | Component | Final state |
|---|---|---|---|---|
| B-1 | `bee_profiles` | new table + trigger + RLS | Component C-4 (Geo lens) | applied + smoke-tested |
| B-2 | `promotions` | new table + 3 indexes + RLS | Component D (slot framework) | applied |
| B-3 | `bees.is_admin` | new column on existing table | Component D-5 (admin gate) | applied |
| B-4 | `bling_mint` -> `bling_free` | RPC rename | language-firewall hygiene | applied via follow-up micro-migration |

**B-4 timeline correction.** The first-draft migration bundled B-4 with B-1/B-2/B-3. Butch instructed me to strip B-4, citing a prior session that had already done the rename. Post-apply verification of the stripped migration found this was incorrect — `bling_mint` was still present in production and `bling_free` did not exist. A follow-up micro-migration (`20260508120100_phase_c_b4_bling_rename.sql`) was written and applied in the same session, using the exact pg_proc-guarded `DO $$` block from the original draft. Final state: `bling_free` exists with the firewall-safe function comment in place; `bling_mint` is gone. Language firewall is intact at the DB layer.

The main migration is one transaction (`BEGIN`/`COMMIT`) so all three blocks land or none do — same pattern the v9 security migrations established. Idempotent: every block uses `IF NOT EXISTS` / `OR REPLACE` / `DROP-then-CREATE` for policies and triggers.

---

## What was built

### B-1 — `bee_profiles` table

Sidecar to `public.bees`, 1:1 by `bee_id` with `ON DELETE CASCADE`. Columns: four nullable location facets (`location_country`, `location_region`, `location_city`, `location_neighborhood`), plus `created_at` / `updated_at`.

**Lifecycle:**
- AFTER INSERT trigger on `public.bees` (function `public.handle_new_bee_profile`, `SECURITY DEFINER`) auto-creates a profile row with NULL facets every time a new bee is created. `ON CONFLICT (bee_id) DO NOTHING` makes replay safe.
- One-time backfill `INSERT … SELECT id FROM bees ON CONFLICT DO NOTHING` ensures every existing bee has a profile row even if the trigger missed them.
- `updated_at` auto-bumped by `BEFORE UPDATE` trigger using the existing `public.set_updated_at()` function (NOT redefined — confirmed it already exists on the DB per `supabase/schema.sql` and migration 23 Block D).

**RLS:**
- `bee_profiles_select_public` — `USING (true)`. Geo lens needs to render "bees in <city>" for any visitor.
- `bee_profiles_update_self` — `bee_id = auth.uid()` for both USING and WITH CHECK. Only authenticated.
- No INSERT policy — the trigger is the only legitimate INSERT path, and it bypasses RLS via `SECURITY DEFINER`. End users never INSERT directly.
- No DELETE policy — cascades from `bees`.

**v1 validation:** location columns are unvalidated free-form text. Selector-based validation (country picker, region picker, etc.) lives in app code. A v2 pass can tighten with a CHECK against an allowed-country list once the UI is fixed.

### B-2 — `promotions` table

Empty at v1; populated manually via Supabase Studio until a promotions admin UI exists.

**Targeting facets:**
- `slot_key text` — matches PillarConfig slot identifiers (e.g. `top-ticker`, `sidebar-promoted`, `feed-inline`).
- `behavior text CHECK IN ('static', 'scrolling')` — column is `behavior`, NOT `type`, to avoid vocabulary collision with `atoms.type`. The spec explicitly called this out (D-2).
- `astra_slug` / `realm_slug` / `branch_path` / `atom_id` — content scope, NULL means "any".
- `geo_country` / `geo_region` / `geo_city` / `geo_neighborhood` — geo scope. v1 reader is country-only; the other three are schema-only for v2.
- `priority int DEFAULT 0`, `active bool DEFAULT true`, `starts_at` / `ends_at` window.

**Indexes (all justified inline in the SQL):**
1. `(slot_key, astra_slug, realm_slug, active)` — astra/realm targeting lookup.
2. `(slot_key, geo_country, active)` — geo targeting lookup (queried independently of astra/realm).
3. `(starts_at, ends_at) WHERE active = true` — partial index for the active-window filter on every reader pass. Partial keeps it small once expired rows accumulate.

**RLS:**
- `promotions_select_active` — `USING (active = true AND start-window AND end-window)`. Active-window predicate enforced *in the policy itself* so anon can never observe paused / future / expired rows even if the reader query forgets to filter.
- `promotions_admin_insert` / `_admin_update` / `_admin_delete` — three separate policies (Postgres requires per-command policies for non-SELECT), each gated on `EXISTS (SELECT 1 FROM bees WHERE id = auth.uid() AND is_admin = true)`. Pattern matches the v9 `atom_kettle_votes` / `atom_sources` / `atom_comments` style.

### B-3 — `bees.is_admin` column

`ALTER TABLE public.bees ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false`. Ordered before B-2 in the file because B-2's admin-write policies reference `is_admin`. No backfill — every existing bee defaults to false. v1 admin assignment is a manual `UPDATE bees SET is_admin = true WHERE id = '<uuid>'` via Supabase Studio.

### B-4 — applied via follow-up micro-migration

**Timeline:**
1. First draft of the main migration (`20260508120000`) included a B-4 block: an `ALTER FUNCTION ... RENAME` wrapped in a `pg_proc`-guarded `DO $$` with four explicit branches (rename / no-op / refuse-both / refuse-neither).
2. Butch instructed me to strip B-4 before applying, citing a prior session that had already done the rename.
3. Main migration was applied without B-4. Post-apply verification queried `pg_proc` for both names and found `bling_mint(p_bee_id uuid, p_amount numeric)` still present and `bling_free` absent — the prior-session rename had not actually happened.
4. Follow-up micro-migration `20260508120100_phase_c_b4_bling_rename.sql` was written using the same safe `DO $$` block from the first-draft B-4 and applied. Verification: only `bling_free` now exists; firewall-safe function comment is in place.

**ALTER FUNCTION RENAME** preserves: function body, grants/revokes (PUBLIC + anon + authenticated all already revoked per migration 23 C.8 / migration 24 Block 1), `SECURITY DEFINER`, `search_path`. Service-role retains implicit access — Stripe webhook path keeps working.

**Function-comment update** (separate `DO $$` block in the same micro-migration) sets:
> "FREE BLiNGs from the 10T reserve via the bonding curve. Atomic supply++, balance++, system_state update. Service-role only (Stripe webhook path). Renamed from bling_mint on 2026-05-08 to honor the language firewall — never use the M-word in user-facing surfaces."

**Repo-wide grep for `bling_mint` (frozen-history only — no live code hits):**
- `supabase/schema-v8-bling.sql` — historical, not re-applied.
- `supabase/schema-v8-bling-themanual.sql` — historical, not re-applied.
- `supabase/migrations/23_v9_0_security.sql` — REVOKE + comments. Frozen.
- `supabase/migrations/24_v9_0_security_tightening.sql` — REVOKE + comments + commented-out rollback. Frozen.

If a future migration ever GRANTs/REVOKEs on this function it must use the live name `bling_free`.

**Lesson for future sessions:** when an instruction says "X was already done in a prior session," verify against the live DB before stripping the corresponding block. The defensive `DO $$` with four explicit branches is the right shape — it's idempotent on a successful prior apply and loud-fails on partial state.

---

## Assumptions I could not verify (no live DB inspection available)

These are claims the migration depends on. None blocked the file from being written, but Butch should sanity-check before applying:

1. **`public.set_updated_at()` exists on the production DB.** Evidence:
   - `supabase/schema.sql:94` defines it (the original DB bootstrap).
   - `supabase/schema-v8-bling.sql:258` re-defines it defensively with `CREATE OR REPLACE` (so it's certainly there after schema-v8 was applied).
   - `supabase/migrations/23_v9_0_security.sql:605` `ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp` succeeded on production (per the v9 verification audit dated 2026-05-06).
   So this is high-confidence-true. The migration assumes it and does NOT redefine it.

2. **`public.bees(id uuid)` exists with the column shape used in B-1's FK.** Evidence: `supabase/schema.sql:14` confirms `id uuid primary key references auth.users(id) on delete cascade`. Migration 23 Block A treats `bees` as established.

3. **`public.atoms(id text)` exists.** Evidence: `supabase/02_create_new_taxonomy.sql:53-73` defines `id TEXT PRIMARY KEY`. Migration 23 Block A also confirms RLS is enabled on `atoms`. **CONTRADICTION WITH SPEC:** The Phase C spec said B-2's `atom_id` should be `uuid NULL REFERENCES atoms(id)`. Production atoms are keyed by **text slug** (e.g. `justice/freedom-of-speech`), per project CLAUDE.md ("`text` for slug-based IDs (atoms)"). I used `text` in the migration. The spec asked me to "default to uuid per the spec; flag the discrepancy if you find evidence atoms use text PK" — this is that flag. **Butch should confirm `text` is the right call before applying.**

4. **`gen_random_uuid()` is available.** Used as `promotions.id`'s default. Evidence: project CLAUDE.md schema conventions explicitly call this out as the standard PK default. The `pgcrypto` extension that provides it is enabled on Supabase by default; if it's somehow not enabled, the CREATE TABLE will fail loudly — no silent corruption risk.

---

## Post-Apply Verification Results (2026-05-08, same session)

All verification queries below were run against project `anxmqiehpyznifqgskzc` (themanual-tech, us-east-1, ACTIVE_HEALTHY) via Supabase MCP `execute_sql` immediately after the migrations applied.

| # | Check | Result |
|---|---|---|
| 1 | `bee_profiles` RLS enabled, 2 policies (`bee_profiles_select_public`, `bee_profiles_update_self`), `bee_profiles_set_updated_at` trigger present, `bees_create_profile` trigger on `bees` present | **PASS** |
| 2 | Backfill: bees count == bee_profiles count | **PASS** (3 / 3) |
| 3 | `promotions` RLS enabled, 4 policies (`promotions_admin_delete`, `promotions_admin_insert`, `promotions_admin_update`, `promotions_select_active`), 4 indexes (`promotions_pkey`, `promotions_active_window_idx`, `promotions_slot_astra_realm_active_idx`, `promotions_slot_geo_country_active_idx`), `promotions_set_updated_at` trigger present | **PASS** |
| 4 | `bees.is_admin`: `boolean NOT NULL DEFAULT false`, 3 non-admin / 0 admin | **PASS** |
| 5 | `bling_free` exists, `bling_mint` does not, function comment is firewall-safe (mentions FREE / 10T reserve / bonding curve) | **PASS** (after follow-up micro-migration; first attempt found mint still present and triggered the corrective work) |
| 6 | **Trigger smoke test for B-1.** Inserted a single row into `auth.users`, observed full chain (`auth.users` insert → `handle_new_bee` trigger → `bees` insert → `bees_create_profile` trigger → `bee_profiles` insert), then `RAISE EXCEPTION` to roll back. | **PASS** — observed `bee=1, profile=1, facets=[country=NULL region=NULL city=NULL neighborhood=NULL created_at=2026-05-08 16:20:56+00]`. Rollback verified via post-test count: 3 auth.users / 3 bees / 3 bee_profiles (baseline). |

No RLS write tests were run for `promotions` (would require a real authenticated session with `is_admin=true`). The policy SQL is exact-match with the v9 admin-gate pattern and the `is_admin` column is the same boolean shape; high confidence the policy works, but a real INSERT-as-admin smoke is left for the Code 24 reader/writer build session.

---

## Tests Butch should run after applying

Run these in Supabase Studio SQL editor against the branch (or production after branch validation). The migration's commented-out **VERIFICATION** section at the bottom of the SQL file has the same queries — copy from there.

**Schema sanity:**

```sql
-- (1) bee_profiles set up
SELECT rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename='bee_profiles';
-- expect: t

SELECT polname FROM pg_policy WHERE polrelid='public.bee_profiles'::regclass ORDER BY polname;
-- expect: bee_profiles_select_public, bee_profiles_update_self

SELECT (SELECT count(*) FROM public.bees) AS bees,
       (SELECT count(*) FROM public.bee_profiles) AS profiles;
-- expect: equal counts (backfill worked)

-- (2) promotions set up
SELECT polname FROM pg_policy WHERE polrelid='public.promotions'::regclass ORDER BY polname;
-- expect: promotions_admin_delete, promotions_admin_insert,
--         promotions_admin_update, promotions_select_active

SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='promotions' ORDER BY indexname;
-- expect: promotions_active_window_idx, promotions_pkey,
--         promotions_slot_astra_realm_active_idx, promotions_slot_geo_country_active_idx

-- (3) bees.is_admin
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='bees' AND column_name='is_admin';
-- expect: is_admin, boolean, false, NO

-- (4) bling_free exists, bling_mint does not (B-4 closed in prior session — sanity re-check only)
SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN ('bling_mint','bling_free');
-- expect: bling_free only
```

**Behavioral smoke:**

```sql
-- (5) bee_profiles auto-create. As a test bee:
--   INSERT a fake bee row in a transaction, observe profile auto-created, ROLLBACK.
BEGIN;
INSERT INTO public.bees (id, handle, email, bling_balance)
    VALUES (gen_random_uuid(), 'testbee_' || extract(epoch from now())::int, 'test_' || extract(epoch from now())::int || '@example.com', 0)
    RETURNING id;
-- (capture the returned id)
SELECT * FROM public.bee_profiles WHERE bee_id = '<that id>';
-- expect: 1 row, all location facets NULL, created_at = now()ish
ROLLBACK;

-- (6) Idempotency: re-run the migration. Should be a clean no-op. The
--     bling_free DO block should RAISE NOTICE 'already exists ... no-op'.

-- (7) RLS — promotions visibility.
--     As anon, SELECT * FROM promotions — should return 0 rows when the
--     table is empty, and only active-window rows once seeded.
--     As authenticated non-admin, INSERT INTO promotions(...) — should be
--     denied by promotions_admin_insert.
--     As an admin bee (is_admin=true), INSERT — should succeed.

```

---

## Follow-ups for Code 23 / Code 24

Once this migration is applied, both downstream sessions can fire in parallel.

**Code 23 (Component C — Geo lens UI):**
- Read `bee_profiles` for the current bee on profile-edit screen; UPDATE on save.
- Build the four selector dropdowns (country / region / city / neighborhood). Validation logic is app-side per the v1 design.
- Geo lens reader queries `bee_profiles` joined to `bees` to render "bees in <facet>" feeds.
- No new RPC needed for v1 — direct INSERT/UPDATE through PostgREST works because the RLS allows `bee_id = auth.uid()` updates.

**Code 24 (Component D — Promotion slot framework):**
- Build the reader: query `promotions` filtered by `(slot_key, active=true, time-window)` — but note the policy already enforces active-window, so the reader can simply SELECT and trust RLS.
- Implement most-specific-match scoring (atom_id > branch_path > realm_slug > astra_slug > catch-all).
- Geo match in v1 is country-only.
- Order by `priority DESC, created_at DESC`.
- Promotions admin UI is **not** in scope for v1 — Butch can manually INSERT rows via Supabase Studio. Reading from `is_admin` is gated; an admin UI in v2 will let admins toggle `is_admin` (which itself needs a SECURITY DEFINER RPC, since `bees` doesn't currently allow user UPDATEs of arbitrary fields).

**Vocabulary mop-up (separate session, low priority):**
- Project CLAUDE.md mentions `bling_free` as if it already exists — Code 21 flagged this as a docs↔schema drift. With the rename already done in a prior session, that line in CLAUDE.md is now accurate.
- Migration 23 / 24 still reference `bling_mint` in comments and rollback blocks. Frozen history; no action needed unless a future migration touches the function — at which point it must use `bling_free`.

---

## Rollback plan

The migration file ends with a commented-out `BEGIN; … COMMIT;` rollback block. Reverse order: B-2 -> B-3 -> B-1.

**Per-block rollback notes:**

- **B-3 rollback** (`DROP COLUMN is_admin`) is destructive — any admin assignments are lost. If any production bees have been promoted to admin, capture the list before rolling back.
- **B-2 rollback** drops the table cleanly. Safe at v1 because the table is empty by design.
- **B-1 rollback** drops the table + the trigger function + the trigger on `bees`. Pre-rollback check: any code reading `bee_profiles`?

**If rollback is needed mid-apply** (txn aborts before COMMIT): Postgres rolls back automatically. No manual cleanup required.

**B-4 is not in scope for rollback** — the rename was completed in a prior session. If for some reason the function name needs to flip back to `bling_mint`, that's a separate operation: `ALTER FUNCTION public.bling_free(uuid, numeric) RENAME TO bling_mint;`. Pre-flight: grep the repo for `bling_free` first; any callers will break.

---

## Open questions for Butch — RESOLVED

All three open questions from the first-draft writeup have been resolved:

1. ~~**`promotions.atom_id` type**~~ — **CONFIRMED:** stays `text`. Production atoms are slug-keyed; `text` matches reality.
2. ~~**B-3 default**~~ — **CONFIRMED:** no admin pre-seeding in the migration. All existing bees default `is_admin = false`. Admin assignment is a manual `UPDATE bees SET is_admin = true WHERE id = '<uuid>'` via Supabase Studio after apply.
3. ~~**Edge case for B-1 trigger**~~ — **CONFIRMED:** trigger chain ordering is `auth.users insert -> handle_new_bee -> bees row -> bees_create_profile -> bee_profiles row`. Matches Butch's mental model.

🐝
