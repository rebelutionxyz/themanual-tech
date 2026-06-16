# SESSION MASTER — 2026-06-16 · US Places Load + Close
**Status: LOCKED** · The Manual / HONEYCOMB · Supabase `anxmqiehpyznifqgskzc`

## Completed (verified)
- **US places geo-load — DONE.** 15,310 U.S. cities at depth 6 under
  `Geography / Countries / North America / United States / <State> / <City>`.
  Composition: 2,040 original GeoNames + 13,270 SimpleMaps (Basic v1.93, CC BY 4.0);
  1,758 overlaps deduped on (state, name). Floor: population ≥ 1,000. All 50 states present
  (DC excluded from the city layer).
  - Load-time integrity: 0 depth-mismatch, 0 null `geo.type`, 0 orphans, 0 dup paths.
  - `is_leaf` reconcile applied: all 50 state nodes → branch; `Washington, D.C.` correctly
    remains a childless leaf.
  - Geography realm: 3,646 → **16,938** atoms (incl. Mumbai below).
- **Whole-table integrity sweep — PRISTINE.** 21,667 atoms; every check zero
  (depth, slash-in-name, null name/realm/kettle, dup paths, orphans, leaf-with-children,
  branch-without-children).
- **AtlasORACLE P1 auth-pin — CLOSED (already hardened).** Both
  `atlasoracle_check_rate_caps(uuid,text)` and `atlasoracle_get_escrow_balance(uuid)` are
  `SECURITY DEFINER`, `search_path` pinned to `pg_catalog, public`, and carry
  `if auth.uid() is not null and auth.uid() is distinct from p_bee_id then raise exception 'forbidden…'`.
  No change required — the prior "unverified/deferred" note is resolved.
- **Mumbai neighborhoods — DONE.** Expanded to 22 recognizable neighborhoods (added Fort,
  Chembur, Kurla, Ghatkopar, Mulund, Kandivali, Vile Parle, Santacruz, Khar, Mahim,
  Lower Parel, Byculla to the existing 10). depth 7, `geo.type='neighborhood'`, parent branch.
- **`/attributions` page — DELIVERED.** Self-contained React/TSX (`Attributions.tsx`); credits
  SimpleMaps + GeoNames under CC BY 4.0 with source links, license links, and a modification
  notice. Downloaded by Butch; wiring (place + route + footer link) is the remaining Code step.

## Ratified decisions (locked this session)
- **Geo lens model + Option A:** GEO realm is the single canonical, COMPLETE place index —
  CDPs included as legitimate places (governance simply won't geo-tag a CDP). The GOVERNMENT
  tree stays FUNCTION/level-organized (existing national org-charts); place↔jurisdiction is
  expressed via geo-tags through the lens toolbar, NOT by folder duplication.
- **Population floor = 1,000** (locked).
- **SimpleMaps `incorporated` flag dropped** — proven unreliable.
- **Mumbai = recognizable neighborhoods (Option N), not lettered BMC wards (A–T).** Matches the
  named-subdivision spirit of Tokyo / Beijing / Chicago.
- **`public.atoms` RLS:** currently DISABLED — do NOT enable as a side effect of any load.
  Enabling without a public-read policy would blank the Manual if the frontend reads atoms via
  the anon key. RLS on the spine is a separate, deliberate task (add the read policy first).

## Migrations applied this session
- `geography_us_places_simplemaps_b001` — first 500-row dense batch (proof + partial load)
- `geography_us_places_isleaf_reconcile` — state nodes depth 5 → branch
- `geography_mumbai_neighborhoods_expand` — +12 Mumbai neighborhoods
- ⚠️ **Migration-history gap:** the BULK U.S. load (~12,770 rows) ran via the Studio SQL editor
  and is **NOT** in `schema_migrations`. Close by saving the combined idempotent file as
  `TheMANUAL.tech/supabase/migrations/20260615_geography_us_places_simplemaps_1k.sql`
  (safe on fresh branches — `NOT EXISTS` guard).

## Method / gotchas locked (carry forward)
- **MCP `apply_migration` output ceiling:** ~500-row dense chunk (~16 KB) emits reliably;
  ~2,500-row (~78 KB) truncates the response. Big loads → Studio combined file or ≤500-row batches.
- **Windows CRLF:** files round-tripped through the Windows machine become `\r\n`. Any in-SQL blob
  parser MUST strip `\r` (`replace(l, E'\r','')`) and guard real data lines
  (`WHERE cl LIKE '%|%|%|%'`). This caused the `22P02 invalid input syntax for integer: ""` error.
- **Studio SQL editor cap ≈ 1 MB** (444 KB combined file fits; the old 1.76 MB verbose file did not).
- **Dense bulk wire format:** pipe-delimited `slug|Name|ST|pop` inside a `$blob$…$blob$`
  dollar-quoted blob, parsed with `regexp_split_to_table` + `split_part`; id / state / path
  derived in SQL. ~2.5× denser than verbose VALUES.
