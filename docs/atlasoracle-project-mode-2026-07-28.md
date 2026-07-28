# AtlasORACLE — PROJECT MODE

**Design doc. No build.** DOCS8 · lane `docs` · scope `oracle` · 2026-07-28

> **Butch, 2026-07-28:** *"have oracle choose the proper ai for each task of a query or project the
> way we do it with the rails — it seems like it is just for smaller queries currently."*

He is right about the current state. `atlasoracle-route` is a **one-directive** function: one body,
one category, one tier, one provider call, one debit, one response (`atlasoracle-route/index.ts`
§Body, lines 5–12). There is no notion of a task that has parts. Project Mode is the layer that gives
it one.

The design constraint that shapes everything below is `ORACLE_MF v0.7` #5 — the rail is not an
analogy for this feature, it **is** the feature, already built and already battle-testing itself
running HONEYCOMB. So the discipline of this doc is: for every mechanism, either name the rail
concept it reuses, or state plainly why the rail concept cannot carry it. Both lists are in §0.

---

## 0. The rail mapping, up front

| Project Mode mechanism | Rail concept | Verdict |
|---|---|---|
| Project directive | a lead session working a board | **reuse** |
| Task directive | one `ops_dispatches` row | **reuse** — `parent_directive_id` + `task_index` is the `pass` id |
| Task category | `lane` | **reuse** — `categorization.md`'s ten directive categories are the lanes |
| Task tier | the `EFFORT:` stamp the lead writes into every dispatch title | **reuse** — already a per-dispatch quality band chosen by the orchestrator |
| Dependencies | `after_pass` | **reuse, narrowed** — one predecessor in v1, see §1.3 |
| Ordering / urgency | `priority` (100 default, 10 urgent) | **reuse** |
| Task states | `queued` → `claimed` → `done` | **reuse**, renamed to the directive table's existing `pending`/`running`/`success` |
| Blocked-task display | the board's `BLOCKED after <pass>` flag | **reuse** — mission control already renders it |
| Assembly step | `ops_reports` / `REPORT.md` as report of record | **reuse in spirit** — one artifact of record per project |
| A task that cannot proceed | **R4** — file a question, do not guess, do not stall silently | **reuse**, and it is the best idea the rail has for this feature (§1.5) |
| Consent boundaries on what a task may do | **R5** `scope` + **R7** hard limits | **reuse** — carries `v0.8 §1c` consent-gating directly |
| Cost confirmation | the human's `go` | **reuse in spirit** — the confirm-cost gate is where the human still stands in the loop |

**Cannot be reused, and why:**

| Rail concept | Why it does not carry over |
|---|---|
| `UPDATE … FOR UPDATE SKIP LOCKED` claiming | The rail is **pull**-based: independent terminals claim work when a human says `go`. Project Mode v1 has **no independent workers** — the orchestrator pushes each task to a provider over HTTP. SKIP LOCKED solves contention between claimers, and in v1 there is exactly one claimer. It returns the moment there is a worker pool (§7 phase 3), and the column shape below is chosen so it can. |
| One `go` = at most one claim | That rule exists to keep a *human's* single instruction from fanning out unintentionally. Project Mode's whole purpose is to fan out from one instruction. The equivalent safety property is not "one task per confirm" but "**one cost gate per project**" — §2.3. |
| `author='LEAD'` as the only queue-writer | On the rail, one authority writes dispatches so terminals cannot invent work. Here the decomposition model writes the task list, which is a model output, not an authority. The safeguard is different in kind: the plan is **shown to the Bee and confirmed** before any task executes (§1.2, §2.3). |
| `workdir` | No filesystem. The nearest concept is `astra_id`, which the directives table already carries. |

---

## 1. The PROJECT DIRECTIVE lifecycle

### 1.1 Intake

A new request shape on the existing endpoint rather than a new endpoint — the router already
resolves bee, astra, rate caps, rates and balance, and none of that should be duplicated:

