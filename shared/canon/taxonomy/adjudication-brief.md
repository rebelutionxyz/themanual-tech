# Lists Disposition — §10 Adjudication Brief

**Date:** 2026-05-19 · **For:** Butch — per-atom call on the 14 ADJUDICATE rows.
Companion to `lists-disposition-table.csv` and `lists-disposition-summary.md` (§4).

Format: each entry — current id, name, path · why it's adjudicated · Code's two best options · recommendation. Mark each with `KEEP` (with target) or `DISSOLVE` (with reason), or write in a third option.

**Verified before writing:** all 14 atoms have empty `note` and empty `meta` (same pure-shell pattern as the dissolve set). No prose at risk.

---

## Group A — DSM versioning (1)

### A1. `health-lists-dsm-iv-codes`
- **Path:** `Health / Lists / DSM-IV codes`
- **Why adjudicated:** DSM-IV was superseded by DSM-5 in 2013. Keeping a "DSM-IV codes" atom in 2026 is anachronistic.
- **Option 1 (Code rec):** **KEEP** → `Health / Mental health / Diagnostic frameworks / DSM-5 codes`. Rename "DSM-IV codes" → "DSM-5 codes" and re-source against the current DSM. Treat as a forward-looking reference. The old DSM-IV ↔ DSM-5 crosswalk can be a secondary atom if anyone cares.
- **Option 2:** **KEEP HISTORICAL** → `Health / Mental health / Diagnostic frameworks / DSM-IV codes (historical)`. Keep as historical reference; add a separate DSM-5 atom for current use.
- **Option 3:** **DISSOLVE** — no canonical home, just delete.
- **Recommendation:** **Option 1**. The Wikipedia-import shell has no DSM-IV-specific content to preserve; the slot is a label that should track the current DSM.

---

## Group B — Wikipedia outline / index pages (6)

These are "list of topics in X" pages that overlap an already-real L2 or L3 branch. Spec §10 named them as borderline because they sit between the §6 hard-dissolves and the keep-it cases.

For each, the choice is binary: DISSOLVE (as the spec did for the §6 set) or KEEP as a thin index branch alongside the real content.

### B1. `math-lists-basic-mathematics`
- **Path:** `Math / Lists / Basic mathematics`
- **Why adjudicated:** "Basic mathematics" is a Wikipedia outline of K-12-level math topics — every concept it points at already exists under `Math / Branches of mathematics / *` or `Math / Concepts / *`.
- **Option 1 (Code rec):** **DISSOLVE**. Matches the §6 pattern.
- **Option 2:** **KEEP** as `Math / Concepts / Basic mathematics` — a thin entry-level index for new Bees.
- **Recommendation:** Dissolve unless you want a deliberate "starter index" branch in Math.

### B2. `society-lists-civics-topics`
- **Path:** `Society / Lists / Civics topics`
- **Why adjudicated:** Civics outline — overlaps `Society / Government / *` and `Justice / Patterns / *`.
- **Option 1 (Code rec):** **KEEP** → `Society / Government / Civics`. Civics is a distinct enough concept (citizen participation in government) to deserve its own atom, distinct from "Government" the institutional category.
- **Option 2:** **DISSOLVE**.
- **Recommendation:** Keep. Civics is the closest thing to a Sovereign-Bee-facing pedagogy concept The Manual carries today.

### B3. `society-lists-green-topics`
- **Path:** `Society / Lists / Green topics`
- **Why adjudicated:** Environmentalism outline. Overlaps `Human activities / Environmental impact / *` heavily.
- **Option 1 (Code rec):** **DISSOLVE**. The relevant content lives at `Human activities / Environmental impact` (L2) and `Society / Social movements / Environmental movements` — "Green topics" is a third pointer with nothing distinctive.
- **Option 2:** **KEEP** → `Society / Social movements / Environmentalism` as a thin label.
- **Recommendation:** Dissolve.

### B4. `society-lists-phonetics-topics`
- **Path:** `Society / Lists / Phonetics topics`
- **Why adjudicated:** Phonetics outline. Pairs with `society-lists-consonants` and `society-lists-vowels-table` (both INTRA_REALM to `Society / Linguistics / Phonetics / *`).
- **Option 1 (Code rec):** **KEEP** → `Society / Linguistics / Phonetics` as a real L3 branch (parent of consonants + vowels + future content). The branch needs to exist anyway for the two consonant/vowel children to land somewhere.
- **Option 2:** **DISSOLVE** — let consonants and vowels live as direct children of `Society / Linguistics`.
- **Recommendation:** Keep as the L3 container (not as a leaf "topics" page). Effectively this is INTRA_REALM with a renamed target — "topics" → just "Phonetics".

### B5. `science-lists-list-of-sciences`
- **Path:** `Science / Lists / List of sciences`
- **Why adjudicated:** Pure index — lists every Science L2 ("biology, chemistry, physics, …").
- **Option 1 (Code rec):** **DISSOLVE**. Real Science L2 list lives at the Science realm itself.
- **Option 2:** **KEEP** → `Science / Branches index` (thin).
- **Recommendation:** Dissolve.

