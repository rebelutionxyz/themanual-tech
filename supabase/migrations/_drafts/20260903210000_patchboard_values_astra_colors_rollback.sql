-- ROLLBACK for 20260903180000_patchboard_values_astra_colors.sql
-- Dropping the table returns every astra to the astraTokens.ts floor, which is
-- what the resolver already falls back to. No surface breaks; colours simply
-- revert to the ratified palette.
drop policy if exists patchboard_values_read_anon on public.patchboard_values;
drop policy if exists patchboard_values_read_scoped on public.patchboard_values;
drop table if exists public.patchboard_values;
