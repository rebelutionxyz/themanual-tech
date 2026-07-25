# Language-Firewall Audit — TheMANUAL.tech

**Date:** 2026-07-25
**Auditor:** Claude Code instance #2 (read-only on `main`)
**Repo state:** `main` @ `b088958`, working tree clean at audit start
**Lexicon:** MMF v2.8 §4 (§4.1 banned / §4.2 replacements / §4.5 brand casing), §30, §32.5
**Phase:** 1 complete → **Phase 2 APPLIED** on branch `canon/firewall-sweep-2026-07-25`.
`main` never touched. Not pushed — awaiting Butch.

> ## ⚠️ Phase-2 correction to this report's Phase-1 counts
>
> During Phase 2 the sweep was re-run with a corrected pattern and **Phase 1 undercounted
> bucket A**. Two pattern defects:
>
> 1. **`\bthe comb\b|\bComb\b` missed bare lowercase `comb`** not preceded by "the" —
>    e.g. `"across the whole comb"`, `"your comb grows"`, `"from comb signals"`.
>    **+14 user-visible items.**
> 2. **The `MiniWaves` sweep missed `BottomToolbar.tsx`** (`aria-label="Tasks — MiniWaves"`,
>    `title="MiniWaves"`). **+2 user-visible items.**
>
> **Corrected bucket-A total: 81** (was 65). A8 is **42**, not 28. A5 is **5**, not 3.
> All 81 are fixed in the Phase-2 commit. The per-item tables below are the Phase-1
> snapshot and are left unedited as the audit record; the Phase-2 ledger at the end of
> this file is authoritative.

---

## Executive summary

**65 bucket-A (fix) items** across 30 files. Four clusters account for 46 of them:

| Cluster | Count | Note |
|---|---|---|
| A8 — "the comb" / "Comb" retirement | 28 | Butch's 2026-07-25 direction; 9 need his call on awkward swaps |
| A1 — "The Sovereign Ledger" in live copy | 9 | **Banned form shipping to Bees today** |
| A9 — README teaches the WRONG firewall | 7 | `MINT` is listed as a ✅ sanctioned verb |
| A4 — `FreedomBLiNGS` wordmark casing | 6 | Three spellings coexist in-repo |

**Three findings worth your attention before the rest:**

1. **`README.md:275` lists `MINT` in the ✅-approved verb list.** The contributor-facing
   doc that teaches the firewall gets the firewall's single most load-bearing rule
   backwards. Anything built from that README inherits the violation. Highest-leverage
   single-line fix in this audit.

2. **"The Sovereign Ledger" is live user-visible copy in 9 places** — the FreedomBLiNGs
   surface name, the constellation launcher, and every Ledger/Balance/Move page eyebrow.
   `src/lib/surfaces.ts:76` already says *"The Freedom Ledger"* for the BLiNG! surface,
   so the correct form is already in the file — line 88 just never got swept.

3. **Bucket C is essentially empty.** `[Pp]illar` returns **zero** matches in `src/` —
   the Pillar→Astra code rename (48ab05f) is genuinely complete. Residue lives only in
   frozen audit docs, one SQL comment, and the `pillar_tags` DB column. No coordinated
   rename dispatch is needed for `src/`.

Also flagged, not fixed: the brief said `"Sovereign Beeing"` appears once
(FreedomblingsSidebar) — it appears in **4** places. And `README.md:321` carries a stale
hard cap (`11,222,333,222,111`) that contradicts the Economy v3 value applied Jun 2.

---

## BUCKET A — fix (65)

### A1 · "The Sovereign Ledger" → "The Freedom Ledger" (9)

§4.5: `"The Freedom Ledger" (never "Sovereign Ledger")`. All 9 are rendered copy.

| # | Location | Current | Proposed |
|---|---|---|---|
| 1 | `src/lib/surfaces.ts:88` | `function: 'The Sovereign Ledger'` | `function: 'The Freedom Ledger'` |
| 2 | `src/components/freedomblings/ConstellationOverlay.tsx:22` | `role: 'BLiNG! · The Sovereign Ledger'` | `role: 'BLiNG! · The Freedom Ledger'` |
| 3 | `src/pages/freedomblings/LedgerPage.tsx:30` | `<div className="eyebrow">The Sovereign Ledger</div>` | `…The Freedom Ledger…` |
| 4 | `src/pages/freedomblings/LedgerPage.tsx:41` | same | same |
| 5 | `src/pages/freedomblings/LedgerPage.tsx:59` | same | same |
| 6 | `src/pages/freedomblings/LedgerPage.tsx:79` | same | same |
| 7 | `src/pages/freedomblings/BalancePage.tsx:37` | same | same |
| 8 | `src/pages/freedomblings/BalancePage.tsx:55` | same | same |
| 9 | `src/pages/freedomblings/MovePage.tsx:231` | `Move value · the Sovereign Ledger` | `Move value · the Freedom Ledger` |

> Corroboration: `src/lib/surfaces.ts:76` already reads
> `description: 'Earn. Free. Send. Escrow. The Freedom Ledger.'` — the intended form is
> in the same object literal, 12 lines above the violation.

### A2 · "mint" in a BLiNG! context → "FREE" (2)

§4.2: `Mint → Free`.

| # | Location | Current | Proposed |
|---|---|---|---|
| 10 | `src/pages/BlingsPage.tsx:73` | `enter the live economy — earn, mint, send, escrow.` | `enter the live economy — earn, FREE, send, escrow.` |
| 11 | `src/lib/dingleberry/mock-data.ts:327` | `…so no fraudulent BLiNG! was minted.` | `…so no fraudulent BLiNG! was FREE'd.` |

### A3 · Bazaar commerce verbs on a BLiNG!-denominated surface (3)

Bazaar GET settles in BLiNG! → context class 1, severity A.

| # | Location | Current | Proposed |
|---|---|---|---|
| 12 | `src/lib/surfaces.ts:189` | `function: 'Buy · Auction · Raffle'` | `function: 'Get · Auction · Raffle'` |
| 13 | `src/pages/bazaar/BazaarListingDetail.tsx:274` | `'Purchase failed'` (error toast) | `'GET failed'` |
| 14 | `src/pages/bazaar/BazaarListingDetail.tsx:286` | `aria-label="Confirm purchase"` | `aria-label="Confirm GET"` |

### A4 · `FreedomBLiNGS` → `FreedomBLiNGs` (6 user-visible)

§4.5 brand casing. **Three spellings coexist in-repo:** `FreedomBLiNGS` (~31),
`FreedomBLiNGs` (canonical, per root `CLAUDE.md` Layer-0 listing), `FreedomBlings` (2).
Only user-visible occurrences are bucket A; the ~25 file-header comments are D.

| # | Location | Current | Proposed |
|---|---|---|---|
| 15 | `src/lib/surfaces.ts:87` | `name: 'FreedomBLiNGS'` | `name: 'FreedomBLiNGs'` |
| 16 | `src/components/freedomblings/FreedomblingsSidebar.tsx:109` | `Freedom<b>BLiNGS</b>` — **rendered sidebar wordmark** | `Freedom<b>BLiNGs</b>` |
| 17 | `src/components/freedomblings/ConstellationOverlay.tsx:22` | `name: 'FreedomBLiNGS'` | `name: 'FreedomBLiNGs'` |
| 18 | `src/components/shell/BottomToolbar.tsx:191` | `aria-label="BLiNG! — FreedomBLiNGS"` | `aria-label="BLiNG! — FreedomBLiNGs"` |
| 19 | `src/pages/freedomblings/CharterPage.tsx:76` | `The promises that bind FreedomBLiNGS` | `…FreedomBLiNGs` |
| 20 | `src/pages/freedomblings/CharterPage.tsx:95` | `This Charter binds the economy of FreedomBLiNGS` | `…FreedomBLiNGs` |

