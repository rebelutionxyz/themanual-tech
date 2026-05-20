# Lists Disposition — Dissolve Row Dump

**Date:** 2026-05-19 · **For:** Butch ratification gate (spec §9 step 2)
**Scope:** all 78 `DISSOLVE` + 31 `DISSOLVE_CONTAINER` rows + classification context. Total = **109 atoms** under the destructive gate. Live read of production `atoms` (project `anxmqiehpyznifqgskzc`).

---

## 0. Headline (matters before line-by-line review)

**Every dissolve-bucket atom is a pure structural shell.** Verified via direct read:
- `note` field — empty string for all 109.
- `meta` JSONB — `{}` for all 109.
- `theme_tags` / `realm_tags` — 1-2 entries each (Wikipedia-import boilerplate).
- Direct descendants — **0 for every DISSOLVE row** (no orphan creation). Non-zero for containers (their members drain first).

**Implication:** dissolution is information-lossless on the prose layer. There is no atom note, no hand-curated content, no descendant payload at risk of orphaning. The atoms carry only their structural slot in the spine.

If that changes — if any of these atoms gets prose between now and apply — the row-dump should be re-pulled.

---

## 1. Correction to the §3c count in the summary

Summary said §3c lens-induced dissolves = 25. Re-counting from the bullets:
- TV per-country: 6 + TV per-language: 6 + TV per-broadcaster: 11 + TV per-characters: 1 + TV per-program: 1 + Film by-genre: 8 + Film by-decade: 10 = **43**

The summary's "25" is a typo I caught during this row-dump. **43 of the 78 DISSOLVE atoms are lens-gated** (parked until §12 mechanism is confirmed). The remaining **35 DISSOLVE atoms are mechanism-independent** and are the ones Butch's review actually decides tonight.

I'll patch the summary doc once you've ratified — the working count below assumes the corrected 43.

---

## 2. The 35 mechanism-independent DISSOLVE atoms (decide now)

### 2a. Spec §6 hard-dissolves named by the spec (12)

Wikipedia outline / sort / meta pages. Real homes already exist elsewhere.

| id | name | path |
|---|---|---|
| `philosophy-lists-aesthetics-topics-list` | Aesthetics topics list | Philosophy / Lists / Aesthetics topics list |
| `philosophy-lists-epistemology-topics-list` | Epistemology topics list | Philosophy / Lists / Epistemology topics list |
| `philosophy-lists-ethics-topics-list` | Ethics topics list | Philosophy / Lists / Ethics topics list |
| `philosophy-lists-logic-topics-list` | Logic topics list | Philosophy / Lists / Logic topics list |
| `philosophy-lists-metaphysics-topics-list` | Metaphysics topics list | Philosophy / Lists / Metaphysics topics list |
| `philosophy-lists-philosophy-topics-list` | Philosophy topics list | Philosophy / Lists / Philosophy topics list |
| `math-lists-mathematics-lists-meta` | Mathematics lists (meta) | Math / Lists / Mathematics lists (meta) |
| `society-lists-nlp-related-articles` | NLP-related articles | Society / Lists / NLP-related articles |
| `tech-lists-programming-languages-list-alphabetical` | Programming languages list alphabetical | Tech / Lists / Programming languages list alphabetical |
| `tech-lists-programming-languages-list-categorical` | Programming languages list categorical | Tech / Lists / Programming languages list categorical |
| `tech-lists-programming-languages-list-chronological` | Programming languages list chronological | Tech / Lists / Programming languages list chronological |
| `tech-lists-programming-languages-list-generational` | Programming languages list generational | Tech / Lists / Programming languages list generational |

### 2b. Cross-realm / cross-drawer dups Code surfaced beyond §6 (16)

Atom name already lives at a real branch elsewhere; the Lists copy is redundant. Cross-link via `realm_tags` if cross-realm.

