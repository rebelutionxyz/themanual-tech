# `supabase/migrations/_archive/`

Migration files that are **kept for the record and never replayed.**

A file lands here when it is the only surviving artifact of a change that reached production, but it
cannot be represented as an ordinary migration - typically because its filename carries no stampable
14-digit version and minting one would write history nobody can vouch for. Archiving keeps the SQL
readable and removes the file from the reconciler's scope without inventing a fact.

The reconciler is **blind to subdirectories by construction**, not by configuration:
`scripts/migration-reconcile/reconcile.mjs` line 105 iterates a non-recursive `readdirSync` over
`supabase/migrations` and skips every entry that does not end in `.sql`, so a directory name is never
descended into. `_drafts/` has always been invisible to it for the same reason. **Do not make that
loop recursive without re-reading this file.**

**Never replay anything in this directory.** These statements have already run.

---

## `20260616_geo_us_cities_geonames_pop_coords.sql`

Archived 2026-08-03 by DB26, under ORACLE_MF v0.63. Bytes untouched - md5
`f224c13419ea96da24d7921deafa5b1a` before and after the move.

**What it does.** `UPDATE atoms` for US cities, stamping `geo.lat` / `geo.lng` and
`meta.population` alongside `source=geonames.org`, `license=CC BY 4.0`,
`population_basis=municipal`. ~3,368 value tuples.

**Why it is here: it RAN, and nothing recorded it.**

- `supabase_migrations.schema_migrations` holds **no row** for it.
- Its filename carries **no 14-digit version**, so the reconciler cannot place it in either
  direction - it sat in the date-blind "unparseable" bucket, which blocks the freeze-lift criterion
  unconditionally at any date.
- Content comparison against both same-day candidates (`20260616135818`
  `geo_us_major_cities_municipal_pop_coords`, ~91 tuples; `20260616140949`
  `geo_nonus_major_cities_municipal_pop_coords`, non-US data) matched **neither**. Longest common
  prefix with the nearer one: 1,691 characters, 33% of that row - same generator, a 37x smaller
  dataset.
- **Production carries its signature**: 2,983 US city atoms hold
  `source=geonames.org` + `population_basis=municipal` + `lat`/`lng`. Only **91** of those are
  accounted for by any recorded history row. The shortfall from 3,368 tuples to 2,983 updated atoms
  is exactly what its `WHERE` clause predicts, since a tuple matching no atom updates nothing.

**Evidence:** `REPORT.md`, pass `DB25-Q` section 4 (and the `DB25-Q` row in `public.ops_reports`).

**Why archived rather than stamped.** Marking it applied (class B2a) would require **choosing** a
version, because the file supplies none. DB22's emitter refuses to guess for exactly this reason, and
OPS45 recorded that fabricated history is worse than absent history. Archiving asserts only what was
measured: this ran, here is the SQL, here is the evidence, nobody replays it.
