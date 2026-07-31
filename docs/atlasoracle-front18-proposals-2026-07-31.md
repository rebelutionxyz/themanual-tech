# AtlasOracle — FRONT18 proposals (defects 2 and 3)

**Pass:** FRONT18 · **Lane:** front · **Workdir:** TheMANUAL.tech · **Scope:** oracle · **Date:** 2026-07-31

**Status: PROPOSED, NOT APPLIED.** Both defects touch `supabase/functions/atlasoracle-route/index.ts`. Under the DEPLOY AMENDMENT an edge-function deploy needs its own named dispatch, so nothing here is written to the router. Defect 1 (cached-token disclosure) shipped in this pass and is reported in `REPORT.md`.

---

## Defect 2 — canon context is welded onto every directive

### What is actually happening, with the responsible code quoted

The router builds one system prompt for **every** directive, on every tier, regardless of subject:

```ts
// index.ts:772
const canonText = assembleCrossAstraCanon();
```

```ts
// index.ts:346  (Anthropic path)
system: [{ type: 'text', text: canonText, cache_control: { type: 'ephemeral' } }],

// index.ts:425  (OpenAI-wire path, free tier via Groq)
{ role: 'system', content: canonText },
```

`assembleCrossAstraCanon()` (`canon.ts:113`) concatenates three documents — `platform_thesis.md`, `language_firewall.md`, `categorization.md` — into ~6,116 characters / ~1,529 tokens that ride on **every single request**.

**The instruction that produces the bolted-on coda is in the LANGUAGE_FIREWALL block, and it is not subtle.** Quoted verbatim from `canon.ts`:

> `Terms with specific meaning in AtlasOracle canon, and terms that must never be used. **Every AI operating through AtlasOracle reads this file and honors it in generated output.**`

and, closing the same document:

> `If generated output cannot land in this register, generated output is wrong. Revise.`

Between those two sentences sit twelve **Required terms** — each phrased as a substitution rule the model is told to honour *in generated output*:

> `- **Bee** — a HONEYCOMB user. Never "user," "customer," "subscriber," or "account holder."`
> `- **Astra** — a canonical platform product within HONEYCOMB. Never "pillar" (retired), "module," or "section."`
> `- **Nova** — a Bee-created clone of an Astra. Never "instance," "fork," or "spinoff."`

**That is the mechanism.** Nothing tells the model *when* the vocabulary applies. It is handed a glossary of HONEYCOMB nouns, told that every AI operating here "honors it in generated output," and told that output not landing in that register is "wrong. Revise." A small model asked whether a tree falling in a forest makes a sound has been instructed to produce output in a register defined entirely by Bees, Astras and Novas — so it reaches for them. **The model is not malfunctioning; it is complying.**

Two aggravating factors:

1. **`PLATFORM_THESIS` supplies the sovereignty material the coda reaches for** — *"sovereignty guarantees preserved"*, *"Free tier as floor"*, *"Not data-extractive"*. The firewall says write in this register; the thesis supplies the vocabulary. Together they are close to a standing instruction to relate the answer to HONEYCOMB.
2. **The free tier is where it reads worst and where it is hardest to resist.** Free routes to `llama-3.1-8b-instant`, an 8B model. Instruction-scoping is exactly the capability an 8B model has least of, so a glossary it cannot cleanly bound gets pattern-matched into whatever it is answering. The tier with the weakest model is the tier serving the most first impressions.

### Butch's ruling, and what it does and does not decide

> *"I was wondering about the honeycomb stuff. we dont want that."*

The coda is unwanted. **Canon-context routing stays** — the dispatch is explicit that it is ORACLE's moat, and I agree: a router that answers platform questions against platform canon is the product. The defect is that canon is **mandatory** rather than **available**.

### Proposal — one paragraph of scope, changing no architecture

Keep the canon bundle exactly as it is. Add a **scoping preamble** at the top of the assembled system prompt, and change the firewall's two absolute sentences into scoped ones. Three edits, all in `canon.ts`, no new machinery, no routing change, no schema change.

**Edit 1 — prepend a scope header in `assembleCrossAstraCanon()`:**

```ts
const CANON_SCOPE = `# How to use this canon

The material below is reference about the HONEYCOMB platform. It is available to
you, not required of you.

Use it when the directive is ABOUT this platform — its products, economics,
vocabulary, or how it works. Then the naming rules below are binding.

When the directive is about anything else, answer the directive on its own terms
and do not mention HONEYCOMB, Bees, Astras, Novas, sovereignty, or this platform
at all. Do not append a closing paragraph relating the answer back to the
platform. An unrelated directive gets an unrelated answer; that is correct
behaviour, not an omission.
`;
```

