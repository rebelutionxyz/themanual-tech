# AtlasORACLE — TIERS ARE BANDS, NOT MODELS

**Pass:** DOCS13 · **Date:** 2026-07-30 · **Scope:** oracle
**DESIGN ONLY. No code, no schema, no deploy. Stops for lead review.**

**Butch ruling 2026-07-31:** *"I thought we were adding all ai choices so the user has full access
to what is available. The tier selection would give you multiple providers in that tier to choose
from."*

**Input:** DOCS12 `atlasoracle-provider-map-2026-07-30.md` — the consolidated route map, and the
source of the rights column below.

**Standing correction honored:** OPS37's recommendation to deprecate `atlasoracle_provider_pool` is
**withdrawn by the lead**. Nothing here labels the pool dead. It is designed toward.

---

## 0. What is actually true today — read live, not assumed

Four facts from production this pass. Two of them change the design.

**(a) The defect is three lines.**

```ts
const TIER_PROVIDER_MODEL: Record<Tier, string> = {
  free:     'claude-haiku-4-5',
  standard: 'claude-sonnet-5',
  frontier: 'claude-opus-5',
};
```

Every paid path reaches one company. The ruling is right that this is a defect rather than a
design.

**(b) The band column already exists, and it is already data.** `oracle_model_rates` carries
`model_name · tier · input_tokens_per_m · output_tokens_per_m · cached_input_per_m ·
effective_from · active · source_note`. **`tier` is the band assignment, per model, in a table.**
This matters enormously for question 1 — see §1.

**(c) ⚠ The pool's vocabulary does not match the tier vocabulary.**

```
atlasoracle_provider_pool_category_chk
  CHECK (provider_category = ANY (ARRAY['frontier','mid-tier','fast','oss','specialized']))
```

against tiers `free | standard | frontier`. **These are two different axes wearing one word.**
`frontier` appears in both and means different things: a *capability class* in the pool, a
*commercial band* in rates. **Any wiring of the pool has to resolve this first, and the resolution
is not cosmetic.** §1.3.

**(d) ⚠ There are duplicate active rate rows, right now.**

Seven rows, four models, and **three models carry two `active = true` rows each** —
`claude-haiku-4-5` (free ×2), `claude-sonnet-5` (standard ×2), `claude-opus-5` (frontier ×2). The
pairs differ: the 16:21 rows are marked `PLACEHOLDER - NOT A PRICING RULING`, the 20:04 rows carry
the Butch pricing ruling, and **the numbers differ by more than 2×** (sonnet standard: 4000/20000
vs 9000/45000).

The router is safe today because it takes *"newest active row per model"* by `effective_from`. **A
picker UI is not automatically safe**, and this is the single most likely way a user-facing price
ends up disagreeing with the charged price. §3.

**(e) The free tier is already multi-provider — the Bee just cannot see it.** A documented ladder
runs **Groq first, Anthropic Haiku as fallback**, because Groq's free plan is 30 RPM / 6,000 TPM
and the canon prefix alone is ~1,530 tokens — *"roughly 3.5 directives/minute PLATFORM-WIDE."*
Free also **skips the rate lookup entirely.** Both facts constrain question 5.

---

## 1. Question 1 — what defines a band?

### 1.1 Recommendation: **the band is `oracle_model_rates.tier` on the model's newest active row. No new taxonomy.**

Provider #6 through #60 is then literally an `INSERT` into a table that already exists, with a
column that already exists, read by a router that already reads it. **The cheapest correct design
here is the one that invents nothing.**

The rule, stated so it can be implemented without further interpretation:

> **A model is selectable in band B if, and only if, its newest `active` row in
> `oracle_model_rates` has `tier = B`, AND it has a live route row in the pool, AND that route is
> marked admissible.** Three conditions, all data, no code change to add a provider.

### 1.2 The alternative I considered and reject: derive the band from price

Tempting, because it is self-maintaining: sort by `input_tokens_per_m`, cut at two thresholds,
done. **Reject it.**

- **Price is a proxy for quality and it is a poor one.** DOCS12's clearest finding is that rights
  quality and price are not trading against each other; there is no reason to expect capability
  and price to track cleanly either. A cheap model that is genuinely frontier-class would be
  mis-shelved by arithmetic, and an expensive weak one promoted.