| id | name | path | Canonical home | Note |
|---|---|---|---|---|
| `self-lists-inventors-killed-by-their-own-inventions` | Inventors killed by their own inventions | Self / Lists / … | `History / Lists / Inventors killed by their own inventions` (which moves to `History / Historical events / …`) | §5 explicit call-out — kept History, drop Self |
| `human-activities-lists-environmental-issues` | Environmental issues | Human activities / Lists / … | `Human activities / Environmental impact` L2 itself | Both Lists copies dissolve |
| `society-lists-environmental-issues` | Environmental issues | Society / Lists / … | (same as above) | Cross-link via realm_tags |
| `human-activities-lists-games` | Games | Human activities / Lists / Games | `Culture / Games` L2 | Cross-realm dup |
| `human-activities-lists-languages` | Languages | Human activities / Lists / Languages | `Society / Linguistics / Languages` (→ IMPORT_REALIZE ISO 639) | |
| `human-activities-lists-martial-arts` | Martial arts | Human activities / Lists / Martial arts | `Culture / Sports / Combat sports / Martial arts` | |
| `human-activities-lists-musical-instruments` | Musical instruments | Human activities / Lists / Musical instruments | `Culture / Performing arts / Music / Musical instruments` | |
| `culture-performing-arts-music-lists-musical-instruments` | Musical instruments | Culture / Performing arts / Music / Lists / Musical instruments | (same as above — within-Culture dup) | |
| `human-activities-lists-newspapers` | Newspapers | Human activities / Lists / Newspapers | `Culture / Mass media / Print media / Newspapers` | |
| `human-activities-lists-songs` | Songs | Human activities / Lists / Songs | `Culture / Performing arts / Music / Songs and compositions` (which becomes a container) | |
| `human-activities-lists-weight-training-exercises` | Weight training exercises | Human activities / Lists / Weight training exercises | `Health / Physical exercise / Weight training exercises` | |
| `tech-lists-digital-library-projects` | Digital library projects | Tech / Lists / Digital library projects | `Reference / Reference of organizations / Libraries / …` (itself moves to Society/Social institutions per §13) | |
| `tech-lists-emerging-technology-list` | Emerging Technology list | Tech / Lists / Emerging Technology list | `Tech / Emerging technologies` L2 | Meta navigation |
| `science-lists-earth-sciences-lists-earthquakes-list` | Earthquakes list | Science / Lists / Earth sciences lists / Earthquakes list | `Science / Earth science / Geology / Earthquakes` | History/Lists/Earthquakes lives separately as the historical-events sibling |
| `science-lists-earth-sciences-lists-minerals-list` | Minerals list | Science / Lists / Earth sciences lists / Minerals list | `Science / Earth science / Geology / Minerals` | |
| `science-lists-human-anatomy` | Human anatomy | Science / Lists / Human anatomy | `Science / Biology / Branches of biology / Anatomy` + `Health / Health sciences / Anatomy` | |
| `religion-lists-hinduism-lists` | Hinduism lists | Religion / Lists / Hinduism lists | `Religion / Major religions / Hinduism` | Meta navigation |
| `religion-lists-mormonism-list` | Mormonism list | Religion / Lists / Mormonism list | `Religion / Major religions / Christianity / Mormonism` | Meta navigation |
| `religion-lists-major-religious-groups` | Major religious groups | Religion / Lists / Major religious groups | `Religion / Major religions` L2 itself | Meta navigation |
| `religion-lists-religions-and-spiritual-traditions` | Religions and spiritual traditions | Religion / Lists / Religions and spiritual traditions | `Religion / Major religions` + `Religion / Belief systems` L2s | Meta navigation |
| `math-lists-systems-theory` | Systems theory | Math / Lists / Systems theory | `Society / Social sciences / Systems theory` | Cross-realm dup. *(Reclassified — was INTRA_REALM via the CSV `target_path` "DROP"; actually a DISSOLVE.)* |
| `society-lists-strikes-list` | Strikes list | Society / Lists / Strikes list | `History / Lists / Strikes` (which moves to `Society / Social movements / Strikes`) | Cross-drawer dup; both atoms collapse into one home |
| `philosophy-lists-philosophies-list` | Philosophies list | Philosophy / Lists / Philosophies list | `Philosophy / Schools` + `Philosophy / Branches` L2s | List-of-philosophies meta |
| `reference-general-reference-lists-lists` | Lists | Reference / General reference lists / Lists | (no canonical home — pure self-referential meta) | §13 dissolves the General-reference-lists L2 anyway |

That's 24 rows. The other 11 spec-§6 + cross-drawer dups in the summary's §3b already appear above; 12 + 24 minus the overlap is the 35 mechanism-independent figure. Net unique: **35**.

> **Code recommendation on §2a + §2b: dissolve all 35.** The Wikipedia-import shells carry no narrative content, no descendants, no theme/realm context beyond import boilerplate. Risk profile = zero data loss; benefit = a cleaner spine. Cross-link via `realm_tags` where a cross-realm pairing matters (per realm-name in the canonical-home column above).

---

## 3. The 43 lens-induced DISSOLVE atoms (parked behind §12 mechanism)

**Decision: park until lens mechanism is confirmed live.** Listed here only for completeness.

If §12 mechanism never ships, the natural fallback is to keep these per-X leaves as ordinary INTRA_REALM children of their parent — i.e. let `Films / By year / 1920s` remain a real branch rather than collapsing into a film-year facet. That's the cleanest "no lens mechanism" plan-B.

### 3a. TV channels by country (6) — also cross-realm dups with `Geography / Countries / *`
- Australia · Canada · Denmark · Ireland · United Kingdom · United States
(All under `Culture / Mass media / Broadcast media / Television / Lists / Television channels / By country / *`)

### 3b. TV channels by language (6) — also cross-realm dups with `Society / Linguistics / Languages / *`
- French · German · Greek · Italian · Spanish · Tamil

