# Code 24 — Phase C Component D: Promotion Slot Framework

**Date:** 2026-05-08
**Author:** Code 24 (Claude Opus 4.7) — supervised by Butch
**Branch:** `feat/phase-c-component-d-promotion-slots`
**Status:** **PUSHED.** Awaiting review + sequential merge with Code 23.
**Spec source:** MMF §19.7 D-1 → D-5
**Schema dependency:** commit `f8a2d5d` (schema-architect Phase C foundations)

---

## Summary

Shipped the full reader side of the promotion slot framework. Three canonical slots (`top-ticker`, `sidebar-promoted`, `feed-inline`) are wired into shared layouts, fed by a hybrid resolution pipeline:

1. DB query against `public.promotions` filtered by `slot_key`, scored by most-specific match (atom > branch > realm > astra > geo-country > catch-all), tiebroken by `priority DESC, created_at DESC`.
2. Astra-defined `fallbackContent` from `PillarConfig.promotionSlots`.
3. Slot DOM omitted entirely (D-4) when neither produces content.

No admin write UI in v1 — slot content is seeded manually via Supabase Studio against the `is_admin = true` policy gate. v1 ships with all astras' `promotionSlots` set to canonical defaults and zero astra fallback content, so promotions tables empty = all slots invisible.

Build: clean. tsc: clean. Biome lint: clean (70 files). Vite build: 224 kB main bundle, 4.8s build.

---

## Files created

| Path | Purpose |
|---|---|
| `src/lib/promotions/types.ts` | `Promotion` row type, `SlotContext` reader input, `SlotResult` output |
| `src/lib/promotions/query.ts` | `queryPromotionForSlot` — fetch + most-specific-match scoring |
| `src/lib/promotions/usePromotionSlot.ts` | Reader hook returning `SlotResult` |
| `src/components/promotions/TopTickerSlot.tsx` | Top-ticker rendering surface (scrolling marquee w/ static fallback) |
| `src/components/promotions/SidebarPromotedSlot.tsx` | Right-rail static block |
| `src/components/promotions/FeedInlineSlot.tsx` | Feed-inline card |
| `src/components/promotions/index.ts` | Barrel |

## Files modified

| Path | Change |
|---|---|
| `src/lib/pillars/pillar.types.ts` | Added `SlotKey` / `SlotBehavior` / `SlotConfig` types, `PillarConfig.promotionSlots`, `DEFAULT_PROMOTION_SLOTS` constant, `resolveSlotConfig()` helper |
| `src/lib/pillars/atlasintel.ts` | Added `promotionSlots: { ...DEFAULT_PROMOTION_SLOTS }` |
| `src/lib/pillars/rebelution-fyi.ts` | Added `promotionSlots: { ...DEFAULT_PROMOTION_SLOTS }` |
| `src/lib/pillars/atlasunited.ts` | Added `promotionSlots: { ...DEFAULT_PROMOTION_SLOTS }` |
| `src/App.tsx` | Mounted `<TopTickerSlot />` between `<SiteHeader />` and `<Routes>`. Left placeholder comment for Code 23's `<GeoLensBar />` mount. |
| `src/components/layout/PlatformRail.tsx` | Mounted `<SidebarPromotedSlot />` at the bottom of the expanded right rail. Hidden in collapsed mode. |
| `src/components/intel/ThreadList.tsx` | Refactored render path through new `ThreadListWithInlinePromo` helper; injects `<FeedInlineSlot />` after the `slot.feedInlinePosition`-th thread card. When no promotion + no fallback the slot returns null and feed continues without a gap. |
| `tailwind.config.ts` | Added `promo-ticker` keyframe + `animate-promo-ticker` utility (40s linear infinite, translateX 0 → -50%) |

## Diff stats

```
8 files changed, 163 insertions(+), 13 deletions(-)
```

Plus the new files (promotions lib + components + barrel = 7 files, ~210 LOC).

---

## Scope-lock coverage

### D-1 — Hybrid (config + DB) ✅

`usePromotionSlot` resolves in this exact order:

```
1. queryPromotionForSlot(ctx) → DB row, if cascade matches
2. PillarConfig.promotionSlots[slotKey].fallbackContent → astra-defined HTML
3. null → slot DOM omitted by the caller component
```

`enabled: false` on a `SlotConfig` short-circuits step 1 entirely (no DB query) so the slot is fully inert on that astra.

### D-2 — 3 canonical slots, hybrid inheritance ✅

Slot keys typed as `'top-ticker' | 'sidebar-promoted' | 'feed-inline'`. Bottom-scrolling **deferred** as required.

