-- ═══════════════════════════════════════════════════════════════════════
-- TheManual.tech · Schema v4 — Model D thread categorization
-- April 22, 2026
-- Run AFTER schema-v3-intel.sql.
--
-- Model D: Every thread either has primary_realm explicitly set OR
-- inherits realm scope from its linked atoms (via entity_atom_links).
-- ═══════════════════════════════════════════════════════════════════════

-- Add primary realm/front/L2 columns to forum_threads
alter table public.forum_threads
  add column if not exists primary_realm text,
  add column if not exists primary_front text,
  add column if not exists primary_l2 text;

-- Indexes for filter queries
create index if not exists forum_threads_primary_realm_idx
  on public.forum_threads(primary_realm)
  where primary_realm is not null;

create index if not exists forum_threads_primary_realm_front_idx
  on public.forum_threads(primary_realm, primary_front)
  where primary_front is not null;

-- ═══════════════════════════════════════════════════════════════════════
-- END SCHEMA v4
-- ═══════════════════════════════════════════════════════════════════════
