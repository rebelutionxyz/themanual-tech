-- ROLLBACK for 20260903210000_patchboard_values_astra_colors.sql
-- Dropping the table returns every astra to the astraTokens.ts floor, which is
-- what the resolver already falls back to. No surface breaks; colours simply
-- revert to the ratified palette.
--
-- Does NOT remove the three astra_colors.*_override seed rows from
-- patchboard_settings — that table is owned by PATCHBOARD_DB1's own rollback,
-- not this one, and the switches default ON via the code floor even absent
-- their explicit rows, so leaving them is harmless.

drop function if exists public.patchboard_clear_value(text, uuid, uuid);
drop function if exists public.patchboard_set_value(text, uuid, uuid, jsonb);

drop policy if exists patchboard_values_read_anon on public.patchboard_values;
drop policy if exists patchboard_values_read_scoped on public.patchboard_values;
drop table if exists public.patchboard_values;
