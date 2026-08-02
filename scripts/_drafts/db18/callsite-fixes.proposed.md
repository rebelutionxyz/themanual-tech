# DB18 — proposed src/ changes

**DRAFT. NOTHING IN `src/` WAS TOUCHED BY THIS PASS.** These are the diffs that
follow once `20260802000000_db18_atoms_type_check.sql` is applied and
`scripts/gen-atom-type.mjs` is wired. They are listed in dependency order.

The blast-radius table (every callsite, and what it does today on a value like
`city`) is in `REPORT.md` under **DB18**. This file is only the fixes.

---

## 1. `src/types/manual.ts` — stop declaring the union by hand

```diff
-export type AtomType = 'person' | 'event' | 'document' | 'organization' | 'place';
+// The union is GENERATED from the atoms_type_check constraint — see
+// scripts/gen-atom-type.mjs. Re-exported here so the ~9 existing
+// `from '@/types/manual'` importers keep working unchanged.
+export type { AtomType } from './atom-type.generated';
+export { ATOM_TYPES, isAtomType } from './atom-type.generated';
```

Re-exporting rather than rewriting every import keeps this a one-line change.
`AtomType` stays importable from `@/types/manual`, so `useManualStore.ts`,
`useManualData.ts` and `manual.ts`'s own `Atom.type` / `FilterState.selectedType`
need no edit at all.

---

## 2. `src/lib/useManualData.ts:77` — replace the assertion with a guard

This is the line that makes the whole defect invisible: `as AtomType` tells
TypeScript to stop asking, and all 37,437 rows pass through it.

```diff
-    type: r.type as AtomType,
+    // Do not restore `as AtomType` here. That assertion is what let a
+    // five-value union sit on a nine-value column for months.
+    type: isAtomType(r.type) ? r.type : ((): AtomType => {
+      console.warn(`[useManualData] unknown atoms.type "${r.type}" on ${r.id}`);
+      return 'concept';
+    })(),
```

With the CHECK applied the fallback branch is unreachable from production data;
it exists so that a *future* widening migration that lands before a regenerate
degrades to a warning instead of a silent miscolour.

`'concept'` — not `'event'` — is the right fallback: it is the generic
non-geographic kind and carries no false claim. `'event'` asserts the atom is a
historical occurrence.

---

## 3. `src/lib/constants.ts:133` — nine colours, exhaustively typed

`ATOM_TYPE_COLORS` currently has no type annotation, so TypeScript infers
`{person: string, …}` and never notices the missing seven keys.

```diff
-export const ATOM_TYPE_COLORS = {
-  person: '#6B94C8',
-  event: '#E88938',
-  document: '#6FCF8F',
-  organization: '#C94C4C',
-  place: '#9B7FC8',
-};
+// Record<AtomType, string> is load-bearing: it turns a future vocabulary
+// widening into a compile error here instead of a grey dot on screen.
+export const ATOM_TYPE_COLORS: Record<AtomType, string> = {
+  concept:      '#6B94C8',
+  event:        '#E88938',
+  country:      '#C94C4C',
+  continent:    '#E0A94C',
+  region:       '#8FA3B8',
+  admin1:       '#6FCF8F',
+  admin2:       '#97DFB0',
+  city:         '#9B7FC8',
+  neighborhood: '#B79BD8',
+};
```

**The nine colour values above are a placeholder, not a design decision.** They
reuse the existing five hues and lighten two for the admin1/admin2 and
city/neighborhood parent-child pairs. Palette is a brand call — these need sign-off
before they ship. The *typing* is the part that matters and is independent of
which hues land.

---

## 4. `src/components/manual/GraphView.tsx` — the legend, and only the legend

Line 214 (`ATOM_TYPE_COLORS[n.atom.type] ?? '#8A94A0'`) needs **no change**: once
the record is complete the lookup always hits, and the `??` stays as a runtime
backstop. Today it is the thing painting 99.7% of nodes grey.

The legend at line 294 iterates `Object.entries(ATOM_TYPE_COLORS)` and so fixes
itself — but it will then render nine swatches where it rendered five, in a
fixed-height sidebar. Check the layout, and consider showing only the types
present in the current graph:

```diff
-        {Object.entries(ATOM_TYPE_COLORS).map(([type, color]) => (
+        {Object.entries(ATOM_TYPE_COLORS)
+          .filter(([type]) => nodes.some((n) => !n.synthetic && n.atom.type === type))
+          .map(([type, color]) => (
```

---

## 5. `src/lib/tree.ts:91` — alias ghosts should not default to `'event'`

```diff
-        type: canonical?.type ?? 'event',
+        // 'concept' is the neutral kind; 'event' asserts a historical
+        // occurrence about an atom we could not resolve. Same reasoning as
+        // dropping the atoms.type DEFAULT — see 20260802000100.
+        type: canonical?.type ?? 'concept',
```

---

## 6. `FilterState.selectedType` — decide, then act

`selectedType` is declared in `src/types/manual.ts:123` and fully wired in
`src/stores/useManualStore.ts` (`9, 19, 35, 45, 77`) — initial value, setter,
reset. **No component reads it and no component calls `setSelectedType`.** It is
a dead filter.

Correcting the union does not make it work; it makes it *correctly typed and
still dead*. Two honest options, lead's call:

- **Build it** — the type filter is more useful with nine real values than it
  ever was with five imaginary ones (`city` alone is 64% of the corpus).
- **Delete it** — remove the field, setter and reset from store and `FilterState`.

Leaving it is the third option and the one that produced this pass.

---

## Not proposed: converting `atoms.type` to a Postgres ENUM

Worth naming because it is the obvious "why not just…", and it was checked.

An `ENUM` would let Supabase's own `generate_typescript_types` emit the union
with no bespoke script — strictly less code to rot. It was **not** proposed
because the column is referenced by three routines that would all need replacing
in the same migration:

| Object | Why it breaks |
| --- | --- |
| `get_atom_level(text)` | `RETURNS TABLE(… type text …)` — an enum column no longer matches the declared `text`; needs `type::text` in the body and a `CREATE OR REPLACE` |
| `atom_create(…, p_type text)` | inserts `COALESCE(p_type, v_parent.type)` straight into the column; needs an explicit cast |
| `atom_update(…, p_type text)` | same |

That is a four-object migration touching two `SECURITY DEFINER` functions
granted to `authenticated`, versus a one-line CHECK plus a script. The CHECK buys
the same guarantee at a fraction of the blast radius. Revisit if the vocabulary
starts changing often enough that the script becomes friction.
