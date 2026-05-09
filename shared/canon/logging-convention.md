# Logging Convention

**Status:** canonized 2026-05-09

## Levels

- **`console.warn`** — non-fatal failures that should be visible but not throw. The most common shape: an operation failed, the surrounding flow continues with degraded behavior, the warning surfaces the problem without blocking the user.
- **`console.error`** — caught exceptions in user-action handlers (e.g., a button click that throws). Surfaces unexpected failures.
- **`console.log`** — development debugging only. Should be removed before commit. Production code never ships a `console.log`.

## Prefix format

Every `console.*` call MUST start with a `[subsystem]` tag identifying the module or feature area. Examples drawn from the current codebase:

- `[geo]` in `src/lib/geo/storage.ts`
- `[promotions]` in `src/lib/promotions/query.ts`
- `[intel]` in `src/lib/intel.ts`

When the call site is **Astra-specific code** AND the subsystem name does not already match the Astra slug, ALSO include an `[astra=slug]` tag immediately after the subsystem tag:

```ts
console.warn('[geo][astra=intel] failed to read search-location', err);
```

When the subsystem name **equals** the Astra slug (e.g., the `intel` subsystem in AtlasINTEL code), the `[subsystem]` tag alone suffices — adding `[astra=intel]` would be redundant. The bracketed name implies the Astra in those cases:

```ts
console.warn('[intel] reply_count verification failed:', verifyErr);
// equivalent to [intel][astra=intel]; the second tag is omitted because they overlap
```

When the call site is **Nova-specific** (rare today, common future), include `[nova=slug]` instead of or in addition to `[astra=slug]`:

```ts
console.warn('[geo][nova=oceanresearch] location stale', err);
```

## Why this and not a structured logger

A `logPillar` / `logAstra` structured logger was considered and deferred. Reasoning: current logging volume is small (~25 call sites in `TheMANUAL.tech/src/`), the bracket-prefix convention covers what a logger would do for filtering, and production observability needs are not yet urgent. **Reconsider when:**

- Multiple Astras are shipping production traffic to a centralized sink.
- Per-Astra log filtering becomes a routine debugging operation.
- A log aggregator (Datadog, Logtail, Supabase logs table) is in use.

Until those triggers fire, the bracket-prefix convention is sufficient and adds no infrastructure surface.

## Out of scope (cross-reference)

- **Structured logger build** (`logPillar` / `logAstra`) — deferred indefinitely; tracked in `shared/notes/audits/console-log-sweep-2026-05-08.md` and `shared/notes/handoffs/handoff-current.md`.
- **Production log aggregation infrastructure** — deferred to post-Swarm observability design session.
- **Removing `console.log` calls programmatically** (e.g., a build-time stripper or Biome rule) — deferred; manual discipline for now.