**Edit 2 — scope the firewall's opening claim.** Replace:

> `Every AI operating through AtlasOracle reads this file and honors it in generated output.`

with:

> `These rules bind generated output THAT REFERS TO THIS PLATFORM. They are naming rules for HONEYCOMB concepts, not instructions to introduce those concepts. If a directive does not concern HONEYCOMB, no term below applies to it.`

**Edit 3 — scope the firewall's closing instruction.** Replace:

> `If generated output cannot land in this register, generated output is wrong. Revise.`

with:

> `When writing about this platform, output that cannot land in this register is wrong. Revise. When writing about anything else, this register does not apply.`

**Why this shape rather than the alternatives:**

- **Not "drop canon on unrelated directives"** — that needs a classifier deciding relevance *before* the provider call, which is new machinery, a new failure mode, and it would break the platform questions the moat depends on. It also forfeits the prompt-cache benefit: the canon block is sent with `cache_control: { type: 'ephemeral' }`, so a *stable* prefix is what makes cached input cheap. **A variable canon block would raise the bill on every tier** — and FRONT18's defect 1 exists precisely because cached tokens are real money (14.5 % of directive d37a7032). Fixing a copy defect by making every directive more expensive would be a bad trade.
- **Not "shorten the canon"** — the content is not the problem. The absence of scope is.
- **The prefix stays byte-stable**, so caching behaviour is unchanged and the `CANON_BUNDLE_LENGTH` estimation constant (`index.ts:203`) still works. It grows by ~600 characters ≈ 150 tokens, which shifts the frontier gate's floor slightly — see the risk note below.

### Risks and what to verify before this is deployed

| Risk | Note |
|---|---|
| **The frontier `confirm_cost` gate moves** | `FRONTIER_PREVIEW_THRESHOLD_TOKENS = 700` was tuned against a canon prefix of **1,529 tokens** (`index.ts:148`), with the floor computed as `400 + 0.11 × 1530 ≈ 568`. A ~150-token longer prefix raises that floor to ~585 — still clear of the 700 threshold, so the gate does not start firing on empty directives. **Verify the arithmetic against the real measured length before deploy; do not assume this estimate.** |
| **A scoping instruction is a request, not a guarantee** | An 8B model may still leak the register occasionally. This reduces the pressure that causes the leak; it does not prove absence. **Verification must be empirical:** re-run the tree-falls-in-a-forest directive on the free tier and read the output. |
| **Platform questions must not regress** | The same battery needs a control: a directive that genuinely asks about HONEYCOMB must still answer in-register with the right vocabulary. If canon becomes unreachable, this change has broken the moat and must be reverted. |
| **Deploy gate** | Router change ⇒ named dispatch, clean type-check, fetch the deployed artifact back, record version + bundle hash in `REPORT.md`. |

---

## Defect 3 — the Kind picker asks for classification the user cannot perform

### The question the dispatch said to answer first: what does `directive_category` actually DO?

**Answer: nothing. It is telemetry only.** Here is every place it appears in the router, exhaustively.

**1. It is validated** (`index.ts:559-571`):

```ts
let category: Category = 'suggest';
if (body.category !== undefined) {
  if (
    typeof body.category !== 'string'
    || !ALLOWED_CATEGORIES.includes(body.category as Category)
  ) {
    return errorResponse(
      `category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`,
    );
  }
  category = body.category as Category;
}
```

**2. It is stored** (`index.ts:734-742`):

```ts
.insert({
  bee_id: beeId,
  astra_id: astraId,
  directive_category: category,
  tier,
  status: 'pending',
})
```

**3. It is logged** — twice, in `console.log` calls at `index.ts:752` and `index.ts:950`.

**That is the complete list.** The proof is in what it is absent from:

| Could it affect… | Decided instead by | Verdict |
|---|---|---|
| Which provider is called | `TIER_PROVIDER_MODEL[tier]` (`index.ts:67`) and the free-tier ladder (`index.ts:775-791`) — keyed on `tier` | **No** |
| The system prompt | `assembleCrossAstraCanon()` — takes **no arguments** (`canon.ts:113`) | **No** |
| Price | `calculateCostTokens(rate, …)`, where `rate` comes from `oracle_model_rates` matched on `model_name` (`index.ts:642-649`) | **No** |
| Rate caps | `atlasoracle_check_rate_caps({ p_bee_id, p_tier })` — category is not a parameter (`index.ts:585-588`) | **No** |
| `max_tokens` / thinking | `TIER_MAX_TOKENS[tier]`, `TIER_THINKING[tier]` (`index.ts:770-771`) | **No** |
| The cost estimate | `estimateOutputTokens(tier, inputTokens)` (`index.ts:264`) | **No** |