⚠️ **Adjudicate:** confirm `FreedomBLiNGs` (trailing lowercase `s`) is the lock. Root
`CLAUDE.md` uses it; `src/lib/astras/miniwaves.ts:7` cites it as the casing exemplar.

### A5 · `MiniWaves` → `MiNiWaVeS` (3)

`src/lib/astra-catalog.ts:89` already carries `wordmark: 'MiNiWaVeS'`. `MiniWaves`
(closed-up, wrong internal caps) is neither the canonical stylized form nor the blessed
spoken form ("Mini Waves") — it's a third variant.

| # | Location | Current | Proposed |
|---|---|---|---|
| 21 | `src/components/freedomblings/ConstellationOverlay.tsx:31` | `name: 'MiniWaves'` | `name: 'MiNiWaVeS'` |
| 22 | `src/pages/WavesPage.tsx:20` | `document.title = 'MiniWaves. In the Flow.'` | `'MiNiWaVeS. In the Flow.'` |
| 23 | `src/pages/WavesPage.tsx:35` | `title="MiniWaves"` (iframe a11y title) | `title="MiNiWaVeS"` |

### A6 · "HoneyComb RiNG" → "the RiNG" (1)

§4.5 rename chain: HiVE RiNG → HONEYCOMB RING (Apr 27) → **the RiNG** (May 17, 2026).
`HoneyComb RiNG` is a stale intermediate.

| # | Location | Current | Proposed |
|---|---|---|---|
| 24 | `src/pages/ProfilePage.tsx:145` | `title="HoneyComb RiNG"` | `title="the RiNG"` |

⚠️ **Adjudicate:** as a `<RankCard>` title beside "BLiNG! Rank", lowercase `the` may read
odd. `"The RiNG"` is the alternative. Your call.

### A7 · `Honeycomb` single-cap — unsanctioned form (2)

Per brief: "Honeycomb" single-cap is not a sanctioned form. Confirmed independently by
`supabase/functions/atlasoracle-route/canon.ts:56`, which instructs the AI runtime:
*"always all-caps. Never 'Hive' (retired), 'Honeycomb,' or 'honeycomb.'"*

| # | Location | Current | Proposed |
|---|---|---|---|
| 25 | `src/pages/give/GivePage.tsx:223` | `placeholder="Tell the Honeycomb what you're rallying support for…"` | `placeholder="Tell HoneyComb what you're rallying support for…"` |
| 26 | `src/pages/dingleberry/AtlasOraclePage.tsx:157` | `Honeycomb’s security copilot` | `HoneyComb’s security copilot` |

### A8 · "the comb" / "Comb" retirement (28)

Butch's 2026-07-25 direction, superseding §30.3. `HONEYCOMB` in headlines/hero,
`HoneyComb` in body prose. **19 are clean swaps; 9 are flagged awkward** (marked ⚠️) —
the beekeeping metaphor is load-bearing in those and "HoneyComb" flattens it.

**Clean swaps (19):**

| # | Location | Current | Proposed |
|---|---|---|---|
| 27 | `src/components/shell/SearchDropdown.tsx:99` | `No matches across the comb.` | `No matches across HoneyComb.` |
| 28 | `src/components/dingleberry/DingleberrySidebar.tsx:137` | `Comb posture` | `HoneyComb posture` |
| 29 | `src/components/freedomblings/ConstellationOverlay.tsx:90` | `balance follows you across the comb.` | `…across HoneyComb.` |
| 30 | `src/components/freedomblings/ConstellationOverlay.tsx:104` | `Your balance follows you across the comb — one honest, member-owned ledger.` | `…across HoneyComb — one honest…` |
| 31 | `src/pages/AdvertisePage.tsx:114` | `review-before-live keeps the comb clean.` | `…keeps HoneyComb clean.` |
| 32 | `src/pages/BusinessPage.tsx:37` | `Review-before-live keeps the comb clean.` | `…keeps HoneyComb clean.` |
| 33 | `src/pages/dingleberry/JusticeHandoffPage.tsx:65` | `Comb-wide · 3 Astra` | `HoneyComb-wide · 3 Astra` |
| 34 | `src/pages/dingleberry/JusticeHandoffPage.tsx:99` | `Comb-wide · 3 Astra` | `HoneyComb-wide · 3 Astra` |
| 35 | `src/pages/dingleberry/AtlasOraclePage.tsx:289` | `the audit trail the comb runs on.` | `…the audit trail HoneyComb runs on.` |
| 36 | `src/pages/dingleberry/MemberMeshPage.tsx:53` | `'Comb impact'` | `'HoneyComb impact'` |
| 37 | `src/pages/dingleberry/InfraHealthPage.tsx:211` | `Up, degraded or down across the comb` | `…across HoneyComb` |
| 38 | `src/pages/freedomblings/StandingPage.tsx:58` | `Sign in to see where you stand in the comb.` | `…where you stand in HoneyComb.` |
| 39 | `src/pages/freedomblings/StandingPage.tsx:229` | `Carry it across the comb, and no one can lock you out` | `Carry it across HoneyComb, and…` |
| 40 | `src/pages/freedomblings/OpenBooksPage.tsx:200` | `<h3>Just FREE'd across the comb</h3>` | `<h3>Just FREE'd across HoneyComb</h3>` |
| 41 | `src/pages/freedomblings/CirculationPage.tsx:75` | `returns to the comb and is FREE'd again` | `returns to HoneyComb and is…` |
| 42 | `src/pages/freedomblings/CirculationPage.tsx:95` | `for being early to the comb` | `for being early to HoneyComb` |
| 43 | `src/pages/freedomblings/CirculationPage.tsx:134` | `never leaves the comb.` | `never leaves HoneyComb.` |
| 44 | `src/pages/freedomblings/CharterPage.tsx:57` | `accountable to the comb that fills them` | `accountable to HoneyComb, which fills them,` |
| 45 | `src/pages/freedomblings/GradationsPage.tsx:63` | `'Founding voice in the comb'` | `'Founding voice in HoneyComb'` |

**⚠️ Awkward — Butch's call (9):**

| # | Location | Current | Note |
|---|---|---|---|
| 46 | `src/pages/freedomblings/LineagePage.tsx:37` | `Growing the comb is productive action` | "Growing HoneyComb" reads as corporate growth; the organic sense is lost |
| 47 | `src/pages/freedomblings/LineagePage.tsx:48` | same string (eyebrow) | ditto |
| 48 | `src/pages/freedomblings/LineagePage.tsx:66` | same string (eyebrow) | ditto |
| 49 | `src/pages/freedomblings/LineagePage.tsx:86` | same string (eyebrow) | ditto |
| 50 | `src/pages/freedomblings/LineagePage.tsx:25` | `who: 'the comb widening'` | "HoneyComb widening" is ungrammatical; needs a rewrite, not a swap |
| 51 | `src/pages/freedomblings/GradationsPage.tsx:76` | `Choose how deep you tend the comb.` | "tend HoneyComb" loses the beekeeping figure |
| 52 | `src/pages/freedomblings/GradationsPage.tsx:73` | `Membership in the comb` | "Membership in HoneyComb" is fine but flat; may prefer "Membership" alone |
| 53 | `src/pages/freedomblings/EscrowPage.tsx:130` | `In dispute — the comb reviews this in the open.` | personifies the collective; "HoneyComb reviews" sounds like the company, not the Bees. Consider "Bees review this in the open" |
| 54 | `src/pages/freedomblings/EscrowPage.tsx:314` | `the comb reviews it transparently — no hidden arbiter.` | same personification issue; consider "Bees review it transparently" |

