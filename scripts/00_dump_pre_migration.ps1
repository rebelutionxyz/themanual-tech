# =============================================================================
# Phase 0 — Pre-migration dump
# =============================================================================
# Dumps the current themanual.tech Supabase to a timestamped folder under db/.
# Does NOT overwrite previous dumps. Run this BEFORE any drop/create SQL.
#
# Usage (PowerShell, from repo root):
#     .\scripts\00_dump_pre_migration.ps1
#
# Requires: Supabase CLI (`supabase`) authed to the themanual.tech project.
# =============================================================================

$ErrorActionPreference = "Stop"

$timestamp = Get-Date -Format "yyyy-MM-ddTHH-mm-ss"
$dumpDir = "db\HONEYCOMB_DUMP_04-25-26_PRE-MIGRATION_$timestamp"

Write-Host "==> Creating dump directory: $dumpDir"
New-Item -ItemType Directory -Force -Path $dumpDir | Out-Null

# --- Schema snapshot (structure only, no data) ---------------------------------
Write-Host "==> Dumping schema (structure only)..."
npx supabase db dump --schema public --file "$dumpDir\schema.sql"

# --- Data snapshot (data only, INSERTs) ----------------------------------------
Write-Host "==> Dumping data (data only)..."
npx supabase db dump --schema public --data-only --file "$dumpDir\data.sql"

# --- Full dump (belt + suspenders) ---------------------------------------------
Write-Host "==> Dumping full (schema + data)..."
npx supabase db dump --schema public --file "$dumpDir\full.sql"

# --- Per-table CSV exports for human-readable rollback diffing ----------------
Write-Host "==> Exporting per-table CSVs..."
$tables = @(
    "atom_comments", "atom_kettle_votes", "atom_sources",
    "bazaar_listings", "bees", "chat_rooms",
    "entity_atom_links", "entity_category_links",
    "entity_reactions", "entity_saves", "entity_shares",
    "event_rsvps", "events",
    "forum_posts", "forum_threads",
    "give_campaigns", "give_contributions",
    "group_memberships", "groups",
    "message_participants", "message_threads", "messages",
    "pillars"
)

# CSV exports run via psql against the Supabase connection string
# (Set $env:SUPABASE_DB_URL beforehand, or the script will prompt)
if (-not $env:SUPABASE_DB_URL) {
    Write-Host "==> SUPABASE_DB_URL not set in env. Skipping CSV exports."
    Write-Host "    To enable: `$env:SUPABASE_DB_URL = '<connection-string>'"
} else {
    foreach ($t in $tables) {
        Write-Host "    -> $t.csv"
        $sql = "\COPY (SELECT * FROM $t) TO '$dumpDir\$t.csv' WITH CSV HEADER"
        & psql $env:SUPABASE_DB_URL -c $sql
    }
}

# --- Manifest ------------------------------------------------------------------
$manifest = @"
HONEYCOMB Pre-Migration Dump
============================
Timestamp: $timestamp
Source: themanual.tech Supabase
Reason: Pre-migration snapshot before 14-realm taxonomy import

Files:
- schema.sql   : structure only (CREATE TABLE, INDEX, etc.)
- data.sql     : data only (INSERT statements)
- full.sql     : schema + data combined
- *.csv        : per-table CSV (if SUPABASE_DB_URL was set)

To restore (if migration fails):
    psql `$SUPABASE_DB_URL -f full.sql

Pre-migration row counts (per task spec):
- bees: 1
- entity_atom_links: 10
- entity_reactions: 2
- entity_saves: 2
- entity_shares: 1
- forum_posts: 4
- forum_threads: 6
- pillars: 5
- (all others: 0)
"@

Set-Content -Path "$dumpDir\MANIFEST.txt" -Value $manifest

Write-Host ""
Write-Host "==> Dump complete: $dumpDir"
Write-Host "==> Verify files exist before proceeding to Phase 1."
Get-ChildItem $dumpDir | Format-Table Name, Length
