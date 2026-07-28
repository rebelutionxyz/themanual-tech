# HONEYCOMB — Database Restore Runbook

**Status:** working canon · **Pass:** OPS26 · **Date:** 2026-07-28
**Scope:** restoring a `themanual-snapshot-*.sql.gz` produced by Tier 2 (GitHub Actions) or Tier 3 (local scheduled task).

> **The binder had no home.** OPS25 §6 wrote "for the binder" three times; no binder document
> existed anywhere in the workspace or on the rail. This file is it, placed alongside the other ops
> docs in `TheMANUAL.tech/docs/`. **If the binder is meant to live somewhere else, move this and say
> where** — a runbook nobody can find is the same as no runbook.

---

## 0. The two rules

Everything else here is detail. These two are the difference between a backup and a rumour.

1. **Restore with `-v ON_ERROR_STOP=1`.** Without it `psql` exits **0 on a partial restore**. OPS25 proved this the expensive way: a failed `COPY` derailed the parser and silently ate the *next* table's data, and the process reported success.
2. **Never trust exit 0. Diff the objects AND the rows** against production. §4. A restore that "worked" and a restore that is *correct* are different claims, and only one of them is checkable.

---

## 1. Target requirements — vanilla PostgreSQL is NOT a valid target

The dump assumes a Supabase-shaped database. Restoring into stock PostgreSQL loses **23 objects**, measured (§3).

**Extensions production depends on** (verified 2026-07-28):

| Extension | Version | Schema | On a fresh Supabase project? |
|---|---|---|---|
| `ltree` | 1.3 | `public` | available, **enable it** |
| `pg_cron` | 1.6.4 | `pg_catalog` | available, **must be enabled explicitly — not on by default** |
| `pg_stat_statements` | 1.11 | `extensions` | on by default |
| `pg_trgm` | 1.6 | `public` | available, **enable it** |
| `pgcrypto` | 1.3 | `extensions` | on by default |
| `plpgsql` | 1.0 | `pg_catalog` | always |
| `supabase_vault` | 0.3.1 | `vault` | on by default |
| `uuid-ossp` | 1.1 | `extensions` | on by default |

**Enable the three marked ones on the target BEFORE restoring.** `pg_cron` in particular is the one that starts the silent-data-loss cascade in OPS25 §3 if it is missing.

---

## 2. Restore

```bash
# 0. PRE-STEP on the target, before any restore:
#    CREATE EXTENSION IF NOT EXISTS ltree;
#    CREATE EXTENSION IF NOT EXISTS pg_trgm;
#    CREATE EXTENSION IF NOT EXISTS pg_cron;

# 1. Restore. ON_ERROR_STOP=1 is the load-bearing flag — see §0.
gzip -cd themanual-snapshot-YYYY-MM-DD-HHMM.sql.gz \
  | psql -v ON_ERROR_STOP=1 -h <target-host> -p 5432 -U <target-user> -d postgres

# 2. Apply the known manual step. §3.
psql -h <target-host> -U <target-user> -d postgres -c "
  SET search_path = public, pg_catalog;
  CREATE TRIGGER justice_dockets_repath_children_trg
    AFTER UPDATE ON public.justice_dockets
    FOR EACH ROW WHEN ((new.path IS DISTINCT FROM old.path))
    EXECUTE FUNCTION public.justice_dockets_repath_children();"

# 3. Verify. §4. Do not skip this.
```

### ⚠ Restore logs are SECRET MATERIAL

When a `COPY` derails, `psql` echoes the row data into stderr as failed SQL. OPS25 observed
`elections_private.config`'s **receipt salt in plaintext** in a restore log. Treat every restore log
as a credential dump: do not commit it, do not paste it, delete it when done.

If you only need to enumerate *objects* rather than restore data, strip the `COPY` payloads first —
then no secret can reach the log at all. That is how OPS26 did its analysis; the stripper is
`scratchpad/strip-copy.mjs` in that pass and is 30 lines.

---

## 3. The one known residual gap — `justice_dockets_repath_children_trg`

**This is not an environment problem and a better target does not fix it.**

pg_dump emits `SELECT pg_catalog.set_config('search_path', '', false);` at the top of every dump —
deliberately, as the fix for CVE-2018-1058. The trigger's `WHEN` clause is:

```sql
WHEN ((new.path IS DISTINCT FROM old.path))
```

`path` is `public.ltree`. `IS DISTINCT FROM` needs the `=` operator for `ltree`, and **operators
cannot be schema-qualified in a WHEN clause** — they are resolved through `search_path`, which the
dump has just set to empty. So the lookup fails and the trigger is not created:

```
ERROR: operator does not exist: public.ltree = public.ltree
```

**Proven by A/B test on the same statement, same database, same session type (OPS26):**

| search_path | Result |
|---|---|
| `''` — what the dump sets | **ERROR, trigger not created** |
| `public, pg_catalog` | **CREATE TRIGGER — succeeds** |