> Note on 53/54: swapping to `HoneyComb` arguably *weakens* the firewall's intent — it
> reassigns dispute review from the membership to the platform. "Bees" may be the
> canon-correct replacement here rather than the platform name.

### A9 · `README.md` — firewall doc errors (7)

README-class doc, explicitly in scope. This file is how contributors learn the firewall,
so errors here propagate.

| # | Location | Current | Proposed |
|---|---|---|---|
| 55 | `README.md:275` | `✅ GET · GIVE · OFFER · WIN · EARN · RECEIVE · BANK · DONATE · REDEEM · **MINT** · SEND · ESCROW` | Drop `MINT`, insert `FREE`: `…REDEEM · FREE · SEND · ESCROW` |
| 56 | `README.md:272` | `❌ buy, sell, purchase, invest, trade, market, price, customer, payment` | `❌ buy, sell, purchase, invest, trade, market, price, customer, cash out, mint, investor, token holder` |
| 57 | `README.md:251` | `\| 9 \| BAZAAR \| Buy · Auction · Raffle \| Commerce \| 1 \|` | `Get · Auction · Raffle` |
| 58 | `README.md:327` | `BLiNG! Rank: 33 levels (Seed → Miracle, can be purchased)` | `BLiNG! Rank: 33 levels (Seed → Miracle) — earned, never bought` |
| 59 | `README.md:322` | `Bonding curve: $1 floor, +$0.01 per billion, $101 ceiling, 1% sell fee, free buys` | Rewrite: `1% OFFER fee, free GETs` — **and see staleness note below** |
| 60 | `README.md:325` | `Token creation fee: 1 BLiNG!` | `Creation fee: 1 BLiNG!` ("token" is §4.1-adjacent) |
| 61 | `README.md:15` + `README.md:291` | `Other **pillars** (…)` / `Future pillar domains` | `Other **astras**` / `Future astra domains` — prose only, not an identifier, so not bucket C |

