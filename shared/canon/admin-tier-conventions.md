# Admin Tier Conventions

**Status:** Locked · 2026-05-09
**Scope:** Source of truth for HONEYCOMB administration UX. Defines the four-tier admin framework (My Hex / Ops / Nexus / Nucleus), the self-assembly manifest pattern that lets any Astra contribute admin sections to any tier, and the visual treatment that signals tier identity.

---

## 1. The four-tier admin framework

Every administrative surface in HONEYCOMB belongs to exactly one of four tiers. The tier determines who sees the surface, where it lives on the network, and what color the content area paints.

### Tier 1 — My Hex
- **URL:** `themanual.tech/myhex`
- **Audience:** every signed-in Bee.
- **Auth:** authenticated.
- **Accent:** Bee amber `#E8B86E`.
- **Purpose:** personal space. Profile, BLiNG! balance, content history, settings, account links, sovereignty tier choice.
- **Mental model:** every Bee has a hex; the hex is their cell in the larger HONEYCOMB lattice.

### Tier 2 — Ops
- **URL:** `<property-domain>/ops` (per Astra/Nova).
- **Audience:** Bees signed in on a specific Astra/Nova where they have operator role.
- **Auth:** property-operator on the current property.
- **Accent:** that Astra/Nova's brand accent (BRANDoSOPHIC-skinnable).
- **Purpose:** in-context property work — moderation queue, skin config, member management, pinned content.
- **Mental model:** the back-of-house door at each property. Visible only to operators of that property.
- **Status:** **deferred to per-Astra build days.** Not part of the tier-1 admin scaffold (locked 2026-05-09); ships per-Astra as each Astra reaches its admin milestone.

### Tier 3 — The Nexus
- **URL:** `themanual.tech/nexus`
- **Audience:** Bees who own ≥1 Astra or Nova.
- **Auth:** property-owner (Bee with at least one row in `astra_registry` or `nova_registry` keyed to their `bee_id`).
- **Accent:** silver `#C0C0C0`.
- **Purpose:** cross-property command center. List of properties, cross-property stats, billing, sovereignty-tier upgrades, off-grid migration controls.
- **Mental model:** the point where a Bee's properties converge.

### Tier 4 — The Nucleus
- **URL:** `themanual.tech/nucleus`
- **Audience:** Five Keyholders (allowlist).
- **Auth:** keyholder. Membership is the comma-separated `KEYHOLDER_BEE_IDS` env, read **server-side only** by the `check-keyholder` Edge Function.
- **Accent:** honey gold `#FAD15E` — the sacred BLiNG! color, used here because The Nucleus is where economy/governance decisions are made.
- **Purpose:** platform-operator surface. Economy state, all-Astra metrics, governance, security, the Three Switches.
- **Mental model:** the foundational core of HONEYCOMB.
- **Cross-reference:** §31 — Three Switches & Five Keyholders.

### Auto-redirect from `themanual.tech` root

A signed-in Bee visiting `themanual.tech/` (no Astra subdomain in play) auto-redirects to `/myhex`. Anonymous visitors continue to see the marketing/home surface. This redirect is implemented in `src/App.tsx` and only fires when no `activePillar` (Astra) is detected — Astra subdomain redirects take precedence.

---

## 2. The self-assembly manifest pattern

Adding a new admin section to any tier — from any Astra's codebase, without modifying the surface pages — is a three-step pattern. The surface pages (`MyHexPage`, `NexusPage`, `NucleusPage`) call `getSectionsForTier(tier, role)` and render whatever the registry returns. They never enumerate sections themselves.

### Step 1 — Build the section component

A section is a plain React component, no props. It's responsible for fetching its own data, rendering against the tier's accent background, and respecting the dark-blue inset card pattern (see §4).

```tsx
// src/admin/sections/MySection.tsx
export function MySection() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1>...</h1>
      <div style={{ background: '#0A1628' }}>...</div>
    </div>
  );
}
```

### Step 2 — Add the section to a manifest

Manifests live in `src/admin/manifests/`. The initial manifest is `core.ts`. New manifests can be added freely; the registry aggregates all of them.

