#!/usr/bin/env python3
"""
Generate: supabase/migrations/20260616_geo_cities_geonames_pop_coords.sql

Why a generator (not the .sql directly): the data comes from the GeonamesCache
Python package, which can't run in Code's shell (no Python there). Run this in
the same env you used for the 82 majors; it writes the migration file.

  pip install geonamescache psycopg2-binary
  DATABASE_URL='postgresql://...session-pooler...' python scripts/geo/gen_geo_cities.py

What it does — sets, on each matched city atom:
    geo.lat, geo.lng,
    meta.population, meta.source='geonames.org', meta.license='CC BY 4.0',
    meta.population_basis='municipal'
via municipal population + lat/lng from GeonamesCache().get_cities().

Matching (per dispatch):
  US:     admin1code -> state name via get_us_states(); match atoms on
          geo.parentCountry='US' AND lower(geo.parentRegion)=lower(state)
          AND lower(name)=lower(city).
          Aliases: 'New York City'->'New York'; 'St.'<->'Saint' variants.
  non-US: geo.parentCountry=countrycode AND lower(name)=lower(city);
          on name collision take the max-population city.

Idempotent: each UPDATE writes the same values, so re-running is a no-op (the
82 majors included). Read-only DB access is enough — this only SELECTs and
writes a .sql file; it never mutates the DB.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

try:
    import psycopg2
except ImportError:
    sys.exit("Missing dep: pip install psycopg2-binary")
try:
    from geonamescache import GeonamesCache
except ImportError:
    sys.exit("Missing dep: pip install geonamescache")

OUT = Path(__file__).resolve().parents[2] / "supabase" / "migrations" / \
    "20260616_geo_cities_geonames_pop_coords.sql"


def name_variants(name: str):
    """Yield the atom-name spellings to try against GeonamesCache city names."""
    seen = set()

    def emit(n: str):
        k = n.lower()
        if k not in seen:
            seen.add(k)
            yield n

    yield from emit(name)
    if name == "New York City":
        yield from emit("New York")
    # St. <-> Saint (with and without the period)
    if "St. " in name:
        yield from emit(name.replace("St. ", "Saint "))
    if "St " in name:
        yield from emit(name.replace("St ", "Saint "))
    if "Saint " in name:
        yield from emit(name.replace("Saint ", "St. "))
        yield from emit(name.replace("Saint ", "St "))


def build_indexes(gc: GeonamesCache):
    """Return (us_index, intl_index). Values keep the max-population match."""
    cities = gc.get_cities()
    states = gc.get_us_states()  # keyed by 2-letter code -> {'name': ...}

    us: dict[tuple[str, str], dict] = {}    # (state_lower, city_lower) -> city
    intl: dict[tuple[str, str], dict] = {}  # (countrycode, city_lower) -> city

    for c in cities.values():
        cc = c.get("countrycode")
        cname = (c.get("name") or "").lower()
        pop = int(c.get("population") or 0)
        if not cc or not cname:
            continue
        if cc == "US":
            st = states.get(c.get("admin1code"))
            if not st:
                continue
            key = (st["name"].lower(), cname)
            tgt = us
        else:
            key = (cc, cname)
            tgt = intl
        cur = tgt.get(key)
        if cur is None or pop > int(cur.get("population") or 0):
            tgt[key] = c
    return us, intl


def match(atom, us, intl):
    """Return the best GeonamesCache city for an atom, or None."""
    country = atom["country"]
    region = (atom["region"] or "").lower()
    for variant in name_variants(atom["name"]):
        v = variant.lower()
        hit = us.get((region, v)) if country == "US" else intl.get((country, v))
        if hit:
            return hit
    return None


def sql_lit(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def emit_update(atom_id: str, city) -> str:
    lat = float(city["latitude"])
    lng = float(city["longitude"])
    pop = int(city.get("population") or 0)
    return (
        "UPDATE public.atoms SET\n"
        "  geo = jsonb_set(jsonb_set(coalesce(geo,'{}'::jsonb),"
        f" '{{lat}}', to_jsonb({lat!r}::double precision)),"
        f" '{{lng}}', to_jsonb({lng!r}::double precision)),\n"
        "  meta = coalesce(meta,'{}'::jsonb) || jsonb_build_object("
        f"'population', {pop}::bigint,"
        " 'source','geonames.org','license','CC BY 4.0','population_basis','municipal')\n"
        f"WHERE id = {sql_lit(atom_id)};"
    )


def main():
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        sys.exit("Set DATABASE_URL (read-only is fine).")

    gc = GeonamesCache()
    us, intl = build_indexes(gc)

    with psycopg2.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, name, geo->>'parentCountry', geo->>'parentRegion' "
            "FROM public.atoms WHERE geo ? 'parentCountry' ORDER BY id"
        )
        rows = [
            {"id": r[0], "name": r[1], "country": r[2], "region": r[3]}
            for r in cur.fetchall()
        ]

    updates, unmatched = [], 0
    for atom in rows:
        city = match(atom, us, intl)
        if city:
            updates.append(emit_update(atom["id"], city))
        else:
            unmatched += 1

    header = (
        "-- 20260616 — geo cities: GeonamesCache municipal population + coords.\n"
        "-- Generated by scripts/geo/gen_geo_cities.py from GeonamesCache().get_cities()\n"
        "-- (+ get_us_states()). Sets geo.lat/lng + meta.population/source/license/\n"
        "-- population_basis on matched city atoms. Idempotent: re-running writes the\n"
        f"-- same values. Source: geonames.org (CC BY 4.0).\n"
        f"-- Matched {len(updates)} of {len(rows)} city atoms ({unmatched} unmatched).\n\n"
        "BEGIN;\n\n"
    )
    OUT.write_text(header + "\n\n".join(updates) + "\n\nCOMMIT;\n", encoding="utf-8")
    print(f"Wrote {OUT}")
    print(f"Matched {len(updates)} / {len(rows)} city atoms ({unmatched} unmatched).")


if __name__ == "__main__":
    main()
