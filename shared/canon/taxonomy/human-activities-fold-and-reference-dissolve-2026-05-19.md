# Step 7 Maps — Human Activities Fold + Reference Dissolve

**Date:** 2026-05-19 · **For:** Code UR (Disposition Spec, Group A, Step 7) · **Target DB:** `anxmqiehpyznifqgskzc`

Two within-realm consolidations. Both are structure-only — no knowledge content is destroyed; atoms are repathed or their empty drawers removed. Code verifies no id/path collision at each target before applying, and runs the standard integrity check after each.

---

## PART 1 — Human Activities: 17 → 10 L2s

Seven L2s leave the top-level line. **Five are empty single-atom stubs** → demoted to L3 leaves. **Two are thin containers** → dissolved, their children repathed. `Construction` — a sixth empty stub — is deliberately kept as a standalone L2 (see below).

| Dissolving L2 | Operation | Atom(s) moved | New parent |
|---|---|---|---|
| Childraising | dissolve container | Babysitting, Child care | Daily living |
| Exploration | dissolve container | Space exploration, Underwater exploration | Transport and travel |
| Recycling | demote leaf | Recycling | Environmental impact |
| Firefighting | demote leaf | Firefighting | Work and occupations |
| Planning | demote leaf | Planning | Work and occupations |
| Observation | demote leaf | Observation | Daily living |
| Commemoration | demote leaf | Commemoration | Daily living |

**Operation types:**
- *demote leaf* — the L2 stub atom (is_leaf, 0 descendants) is repathed one level deeper under the new parent. Atom kept; `path` / `path_parts` / `id` / `depth (+1)` change; `is_leaf` stays true.
- *dissolve container* — the L2 container's children are repathed under the new parent (depth unchanged); the now-empty container atom is then deleted.

**Result — 10 surviving L2s:** Agriculture and food production (9) · Business and trade (23) · Communication (12) · Construction (0) · Daily living (17) · Environmental impact (28) · Transport and travel (7) · Views (19) · Work and occupations (6) · Lists (18 — out of scope here; the disposition spec handles it).

**Construction — DECIDED (2026-05-19): kept as a standalone L2.** Not demoted. `Construction` is reclassified as a deliberate import-placeholder L2 — same category as `Geography / Cities`, `Religion / Sacred texts`, `Tech / Cryptocurrency / Blockchains` — awaiting an entity-import pass (construction industry, building types, civil engineering, materials). It stays empty and untouched in this fold. The realm lands at 10 L2s; the tenth is an intentional placeholder, not fragmentation.

Note: any demoted stub can be re-promoted to L2 later if an entity-import pass gives it substantial content.

---

## PART 2 — Reference Dissolve

`Reference` keeps **Standards** (32) and **Reference works** (15) untouched. The other three L2s dissolve.

**2a · Reference of organizations (4) — clean move, lock it.**
`Reference / Reference of organizations / Libraries` and its 3 children → Society's social-institutions L2 (Code confirms the exact node name live; land at the nearest institutions node). The `Reference of organizations` L2 then dissolves.

**2b · General reference lists (11) — feed to the five-bucket classifier.**
These are Lists-shaped staging atoms. Run all 11 through the same five-bucket classifier used for the 606 Lists atoms — do not hand-route. Expected split: pure meta (`List of lists of lists`, `Lists`, `Lists of lists`) → DISSOLVE; linguistic reference (`Abbreviations`, `Etymologies`, `Common misspellings`, `Collective nouns`, `Postal codes`) → CROSS_REALM / IMPORT_REALIZE to a language/reference home; `Common misconceptions`, `Unusual articles`, `Pairs` → ADJUDICATE. The L2 dissolves once drained.

**2c · Research tools and resources (33) — feed to the five-bucket classifier.**
Also a grab-bag of pointer/list atoms. Run through the classifier. Cluster guidance:
- Digital tools (`Clients`, `IRC clients`, `News clients`, `Search engines`, `Web directories`, `Databases`, `Free software programs`, `Free online information sources`) → Tech.
- Education (`Curricula`, `Distance education`, `Universities and colleges`, `Academic disciplines`) → Society.
- Library / archive (`Archives`, `Libraries`, `Library cataloging and classification`) → Society's social-institutions L2 (with 2a).
- `Periodic table` → Science / Chemistry.
- Linguistics (`Grammar`, `Prefixes`, `Suffixes`, `Letters`, `Reading`, `Writing`) → language home.
- Pure meta (`Information`, `Knowledge`, `Indices`, `Research`, `Books`) → DISSOLVE or ADJUDICATE.

The L2 dissolves once drained.

**Result:** `Reference` = Standards + Reference works — 2 L2s, the lean reference-infrastructure realm. ~48 atoms rehomed (4 clean + 44 via classifier).

---

## Execution order

1. Part 1 Human Activities fold — after Butch's Construction call. Self-contained; can run anytime.
2. Part 2a Reference of organizations — clean move, anytime.
3. Part 2b + 2c — fold into Code's existing Lists classification run; ratification follows the same gate as the 606.
