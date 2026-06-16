# THE MANUAL — Taxonomy Cleanup Playbook & Session Handoff
_Last updated: 2026-06-16 · Supabase project `anxmqiehpyznifqgskzc` · table `public.atoms`_

> **Purpose.** A repeatable, self-contained procedure for organizing every realm of The Manual to the
> same standard. Drop this in at the start of any "Manual" session and run it realm by realm.
> North star: **a place for everything under the sun, with the easiest possible UI to find it.**

---

## 0. Locked principles (decided this session — do not re-litigate)

1. **One home per atom.** Every atom lives at exactly one path. There are **no duplicates, only clones** — but
   clones don't exist yet (see §6). For now: if an atom is genuinely covered in its proper home realm,
   **delete the copy that's in the wrong realm.** Don't keep both.
2. **The clone/populate pass is DEFERRED** until all realms' *levels* are organized the way we want. We do
   structure first, multi-home clones last. (No atom-clone machinery exists in the schema. The only relation
   tables are `entity_atom_links` / `entity_category_links` — currently empty — which are the likely future
   home for multi-home links.)
3. **Group only when it helps.** A flat list of **~20+ jumbled items** earns sub-grouping. A clean list of
   **≤~15 peer items** (e.g. engineering disciplines, electronics fields) stays **flat** — forcing sub-folders
   onto peers adds clicks and arbitrary boundaries and makes finding things *worse*.
4. **Catch-alls are dissolved, never tolerated.** If the contents actually cohere, **rename** the branch to what
   it really is. If it's a true grab-bag, **dissolve** it and reparent each child to a real home.
5. **Tag convention:** `realm_tags = [realm_name]`, `pillar_tags = ['MANUAL']`, `skin_tags = ['HoneyComb']`.
   Normalize every realm to this during its pass.
6. **Realm-specific carve-outs:**
   - **Society / Accountability subtree is OFF-LIMITS** — it's a purpose-built investigative tree, a different
     beast from the standard taxonomy. Exclude it from scans, dedup, and restructuring.
   - **Geography "duplicate names" are homonyms, not errors** (every "Springfield," every "San José" is a real
     distinct place). Never dedupe Geography by name. Geography is already complete — leave it.
7. **Ops discipline:** `apply_migration` for every write (registers in `schema_migrations`); `execute_sql` for
   reads/dry-runs only. Make writes idempotent/path-keyed. Verify after every migration. Extract a parity file
   for each migration (§6). Git commits go through Butch (GitHub Desktop).
8. **Confirm structure, lead on mechanics.** Naming/grouping are canon — present the plan, then execute on
   "go." Dedup, tag-normalize, and integrity fixes are objective — just do them.

---

## 1. The per-realm pass (6 steps)

Run these in order for one realm, start to finish, before moving to the next.

**Step 0 — Identify + audit.** Confirm the realm's keys and take its vitals.
**Step 1 — Dedup (internal).** Remove duplicate-name copies; keep the content-bearing/correctly-nested home.
**Step 2 — Cross-realm.** Delete copies already covered in their proper realm; keep where this realm is a real home.
**Step 3 — L2 restructure.** Dissolve/rename catch-alls, merge thin branches, nest sub-topics, fix overlaps.
**Step 4 — L3 grouping.** Sub-group only the flat branches that are too big/jumbled; leave clean peer-lists flat.
**Step 5 — Tag normalize.** Set realm/pillar/skin tags to convention.
**Step 6 — Verify + parity.** Re-run integrity to all-zero; extract parity files for commit.

---

## 2. SQL recipes (copy-paste; swap the realm)

Throughout, replace `'<rid>'` with the realm_id (e.g. `'science'`) and `'<Root>'` with the realm root name in
the path (e.g. `'Science'`). The root is `path_parts[1]`.

### 2.0 Confirm keys + vitals
```sql
SELECT DISTINCT realm_id, path_parts[1] AS root, realm_name FROM atoms WHERE realm_name = '<RealmName>';

WITH t AS (SELECT * FROM atoms WHERE realm_id='<rid>')
SELECT 'atoms' k, count(*)::text v FROM t
UNION ALL SELECT 'branches(d2)', count(*) FILTER (WHERE depth=2)::text FROM t
UNION ALL SELECT 'max_depth', max(depth)::text FROM t
UNION ALL SELECT 'path<>join', count(*) FILTER (WHERE path IS DISTINCT FROM array_to_string(path_parts,' / '))::text FROM t
UNION ALL SELECT 'depth<>len', count(*) FILTER (WHERE depth IS DISTINCT FROM array_length(path_parts,1))::text FROM t
UNION ALL SELECT 'orphans', (SELECT count(*) FROM t g WHERE depth>2 AND NOT EXISTS (SELECT 1 FROM atoms p WHERE p.realm_id='<rid>' AND p.path=array_to_string(g.path_parts[1:g.depth-1],' / ')))::text
UNION ALL SELECT 'leaf_mismatch', (SELECT count(*) FROM t g WHERE g.is_leaf <> NOT EXISTS (SELECT 1 FROM atoms c WHERE c.realm_id='<rid>' AND c.path LIKE g.path||' / %'))::text;
```