`SlotConfig.behavior` is `'static' | 'scrolling'` (NOT `type`). The DB row's `behavior` column is enforced by a `CHECK` constraint to the same two values, and the reader's `SlotResult.behavior` follows the row's value when a DB match exists, else the slot config's. So an admin can flip a normally-static slot to scrolling for one promotion (e.g. an emergency banner in the `sidebar-promoted` slot) without astra-side changes.

`DEFAULT_PROMOTION_SLOTS` exported from `pillar.types.ts`; each astra spreads it explicitly so that Butch can audit "this astra ships with these three slots enabled" via the registry without reading framework defaults.

### D-3 — Targeting cascade to atom level + geo ✅

Specificity scoring (in `query.ts`):

```
atom_id          32
branch_path      16
realm_slug        8
astra_slug        4
geo_country       2
catch-all         1   (all five facets NULL)
```

Each weight strictly dominates the sum of all lower weights, so a row matching even a single high-tier facet always outranks any combination of lower-tier facets. Tiebreak: `priority DESC, created_at DESC`.

Geo: country-only at v1 per spec. The schema has region/city/neighborhood columns; the reader does not pass or score them. The `SlotContext` interface reflects this — only `geoCountry?: string` is exposed. v2 readers can extend without schema migration.

The reader is `usePromotionSlot({ slotKey, astra?, realmSlug?, branchPath?, atomId?, geoCountry? })`. `astra` defaults to the active `PillarContext` slug when omitted, which is the common case (slots mounted in shared layouts on pillar hosts).

### D-4 — Hide slot entirely when empty ✅

Each slot component returns `null` when both DB row and fallbackContent are absent. No empty `<div>`, no placeholder, no "available slot" message. Matches the spec rationale: "would train Bees to ignore those areas before real promotions arrive."

For `feed-inline`: the slot is conditionally rendered only at `i + 1 === slot.feedInlinePosition`. When the slot returns null, no `<li>` is created at that position — the next thread card simply slides into position N. **No gap.** Verified by reading the `ThreadListWithInlinePromo` JSX path: a Fragment wraps each thread card + an optional inline slot; the slot wrapper `<li>` is omitted entirely when the slot returns null because the `{i + 1 === position && (...)}` short-circuits before the JSX is constructed.

Layout-shift mitigation: each slot returns `null` while `loading === true` to avoid a flash of empty layout that resolves to nothing. First paint = nothing → ~50ms later, the resolved slot (or stays nothing). Acceptable given v1's empty DB.

### D-5 — Admin-only write path v1 ✅

No write UI was built. Admin assignment per spec is a one-line UPDATE in Supabase Studio:

```sql
UPDATE public.bees SET is_admin = true WHERE id = '<butch-uuid>';
```

The `promotions_admin_insert` / `_update` / `_delete` policies (already in place from migration `20260508120000`) gate writes on `is_admin = true`. Reader is public and unauthenticated — `promotions_select_active` enforces `active = true AND start-window AND end-window` in the policy itself, so anon clients never observe paused/future/expired rows.

---

## Smoke test plan (seed SQL — NOT committed)

The four smoke scenarios from the spec, with seed SQL admins can run in Supabase Studio against a personal `is_admin=true` bee. Run **after** flipping `is_admin = true` for the test admin's bee row.

