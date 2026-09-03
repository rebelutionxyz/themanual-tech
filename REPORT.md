# REPORT — TheMANUAL.tech

Report of record for dispatched passes with `workdir=TheMANUAL.tech`. Updated in place every pass.
Newest pass first.

**Archive chain.** This file rotates when it exceeds 512 KB at sweep time (root `CLAUDE.md` R6).
Rotated files are write-once and live under `docs/reports/`, which is exempt from the sweep's 1 MB
gate by name. Read them newest-first when you need history older than this file:

| # | file | covers | bytes at rotation |
|---|---|---|---|
| 003 | `docs/reports/REPORT-archive-003.md` | **PATCHBOARD_DB2** (2026-09-03) back through **JUSTICE_SCHEMA_APPLY1** (2026-08-21). Bottom section: `PATCHBOARD_DB2 — APPLIED`, appended out of order — see the ordering note carried into that file from archive 002. | 823,437 |
| 002 | `docs/reports/REPORT-archive-002.md` | **OPS74** (2026-08-03) through **DB43** (2026-08-08). Top section: `DB42`. See the ordering note below. | 676,177 |
| 001 | `docs/reports/REPORT-archive-001.md` | DOCS17-era passes through **OPS74-Q** (top section: `OPS74-Q`; oldest: the DOCS17 / A.1 appendix material) | 1,782,627 |

This file starts at **REALM1** (2026-09-03), the pass that performed rotation 003.

**Ordering note, recorded honestly.** Archive 002 is *mostly* newest-first but not strictly. The last
three passes written into it — `FRONT32`, `FRONT34`, `DB43`, all 2026-08-08 — were **appended at the
end of the file rather than inserted at the top**, against the "Newest pass first" convention stated
above. Archive 003 repeats the same mistake once more: its very last section
(`PATCHBOARD_DB2 — APPLIED`) is chronologically the newest thing in that file but sits at the bottom.
When searching an archive, search by pass id and do not trust position. Passes from this file forward
go at the top, under the header.

---

## REALM1 — realm picker into the LEFT SIDEBAR of .fyi (INTEL) and groups (UNITE) (2026-09-03)

**Pass:** REALM1 | lane `front` | workdir `TheMANUAL.tech` | claimed via folder-matched claim (session `21c96648`, fallback id — no `MC_SESSION` set on this terminal).

**Owner ruling this pass executes:** "realm is now in the left sidebar of appropriate astras. fyi
groups. not in toolbar." — INTEL and UNITE lost their realm picker when CommunityShell (and its
LensRow toolbar) was retired for those two surfaces in ONE_SHELL1 (commit 074c153); the old header
Realm button was deleted in ONE_SHELL2 (da177a2). This pass puts realm browsing back, in the sidebar,
for INTEL and UNITE only.

**What shipped**, all in `src/pages/community/CommunityLayout.tsx`:

1. **Realm nav group.** For `surface === 'intel' | 'unite'` only, a new `ShellNavGroup` labelled
   "Realm" is prepended to the sidebar's `nav` array (above the surface's own items, below
   `sidebarTop` — `UniversalShell` already renders `sidebarTop` first). Rows come from
   `supabase.from('realms').select('id,name,display_order').order('display_order')` (same query
   shape as `RealmStrip.tsx`), fetched once on mount. Each row's icon is a small `lucide-react`
   `Circle` filled with that realm's own color (`useRealmColors` — DB `realms.color`, falling back to
   `REALM_COLOR_FALLBACK`), set via the icon's own `fill`/`stroke` props so it is immune to the
   shell's active/hover `--accent`/`--icon` recoloring of nav icons. The row label is untouched —
   it keeps the shell's normal `--ink`/`--body` active-state treatment, per "label stays --ink."
2. **Row click = select.** Clicking a realm row calls `useIntelStore.setRealmId` (toggling off if
   the same realm is already selected — a click-again clears it, since nothing else in the sidebar
   offers a clear affordance) and navigates to the surface root (`/intel` or `/unite`) if not already
   there. `active` on the row is `selectedRealmId === r.id`.