### 2.1 Top-two-level map (what's in each branch)
```sql
SELECT path_parts[2] AS branch,
       count(*) FILTER (WHERE depth=3) AS direct_children,
       string_agg(CASE WHEN depth=3 THEN path_parts[3] END, ', ' ORDER BY path_parts[3]) AS children
FROM atoms WHERE realm_id='<rid>' AND depth IN (2,3)
GROUP BY path_parts[2] ORDER BY path_parts[2];
```

### 2.2 Find internal duplicates (every repeated name + all its locations)
```sql
WITH d AS (SELECT name FROM atoms WHERE realm_id='<rid>' GROUP BY name HAVING count(*)>1)
SELECT a.name, replace(a.path,' / ',' > ') AS path, a.depth, a.is_leaf,
       (SELECT count(*) FROM atoms x WHERE x.realm_id='<rid>' AND x.path LIKE a.path||' / %') AS descendants
FROM atoms a JOIN d ON a.name=d.name WHERE a.realm_id='<rid>'
ORDER BY a.name, a.path;
```
**Rule of thumb:** keep the copy with descendants / deeper correct nesting; delete the shallow stub.
If the stub-to-delete has children, **reparent them first** (see 2.5), then delete.

### 2.3 Find cross-realm twins (same name in another realm)
```sql
WITH norm AS (
  SELECT id,name,path,realm_id,realm_name,
         lower(btrim(regexp_replace(name,'\(applied\)','','g'))) AS base
  FROM atoms)
SELECT t.name AS this_atom, replace(t.path,' / ',' > ') AS this_path,
       o.realm_name AS twin_realm, replace(o.path,' / ',' > ') AS twin_path
FROM norm t JOIN norm o ON t.base=o.base AND o.realm_id<>'<rid>'
WHERE t.realm_id='<rid>' ORDER BY o.realm_name, t.name;
```
**Triage:** delete from this realm when the twin is the true home (`(applied)`-suffixed clones; pure
science/philosophy/history/society/geography concepts homed elsewhere). **Keep** when this realm is a
legitimate home (e.g. the *applied/engineering* view vs the *phenomenon*); those become clones later, not now.
**Ignore false positives:** generic node names ("Concepts"), homonyms, company-sector senses, contested-narrative
versions. Always confirm leaf/descendants before deleting (2.2 pattern).

### 2.4 Delete (always path-keyed, after the leaf/child check)
```sql
DELETE FROM atoms WHERE realm_id='<rid>' AND path IN ( '<Root> / .../ X', '<Root> / .../ Y' );
```

### 2.5 Move / rename a subtree — the universal prefix-swap
Moves a node **and all its descendants** at once. `OLD_PREFIX` = the path_parts of the subtree root being
replaced; `NEW_PREFIX` = where it lands (incl. the new name). `K` = `array_length(OLD_PREFIX,1)+1`.
```sql
UPDATE atoms
SET path_parts = ARRAY['<Root>', ... NEW_PREFIX ... ] || path_parts[K:],
    path       = array_to_string(ARRAY['<Root>', ... NEW_PREFIX ... ] || path_parts[K:], ' / '),
    depth      = array_length(ARRAY['<Root>', ... NEW_PREFIX ... ] || path_parts[K:], 1),  -- only if depth changes
    name       = CASE WHEN path = '<OLD_ROOT_PATH>' THEN '<NewName>' ELSE name END,         -- only if renaming the root
    updated_at = now()
WHERE realm_id='<rid>' AND (path='<OLD_ROOT_PATH>' OR path LIKE '<OLD_ROOT_PATH> / %');
```
- **Pure rename** (same depth, same parent): NEW_PREFIX same length as OLD; omit the `depth=` line.
- **Nest deeper / move to new parent**: NEW_PREFIX longer/shorter; **keep** the `depth=` line.
- Postgres evaluates all SET expressions against the row's OLD values, so `path_parts[K:]` and the `name` CASE
  both see pre-update state — correct in a single statement.
- **Order matters:** create/rename the destination branch *before* reparenting children into it.
- **Collision check first:** make sure the destination doesn't already have a child of that name.

