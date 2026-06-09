# CLONING_PATTERN.md

Canonical reference for cloning a Cat 1 astra from an existing one in the HONEYCOMB RING constellation.

- **Audience:** future Code sessions kicking off Cat 1 astra builds.
- **Reading time:** <10 min.
- **Outcome:** ship a working Cat 1 clone in 30–60 minutes, no mid-build decisions required.
- **Status:** v1 — authored 2026-05-07 from P1 (AtlasINTEL.fyi), P2 (Rebelution.fyi), P3 (AtlasUNITED.fyi) precedents.

---

## 1. What gets cloned vs. what stays universal

Astras are **configs and skins over universal surfaces**. The boundary is sharp.

### 1.1 Per-astra (varies — defined in AstraConfig)

Every Cat 1 astra is fully described by a single `AstraConfig` object. Schema: `src/lib/astras/astra.types.ts` (v2, 36 lines).

Fields that vary:

- `slug` — registry key, lowercase, hyphenated for multi-word (e.g. `'atlasintel'`, `'rebelution-fyi'`)
- `hosts[]` — apex + www; subdomains added as needed
- `wordmark` — display string in expanded SiteHeader; brand-exact casing (load-bearing)
- `wordmarkShort?` — optional condensed form; falls back to `wordmark.toUpperCase()`
- `primarySurface` — surface slug from `src/lib/surfaces.ts SURFACES[]`; rendered at `/`
- `constellation` — `'honeycomb' | 'atlasnation'`; drives sidebar palette + lexicon
- `accent` — hex color; drives right-sidebar rotation + favicon tint
- `copyOverrides` — exact-string map applied at render time (case-sensitive)

### 1.2 Universal (does not vary — shared across all astras)

- **Surfaces** — `src/lib/surfaces.ts` (the universal surface library; astras pick a `primarySurface`, never define new ones)
- **Spine** — top bar, sidebars, BLiNG! drop, AtlasOracle wallet
- **Logic** — RLS, RPCs, BLiNG! mechanics (Drops/Drips), auth, settlement
- **Auth** — Supabase Auth + RLS canon (resolved 2026-05-07; no per-astra auth config; no SHIELD astra)
- **Settlement** — Stripe + BTC dual-rail (resolved 2026-05-07; foundation-level, not per-astra)

If a "astra-specific" need touches anything in the universal list, it is **not a Cat 1 build** — escalate to Butch.

---

## 2. The cloning procedure

### 2.1 Pre-flight checklist

Before opening Code:

- [ ] Astra slot exists in MMF v2.2 §6 constellation
- [ ] Domain owned (apex + www DNS pointed at Railway)
- [ ] Spec file present at `shared/astra-specs/{slug}.md`
- [ ] Accent color locked (hex, distinct from neighboring astras in same constellation)
- [ ] `primarySurface` chosen — must match an entry in `src/lib/surfaces.ts SURFACES[]`
- [ ] `wordmarkShort` decision made (see §4)
- [ ] Constellation membership confirmed (`'honeycomb'` vs `'atlasnation'`)
- [ ] `copyOverrides` decision made (default: `{}`)

### 2.2 Build steps

1. **Create the astra config file:** `src/lib/astras/{slug}.ts`. Use one of the three reference configs verbatim as the template (§5–§7). Keep the leading comment block — it tracks build provenance (date, constellation, surface choice, v1 caveat, spec link).

2. **Register in `ASTRA_REGISTRY`:** edit `src/lib/astras/registry.ts`. Append two lines: an `import` near the top, and the exported config object in the array. The registry is **append-only** — never reorder existing entries.

3. **Apply skin from BRANDoSOPHIC** if the astra has a custom brand kit (logo, type ramp, secondary palette). If not, the constellation default applies. See MMF v2.2 §25.

4. **Set `copyOverrides`** if the astra diverges from canonical lexicon. Empty `{}` is the default — most v1 astras ride canonical HoneyComb lexicon (Bees, Drips, Drops, BLiNG!). See §3.2 for the AtlasNation override pattern.

5. **Verify build:** `npm run build`. Fix type errors before committing. Never push if build fails.

6. **Deploy:** push to main → Railway auto-deploys. Verify the new host resolves at the new wordmark within 60s.

### 2.3 Validation checklist (post-deploy)

- [ ] `https://{slug}.{tld}` resolves and renders the primarySurface
- [ ] Wordmark displays correctly in SiteHeader (expanded + collapsed states)
- [ ] Right-sidebar accent rotation includes the new accent color
- [ ] BLiNG! drop, AtlasOracle wallet, top bar all render unchanged (universal spine)
- [ ] No console errors related to host resolution or surface lookup
- [ ] `resolveAstraByHost('{host}')` returns the new config in browser devtools

If any check fails, do not consider the astra shipped. Roll back the commit and re-plan.

---

## 3. Constellation handling