```
POST /functions/v1/atlasoracle-route
{
  directive: string,           // the project brief, as the Bee typed it
  mode: 'project',             // NEW — absent means today's single-directive behaviour, unchanged
  tier?: 'free'|'standard'|'frontier',   // CEILING, not the routing choice — see below
  astra_slug?: string,
  confirm_project?: string     // project directive id, returned by the preview (§2.3)
}
```

`tier` changes meaning in project mode and this is the point of the feature. Today it selects the
model. In project mode it is a **ceiling**: the highest band ORACLE is permitted to route any single
task to. Per-task selection happens at §1.3. A Bee who sets `frontier` is not paying for twelve Opus
calls; they are authorising ORACLE to *reach* for Opus on the tasks that need it — which is
`ORACLE_MF v0.7` #3, the department of claudes, expressed as a request parameter.

Rate caps are checked once at intake, against the projected task count, not once per task
(`atlasoracle_check_rate_caps`, already called before anything else in the current flow).

### 1.2 Decomposition

One directive whose job is to produce the plan. Category `analyze`; per `categorization.md`'s fit
table `analyze` routes to **mid-tier, fast** with frontier as merely *acceptable* — so decomposition
is a cheap call by construction, which matters because §2.3 has to spend it before it can quote.

Its output is structured, not prose:

```
{ tasks: [ { index, title, category, rationale, after_index|null, tier_hint } ], assembly: { … } }
```

- `category` **must** be one of the ten in `ALLOWED_CATEGORIES` (`index.ts` lines 47–50). An
  out-of-vocabulary category is a decomposition failure, not a new category — same posture as the
  router's "missing rate → 503, never guess."
- `tier_hint` is advisory. The binding selection is §1.3, so a decomposition model cannot talk the
  platform into an expensive route.
- `rationale` is what the task board shows the Bee (§6) — the *why this AI* line that makes the
  savings legible rather than merely claimed.

**The plan is a model output and is treated as one.** It is returned to the Bee and confirmed before
anything executes. That is deliberate: on the rail, work is queued by an authority; here it is
proposed by a model, and the missing authority is restored by putting the human on the gate.

### 1.3 Per-task provider selection

The selection function already exists on paper and has never been implemented:
`categorization.md` §Routing rules → *By directive category × provider category fit*, a ten-row
table of best-fit / acceptable / avoid. Project Mode is the first feature with a reason to read it,
because a single directive has one category and therefore nothing to choose between.

Selection per task, in order:

1. Start from the task's `category` row in the fit table.
2. Intersect **best fit** with the provider categories permitted by the project's tier ceiling.
3. Drop any provider whose `drift_flag` is true, and order the survivors by `selection_weight`
   (`atlasoracle_provider_pool` carries both).
4. If the intersection is empty, fall to **acceptable**. If that is empty, the task is escalated to
   the ceiling — never above it.
5. Never select from **avoid** — the column exists to encode "frontier is overkill for `classify`",
   which is the entire savings mechanism.

**The blocking prerequisite, verified rather than assumed:** `atlasoracle-route` **has never read
`atlasoracle_provider_pool`.** A grep across `supabase/functions/` returns exactly one reader, the
read-only `atlasoracle-providers` endpoint; the router pins models in code via `TIER_PROVIDER_MODEL`.
So step 2 above is not "wire up an existing lookup" — it is the first time the router resolves a
provider from pool data at all. `ORACLE_OUTLOOK` WRONG #1 named this precisely — *"CODE still
hardcodes tier→model — tiers must become quality bands resolved against pool data"* — and Project
Mode cannot be built without doing it. **Treat that as Phase 1's real work**; the decomposition call
is the easy half.

Two further gaps found while checking, both small and both worth fixing in the same pass:

- **The pool's contents have drifted from the code.** Live rows are `claude-haiku-4-5` (fast),
  `groq-mixtral` (fast), `claude-opus-5` (frontier), `claude-sonnet-5` (mid-tier), `oss-llama-3`
  (oss). But `OPS21` ships Groq as `llama-3.1-8b-instant`, and no row names it. A router that starts
  reading this table today would select a model the ladder does not run. The pool needs a
  reconciliation pass before it becomes load-bearing.