- **It makes the band move when the price moves.** A provider's price cut would silently
  re-shelve a model into a different band, changing what users are offered without anyone
  deciding. **Bands are a product promise; they should move when someone rules, not when a vendor
  runs a sale.**
- The `source_note` discipline already in `oracle_model_rates` — every row explaining *why* that
  number — is exactly the audit trail a hand-assigned band wants and a derived one destroys.

**Trade-off, stated honestly:** an explicit `tier` column means a human judges each new model. That
is real ongoing work and it can drift or be gamed by whoever writes the INSERT. I accept that cost
because the alternative silently re-shelves products on vendor price moves, which is worse.

### 1.3 The pool-vs-rates vocabulary collision — resolve it by keeping both axes separate

**Do not** widen the pool's CHECK to `free|standard|frontier`, and **do not** narrow the rates'
`tier`. They are answering different questions, and collapsing them loses information:

| axis | lives in | vocabulary | answers |
|---|---|---|---|
| **Capability class** | `atlasoracle_provider_pool.provider_category` | frontier · mid-tier · fast · oss · specialized | *what kind of model is this* |
| **Commercial band** | `oracle_model_rates.tier` | free · standard · frontier | *what does the Bee pay, and which picker does it appear in* |

They will usually correlate and **must not be assumed to.** A `fast` model can be commercially
`free`; a `specialized` model could be `standard`. Keeping them apart is what lets a
frontier-capability model be offered in the standard band as a loss leader, or an oss model be
sold, without a schema fight.

**One naming hazard to fix in the same breath:** `frontier` currently means two things. Recommend
renaming the pool's capability value to `frontier-class`, or renaming the band. **Butch's call —
naming.** Whichever way, the collision should not survive into a UI that shows both.

### 1.4 The pool's rows are stale and should be treated as seed, not truth

`oss-llama-3` and `groq-mixtral` have no counterpart in `oracle_model_rates`, and the free tier's
actual model is `llama-3.1-8b-instant`. **The pool has never been read by anything, so nothing
noticed.** Wiring it means reseeding it, not just joining to it.

---

## 2. Question 7, taken second because it constrains everything below — rights follow the route

DOCS10 **P3**, carried into DOCS12: the same model reached through a storefront is governed by the
storefront's terms. DOCS12 records four route-pairs where the rights outcome is **opposite** for an
identical model name.

**Therefore the pool's unit must become provider-plus-route, and its unique key must change.**
Today `atlasoracle_provider_pool_name_key UNIQUE (provider_name)` makes it structurally impossible
to represent the same model on two routes — the exact thing the ruling requires.

**And the picker must show the route, not just the model.** A picker listing "ElevenLabs" once,
when one route carries an opt-out and the other a perpetual irrevocable training licence, is not a
simplification — **it is a misrepresentation of the user's own rights.** The picker's row label
should read *provider · via route*, e.g. `ElevenLabs — direct` and `ElevenLabs — via Runway`, with
the rights posture attached to each.

**Recommendation:** the picker surfaces three rights facts per row, sourced from DOCS12 and stored
on the route row, not fetched live: **trains on input (yes/no/opt-out) · who owns the output ·
admissible (yes/no/conditional)**. **A route marked inadmissible is not rendered at all** — it must
be impossible to pick, not merely discouraged.

**Trade-off:** this makes the picker denser and the seed data a maintenance burden that goes stale
silently as vendors change terms. Mitigation is a `terms_verified_at` column and a staleness
display, not a promise of freshness. **I would rather show a date than imply currency.**

---

## 3. Question 3 — rates are the gate

**Keep the 503-rather-than-guess rule exactly as it is.** It is the single best-behaved thing in
the current router: *"a missing rate is a 503, never a guess."*

**But a picker changes the failure's timing, and that is the point of this question.** Today a
missing rate fails at submit, invisibly, on a path the user did not choose. With a picker, a
missing rate would fail **after** the user made a deliberate choice — which is a worse experience
for the same defect.

**Recommendation: the picker is populated by a join that cannot produce an unpriceable option.**