The `ltree` extension and the `public.ltree = public.ltree` operator were **both present** in the
target during the failing run. Nothing was missing. The restore just could not see it.

**Consequences to understand:**

- A restore into a real Supabase project **loses this trigger too.** A better target fixes the other 22 objects; it does not fix this one.
- Nothing warns you. Without `ON_ERROR_STOP=1` the restore exits 0 with the trigger silently absent.
- The trigger repaths child dockets when a parent's `ltree` path changes. A restored database missing it will **silently fail to cascade docket repaths** — corruption that appears later, during normal use, not at restore time.

**Two ways to close it. The choice is Butch's, not the runbook's:**

- **(a) Manual step, as written in §2 step 2.** Zero production change. Costs a step that must never be forgotten — which is exactly the class of thing this incident is about.
- **(b) Fix at source.** Recreate the trigger in production with a search_path-independent `WHEN`, e.g. comparing `new.path::text IS DISTINCT FROM old.path::text`, or dropping the `WHEN` and testing inside the function body. Then every future dump restores clean with no manual step. This is production DDL and needs its own dispatch.

Until (b) ships, **(a) is mandatory and is part of the restore, not an optional extra.**

---

## 4. Verification — the part that makes it a backup

Run **both** diffs. Objects catch missing triggers, functions and views; row counts catch missing data. Neither catches the other.

### 4a. Object inventory diff

```sql
-- inventory.sql — run against production AND the restore, sort both, diff
\pset format unaligned
\pset tuples_only on
SELECT 'extension|'||extname FROM pg_extension
UNION ALL
SELECT 'schema|'||nspname FROM pg_namespace
 WHERE nspname NOT LIKE 'pg_%' AND nspname <> 'information_schema'
UNION ALL
SELECT CASE c.relkind WHEN 'r' THEN 'table' WHEN 'v' THEN 'view' WHEN 'm' THEN 'matview'
                      WHEN 'S' THEN 'sequence' WHEN 'p' THEN 'parttable'
                      ELSE 'rel_'||c.relkind::text END
       ||'|'||n.nspname||'.'||c.relname
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema'
   AND c.relkind IN ('r','v','m','S','p')
UNION ALL
SELECT 'function|'||n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')'
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema'
UNION ALL
SELECT 'trigger|'||n.nspname||'.'||c.relname||'.'||t.tgname
  FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
  JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE NOT t.tgisinternal AND n.nspname NOT LIKE 'pg_%'
ORDER BY 1;
```

```bash
psql <prod coords>    -f inventory.sql | sort > prod.inv
psql <restore coords> -f inventory.sql | sort > restored.inv
comm -23 prod.inv restored.inv    # in production, MISSING from restore — must be empty
comm -13 prod.inv restored.inv    # in restore, not in production — must be empty
```

**Expected on a correct Supabase restore, after the §3 manual step: both empty.**

### 4b. Row-count diff (from OPS25 §6, unchanged — it works)

```sql
-- counts.sql
SELECT c.relname || '|' ||
       (xpath('/row/cnt/text()',
              query_to_xml('SELECT count(*) AS cnt FROM public.' || quote_ident(c.relname),
                           false, true, '')))[1]::text
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY c.relname;
```

```bash
join -t'|' -j1 <(sort prod.counts) <(sort restored.counts) | awk -F'|' '$2!=$3'
```

Small drift on live-write tables (e.g. `trivia_question_serves`) is expected — the dump is transactionally consistent and production moved on after it. **Zero rows where production has many is not drift, it is loss.**

---

## 5. What "23 objects" actually means

Measured 2026-07-28 against today's snapshot, restoring DDL into stock PostgreSQL 17.9 (OPS26 §2).

| Cause | Objects | Verdict |
|---|---|---|
| `pg_cron` not installed | **14** — the extension, `schema cron`, 7 functions, 2 sequences, `cron.job`, `cron.job_run_details`, 1 trigger | **restores-clean-on-Supabase** *(provided `pg_cron` is enabled first — §1)* |
| `supabase_vault` not installed | **8** — the extension, 5 functions, `vault.secrets`, `vault.decrypted_secrets` | **restores-clean-on-Supabase** |
| `search_path=''` vs an `ltree` operator | **1** — `public.justice_dockets.justice_dockets_repath_children_trg` | **needs-documented-manual-step** — §3 |

**22 of 23 are artefacts of restoring into the wrong kind of database. Exactly one is a real defect in the backup's fidelity, and it follows you to any target.**

---

## 6. Related

- `HONEYCOMB-backups/scripts/run-weekly-backup.ps1` — Tier 3
- `honeycomb-ops/.github/workflows/backup-weekly.yml` — Tier 2
- Mission control board — backup age per tier, green <8d / amber ≥8d / red ≥14d
- `TheMANUAL.tech/REPORT.md` — OPS24 (forensics), OPS25 (restore test, the silent-loss mechanism), OPS26 (this analysis)
