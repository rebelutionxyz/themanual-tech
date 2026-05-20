# Lists Disposition — Summary (Step 1)

**Date:** 2026-05-19 · **Status:** classification complete, ratification gate ahead
**Companion artifact:** `lists-disposition-table.csv` (606 rows, one per Lists atom)
**Sources:** spec at session top + live read of production `atoms` table (project `anxmqiehpyznifqgskzc`)
**Step 1 of §9.** No mutations performed. Steps 2–6 of §9 are blocked on this document.

---

## 1. Headline numbers

- **Total atoms in the spine (live):** 4,897 — the spec's "4,899" and CLAUDE.md's "4,860" are both stale; the live `atoms` table is the truth.
- **Atoms in `Lists` drawers:** **606** ✓ matches spec §1.
- **Per-realm shape:** matches spec §2 exactly — Culture 228 (nested), Science 89 (structured), 289 flat across the other eleven (Society 87, History 51, Tech 50, Religion 24, Human activities 19, Self 16, Philosophy 13, Math 11, Health 10, Justice 7, Reference 1).

## 2. Bucket counts (all 606 placed)

| Bucket | Count | What it means |
|---|---:|---|
| `INTRA_REALM` | 341 | Repath to a real branch within the same realm. Slug regenerates. |
| `DISSOLVE` | 78 | Delete. **Destructive — Butch ratifies before any delete runs.** |
| `IMPORT_REALIZE` | 70 | Becomes a real container; members imported later via the entity-import pass. |
| `CROSS_REALM` | 37 | Repath to a different realm (members' domain wins). |
| `LENS` | 35 | Slicing axis becomes a facet. **Gated on §12 lens mechanism being live.** |
| `DISSOLVE_CONTAINER` | 31 | The `Lists` container nodes themselves — delete after their members drain. |
| `ADJUDICATE` | 14 | Code could not bucket confidently — surfaces below in §6. |
| **Total** | **606** | |

The 31 `DISSOLVE_CONTAINER` bucket is mechanical (every `Lists` parent node has to go once empty), so the operationally interesting destructive set is `DISSOLVE` (78) + the 31 containers = **109 atom deletions** behind the ratification gate, plus whatever the 14 adjudications resolve to.

## 3. §6 destructive list (Butch ratification required)

Spec §6 named ~12 hard dissolves. Code's classification turned up **78 atoms** in `DISSOLVE` after working all 606. The breakdown:

### 3a. §6 spec-named hard dissolves (12)
- `philosophy-lists-aesthetics-topics-list` · `philosophy-lists-epistemology-topics-list` · `philosophy-lists-ethics-topics-list` · `philosophy-lists-logic-topics-list` · `philosophy-lists-metaphysics-topics-list` · `philosophy-lists-philosophy-topics-list` — six Philosophy outline pages; real branches exist under `Philosophy / Branches`.
- `math-lists-mathematics-lists-meta` — list-of-math-lists.
- `society-lists-nlp-related-articles` — Wikipedia article-index.
- `tech-lists-programming-languages-list-alphabetical` · `tech-lists-programming-languages-list-categorical` · `tech-lists-programming-languages-list-chronological` · `tech-lists-programming-languages-list-generational` — four sort-pages; the underlying set of programming languages moves to IMPORT_REALIZE as one branch.

### 3b. Cross-drawer / cross-realm dups Code surfaced (16)
These are real atoms whose actual home already exists elsewhere; the Lists copy is a redundant pointer.
- `self-lists-inventors-killed-by-their-own-inventions` (called out in §5 — kept the History copy).
- `human-activities-lists-environmental-issues` + `society-lists-environmental-issues` — both dissolve; real home is the `Human activities / Environmental impact` L2 itself.
- `human-activities-lists-games` → real `Culture / Games` L2.
- `human-activities-lists-languages` → real `Society / Linguistics / Languages` (which itself becomes IMPORT_REALIZE per ISO 639).
- `human-activities-lists-martial-arts` → real `Culture / Sports / Combat sports / Martial arts`.
- `human-activities-lists-musical-instruments` + `culture-performing-arts-music-lists-musical-instruments` → real `Culture / Performing arts / Music / Musical instruments`.
- `human-activities-lists-newspapers` → real `Culture / Mass media / Print media / Newspapers`.
- `human-activities-lists-songs` → covered by `Culture / Performing arts / Music / Songs and compositions`.
- `human-activities-lists-weight-training-exercises` → real `Health / Physical exercise / Weight training exercises`.
- `tech-lists-digital-library-projects` → real `Reference / Reference of organizations / Libraries / Digital library projects` (which itself moves to Society under §13).
- `tech-lists-emerging-technology-list` → real `Tech / Emerging technologies` L2.
- `science-lists-earth-sciences-lists-earthquakes-list` → real `Science / Earth science / Geology / Earthquakes` (the spec's §11 cross-realm dup also kept Hist/Lists/Earthquakes as the historical-events sibling).
- `science-lists-earth-sciences-lists-minerals-list` → real `Science / Earth science / Geology / Minerals`.
- `science-lists-human-anatomy` → real `Science / Biology / Branches of biology / Anatomy` + `Health / Health sciences / Anatomy`.
- `religion-lists-hinduism-lists` + `religion-lists-mormonism-list` + `religion-lists-major-religious-groups` + `religion-lists-religions-and-spiritual-traditions` — meta-navigation; real homes under `Religion / Major religions`.
- `math-lists-systems-theory` → real `Society / Social sciences / Systems theory`.
- `society-lists-strikes-list` — cross-drawer dup with `History / Lists / Strikes`; both move to `Society / Social movements / Strikes`.
- `philosophy-lists-philosophies-list` — list-of-philosophies meta page.

### 3c. Lens-induced dissolves (43 — was 25; corrected 2026-05-19 during dissolve-row-dump pass)
Per-country / per-language / per-broadcaster / per-genre / per-decade leaves under TV and Film. The `by-X` parent becomes a LENS; the per-X children collapse into it.
- TV channels per-country (6): Australia, Canada, Denmark, Ireland, United Kingdom, United States.
- TV channels per-language (6): French, German, Greek, Italian, Spanish, Tamil.
- TV programs per-broadcaster (11): ABC, ANT1, BBC, Cartoon Network, CBS, ERT, Fox, MEGA Channel, MTV, NBC, UPN.
- TV programs per-characters (1): Muppets.
- TV programs per-program (1): Invader Zim.
- Film by-genre (8): Cult, Fantasy, Horror, Musicals, Noir, Science fiction, War, Westerns.
- Film by-year (10): 1920s through 2010s.

Reference for each is in the CSV. Per-country TV channels in particular are cross-realm dups with `Geography / Countries / *` (already exists for all 6) — cross-link via `realm_tags`.

## 4. §10 adjudication queue (14)

Code could not bucket these confidently. **Each needs a Butch call before disposition.** All are tagged `ADJUDICATE` in the CSV.

### From the spec's named §10 list
1. **`health-lists-dsm-iv-codes`** — DSM-IV is superseded by DSM-5. Rename + refresh on rehome to `Health / Mental health / DSM-5 codes`, or keep both as historical reference?
2. **Borderline outline pages — dissolve or thin-rehome?**
   - `math-lists-basic-mathematics`
   - `society-lists-civics-topics`
   - `society-lists-green-topics`
   - `society-lists-phonetics-topics`
   - `science-lists-list-of-sciences`
   - `philosophy-lists-history-of-western-philosophy-list`
3. **Trivia-class — spec assumes keep & rehome; confirm.**
   - `self-lists-bow-tie-wearers`
   - `society-lists-us-presidents-with-facial-hair`
   - `religion-lists-sexually-active-popes`
   - `self-lists-selfie-related-injuries-and-deaths`
   - `self-lists-unusual-deaths`
4. **`history-lists-wobbly-lingo`** — niche IWW labor-history glossary. Route to `Society / Linguistics`, `Society / Social movements / Labor`, or dissolve?

### Code-surfaced extras
1. **`human-activities-lists-spin-offs`** — conceptually broader (corporate spinoffs, fictional spinoffs) than Culture's `Television programs / Spin-off shows`. Surface a target.

## 5. §11 companion pass — cross-realm dup audit

The dedup query found **116+ same-name atoms across 2+ realms** — far more than the spec's two named cases. Highlights confirmed in production:

### Philosophy ↔ Religion (Philosophical positions / Belief systems)
Spec named 6; query confirmed **9**:
- agnosticism, atheism, deism, monism, pantheism, theism (Philosophy / Philosophical positions ↔ Religion / Belief systems)
- determinism, humanism, objectivism (Philosophy / Schools / Western philosophy ↔ Religion / Belief systems)

Spec disposition (drop Philosophy dups, keep Religion as canonical) stands; widen to all 9. The §11 `Philosophy / Philosophical positions` L2 still has 4 non-dup atoms (Dualism, Pluralism, Feminist philosophy, Futurology) which route per spec.

### Philosophy ↔ Society (Political philosophy)
The name-dedup query did **not** turn up the spec's named 8 — names diverge between Philosophy's doctrine-name and Society's `(movement)` suffix. Cannot confirm against the spec without a Butch call. **§10 adjudication added:** "Communism (doctrine) vs Communism (movement) — same atom or distinct?"

### Code-surfaced (worth confirming before Step 3 migrations)
- **`Critical theory`** — 3-way: `Culture / Literature`, `Philosophy / Schools / Western philosophy`, `Society / Social sciences`. Likely home: Philosophy (theory) + cross-link to Society + Culture.
- **`Newspapers`** — 3-way: Culture, Human activities/Lists (DISSOLVE per §3b), Reference (§13 dissolve target).
- **`Anatomy`** — Health vs Science/Biology + Science/Lists/Human-anatomy (DISSOLVE). Pick one canonical home.
- **`Logic`** — `Math / Logic` (L2 ✓) vs `Philosophy / Branches / Logic` (L3 ✓). Spec leaves this alone but both exist; flagging for visibility.
- **8 same-name math↔philosophy entries** (algorithms, deductive reasoning, fallacies, history of logic, inductive reasoning, philosophy of logic, philosophy of mathematics, theoretical computer science / theoretical physics) — these may all be intentional cross-realm representations. **Surface only; not action items for this pass.**

Full dedup table available on request; not embedded here to keep this document load-able.

## 6. §12 lens-mechanism gate

35 atoms classified `LENS`. Spec §12 says "confirm lens mechanism is live before executing." Step 1 records the intent; **Step 3 cannot execute LENS conversions until that mechanism exists and the precedent (History/By-region, Geography/Groupings) is reachable in production.**

Recommend: confirm lens-mechanism status as a precondition to Step 3. If not live, LENS conversions park; everything else can proceed.

## 7. §5 type-defect fix

All 606 atoms are typed `event` in production (verified via per-realm aggregate). The CSV proposes a `proposed_new_type` per atom — covers `entity_list`, `concept_list`, `role_list`, `organization_list`, `event_list`, `award_list`, `ranked_list`, `reference`, `genre_list`, `species_list`, `entity_container`, etc. The broader `type`-vocabulary audit is out of scope; Step 3 should apply per-atom from the CSV.

## 8. Empty-container note

Spec §5 calls out three empty containers to leave in place: `Geography / Cities`, `Religion / Sacred texts`, `Tech / Cryptocurrency / Blockchains`. None of these are in the 606 (none have `Lists` in their path). No action this pass.

## 9. Things this pass changed about my read of the spec

1. **DISSOLVE is 6x larger than §6 implied** (78 vs ~12). Cross-drawer / cross-realm dups account for most of the growth; lens-induced collapses account for ~25 more. Worth re-baselining the destructive-blast estimate before Step 3.
2. **Cross-realm dedup is much bigger than §11 implied** (116+ name-collisions vs the 2 named cases). Most are intentional (Logic, Math↔Philosophy concepts), but a handful (Critical theory, Anatomy, Newspapers) likely want consolidation. Not blocking step 3 for the Lists pass — flagging.
3. **Three counts in canon are stale:** spec says 4,899 atoms, CLAUDE.md says 4,860, live = 4,897. Worth a follow-up.

## 10. Ratification gate (what I'm asking for)

Per spec §9 step 2 — **wait for ratification on all deletes**. Specifically, I need a call on:

1. The 12 §6 spec-named hard dissolves → proceed as classified.
2. The 16 cross-drawer / cross-realm dups in §3b → proceed as classified (keep canonical, drop Lists copy + cross-link via `realm_tags`).
3. The 43 lens-induced dissolves in §3c → proceed **only if** §12 lens mechanism is live; otherwise park.
4. The 31 `DISSOLVE_CONTAINER` Lists-parent deletions → these run last (after members drain) and only if members were successfully repathed.
5. The 14 §10 `ADJUDICATE` atoms → I need a per-atom disposition or a blanket rule ("dissolve all trivia-class," "keep all," etc.) before Step 3.

Once those are answered, Step 3 (LENS conversions → CROSS_REALM repaths → INTRA_REALM repaths, with the §10 + §11 + §13 companion passes interleaved per the spec) can begin. Per §3 of the spec, each migration is named, shown, verified before apply.

## 11. Artifacts

- `shared/canon/taxonomy/lists-disposition-table.csv` — 606 rows; ~145 KB. CSV columns:
  - `id` · `realm` · `depth` · `current_type` · `is_leaf` · `current_path` · `bucket` · `target_path` · `target_realm` · `proposed_new_type` · `import_source` · `notes`
- `shared/canon/taxonomy/lists-disposition-summary.md` — this document.

Tmp working files under `.tmp-lists/` are throwaway; safe to delete after ratification.