```ts
// src/admin/manifests/core.ts (or any sibling file)
import type { AdminManifest } from '../types';
import { MySection } from '../sections/MySection';

export const coreManifest: AdminManifest = {
  sections: [
    {
      tier: 'my-hex',          // 'my-hex' | 'nexus' | 'nucleus'
      slug: 'my-section',      // unique within the tier
      label: 'My Section',     // sidebar label
      icon: 'User',            // lucide-react icon name
      order: 20,               // sort within tier (lower = earlier)
      requires: 'authenticated', // 'authenticated' | 'property-owner' | 'keyholder'
      component: MySection,
    },
  ],
};
```

### Step 3 — Register the manifest

If you added a new manifest file, import it in `src/admin/registry.ts` and add it to the `ALL_MANIFESTS` array. The registry auto-aggregates.

```ts
// src/admin/registry.ts
import { coreManifest } from './manifests/core';
import { mySpaceManifest } from './manifests/myAstra';

const ALL_MANIFESTS = [coreManifest, mySpaceManifest];
```

That's it — the new section appears in the appropriate tier's sidebar, gated by the `requires` check, sorted by `order`. No changes to `MyHexPage` / `NexusPage` / `NucleusPage` needed.

### The three initial sections (canonical example)

```ts
{
  tier: 'my-hex',
  slug: 'profile',
  label: 'Profile',
  icon: 'User',
  order: 10,
  requires: 'authenticated',
  component: ProfileSection,
},
{
  tier: 'nexus',
  slug: 'properties',
  label: 'My Properties',
  icon: 'Building2',
  order: 10,
  requires: 'property-owner',
  component: MyPropertiesSection,
},
{
  tier: 'nucleus',
  slug: 'system-state',
  label: 'System State',
  icon: 'Activity',
  order: 10,
  requires: 'keyholder',
  component: SystemStateSection,
},
```

---

## 3. Role detection (`useUserRole`)

`src/lib/useUserRole.ts` is the single source of truth for the `UserRole` shape used by the registry's `requires` check.

```ts
interface UserRole {
  bee: { id: string; handle: string } | null;
  isAuthenticated: boolean;
  isPropertyOwner: boolean;
  isKeyholder: boolean;
}
```

- **`isAuthenticated`** — derived from the existing `useAuth()` Bee session.
- **`isPropertyOwner`** — true iff the Bee's UUID appears as `created_by` in either `nova_registry` or `astra_registry`. Queries fail-soft if those tables / columns don't exist yet (see §6 Schema dependencies).
- **`isKeyholder`** — fetched from the `check-keyholder` Edge Function. The function reads `KEYHOLDER_BEE_IDS` from its environment and returns a boolean. **The list never reaches the client.** If the function isn't deployed yet, the hook falls back to `false` (Nucleus shows its restricted-access message — safe default).

The hook memoizes within a render cycle (re-runs only when the underlying `bee` changes).

---

## 4. Visual treatment

