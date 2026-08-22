# db/proposals — PROFILE4 profile data layer (PROPOSE-FIRST)

These migrations are **authored, not applied**. Per **SQL_AUTONOMY v1.1** and the
PROFILE4 dispatch ("do NOT stamp the shared ledger"), nothing here runs
`apply_migration` and nothing stamps `supabase_migrations.schema_migrations`.
A controlled **MIGRATE_SWEEP** pass (lead-queued when proposals accumulate) or
the owner applies the pooled `db/proposals/*.sql` in **one serialized run**,
pairs each file into `supabase/migrations/`, and stamps once — keeping a single
writer to the shared ledger (the DB42 lesson).

Each migration has a paired `_rollback.sql`, and states its rollback in the
header (MIGRATION AMENDMENT: rollback written first).

## Apply order (FK-respecting)

1. `0001_profile_nodes.sql` — profile patchboard node layer.
   - `profile_node_catalog` (census + defaults + sensitivity; seeded) and
     `profile_nodes` (per-Bee overrides). Covers PROFILE_SPEC v0.1's element
     list plus tab order, share-my-votes, contact method, ad slot, and the tip
     rails — every public profile element is a switchable node, nothing
     hardcoded. Self-contained; merges into the patchboard2 catalog when that
     base storage lands (it is **not** yet applied to this DB).
   - Resolver `profile_node_effective(bee, key)` = bee override → catalog default.
2. `0002_bee_relations.sql` — social-graph relations beyond follow.
   - `bee_relations` (subscribe / contact / friend / connection) + SECDEF RPCs
     (`bee_relation_request` / `_accept` / `_remove`) + public `bee_relation_count`.
   - **FOLLOW is unchanged** — it stays in the existing `public.bee_follows`.
3. `0003_tip_donation_levels.sql` — creator tip reward tiers.
   - `tip_donation_levels` (amount + reward + BLiNG!-back + `max_count`). CONFIG
     only; live money is owner-gated at the money walk. Rails + tipper-BLiNG!-back
     switch live as `profile_nodes` (`tips.*`), not duplicated here.

## Galleries (dispatch item b) — NO new schema needed

Verified against the live schema: galleries already exist and are complete —
`media_collections` (has a `visibility` column = the per-gallery public switch),
`media_collection_items`, `media_assets`, `media_folders` (the vault feed). The
profile Images/Videos surface reads these via `src/lib/media.ts`
(`listPublicCollections`), already used by `ShowcaseSection`. No proposal is
issued for galleries rather than manufacture redundant tables; the remaining
work is UI wiring against the existing schema.

## Not executed

These files were **not run against the shared DB** — executing schema is exactly
what propose-first forbids, and a rehearsal that quietly commits is the DB37
breach (HARNESS_SAFETY). They were reviewed by hand; the MIGRATE_SWEEP/owner
apply verifies against `information_schema` and re-measures the reconcile ledger
to 0 per the MIGRATION AMENDMENT.

## Conventions followed

- RLS on every table; `bees.id = auth.uid()` (from `bee_follows_v1`).
- Writes to relation edges go through SECURITY DEFINER RPCs (`security definer
  set search_path = public`); config tables (`profile_nodes`, `tip_donation_levels`)
  use own-row RLS policies.
- Named-role grants + REVOKE PUBLIC / revoke anon-execute (v9 hardening) — anon
  keeps SELECT only where a signed-out visitor must read (public profile).
- `numeric(20,6)` for BLiNG!/amount precision; `timestamptz default now()`;
  idempotent DDL (`if not exists`, `drop policy if exists`).
- No rates/weights/prices hardcoded — ECONOMY_MORNING prices later; values live
  in `profile_nodes` / config rows.
