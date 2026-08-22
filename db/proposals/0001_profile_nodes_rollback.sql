-- ROLLBACK for PROFILE4 · 0001_profile_nodes. Reverses the migration exactly.
-- Drop the resolver, then the child table, then the catalog (FK order).
drop function if exists public.profile_node_effective(uuid, text);
drop table if exists public.profile_nodes;
drop table if exists public.profile_node_catalog;