The signature visual hierarchy is a **three-layer sandwich**: dark blue chrome → tier accent frame → dark blue data cards. This is what makes admin surfaces instantly recognizable as admin (vs. front-of-house Bee surfaces) and instantly distinguishable from each other (the tier accent identifies which tier you're in).

### Top bar — always `#0A0B0E`
Locked design system constant. The existing `SiteHeader` handles this; admin surfaces inherit it. **Not negotiable.**

### Sidebar — dark blue base
- **Background:** `#0A1628`.
- **Section labels (uppercase mini-headers):** muted blue `#5A7BAA`.
- **Inactive nav items:** muted blue `#6B8AB8`.
- **Active nav item:** background `rgba(tier-accent, 0.12)`; left border `2px solid tier-accent`; text `tier-accent`, font-weight `500`.

### Content area — tier accent
- **Background:** the full tier accent color (`#E8B86E` for My Hex, `#C0C0C0` for The Nexus, `#FAD15E` for The Nucleus).
- **Section headers/labels:** high-contrast dark text (e.g., `#2C1F0A` on Bee amber, `#1F1F25` on silver, `#3A2400` on honey gold).

### Result panels — dark blue inset cards
- **Background:** `#0A1628`.
- **Primary text:** `#F0F0F5`.
- **Muted/label text:** `#5A7BAA` (or sibling muted blue).
- **Border-radius:** `var(--border-radius-md)` or `8px`.
- This is the third layer of the sandwich — every data display lives in one of these cards.

### Buttons
- **Primary action on tier-accent background:** dark blue fill, accent border, accent text. Hex-clipped corners using `clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)`.
- **BLiNG! action buttons (FREE / OFFER / GIVE):** honey gold *border*, never honey gold *fill*. The fill is sacred to value-display elements.
- **No rounded pill buttons** for primary actions. Hex geometry is the platform signature.

### Honey gold `#FAD15E` is sacred
Reserved for: BLiNG! amounts; the BLiNG! badge in the top bar; the BLiNG! drop icon; freedom-ledger UI; **and The Nucleus content background**. Never used as a button fill outside of value-display elements. Pairs with bold + text-shadow glow whenever rendering a BLiNG! amount.

### Hex shapes
Logo, avatar containers, and primary buttons all use 6-sided hex geometry where reasonable. Use `clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)` for hex clipping.

---

## 5. File layout

```
src/
├── admin/
│   ├── types.ts              AdminTier / AdminSection / UserRole / TIER_ACCENT
│   ├── registry.ts           getSectionsForTier — aggregates all manifests
│   ├── AdminLayout.tsx       sidebar + content area, takes tier + sections
│   ├── manifests/
│   │   └── core.ts           the three initial sections (Profile / Properties / System State)
│   └── sections/
│       ├── ProfileSection.tsx
│       ├── MyPropertiesSection.tsx
│       └── SystemStateSection.tsx
├── lib/
│   └── useUserRole.ts        role detection hook
├── pages/
│   ├── MyHexPage.tsx         /myhex
│   ├── NexusPage.tsx         /nexus
│   └── NucleusPage.tsx       /nucleus
supabase/
└── functions/
    └── check-keyholder/
        └── index.ts          server-side Keyholder check (KEYHOLDER_BEE_IDS env)
```

---

## 6. Schema dependencies

### Requires (production today)
- `bees(id, handle, email, …)` — used by every section.
- `bling_system_state(mint_active, total_supply, mint_price)` — used by System State.

### Requires (post-tier-1-federation migration, NOT production yet)
- `astra_registry(id, slug, name, status, created_by, …)`
- `nova_registry(id, slug, name, status, created_by, parent_astra_id, …)`

The `astra_registry` and `nova_registry` tables are net new in **Lock 8** of the federation tier-1 scoping doc and have **not been applied** to production. The proposed Lock 9.6 schema also does not yet include a `created_by` column — that needs to be added when the registries land.

Until the registries ship, `useUserRole` and `MyPropertiesSection` fail-soft: queries return zero rows / count, and the Nexus shows its empty state. No errors surface to the user. This is intentional — the admin scaffold can ship before the registry migration.

### Optional (for richer Profile)
- `bees.name` — display name, falls back to `handle`.
- `bees.avatar_url` — avatar image URL, falls back to initials.
- `bees.bio` — free-form bio text. If the column doesn't exist, the bio editor is hidden gracefully (PostgREST `42703` is detected and the section retries without it).

---

## 7. Cross-references

- **Lock 9.6 — Sovereignty Tiers** (federation-tier-1-scoping.md §9.6) — the three sovereignty tiers (Standard / Dedicated / Off-Grid) are *infrastructure* tiers, separate from the four *admin* tiers above. They are surfaced to Bees through The Nexus (tier-3 admin) when those Bees own properties. Don't confuse the two tier numberings: admin Tier 1 (My Hex) ≠ sovereignty Tier 1 (Standard).
- **Lock 8 — Per-Astra/Nova RLS** (federation-tier-1-scoping.md §8) — provides the `astra_registry` and `nova_registry` tables that power isPropertyOwner detection.
- **§31 — Three Switches & Five Keyholders** (HONEYCOMB MMF) — defines the Keyholder allowlist semantics that gate The Nucleus.
- **`HONEYCOMB_GLOSSARY_v1.md`** — canonical definitions of My Hex, Ops, The Nexus, The Nucleus, Admin Tiers (1–4).

---

## 8. Out of scope (for this doc)

- Tier 2 (Ops) implementation — deferred to per-Astra build days. Each Astra's `<domain>/ops` is built when that Astra reaches its admin milestone. The manifest pattern in §2 supports Tier 2 the same way it supports tiers 1/3/4 (just use `tier: 'ops'` and adjust the registry to recognize it; not in this scaffold's `AdminTier` union pending Tier-2 design pass).
- BLiNG! balance / content history / settings inside My Hex — deferred to follow-up build days; Profile is the only My Hex section in tier-1.
- Cross-property stats / billing / sovereignty-tier upgrades inside The Nexus — same; My Properties is the only Nexus section in tier-1.
- Three Switches UI inside The Nucleus — System State is the only Nucleus section in tier-1.
