-- DB39 -- RATE LIMIT STORAGE FOR SIGN-IN-BY-HANDLE
--
-- Backs the auth-login edge function, which is unauthenticated by definition
-- (its callers are signed out) and is therefore a brute-force target.
--
-- ROLLBACK: supabase/migrations/_drafts/20260808230000_auth_login_rate_v1_rollback.sql
--           Written first. Delete the edge function BEFORE running it -- see its header.
--
-- ============================================================================
-- WHY NOT REUSE dingleberry_hash_rate_check
-- ============================================================================
-- The dispatch said reuse it "if it fits". It does not. That function is keyed on
-- p_bee_id uuid and raises when it is null -- it is a budget for a SIGNED-IN Bee.
-- A login attempt has no bee_id by construction; that is the whole point of the
-- endpoint. Keying it on a uuid would mean inventing one per anonymous caller,
-- which is not a rate limit. The SHAPE is reused -- minute buckets, an atomic
-- upsert, self-pruning on new-bucket, a jsonb verdict with retry_after_seconds --
-- so the two read the same way even though the key differs.
--
-- ============================================================================
-- THE KEY IS A HASH, AND THIS SIDE NEVER SEES THE PLAINTEXT
-- ============================================================================
-- p_key is a lowercase sha256 hex digest computed IN THE EDGE FUNCTION over the
-- caller IP or the submitted identifier. The database never receives an email
-- address, a handle, or an IP. That keeps the dispatch's "log failures without
-- the identifier value, or hashed" rule true at the storage layer too, not just
-- in log lines: this table cannot leak what it does not hold.
--
-- The constraint on p_key enforces it -- a caller that passed a raw handle would
-- be rejected rather than silently storing it.
--
-- ============================================================================
-- WINDOW: minute buckets, summed over a rolling window
-- ============================================================================
-- A single one-minute cap is the wrong shape for credential stuffing: an attacker
-- simply paces to the cap and grinds forever. Rows are bucketed per minute and
-- the check SUMS the last p_window_minutes, so the cap is a real window budget.
-- Caps are arguments, not constants, so the two scopes can differ without a
-- second function.
--
-- The edge function sets: identifier scope 10 per 15 min, ip scope 30 per 15 min.
-- Rationale is in the function header -- a human typo-ing a password needs a
-- handful of tries; 10 in a quarter hour is generous for that and useless for a
-- dictionary. The IP cap sits higher so one household or office NATed behind a
-- single address does not lock itself out on the first few fumbles.

BEGIN;

CREATE TABLE IF NOT EXISTS public.auth_login_attempts (
  scope         text        NOT NULL,
  key           text        NOT NULL,
  minute_bucket timestamptz NOT NULL,
  attempts      integer     NOT NULL DEFAULT 0,
  PRIMARY KEY (scope, key, minute_bucket),
  CONSTRAINT auth_login_attempts_scope_check CHECK (scope IN ('ip', 'identifier')),
  -- 64 lowercase hex. A raw identifier cannot satisfy this.
  CONSTRAINT auth_login_attempts_key_is_sha256 CHECK (key ~ '^[a-f0-9]{64}$')
);

COMMENT ON TABLE public.auth_login_attempts IS
  'Rate-limit counters for the auth-login edge function. key is a sha256 hex digest '
  'computed edge-side over the caller IP or submitted identifier -- never the plaintext.';

-- Sum-over-window and prune both scan by bucket.
CREATE INDEX IF NOT EXISTS auth_login_attempts_bucket_idx
  ON public.auth_login_attempts (minute_bucket);

-- RLS on, no policies: reachable only through the SECURITY DEFINER function
-- below and by service_role. Deny-by-default is the intended end state, so the
-- resulting rls_enabled_no_policy INFO from the posture scan is expected.
ALTER TABLE public.auth_login_attempts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.auth_login_rate_check(
  p_scope           text,
  p_key             text,
  p_cap             integer,
  p_window_minutes  integer DEFAULT 15
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_bucket     timestamptz := date_trunc('minute', now());
  v_since      timestamptz;
  v_attempts   integer;
  v_inserted   integer;
  v_new_bucket boolean := false;
  v_retry      integer;
BEGIN
  IF p_scope IS NULL OR p_scope NOT IN ('ip', 'identifier') THEN
    RAISE EXCEPTION 'p_scope must be ip or identifier';
  END IF;
  IF p_key IS NULL OR p_key !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'p_key must be a lowercase sha256 hex digest';
  END IF;
  IF p_cap IS NULL OR p_cap < 1 THEN
    RAISE EXCEPTION 'p_cap must be >= 1';
  END IF;
  IF p_window_minutes IS NULL OR p_window_minutes < 1 THEN
    RAISE EXCEPTION 'p_window_minutes must be >= 1';
  END IF;

  v_since := v_bucket - make_interval(mins => p_window_minutes - 1);
  v_retry := ceil(extract(epoch FROM (v_bucket + interval '1 minute' - now())))::integer;

  -- Count the attempt FIRST, then judge. Counting only the attempts that pass
  -- would let a caller sit exactly at the cap forever.
  INSERT INTO public.auth_login_attempts AS a (scope, key, minute_bucket, attempts)
  VALUES (p_scope, p_key, v_bucket, 1)
  ON CONFLICT (scope, key, minute_bucket) DO UPDATE SET attempts = a.attempts + 1;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  v_new_bucket := (v_inserted = 1);

  SELECT COALESCE(sum(a.attempts), 0) INTO v_attempts
    FROM public.auth_login_attempts a
   WHERE a.scope = p_scope AND a.key = p_key AND a.minute_bucket >= v_since;

  -- Opportunistic prune, same trick the hash rail uses: only on a fresh bucket,
  -- so it runs about once per key per minute instead of on every call.
  IF v_new_bucket THEN
    DELETE FROM public.auth_login_attempts
     WHERE minute_bucket < now() - interval '1 day';
  END IF;

  RETURN jsonb_build_object(
    'allowed',             v_attempts <= p_cap,
    'attempts',            v_attempts,
    'cap',                 p_cap,
    'window_minutes',      p_window_minutes,
    'retry_after_seconds', CASE WHEN v_attempts > p_cap THEN v_retry ELSE 0 END
  );
END;
$function$;

-- This project has ALTER DEFAULT PRIVILEGES handing anon and authenticated their
-- own ROLE-LEVEL EXECUTE on new functions in public, which REVOKE ... FROM PUBLIC
-- does NOT remove (DB33's finding). Revoke from the roles BY NAME, and verify by
-- reading pg_proc.proacl back rather than trusting the statement.
REVOKE EXECUTE ON FUNCTION public.auth_login_rate_check(text, text, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.auth_login_rate_check(text, text, integer, integer)
  TO service_role;

COMMIT;
