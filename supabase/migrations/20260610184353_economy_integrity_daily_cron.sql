-- Daily economy_integrity_check via pg_cron (01:00 UTC, after the 00:30 daily close).
-- Wrapper supplies the service_role claim the guardian requires, logs every run,
-- and RAISEs WARNING on failure so it lands in postgres logs.

CREATE TABLE public.economy_integrity_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  checked_at timestamptz NOT NULL DEFAULT now(),
  ok boolean NOT NULL,
  report jsonb NOT NULL
);

ALTER TABLE public.economy_integrity_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.economy_integrity_log FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.run_economy_integrity_check()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE v_report jsonb; v_ok boolean;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  v_report := public.economy_integrity_check();
  v_ok := COALESCE((v_report->>'ok')::boolean, false);
  INSERT INTO public.economy_integrity_log (ok, report) VALUES (v_ok, v_report);
  IF NOT v_ok THEN
    RAISE WARNING 'ECONOMY INTEGRITY CHECK FAILED: %', v_report;
  END IF;
  RETURN v_report;
END; $$;

REVOKE EXECUTE ON FUNCTION public.run_economy_integrity_check() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('economy-integrity-daily', '0 1 * * *', 'SELECT public.run_economy_integrity_check();');
