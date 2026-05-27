# Lens Mechanism — Status Check

**Date:** 2026-05-19 · **Verdict source:** read-only audit of `src/` + `_all.json` atom dump
**Per Disposition Spec §12 + Butch's 2026-05-19 ORDERS Step 2.**

## Status: **not-live**

## Evidence

- `src/lib/tree.ts:13-83` — `buildTree` is a pure depth-by-path tree builder. No facet/lens branch in the renderer.
- `src/lib/useManualData.ts:36-66` — ingests `realm_tags`, `pillar_tags`, `skin_tags` from `atoms`, but **only `themeTags` is wired to a filter.**
- `src/components/manual/ListView.tsx:22-26` — filters atoms by `selectedTags` against `themeTags` exclusively.
- `src/components/manual/AtomDetailPanel.tsx:103-117` — `realm_tags` / `pillar_tags` / `skin_tags` render as display-only chips in the "Categorization" section. Not selectable facets.
- No code references `by-region`, `by-year`, `Groupings`, `"lens"`, or `"facet"` as a taxonomy mechanism anywhere in `src/`. (The geo-cascade `lens` hits in `src/lib/geo/` + `components/geo/GeoLensBar.tsx` are an unrelated geography UI, not the spine lens.)
- **The claimed precedents do not exist as atoms.** Grepping the production atom dump finds zero `history-by-region` IDs and zero `geography-groupings` IDs. The spec's "precedent already set per spec §3 (history/by-region, geography/groupings)" is not actually built.

## What this means for the Lists disposition pass

Per Butch's ORDERS Step 4: **"If not-live: PARK both, log as blocked, continue."**

Parked work, total: **78 atoms**
- 43 lens-induced DISSOLVE atoms (§3c)
- 35 LENS-bucket conversions

These do not block Steps 1, 3, 5, 6, 7. They wait for the mechanism to ship.

## What it would take to be live

> Add a `lens_tags text[]` (or repurpose `realm_tags`) facet-filter path in `useManualStore` + `ListView` / `TaxonomyTree` so a Bee viewing a realm can toggle "By region/By year/By language" as a tag-driven slice, with one converted precedent atom (`history-lists-by-year`) wired end-to-end as the reference implementation.

One precedent + one wired control + one filter-aware store = the mechanism. Until then, lens conversions wait.
