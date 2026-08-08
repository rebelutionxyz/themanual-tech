-- DB33 -- HASH LOOKUP RAIL: malware verdict cache + per-Bee lookup budget.
--
-- WHY: the device Security page (src/pages/SecurityPage.tsx) currently runs a
--   structural file check in the browser -- extension/header mismatch, MZ and ELF
--   magic, macro-enabled Office. That answers "this file looks suspicious". It
--   cannot answer "this IS known malware", because that requires a corpus.
--   DB33 adds the corpus lookup: the browser hashes each file (SHA-256, local,
--   the bytes never leave the device) and sends only hashes to an edge function
--   that resolves them against a malware feed.
--
--   The lookup goes SERVER-SIDE, not browser-side, for three reasons: the feed
--   (MalwareBazaar) has required an Auth-Key since 2024 and a key must never
--   ship to a browser; the provider API sends no CORS headers; and a shared
--   cache plus a rate cap only exist if there is a server in the path.
--
-- PRIVACY SHAPE (the reason there are two tables and not one):
--   dingleberry_hash_verdicts is HASH-ONLY. No file name, no path, no bee_id.
--   dingleberry_hash_lookup_usage is BEE-ONLY. bee_id and counters, no hash.
--   Neither table carries a column the other could be joined on, so no query
--   over this schema can say which Bee looked up which file. That is deliberate
--   and it is the invariant to protect if either table is ever extended.
--
-- SEMANTICS: verdict has exactly TWO values. A hash the corpus has never seen
--   is 'unknown', NEVER 'clean'. There is no third value and there must not be
--   one -- absence of evidence is not evidence of absence, and a false 'clean'
--   on a security surface is worse than no answer at all.
--
-- ROLLBACK: supabase/migrations/_drafts/
--           20260808194223_dingleberry_hash_verdicts_v1_rollback.sql
--           (written before this file was applied; drops the two tables and the
--           one function. Both tables are new and hold no rows at apply time,
--           so the rollback loses nothing but cached verdicts.)
--
-- SCOPE: two new tables, two new indexes, one new SECURITY DEFINER function.
--   Purely additive. No existing object is altered, dropped, or re-granted.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. THE CACHE. Hash in, verdict out. Nothing else lives here.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dingleberry_hash_verdicts (
    sha256              text PRIMARY KEY
                          CHECK (sha256 ~ '^[a-f0-9]{64}$'),
    verdict             text NOT NULL
                          CHECK (verdict IN ('malicious', 'unknown')),
    provider            text NOT NULL,
    malware_family      text,
    signature           text,
    file_type           text,
    provider_first_seen timestamptz,
    checked_at          timestamptz NOT NULL DEFAULT now(),
    raw                 jsonb NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.dingleberry_hash_verdicts IS
  'DB33 malware verdict cache keyed by file SHA-256. Hash-only by design: no file name, no path, no bee_id -- do not add them. verdict is malicious|unknown; a hash absent from the corpus is unknown, never clean.';
COMMENT ON COLUMN public.dingleberry_hash_verdicts.provider IS
  'Which feed produced this verdict. Set from the active provider module, not hardcoded -- a re-check under a different provider overwrites the row and this column records which feed the current answer came from.';
COMMENT ON COLUMN public.dingleberry_hash_verdicts.raw IS
  'Trimmed provider payload, allow-listed field by field in the provider module. The provider response is NOT stored whole: MalwareBazaar entries carry the sample file_name as submitted by its reporter, and this schema stores no file names.';

-- Freshness sweeps and cache-age reporting read by checked_at, newest first.
CREATE INDEX IF NOT EXISTS dingleberry_hash_verdicts_checked_idx
    ON public.dingleberry_hash_verdicts (checked_at DESC);

ALTER TABLE public.dingleberry_hash_verdicts ENABLE ROW LEVEL SECURITY;

-- No policies, on purpose: RLS with zero policies denies every non-bypassing
-- role outright. The edge function holds the service-role key and bypasses RLS.
-- The REVOKE is the second layer -- Supabase's default privileges hand anon and
-- authenticated a full grant on new public tables, and a grant that outlives a
-- future "CREATE POLICY ... USING (true)" is exactly the DB11 incident class.
REVOKE ALL ON public.dingleberry_hash_verdicts FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. THE BUDGET. Bee in, counters out. No hash lives here.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dingleberry_hash_lookup_usage (
    bee_id        uuid        NOT NULL,
    minute_bucket timestamptz NOT NULL,
    calls         integer     NOT NULL DEFAULT 0 CHECK (calls   >= 0),
    lookups       integer     NOT NULL DEFAULT 0 CHECK (lookups >= 0),
    PRIMARY KEY (bee_id, minute_bucket)
);

COMMENT ON TABLE public.dingleberry_hash_lookup_usage IS
  'DB33 per-Bee per-minute budget for provider-bound hash lookups. Counters only -- no hash, no file name, so this table can never be joined to dingleberry_hash_verdicts to reveal what a Bee scanned. Rows older than one hour are pruned by dingleberry_hash_rate_check.';
COMMENT ON COLUMN public.dingleberry_hash_lookup_usage.lookups IS
  'Counts PROVIDER-BOUND hashes only. Cache hits are free and are never counted -- the cap exists to respect the feed provider terms of use, and a cache hit does not touch the feed.';

CREATE INDEX IF NOT EXISTS dingleberry_hash_lookup_usage_bucket_idx
    ON public.dingleberry_hash_lookup_usage (minute_bucket);

ALTER TABLE public.dingleberry_hash_lookup_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dingleberry_hash_lookup_usage FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. THE RATE CHECK. Atomic, partial-grant, service-role only.
-- ---------------------------------------------------------------------------
-- Returns how many provider-bound lookups the caller may spend RIGHT NOW, which
-- may be fewer than asked. Partial grant beats hard reject on a security
-- surface: a 400-file scan should return verdicts for the first 300 and
-- 'unknown' for the tail, not fail whole. The overflow is reported as degraded
-- by the caller so the UI can say "not checked" rather than "no match".
CREATE OR REPLACE FUNCTION public.dingleberry_hash_rate_check(
    p_bee_id  uuid,
    p_lookups integer
) RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
    v_bucket        timestamptz := date_trunc('minute', now());
    v_calls_cap     constant integer := 60;
    v_lookups_cap   constant integer := 300;
    v_calls         integer;
    v_lookups       integer;
    v_granted       integer;
    v_new_bucket    boolean := false;
    v_inserted      integer;
    v_retry         integer;
begin
    if p_bee_id is null then
        raise exception 'p_bee_id is required';
    end if;
    if p_lookups is null or p_lookups < 0 then
        raise exception 'p_lookups must be >= 0';
    end if;

    v_retry := ceil(extract(epoch from (v_bucket + interval '1 minute' - now())))::integer;

    insert into public.dingleberry_hash_lookup_usage (bee_id, minute_bucket)
    values (p_bee_id, v_bucket)
    on conflict (bee_id, minute_bucket) do nothing;

    get diagnostics v_inserted = row_count;
    v_new_bucket := (v_inserted = 1);

    -- FOR UPDATE serialises concurrent calls from the same Bee onto this row, so
    -- the read-then-update below cannot double-spend the budget across two
    -- edge-function isolates. An isolate-local counter would not survive a cold
    -- start and would not be shared, which is why the budget lives in the DB.
    select calls, lookups
      into v_calls, v_lookups
      from public.dingleberry_hash_lookup_usage
     where bee_id = p_bee_id and minute_bucket = v_bucket
       for update;

    if v_calls + 1 > v_calls_cap then
        return jsonb_build_object(
            'allowed',             false,
            'reason',              'calls_per_minute',
            'granted',             0,
            'requested',           p_lookups,
            'retry_after_seconds', v_retry
        );
    end if;

    v_granted := least(p_lookups, greatest(v_lookups_cap - v_lookups, 0));

    update public.dingleberry_hash_lookup_usage
       set calls   = calls + 1,
           lookups = lookups + v_granted
     where bee_id = p_bee_id and minute_bucket = v_bucket;

    -- Prune only on the Bee's first call of a minute: the sweep is cheap but it
    -- should not run on every request while a row lock is held.
    if v_new_bucket then
        delete from public.dingleberry_hash_lookup_usage
         where minute_bucket < now() - interval '1 hour';
    end if;

    return jsonb_build_object(
        'allowed',             true,
        'reason',              case when v_granted < p_lookups
                                    then 'lookups_per_minute' else null end,
        'granted',             v_granted,
        'requested',           p_lookups,
        'retry_after_seconds', case when v_granted < p_lookups then v_retry else 0 end
    );
end;
$function$;

COMMENT ON FUNCTION public.dingleberry_hash_rate_check(uuid, integer) IS
  'DB33 per-Bee budget for provider-bound hash lookups: 60 calls/min, 300 provider lookups/min. Grants partially rather than rejecting whole. service_role only -- the edge function is the sole caller and a Bee must not be able to spend or inspect its own budget directly.';

-- Default privileges hand every new function EXECUTE to PUBLIC. Revoke from
-- PUBLIC (not from anon -- the grant is a PUBLIC grant, and REVOKE FROM anon
-- against a PUBLIC grant is a silent no-op), then grant the one caller.
REVOKE ALL ON FUNCTION public.dingleberry_hash_rate_check(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dingleberry_hash_rate_check(uuid, integer) TO service_role;

COMMIT;