### B6. `philosophy-lists-history-of-western-philosophy-list`
- **Path:** `Philosophy / Lists / History of Western Philosophy list`
- **Why adjudicated:** Wikipedia outline of Russell's *History of Western Philosophy* table-of-contents.
- **Option 1 (Code rec):** **DISSOLVE**. Russell-specific outline; the topics live at `Philosophy / By period / *` + `Philosophy / Schools / Western philosophy / *`.
- **Option 2:** **KEEP** → `History / History of fields / History of philosophy / Russell's "History of Western Philosophy"` as a reception-history atom (Russell-the-book, not the topics within it).
- **Recommendation:** Dissolve. If a reception-history atom on the Russell book is wanted later, it can be created cleanly under History — no need to keep this Wikipedia shell.

---

## Group C — Trivia-class lists (5)

Spec §10 assumed "keep & rehome" per its kettle/Discovery Ladder rationale. Code agrees with the spec assumption but wanted explicit confirmation since these are the rows most likely to draw a "why is this in The Manual?" reaction. **If you confirm Group C as a class, I'll route all 5 as INTRA_REALM and stop bringing each one back.**

| id | Proposed target | Note |
|---|---|---|
| `self-lists-bow-tie-wearers` | `Self / Personality / Sartorial markers / Bow tie wearers` | Sartorial-curiosity class |
| `self-lists-selfie-related-injuries-and-deaths` | `Self / Person / Modern-era curiosities / Selfie-related injuries and deaths` | Phone-era trivia |
| `self-lists-unusual-deaths` | `Self / Person / Unusual deaths` | Classic curiosity-list class |
| `society-lists-us-presidents-with-facial-hair` | `Society / Government / United States / Presidents / Curiosities / Facial hair` | US-specific trivia |
| `religion-lists-sexually-active-popes` | `Religion / Religious roles / Popes / Curiosities / Sexually active popes` | Catholic-history trivia |

> **Code recommendation on Group C: confirm as a class. All five → INTRA_REALM, with the targets above.** The kettle / Discovery Ladder is the right enforcement mechanism for "is this worth keeping" at the atom level — and once the spine is moving continuously, the kettle is the only honest answer to "low-signal but cited" anyway. Deletion is not a quality tool.

---

## Group D — Domain-ambiguous singletons (2)

### D1. `history-lists-wobbly-lingo`
- **Path:** `History / Lists / Wobbly lingo`
- **Why adjudicated:** "Wobbly" = Industrial Workers of the World (IWW) — a labor-history vocabulary glossary. Niche; could route to Society/Linguistics (vocab) or Society/Social movements/Labor (movement-specific reference) or stay in History.
- **Option 1 (Code rec):** **CROSS_REALM** → `Society / Social movements / Labor / IWW / Wobbly lingo`. Movement-specific vocabulary belongs with the movement, not with general linguistics or with the History bucket.
- **Option 2:** Route to `Society / Linguistics / Sociolects / Wobbly lingo`.
- **Option 3:** Dissolve (too niche).
- **Recommendation:** Option 1.

### D2. `human-activities-lists-spin-offs`
- **Path:** `Human activities / Lists / Spin-offs`
- **Why adjudicated:** Conceptually broader than Culture's TV-specific `…/Television programs / Spin-off shows`. Could mean: (a) corporate spin-offs (Society/Economy and business), (b) fictional spin-offs (Culture/Mass media), (c) general concept of "spin-off."
- **Option 1 (Code rec):** **DISSOLVE** — the underlying concept-of-spin-off lives in two distinct domain atoms (`Society / Economy and business / Corporate spin-offs` + `Culture / Mass media / Spin-off shows`). The Wikipedia "Spin-offs" page is a mixed bag; splitting > keeping a generic atom.
- **Option 2:** **KEEP** → `Society / Society concepts / Spin-offs` as a meta-concept atom that points at both domain instances.
- **Recommendation:** Option 1 dissolve. If the meta-concept atom ever becomes useful, create it cleanly later.

---

## Summary — what I need from you

For the **6 binary outline calls (B1-B6)**, **2 domain-ambiguous (D1-D2)**, and **1 DSM-versioning (A1)** = 9 individual calls.

For the **5 trivia-class (Group C)** — confirm as a class with the targets above? Then I'll stop surfacing trivia atoms case-by-case.

| Atom | Code's recommendation |
|---|---|
| A1 DSM-IV codes | **KEEP** as DSM-5 codes (rename + re-source) |
| B1 Basic mathematics | **DISSOLVE** |
| B2 Civics topics | **KEEP** as `Society / Government / Civics` |
| B3 Green topics | **DISSOLVE** |
| B4 Phonetics topics | **KEEP** as `Society / Linguistics / Phonetics` (the L3 container) |
| B5 List of sciences | **DISSOLVE** |
| B6 History of Western Philosophy list | **DISSOLVE** |
| C × 5 | **KEEP as a class** with targets above |
| D1 Wobbly lingo | **CROSS_REALM** → Society / Social movements / Labor / IWW |
| D2 Spin-offs | **DISSOLVE** |

**If you go all-Code-recs**: 5 dissolve · 4 keep · 5 keep (Group C class) · 1 cross-realm = 9 keep + 5 dissolve out of 14. Net adds: 5 to the dissolve list (35 → 40 mechanism-independent), 9 to the non-destructive migration set (448 → 457).

Drop a quick yes/no/edit on each row and I'll fold the results into the migration plan.