- **`drift_flag` is per-provider, not per-category.** `categorization.md` §Drift downweighting
  specifies the finer thing — *"a provider flagged drift-suspicious **for a directive category** is
  de-prioritized **for that category**"* — but the column is a single boolean on the provider row.
  Step 3 above is written to what the schema actually supports. Per-category drift needs either a
  `(provider, category)` flag table or a jsonb column, and it should not be invented here; note also
  that `last_drift_check_at` is NULL across the pool, so nothing writes the coarse flag either
  (`ORACLE_OUTLOOK` CLOSE: *"drift checks: right concept, never run once"*).

Two rows in that table are worth quoting because they *are* the pitch: `classify` and `translate`
both list **frontier (overkill)** in the avoid column, and `analyze`, `estimate`, `correlate` and
`suggest` all put mid-tier or fast in best-fit. A project that is one `scaffold` plus six
`classify`s should cost roughly one frontier call, not seven.

> **Names a gap honestly:** the fit table's `specialized` and `oss` provider categories have no
> adapters today. `OPS21` landed Groq as the first non-Anthropic rung (`index.ts` lines 758–791) and
> `ORACLE_MF v0.19` names the Groq/OSS route as canon-designated for the free tier. Until the pool
> has more than one company in it, per-task selection is real but shallow — it picks bands within
> one vendor. `ORACLE_OUTLOOK` WRONG #1 already calls that out by name: *"a router whose paid paths
> all land on one provider is a reseller."* Project Mode makes that limitation more visible, not
> less, which is an argument for building it — the feature creates the pressure that fixes the pool.

### 1.4 Execution

Tasks with satisfied dependencies run **concurrently**; dependent tasks wait. This is `after_pass`
evaluated exactly as the rail's claim query evaluates it — a task is eligible when its predecessor
is `success`.

The hard constraint the rail does not have: **edge functions have a wall clock.** A twelve-task
project cannot live inside one invocation. Three ways out, and the choice matters more than it
looks because it decides where the plan text lives:

| Option | Where the plan text lives | Verdict |
|---|---|---|
| **(a) One invocation, everything in memory** | Nowhere — never persisted | Sovereignty-perfect, but no resume, no live task board, and it dies on wall clock past a handful of tasks. Keep as the **small-project fast path**. |
| **(b) Persist task text server-side** | A new content column | **Refused.** This breaks the one thing ORACLE cannot break — `ORACLE_OUTLOOK` RIGHT #1, metadata-only logging, *"competitors ask users to trust a promise; ORACLE asks them to trust a schema."* One content column and the sentence is gone. |
| **(c) Client holds the plan, server holds the metadata** | The Bee's own browser | **v1 recommendation.** Decomposition returns the plan to the client; the client drives each task as its own route call, passing that task's text back in; the server persists only `parent_directive_id`, `task_index`, category, tier, provider, tokens, latency, success. Resumable, live board, schema promise untouched. |

Option (c) also happens to be honest about who owns the work: the Bee's plan sits on the Bee's
machine. The cost is that closing the tab loses the plan — which is exactly what the **opt-in
retention carve-out** is for. `DOCS6` closed `v0.12`'s UNVERIFIED item by finding it already written
in `whitepaper.md` §5 and §9: *"never the directive content … **except where the user has explicitly
enabled conversation history**."* So project persistence is a **consented** feature with pre-rail
constitutional footing, not a hole in the promise. It is roadmap (§7), not v1.

### 1.5 A task that cannot proceed — R4, promoted to a product feature

The rail's best rule is R4: *do not guess and do not stall silently* — file a question, hand back
what is finished, stop. Every multi-step AI product on the market fails precisely here: it invents a
plausible answer for the step it could not do and buries it in the middle of a deliverable.