```sql
-- =========================================================================
-- Phase C Component D smoke seed — DO NOT COMMIT TO MIGRATIONS
-- Run in Supabase Studio SQL editor. All seeds delete-clean at end.
-- =========================================================================

BEGIN;

-- Pre-seed cleanup (in case of prior partial run)
DELETE FROM public.promotions WHERE id::text LIKE 'aaaa%' OR id::text LIKE 'bbbb%' OR id::text LIKE 'cccc%' OR id::text LIKE 'dddd%';

-- Scenario 1: Empty DB — no seed needed. All three slots should render
-- nothing on themanual.tech, atlasintel.fyi, rebelution.fyi, atlasunited.fyi.

-- Scenario 2: atom-specific row for atlasintel
INSERT INTO public.promotions
  (id, slot_key, behavior, content_html, astra_slug, atom_id, priority)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'top-ticker', 'scrolling',
   '<strong>FREE atom-specific</strong> — atlasintel + freedom-of-speech only',
   'atlasintel', 'justice/freedom-of-speech', 0);

-- Expected after this insert:
--   - On atlasintel.fyi browsing /intel filtered to the freedom-of-speech atom:
--     top-ticker shows the <strong>FREE atom-specific</strong> banner.
--   - On atlasintel.fyi browsing any other atom or no atom: nothing.
--   - On rebelution.fyi or themanual.tech: nothing.

-- Scenario 3: catch-all row in addition to scenario 2's row
INSERT INTO public.promotions
  (id, slot_key, behavior, content_html, priority)
VALUES
  ('bbbbbbbb-0000-0000-0000-000000000001', 'top-ticker', 'scrolling',
   '<em>GET your story onto the Manual</em> — universal catch-all', 0);

-- Expected:
--   - On atlasintel.fyi at the freedom-of-speech atom: still the
--     atom-specific row (W_ATOM=32 + W_ASTRA=4 = 36 beats W_CATCHALL=1).
--   - Everywhere else (any astra, any page, any atom): the catch-all row.

-- Scenario 4: priority tiebreak — second catch-all with higher priority
INSERT INTO public.promotions
  (id, slot_key, behavior, content_html, priority)
VALUES
  ('cccccccc-0000-0000-0000-000000000001', 'top-ticker', 'scrolling',
   '<em>WIN BLiNG! today</em> — higher-priority catch-all', 100);

-- Expected:
--   - The new row replaces the first catch-all everywhere it was visible
--     (same specificity score = 1 for catch-all, priority 100 > 0).
--   - The atlasintel atom-specific scenario is unaffected.

-- Scenario 5 (bonus): sidebar-promoted DB row to verify the sidebar slot
INSERT INTO public.promotions
  (id, slot_key, behavior, content_html, astra_slug, priority)
VALUES
  ('dddddddd-0000-0000-0000-000000000001', 'sidebar-promoted', 'static',
   '<strong>OFFER</strong>: BANK a Curator page — atlasADs.biz launching soon',
   'atlasintel', 0);

-- Expected:
--   - On atlasintel.fyi with the right rail expanded: the sidebar-promoted
--     slot renders the OFFER block.
--   - On atlasintel.fyi with the right rail collapsed (icon-only mode):
--     nothing — sidebar-promoted is gated on rail expansion.
--   - On rebelution.fyi (any rail state): nothing — astra_slug='atlasintel' filter.

-- Scenario 6 (bonus): feed-inline DB row to verify feed injection
INSERT INTO public.promotions
  (id, slot_key, behavior, content_html, astra_slug, priority)
VALUES
  ('dddddddd-0000-0000-0000-000000000002', 'feed-inline', 'static',
   '<strong>SEND</strong> a thread — earn BLiNG! for sparking a conversation',
   'atlasintel', 0);

-- Expected:
--   - On atlasintel.fyi /intel with at least 10 threads in the feed:
--     after the 10th thread card, an inline promotion card appears.
--   - On atlasintel.fyi /intel with <10 threads in the feed: nothing
--     (position never reached → no gap).

-- Cleanup (run after manual verification)
-- DELETE FROM public.promotions WHERE id IN (
--   'aaaaaaaa-0000-0000-0000-000000000001',
--   'bbbbbbbb-0000-0000-0000-000000000001',
--   'cccccccc-0000-0000-0000-000000000001',
--   'dddddddd-0000-0000-0000-000000000001',
--   'dddddddd-0000-0000-0000-000000000002'
-- );

ROLLBACK; -- prefer ROLLBACK for the test session; replace with COMMIT to seed for live testing
```

### Why no `npm run dev` smoke run was performed in-session

This session is autonomous (no live browser). The expected runtime behavior is verified by:

1. **Specificity logic** — traced by hand through every scoring branch in `query.ts`. Each scenario's expected winner matches what the algorithm produces (see scenario notes above).
2. **DOM-omission semantics** — the slot components return `null` deterministically when both `promotion` and `fallbackContent` are absent. React renders nothing.
3. **Build correctness** — `tsc -b` clean, `vite build` clean, `biome lint` clean.
4. **RLS contract** — the active-window predicate is enforced in `promotions_select_active`, not in the reader query. Verified by reading the migration SQL.

Butch should run scenarios 1-6 in Supabase Studio against the live DB after `is_admin = true` is set on his bee row, and visit each astra to confirm visual behavior. Scenarios are designed to be cumulative — running them in order reproduces the spec's "empty → atom-specific → catch-all → priority outranks" progression.

---

## Architectural notes / surprises

1. **`atom_id` is text, not uuid.** Confirmed at schema-architect handoff time — production atoms are slug-keyed (e.g. `'justice/freedom-of-speech'`). The migration uses `TEXT` and `Promotion.atom_id` matches.

2. **Hybrid resolution preserved astra agency.** Astras can disable any slot by setting `enabled: false` on its `SlotConfig`, override `feedInlinePosition`, or inject a default fallback `<strong>` block per slot. v1 ships all defaults and zero fallbacks per spec ("all empty until DB seeded").

