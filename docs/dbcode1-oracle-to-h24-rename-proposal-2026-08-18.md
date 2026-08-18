# DBCODE1 — Rename `atlasoracle_*` / `oracle_*` DB objects → `h24_*` (PROPOSAL)

**Status:** PROPOSED — nothing applied. Draft migrations live in
`supabase/migrations/_drafts/20260818210000_dbcode1_rename_oracle_atlasoracle_to_h24.sql`
(+ `_rollback.sql`). Apply is **owner-gated** and must land in the **same push as FRONTCODE1**
(the code-layer rename) so code and schema never disagree. ORACLE_MF v1.57 ("code too").

**Type:** metadata-only. **No data movement.** Highest-risk pass on the board — the objects carry the
money/auth layer (token ledger + Stripe idempotency). Enumerated live from `pg_class` / `pg_proc` /
`pg_constraint` / `pg_index` / `pg_policies` / `pg_depend`, not from a map.

---

## 1. Object inventory (what renames)

| kind | count | objects |
|---|---|---|
| tables | 8 | `atlasoracle_canon_reads`, `atlasoracle_directives`, `atlasoracle_provider_pool`, `oracle_model_rates`, `oracle_token_consumption`, `oracle_token_ledger`, `oracle_token_packs`, `oracle_token_plans` |
| view | 1 | `oracle_token_balances` (security_invoker) |
| functions | 11 | see §3 |
| constraints | 32 | PK/FK/CHECK/UNIQUE whose names embed the prefix |
| standalone indexes | 17 | incl. the partial-unique **money idempotency guards** |
| RLS policies | 7 | select_own / public_read / select_authenticated |

**Transform rule (uniform):** strip leading `atlasoracle_` or `oracle_`, prepend `h24_`. No new-name
collisions (verified); no `h24_*` objects pre-exist. No oracle-named sequences; no standalone
enum/domain types (the `pg_type` rows are implicit table row-types that rename with their table).

## 2. Dependency graph (walked, complete)

- **Internal FKs (auto-follow a rename, OID-based):** `oracle_token_consumption.debit_id/source_id →
  oracle_token_ledger`; `oracle_token_ledger.directive_id → atlasoracle_directives`.
- **External FKs (NOT renamed, untouched):** `atlasoracle_directives → astra_registry / bees /
  nova_registry`; `*_bee_id → bees`.
- **View:** `oracle_token_balances` reads `oracle_token_ledger` + `oracle_token_available()` — both
  OID refs, so the stored query auto-updates when they rename; the view itself is renamed too.
- **RLS policy quals:** all trivial (`auth.uid() = bee_id` / `active = true` / `true`) — **no**
  reference to any renamed object inside a qual. Policies survive a table rename; only their names are
  stale (renamed for completeness).
- **`ON CONFLICT` in functions is COLUMN-based** (`(bee_id, purpose)`, `(directive_id) WHERE …`) — **not**
  constraint/index NAME based — so renaming indexes/constraints does not touch any function body.
- **Triggers:** none on any target table.
- **External callers:** NONE. `active_membership_check` and `dingleberry_astra_of` only contain
  string-literal activity tags (`'atlasoracle_escrow_deposit'` …) — DATA, not object references.
- **Grants (SELECT/EXECUTE) + RLS:** attached by OID → survive rename automatically; nothing to re-grant.

## 3. Functions — two classes, and WHY (the load-bearing distinction)

A `RENAME` does **not** update PL/pgSQL bodies (name references are stored as text). So each function is
handled by whether its body references a **renamed object**:

**A. Escrow group — RENAME OBJECT ONLY, body untouched (5):**
`atlasoracle_credit`, `atlasoracle_debit`, `atlasoracle_deposit_to_escrow`,
`atlasoracle_get_escrow_balance`, `atlasoracle_withdraw_from_escrow`.
Their bodies reference only `bling_pots` / `bling_transactions` / `lot_debit` / `lot_credit` (NOT
renamed) plus **string-literal DATA tags** — `'atlasoracle_escrow'`, `'atlasoracle_escrow_deposit'`,
`'atlasoracle_escrow_withdraw'`, `'atlasoracle_refund'`, `'atlasoracle_directive'` — that **existing
production rows already hold** (`bling_pots.purpose`, `bling_transactions.source_type`). Rewriting those
strings would split escrow accounting. So these functions are renamed as objects **only**; their bodies
(and the data tags) are left exactly as-is. Verified they make **no** cross-call to any renamed function.