Project Mode adopts R4 literally. A task whose provider returns a refusal, or whose dependency
produced something it cannot use, sets `status='question'` and surfaces on the board as a question
addressed to the Bee, with every completed task preserved. The project is not failed and not
silently completed — it is **waiting on a human**, which is a state the rail already models and the
Bee already understands from any project-management tool.

Billing consequence in §2.4: a questioned project bills for the tasks that succeeded, and nothing
else.

### 1.6 Assembly

A final directive, category `draft` (fit table: frontier, mid-tier), whose input is the outputs of
the dependency-complete tasks and whose output is the one deliverable the Bee asked for.

Assembly is **structurally last** rather than dependency-linked — see §4 on why `task_role` exists
instead of a fan-in dependency edge. It is the analogue of `REPORT.md`: one artifact of record,
assembled from the passes, rewritten in place rather than accumulated.

Assembly runs at the **project's ceiling tier**, not down-routed. This is a deliberate exception to
the savings logic: the assembly step is the one the Bee actually reads, and saving forty tokens on
the artifact that represents the whole project is the wrong trade. Stated as a rule so nobody
"optimises" it later.

---

## 2. Billing — one project, one receipt

Nothing here invents money machinery. Every mechanism below is already in `atlasoracle-route` or in
`oracle_token_ledger`; project mode changes the *grouping*, not the arithmetic.

### 2.1 Per-task debits, rolled up by join — no new tables

`oracle_token_ledger` already carries `directive_id` on every debit row (`index.ts` lines 894–902).
Task directives carry `parent_directive_id`. The project receipt is therefore a **join**, not a new
ledger concept:

```sql
SELECT d.parent_directive_id AS project_id,
       count(*)                       AS tasks_billed,
       -sum(l.amount_tokens)          AS project_cost_tokens
  FROM public.oracle_token_ledger l
  JOIN public.atlasoracle_directives d ON d.id = l.directive_id
 WHERE d.parent_directive_id IS NOT NULL
 GROUP BY 1;
```

This preserves the `OPS15` lead ruling that revenue is `SUM` over single append-only debit rows with
no treasury leg — and it means a project receipt can be re-derived for any project, retroactively,
against the rate rows that were live when each task ran (`oracle_model_rates` keeps rate history by
`effective_from`).

### 2.2 Estimate-then-charge-the-lesser, at project level

Per-task, charge-the-lesser already works and does not change: the Bee pays `min(estimate, actual)`
per task and the house absorbs underestimates (`index.ts` lines 856–880).

At project level the same rule is applied once more over the total:

```
project_charge = min( project_estimate , Σ task_actuals )
```

Since each task already debited as it ran, the correction at project close is a **single reversing
credit** when `Σ task_actuals > project_estimate` — memo'd to the project, using the ledger's
existing correction posture (append-only, corrections are reversing entries, per the `OPS15`
comment). When the sum came in under, the per-task debits already sum to the lesser figure and there
is nothing to do.

The Bee therefore gets the goodwill rule twice: per task, and again across the project. That is
`ORACLE_OUTLOOK` RIGHT #3 — *"the house eats overage risk"* — surviving into a feature where the
overage risk is much larger, because a decomposition that misjudges twelve tasks misjudges twelve
times.

### 2.3 The confirm-cost gate moves from tier to cost

Today's gate is **frontier-only** (`index.ts` lines 673–695): frontier tier, estimate over
`FRONTIER_PREVIEW_THRESHOLD_TOKENS`, no `confirm_cost` → return a preview instead of executing.

That shape is right and the trigger is wrong for projects. A fourteen-task **standard** project can
easily cost more than one frontier directive, and a Bee should never discover that after the fact.
So:

> **Project rule:** the cost gate fires on the **project estimate crossing a threshold, at any
> tier** — tier stops being the trigger and cost becomes the trigger.

The response reuses the existing preview shape exactly, extended with the plan:

```
{
  cost_preview: true,
  project_directive_id,
  estimated_cost_tokens,          // decomposition (already spent) + Σ per-task estimates
  decomposition_cost_tokens,      // disclosed separately — see below
  tasks: [ { index, title, category, provider, tier, estimated_cost_tokens, rationale } ],
  frontier_only_cost_tokens,      // §3
  action: 'confirm_project',
  hint: 'Re-call with confirm_project: <id> to run this project.'
}
```

**The honest problem, stated rather than hidden:** you must spend to quote. The decomposition call
costs real tokens and happens *before* the Bee sees an estimate, so the gate cannot be free. Three
ways to handle it, and this is a **Butch ruling, not a Code call**:

| Option | Effect |
|---|---|
| **(i)** Route decomposition on the free tier (Groq/OSS per `v0.19`) | Quote costs the Bee nothing; plan quality is whatever an 8B model can plan. |
| **(ii)** Charge it, disclose it in the preview | Honest, small (`analyze` is a cheap category), but the Bee pays for a quote they may decline. |
| **(iii)** House eats it | Cleanest UX, and an obvious abuse surface — free decomposition calls with no intent to run. |

Lead judgment, offered not ruled: **(ii)**, with the disclosed figure shown as its own line in the
preview, and the option to fall to (i) for Bees on the free tier — a free-tier Bee should never be
gated behind a paid quote. That keeps `ORACLE_MF v0.19`'s free-tier permanence intact: free stays
free by routing to free providers, all the way down to the quote.

### 2.4 Partial projects, failed tasks, questions

- **A failed task is not billed.** The current code already inserts no ledger row on provider
  failure — `markFailed` carries the token telemetry onto the directive row so the spend is visible,
  and the Bee is not charged (`index.ts` lines 903–915 show the same posture for a debit failure).
- **A questioned project (§1.5) bills for successful tasks only** and stops. The Bee holds a partial
  deliverable and a question; they have paid for exactly what they received.
- **No minimum per-project charge, house eats rounding** — `ORACLE_MF v0.16` §5 goodwill rules,
  inherited verbatim.
- **The balance check moves to the front.** Today it runs per directive against that directive's
  estimate. In project mode it runs **once, at confirm, against the project estimate**, so a project
  cannot die at task nine for want of tokens. Same 402 shape, same `action: 'get_tokens'`.

---

## 3. The "you saved X" line — the department-of-claudes receipt

`ORACLE_MF v0.7` #3: ORACLE decides which *level* of AI a task actually needs and routes down when
quality allows, **and the savings are the pitch**. Project Mode is where that stops being a claim
about a single call and becomes a receipt.

### 3.1 The arithmetic

For each task, take the tokens it actually consumed and re-cost them at the **project's ceiling
tier** rate — the rate the Bee would have paid had every task gone to the top band:

```
frontier_only_cost = Σ_tasks  cost( ceiling_tier_rate , task.input_tokens ,
                                    task.output_tokens , task.cached_tokens )

kept = frontier_only_cost − project_charge
```

`calculateCostTokens(rate, input, output, cached)` already exists and takes the rate as a parameter
(`index.ts` lines 301–311), so this is the same function called with a different rate row. **No new
columns are required for any of it** — `atlasoracle_directives` already stores `input_tokens`,
`output_tokens`, `cached_tokens` and `provider_selected` per directive, and `oracle_model_rates`
keeps rate history. The receipt is derivable retroactively for every directive ever run, including
the ones that ran before this feature existed.

### 3.2 The caveat that keeps it true

A frontier model would not have emitted the *same* token counts. The counterfactual holds usage
constant and varies only the rate, which is an approximation, and one that generally
**under**-states cost on the frontier side (bigger models tend to write longer, and frontier tiers
carry thinking budgets — `TIER_THINKING`, `index.ts` line 93, applied at line 771).

So the line must be labelled an estimate. Anything else is a number the platform cannot defend, and
the sovereignty pitch is worth more than a rounder marketing figure:

> **Copy, as specified:**
> `Routed across 3 models · 7 tasks`
> `You kept ~1,240 Oracle Tokens — frontier-only would have cost ~2,900 (estimated at the same
> token usage).`