**Every routing decision keys on `tier`. Not one keys on `category`.**

This directly contradicts the canon that created the field. `categorization.md`, quoted from `canon.ts:89`:

> `Every directive is classified at parse-time. **The category drives provider selection.**`

**It does not, and there is no code path by which it could.** That sentence is shipped to the model in the system prompt on every request, which means **the router is telling the provider something about itself that is false.** Worth fixing on its own merits, separately from the picker.

### The production usage record

| Category | Directives | First used | Last used |
|---|---|---|---|
| `suggest` | 14 | 2026-07-27 13:38Z | 2026-07-31 00:55Z |
| `classify` | 2 | 2026-07-28 12:39Z | 2026-07-28 12:40Z |
| `analyze` | 1 | 2026-07-27 19:15Z | 2026-07-27 19:15Z |
| `scaffold`, `draft`, `integrate`, `refactor`, `translate`, `estimate`, `correlate` | **0** | — | — |

17 directives, 3 categories used, 7 never used. And `suggest` is the client default (`OraclePage.tsx:34`), so most of those 14 are a default nobody chose.

### Proposal — remove the picker; keep the column

Since the field is telemetry only, **asking the Bee is unjustified friction on the primary surface, and worse than friction: it is a question with no right answer.** Butch could not classify his own philosophy directive, and he wrote the platform. The field is not measuring what a Bee *meant* — it is measuring how well a Bee guessed at a taxonomy that changes nothing.

**Proposed, in order of confidence:**

1. **Remove the Kind `<select>` from BOTH surfaces.** Verified this pass — there are two identical pickers, not one:
   - `src/pages/oracle/OraclePage.tsx:245-258` — the console, defaulting to `'suggest'`
   - `src/components/AtlasOracleWalletBadge.tsx:283-301` — the spine badge, defaulting to `DEFAULT_CATEGORY = 'suggest'` (line 50)

   Both keep sending `category: 'suggest'` on submit, unchanged from today's default, so **nothing about routing, pricing or the stored schema changes** — a control that could only be answered wrong stops being shown. This is a front-lane change and is the only part I would ship first. Removing one and not the other would be worse than removing neither: the same unanswerable question would then appear on one surface and not the other, which reads as a bug.
2. **Keep the column and all ten enum values.** The dispatch says do not delete, and that is right for a second reason: the column is the historical record of what was sent. Deleting values would rewrite what past rows meant.
3. **Then, optionally, have the router infer it.** Inference is genuinely cheap — a free-tier classify call is roughly a ten-thousandth of a cent, and `classify` is itself one of the ten categories, which is a pleasing closure. **But do not ship this as part of removing the picker.** It adds a second provider call to the hot path of every directive, i.e. a new latency cost and a new failure mode, in exchange for telemetry nobody currently reads. **Recommendation: do nothing here until someone names a question the telemetry is supposed to answer.** An inferred field that no report consumes is the same dead weight as the picker, just paid for in latency instead of user friction.
4. **Fix the false sentence in canon regardless of the above.** `categorization.md`'s *"The category drives provider selection"* should read something like *"Directive categories are recorded for platform telemetry. Provider selection is determined by tier."* This is a one-line edit and is true today; it should not wait on the picker decision. **It rides with the defect-2 canon edits, in the same deploy** — both are `canon.ts` changes and there is no reason to deploy the router twice.

### Do the seven unused categories still earn their place?

**Reported, not decided, per the dispatch.** They cost nothing to keep — the column is `text` with a check against the list, and unused values consume no storage. The honest reading is that they were never *earned* in the first place: they describe a build-time Builder surface (`scaffold`, `refactor`, `integrate`, `translate`) that does not exist yet, imported from pre-rail canon written before the console shipped. **They are a forecast, not a taxonomy.** If the Builder surface ships, they may become real. Until then they are inert, and inert is cheap. **Recommend keeping all ten and revisiting when — if — the Builder surface lands.**

---

## Summary of what is proposed vs. what shipped

| Item | Status |
|---|---|
| Defect 1 — cached tokens visible, cost shown, per-row reconciliation | **SHIPPED this pass** (front lane, display only) |
| Defect 2 — canon scoping preamble + two firewall rewordings | **PROPOSED** — `canon.ts`, needs a deploy dispatch |
| Defect 3.1 — remove the Kind picker | **PROPOSED** — front lane, shippable alone |
| Defect 3.2 — keep column + all ten values | **PROPOSED** — no action |
| Defect 3.3 — router-side inference | **PROPOSED AGAINST** for now — no consumer for the telemetry |
| Defect 3.4 — fix the false "category drives provider selection" line | **PROPOSED** — `canon.ts`, rides with defect 2 |
