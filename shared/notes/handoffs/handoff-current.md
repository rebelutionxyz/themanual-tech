# handoff-current.md

**Session close:** 2026-06-21
**Lane:** Claude Chat (strategy · canon · all Supabase MCP ops)
**Project:** TheMANUAL.tech / HONEYCOMB · **Supabase ref:** `anxmqiehpyznifqgskzc`
**Status:** all changes live on prod, verified. No DDL this session (all `execute_sql` DML on `public.atoms`).

---

## Current spine state (`realms.atom_count`)

| Realm | Atoms | | Realm | Atoms |
|---|---|---|---|---|
| Geography | 26,894 | | Tech | 524 |
| Society | 1,651 | | Self | 264 |
| Culture | 1,032 | | Philosophy | 225 |
| Science | 910 | | Math | 214 |
| History | 823 | | Human activities | 195 |
| Health | 781 | | Reference | 84 |
| Religion | 709 | | Justice | 0 |

**Total ≈ 34,306 atoms · 14 realms (palindrome).**
Spine build-out playbook (for future sections)
Lane & target. Chat lane runs ALL public.atoms ops via Supabase MCP (ref anxmqiehpyznifqgskzc); Code does local files + git. DML → execute_sql, DDL → apply_migration.
Atoms model (the rules that make moves safe).

Hierarchy lives entirely in path (delimiter " / "). Parent = path minus last segment. No parent_id/FK — moving or deleting a container does NOT cascade; handle children explicitly.
id is a frozen slug set once at insert: lower(replace(replace(path,' / ','-'),' ','-')). It NEVER changes on rename/move. Matching is always by path; a frozen-id/path mismatch after a rename is expected and fine.
realms.atom_count is refreshed by trigger on INSERT/DELETE only — path/depth/is_leaf UPDATEs don't change counts. realms is keyed on id (e.g. id='society').
New-atom column template: realm_id/realm_name, depth=cardinality(path_parts), type='concept' (must override the 'event' default), kettle='Accepted', is_leaf (match reality), theme_tags='{}', realm_tags='{Realm}', pillar_tags='{MANUAL}', skin_tags='{HoneyComb}', status='live', meta='{}'::jsonb.

Core SQL patterns.

Insert (auto-id):

sql  INSERT INTO atoms (id,name,path,path_parts,realm_id,realm_name,depth,type,kettle,is_leaf,theme_tags,realm_tags,pillar_tags,skin_tags,status,meta)
  SELECT lower(replace(replace(p,' / ','-'),' ','-')), n, p, string_to_array(p,' / '),
         '<realm>','<Realm>', cardinality(string_to_array(p,' / ')),'concept','Accepted',<bool>,
         '{}','{<Realm>}','{MANUAL}','{HoneyComb}','live','{}'::jsonb
  FROM (VALUES (n,p), ...) AS v(n,p);