**Language firewall check** — `price`, `purchase`, `buy`, `market`, `customer` are banned in
user-facing strings, and "price" is the word that wants to appear here. Use **cost** for what a route
consumes and **kept** for the delta. Do not write "saved you money"; the unit is Oracle Tokens, not
dollars, and the anchor (`ORACLE_MF v0.16` §5.1: 1,000 tokens = $1, permanent) does the conversion
for anyone who wants it.

### 3.3 Where it shows

Three places, one number: the project preview (as a projection, before confirm), the finished
project header (as the receipt), and the Bee's ledger view as a per-project line. The preview
version is a projection off estimates and must say so.

---

## 4. Schema delta

Additive, metadata-only, no content columns, no changes to the money tables.

```sql
ALTER TABLE public.atlasoracle_directives
  ADD COLUMN parent_directive_id uuid NULL REFERENCES public.atlasoracle_directives(id),
  ADD COLUMN task_index          integer NULL,
  ADD COLUMN task_role           text NULL,      -- 'decompose' | 'task' | 'assemble'
  ADD COLUMN after_task_index    integer NULL;   -- the rail's after_pass, project-local
```

| Column | Rail counterpart | Note |
|---|---|---|
| `parent_directive_id` | the board a pass belongs to | NULL for every directive that exists today — the column is invisible to single-directive traffic |
| `task_index` | `pass` | project-local ordinal; `(parent_directive_id, task_index)` is the natural key |
| `task_role` | — | see below |
| `after_task_index` | `after_pass` | one predecessor, v1 |

**Why `task_role` instead of a fan-in dependency edge.** `after_pass` names exactly **one**
predecessor, and the rail has never needed more. Assembly, though, depends on *all* tasks. Rather
than generalise the rail's dependency model into a join table on first contact, v1 encodes assembly
as a **role** — structurally last, implicitly dependent on everything — and keeps `after_task_index`
as a straight one-to-one port of `after_pass` for chains among ordinary tasks. When real projects
need true fan-in, the generalisation is an `atlasoracle_task_deps(parent, task_index,
depends_on_index)` join table, and that is the honest moment to build it. Named here so the v1 limit
is a decision on the record, not a discovery later.

**Reuse `status`, don't add one.** `atlasoracle_directives.status` already exists (default
`'pending'`, set to `'success'`/failed by the router). Rail `queued`/`claimed`/`done` maps onto
`pending`/`running`/`success`; §1.5 adds `'question'`. No second state column.

**Indexes:** `(parent_directive_id, task_index)` for board reads, and a partial index on
`parent_directive_id WHERE parent_directive_id IS NOT NULL` so single-directive traffic pays nothing
for a feature it does not use.

**Sovereignty, explicitly.** Every column above is an integer, a uuid, or a short enum-shaped text.
None of them holds directive content, plan text, task descriptions, or model output. The structural
promise — `ORACLE_OUTLOOK` RIGHT #1, *"ORACLE asks them to trust a schema"* — is **unchanged by this
design**, and §1.4 option (b) was refused specifically to keep it that way. A `\d
atlasoracle_directives` after this migration still shows a table that cannot store what a Bee wrote.

**Migration posture:** per `CLAUDE.md` R7 MIGRATION AMENDMENT this needs its own dispatch naming the
file, a pre-flight recorded in `REPORT.md`, and a stated rollback before apply. All four columns are
nullable additions with no data rewrite, so the rollback is a four-column `DROP` — but that
statement belongs in the dispatch, not in this doc.

---

## 5. Feeding the learned router

`ORACLE_OUTLOOK`'s first-model recommendation is not a chatbot — it is **the router, learned**: a
small model that categorises directives and selects providers better than `selection_weight = 1.000`.
Its fuel is ORACLE's metadata exhaust, which is *"proprietary, sovereignty-clean, ToS-clean, and
accumulates free."*

Project Mode is a **step change in the quality of that exhaust**, not merely more of it. Four reasons:

1. **Labelled decompositions.** Every project produces a (brief → task list with categories and
   dependencies) pair. That is training data for the decomposition step itself, and it exists
   nowhere else — no aggregator has it, because no aggregator decomposes.
2. **Comparative routing within one intent.** A single directive tells you "category X went to
   provider Y and succeeded." A project tells you "**this brief** needed frontier here, mid-tier
   there, and fast over there, and the assembly the Bee accepted was built from all three." Same
   user, same goal, different bands — that is the comparison the fit table's weights actually need,
   and single directives cannot produce it.
3. **Down-route errors become labelled.** A task routed down that fails and is retried at a higher
   band is a **labelled routing mistake** with a known correct answer. This is the single most
   valuable row type for training a router, and Project Mode manufactures it as a by-product of
   normal operation.
4. **A downstream quality signal.** Assembly success, and whether the Bee re-ran the project, are
   weak but real labels on whether the cheap routes were good enough. Single directives have no
   downstream.

All four are derivable from the columns in §4 plus what is already logged. **No content is required
for any of them** — the training signal is (category, dependency shape, tier, provider, tokens,
latency, success, retried-at-higher-band), every field of which is metadata. The learned router can
therefore be trained without touching the sovereignty promise, which was the whole reason `OUTLOOK`
picked the router as model #1.

`categorization.md`'s fit table is currently *"recommended starting weights (revise based on real
performance data)"* with `selection_weight` fixed at `1.000` across the pool and drift checks
**never once run** (`OUTLOOK` CLOSE). Project Mode is the first feature that generates enough
comparative data to revise them — the table stops being a guess and becomes a measurement.

---

## 6. UI — the rail, skinned for a Bee

`ORACLE_MF v0.7` #1 sets the surface: a modern AI chat app, two-column, menu plus content area,
inside the shared `themanual.tech` skin (`v0.8` §1d, SEALED).

```
┌──────────────┬──────────────────────────────────────────────────────────────┐
│ ORACLE       │  Rewrite the onboarding docs and ship a migration      ▸ RUN │
│              │  7 tasks · 3 models · est. 2,140 tokens                      │
│ ▸ Chat       ├──────────────────────────────────────────────────────────────┤
│ ▸ Projects   │  #  CATEGORY   MODEL           STATE        WHY THIS MODEL   │
│   · onboard… │  1  analyze    llama-3.1-8b    ✓ done  0.4s  cheap scan      │
│   · migration│  2  draft      claude-sonnet-5 ✓ done  3.1s  nuanced voice   │
│ ▸ Ledger     │  3  classify   llama-3.1-8b    ✓ done  0.2s  frontier=overkill│
│ ▸ Providers  │  4  scaffold   claude-opus-5   ● running     non-trivial code│
│              │  5  refactor   claude-sonnet-5 ○ blocked after #4            │
│              │  6  draft      claude-sonnet-5 ○ queued                      │
│              │  7  assemble   claude-opus-5   ○ queued      ceiling, always │
│              ├──────────────────────────────────────────────────────────────┤
│              │  Routed across 3 models · You kept ~1,240 Oracle Tokens      │
│              │  frontier-only would have cost ~2,900 (est. same usage)      │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

This is not a new interface to design. **It is the mission control board with the columns renamed** —
and that board already exists, running, at `scripts/mission-control/server.mjs`:

| Mission control column | Bee-facing column |
|---|---|
| `pass` | task index |
| `lane` | category |
| `eff` (EFFORT, parsed from title) | model / tier |
| `status` + `held`/`STALE` age flags | state + elapsed |
| `BLOCKED after <pass>` | `blocked after #n` |
| `workdir · scope · p<priority>` | the *why this model* line |

Two things the Bee-facing version must add that the internal board does not have, both from `v0.7`
#3: the **why this model** column — the savings are unbelievable unless each choice is legible — and
the **kept** line in the footer (§3).

One thing it must *drop*: mission control's spawn buttons. The internal board can start a terminal
because a human is sitting at the machine. A Bee's board runs providers, and every one of those runs
costs tokens, so the only button on this board is the one behind the cost gate (§2.3).