> The selectable set for band B = routes in the pool, `active = true`, admissible, **INNER JOIN**ed
> to the newest `active` rate row for that model where `tier = B`. An inner join means a model with
> no rate row is structurally absent from the list rather than filtered out of it.

**And the duplicate-active-row hazard from §0(d) must be closed before any UI reads rates.** The
picker and the router must use the **identical** "newest active by `effective_from`" rule, and I
recommend expressing it once — as a view — rather than twice in two languages:

- **Why a view:** two implementations of "newest active row" is exactly how a displayed price and a
  charged price drift apart. A user shown 4000/20000 and charged 9000/45000 is a trust incident,
  and both numbers are live in the table right now.
- **The cheaper alternative** — deactivate the three placeholder rows so there is one active row
  per model — is a **data** fix that should happen regardless, but it does not *prevent*
  recurrence. Do both: clean the data, express the rule once.

**Neither is applied here.** Both appear in the migration sketch, §7.

---

## 4. Question 2 — how the user chooses

**Recommendation: house default, remembered preference, per-directive override. In that order of
precedence, resolved server-side.**

1. **A Bee who does not care gets a house default and never sees a picker.** This is the
   load-bearing requirement. The ruling is about *access*, not about compulsory choice — "full
   access to what is available" is satisfied by the choice being *available*, not by it being
   *mandatory*. A trivia patron or a first-time Bee must be able to send a directive without
   learning a vendor taxonomy.
2. **A remembered preference per band**, stored per Bee. Someone who has chosen once has expressed
   a standing preference; asking again every time is friction that punishes the engaged user.
