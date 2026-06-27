-- Tighten: thermostat_daily_pools() is a distributor-only helper. Frontend reads thermostat_config
-- directly via its RLS read policy, so no anon/authenticated EXECUTE is needed. Lock to service_role.
REVOKE EXECUTE ON FUNCTION public.thermostat_daily_pools() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.thermostat_daily_pools() TO service_role;