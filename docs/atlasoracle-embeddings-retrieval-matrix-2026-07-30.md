# AtlasORACLE — Embeddings & Retrieval Matrix

**Pass:** DOCS11 · **Date:** 2026-07-30 · **Scope:** oracle
**Fourth in the set**, after `atlasoracle-provider-expansion-matrix-2026-07-27.md` (text/LLM),
`atlasoracle-media-provider-matrix-2026-07-27.md` (video/image) and
`atlasoracle-music-audio-provider-matrix-2026-07-30.md` (music/audio).

**Why this one is different from the other three.** Every previous matrix priced a way to make
ORACLE *do more*. This is the only category that makes it **cost less** — an answer cache that
serves a matched response before any paid provider call is reached.

**Reading rules:** identical to DOCS9. Every cell is (a) cited to a first-party URL fetched
2026-07-30, (b) `SEARCH-DERIVED` with the blocker named, or (c) `UNKNOWN` with a reason. Zero
figures from model memory. `OFFICIAL` / `UNOFFICIAL` is a gate, not a label.

---

## 0. Two corrections to the dispatch's premise — read these first

The dispatch describes the storage side as already prepared. **Both halves of that are false against
this database**, and the second one changes the shape of the work.

### 0.1 `oracle_prompt_logs` does not exist

```
=== ORACLE TABLES ===
oracle_model_rates
oracle_token_balances
oracle_token_ledger
```

There is no `oracle_prompt_logs` in `public`. The table the dispatch means is almost certainly
**`atlasoracle_directives`** — the one DOCS4 §5 named as the row written and finalized inside a
single edge-function invocation.

### 0.2 There is no embedding-ready column and no `response_hash` — anywhere

`atlasoracle_directives`, read live this pass, all 16 columns:

```
id · bee_id · astra_id · nova_id · directive_category · tier · provider_selected ·
latency_ms · success · created_at · status · error_message ·
input_tokens · output_tokens · cached_tokens · completed_at
```

**No embedding column. No `response_hash`. No nullable placeholder of any kind.** And a
database-wide sweep for a `vector`-typed column returns zero rows.

So the dispatch's *"built … from day one specifically so the cache would be a later index rather
than a later migration"* is not the case. **The cache is a migration**, and it needs at minimum a
new column of a type that does not yet exist in this database (§3), plus a hash column, plus an
index.

**This is not a small correction, because it removes the reason the collision in §4 looked
pre-settled.** Nobody has already decided that an embedding may live on a directive row. The
schema has never contained one.

**And the same query proves the sovereignty claim is currently literally true**, which is the
strongest fact in this document: `atlasoracle_directives` holds **no content columns at all**. Not
the prompt, not the response, not a hash of either. DOCS4 §5 said the text lane enforces
sovereignty *structurally, by having nowhere to put content*. Verified — it does.

---

## 1. Embedding providers with official APIs

| Provider · model | Status | Dimensions | Max input | Price / 1M tokens | Batch | Trains on input? |
|---|---|---|---|---|---|---|
| **OpenAI** `text-embedding-3-small` | OFF | **1536** default; shortenable via the `dimensions` parameter *"without the embedding losing its concept-representing properties"* | **8192** | **$0.02** | Batch API exists; **no embeddings-specific discount stated** on the pricing page | **UNKNOWN** — `openai.com/policies/api-data-usage-policies/` returned **403** to the fetcher |
| **OpenAI** `text-embedding-3-large` | OFF | **3072** default; same shortening mechanism | **8192** | **$0.13** | as above | **UNKNOWN** — same 403 |
| **OpenAI** `text-embedding-ada-002` | OFF | UNKNOWN — not quoted on the page read | UNKNOWN | **$0.10** | as above | **UNKNOWN** |
| **Voyage** `voyage-4-lite` | OFF | UNKNOWN — *"the documentation does not provide context length or dimension specifications"* on the pricing page | UNKNOWN | **$0.02** · 200M free tokens | **33% discount**, and *"Free token credits do not apply to Batch API usage"* | UNKNOWN |
| **Voyage** `voyage-4` | OFF | UNKNOWN (as above) | UNKNOWN | **$0.06** · 200M free | 33% | UNKNOWN |
| **Voyage** `voyage-4-large` | OFF | UNKNOWN (as above) | UNKNOWN | **$0.12** · 200M free | 33% | UNKNOWN |
| **Voyage** `voyage-context-4` | OFF | UNKNOWN | UNKNOWN | **$0.12** · 200M free | 33% | UNKNOWN |
| **Cohere** `Embed 4` | OFF | UNKNOWN | UNKNOWN | **UNKNOWN per-token.** `cohere.com/pricing` shows **Model Vault instance pricing only**: Small **$4.00/hour or $2,500/month**, Medium **$5.00/hour or $3,250/month** | UNKNOWN | UNKNOWN — the pricing page says nothing about training on customer data |
| **Google** `gemini-embedding-*` (Vertex) | OFF (product exists) | UNKNOWN | UNKNOWN | **UNKNOWN** — not fetched this pass | UNKNOWN | UNKNOWN |
| **Groq** | **NOT APPLICABLE — no embedding models** | — | — | — | — | — |