3. **Chevron click = browse sub-realms.** Each row's `hint` slot (rendered inside the same
   `<button>` the row itself is) carries a `<span role="button" tabIndex={0}>` chevron —
   deliberately NOT a real `<button>`, since nesting `<button>` inside `<button>` is invalid HTML and
   `UniversalShell`'s `Sidebar` renders the whole row as one button (a `biome-ignore
   lint/a11y/useSemanticElements` explains this at the callsite). Its `onClick`/`onKeyDown` call
   `e.stopPropagation()` before opening panel `'realm'` via `UniversalShell`'s existing
   `panels`/`openPanel`/`onOpenPanel`/`renderPanel` mechanism (width `compact`), so the two
   affordances on one row never fire together. The drawer renders `RealmTreeContent` (the reusable
   core already extracted from the retired `RealmTreeSlider` — see Deviations) scoped to
   `rootPath=[realmName]`. Because `RealmTreeContent` writes into `useLensStore` (multi-select
   `selectedRealms` → derives `realmId`/`l2`/`l3`), and `CommunityLayout` already had a standing
   effect mirroring `useLensStore`'s realm/l2/l3 into `useIntelStore` (added long before this pass,
   for the old top-toolbar Realm dropdown), drilling into a sub-realm in the drawer flows into
   `selectedRealmId`/`selectedL2`/`selectedL3` for free — no new wiring needed for that half.

**Deviations & judgment calls (with reasons):**

- **DO §3 (delete `LensRow.tsx` / `lensPanels.tsx` if nothing else imports them) — NOT done.**
  Verified by grep, not assumption: `CommunityShell.tsx` still imports `LensRow`, and
  `BrandosophicLayout.tsx` still mounts `CommunityShell` (Brandosophic never moved to
  `UniversalShell`/ONE_SHELL — only INTEL/UNITE/RULE/GIVE/PULSE/BAZAAR/COMMS/SECURITY did). Deleting
  either file would break the Brandosophic build. `lensPanels.tsx` is separately imported directly by
  `TopToolbar.tsx` too. Confirmed live with `npx tsc -b` (clean) after leaving both files in place —
  a compile-clean tree with them deleted was never achievable given those live imports, so this
  wasn't attempted. If Brandosophic is ever moved off `CommunityShell`, this deletion becomes safe
  and should be revisited then.
- **Realm click toggles off on repeat click.** Not explicitly specified by the dispatch; added
  because nothing else in the new sidebar group offers a way to clear a picked realm once set.
- **Sub-realm drawer stays open after a pick inside it.** Matches the pre-existing `RealmTreeContent`
  / old `LensRow` dropdown behavior (multi-select tree — picking doesn't auto-close), not something
  new invented for this pass.
- Realm icon size is 10px (a color dot), distinct from the 17px icons the rest of the sidebar uses —
  intentional, since the ask was a color swatch per realm, not a semantic icon.

**Done-test (verbatim):**

```
$ npx tsc -b
(no output — clean)

$ npx biome check src/pages/community/CommunityLayout.tsx
Checked 1 file in 23ms. No fixes applied.

$ npm run build
✓ built in 25.79s
```

**Could not verify:** no live browser check — the Claude-in-Chrome extension reported "Browser
extension is not connected" in this session, so `/intel` and `/unite` showing the Realm group (and
`/bazaar`/`/pulse`/etc. not showing it) was verified by reading the `surface === 'intel' | 'unite'`
gate in code and by `tsc`/build passing, not by eyes on the running app. A `npm run dev` instance was
started on port 3001 for this purpose (port 3000 was already occupied by another running instance)
but sat unused once the browser tool failed to connect; it and the pre-existing vite instances on this
box were left running rather than risk killing a Bee's live session on a misidentified PID (four
`vite` processes were already running before this pass touched anything).

**Manifest (scoped commit — NOT pushed, per dispatch: "you can commit if you're ready always" / "Do
not push"):**

```
M  src/pages/community/CommunityLayout.tsx
M  REPORT.md
A  docs/reports/REPORT-archive-003.md
```

`.claude-pass` is intentionally excluded (never committed, per rail R2c/README).

---