HoneyComb and AtlasNation are dual constellations — both ride the same universal spine, but differ in tonal palette and lexicon.

### 3.1 Sidebar palette

`AstraConfig.constellation` drives the sidebar tonal palette. No code changes needed beyond setting the field correctly. The accent color rotation pool is constellation-scoped.

### 3.2 Lexicon swap (Bees → Members)

AtlasNation astras may swap "Bees" → "Members" via `copyOverrides`:

```ts
copyOverrides: {
  'Bee': 'Member',
  'Bees': 'Members',
  'bee': 'member',
  'bees': 'members',
}
```

Match is **case-sensitive exact-string**. Plurals and lowercase variants are separate keys.

**v1 reality:** P1 and P3 (both AtlasNation) ship with `copyOverrides: {}` and ride HoneyComb's "Bees" lexicon. The override map fills in v2 when the AtlasNation lexicon is fully canonical.

### 3.3 Accent color rotation

Right-sidebar rotates accent colors from a constellation pool. `AstraConfig.accent` adds the astra's color to its constellation's pool. Pick a hex visually distinct from neighboring astras in the same constellation.

**Derivation patterns observed:**
- **AtlasNation:** P1 derived its accent (`#4A6E96`) by darkening the chosen primarySurface color (`intel` = `#6B94C8`) by ~30%. P3 picked a warm orange (`#C16E2A`) independent of its primarySurface (`rule` = `#E88938`) but still in the warm family.
- **HoneyComb:** P2 picked sky blue (`#87CEEB`) as the first HoneyComb-constellation accent — chosen to be visually distinct from any AtlasNation accent, not derived from the primarySurface.

---

## 4. Dual-wordmark pattern (lesson from P2 Rebelution.fyi)

`wordmarkShort` is optional. The judgment rule:

- If the wordmark is already display-stable when uppercased — i.e. the brand uses an `AtlasXXX` style with a built-in caps middle (`AtlasINTEL`, `AtlasUNITED`) or is otherwise short/uppercase by design — **omit** `wordmarkShort`. SiteHeader's `toUpperCase()` fallback is fine.
- If the wordmark is a normal sentence-case word that loses brand affordance when uppercased — e.g. `'Intelligence'` → `'INTELLIGENCE'` would crowd the chip and look generic — **set** `wordmarkShort` to the brand-canonical short form (e.g. `'INTEL'`).

This was the v2 schema bump on 2026-04-27 — discovered during P2 build, not pre-designed. The schema now accommodates either pattern.

---

## 5. P1 — AtlasINTEL.fyi (precedent: AtlasNation Cat 1 baseline)

**File:** `src/lib/astras/atlasintel.ts`

```ts
// AtlasINTEL.fyi astra config — first Cat 1 astra (2026-04-27).
// AtlasNation constellation. Reuses the intel (Forum) surface from TheMANUAL.tech.
// v1: no copy overrides, no schema changes. Spec: shared/astra-specs/atlasintel.md.

import type { AstraConfig } from './astra.types';

export const atlasintelAstra: AstraConfig = {
  slug: 'atlasintel',
  hosts: ['atlasintel.fyi', 'www.atlasintel.fyi'],
  wordmark: 'AtlasINTEL',
  primarySurface: 'intel',
  constellation: 'atlasnation',
  accent: '#4A6E96', // deeper steel blue, ~30% darker than INTEL surface #6B94C8
  copyOverrides: {}, // v1: ride HoneyComb's "Bees" lexicon; override map fills in v2
};
```

**Pattern notes:**

- AtlasNation constellation, `intel` (Forum) primary surface
- No `wordmarkShort` — `AtlasINTEL` is display-stable when uppercased
- Accent derived as a darker variant of the INTEL surface color (`#6B94C8` → `#4A6E96`, ~30% darker) — recommended derivation when reusing a surface color for an AtlasNation astra
- `copyOverrides: {}` — rides canonical lexicon

**Why the build was autonomous:**

- Spec file (`shared/astra-specs/atlasintel.md`) was complete before build
- Schema (`AstraConfig`) was already defined from prior planning
- Registry pattern was scaffolded (registry.ts importing the new config + appending to array)
- No new surface needed (`intel` already existed in `surfaces.ts`)
- No copy overrides needed
- All decisions were locked at spec time → Code had zero ambiguity

**Replicate this pattern:** any future Cat 1 astra with no copy overrides and an existing surface should be a fully autonomous Code build.

---

## 6. P2 — Rebelution.fyi (precedent: HoneyComb Cat 1, dual-wordmark)

**File:** `src/lib/astras/rebelution-fyi.ts`