**The Groq answer matters and is worth stating plainly**, because the dispatch's item 2 assumed the
OSS route might carry embeddings the way it carries text: **Groq's supported-models page lists text
generation, speech (Whisper) and agentic models, and no embedding models at all.** The 30×-cheaper
OSS text route **does not extend to embeddings via Groq.** An open-weight embedding model has to be
hosted somewhere else, or self-hosted (§2).

**Rate limits: UNKNOWN for every provider above.** None of the pricing or guide pages read carried
them; they live on separate limits pages not fetched this pass.

**Cheapest cited option is a tie at $0.02/1M** — OpenAI `text-embedding-3-small` and Voyage
`voyage-4-lite`, with Voyage additionally granting 200M free tokens. **No provider is chosen here.**

---

## 2. Open-weight options — licences are clean, hosting is the open question

| Model | Licence | Dimensions | Max input | Note |
|---|---|---|---|---|
| **Qwen3-Embedding-8B** | **Apache 2.0** | *"Up to 4096, supports user-defined output dimensions ranging from 32 to 4096"* | **32k tokens** | 8B parameters — the largest of the three and the one with real hosting cost |
| **BAAI/bge-m3** | **MIT** | **1024** | **8192** | Supports *"dense retrieval"*, *"sparse retrieval"* (lexical) and *"multi-vector retrieval"* (ColBERT) — i.e. hybrid in one model |

**Licence verdict: both are permissive and commercially usable** (Apache 2.0 and MIT). Neither
licence is the obstacle.

**The obstacle is that there is no OSS embedding route in this stack today.** Groq does not serve
embeddings (§1), so "run it on the OSS route" is not available as written. The real options are a
different hosted inference provider or self-hosting — and **self-hosting a model to save $0.02 per
million tokens is very unlikely to pay for itself** at any volume ORACLE will see before it has
users. The DOCS-lane logic that made the OSS text route 30× cheaper does not transfer, because the
paid embedding floor is already two cents.

**Stated as a fact, not a recommendation:** at $0.02/1M, embedding volume is not where ORACLE's
money goes. **The cache's value is in the provider calls it avoids, not in the embedding cost it
adds** — and that is an argument for using the cheapest credible hosted API and moving on, which is
a decision this pass does not make.

---

## 3. The storage side — answered from this database, read-only

```
=== pgvector AVAILABLE? ===
  name   | default_version | installed_version |                  comment
---------+-----------------+-------------------+--------------------------------------------
 pg_trgm | 1.6             | 1.6               | text similarity measurement and index …
 vector  | 0.8.0           |                   | vector data type and ivfflat and hnsw access methods

=== INSTALLED EXTENSIONS ===
 ltree · pg_cron · pg_stat_statements · pg_trgm · pgcrypto · plpgsql · supabase_vault · uuid-ossp

=== ANY EXISTING vector-TYPED COLUMNS ANYWHERE ===
 (0 rows)
```

**Answer: `vector` (pgvector) is AVAILABLE at version 0.8.0 and is NOT ENABLED.** `installed_version`
is empty, it does not appear in `pg_extension`, and no column anywhere in `public` uses a vector
type. **Nothing was enabled — this was a read.**

**What enabling costs.** `CREATE EXTENSION vector;` is a single statement and, on the evidence
above, is not the expensive part. The real costs are the ones that follow it and should be counted
against the cache, not the extension:

- **It is DDL on production** and therefore falls under the root R7 MIGRATION AMENDMENT — a named
  migration, a stated rollback, a recorded pre-flight. Not a routine apply.
- **It is a one-way door in practice.** `DROP EXTENSION vector` fails while any column of that type
  exists, so rollback means dropping the columns first — which means the rollback plan has to be
  written before the first embedding is stored, not after.
- **The index is the cost, not the type.** pgvector 0.8.0 offers ivfflat and hnsw; HNSW build time
  and memory are a real operational consideration at scale, and neither has been sized because
  there is no corpus yet.
