# Handoff: FreedomBLiNGS — The Sovereign Ledger of the HoneyComb

## Overview
FreedomBLiNGS.com is **"The Sovereign Ledger of the HoneyComb"** — the economic heart of the platform, where a Citizen's **BLiNG!** (Perks / the Freedom Ledger) lives, is earned, and moves. It is **not** a bank, a crypto wallet, or a trading app. The tone is sovereign, transparent, empowering, dignified — never gamified, never extractive. People **earn** by contributing and creating; they never "buy in."

This package documents a complete, high-fidelity design exploration covering the member wallet/ledger experience plus the Phase-2 economic surfaces.

## About the Design Files
The files in this bundle are **design references created in HTML/CSS + React-via-Babel** — prototypes showing intended look and behavior. **They are not production code to copy directly.** The task is to **recreate these designs in the target codebase's environment** (the live `themanual-tech` stack and its established patterns/libraries), wiring them to the real `bling_*` prod tables. Where no component exists yet, follow the codebase's conventions.

Two entry points are included:
- **`FreedomBLiNGS — Sovereign Ledger.html`** — the *design board*: every surface laid out in stacked, captioned browser/phone frames for review. Best for seeing all 19 surfaces at once.
- **`FreedomBLiNGS — Prototype.html`** — the *clickable prototype*: one routed member app (hash routing) where the sidebar navigates between surfaces, the brand opens the constellation launcher, and ledger rows open Provenance. Best for feel and flow.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, components, and interactions are settled. Recreate pixel-faithfully using the codebase's libraries. The visual system is defined in CSS custom properties across `styles.css` (the token/component foundation) and `aurora.css` (the current default theme layer) — port these tokens first.

> **Current default theme is `aurora`** (set on `<html data-theme="aurora">`). Aurora is an **additive** layer in `aurora.css` on top of `styles.css`: a crisp **black + white + BLiNG!-gold** future-facing look — white surfaces, near-black ink, gold-leaf shimmer on the diamond marks. The original `light`/`dark` themes still exist and are untouched. Port `styles.css` first (tokens + components), then `aurora.css` as the active skin.

---

## ⚠️ Two rules that override everything

### 1. The Language Firewall (HARD — non-negotiable naming)
- **BLiNG!** — always Perks / Freedom Ledger. NEVER "token," "coin," "crypto," "currency-for-sale."
- Value is **FREE**'d into existence (verb). NEVER "minted."
- Citizens **GIVE** / **GET** / **OFFER**. NEVER "buy" / "sell."
- **HONEYCOMB**, never "Hive." **Astra**, never "pillar."
- 1 BLiNG! = 1,000,000 FNU (atomic sub-unit). Display BLiNG! to people; FNU is under-the-hood.
- **No "buy BLiNG!" button, ever.** The fiat membrane is one-way: money/BTC can come IN (crowdfunding, subscriptions); BLiNG! never converts OUT.

### 2. Verified numbers vs. illustrative numbers
Only these are **prod-verified and safe to display as fact** (from `bling_system_state`):
- **Hard cap (the Sacred Sum): `111,222,333,333,222,111`** BLiNG! (18-digit palindrome)
- **Supply starts at 0** — FREE'd on demand, never pre-seeded
- **The well** (Royal Jelly Treasury) = cap − total_supply
- **Operations Buckets: `333,333,222,111`** (allocated outside the well at genesis)
- **Comb Tithe: 0.99%** (opt-out)
- Precision: 6 decimals (numeric 24,6)
- **Affiliate weights: 34 / 21 / 13 / 8 / 5** (L1–L5, Fibonacci, Producer-gated, lifetime)
- **Demurrage tiers: 8 / 5 / 3 / 1%** with an **OG −0.5%** reduction
- **Honey Gradations: $0 / $3 / $8 / $13** (Wildflower / Clover / Manuka / Royal Jelly)
- **Rank ladders: BLiNG! Rank (33 levels)**, **The Ring (9 levels)** — earned, unbuyable

