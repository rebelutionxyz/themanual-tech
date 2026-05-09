# Handoff — 2026-05-09

**Status.** Heavy canon day. Two tier-1 design docs shipped, four-tier admin framework locked and scaffolded with three live surfaces, one drift fix queued for Tuesday pre-flight. Three local commits, none pushed.

**Up next.** Sun 2026-05-10 — theMANUAL spine perfection. Mon 2026-05-11 — BLiNG! prep. Tue 2026-05-12 — BLiNG! build day.

---

## Architecture locked (canon)

- **Federation tier-1 scoping** — `shared/canon/federation-tier-1-scoping.md`. Nine locks plus Lock 1.1 resilience posture (read replica + hourly snapshot in scope; active-active hot failover out) and Lock 9.6 sovereignty tiers (Standard / Dedicated / Off-Grid framework). Three-database tier-1 architecture: BLiNG! (`freedomblings.com`) + theMANUAL spine + Platform; fourth (Regulated Data) anticipated when the first regulated Astra ships. **~$75/mo committed across the three Pro projects, instantiation deferred to triggers** (Open #30 for Platform DB cutover, Open #32 for Regulated DB).
- **Cancel-recovery ADR** — `shared/canon/cancel-recovery-adr.md`. Three locks. **Lock 1** Bee-to-Bee `bling_send` is atomic and final, no cancel mechanism, recovery is social (sender contacts receiver, optional counter-`bling_send`). **Lock 2** Stripe chargeback handling — explicit handler at `freedomblings.com` claws back BLiNG!, burns from `total_supply`, negative balance permitted, Bee transaction-locked while balance < 0. **Lock 3** escrow cancel/dispute policy verified against actual RPC bodies. Drift appendix flags four items (see Loose Ends).
- **Admin tier framework** — four tiers locked: **My Hex** (every Bee, amber), **Ops** (workspace-scoped), **Nexus** (cross-Astra silver), **Nucleus** (platform honey-gold). Self-assembly manifest pattern in `src/admin/`.
- **Logging convention** — `shared/canon/logging-convention.md`. Bracket-prefix pattern locked. Structured logger (`logPillar`) deferred indefinitely; not built tonight, not built next session unless a real signal demands it.
- **Visual treatment** — dark-blue base `#0A1628` + per-tier accent + dark-blue inset cards. The sandwich pattern is the canonical layout for admin surfaces.

---

## Code landed

- **Three admin routes live:** `/myhex` (Bee amber), `/nexus` (silver), `/nucleus` (honey gold).
- **`src/admin/`** — manifest pattern + tier registry + shared types + `AdminLayout`. New surfaces are additive: drop a manifest, register, route exists.
- **`src/lib/useUserRole.ts`** — role hook with safe fallbacks; surfaces fail closed when role data is absent.
- **`supabase/functions/check-keyholder/`** — Edge Function source built; **not yet deployed**. Deploy in own session per `CLAUDE.md` Edge Functions discipline.
- **Migration queued for Tuesday pre-flight:** `supabase/migrations/20260509120000_phase_c_b4_credit_purchase_callsite_fix.sql`. **NOT YET APPLIED.** Closes a latent failure: `bling_credit_purchase`'s body still calls `bling_mint` by name; `bling_mint` was renamed to `bling_free` on 2026-05-08; PL/pgSQL resolves at execution time so every Stripe purchase that needs the curve-FREE branch will error. Bug is latent only because Stripe is deferred. **Apply BEFORE any Stripe webhook activation Tuesday.** See `cancel-recovery-adr.md` Appendix item 3.
- **Logging cleanup** — three `UtilityChrome` stubs converted to TODO no-ops; `intel.ts` prefix consistency pass applied.
- **Admin chrome polish** — `TopTickerSlot` / `GeoLensBar` suppressed on admin surfaces; sidebar height made robust (no longer assumes a 56px header).

---

## Infrastructure

- **Hotkey naming locked** — Path A: `HONEYCOMB_MASTER_current.md` is the stable target. Versioned snapshots use the dated form; "current" always points to the live working file.
- **Domain inventory** — `ibee.to` confirmed owned, pinned for future product use. **No canonical domain list exists yet** — flagged for a future cleanup session.

---

## Loose ends deferred

| ID | Item | Resolves at |
|----|------|-------------|
| #30 | Platform DB migration plan (move platform tables out of theMANUAL spine into a new Pro project) | Triggered by Tuesday's BLiNG! work / own design session |
| #32 | Regulated Data DB instantiation | When the first regulated Astra ships |
| #CR-1…#CR-7 | Cancel-recovery follow-ups (Stripe handler build, Bee notifications, dispute-closed reconcile, Board of Astras dispute resolution, `bling_cancel_order` RPC + pre-debit hardening, DiGiTs cancel posture, deletion-during-chargeback edge case) | Mostly BLiNG! build day Tue 2026-05-12; one to §32 |
| §32 | Board of Astras governance design (membership, voting, scope of authority over `freedomblings.com` parameters) | Own session post-BLiNG! build day |
| #33 | Sovereignty Tier pricing | Sovereignty Tiers design session |
| #34 | BRANDoSOPHIC tier-selection integration | BRANDoSOPHIC build day · Fri 2026-05-15 |
| #35 | Off-grid jurisdiction list | Infrastructure design session |
| — | Claude Design `DESIGN.md` | Ready when she's available |
| — | `KEYHOLDER_BEE_IDS` not yet set; `check-keyholder` Edge Function not yet deployed | Tuesday pre-flight (own session) |
| — | `bling_transactions.type` CHECK still allows `'minted'`; `bling_free` body writes `type='minted'` — language-firewall debt | Separate session — bigger than a one-line fix (rename CHECK enum value, decide on backfill vs. dual-allowed window) |

**Cancel-recovery ADR drift appendix** also flags two items beyond #CR-5 worth re-reading before Tuesday: `bling_cancel_order` RPC is missing entirely, and `bling_place_order` does not pre-debit balance (v9 hardening that did not land). Both are tracked in #CR-5.

---

## Calendar

| Date | Slot |
|------|------|
| Sun 2026-05-10 | theMANUAL spine perfection day |
| Mon 2026-05-11 | BLiNG! prep |
| Tue 2026-05-12 | **BLiNG! build day** |
| Fri 2026-05-15 | BRANDoSOPHIC build day |

**Tuesday pre-flight checklist** (do these in order, before Stripe webhook is wired):
1. Deploy `check-keyholder` Edge Function (own session per CLAUDE.md).
2. Set `KEYHOLDER_BEE_IDS` in environment.
3. Apply `20260509120000_phase_c_b4_credit_purchase_callsite_fix.sql`. The pre-flight `DO $$` block aborts if the rename precondition does not hold; if that fires, stop and investigate before proceeding.

---

## Commit status

Three local commits today (Code 1 closeout pass): canon docs, HQ scaffolding code, drift-fix migration. **Local only, not pushed.** Remote state is unchanged.

🐝🍯
