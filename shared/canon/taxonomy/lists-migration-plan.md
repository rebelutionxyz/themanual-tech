# Lists Disposition — Migration Plan + Batch-1 SQL

**Date:** 2026-05-19 · **Status:** at Step-1 checkpoint per Butch's ORDERS 2026-05-19.
**Companions:** `lists-disposition-summary.md` · `lists-disposition-table.csv` · `dissolve-row-dump.md` · `adjudication-brief.md` · `lens-mechanism-status.md`
**Batch-1 SQL:** `shared/canon/taxonomy/migrations/2026-05-19-lists-batch-1-create-containers.sql`

---

## 1. What changed since the summary doc was first posted

Three working-set deltas during the collision audit:

### 1a. 11 atoms reclassified from non-destructive → DISSOLVE (collision-driven)

Targets I proposed for these collided with **already-existing canonical atoms** in production. The Lists copies are redundant and drop:

| Source id (was) | Was bucket | Proposed target — **already exists** |
|---|---|---|
| `math-lists-systems-theory` | CROSS_REALM/DROP | `Society / Social sciences / Systems theory` ✓ exists |
| `history-lists-world-records-in-chess-historical` | CROSS_REALM | within-batch collision with `culture-games-board-games-chess-lists-chess-world-records`; the latter keeps the slot, history copy drops |
| `culture-literature-lists-fiction` | INTRA_REALM | `Culture / Literature / Fiction` ✓ exists |
| `culture-sports-lists-surfing` | INTRA_REALM | `Culture / Sports / Water sports / Surfing` ✓ exists |
| `health-lists-pharmaceutical-drugs-list` | IMPORT_REALIZE | `Health / Substances / Pharmaceutical drugs` ✓ exists — that atom is the import target |
| `science-lists-earth-sciences-lists-rocks-list` | INTRA_REALM | `Science / Earth science / Geology / Rocks` ✓ exists |
| `science-lists-earth-sciences-lists-volcanoes-list` | INTRA_REALM | `Science / Earth science / Geology / Volcanoes` ✓ exists |
| `society-lists-hieroglyphs-list` | INTRA_REALM | `Society / Linguistics / Writing systems / Hieroglyphs` ✓ exists |
| `society-lists-languages-list` | IMPORT_REALIZE | `Society / Linguistics / Languages` ✓ exists — that atom is the import target |
| `society-lists-public-utilities-list` | INTRA_REALM | `Society / Infrastructure (pointer) / Public utilities` ✓ exists |
| `society-lists-writing-systems-list` | INTRA_REALM | `Society / Linguistics / Writing systems` ✓ exists |

All 11 now sit in DISSOLVE with notes; cross-link via `realm_tags` is the standing pattern.

### 1b. Final bucket counts