- **`pg_trgm` is already enabled** and already does fuzzy text matching. It is not a substitute for
  semantic similarity, but it is worth knowing that *some* similarity capability exists today at
  zero marginal cost, if the cache's first cut only needs near-duplicate prompt detection rather
  than semantic matching. **That is a design question, not a ruling.**

---

## 4. The sovereignty collision — **LEAD INPUT. CANON RULING REQUIRED. NOT RESOLVED HERE.**

The dispatch asked for both sides argued and for the problem not to be softened. Both sides follow;
neither is mine.

### The technical facts, stated without spin

1. **An embedding is derived from the content, deterministically.** Same model, same input, same
   vector. It is not a reference to the content; it is a function of it.
2. **It is lossy and not human-readable.** You cannot read a 1536-float vector.
3. **Embedding-inversion research exists.** Published work has reconstructed substantial portions of
   input text from embedding vectors alone, given access to the embedding model. The degree of
   recovery varies by model, text length and attacker access. **I am not citing a specific paper
   here because I did not fetch one this pass — this is stated as a known research direction, and
   any ruling should have the current literature read first.** *(Marked as the weakest claim in this
   document, deliberately.)*
4. **Today the promise is structurally true, verified in §0.2**: `atlasoracle_directives` has no
   content columns. Not the prompt, not the response, not a hash. The promise is currently kept by
   *the absence of anywhere to put content*, not by policy.

### The argument that storing embeddings KEEPS the promise

- **The promise as marketed is about readable content.** A Bee's fear is that someone at HONEYCOMB
  can read what they asked. Nobody can read a vector, and no support tool, admin panel or leaked
  CSV would show text.
- **A hash is already accepted in principle.** `response_hash` — which the dispatch believed was
  already in the schema — is also derived from content and also one-way. If a content-derived,
  non-readable value were categorically forbidden, the design that everyone has been assuming was
  already illegitimate.
- **The cache serves the Bee's own interest.** It makes their directives cheaper and faster, and the
  data never leaves the Bee's own row.
- **Inversion requires the model.** An attacker needs not only the vector but access to the exact
  embedding model, and typically substantial compute per record. That is a materially higher bar
  than reading a text column.
- **Line-drawing has to happen somewhere.** `directive_category`, `input_tokens` and
  `provider_selected` are already stored, and all three leak information about the content. A rule
  that forbids anything content-derived forbids those too.

### The argument that storing embeddings BREAKS the promise

- **"No content columns" is a structural guarantee, and this converts it to a policy one.** Today
  the promise cannot be violated because there is nowhere to store content. Add an embedding column
  and the promise becomes *"we store a thing derived from your content, and we assure you it cannot
  be read"* — a claim that depends on the state of research rather than on the shape of the table.
  **That is a categorically weaker promise, and it is weaker the day it ships, not later.**
- **It is the single most marketable sentence ORACLE has.** Its power is that it is absolute. *"We
  have no content columns"* does not survive as a sentence once there is a content-derived column,
  and a footnote is not the same product.
- **The hash comparison cuts the other way on inspection.** A hash is one-way *by construction* and
  carries no semantic structure — its only use is equality. An embedding is *designed* to preserve
  semantic structure; that is the entire point of it. **They are not the same category of
  derivation**, and treating the accepted hash as precedent for the embedding is the weakest link in
  the keeps-the-promise case.
- **The metadata comparison also weakens on inspection.** `directive_category` is a low-cardinality
  label chosen from a fixed set; an embedding is a high-dimensional representation of the specific
  text. One leaks a bucket, the other approximates the sentence.
- **Research direction is against it.** Inversion attacks have improved, not receded. A promise
  whose truth depends on attacks not improving is a promise with a clock on it.
- **The migration is the moment to decide.** Once embeddings exist for a million directives,
  un-deciding means a backfill deletion and a public correction. §3 notes the extension is a
  practical one-way door.

### What a ruling would need to settle

1. Is a content-*derived* value permitted at all, or is the promise strictly "nothing computed from
   the content"?
2. If permitted, does it need a **Bee-facing opt-in**, and does the promise get restated in public
   copy on the same day?
3. Retention — do embeddings expire when the directive's own retention lapses?
4. Is there an architecture that gets the cache without the collision — e.g. **embeddings held in a
   separate store keyed by hash with no `bee_id`**, so no vector is attributable to a Bee? *(Named
   as an option to be evaluated, not proposed as the answer.)*

**No cache should be built until this is ruled.** That is the dispatch's instruction and I agree
with it on the evidence above.

---

## 5. Rerankers — would the retrieval design use one? **Plainly: no, not for this**