**B. Body-swap group — RENAME + `CREATE OR REPLACE` with object refs swapped (6):**
`atlasoracle_check_rate_caps` (reads `atlasoracle_directives`), and the five token functions
`oracle_credit_token_purchase`, `oracle_debit_tokens`, `oracle_grant_plan_tokens`,
`oracle_refund_token_purchase`, `oracle_token_available` (read `oracle_token_*` tables + call each other).
The recreated bodies swap **only** schema-object identifiers; the whole-word swap is safe here because
these six bodies contain **no** colliding data string (the ambiguous `'atlasoracle_escrow*'` /
`'atlasoracle_directive'`-singular literals live only in the escrow group). Preserved verbatim in these
bodies: `entry_type` values (`'purchase'`/`'grant'`/`'debit'`/`'adjustment'`), `plan_tier` value
`'oracle'`, `pack_code` values. RENAME preserves OID → the view's dependency on
`oracle_token_available` stays intact through the swap.

## 4. THE METADATA-ONLY BOUNDARY (read this before approving)

Only schema **object names** change. Every `atlasoracle_/oracle_` **string literal that is DATA** stays:
- `bling_pots.purpose` / `bling_transactions.source_type` tags (`'atlasoracle_escrow*'`, `'atlasoracle_refund'`, `'atlasoracle_directive'`) — held by live rows.
- `oracle_token_plans.plan_tier` value **`'oracle'`** (a tier name, not the product) and its CHECK expression.
- `oracle_token_ledger.entry_type` enum-ish values.

A full "h24" **data** rebrand (UPDATE-ing those values) is a **separate, riskier data migration** and is
**NOT** in this proposal. If the owner wants it, it is its own pass with its own risk review.

## 5. Migration structure

Forward (one transaction): tables → view → functions (rename all 11, then recreate the 6) → constraints
→ indexes → policies → **verification** (a `DO` block that RAISES if any `atlasoracle_/oracle_` relation
or function remains — the "no half-rename" proof, enforced at apply time).

Rollback (written FIRST, exact inverse): policies → indexes → constraints → functions (rename back +
restore the 6 **original** bodies verbatim) → view → tables. Restores the exact prior names.

## 6. Proof

- **Dependent graph complete:** `pg_depend`/catalog walked for FKs, views, policies, triggers, external
  callers (§2). The only things that break on a bare rename are the 6 body-swap functions; handled.
- **Rollback restores names:** the reverse renames every object back and reinstalls the 6 captured
  original bodies verbatim (55 original `oracle_token_*` refs restored).
- **No object left half-renamed:** the forward's verification `DO` block fails the apply if any relation
  or function still matches `atlasoracle\_%` / `oracle\_%`. (Constraints/indexes/policies are renamed
  explicitly; a residual-name audit can be added to the verification if the owner wants it belt-and-suspenders.)
- **Data safety:** escrow bodies untouched; body-swap guarded to schema identifiers only; generation ran a
  data-string guard (no `h24_escrow`/`h24_refund'`/`h24_directive'` produced).

## 7. Coordination — MUST move together (do not orphan)

- **FRONTCODE1** renames the code layer (client TS + the three **edge functions** `atlasoracle-route`,
  `oracle-checkout`, `oracle-webhook`, which call these tables/RPCs by name). **Apply DBCODE1 and deploy
  FRONTCODE1 in the SAME push** — a rename applied without the code redeploy breaks h24 + the storefront
  (FRONT81) + billing immediately. Edge-function deploys are their own gated step (DEPLOY AMENDMENT).
- **DB76** (consent ledger) and **DB74** (`db74_media_visibility`) — checked live: neither has a column
  or object referencing the renamed oracle objects today (DB76 unapplied; DB74 is on media tables). No
  live reference to move. **Forward note:** when DB76 lands it must target `h24_*` names.
- **Data tags** (§4) stay `atlasoracle_*` in `bling_pots`/`bling_transactions` rows unless a separate data
  pass is ruled.

## 8. THE ONE ASK

Approve the coordinated apply of DBCODE1 (forward) **together with FRONTCODE1**, in one push, when
FRONTCODE1 is ready (it is gated on FRONT86 → FRONTCODE1). Apply is via `apply_migration` (ask-gated,
your click), after a recorded pre-flight and a re-measure to reconcile.

Two calls to confirm alongside the click:
1. **Escrow group disposition** — the 5 legacy BLiNG!-escrow RPCs are RENAMED here (safe, per the
   dispatch). They were superseded by the token ledger (your 2026-07-27 ruling). If you'd rather **DROP**
   them than rename, say so — that's a separate destructive decision, not in this proposal.
2. **Metadata-only** — confirm the data tags / `plan_tier 'oracle'` stay unchanged (§4); a data rebrand is
   a separate pass.

### OWNER RULING (2026-08-18): "a rename b-confirm"
- (a) **RENAME** the 5 legacy escrow RPCs — do NOT drop. The drafts already do exactly this; no change.
- (b) **Metadata-only CONFIRMED** — data tags (`'atlasoracle_escrow*'` / `'atlasoracle_refund'` /
  `'atlasoracle_directive'`) and `plan_tier` value `'oracle'` stay unchanged. No data rebrand.
Both confirmations match the drafts as built. The forward/rollback stand ready for the coordinated apply
with FRONTCODE1 (same push, owner click). No regeneration needed.