⚠️ **Staleness beyond language** (flagging, not fixing — outside this audit's remit):
- `README.md:321` — `BLiNG! economy hard cap: 11,222,333,222,111`. Economy v3 (applied
  Jun 2, 2026) set the cap to **111,222,333,333,222,111**. README is stale by 5 orders
  of magnitude.
- `README.md:322` — describes a **bonding curve and order book that Economy v3 dropped**.
  Fixing the language on a mechanism that no longer exists is wasted work; recommend this
  line be deleted rather than reworded. Needs your call.
- `README.md:327` — "33 levels" conflates BLiNG! Rank (33, `ProfilePage.tsx:137`) with the
  RiNG (9 levels, `ProfilePage.tsx:146`). Separate defect.

### A10 · "Price" attached to BLiNG! amounts (4)

These are **not** bucket B. Bazaar listings are BLiNG!-denominated, so `price` here
attaches to BLiNG! itself → §4.1 violation, context class 1.

| # | Location | Current | Proposed |
|---|---|---|---|
| 62 | `src/pages/bazaar/BazaarNew.tsx:189` | `<Field label="Price (BLiNG!)" required>` | `<Field label="Amount (BLiNG!)" required>` |
| 63 | `src/pages/bazaar/BazaarNew.tsx:72` | `'Price must be at least 0.1 BLiNG!.'` | `'Amount must be at least 0.1 BLiNG!.'` |
| 64 | `src/pages/bazaar/BazaarBrowse.tsx:12` | `label: 'Price: Low → High'` | `label: 'Amount: Low → High'` |
| 65 | `src/pages/bazaar/BazaarBrowse.tsx:13` | `label: 'Price: High → Low'` | `label: 'Amount: High → Low'` |

Local identifiers (`priceBling`, `const price`) are bucket C — string labels only here.

---

## BUCKET B — sanctioned, no action (12)

Fiat-for-services surfaces. Commerce language describes the SERVICE, not BLiNG!.
F5/F6 rails; Stripe domain review requires this vocabulary.

| Location | String / usage | Why sanctioned |
|---|---|---|
| `src/pages/freedomblings/GradationsPage.tsx:1–8, 13, 24–58, 94–96, 119` | `$0 / $3 / $8 / $13` tiers, `price:`, `.grad-price`, `Memberships open at launch — checkout wires in then.` | Fiat membership subscription (F5/F6) |
| `src/lib/premium.ts:11–12` | `PLACEHOLDER pricing until the rework lands`, `Checkout goes live with…` | Fiat subscription |
| `src/lib/premium.ts:64–68` | `subscriptions` table read, `membership subscription` | Fiat subscription |
| `src/pages/PremiumPage.tsx:15` | `Ladder pricing` | Fiat subscription |
| `src/pages/bazaar/BazaarListingDetail.tsx:248` | `Fiat checkout coming soon` | Explicitly the fiat rail |
| `src/components/bazaar/cards.tsx:61` | `Price block — BLiNG! primary (secondary fiat only when accepts_fiat)` | Comment; fiat-rail-aware by design |
| `supabase/functions/stripe-subscription-webhook/index.ts:22, 58–82, 113–115, 128–227` | `customer.subscription.created`, `stripe_customer_id`, `customerId` | Stripe API contract field names; never rendered |
| `supabase/functions/press-checkout/source/index.ts:140` | `customer_email` | Stripe API field |
| `supabase/functions/press-checkout/source/index.ts` (whole) | press fiat checkout | /press fiat rail |
| `supabase/functions/press-stripe-webhook/source/index.ts` (whole) | press payment advance | /press fiat rail |
| `src/stores/useCartStore.ts:6` | `Bazaar / atlasADs / Give checkout flows` | Comment; fiat checkout |
| `supabase/functions/fountain/index.ts:17` | `FIREWALL: the contributor's fiat buys nothing` | Correct firewall assertion |

---

## BUCKET C — code-identifier debt, inventory only (6 clusters)

**No renames performed. No renames recommended inside this audit.**

### C1 · Pillar→Astra rename: `src/` is CLEAN ✅

`[Pp]illar` → **0 matches in `src/`**. The rename (48ab05f) is complete. Residue only:

| Location | Form | Disposition |
|---|---|---|
| `supabase/schema-v2-surfaces.sql:43` | `-- PILLAR CONFIG` (SQL comment) | Out of scope (schema file) |
| `shared/notes/audits/code-24-component-d-promotion-slots-2026-05-08.md` (6 refs) | `PillarConfig`, `src/lib/pillars/pillar.types.ts` | Frozen historical audit; file no longer exists |
| `shared/notes/audits/schema-architect-phase-c-foundations-2026-05-08.md:54` | `PillarConfig slot identifiers` | Frozen historical audit |
| `shared/canon/taxonomy/*` , `db` dumps | `pillar_tags` column | Canon-exempt (DB column, per root CLAUDE.md) |

**Conclusion: no coordinated Pillar→Astra code dispatch is needed for `src/`.**

### C2 · Bazaar buy/sell/purchase identifiers

Mirror the DB RPC `bazaar_purchase_bling` and its return column names — renaming requires
a coordinated DB + client dispatch, not a copy fix.

- `src/lib/bazaar.ts` — `bazaarPurchaseBling()`, `BazaarPurchaseResult`, `buyerBalanceAfter`,
  `sellerBalanceAfter`, `BazaarOrder.sellerBee/sellerHandle/sellerName/sellerAvatar`,
  `BazaarSale.buyerBee/buyerHandle/buyerName/buyerAvatar`, `bazaarMySales()`
- `src/pages/bazaar/BazaarListingDetail.tsx` — `PurchaseModal`, `buy()`, `'buying'` state,
  `listing.seller.handle`
- `src/pages/bazaar/BazaarNew.tsx:70–87` — `const price`, `priceBling`
- `src/pages/HandleSettingsPage.tsx:34, 198` — `price?: number`, `res.price`
  (the rendered string is compliant: `BLiNG! returned to The Source`)

### C3 · `mint_*` columns still read — plus live schema drift ⚠️

`bling_mint` is retired canon, but two admin surfaces read two different generations of
`bling_system_state` columns:

| Location | Reads | Rendered label |
|---|---|---|
| `src/admin/sections/SystemStateSection.tsx:53, 60, 68` | `mint_active`, `mint_price`, `total_supply` | `"Curve price"` — §4.2-compliant ✅ |
| `src/components/hq/sections/EconomySnapshot.tsx:57` | `free_active`, `freedom_price`, `total_supply` | `"Live price (system)"` |

The TS identifier `mintPrice` (`SystemStateSection.tsx:19, 28, 68`) carries the retired
name. Per memory, the `freedom_price` / `operations_funds` column drops were **deferred on
live deps** in Economy v3 — `SystemStateSection` is plausibly one of those live deps.
**Route to the Economy v3 cleanup dispatch, not here.**

### C4 · `drops` / `drips` lowercase — DB values, out of scope

`bling_transactions.type` enum values and TS object keys:
`src/lib/freedomblings/ledger.ts:66–67, 82–84`; `src/lib/freedomblings/earning.ts:14–17,
96–97, 114, 145, 182–188, 238–239`; `src/lib/dingleberry/contract.ts:270`;
`src/lib/dingleberry/mock-data.ts:752, 793, 843`.

✅ **All user-visible labels already use canonical TitleCase** (`Drops`, `Drips`) —
`ledger.ts:82–84`, `earning.ts:46, 96–97, 238–239`, `surfaces.ts:78`,
`OpenBooksPage.tsx:24–25`, `EarningPage.tsx:140, 165`, `ThreadList.tsx:989`. No action.

### C5 · PascalCase component/hook names vs. stylized brands

`DingleberryLayout`, `DingleberrySidebar`, `DingleberrySnapshot`, `useDingleberry`,
`useDingleberryData`, `BrandosophicLayout`, `BrandosophicStudioPage`,
`BrandosophicOutletCtx`, `FreedomblingsLayout`, `FreedomblingsSidebar`,
`useFreedomblingsBalance`, `useFreedomblingsLedger`.

Canonical forms (`DingleBERRY`, `BRANDoSOPHIC`, `FreedomBLiNGs`) can't survive PascalCase
identifier conventions. **Conventional and correct — no action, ever.**

### C6 · `hive-read` policy naming

`src/pages/ProfilePage.tsx:160` and `src/lib/media.ts:662` both reference "hive-read
policies". If the **actual Postgres RLS policy names** contain `hive`, that's DB-side
banned-term debt for a separate dispatch. Comments are bucket D (below).

---

## BUCKET D — comments / docs only (low priority)

**"The Sovereign Ledger" in comments (3):** `src/App.tsx:360` · `src/styles/freedomblings.css:2` · `src/components/layout/UtilityChrome.tsx:92`

**`FreedomBLiNGS` in file-header comments (~25):** `src/components/freedomblings/{SendModule.tsx:7, FreedomblingsSidebar.tsx:2, ProvenanceOverlay.tsx:2, ConstellationOverlay.tsx:1,4, marks.tsx:1, BlingPopupContent.tsx:12, LedgerRow.tsx:1}` · `src/components/shell/{sidebarNav.ts:125, BottomToolbar.tsx:179}` · `src/lib/freedomblings/{circulation.ts:4, standing.ts:4, ledger.ts:4, earning.ts:4, lineage.ts:4, openbooks.ts:3, escrow.ts:4, move.ts:5}` · `src/pages/freedomblings/{StandingPage.tsx:3, OpenBooksPage.tsx:1, CharterPage.tsx:3, EscrowPage.tsx:3, MovePage.tsx:5, CirculationPage.tsx:3, BalancePage.tsx:1, FreedomblingsLayout.tsx:3, GradationsPage.tsx:1, EarningPage.tsx:3, LedgerPage.tsx:5, LineagePage.tsx:4}`

**Third casing `FreedomBlings` (2):** `src/lib/premium.ts:8` · `src/pages/PremiumPage.tsx:13`

**`hive` in comments (2):** `src/pages/ProfilePage.tsx:160` · `src/lib/media.ts:662` — both "hive-read policies"

**`mint` in comments, BLiNG!-adjacent (3):** `src/components/hq/sections/EconomySnapshot.tsx:25` (`// BLiNG! lifetime mint cap`; the constant `11_222_333_222_111` is **also stale** vs the Economy v3 cap) · `supabase/functions/press-stripe-webhook/source/index.ts:5` (`mints`) · `src/lib/bazaar.ts:207` (see below)

**`mint` in comments, cryptographic sense — 🚫 DO NOT TOUCH (13):**
`src/lib/e2ee.ts:23, 25, 27, 31, 243, 245, 246, 264, 273` · `src/lib/comms.ts:94, 112, 148, 723`.
These describe **content-key minting**, not BLiNG!. Not a firewall violation — "mint" is
correct cryptographic vocabulary. **Also instance #1's active files.** Recommend **no fix,
ever**, not merely "defer".

**Bazaar comments (3):** `src/lib/bazaar.ts:207` (`cannot buy your own listing`), `:243` (`A purchase the caller made`), `:274` (`The caller's purchases`)

**Edge-function comments (3):** `supabase/functions/_shared/ranks.ts:1` (`Per-rank purchase limits`), `:2` (`gate $-denominated buy amounts`) · `supabase/functions/press-checkout/source/index.ts:6` (`the buyer always knows`)

**Canon conflict to adjudicate (1):** `src/lib/astras/miniwaves.ts:8` — `"Mini Waves" is the spoken/display form`. This blesses a non-canonical form and is what A5's variants drifted from. Confirm or retire.

**Correct as-is — keep (2):** `src/components/AtlasOracleWalletBadge.tsx:19` (`// No buy / sell / purchase / trade / market / customer / mint in any string.`) and `supabase/functions/atlasoracle-route/canon.ts:52, 56` (the AI runtime's own firewall instructions — verified accurate).

---

## FLAG FOR REVIEW — no auto-fix (context class 3)

| Location(s) | Term | Why not auto-flagged |
|---|---|---|
| `src/lib/surfaces.ts:188, 190` · `src/lib/astra-catalog.ts:53, 59, 61, 97` · `src/App.tsx:297` · `src/pages/freedomblings/GradationsPage.tsx:52` · `MovePage.tsx:274, 289` · `src/lib/freedomblings/escrow.ts:8` · `src/pages/dingleberry/JusticeHandoffPage.tsx:12, 219` · `src/styles/freedomblings.css:1925` · `src/components/shell/popupRegistry.ts:91` · `src/components/bazaar/cards.tsx:7` | `MARKETPLACE` / `marketplace` | Canon itself calls BAZAAR "The marketplace" (per brief). No action. |
| `src/lib/surfaces.ts:289` | `Every trade, every service` | Pro Services — "trade" = skilled trade, not securities trading |
| `src/lib/dingleberry/mock-data.ts:389` | `Wash-trading ring` | Fraud-pattern term of art in a security console |
| `src/pages/dingleberry/MemberMeshPage.tsx:352` | `a node's score never buys it trust` | Metaphorical; zero-trust explainer |
| `src/pages/dingleberry/GoDarkMonitorPage.tsx:543` | `cap="DROPS settled"` | All-caps `DROPS` vs TitleCase canon. Surrounding stat caps are all-caps by design. Casing call. |
| `src/lib/astra-catalog.ts:86` | `wordmark: 'TheRanking'` | The all-caps-middle convention implies `TheRANKING`. Distinct astra from `TheRANK` (`:96`, correct ✅). |
| `src/lib/freedomblings/openbooks.ts:27, 37, 50, 99, 112` · `src/pages/freedomblings/OpenBooksPage.tsx:5, 133` | `Comb Tithe` / `combTithe` | **Named canon mechanism**, not a colloquialism. Renaming is a canon change, not a copy fix. `OpenBooksPage.tsx:133` is the user-visible label. |
| `src/components/hq/sections/EconomySnapshot.tsx:136` | `label="Live price (system)"` | Reads `freedom_price`; §4.2 blesses "Freedom price". Suggest `"Freedom price (system)"`. Admin-only. |
| `src/components/layout/TopToolbar.tsx:281` | `TheHoneycomb.games` | Domain name — casing not meaningful. Leave. |
| `src/components/groups/CreateGroupModal.tsx:106` | `placeholder="Sovereign Beekeepers"` | Example group name, not a platform reference |

### Reserved names §32.5 — CLEAN ✅

`Marker`, `Witness`, `Lookout` → **0 matches in `src/`**. No generic reuse.

### `"Sovereign Beeing"` — brief undercounted (4, not 1)

Brief says leave it (canon-undefined). Noting the true footprint:
`src/components/freedomblings/FreedomblingsSidebar.tsx:133` ·
`src/pages/freedomblings/StandingPage.tsx:109` ·
`src/pages/freedomblings/GradationsPage.tsx:26` (`'Every Sovereign Beeing'`) ·
`src/pages/freedomblings/OpenBooksPage.tsx:73` (`"FREE'd to Sovereign Beeings"`).
**Left untouched per brief.** Worth a canon definition given it's shipping in 4 places.

### `public/` static assets

- **`public/sw.js`** — swept for all banned terms: **0 matches** ✅
- **`index.html`** — clean ✅ (`The Manual — a sovereign research instrument.`)
- **`server/index.ts`** — clean ✅; `HONEYCOMB` all-caps correct throughout
- **`public/mini-waves-v76…v92.html`** — 17 files, ~101 raw hits, **all false positives or
  out-of-context**: `Marketing` / `Investments` / `Review investment portfolio` /
  `Waves per trade` are MiNiWaVeS productivity **demo seed data** (personal task
  taxonomy, no BLiNG! surface); `/* mint */` and `/* pale mint */` (`v92:524–525`) are CSS
  color names; `v92:5928` is a code comment. **No language fix recommended.**
  ⚠️ Separate housekeeping: only **`mini-waves-v92.html`** is actually served
  (`src/pages/WavesPage.tsx:34`, `src/components/shell/BottomToolbar.tsx:242`) — the other
  **16 snapshots are dead weight** shipped to every visitor's origin. Recommend a
  standalone deletion commit, not part of Phase 2.

### Server-side generated strings — NOT audited

`notify()` call sites inside DB functions were **not** swept — that requires live
Supabase reads. One known implicated string: `src/lib/bazaar.ts:207` documents that
`bazaar_purchase_bling` raises **"cannot buy your own listing"**, and
`BazaarListingDetail.tsx:331` renders `{error}` **verbatim**. So a §4.1 banned word
reaches Bees from the DB layer. **Fix belongs in a DB dispatch, not Phase 2.**
Recommend a follow-up read-only pass over `pg_get_functiondef()` for all `RAISE`
message texts.

---

## Counts

| Bucket | Count | Files |
|---|---|---|
| **A — fix** | **65** | 30 |
| B — sanctioned, no action | 12 | 11 |
| C — code-identifier debt (inventory) | 6 clusters | ~12 |
| D — comments / docs only | ~52 sites | ~45 |
| Flag for review (no auto-fix) | 10 clusters | ~22 |

**Bucket A breakdown:** A1 Sovereign Ledger 9 · A2 mint 2 · A3 Bazaar verbs 3 ·
A4 FreedomBLiNGS 6 · A5 MiniWaves 3 · A6 the RiNG 1 · A7 Honeycomb single-cap 2 ·
A8 comb retirement 28 (19 clean + 9 flagged) · A9 README 7 · A10 BLiNG! price 4.

---

## Proposed Phase 2 plan

**Single commit. Smallest diff that clears every bucket-A item. Not executed — awaiting
approval.**

### Preconditions (all must hold)

1. ✅ Butch approves this report and adjudicates the **6 open language calls** below.
2. ✅ Instance #1 has **finished** with `main` and pushed — verified by a fresh
   `git log --oneline -5` + `git status`.
3. ✅ Branch off current `main`: `git checkout -b canon/firewall-sweep-2026-07-25`.
4. ✅ `npm run build` green **before** any edit (establish baseline).

### Open language calls — blocking

| # | Question | Recommendation |
|---|---|---|
| 1 | `FreedomBLiNGs` (trailing lowercase `s`) confirmed as the lock? | Yes — root CLAUDE.md + `miniwaves.ts:7` both cite it |
| 2 | A6: `"the RiNG"` or `"The RiNG"` in the RankCard title? | `"The RiNG"` — title-position capital reads better beside "BLiNG! Rank" |
| 3 | A8 items 46–52: keep the beekeeping metaphor or swap to `HoneyComb`? | Keep metaphor for "tend"/"growing"; these are the strongest copy in FreedomBLiNGs |
| 4 | A8 items 53–54: `HoneyComb reviews` or **`Bees review`**? | **`Bees review`** — "HoneyComb reviews" reassigns dispute authority from members to platform, weakening the firewall's intent |
| 5 | A9 item 59: reword the bonding-curve line, or **delete** it? | **Delete** — Economy v3 dropped the curve and order book; rewording a dead mechanism is waste |
| 6 | `miniwaves.ts:8`: is `"Mini Waves"` a blessed spoken form? | Confirm or retire — A5's variants drifted from this line |

### Execution order

1. **A1 (9)** — mechanical `Sovereign Ledger` → `Freedom Ledger`. Zero-risk, highest value.
2. **A9 (7)** — `README.md`. Docs-only; **no build risk**; fixes the doc that teaches the rule.
3. **A2 (2), A3 (3), A10 (4)** — string literals + one `aria-label`.
   ⚠️ A10 touches **labels only**; leave `priceBling` / `const price` identifiers alone (C2).
4. **A4 (6), A5 (3), A6 (1), A7 (2)** — brand casing. `FreedomblingsSidebar.tsx:109`
   changes rendered JSX (`<b>BLiNGS</b>` → `<b>BLiNGs</b>`) — visually verify the sidebar
   wordmark after.
5. **A8 (19 clean; +up to 9 pending call #3/#4)** — largest cluster, all plain copy.
6. `npm run build` → must be green.
7. `npm run lint` → no new findings.
8. Manual smoke: `/freedomblings/{ledger,balance,move,standing,circulation,charter,lineage,gradations,openbooks,escrow}`, `/profile`, `/bazaar`, `/give`, `/waves`, DingleBERRY pages.

### Files deliberately NOT touched

- 🚫 `src/lib/comms.ts`, `src/lib/e2ee.ts`, `src/pages/comms/CommsPage.tsx`,
  `src/components/comms/**` — instance #1's active batch. **Zero bucket-A items in them**,
  so Phase 2 has no reason to open them at all. Their `mint` hits are cryptographic and
  correct.
- 🚫 `supabase/migrations/**` — frozen history, canon-exempt.
- 🚫 All bucket-C identifiers.
- 🚫 `"Sovereign Beeing"` (4 sites) — per brief.
- 🚫 `public/mini-waves-v*.html` — false positives only.

### Blast radius & rollback

Copy strings, one `document.title`, two `aria-label`s, one JSX text node, one README.
**No logic, no schema, no auth, no money path.** Worst case is a typo in visible copy.
Rollback: `git revert <sha>` — single commit, no migration, no deploy coupling.

### Deferred to separate dispatches

| Item | Dispatch |
|---|---|
| DB `RAISE` message texts (`cannot buy your own listing`) | Read-only `pg_get_functiondef()` sweep, then a DB dispatch |
| `notify()` titles in DB functions | Same |
| RLS policy names containing `hive` | Same |
| `mint_price` / `mint_active` column reads + `SystemStateSection`↔`EconomySnapshot` drift | Economy v3 cleanup |
| Stale README cap `11,222,333,222,111` → `111,222,333,333,222,111` | Economy v3 doc pass (A9 note) |
| `EconomySnapshot.tsx:25` `HARD_CAP` constant (same stale value) | Economy v3 cleanup |
| README "33 levels" conflating BLiNG! Rank with the RiNG | Doc correctness pass |
| Delete 16 unreferenced `mini-waves-v*.html` | Standalone housekeeping commit |
| `TheRanking` → `TheRANKING` | Brand-convention pass |
| `"Comb Tithe"` disposition | Canon decision |
| `"Sovereign Beeing"` definition | Canon decision |

---

## Method / coverage

**Swept:** `src/**` (268 `.ts`/`.tsx` + `src/styles/*.css`) · `public/**` (incl. `sw.js`,
17 MiNiWaVeS HTML snapshots) · `server/index.ts` · `index.html` · `README.md` ·
`supabase/functions/**`.

**Term sweeps run:** `buy|sell|purchase` (+ inflections) · `invest|investor|trade|cash out` ·
`price|market|customer|checkout|subscri*` · `mint*` · `\bhive\b` (whole-word, case-insensitive) ·
`the comb|Comb` (whole-word) · `Sovereign Ledger` · `Sovereign Bee*` · `RiNG|HiVE` ·
`Marker|Witness|Lookout` · `FNU` · `Drops|Drips` (+ lowercase) · `Honeycomb` single-cap ·
`BLING!|Bling!|bling!|BLINGS|BLiNGS` · brand-casing variants
(`MiniWaves|Brandosophic|Dingleberry|Freedomblings|TheRank*`) ·
`PillarConfig|resolvePillarByHost|usePillar|pillar*` · `alert(|confirm(|prompt(` dialog strings ·
`mintPrice|mint_price|bling_mint|freedom_price`.

**Not swept (declared):** server-side DB-generated strings (needs live Supabase reads) ·
migration history (frozen) · `node_modules` / `dist` / lockfiles.

**Compliance confirmed clean:** `public/sw.js` · `index.html` · `server/index.ts` ·
reserved names §32.5 · `Drops`/`Drips` user-visible TitleCase · Pillar→Astra in `src/` ·
`alert`/`confirm`/`prompt` dialog copy.

---

---

# PHASE 2 — APPLIED

**Branch:** `canon/firewall-sweep-2026-07-25` (off `main` @ `5c27ae5`)
**Commit:** single commit, **not pushed**
**Files changed:** 35 · **+94 / −88**
**`main`:** never checked out for edit, never committed to, never pushed.

## Gates

| Gate | Result |
|---|---|
| `npm run build` (baseline, pre-edit) | ✅ green |
| `npm run build` (post-edit) | ✅ green — built in 16.94s |
| `npm run lint` | ✅ **8 errors, all pre-existing**, zero overlap with the 35 changed files |
| comms files touched | ✅ **none** |

Lint errors live in `ProfileSection.tsx`, `CallProvider.tsx`, `RouletteView.tsx`,
`EventPage.tsx`, `CampaignPage.tsx` — verified disjoint from the changed-file set by
`comm -12`. No new lint findings introduced.

## Adjudication actually applied

Butch approved with `go phase 2` without answering the 6 open calls, so the report's
recommendations were applied — except call #3, where Phase 2 found a better answer:

| # | Call | Applied |
|---|---|---|
| 1 | `FreedomBLiNGs` casing | ✅ Applied as recommended |
| 2 | `"the RiNG"` vs `"The RiNG"` | ✅ **`"The RiNG"`** (title position) |
| 3 | A8 awkward swaps — keep metaphor or swap? | ⚠️ **Superseded — see below** |
| 4 | Escrow dispute authority | ✅ **`Bees review`** — 3 sites (one more than reported) |
| 5 | README bonding-curve line | ✅ Rewritten, not deleted — see below |
| 6 | `miniwaves.ts:8` "Mini Waves" spoken form | ⏸️ Left as-is; still needs your ratification |

### Call #3 — resolved by evidence, not preference

Phase 1 recommended *keeping* "the comb" in 7 places to protect the beekeeping metaphor.
That recommendation was **wrong, and it conflicted with your stated direction.** Phase 2
found the repo already carries a compliant idiom that does both jobs: **"the HoneyComb"**
— live at `surfaces.ts:90`, `CharterPage.tsx:93`, `CharterPage.tsx:130`,
`StandingPage.tsx:92`, `ConstellationOverlay.tsx:87`, `FreedomblingsSidebar.tsx:104`.

So `"Growing the comb"` → `"Growing the HoneyComb"`, `"tend the comb"` →
`"tend the HoneyComb"`. The colloquialism is retired per your direction **and** the
metaphor survives. **All 42 occurrences swapped; none left behind.**

The two dispute-personification sites still went to **`Bees review`** (call #4) — there,
"the HoneyComb reviews" really would move dispute authority from members to the platform.
A third instance of the same string was found in Phase 2 at `EscrowPage.tsx:181`
(a confirm-dialog body) and got the same treatment.

### Call #5 — rewritten rather than deleted

Deleting a line under **"Architecture Decisions (Don't Relitigate)"** would erase the
record. It now reads that the curve/order-book **RPCs were dropped at the DB layer by
Economy v3** and that the old parameters describe nothing live.

⚠️ **Canon tension you should resolve:** the §4.2 replacement table (per the audit brief,
MMF v2.8) still specifies `Cash out → Offer on the order book`. That mapping is now
written into `README.md:277`. If Economy v3 truly retired the order book, **§4.2 itself is
stale** and the sanctioned replacement for "cash out" needs a new target. I did not
resolve this unilaterally — the README states only what I could verify.

## Deliberately NOT changed

| Item | Why |
|---|---|
| `@comb-steward` (`mock-data.ts:494, 566`) | **Reserved `@comb*` system-handle namespace — canon-correct.** Changing it would break the reserved-prefix convention. |
| `application/x-comb-assets` (`LibrarySection.tsx:105`) | Internal drag MIME type, never rendered |
| `README.md:298` `` `pillars` `` table | DB identifier; renaming the prose would make the doc wrong |
| `README.md:321` hard cap `11,222,333,222,111` | Stale vs Economy v3, but I will not write an economy constant I did not verify live this session. **Still needs fixing — flagged, not fixed.** |
| `README.md:318` "13 Realms" | Canon says 14. Same reasoning. Flagged. |
| ~25 `FreedomBLiNGS` file-header comments | Bucket D |
| `e2ee.ts` / `comms.ts` `mint` (13) | Cryptographic key minting — correct vocabulary, and instance #1's files |
| `"Sovereign Beeing"` (4 sites) | Per brief |
| `"Comb Tithe"` (7 sites) | Named canon mechanism — renaming is a canon decision |
| `public/mini-waves-v*.html` | False positives only |

## One self-inflicted defect, caught by the build gate

The first `mock-data.ts` edit wrote `FREE'd` with a **straight apostrophe inside a
single-quoted TS string**, terminating the literal and breaking the parse (20 TS1005s).
Fixed by using the curly `FREE’d` that file already uses. Caught by `npm run build`
before commit — which is exactly why the gate exists.

## Still open after Phase 2

1. **DB-layer strings** — `bazaar_purchase_bling` raises `"cannot buy your own listing"`,
   rendered verbatim at `BazaarListingDetail.tsx:331`. A banned word still reaches Bees.
   Needs a read-only `pg_get_functiondef()` sweep, then a DB dispatch.
2. **`notify()` titles** in DB functions — never audited.
3. **RLS policy names** containing `hive`.
4. **§4.2 "order book" tension** (above).
5. **`README.md` stale economy constants** — cap, realm count, 33-vs-9 rank conflation.
6. **`mint_price`/`mint_active` vs `freedom_price`/`free_active`** admin drift → Economy v3 cleanup.
7. **`miniwaves.ts:8`** canon conflict.
8. **16 unreferenced `mini-waves-v*.html`** snapshots shipping to every visitor.

*`logs/` is untracked and not in `.gitignore`. This report is excluded from the Phase-2
commit — the commit contains only the 35 source/doc files.*

---

# PHASE 2b — BUTCH'S ADJUDICATION APPLIED

**Commit:** `cd855d7` · 10 files · +17 / −17 · build green · lint unchanged (same 8
pre-existing errors, same 5 untouched files). Still unpushed; `main` still `5c27ae5`.

| # | Ruling | Applied |
|---|---|---|
| 1 | Charter treasury → `accountable to the Bees who fill them` | ✅ |
| 2 | Revert 3 possessives → `your comb` (lineage sense, exempt) | ✅ |
| 3 | LineagePage Navigator → `the circle widening` | ✅ |
| 4 | Gradations → `Choose how deeply you tend the HoneyComb.` | ✅ kept `the` |
| 5 | DingleBERRY ops chrome → `Platform posture` / `Platform impact` / `Platform-wide` ×2 | ✅ no veto |
| 6 | MiNiWaVeS — explicit yes required | ❌ **withheld → reverted all 5** |
| 7 | README cap → `111,222,333,333,222,111` | ✅ |

## Two errors of mine that ruling #1 and #2 caught

- **#1 was a real inconsistency, not a preference.** Phase 2 changed the escrow copy to
  "Bees review" *specifically* to avoid moving dispute authority from members to the
  platform — then wrote `accountable to the HoneyComb that fills them` into the Charter,
  the same inversion, in a document titled "The commons answer to their keepers."
- **#2 is the sharper catch.** `your HoneyComb` asserts member ownership of the platform.
  That is a worse failure than the colloquialism it replaced, and it appeared in the
  Charter's self-custody clause — the one place that framing does real damage.

Root cause for both: A8 was applied as a token-level swap across 42 sites without
re-reading each sentence for who the subject makes responsible.

## Ruling #6 — why the yes was withheld

Phase 2 renamed 5 sites to `MiNiWaVeS`. The sources were **root `CLAUDE.md`** (Layer 2
list), **`src/lib/astra-catalog.ts:89`**, and **`src/lib/astras/miniwaves.ts:6–8`**.
None of those outrank MMF v2.8, and root `CLAUDE.md` itself says *"The MMF is the source
of truth."* Butch reports MMF v2.8 carries `MiniWaves` / `MiniWAVES.app`. All 5 reverted.

### ⚠️ The unratified form was already shipping before this audit — 3 sites, untouched

Reverting my 5 does **not** clear it. Pre-existing, still live, all user-visible:

| Location | Value | Exposure |
|---|---|---|
| `src/lib/astras/miniwaves.ts:27` | `siteTitle: 'MiNiWaVeS · HONEYCOMB Motion Flow'` | **Server-rendered `<title>` for miniwaves.app** (`server/index.ts` reads `astra.siteTitle`) — what crawlers and social cards see |
| `src/lib/astras/miniwaves.ts:26` | `wordmark: 'MiNiWaVeS'` | AstraConfig wordmark |
| `src/lib/astra-catalog.ts:89` | `wordmark: 'MiNiWaVeS'` | Catalog listings |

Left unchanged — they need the same ratification my 5 needed, and they are not mine to
decide either. **If MMF v2.8 is authoritative, these are three bucket-A violations that
predate this audit, including a server-rendered page title.**

### The upstream cause you should fix at source

**Root `HONEYCOMB/CLAUDE.md` Layer 2 reads `MiNiWaVeS`.** That file auto-loads into every
Claude Code session anywhere under `HONEYCOMB/`. Until it matches the MMF, every future
session will re-derive the wrong form and this will recur. Same for
`src/lib/astras/miniwaves.ts:6–8`, which states the alternating form as settled canon and
cites BLiNG!/AtlasINTEL/FreedomBLiNGs as precedent — that comment is what made the form
look ratified.

## Still open (unchanged from Phase 2, minus the cap)

DB-layer `RAISE` strings · `notify()` titles · RLS names containing `hive` · §4.2's
"order book" reference vs Economy v3 · README "13 Realms" (canon says 14) · README's
33-vs-9 rank conflation · `mint_price`/`freedom_price` admin drift · `miniwaves.ts:8`
"Mini Waves" spoken form · 16 unreferenced `mini-waves-v*.html`.

**Plus one new, from ruling #7:** `src/components/hq/sections/EconomySnapshot.tsx:25`
carries `const HARD_CAP = 11_222_333_222_111` — the same stale cap just corrected in the
README, but in code, feeding an HQ supply display. Not changed here: it is a money-path
constant, which trips the Plan Mode Policy. One-line fix on your word.

---

# PHASE 3 — MiniWaves ratification + BigInt cap · MERGED & DEPLOYED

**Commit:** `294045b` · 4 files · +24 / −14
**Merge:** `0f94e80` (`--no-ff`) → `main` · **pushed** `5c27ae5..0f94e80`
**Total on main:** 38 files · +111 / −95

## Ruling 1 — MiniWaves is canon

| Site | Before | After |
|---|---|---|
| `src/lib/astras/miniwaves.ts:27` | `siteTitle: 'MiNiWaVeS · HONEYCOMB Motion Flow'` | `'MiniWaves · HONEYCOMB Motion Flow'` |
| `src/lib/astras/miniwaves.ts:26` | `wordmark: 'MiNiWaVeS'` | `'MiniWaves'` |
| `src/lib/astra-catalog.ts:89` | `wordmark: 'MiNiWaVeS'` | `'MiniWaves'` |

The `miniwaves.ts:6–8` comment was rewritten: it now records the 2026-07-25 ratification
and warns off re-deriving a stylized form from the BLiNG! / AtlasINTEL / FreedomBLiNGs
pattern — **those wordmarks are individually locked, not instances of a generalizing
rule.** That false analogy is what made the unratified form look settled and is what I
propagated in `4f5df6b`.

**Root `HONEYCOMB/CLAUDE.md` Layer 2** corrected to `MiniWaves`, with an inline note that
the alternating form was never ratified. Outside this repo, so not in the commit — but it
was the recurrence source, since it auto-loads into every session under `HONEYCOMB/`.

### Disclosed scope addition (not requested)

`astra-catalog.ts:89` `hosts: ['MiniWaves.app']` → `['MiniWAVES.app']`, matching the canon
domain form. **Verified inert:** real host resolution is `registry.ts:29`
(`ASTRA_REGISTRY.find(p => p.hosts.includes(host))`) against `miniwaves.ts:25`
`['miniwaves.app','www.miniwaves.app']`, which I did not touch. Every catalog `hosts`
comparison lowercases both sides (`astra-catalog.ts:125–127`, `AstraStatus.tsx:81`);
`AstraStatus.tsx:291–299` is display. Revert on one word.

## Ruling 2 — hard cap to BigInt

`EconomySnapshot.tsx` → `const HARD_CAP = 111_222_333_333_222_111n`; display via
`.toLocaleString()`, `Number()` only at the `pctFreed` ratio site. Target is already
**ES2022**, so the `n` literal needed no tsconfig change.

**Verified the defect was real:**

```
BigInt  .toLocaleString() → 111,222,333,333,222,111   ← exact
Number literal            → 111,222,333,333,222,110   ← silently wrong
Number.MAX_SAFE_INTEGER   →       9,007,199,254,740,991
```

The rounding lands on **…222,110**, not …112 as the ruling stated — same defect, one digit
off in the prediction. Code comments say …222,110.

### A third stale cap, not in the ruling

`src/admin/sections/SystemStateSection.tsx:11` carried the **same** `11_222_333_222_111`
with the same overflow defect, found by sweep. Single display-only use site (`:112`), so:
BigInt + `.toLocaleString()`. Fixing one admin cap and leaving the other would have been
the half-done failure.

## Gates

| Gate | Result |
|---|---|
| `npm run build` | ✅ green (BigInt compiles under ES2022) |
| `npm run lint` | ✅ 8 pre-existing errors, same 5 files, none touched |
| `main` vs `origin/main` pre-merge | ✅ both `5c27ae5`, no drift, instance #1 idle |
| Push | ✅ `5c27ae5..0f94e80` |

## Deploy — ✅ RESOLVED: SHA-confirmed *and* content-confirmed

> **Resolved 2026-07-25.** Butch ran the marker check from the chat session's sandbox
> against the full served bundle `assets/index-UkEJmzNY.js`:
>
> | Marker | Expected | Count |
> |---|---|---|
> | `Get · Auction · Raffle` | present | **1** |
> | `MiniWaves · HONEYCOMB Motion Flow` | present | **1** |
> | `111222333333222111` | present | **1** |
> | `Buy · Auction · Raffle` | absent | **0** |
> | `MiNiWaVeS` | absent | **0** |
> | `The Sovereign Ledger` | absent | **0** |
>
> **The firewall sweep is content-confirmed live.** Every positive present, every
> negative gone.
>
> ### Standing procedure locked from this (2026-07-25)
>
> **Code reports SHA + Railway status; the chat session confirms content markers via
> curl from its own sandbox.** Code cannot do the marker check — two independent
> blockers, both hit here:
>
> 1. `curl` denied in every form, so the live chunk filename is unobtainable — WebFetch
>    strips `<script>`/`<link>` tags from HTML, and no unhashed file lists asset names
>    (no Vite manifest; `sw.js` has no precache refs).
> 2. **WebFetch truncates large bundles — it is not a grep.** Asked about the live
>    ~200 KB `index-UkEJmzNY.js`, it returned ABSENT for all six markers above, i.e. it
>    was wrong on all six; it had seen only the head of the file. The lone hit was
>    `vite:preloadError` from Vite's own preload helper near the top, which is what
>    exposed the truncation. **A WebFetch "ABSENT" on a large bundle is inconclusive,
>    never negative.** Reporting one as negative would have raised a false alarm that
>    the firewall fixes had not shipped.
>
> The original blocked-state write-up is kept below unedited as the audit record.

---

Railway, via `gh`:

- deployment `5601141400`, sha `0f94e80`, env "TheMANUAL.tech / production"
- `in_progress` (12:13:45Z) → **`success`** (12:14:44Z)
- commit status: **`success`** — context "TheMANUAL.tech - themanual-tech"

**The content-marker check in the saved recipe could not be run.** All `curl` forms are now
denied — including the bare root fetch that the `2026-07-24` entry in
`logs/permission-needed.md` records as working, so this is a permission regression. The
recipe needs the live chunk's hashed filename, whose only source is the deployed HTML's
`<script src>` — and **WebFetch markdownifies HTML and strips `<script>` tags**, so that
filename is unreachable through WebFetch. Confirmed Railway's hash differs from local:
`WebFetch(/assets/index-BaQf3ykA.js)` returned the SPA shell (404 → Express catch-all).
`miniwaves.app` would have been an ideal server-rendered marker for exactly this change,
but it does not resolve to Railway (ECONNREFUSED).

So: Railway built and released the correct commit. Whether the served bundle contains the
expected strings is **unverified**, and I am not going to report it as verified.

Logged in `HONEYCOMB/logs/permission-needed.md`. One-command unblock, no permission change:

```
! curl -s https://themanual.tech/ | grep -oE 'assets/index-[^"]*\.js'
```

Then WebFetch that chunk and grep: `Get · Auction · Raffle` (present),
`Buy · Auction · Raffle` (absent), `MiniWaves · HONEYCOMB Motion Flow` (present),
`MiNiWaVeS` (absent), `111222333333222111` (present), `The Sovereign Ledger` (absent).
All three positive markers are confirmed present in the local `index-BaQf3ykA.js`.

*Status correction (2026-07-25): this report **is** tracked in git. It was committed as
`0b20095` — whose message reads "canon(brand): correct MiniWaves casing in root CLAUDE.md"
but whose only content is this file. The actual root-CLAUDE.md fix lives at
`HONEYCOMB/CLAUDE.md`, outside this repo, and was not in that commit. Earlier statements in
this report that the file is untracked or uncommitted (see the Phase-2 footer above)
described the state at the time of writing and are superseded by this note.*