Leaf-move (re-home leaves into a subgroup, depth +1): UPDATE path/path_parts/depth via a VALUES(name,group) join, filtered is_leaf=true (so new folders aren't caught).
Subtree-move (folder + its children): path = replace(path,'OLD PREFIX','NEW PREFIX'), rebuild path_parts, depth = depth + 1, WHERE path = node OR path LIKE node||' / %'.
Leaf→folder / rename: UPDATE name/path/path_parts (+is_leaf=false); re-path children if any. id stays frozen.
Keep batches ≤ ~70 rows (truncation risk). Escape apostrophes (''). Keep standard diacritics; drop exotic glyphs.

Procedure per realm/section.

Landscape — L2 counts (total / leaves / folders / max_depth).
Baseline integrity — run the verify block before mutating.
Skeleton — read depth 2–3 with descendant counts. Classify each branch: deep & healthy (leave it), thin/flat (build it), category-leaf (promote → folder → populate).
Structure call — organize by type, not region (a curated regional cluster only when a tradition genuinely doesn't decompose — e.g. Mithai). One canonical home per referent. Preserve curated/contested canon untouched.
Populate GLOBAL + NEUTRAL — ~10–15 members per bucket, non-Western represented in every bucket, no editorializing, sensitive/contested instances included neutrally.
Insert → verify → fix dups — resolve a real dup by disambiguating-suffix rename OR dropping the redundant copy; never alter the canonical home or the Society / Accountability subtree.
Render to confirm.

Standard verify block (swap realm id + root name):
sqlWITH h AS (SELECT * FROM atoms WHERE realm_id='<realm>')
SELECT
 (SELECT count(*) FROM h c WHERE c.depth>=2
    AND array_to_string(c.path_parts[1:cardinality(c.path_parts)-1],' / ')<>'<Root>'
    AND NOT EXISTS (SELECT 1 FROM h p WHERE p.path=array_to_string(c.path_parts[1:cardinality(c.path_parts)-1],' / '))) AS orphans,
 (SELECT count(*) FROM (SELECT 1 FROM h GROUP BY lower(name) HAVING count(*)>1) z) AS dup_groups,
 (SELECT count(*) FROM h) AS total,
 (SELECT atom_count FROM realms WHERE id='<realm>') AS realm_count;
Pass = orphans 0, every dup_group explained (accepted homonym or canon), total = realm_count.
Conventions / gotchas.

British/INN spelling. En-dashes (–) for year ranges on Wars/new branches; the Intelligence branch uses hyphens.
Accepted structural homonyms (same name, different referent) are NOT duplicates — e.g. per-country Government / By country / * nodes, Culture's Forms/Genres. Do not dedup them.
Excluded from all scans: Society / Accountability subtree.
Trivia: leaf-only is the current default (folders/all atoms become eligible later).

PENDING — Connectors / alias pass (run after everything is built out)
Cross-realm same-referent atoms currently sit under single-canonical-home + alias-table-pending. Once all realms are built, run the connectors pass:

Build the alias/connector mechanism in schema (not present yet).
Reconcile cross-realm duplicate referents to one canonical atom + connectors — master-planned cities ↔ Geography capitals; Society weapon classes ↔ Tech/Military technology; companies / universities / football clubs across realms; deity/text overlaps; etc.
Then expand trivia eligibility (folders + all atoms) across the connected graph.

Realm queue

Reference (84) — last realm to organize/build.
Justice (0) — scaffold only.
---

## This session — realm build-outs (all verified 0 orphans, dups accounted for)

### History — 357 → 823 (comprehensive global build-out)
9 L2s: Historical events 255 · Military history 116 · History of fields ~129 · Historical figures 89 · Civilizations & states 87 · Wars 66 · By region 38 · Periods 27 · Historiography & method 6. Built: Genocides folder, Pandemics & epidemics folder, Civil wars, Intelligence operations (by country), Contemporary wars, Nuclear weapons & warfare branch, Historical figures (82 across 7 categories), Civilizations era-resort, plus global build-out of thin event/military/field buckets. (Detail in transcript.)

### Culture — → 1,032
- **Gastronomy:** Beverages 5→56 · Ingredients 22→137 · Dishes normalized + **148 across 12 type buckets** (Breads & flatbreads, Soups, Stews & curries, Noodle dishes, Pasta dishes, Rice dishes, Dumplings, Salads, Sandwiches & wraps, Grilled & barbecue, Seafood dishes, Desserts) · Confectionery 9→70 (incl. Mithai folder).
- **Megaliths:** new `Culture / Visual arts / Architecture / Megalithic architecture` — 7 monument types + 14 global sites (Stonehenge, Göbekli Tepe, Carnac, Newgrange, Callanish, Ġgantija, Almendres, Menga, Nabta Playa, Nan Madol, Sacsayhuamán, Ale's Stones…).

### Religion — 419 → 709 (comprehensive)
- **Mythologies (20 traditions + 40 creatures):** 8 classical pantheons (Greek 25, Mesoamerican & Andean 22, Egyptian 19, Norse 19, Roman 17, Mesopotamian 16, Celtic 11, Slavic 11) + 12 living-religion mythologies (Hindu 18, Japanese 12, African 11, Chinese 11, Polynesian 10, Aboriginal 6, Buddhist 5, Christian 5, Islamic 5, Jewish 5, Korean 5). Deleted 9 placeholder labels.
- **Flat-dump grouping (zero deletions):** Beings → 3 groups · Belief systems → 4 groups · Concepts → 5 groups.
- **Religious roles → 4 function groups:** Clergy & ordained (incl. Popes 18 [Saint Peter → current **Leo XIV**], Patriarchs Pentarchy completed) · Monastics & ascetics · Prophets & spiritual exemplars (incl. Saints folder 14) · Mystics, shamans & folk. "Curiosities / Sexually active popes" preserved.

### Society — 1,486 → 1,651 (deep build-out, neutral/encyclopedic)
- **Military & security:** Intelligence agencies 21 (CIA/NSA/FBI/MI6/Mossad/FSB/GRU/MSS/RAW/ISI/BND/DGSE/ASIS/CSIS + Five/Nine/Fourteen Eyes) · Terrorist groups 16 · Secret police 12 · Weapons 13 · Armed forces 10 · Internment camps 5 · Military institutions 4.
- **Politics:** Political ideologies 32 · Political parties 12 · Political orientation 10 · Politics by region 6 (all continents).
- **Built environment** → 4 subgroups + Master-planned cities (14 global) + expansion. **Education** → 4 subgroups + expansion. **Speech** → info-ecosystem concepts.
- Accountability subtree untouched (canon). Contested-narrative canon preserved throughout.

---

## Canon decisions locked this session
1. **Mithai = first-class confection category.** Region-named confection categories are normative (Turkish delight, Baklava, Halva, Nougat, Marzipan are peers).
2. **Religious texts vs deities:** living-religion sacred texts stay under `Major religions`; only *dead*-pantheon texts (Eddas, Theogony, Book of the Dead, Gilgamesh, Popol Vuh) live in `Mythologies`. Deities → `Mythologies` (Major religions houses no deities).
3. **Megaliths canonical home** = `Culture / Visual arts / Architecture / Megalithic architecture`.
4. **Society's 27 dup_groups are all legitimate** (by-country government homonyms + Accountability-canon copies + abstract-vs-instance). Do NOT dedup.
5. **Neutral-atom principle (reaffirmed):** provide a neutral, encyclopedically-organized atom for everything under the sun — including sensitive topics (terrorist groups, secret police, weapons) — no editorializing.
6. **Taxonomy currency:** current Pope = **Leo XIV** (Robert Prevost; elected 2025-05-08; Francis d. 2025-04-21).

---

## Cross-realm / deferred
- Cross-realm same-referent atoms (master-planned cities ↔ Geography capitals; Society/Weapons classes ↔ Tech/Military technology) sit under the **single-canonical-home + alias-table-pending** doctrine. Alias machinery still not in schema.
- Trivia pipeline: leaf-only default (folders eligible later).

---

## Next up
- **Reference (84)** — the LAST realm in the palindrome; not yet organized/built. (Tartaria lives at `Reference / Contested narratives / Tartarian Empire`.)
- **Justice (0)** — scaffold only.
- Build the cross-realm **alias mechanism** when ready.

---

## Close-out verification (sweep)
- Culture: 0 orphans · 2 accepted dups (Forms/Genres) · 1,032 synced.
- Religion: 0 orphans · 0 dups · 709 synced.
- Society: 0 orphans · 27 legitimate homonyms · 1,651 synced.
- All `realms.atom_count` synced to triggers.