### 2.6 Create a sub-branch node (for L3 grouping) — clone metadata from the branch
```sql
INSERT INTO atoms (id,name,path,path_parts,realm_id,realm_name,depth,type,kettle,is_leaf,
  theme_tags,realm_tags,pillar_tags,skin_tags,geo,note,meta,canonical_url,canonical_source,band,status)
SELECT '<rid>-<slug>', '<Group Name>',
       '<Root> / <Branch> / <Group Name>',
       ARRAY['<Root>','<Branch>','<Group Name>'],
       realm_id,realm_name,3,'concept',kettle,false,theme_tags,realm_tags,pillar_tags,skin_tags,
       NULL,NULL,'{}'::jsonb,NULL,NULL,band,status
FROM atoms WHERE id='<branch_id>';
```
Then reparent the chosen children into it with 2.5 (depth +1). New-node `id` just needs to be unique + stable;
ids do not have to match the current name (they're historical keys).

### 2.7 Recompute leaf flags (run after any delete/move batch)
```sql
UPDATE atoms a
SET is_leaf = NOT EXISTS (SELECT 1 FROM atoms c WHERE c.realm_id='<rid>' AND c.path LIKE a.path||' / %'),
    updated_at = now()
WHERE a.realm_id='<rid>'
  AND a.is_leaf <> NOT EXISTS (SELECT 1 FROM atoms c WHERE c.realm_id='<rid>' AND c.path LIKE a.path||' / %');
```

### 2.8 Normalize tags
```sql
UPDATE atoms
SET realm_tags=ARRAY['<Root>'], pillar_tags=ARRAY['MANUAL'], skin_tags=ARRAY['HoneyComb'], updated_at=now()
WHERE realm_id='<rid>'
  AND (realm_tags IS DISTINCT FROM ARRAY['<Root>']
    OR pillar_tags IS DISTINCT FROM ARRAY['MANUAL']
    OR skin_tags IS DISTINCT FROM ARRAY['HoneyComb']);
```
(Inspect any atoms carrying a *foreign* realm tag first — those are usually stale from a prior move and safe to
overwrite, but eyeball them, as they can flag a cross-realm case you missed in Step 2.)

### 2.9 Verify (target: every number 0 except totals)
Use the 2.0 vitals block plus:
```sql
SELECT (SELECT count(*) FROM (SELECT name FROM atoms WHERE realm_id='<rid>' GROUP BY name HAVING count(*)>1) d) AS dup_names,
       (SELECT count(*) FROM (SELECT path FROM atoms WHERE realm_id='<rid>' GROUP BY path HAVING count(*)>1) d) AS dup_paths,
       (SELECT count(*) FROM atoms WHERE realm_id='<rid>' AND NOT ('<Root>'=ANY(realm_tags))) AS tag_gap;
```

### 2.10 Extract parity files (after the realm is done)
```sql
SELECT version, name, array_to_string(statements, E'\n') AS sql
FROM supabase_migrations.schema_migrations
WHERE name LIKE '<rid>_%' AND version >= '<first_version_this_session>'
ORDER BY version;
```
Save each as `migrations/<version>_<name>.sql` with a header:
`-- APPLIED to prod <date> via Supabase MCP (apply_migration). PARITY file — verbatim from schema_migrations.`

---

## 3. Current state — roadmap (as of 2026-06-16)

Integrity is 0 across all realms (good baseline). Scores below are the cleanup signal.

| Realm | Atoms | Branches | Catch-alls | Flat branches | Real dups | Tag gaps | Status |
|---|---|---|---|---|---|---|---|
| **Tech** | 487 | 15 | 0 | 3 | 0 | 0 | ✅ DONE |
| Geography | 17,029 | 6 | 1 | 2 | (homonyms) | 22 | ✅ done (leave) |
| Society | 1,492 | 14 | 1 | 2 | 33 | 138 | ⚠ Accountability off-limits |
| **Science** | 526 | 7 | 2 | 1 | 27 | 50 | → **DO NEXT** |
| Religion | 402 | 8 | 2 | 4 | 0 | 56 | todo |
| History | 311 | 9 | 0 | 1 | 4 | 44 | todo |
| Culture | 309 | 9 | 0 | 1 | 5 | 38 | todo |
| Health | 302 | 9 | 0 | 2 | 1 | 138 | todo |
| Self | 261 | 8 | 0 | 0 | 0 | 20 | light (tags only) |
| Philosophy | 218 | 9 | 1 | 6 | 1 | 47 | todo (very flat) |
| Math | 194 | 7 | 3 | 2 | 1 | 38 | fast warm-up |
| Human activities | 141 | 8 | 0 | 6 | 1 | 30 | todo (very flat) |
| Reference | 82 | 5 | 0 | 3 | 0 | 4 | light |

**Recommended order:** Science → Math (quick) → Philosophy / Human activities (flat, grouping-heavy) →
Religion → History → Culture → Health → Society (biggest, mind Accountability) → Self / Reference (light).
Re-run the §4 cross-realm audit any time to re-prioritize.

> **Note:** the ~635 total tag gaps are *not* a separate job — they're fixed inside each realm's Step 5.

---

## 4. The all-realm audit (re-run to re-prioritize)
```sql
WITH dn AS (SELECT realm_id, count(*) dup FROM (SELECT realm_id,name FROM atoms GROUP BY realm_id,name HAVING count(*)>1) z GROUP BY realm_id),
     fl AS (SELECT realm_id, count(*) flat FROM (SELECT realm_id, path_parts[2] br FROM atoms WHERE depth=3 GROUP BY realm_id,path_parts[2] HAVING bool_and(is_leaf)) q GROUP BY realm_id)
SELECT a.realm_name, count(*) atoms, count(*) FILTER (WHERE a.depth=2) branches, max(a.depth) max_depth,
  COALESCE(max(dn.dup),0) dup_names,
  count(*) FILTER (WHERE NOT (a.realm_name = ANY(a.realm_tags))) tag_gap,
  count(*) FILTER (WHERE lower(a.name) ~ '^(other|miscellaneous|uncategorized|general|various)\M' OR lower(a.name) IN ('concepts','concepts and issues','misc','issues')) catchalls,
  COALESCE(max(fl.flat),0) flat_branches,
  count(*) FILTER (WHERE a.path IS DISTINCT FROM array_to_string(a.path_parts,' / ') OR a.depth IS DISTINCT FROM array_length(a.path_parts,1)) integrity_err
FROM atoms a LEFT JOIN dn ON dn.realm_id=a.realm_id LEFT JOIN fl ON fl.realm_id=a.realm_id
GROUP BY a.realm_id, a.realm_name ORDER BY atoms DESC;
```

---

## 5. Worked reference — what was done to Tech (2026-06-16)

Five migrations, in order (parity files in this same output folder):

1. `20260616171754_tech_remove_crossrealm_and_internal_duplicates` — reparented Rail transport's "Famous trains",
   deleted 14 cross-realm-covered atoms + 12 internal duplicate stubs (26 total), recomputed leaf flags.
2. `20260616172040_tech_toplevel_restructure_dissolve_catchalls` — renamed "Concepts and issues" →
   **Technology & society**; dissolved **Other applied sciences** (4 leaves rehomed, branch deleted); merged
   **Communication technology** into **Internet, networking & communications**; nested **Cryptocurrency** under
   Computing as **Blockchain & cryptocurrency** (+ renamed its generic "Concepts" child).
3. `20260616173445_tech_l3_group_technology_and_society` — created 3 sub-branches (Theory & dynamics 14 /
   Society, economy & impact 12 / Futures & transhumanism 6) and reparented the 32 flat items.
4. `20260616174024_tech_normalize_realm_pillar_skin_tags` — fixed 48 atoms to the tag convention.
5. `20260616175805_tech_remove_last_applied_clone_agriculture` — removed the final `(applied)` clone.

Result: **513 → 487 atoms, 18 → 15 branches, 0 dups, 0 catch-alls, 0 tag gaps, 0 integrity violations.**
Engineering (17) / Electronics (12) / Agricultural (11) were **deliberately left flat** (clean peer-lists).

---

## 6. Deferred until all realms are organized

- **Populate-and-clone pass.** Once every realm's levels are set, decide the clone mechanism (likely a
  `clone_of` pointer on `atoms`, or use `entity_*_links`), then re-add multi-home appearances (e.g. Cartography
  shows under both Geography *home* and Tech *clone*) so "a place for everything" holds without true duplicates.
- **Deeper semantic re-home.** The cross-realm scans here match on *name*. A later semantic pass can catch
  atoms misfiled to the wrong realm without an exact-name twin — fold into the clone pass.

## 7. Outstanding handoff items (not part of the realm passes)

- **Commit:** Tech parity files (5, this folder) + the geo parity set + the B1 US-places seed file. Git via Butch.
- **B1 file:** run the generator in Studio, save output as `migrations/20260616_geo_us_places_seed.sql`.
- **P1 pre-July-4 sweep (separate workstream):** auth-pin `atlasoracle_check_rate_caps` and
  `atlasoracle_get_escrow_balance`.

## 8. After the Manual is done

Next focus (separate sessions): **build out FreedomBLiNGS** — the live read side, checkout-session function +
Gradations CTA wiring, F6 webhook deploy, test-mode rehearsal. Not part of this playbook; parked here for sequence.