**The `RUN` button is the human's `go`.** That is the exact rail correspondence, and the reason the
cost gate is not a nag screen: on the rail, nothing moves until a human types one word.

---

## 7. Phase plan — gates, not dates

Per `ORACLE_MF v0.5` ruling 1 and `ORACLE_OUTLOOK` WRONG #3 (*"calendar-keyed plans fail silently;
readiness gates do not"*), each phase names what must be true before it starts. No dates appear
below, by house law.

**Phase 1 — decompose and route within existing tiers.** The dispatch's v1. Adds `mode: 'project'`,
the decomposition directive, per-task selection off the fit table, client-held plan (§1.4c), the
project cost gate, the rolled-up receipt, and the kept-line. Uses only the providers already in the
ladder.
*Gate to start:* §4's migration applied under its own dispatch; a ruling on §2.3's decomposition-cost
question.
*Done when:* one real multi-task project runs end-to-end, bills once, and its receipt reconciles to
the sum of its task debits.

**Phase 2 — make the routing real.** Phase 1's selection is honest but shallow while the pool holds
one vendor (§1.3). This phase is pool depth: more `mid-tier`/`fast` adapters, first `specialized`
entries, `oss` beyond the free tier.
*Gate:* the pool reconciled against what the ladder actually runs (§1.3); `OPS21`'s Groq rung proven
under load; something actually writing `drift_flag`, since Phase 1 makes selection read a flag that
nothing currently sets and `last_drift_check_at` is NULL across every row.

**Phase 3 — worker pool, and the rail's claim model comes home.** Replace push-execution with real
claimers. This is where `FOR UPDATE SKIP LOCKED` returns, and §4's columns were shaped for it.
*Gate:* projects large enough that wall clock, not provider cost, is the binding constraint.

**Phase 4 — persisted projects.** Server-side project resume under the opt-in retention carve-out
(`whitepaper.md` §5/§9, confirmed by `DOCS6`).
*Gate:* an explicit consent surface; a ruling that the carve-out extends from conversation history to
project plans. Until both, §1.4c stands and the plan lives on the Bee's machine.

**Phase 5 — the media lane.** Explicitly **not v1**, per the dispatch. Image/video/audio tasks in a
project need the `fal.ai` / Runway / Google / xAI adapters from `DOCS4`, and every one of them drags
`OPEN-9` behind it: `ORACLE_MF v0.15` ruled that default-training providers may be offered as an
**informed** option, never routed to silently or by ORACLE's own choice. A project decomposer picking
a media provider *is* ORACLE's own choice — so a media task must surface the provider's training
practice and take consent **per task**, not once per project.
*Gate:* those adapters shipped with disclosure UX; a ruling on whether per-task consent can be
pre-granted at project confirm or must interrupt mid-project.

**Deliberately not in any phase:** outbound transmission. `v0.8` §1c is unambiguous — creation is the
default lane, transmission is the gated lane, and nothing on the board sends anything. A project that
*drafts* twelve emails is Phase 1. A project that *sends* them is a different feature with a
different consent model, and it is not this one.

---

## 8. Open questions for Butch

1. **§2.3 — who pays for the quote?** (i) free-route it, (ii) charge and disclose, (iii) house eats
   it. Lead leans (ii), with (i) for free-tier Bees. Needs a ruling before Phase 1 starts.
2. **§1.1 — is `tier` a ceiling or a floor?** This doc rules it a ceiling (ORACLE may route *down*
   from what you authorised, never up). Worth confirming, because it is the sentence the whole
   savings story rests on.
3. **§3.2 — is the estimated counterfactual acceptable as a marketing claim?** It is defensible and
   labelled, but it is an estimate, and it is the number a competitor would attack first.
4. **§7 Phase 4 — does the opt-in retention carve-out extend to project plans?** `DOCS6` established
   it covers conversation history. Plans are arguably the same class of artifact; that is a ruling,
   not a reading.

🐝🍯