| Bucket | Count | Notes |
|---|---:|---|
| `INTRA_REALM` | **334** | non-destructive moves within same realm |
| `IMPORT_REALIZE` | **68** | repathed AND kept as container shells (per Butch's order: "realize-later — never dropped") |
| `CROSS_REALM` | **35** | non-destructive moves to a different realm |
| **Non-destructive subtotal** | **437** | this is the Step-1 scope |
| `DISSOLVE` | **89** | 46 mechanism-independent + 43 lens-induced |
| `LENS` | 35 | parked — see §1c |
| `DISSOLVE_CONTAINER` | 31 | runs last (Step 5) |
| `ADJUDICATE` | 14 | Step-6 gate |
| **Total** | **606** | matches Lists drawer count |

Butch's ORDERS said "the 448 non-destructive moves." The number is **437** post-collision audit. The 11 delta is documented in §1a above.

### 1c. Lens mechanism is NOT-LIVE

Verified by codebase + atom-dump audit (`lens-mechanism-status.md`). The §12 mechanism is not wired:
- `src/lib/tree.ts:13-83` is a pure depth-by-path tree, no facet path.
- `src/components/manual/ListView.tsx:22-26` filters only on `themeTags`. `realm_tags` / `pillar_tags` / `skin_tags` are display-only chips.
- The claimed precedents (`history-by-region`, `geography-groupings`) do not exist as atoms.

Per ORDERS Step 4: **PARK 78 atoms** (43 lens-induced DISSOLVE + 35 LENS conversions) and continue.

---

## 2. Pre-flight checks (all passed)

| Check | Result |
|---|---|
| Production atom count | 4,897 atoms ✓ |
| Lists atoms | 606 ✓ |
| **FK referencing rows on any of the 606 Lists atoms** | **0** across `atom_kettle_votes`, `atom_sources`, `atom_comments`, `entity_atom_links`, `promotions` — id renames are FK-safe |
| **Within-batch new_id collisions** | **0** (after 11 reclassifications) |
| **Production-existing new_id collisions** | **0** |
| **New_path collisions against existing non-source paths** | **0** |
| **Max proposed depth** | **8** ≤ `atoms_depth_check` ceiling of 9 ✓ |
| **Container set: id collisions** | 0 |
| **Container set: within-set dup ids** | 0 |
| **Container set: max depth** | 7 ≤ 9 ✓ |

The 437 source atoms have zero downstream references in any of the five FK-bearing tables. **Id renames will not break referential integrity** because there's nothing referencing them.

---

## 3. Schema reality affecting the plan

- **`atoms.type` is a monoculture: all 4,897 rows have `type='event'`.** The CSV's `proposed_new_type` column proposes 30+ new type values, none of which are validated by any constraint and none of which exist on any other atom. **Decision: this pass keeps `type='event'` on every moved atom.** The `proposed_new_type` column becomes intent-only documentation for a future type-vocabulary audit. Re-typing 437 atoms with new vocabulary mid-disposition would break the type monoculture without a validated alternative — out of scope for this pass.
- **`atoms.kettle`** has a CHECK constraint: `{Accepted, Contested, Emerging, Fringe}`. The dominant value is `Accepted` (97%). New containers use `Accepted`.
- **`atoms.depth`** has a CHECK constraint: `BETWEEN 1 AND 9`. No proposed atom exceeds depth 8 and no proposed container exceeds depth 7.
- **`atoms.path`** has a UNIQUE constraint. All 437 new_paths verified unique vs existing non-source paths.
- **`atoms.id`** is the primary key. All 437 new_ids verified unique vs existing.

---

## 4. Batch design

5 batches. Each runs in its own transaction with a pre-flight check (state matches expectations) and post-batch integrity check (4 invariants + row-count delta). Any failure → TX rolls back, batch reports STOP, no further batches run.

| Batch | What it does | Source bucket(s) | Row delta | File |
|---|---|---|---:|---|
| **1** | INSERT 114 missing intermediate containers | n/a | **+114** | `migrations/2026-05-19-lists-batch-1-create-containers.sql` ✓ ready |
| **2** | UPDATE 334 INTRA_REALM atoms (new id, path, path_parts, depth) | INTRA_REALM | 0 | held — generated after Step-1 go |
| **3** | UPDATE 35 CROSS_REALM atoms (+ new realm_id, realm_name) | CROSS_REALM | 0 | held |
| **4** | UPDATE 68 IMPORT_REALIZE atoms (repathed → become container shells) | IMPORT_REALIZE | 0 | held |
| **5** | DELETE 31 DISSOLVE_CONTAINER atoms — runs after Step 6 adjudication and only if descendants count is 0 | DISSOLVE_CONTAINER | -31 | held |

Total writes: 114 inserts + 437 updates + 31 deletes (assuming Step-5 verifies clean drain) + the dissolves from Step 3 (gate ahead). Cumulative row delta after the complete sequence (Step-1 through Step-5): +114 −31 = **+83**, with all 437 source ids/paths renamed in place.

### Backup approach
`shared/ops/backup-preflight.ps1` does not exist on this repo yet (CLAUDE.md describes it but the path is absent). Substitute: **before Batch 2 runs, snapshot the atoms table** via `CREATE TABLE atoms_backup_2026_05_19 AS TABLE atoms` so a TRUNCATE+INSERT restore is one command if anything cascades wrong. Rollback for Batch 1 alone is trivial (`DELETE FROM atoms WHERE id IN (<114 new container ids>)`) since it's pure inserts; the snapshot kicks in for Batches 2–5.

After Batch 5 completes cleanly, the snapshot stays in place for 30 days, then drops.

### Integrity invariants (run after every batch)
Identical to the spec's deep-read checks plus a row-count delta. The exact SQL is in `migrations/2026-05-19-lists-batch-1-create-containers.sql`; repeats verbatim in each subsequent batch.

1. **Row-count delta** matches the batch's expected delta (e.g. +114 for Batch 1).
2. **0 leaf-with-children**: no atom with `is_leaf=true` has any descendant.
3. **0 depth-mismatch**: every atom has `depth = array_length(path_parts, 1)`.
4. **0 skipped-level**: every atom at depth N≥2 has a parent atom whose path equals the first N-1 path-parts joined.
5. **0 dup-id**: PK guarantees this but verified anyway.

Any check fails → `RAISE EXCEPTION` rolls back the TX. One-line report per batch as ORDERS specifies.

---

## 5. Batch 1 SQL — ready for review

**File:** `shared/canon/taxonomy/migrations/2026-05-19-lists-batch-1-create-containers.sql` (41 KB · 114 INSERTs + integrity checks)

**What it does:** Creates the 114 missing intermediate containers needed as parents for the 437 atom moves in Batches 2–4. Each container row:
- `type='event'` (matches monoculture)
- `kettle='Accepted'` (matches dominant value)
- `is_leaf=false`
- Empty `theme_tags` / `realm_tags` / `pillar_tags` / `skin_tags`
- Empty `meta='{}'::jsonb`
- `created_at = updated_at = now()`

**Shape of the new containers**, by depth:
- Depth 3: 32 (e.g. `Culture / Literature / Books`, `Society / Linguistics / Phonetics`)
- Depth 4: 41
- Depth 5: 25
- Depth 6: 13
- Depth 7: 3

**First 5 lines as a sample:**
```
('culture-games-tabletop-games', 'Tabletop games', 'Culture / Games / Tabletop games', ARRAY['Culture','Games','Tabletop games']::text[], 'culture', 'Culture', 3, 'event', 'Accepted', false, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, now(), now())
('culture-gastronomy-materials', 'Materials', 'Culture / Gastronomy / Materials', ARRAY['Culture','Gastronomy','Materials']::text[], 'culture', 'Culture', 3, 'event', 'Accepted', false, …)
('culture-literature-books', 'Books', 'Culture / Literature / Books', ARRAY['Culture','Literature','Books']::text[], 'culture', 'Culture', 3, …)
('culture-literature-electronic-literature', 'Electronic literature', 'Culture / Literature / Electronic literature', ARRAY['Culture','Literature','Electronic literature']::text[], …)
('culture-literature-fiction-comics', 'Comics', 'Culture / Literature / Fiction / Comics', ARRAY['Culture','Literature','Fiction','Comics']::text[], …)
```

The complete list of 114 paths is in the SQL file; structure is uniform.

**Rollback for Batch 1 alone:**
```sql
DELETE FROM atoms WHERE id IN (<114 ids — easily extracted from .tmp-lists/_path_check.json>);
```

---

## 6. What I need from Butch at this checkpoint

1. **Approve the 437-not-448 working set** (or push back on any of the 11 reclassifications in §1a).
2. **Confirm lens parking** (78 atoms wait for mechanism — accepted via ORDERS Step 2, just confirming).
3. **`go` on Batch 1** to insert the 114 containers. On go, I:
   - Apply Batch 1 via Supabase MCP `apply_migration`.
   - Generate Batches 2/3/4 SQL.
   - Run each in sequence with integrity check per ORDERS.
   - Report one line per batch.
   - Stop at the next gate (Step 3 pre-DELETE go).

**Until you say go on Batch 1, no DB mutations.** The SQL file is on disk for inspection but not applied.

---

## 7. Working files

Throwaway scratch:
- `.tmp-lists/_all.json` · 606-atom dump
- `.tmp-lists/_all_ids.json` · all 4,897 ids+paths
- `.tmp-lists/_moves.json` · 437 planned moves
- `.tmp-lists/_path_check.json` · 114 missing containers + integrity verification
- `.tmp-lists/_collisions.json` · post-reclassification (clean)
- `.tmp-lists/classify.cjs` · classifier with 11 collision-driven dissolves applied

Canon artifacts (this pass):
- `shared/canon/taxonomy/lists-disposition-table.csv` — 606 rows · live truth
- `shared/canon/taxonomy/lists-disposition-summary.md` — corrected (43 not 25)
- `shared/canon/taxonomy/dissolve-row-dump.md` — 109 atoms · empty notes/meta · safe to dissolve
- `shared/canon/taxonomy/adjudication-brief.md` — 14 atoms · per-atom call requested
- `shared/canon/taxonomy/lens-mechanism-status.md` — not-live verdict
- `shared/canon/taxonomy/lists-migration-plan.md` — this document
- `shared/canon/taxonomy/migrations/2026-05-19-lists-batch-1-create-containers.sql` — Batch 1