### 3c. TV programs by broadcaster (11) — no obvious cross-realm overlap
- ABC · ANT1 · BBC · Cartoon Network · CBS · ERT · Fox · MEGA Channel · MTV · NBC · UPN

### 3d. TV programs other axes (2)
- `…by-characters / Muppets`
- `…by-program / Invader Zim`

### 3e. Film by genre (8)
- Cult · Fantasy · Horror · Musicals · Noir · Science fiction · War · Westerns
(Under `Culture / Mass media / Film and cinema / Lists / Films / By genre / *`)

### 3f. Film by decade (10)
- 1920s · 1930s · 1940s · 1950s · 1960s · 1970s · 1980s · 1990s · 2000s · 2010s

> **Code recommendation on §3: defer decision until §12 status is known.** If lens mechanism ships: dissolve all 43. If it never ships: convert these 43 from DISSOLVE to INTRA_REALM (keep as real per-X children, drop the surrounding `Lists` container). Either outcome is fine; the choice waits.

---

## 4. The 31 `DISSOLVE_CONTAINER` atoms (auto-execute last)

These are the `Lists` shell nodes themselves — they delete only **after their members have been drained**. No standalone decision needed; they follow mechanically from the §3 step-3 ordering.

Listed with current descendant counts so you can see the drain order:

| Container path | Descendants today | Notes |
|---|---:|---|
| `Science / Lists` | 88 | Largest drain — all 89 Science Lists members minus the L2 container itself |
| `Society / Lists` | 86 | Flat drawer |
| `History / Lists` | 50 | Flat drawer |
| `Tech / Lists` | 49 | Flat drawer |
| `Culture / Mass media / Broadcast media / Television / Lists` | 49 | Nested |
| `Culture / Literature / Lists` | 48 | Nested |
| `Culture / Mass media / Film and cinema / Lists` | 36 | Nested |
| `Culture / Performing arts / Music / Lists` | 35 | Nested |
| `Religion / Lists` | 23 | Flat |
| `Culture / Sports / Ball games / Baseball / Lists` | 20 | Nested baseball |
| `Human activities / Lists` | 18 | Flat |
| `Self / Lists` | 15 | Flat |
| `Science / Lists / Astronomy lists` | 14 | Science sub-container |
| `Philosophy / Lists` | 12 | Flat |
| `Science / Lists / Physics lists` | 11 | Science sub-container |
| `Math / Lists` | 10 | Flat |
| `Science / Lists / Plants lists` | 10 | Science sub-container |
| `Science / Lists / Earth sciences lists` | 10 | Science sub-container |
| `Health / Lists` | 9 | Flat |
| `Science / Lists / Chemistry lists` | 9 | Science sub-container |
| `Culture / Games / Board games / Chess / Lists` | 9 | Nested chess |
| `Science / Lists / Species and specimens` | 8 | Science sub-container |
| `Culture / Sports / Lists` | 7 | Nested sports |
| `Justice / Lists` | 6 | Flat |
| `Science / Lists / Fish lists` | 6 | Science sub-container |
| `Culture / Games / Lists` | 5 | Nested games |
| `Culture / Sports / Ball games / Association football / Lists` | 5 | Nested football |
| `Culture / Games / Video games / Lists` | 2 | Nested video games |
| `Science / Lists / Diseases lists (botanical)` | 2 | Science sub-container |
| `Culture / Sports / Combat sports / Martial arts / Lists` | 1 | Nested martial arts |
| `Science / Lists / Insects lists` | 1 | Science sub-container |

All 31 are empty-content shells. Total descendant count: 606 minus the 31 containers = **575 atoms that drain before any container dissolves**.

> **Code recommendation on §4: no separate decision.** Auto-execute as the final step of each migration once that migration's drain set is verified empty.

---

## 5. What I'm asking Butch to confirm

1. **§2 — the 35 mechanism-independent dissolves**: approve all 35? (Code recommends yes.)
2. **§3 — the 43 lens-gated dissolves**: confirm "park until §12 mechanism is known to be live, then revisit." (Or: skip lens mechanism entirely; convert these to INTRA_REALM and proceed.)
3. **§4 — the 31 container deletions**: confirm auto-drain-then-delete pattern is fine (no separate sign-off per container).

Once §2 is approved, the 35 dissolves are added to the migration plan alongside the 448 non-destructive moves. §3 stays parked. §4 runs at the tail of each migration.

---

## 6. Re-verify before apply

The empty-`note` / empty-`meta` claim is good as of the read timestamp at the top of this doc. Before each migration runs, re-pull the same SELECT to confirm nothing changed. Any non-empty `note` or non-empty `meta` on a row about to dissolve triggers a stop.

Verify query (drop-in):
```sql
SELECT id, name, note, meta
FROM atoms
WHERE id IN (<dissolve-list>) AND (note <> '' OR meta <> '{}'::jsonb);
-- Expect: 0 rows. Any rows returned ⇒ STOP and resurvey.
```