**Everything else shown** (a Citizen's balance of 12,480, ledger entries, multipliers ×1.5/×1.8, member counts, pool sizes, accrual amounts, escrow timelocks, demurrage *trigger bands*, the BLiNG! DNA code format) **is ILLUSTRATIVE UX** and must be replaced with real data read from prod before launch. Each surface carries an explicit "illustrative until econ v3" footnote — preserve that discipline.

> **Verify-from-prod method (locked):** before wiring any displayed number or subsystem behavior, READ it from prod (`bling_system_state`, `bling_transactions`, `bling_pots`, `bling_escrows`, `bling_retirement_escrows`, `bling_emergency_fund_escrows`, and the issuance RPCs). Do not ship numbers from memory or from these mocks.

---

## Design Tokens (port these first — all in `styles.css`)

**Color** — defined as CSS custom properties, themed via `html[data-theme="light"|"dark"]`. Warm paper + a single honey-gold accent. All colors are authored in **oklch**.

Light theme:
| Token | Value | Use |
|---|---|---|
| `--paper` | `oklch(0.971 0.013 84)` | app background (warm off-white) |
| `--paper-raised` | `oklch(0.992 0.008 86)` | cards |
| `--paper-sunken` | `oklch(0.948 0.016 82)` | wells, tracks, sidebar |
| `--ink` | `oklch(0.272 0.021 64)` | primary text (warm near-black) |
| `--ink-soft` | `oklch(0.455 0.022 64)` | secondary text |
| `--ink-faint` | `oklch(0.612 0.020 66)` | tertiary |
| `--ink-ghost` | `oklch(0.74 0.016 70)` | faint marks |
| `--line` | `oklch(0.895 0.014 80)` | hairlines |
| `--line-strong` | `oklch(0.842 0.018 78)` | stronger borders |
| `--accent` (honey) | `oklch(0.745 0.128 74)` | fills, the BLiNG! mark |
| `--accent-deep` | `oklch(0.565 0.118 64)` | accent text/icons on light |
| `--accent-soft` | `oklch(0.935 0.045 82)` | accent tint backgrounds |

**Aurora theme** (`aurora.css`, the current default) overrides the paper/ink tokens to crisp white + near-black while keeping the same honey-gold `--accent` — copy its `:root`/`html[data-theme="aurora"]` block verbatim alongside the base tokens. Dark theme swaps to warm near-black paper (`oklch(0.205 0.012 68)`) with brighter honey (`oklch(0.80 0.128 78)`). Two alternate accents exist (`data-accent="copper"|"verdant"`), chroma/lightness matched, hue varied. **Full light+dark+accent sets are in `styles.css` `:root` blocks — copy them verbatim.**

**Important CSS quirk we hit:** do **not** put `transition: color/background` on `body` when the value comes from a `var()` — Chromium fails to recompute it on variable change, stranding inherited text at the old theme color. Theme switches should be instant (no transition on the var-based properties).

**Typography** — driven by `html[data-type]`. Default (locked) is **"grotesque"**. Numerals are always **mono + tabular** (`font-variant-numeric: tabular-nums`) — a ledger must read like an honest document.
- `grotesque` (default): headings + body **Hanken Grotesk**; numerals **IBM Plex Mono**
- `charter`: headings **Spectral** (serif); body **Spline Sans**; numerals **Spline Sans Mono**
- `document`: headings **Newsreader**; body **Public Sans**; numerals **IBM Plex Mono**

**Density** — `html[data-density="compact"|"regular"|"airy"]` scales a `--sp` multiplier (0.78 / 1 / 1.26) applied to macro paddings/gaps, plus `--hero` and `--radius`. Default (locked): **compact**.

**Spacing / radius / shadow:** radius `--radius` (11/14/16px by density); shadows `--shadow` and `--shadow-sm` (soft, warm, low-opacity). Hairline borders everywhere (1px `--line`).

**The BLiNG! mark:** an abstract **diamond** (a rotated square, `.bmark` / `.heromark`) — a gem, deliberately *not* a honeycomb/hexagon. Outline form for default, filled accent for emphasis, a nested-diamond "hero" form for big balances. The wordmark logo (`Mark`) is two concentric rotated squares. **Do not introduce hexagon imagery.**

---

## Surfaces / Views
The member app has a fixed left **Sidebar** (brand = constellation launcher; "Ledger" group + "Member" group of nav items; member chip at the foot). Each surface below renders in the main column. Full component markup + classes live in the per-surface files listed under **Files**.

1. **Balance** (`surfaces.jsx` → `Balance`) — hero balance (mono, huge), standing badge ("In good comb"), three stat cards (FREEd / GOT / GAVE this season), an honesty strip (Capped · Member-owned · Transparent), "The promise" creed, and a recent-movement preview (clickable → Provenance).
2. **Standing & identity** (`standing.jsx`) — identity hero (avatar, self-held sovereign ID chip, "In good comb", "Sovereign · self-held keys"); **Rank & Ring ladders** (Rank 14/33, Ring 4/9 — segmented bars, "earned, never bought"); "How standing is earned" facet grid; revocable **consent ledger** (Astra permissions + Revoke); guardians (social recovery, "Any 3 of 5"); export-identity note.
3. **Earning — the faucets** (`faucets.jsx`) — "Just FREE'd to you" recognition hero; three faucet cards (**Genesis** / **Drops** ×mult / **Drips** ×mult); "Recent FREEs — and why" list. Earning as recognition, not transaction.
4. **Circulation — the melt** (`demurrage.jsx`) — non-punitive demurrage: "In motion" status, "returned to the well → FREE'd again" panel; tier ladder **8/5/3/1%** with the 1% floor active and **OG −0.5%** badge; "Where the melt goes" flow (Idle → Well → FREE'd again). Tone: healthy circulation, never a fee, never to us.
5. **The Ledger** (`surfaces.jsx` → `Ledger`) — grouped-by-day transaction history; each row has icon, description, type tag (FREEd/GOT/GAVE/OFFER), counterparty, +/− amount (ink-toned, **no casino red/green**), running balance; rows are **clickable → Provenance**. Append-only footer.
6. **Provenance — trace any BLiNG!** (`provenance.jsx`, overlay) — opened from any ledger row. Vertical lineage timeline from origin (FREE'd into existence) through GAVE/GOT hops to "now"; **BLiNG! DNA code** chip + **"Issued from: the well · Royal Jelly Treasury"**; "origin sealed · cannot be rewritten" footer.
7. **The Open Books** (`openbooks.jsx`) — public, genesis-truth economy dashboard: **Sacred Sum** hero with supply meter at **0%**; stats (FREE'd `0` / In Citizens' hands `0` / Operations Buckets / Comb Tithe 0.99%); cap anatomy (the well = full Sacred Sum / Ops Buckets / FREE'd `0`); "How BLiNG! is FREE'd" (Genesis/Drops/Drips); genesis empty-feed. Read-only — wire this first; it's meant to be public.
8. **Commons — shared treasuries** (`commons.jsx`) — a member-owned shared wallet (Riverkeepers): shared balance, in/out flows, named stewards, the commons ledger (public to all keepers), open decisions with support bars, "GIVE to this commons."
9. **The Charter** (`charter.jsx`) — the readable constitution: preamble with drop-cap, **8 articles** (I–VIII), and a sealed/ratified footer with a public amendment log. Document-grade typography.
10. **Give · Get · Offer** (`surfaces.jsx` → `Move`) — the move-value composer (GIVE active): recipient, amount (mono), note, fee-free summary, "GIVE … to …" button; mode tabs; recent members; "sovereign by design" note. Never "buy/sell."
11. **For business — accept BLiNG!** (`business.jsx`) — merchant console (own top bar, not the member sidebar): "Accepting BLiNG!" master switch; **per-member intake limits by day/week/month/year** (toggle + editable amount each — *merchant-chosen values, safe*); member-side checkout cap-meter preview; whole/fee-free note.
12. **Honey Gradations** (`gradations.jsx`) — subscription tiers **$0/$3/$8/$13** (Wildflower current / Clover / Manuka featured / Royal Jelly), 3 perks each, CTAs. Fiat-in membrane note: membership never buys BLiNG!.
13. **Your lineage — affiliate chain** (`affiliate.jsx`) — Fibonacci **34/21/13/8/5** across **L1–L5**; hero (lineage size, FREE'd this season, the curve); chain rows with tapering weight bars + keeper counts. Framed as productive action, bounded, non-pyramid.
14. **Legacy — retirement & succession** (`retirement.jsx`) — *sensitive, designed with gravity*: retirement accrual (amount, active years, vesting state); succession heirs with shares summing 100%, "declared & sealed"; **"the final waggle"** note (passing BLiNG! onward at death).
15. **The comb has your back — mutual aid** (`emergency.jsx`) — opt-in emergency fund: opt-in switch + %, your set-aside + cover status; Accrue/Draw/Honored steps; the comb's shared net stats; solidarity note. Decided in the open, never an insurer.
16. **Escrow — value held in honor** (`escrow.jsx`) — for OFFERs needing assurance: active escrow card (parties, the OFFER, amount held, status track Funded→Held→Released, timelock auto-release, Release / Open-a-dispute); "how escrow protects both"; trust-without-a-custodian note.
17. **The HoneyComb constellation** (`constellation.jsx`, overlay) — app-launcher opened from the brand: the 7 HoneyComb Astras (FreedomBLiNGS *here* + FreedomNETWORK, TheMANUAL, MiniWaves, DingleBERRY, BLiNGster, TheWORKSHOP) with Live/Beta/Soon status; "your balance follows you across the comb."
18. **Go Dark — offline P2P** (`godark.jsx`, phone screens) — disaster resilience: offline signed GIVE via QR + offline allowance; pending-settlement queue; **MinuteMen relay marked "concept · illustrative."** Verified core only: sign offline (`offline_signature`) → settle on reconnect.
19. **In your pocket** (`surfaces.jsx` → `PhoneBalance`/`PhoneMove`) — responsive phone screens proving the same ledger folds to mobile.

## Interactions & Behavior
- **Routing** (prototype): hash-based (`#balance`, `#ledger`, …); sidebar nav items call `ctx.go(id)`; current view persists in the URL.
- **Constellation launcher**: brand button / "Astras" nav → overlay (`ConstellationOverlay`) over a dimmed, blurred app; backdrop or ✕ closes.
- **Provenance**: any ledger row with an amount is clickable → `ProvenanceOverlay` for that entry.
- **Overlays**: absolutely positioned over a `position:relative` shell, with a translucent ink backdrop (`color-mix(in oklab, var(--ink) 40%, transparent)` + blur). Panel entrance animates **transform only** (never `opacity:0`-from) so a throttled/exported frame never strands it invisible.
- **Move-value flow sheets** (`flows.jsx`): GIVE / GET / OFFER open as closeable modal sheets reusing the overlay pattern (frosted backdrop, click-out, ✕, Escape). They write to a shared **bling store** (`useBlingStore`) that holds the live balance + appended ledger rows and persists to `localStorage` — in production this becomes your prod-backed transaction state, not local storage.
- **First-run onboarding** (`onboarding.jsx`): a 3-step `OnboardWizard` — claim a self-held sovereign identity, choose up to 5 guardians (social recovery), and FREE a first BLiNG! grant. Closeable like every overlay.
- **Tweaks panel** (optional, dev/preview affordance): toggles theme (aurora/light/dark), accent (honey/copper/verdant), density, typeface — all by setting `data-*` on `<html>`. In production these become user settings or are dropped; the defaults (light · honey · compact · grotesque) are the canonical brand.
- **No infinite/decorative animation** on content. Respect `prefers-reduced-motion`.
- **Responsive**: surfaces use **container queries** on the frame/stage (`@container (max-width:720px)`) to collapse the sidebar to a top bar and stack grids — port to your responsive system (container queries or breakpoints).

## State Management
- `view` (current route), `constellationOpen` (bool), `provenanceEntry` (object|null), and the tweak values (theme/accent/density/typeface). In a real app: route state from the router; overlays from local UI state; theme/density as user prefs; **all economic data from prod queries** (balances, ledger, supply, escrows, etc.).

## Screenshots
Reference captures of each surface (aurora theme, the current default) are in **`screenshots/`**, numbered to match the surface list above (`01-balance.png` … `17-constellation.png`). They show intended look only — wire real prod data, not the illustrative numbers shown.

## Assets
- **No external images.** All iconography is CSS/SVG primitives (rotated-square diamonds, simple marks). Fonts are Google Fonts (Hanken Grotesk, IBM Plex Mono, Spectral, Spline Sans/Mono, Newsreader, Public Sans) — use the codebase's font-loading approach.
- The faux-QR on Go Dark is a CSS grid placeholder; replace with a real signed-payload QR.

## Files
Design references (recreate, don't ship):
- `FreedomBLiNGS — Sovereign Ledger.html` — the design board (all surfaces, stacked frames)
- `FreedomBLiNGS — Prototype.html` — the clickable routed prototype
- `styles.css` — **the entire visual system** (tokens, components, responsive). Start here.
- `frames.jsx` — shell: logo/wordmark, the BLiNG! diamond marks, Sidebar, DesktopFrame, the `FrameCtx` (launch/trace/go)
- `aurora.css` — the **current default theme** (black + white + gold), additive over `styles.css`
- `flows.jsx` — GIVE/GET/OFFER modal sheets + the shared `useBlingStore` (live balance + ledger appends, localStorage-persisted)
- `onboarding.jsx` — first-run `OnboardWizard` (identity → guardians → first FREE)
- `tweaks-panel.jsx` — the preview Tweaks controls (not production)
- Per-surface components: `surfaces.jsx` (Balance, Ledger, Move, phone screens), `standing.jsx`, `faucets.jsx`, `demurrage.jsx`, `openbooks.jsx`, `provenance.jsx`, `commons.jsx`, `charter.jsx`, `business.jsx`, `gradations.jsx`, `affiliate.jsx`, `retirement.jsx`, `emergency.jsx`, `escrow.jsx`, `godark.jsx`, `constellation.jsx`
- `proto.jsx` / `app.jsx` — the prototype router / the design-board composition

## Suggested build order (de-risked, money last)
1. Port the design tokens + base components from `styles.css`.
2. **Read-only surfaces first** (display prod truth): Balance, The Ledger, Provenance, **The Open Books**.
3. Write paths: GIVE/GET/OFFER, Escrow + dispute.
4. Status layers: Standing (Rank/Ring), Gradations, Earning, Circulation.
5. Safety-net cluster: Commons, Legacy/Succession (sensitive — read the escrow tables carefully), Emergency Fund.
6. **The fiat membrane LAST** (most regulated): crowdfunding (**BTC or Stripe only — no BLiNG! donations in Phase 1**), KYC at fiat-entry, age gates 13/18/18, Howey-safe backing-for-reward framing. No "buy BLiNG!" anywhere.
7. Offline P2P (Go Dark) — confirm the built `offline_signature` shape before implementing the relay.