3. **`SidebarPromotedSlot` mount is gated on rail expansion.** The right rail (`PlatformRail.tsx`) is icon-only in collapsed mode; rendering a content block there made no visual sense at 56px width. The slot becomes visible when a Bee expands the rail (hover or pin). A future iteration could move this to a dedicated right-content sidebar within surfaces, but v1 reuses the existing rail.

4. **TopTicker scrolling is implemented as a duplicated track + 50% translate.** The marquee track is rendered twice side-by-side; the keyframe slides translateX from 0% to -50% over 40s, so when the cycle wraps the second copy is exactly where the first copy was. Visually continuous. CSS-only — no JS animation loop. Static behavior renders a single static block, no animation.

5. **Loading state hides the slot.** While the DB query is in flight, the slot returns `null` — no skeleton, no flicker. First paint is empty, ~50ms later the slot resolves. Acceptable because v1's DB is empty and no slot will populate; once content arrives, the latency is dominated by network + RLS evaluation, both fast on Supabase Pro.

6. **Code 23 parallel work — coordination.** Code 23 (Component C — Geo lens) ran in parallel with their changes touching `pillar.types.ts`, `atlasintel.ts`, `rebelution-fyi.ts`, `App.tsx` plus new `src/lib/geo/` and `src/components/geo/` directories. During the session both branches' uncommitted changes co-existed in the working tree before being separated cleanly via `git checkout`. Code 24's branch contains **only** Component D files; Code 23's `defaultGeo` field on `PillarConfig` and `<GeoLensBar />` mount in `App.tsx` are NOT present here. Butch will need to merge in this order:

   - Merge `feat/phase-c-component-c-geo-lens` first (introduces `GeoLocation` type + `defaultGeo` field).
   - Merge `feat/phase-c-component-d-promotion-slots` second. The pillar files will conflict on the comment header and the closing brace area; resolution is straightforward — keep both `defaultGeo` and `promotionSlots` fields. `App.tsx` will conflict on the closing `</Routes>` area; resolution is to mount both `<GeoLensBar />` (Code 23) and `<TopTickerSlot />` (Code 24) — the Code 24 placeholder comment can be removed at merge time.

   Alternatively, Butch can merge in the reverse order; conflicts are similar.

7. **Pre-existing TS errors in `src/components/profile/ProfileLocationEditor.tsx`** (Code 23's territory) were observed during a tsc pass when both branches were intermixed. Those are not present on this branch (the file lives in Code 23's untracked tree, not on `main` or here). Code 23 will ship clean once they land their fixes.

---

## Deferred / explicitly out of scope

- **Bottom-scrolling slot** (per D-2): "Deferred to v2."
- **Admin write UI** (per D-5): "v1 admin via Studio SQL workflow + documentation. v1.5/v2 admin UI via theMANUAL HQ first section."
- **Bee-purchase flow** for promotion slots: tracked as Open #18, blocked on BLiNG! economy + atlasADs.biz astra.
- **Tag Progenitor royalty plumbing** for `atom_id`-targeted promotions: schema in place, runtime route is post-BLiNG!.
- **City / neighborhood / region geo matching**: schema columns present (queryable in v2 with no migration), reader is country-only at v1.
- **Algorithmic fallback content** (recommended/trending derivations): "deferred to v2 as separate engineering work."
- **HTML sanitization at render** (XSS hardening): admin-authored content only at v1, RLS-gated to `is_admin = true`. A sanitizer pass should land before any third-party promotion-write flow opens.

---

## Acceptance criteria — checklist

- [x] PillarConfig schema extended with `promotionSlots`, `SlotKey`, `SlotBehavior`, `SlotConfig` types
- [x] All three astras (`atlasintel`, `rebelution-fyi`, `atlasunited`) carry canonical default slot config
- [x] `usePromotionSlot` hook present at `src/lib/promotions/usePromotionSlot.ts` with the documented input signature
- [x] Three slot components present at `src/components/promotions/{TopTickerSlot,SidebarPromotedSlot,FeedInlineSlot}.tsx`
- [x] `TopTickerSlot` mounted in App.tsx between `<SiteHeader />` and `<Routes>`
- [x] `SidebarPromotedSlot` mounted in shared right rail (expanded mode)
- [x] `FeedInlineSlot` injected at position N in `ThreadList`
- [x] Empty-state semantics: all three slots return `null` when both DB and fallback are absent — no DOM emitted
- [x] Feed-inline empty position fills with regular feed content (no gap)
- [x] Cascade scoring: atom > branch > realm > astra > geo-country > catch-all, with priority tiebreak
- [x] Geo matching is country-only at v1
- [x] No admin write UI built
- [x] No banned language firewall words in any new code (verified via grep on banned terms across new files: `buy`, `sell`, `purchase`, `mint`, `MINT`, `invest`, `trade`, `market`, `price`, `customer` — zero matches)
- [x] tsc clean
- [x] vite build clean
- [x] biome lint clean
- [x] No file in Code 23's territory modified (`src/lib/geo/`, `src/components/geo/`, profile / bee_profiles queries)
- [x] Branch pushed to `origin/feat/phase-c-component-d-promotion-slots`
- [x] **Not** merged to main — awaits sequential review and merge with Code 23