Rerankers earn their cost when a first-stage retriever returns 50–100 candidates and precision at
the top of the list matters — RAG over a document corpus. **The canonical answer cache is not that
shape.** It asks one question: *is there a stored answer close enough to this prompt to serve
instead of paying a provider?* That is a **single nearest-neighbour lookup against a threshold**,
not a ranking problem. A reranker would add a second network call and its latency to the fast path
that exists specifically to avoid a network call.

Priced anyway, so the option is on the record if a document-retrieval feature ever appears:

| Reranker | Status | Price |
|---|---|---|
| **Voyage** `rerank-2.5` | OFF | **$0.05 / 1M tokens**, 200M free tokens |
| **Voyage** `rerank-2.5-lite` | OFF | **$0.02 / 1M tokens**, 200M free |
| **Cohere** `Rerank 3.5` / `Rerank 4 Fast` (Medium) | OFF | **$5.00/hour or $3,250/month** (Model Vault instance) |
| **Cohere** `Rerank 4 Pro` | OFF | Medium **$5.00/hr · $3,250/mo**; Large **$10.00/hr · $6,500/mo** |
| Cohere Rerank per-API-call | OFF | **UNKNOWN** — the page defines the unit (*"a single search unit is defined as one query with up to 100 documents to be ranked"*) but prints no per-unit price |

---

## 6. Could-not-verify list

| Item | Status | Blocker |
|---|---|---|
| OpenAI trains-on-API-input policy | **UNKNOWN** | `openai.com/policies/api-data-usage-policies/` → **HTTP 403** to the fetcher |
| Trains-on-input for Voyage, Cohere, Google | **UNKNOWN** | Not stated on the pricing/docs pages read; separate privacy pages not fetched |
| Rate limits, all providers | **UNKNOWN** | Live on separate limits pages, none fetched |
| Cohere per-token Embed/Rerank API pricing | **UNKNOWN** | `cohere.com/pricing` presents Model Vault instance rates; per-token API rates not on it |
| Google `gemini-embedding` — everything | **UNKNOWN** | Not fetched. Vertex doc pages rendered as navigation shells for DOCS9 the same day; expected to behave the same |
| Voyage dimensions and context lengths | **UNKNOWN** | *"the documentation does not provide context length or dimension specifications"* on the pricing page |
| `text-embedding-ada-002` dimensions / max input | **UNKNOWN** | Not quoted on the guide page read |
| Embedding-inversion literature | **NOT FETCHED** | §4 point 3 is stated as a research direction, **not cited**. Flagged as the weakest claim in the document — read the current literature before ruling |
| HNSW / ivfflat build cost at ORACLE's scale | **UNKNOWN** | No corpus exists to size against |

---

## 7. Source index — all fetched 2026-07-30

| # | URL | Used for |
|---|---|---|
| 1 | *this database, via psql* | §0 table + column inventory; §3 pgvector availability |
| 2 | `https://developers.openai.com/api/docs/pricing` | §1 OpenAI embedding prices |
| 3 | `https://developers.openai.com/api/docs/guides/embeddings` | §1 dimensions, `dimensions` parameter, 8192 max input |
| 4 | `https://docs.voyageai.com/docs/pricing` | §1 Voyage prices + free tokens; §5 reranker prices; 33% batch discount |
| 5 | `https://cohere.com/pricing` | §1/§5 Model Vault rates; search-unit definition |
| 6 | `https://console.groq.com/docs/models` | §1 Groq serves no embedding models |
| 7 | `https://huggingface.co/Qwen/Qwen3-Embedding-8B` | §2 Apache 2.0, dims, 32k context |
| 8 | `https://huggingface.co/BAAI/bge-m3` | §2 MIT, 1024 dims, 8192, hybrid modes |

Unusable on fetch: `openai.com/policies/api-data-usage-policies/` (403),
`platform.openai.com/docs/pricing` (301 → followed).

---

## 8. Done-test

| Requirement | Status |
|---|---|
| Every cell cited-with-date or UNKNOWN + reason | **Met** — §1, §2, §5, §6 |
| Official/unofficial column filled | **Met** — all rows OFF; Groq marked NOT APPLICABLE with the reason |
| pgvector availability answered **from this database**, query output shown | **Met** — §3, verbatim output. Available 0.8.0, **not enabled**, nothing enabled |
| Sovereignty collision stated, both sides argued, LEAD INPUT | **Met** — §4, and not softened: the hash-precedent and metadata-precedent arguments are given *and* rebutted |
| No provider chosen, no build recommended | **Met** |

**No code, no schema, no account, zero spend. Nothing was enabled or applied.**