```ts
// Rebelution.fyi astra config — second Cat 1 astra (2026-04-27).
// HoneyComb constellation. Reuses the intel (Forum) surface from TheMANUAL.tech.
// Dual-wordmark: expanded header shows 'Intelligence'; collapsed/menu shows 'INTEL'.
// v1: no copy overrides, no schema changes. Spec: shared/astra-specs/rebelution-fyi.md.

import type { AstraConfig } from './astra.types';

export const rebelutionFyiAstra: AstraConfig = {
  slug: 'rebelution-fyi',
  hosts: ['rebelution.fyi', 'www.rebelution.fyi'],
  wordmark: 'Intelligence',
  wordmarkShort: 'INTEL',
  primarySurface: 'intel',
  constellation: 'honeycomb',
  accent: '#87CEEB', // sky blue — first HoneyComb-constellation accent
  copyOverrides: {}, // v1: ride canonical HoneyComb lexicon (Bees, Drips, Drops, BLiNG!)
};
```

**Pattern notes:**

- HoneyComb constellation (cross-constellation counter-test against P1)
- Same `intel` surface as P1, different skin
- **Dual-wordmark:** expanded shows `'Intelligence'`, collapsed/menu shows `'INTEL'`
- Triggered the v2 schema bump (added `wordmarkShort?`)
- Accent is sky blue — first HoneyComb-constellation accent, picked to be visually distinct from P1's steel blue

**Divergences from P1:**

- Different constellation (`honeycomb` vs `atlasnation`)
- `wordmarkShort` set (P1 omits it)
- Accent picked from the HoneyComb pool, not derived from the surface color
- Slug uses TLD-disambiguating suffix (`'rebelution-fyi'`) — pattern for any astra where the bare brand name might collide with future variants on different TLDs

---

## 7. P3 — AtlasUNITED.fyi (precedent: cross-surface, scaffolded)

**File:** `src/lib/astras/atlasunited.ts`

```ts
import type { AstraConfig } from './astra.types';

export const atlasunitedAstra: AstraConfig = {
  slug: 'atlasunited',
  hosts: ['atlasunited.fyi', 'www.atlasunited.fyi'],
  wordmark: 'AtlasUNITED',
  primarySurface: 'rule',
  constellation: 'atlasnation',
  accent: '#C16E2A',
  copyOverrides: {},
};
```

**Pattern notes:**

- First Cat 1 astra to use a primary surface other than `intel` — uses `rule` (Events; Social group; Tier 1)
- AtlasNation constellation, like P1 — proves the cloning pattern works across surfaces within a single constellation
- No `wordmarkShort` — `AtlasUNITED` follows the AtlasXXX display-stable-uppercase pattern
- Accent: warm orange (`#C16E2A`), distinct from P1's steel blue — both AtlasNation, accent rotation pool needs separation

**Status:** scaffolded and registered, not yet shipped to production. Awaits Phase C shared infrastructure.

**Follow-up gaps (flagged for Butch):**

- The astra config file lacks the leading comment block that P1 and P2 carry (no provenance line, no surface justification, no v1 caveat, no spec link). Future builds should match P1/P2 commenting style. Consider patching `atlasunited.ts` to add the missing header before P3 ships.
- The header comment in `astra.types.ts` v2 only mentions `wordmarkShort` for `Rebelution.fyi`. The schema is general — cross-surface astras (P3+) are valid even though early commit history suggests forum-centric origin. Consider updating the schema header comment to reflect P3 precedent.

---

## 8. What needs to happen next (Phase C dependency)

Cat 1 mass-build (8 remaining astras) is **blocked on Phase C** — shared infrastructure that this doc presumes exists:

- Astra config loader (already in `registry.ts`)
- Sidebar/header surface (already in `SiteHeader`)
- Spine strips (in progress)
- Geo lens (not yet started)
- Promotion architecture (not yet started)

Once Phase C ships, this doc should be cross-referenced from Phase C's anchor doc. If a Code session starts a Cat 1 build before Phase C is complete, halt and surface the blocker.

---

## 9. Reference pointers

- **AstraConfig schema:** `src/lib/astras/astra.types.ts` (v2 as of 2026-04-27)
- **Astra registry:** `src/lib/astras/registry.ts` (append-only)
- **Surface library:** `src/lib/surfaces.ts`
- **MMF v2.2 §6** — Astra Constellation (canonical source for astra slots)
- **MMF v2.2 §6.2** — Astra build categories (Cat 1 definition)
- **MMF v2.2 §25** — BRANDoSOPHIC + Skinning (skin substrate)
- **Astra specs:** `shared/astra-specs/{slug}.md` (per-astra prerequisite)

---

## 10. Brand convention reminders

- **HONEYCOMB RING** — never "Hive"
- **All-caps middle word** — `TheMANUAL.tech`, `AtlasORACLE.to`, `AtlasINTEL.fyi`, `AtlasUNITED.fyi`
- **BRANDoSOPHIC** — lowercase 'o'
- **Astra slug** — lowercase, hyphenated for multi-word (e.g. `'rebelution-fyi'`)
- **Wordmark casing is load-bearing** — match brand exactly, do not normalize

---

*Codified 2026-05-07 from Pin Sweep Pass 2 Q38 (Code 8). v1.*
