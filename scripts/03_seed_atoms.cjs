/**
 * Phase 3 — Seed atoms into themanual.tech Supabase
 * --------------------------------------------------
 * Reads all_atoms_combined.json (4,860 atoms) and bulk-inserts in batches
 * of 500 via the Supabase admin client.
 *
 * Usage (PowerShell, from repo root):
 *     $env:SUPABASE_URL = "https://<project>.supabase.co"
 *     $env:SUPABASE_SERVICE_ROLE_KEY = "<eyJ...service-role-jwt...>"
 *     $env:ATOMS_JSON_PATH = "C:\path\to\HONEYCOMB_MASTER_04-25-26\05_TAXONOMY_ATOMS\all_atoms_combined.json"
 *     node scripts/03_seed_atoms.js
 *
 * Notes:
 *   - Uses the legacy `eyJ...` service-role JWT (NOT the new `sb_` format)
 *     because supabase-js requires it.
 *   - autoRefreshToken / persistSession set false (admin client convention).
 *   - Idempotent: uses upsert on id, so re-running is safe.
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ATOMS_PATH = process.env.ATOMS_JSON_PATH;

if (!SUPABASE_URL || !SERVICE_KEY || !ATOMS_PATH) {
  console.error(
    "Missing env. Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ATOMS_JSON_PATH"
  );
  process.exit(1);
}

if (!SERVICE_KEY.startsWith("eyJ")) {
  console.error(
    "SUPABASE_SERVICE_ROLE_KEY must be the legacy eyJ-format JWT, not sb_."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Realm name → id slug map (must match realms table from Phase 2)
const REALM_NAME_TO_ID = {
  Justice: "justice",
  Reference: "reference",
  "Human activities": "human_activities",
  Self: "self",
  Geography: "geography",
  Health: "health",
  Society: "society",
  Math: "math",
  Science: "science",
  Philosophy: "philosophy",
  Tech: "tech",
  History: "history",
  Culture: "culture",
  Religion: "religion",
};

const EXPECTED_COUNTS = {
  reference: 101,
  culture: 416,
  geography: 586,
  health: 183,
  history: 297,
  human_activities: 152,
  math: 173,
  science: 505,
  self: 162,
  philosophy: 227,
  religion: 362,
  society: 523,
  tech: 489,
  justice: 684,
};
const EXPECTED_TOTAL = 4860;

function transform(atom) {
  const realmId = REALM_NAME_TO_ID[atom.realm];
  if (!realmId) {
    throw new Error(`Unknown realm "${atom.realm}" on atom ${atom.id}`);
  }

  // Pull non-core fields into meta JSONB
  const meta = {};
  if (atom.element !== undefined) meta.element = atom.element;
  if (atom.celestialBody !== undefined) meta.celestialBody = atom.celestialBody;
  if (atom.canonicalRealm !== undefined) meta.canonicalRealm = atom.canonicalRealm;
  if (atom.languageScope !== undefined) meta.languageScope = atom.languageScope;

  return {
    id: atom.id,
    name: atom.name,
    path: atom.path,
    path_parts: atom.pathParts,
    realm_id: realmId,
    realm_name: atom.realm,
    depth: atom.depth,
    type: atom.type,
    kettle: atom.kettle,
    is_leaf: atom.isLeaf,
    theme_tags: atom.themeTags ?? [],
    realm_tags: atom.realmTags ?? [],
    pillar_tags: atom.pillarTags ?? [],
    skin_tags: atom.skinTags ?? [],
    geo: atom.geo,
    note: atom.note ?? null,
    meta,
  };
}

async function main() {
  console.log(`==> Loading atoms from ${ATOMS_PATH}`);
  const raw = JSON.parse(fs.readFileSync(ATOMS_PATH, "utf8"));
  console.log(`==> Loaded ${raw.length} atoms`);

  if (raw.length !== EXPECTED_TOTAL) {
    console.error(`Expected ${EXPECTED_TOTAL} atoms, got ${raw.length}. Aborting.`);
    process.exit(1);
  }

  const rows = raw.map(transform);

  // Pre-flight realm count check on the source data
  const sourceCounts = {};
  for (const r of rows) {
    sourceCounts[r.realm_id] = (sourceCounts[r.realm_id] || 0) + 1;
  }
  console.log("==> Source atom counts per realm:");
  for (const [realm, expected] of Object.entries(EXPECTED_COUNTS)) {
    const got = sourceCounts[realm] || 0;
    const ok = got === expected ? "✓" : "✗";
    console.log(`    ${ok} ${realm}: ${got} (expected ${expected})`);
    if (got !== expected) {
      console.error("Source data mismatch. Aborting before any DB write.");
      process.exit(1);
    }
  }

  // Batched upsert
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("atoms")
      .upsert(slice, { onConflict: "id" });
    if (error) {
      console.error(`Batch ${i}-${i + slice.length} FAILED:`, error);
      process.exit(1);
    }
    inserted += slice.length;
    console.log(`    inserted ${inserted}/${rows.length}`);
  }

  // Post-flight DB count check
  console.log("==> Verifying DB counts...");
  const { count: total, error: e1 } = await supabase
    .from("atoms")
    .select("*", { count: "exact", head: true });
  if (e1) {
    console.error("Total count failed:", e1);
    process.exit(1);
  }
  console.log(`    total in DB: ${total} (expected ${EXPECTED_TOTAL})`);
  if (total !== EXPECTED_TOTAL) {
    console.error("Total mismatch. Investigate.");
    process.exit(1);
  }

  let allOk = true;
  for (const [realm, expected] of Object.entries(EXPECTED_COUNTS)) {
    const { count, error } = await supabase
      .from("atoms")
      .select("*", { count: "exact", head: true })
      .eq("realm_id", realm);
    if (error) {
      console.error(`Realm count ${realm} failed:`, error);
      allOk = false;
      continue;
    }
    const ok = count === expected ? "✓" : "✗";
    console.log(`    ${ok} ${realm}: ${count} (expected ${expected})`);
    if (count !== expected) allOk = false;
  }

  if (!allOk) {
    console.error("==> Post-seed verification FAILED.");
    process.exit(1);
  }
  console.log("==> Seed complete. All counts match. Move to Phase 4 verification SQL.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
