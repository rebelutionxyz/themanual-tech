-- ROLLBACK for PROFILE4 · 0002_bee_relations. Drop RPCs then the table.
drop function if exists public.bee_relation_count(uuid, text);
drop function if exists public.bee_relation_remove(uuid, text);
drop function if exists public.bee_relation_accept(uuid, text);
drop function if exists public.bee_relation_request(uuid, text);
drop table if exists public.bee_relations;