3. **A per-directive override**, because the reason to switch is usually task-shaped ("this one is
   long, give me the big one"), not identity-shaped.

**Where the default comes from:** the pool's `selection_weight`, which exists and is unused —
highest weight in the band wins. That is what the column is for, and it makes the house default a
data decision rather than another constant in the router.

**Trade-off:** three layers of precedence is more state than one hardcoded model, and every layer
is a place a stale preference can point at a model that has since been deactivated. **The
resolution order must therefore end in a fallback to the band default, and a preference that no
longer resolves must be dropped rather than erroring.**

**One thing I recommend against:** showing prices *inside* the picker as dollar figures. Oracle
Tokens are the denomination; a picker that quotes provider dollars re-teaches a unit the platform
has deliberately abstracted. Show relative cost within the band, and let the confirm-cost gate
speak in Oracle Tokens where it already does.

---

## 5. Question 4 — the confirm-cost gate re-derives on selection

**Recommendation: the gate is computed server-side at submit, against the selected route's rate
row, and never at page load.**

The current estimate already scales with directive size (OPS10 fixed a gate that was
arithmetically unreachable). Adding model choice makes the estimate a function of **two** inputs —
size *and* selected model — and page load knows neither reliably: the user has not finished typing,
and may change the selection afterward.

Concretely:

- **Page load may show an indicative range for the band**, clearly labelled as such.
- **The binding number is produced at submit**, from the newest active rate for the *selected*
  model, and it is that number the Bee confirms.
- **Changing the selection after a preview invalidates the preview.** If the client holds a
  confirm token, it must be bound to (model, route, estimated tokens) so a swap cannot carry a
  cheaper model's confirmation onto a dearer one.

**Trade-off:** a submit-time gate means a round trip before the user sees the real number, which is
slower than a page-load estimate. Accept it — **the alternative is quoting a price the router will
not honour**, which is §3's trust incident by another door.

---

## 6. Questions 5 and 6 — free-tier choice, and what happens when a chosen provider fails

These two are one question, because the free tier is where the answer is already visible.

### 6.1 Free tier: **yes, the Bee may choose — and the default must stay Groq-first**

Canon says free routes to free/OSS providers, plural, and the ladder already is plural. But the
constraint is hard and documented: Groq's free plan is **30 RPM / 6,000 TPM**, roughly **3.5
directives per minute platform-wide**. **A free picker can therefore promise a provider that will
429.**

**Recommendation:** offer the choice, and state the ladder in the UI rather than hiding it — *"Groq
(if busy, Haiku)"*. That is honest, it is what the system already does, and it pre-empts §6.2's
problem instead of discovering it at failure time.

**Note the free tier skips the rate lookup entirely**, so §3's inner-join gate does not apply to
it. Free needs its own selectable-set rule: pool routes marked free-eligible, no rate join. **Do
not paper over this difference — it is why free is cheap.**

### 6.2 Failure: **fail honestly and name who was down — do NOT silently cross a rights boundary**

This is the question where I most want to disagree with the existing behaviour.

The current ladder falls back silently, and that is **correct while the system chooses**, because
the Bee expressed no preference and the fallback is invisible by construction. **It stops being
correct the moment the Bee makes an explicit choice**, for a reason that is not about UX:

> **A silent cross-provider fallback can silently change who trains on the Bee's directive.**
> DOCS12's table has providers whose training posture is opposite. A Bee who deliberately picked a
> no-training route and was quietly served by a trains-by-default one has had a rights decision
> reversed without being told. **That is not a degraded experience; it is a broken promise.**

**Recommendation, three rules:**

1. **Fall back automatically only within a rights-equivalent set** — same training posture, same
   ownership answer, both admissible. Define the set in data on the route row so it is auditable.
2. **When a fallback happens, say so in the response** — which provider was chosen, which was used,
   and why. Naming the outage is more trustworthy than hiding it, and it is information the Bee can
   act on.
3. **When no rights-equivalent route is available, fail** with the provider named, rather than
   crossing the boundary. An honest 503 that says *"Groq is rate-limited and the alternative has a
   different data policy — retry, or choose again"* is a better product than a silent substitution.

**Trade-off, and it is a real one:** rule 3 converts some availability into errors. A Bee who does
not care about rights posture will see a failure where today they would have seen an answer.
**Mitigated by §4's default path** — a Bee who never opens the picker never pins a route, so the
ladder is free to do what it does today. **The strictness applies only to Bees who chose**, which
is exactly the population whose choice means something.

---

## 7. Migration sketch — **NOT APPLIED**

Illustrative, for lead review. **Nothing here was run.** No pre-flight has been done; under the root
R7 MIGRATION AMENDMENT each of these needs a named migration, a stated rollback, and a recorded
pre-flight before it is anything more than a sketch.

```sql
-- ── 1. DATA HYGIENE, and it should happen whether or not the picker is built.
-- Three models carry two active rate rows each; the placeholders predate the
-- pricing ruling. Deactivate rather than delete — rate history is load-bearing,
-- a debit must stay re-derivable against the rate that was live when it happened.
UPDATE public.oracle_model_rates
   SET active = false
 WHERE source_note LIKE 'PLACEHOLDER%' AND active;
-- Rollback: UPDATE … SET active = true WHERE source_note LIKE 'PLACEHOLDER%';

-- ── 2. ONE definition of "the current rate", so the picker and the router
-- cannot drift apart (§3).
CREATE VIEW public.oracle_model_rates_current AS
SELECT DISTINCT ON (model_name) *
  FROM public.oracle_model_rates
 WHERE active
 ORDER BY model_name, effective_from DESC;
-- Rollback: DROP VIEW public.oracle_model_rates_current;

-- ── 3. THE POOL BECOMES ROUTE-SHAPED (§2). Its unique key on provider_name
-- alone is what currently makes P3 inexpressible.
ALTER TABLE public.atlasoracle_provider_pool
  ADD COLUMN route              text NOT NULL DEFAULT 'direct',
  ADD COLUMN model_name         text,          -- joins oracle_model_rates
  ADD COLUMN trains_on_input    text,          -- 'no' | 'yes' | 'opt-out' | 'unknown'
  ADD COLUMN customer_owns      text,
  ADD COLUMN admissible         text NOT NULL DEFAULT 'unknown',  -- yes|no|conditional|unknown
  ADD COLUMN admissible_reason  text,
  ADD COLUMN terms_verified_at  timestamptz;   -- show the date, never imply freshness
ALTER TABLE public.atlasoracle_provider_pool
  DROP CONSTRAINT atlasoracle_provider_pool_name_key,
  ADD  CONSTRAINT atlasoracle_provider_pool_name_route_key UNIQUE (provider_name, route);
-- Rollback: drop the columns, restore UNIQUE (provider_name) — only possible
-- while no two rows share a provider_name, so rollback has a shelf life.

-- ── 4. The selectable set, expressed once (§3). Inner join = an unpriceable
-- model is structurally absent, not filtered.
CREATE VIEW public.oracle_selectable_routes AS
SELECT p.provider_name, p.route, p.provider_category, p.selection_weight,
       p.trains_on_input, p.customer_owns, p.admissible, p.terms_verified_at,
       r.tier AS band, r.input_tokens_per_m, r.output_tokens_per_m
  FROM public.atlasoracle_provider_pool p
  JOIN public.oracle_model_rates_current r ON r.model_name = p.model_name
 WHERE p.active AND p.admissible IN ('yes','conditional');
-- Rollback: DROP VIEW public.oracle_selectable_routes;
-- NOTE: the free tier does NOT use this view — free skips the rate lookup by
-- design (§6.1) and needs its own free-eligible rule.

-- ── 5. Reseed the pool. Present rows are stale seed: oss-llama-3 and
-- groq-mixtral have no rate counterpart, and the live free model is
-- llama-3.1-8b-instant. Rows come from DOCS12's map, one per ROUTE.
-- Left unwritten deliberately: seeding is a content decision, and DOCS12 marks
-- several providers' rights posture UNKNOWN. A row whose admissible column
-- would read 'unknown' should not be inserted merely to look complete.
```

**Not in this sketch, on purpose:** the per-Bee preference store (§4). It needs the picker's shape
settled first, and adding a preferences table before anyone has agreed what a preference *is* would
be inventing schema ahead of the decision.

---

## 8. What must change in `atlasoracle-route`, and what must not

**Changes:**

| # | Change | Why |
|---|---|---|
| 1 | **`TIER_PROVIDER_MODEL` stops being the answer.** It becomes the *fallback* when no selection is supplied and no preference resolves | It is the defect the ruling names, but it is also the only thing standing between a bad lookup and no model at all — demote it, do not delete it |
| 2 | Accept an optional **`route`** on the request — provider + route, not a model name | §2. A model name alone cannot express P3 |
| 3 | **Validate the selection server-side against the selectable set** for the requested band | A client-supplied model must never be trusted to be priceable, admissible, or in-band |
| 4 | **Resolve rates through the single current-rate definition** | §3 — displayed price and charged price must come from one place |
| 5 | **Re-derive the confirm-cost gate against the selected model at submit**, and bind any confirm token to (model, route, tokens) | §5 |
| 6 | **Constrain fallback to rights-equivalent routes; report the substitution in the response** | §6.2 |

**Must NOT change:**

| # | Keep | Why |
|---|---|---|
| 1 | **Missing rate → 503, never a guess** | The best-behaved rule in the router; a picker makes it more important, not less |
| 2 | **Rates as data, re-pricing as an INSERT** | Already correct, and it is what makes provider #60 an insert |
| 3 | **Newest active row by `effective_from`; history preserved** | A debit must stay re-derivable against the rate live when it happened |
| 4 | **Free tier skips the rate lookup, and the Groq→Haiku ladder** | §6.1. The ladder is documented load-bearing behaviour, not decoration |
| 5 | **Response never persisted; `atlasoracle_directives` stays metadata-only** | Verified again in DOCS11: that table has no content columns. Adding provider choice must not add one |

---

## 9. Done-test

| Requirement | Status |
|---|---|
| Every question answered with a recommendation **and its trade-off** | **Met** — §1–§6, each carries an explicit trade-off paragraph |
| Band-assignment rule expressed as **data** | **Met** — §1.1: `oracle_model_rates.tier`, newest active row; provider #60 is an INSERT |
| Migration sketch, marked NOT APPLIED | **Met** — §7, five steps with rollbacks, nothing run |
| Rights/route column present in the picker design | **Met** — §2, and in the sketch's pool columns |
| Explicit statement of what changes in `atlasoracle-route` and what stays | **Met** — §8, six and five |
| Zero code written | **Met** |

**Two things I did not do, deliberately:** I did not seed the pool (§7 step 5 explains why a row
with `admissible = 'unknown'` should not exist just to look complete), and I did not design the
preference store. Both want the lead's answer on §1.3's naming collision and §4's precedence model
first.