---

## Merge complete (appended 2026-05-08T17:19Z)

**Sequence:**
1. `feat/phase-c-component-c-geo-lens` merged into `main` with `--no-ff` (no conflicts) — merge commit **`f864913`** (over Code 23 commit `0fb4992`).
2. `main` pushed to origin.
3. `feat/phase-c-component-d-promotion-slots` merged into `main` with `--no-ff` — merge commit **`3408009`** (over Code 24 commit `93a408d`). **Five files conflicted**, all resolved by keeping both Code 23 and Code 24 additions:
   - `src/App.tsx` — kept both `import { GeoLensBar }` and `import { TopTickerSlot }`; kept `<GeoLensBar />` after `<Routes>` and dropped the placeholder `{/* TODO Code 23 */}` comment from Code 24's tree (its job was done by the actual mount).
   - `src/lib/pillars/pillar.types.ts` — kept both header lines (v3 + v4), kept `import type { GeoLocation }`, kept `defaultGeo?: GeoLocation` field adjacent to `promotionSlots`. Field order preserved: `defaultGeo` immediately before `promotionSlots`.
   - `src/lib/pillars/{atlasintel,atlasunited,rebelution-fyi}.ts` — kept both header lines (v2/v3 + v3/v4) and both fields (`promotionSlots: { ...DEFAULT_PROMOTION_SLOTS }` and `defaultGeo: 'Global'`).
   - No conflicts in `ProfilePage.tsx` (Code 23 only touched it) or in any of the new directories (`src/lib/geo/`, `src/components/geo/`, `src/components/profile/`, `src/lib/promotions/`, `src/components/promotions/`).
4. Verification before pushing the merge commit: `npx tsc -b` → exit 0; `npm run build` → exit 0 (242.20 kB main bundle, 5.58s); `npm run lint` (Biome on `./src`, 77 files) → exit 0.
5. `main` pushed to origin: `f864913..3408009`.
6. Both feature branches deleted **local** and **remote**.

**Deploy:** Railway picked up the push and rolled the new bundle live within ~22s of the polling start. Both `themanual.tech` and `atlasintel.fyi` now serve `assets/index-B5V9Vhy9.js` (256.8 kB). Verified the live bundle contains: `honeycomb:geo:search-location` (Code 23 storage key, 1 hit), `top-ticker`/`TopTicker` (Code 24, 2 hits), `Geo lens`/`GeoLensBar`/`geo-bar` (Code 23, 1 hit). HTTP 200 on both apex hosts.

**Final state:**
- `main` HEAD: `3408009` (merge of Code 24)
- Phase C Components A, B, C, D all SHIPPED (commits `15f1047`, `d6eaca7`, `0fb4992`, `93a408d`) and live in production.
- Schema commit `f8a2d5d` already provisioned all foundations needed (`bee_profiles`, `promotions`, `bees.is_admin`, `bling_free` rename).

**Surprises during merge:**
- Mid-session, the working tree was reverted to a pre-Code-23 state (likely `git checkout main` between the two `--no-ff` merges), which masked Code 23's `defaultGeo` additions in the file-modified system reminders. The branch on origin always had the correct content; the working-tree reverts were superficial. Final merge SHAs are correct.
- Code 24 placed its audit inside the repo at `shared/notes/audits/...` (tracked in git as part of `feat/phase-c-component-d-promotion-slots`). Code 23's audit lives in `HONEYCOMB/shared/notes/audits/...` (untracked, matching the existing pattern of audit files in that folder). The two audits live in different repos but cover the matching pair of components.

**NOT done in this session:**
- Browser smoke testing of the live deploy (Butch's review task — flagged in both audits).
- Seeding `promotions` rows via Supabase Studio.
- Setting any bee's `is_admin = true` (Butch must do this manually before the admin write path is testable).

🐝
