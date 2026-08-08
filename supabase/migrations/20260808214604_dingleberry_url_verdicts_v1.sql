-- DB38 -- URL CHECK RAIL: phishing and malware link verdict cache + budget.
--
-- WHY: owner ruling 2026-08-08 -- the WEBSITE is the security product for now,
--   no app required. Phishing links are the most common way ordinary people get
--   hurt, and checking a URL is something a browser can do honestly. This is the
--   sibling of DB33's hash rail: same seam, same two-value verdict, same
--   never-say-clean discipline, different input.
--
--   The lookup goes SERVER-SIDE for the same three reasons as DB33: abuse.ch has
--   required an Auth-Key on every service since 2025-06-30 and a key must never
--   ship to a browser; the provider API sends no CORS headers; and a shared cache
--   plus a rate cap only exist if there is a server in the path.
--
-- PRIVACY SHAPE (the reason there are two tables and not one), inherited from
--   DB33 and re-stated because it is the invariant to protect:
--   dingleberry_url_verdicts is URL-ONLY. No bee_id.
--   dingleberry_url_lookup_usage is BEE-ONLY. bee_id and counters, no URL.
--   Neither table carries a column the other could be joined on, so no query over
--   this schema can say which Bee checked which link. Do not add one.
--
-- SEMANTICS: verdict has exactly TWO values. A URL the feed has never listed is
--   'unknown', NEVER 'clean' and never 'safe'. URLhaus lists malicious URLs; it
--   does not certify anything as good, and the overwhelming majority of the web
--   is simply absent from it. A false 'clean' on a phishing check is the worst
--   failure this feature has.
--
-- ROLLBACK: supabase/migrations/_drafts/
--           20260808213000_dingleberry_url_verdicts_v1_rollback.sql
--           Written FIRST. Drops the two tables and the one function; three
--           objects, not the two the dispatch named (see that file).
--
-- SCOPE: two new tables, two new indexes, one new SECURITY DEFINER function.
--   Purely additive. DB33's dingleberry_hash_* objects are NOT touched.
--
-- PRE-FLIGHT (read off production before the apply): no object named
--   dingleberry_url_* exists in any schema. Rows at risk: 0. No DML against any
--   pre-existing table.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. THE CACHE. Normalised URL in, verdict out.
-- ---------------------------------------------------------------------------
-- Keyed by the SHA-256 of the NORMALISED url rather than the url itself: a URL
-- has no length bound worth trusting as a primary key, and a fixed-width hash
-- keys and indexes predictably. The normalised url is stored alongside it for
-- display and for auditing what was actually asked -- the hash alone would make
-- a bad cache row impossible to diagnose.
CREATE TABLE IF NOT EXISTS public.dingleberry_url_verdicts (
    url_sha256          text PRIMARY KEY
                          CHECK (url_sha256 ~ '^[a-f0-9]{64}$'),
    url                 text NOT NULL,
    verdict             text NOT NULL
                          CHECK (verdict IN ('malicious', 'unknown')),
    provider            text NOT NULL,
    threat              text,
    tags                text[],
    url_status          text,
    provider_first_seen timestamptz,
    checked_at          timestamptz NOT NULL DEFAULT now(),
    raw                 jsonb NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.dingleberry_url_verdicts IS
  'DB38 phishing/malware URL verdict cache, keyed by sha256 of the normalised URL. No bee_id by design -- do not add one. verdict is malicious|unknown; a URL absent from the feed is unknown, never clean.';
COMMENT ON COLUMN public.dingleberry_url_verdicts.url IS
  'The NORMALISED url (lowercased scheme and host, fragment stripped) -- the exact string that was hashed into url_sha256 and sent to the provider. Path and query keep their original case: they are case-sensitive on most servers and lowercasing them would both miss feed listings and misreport what was checked.';
COMMENT ON COLUMN public.dingleberry_url_verdicts.url_status IS
  'Provider liveness for a LISTED url (URLhaus: online|offline|unknown). It qualifies a malicious verdict, it never softens it -- an offline malware host is still a listing, and hosts come back.';
COMMENT ON COLUMN public.dingleberry_url_verdicts.raw IS
  'Trimmed provider payload, allow-listed field by field in the provider module. The response is never stored whole.';

CREATE INDEX IF NOT EXISTS dingleberry_url_verdicts_checked_idx
    ON public.dingleberry_url_verdicts (checked_at DESC);

ALTER TABLE public.dingleberry_url_verdicts ENABLE ROW LEVEL SECURITY;

-- No policies, on purpose: RLS with zero policies denies every non-bypassing
-- role outright. The edge function holds the service-role key and bypasses RLS.
-- The REVOKE is the second layer -- default privileges hand anon and
-- authenticated a full grant on new public tables, and a grant that outlives a
-- future "CREATE POLICY ... USING (true)" is the DB11 incident class.
REVOKE ALL ON public.dingleberry_url_verdicts FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. THE BUDGET. Bee in, counters out. No URL lives here.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dingleberry_url_lookup_usage (
    bee_id        uuid        NOT NULL,
    minute_bucket timestamptz NOT NULL,
    calls         integer     NOT NULL DEFAULT 0 CHECK (calls   >= 0),
    lookups       integer     NOT NULL DEFAULT 0 CHECK (lookups >= 0),
    PRIMARY KEY (bee_id, minute_bucket)
);

COMMENT ON TABLE public.dingleberry_url_lookup_usage IS
  'DB38 per-Bee per-minute budget for provider-bound URL lookups. Counters only -- no URL, so this table can never be joined to dingleberry_url_verdicts to reveal what a Bee checked. Rows older than one hour are pruned by dingleberry_url_rate_check.';
COMMENT ON COLUMN public.dingleberry_url_lookup_usage.lookups IS
  'Counts PROVIDER-BOUND URL lookups only. Cache hits are free and never counted -- the cap exists to respect the feed provider terms of use, and a cache hit does not touch the feed.';

CREATE INDEX IF NOT EXISTS dingleberry_url_lookup_usage_bucket_idx
    ON public.dingleberry_url_lookup_usage (minute_bucket);

ALTER TABLE public.dingleberry_url_lookup_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dingleberry_url_lookup_usage FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. THE RATE CHECK. Atomic, partial-grant, service-role only.
-- ---------------------------------------------------------------------------
-- Deliberately a SEPARATE function and table from DB33's hash budget rather than
-- a reuse of dingleberry_hash_rate_check. Two reasons:
--   1. that table's documented contract is "provider-bound HASH lookups"; feeding
--      URL traffic through it would make its own COMMENT false and would make
--      either counter impossible to reason about;
--   2. the two rails have different natural volumes -- a file scan sends up to
--      100 hashes, a link check sends at most 50 URLs and usually one.
-- The caps here are LOWER than the hash rail's on purpose (100/min vs 300/min).
--
-- NOTE FOR THE LEAD, because it is a real consequence and not obvious: both rails
-- authenticate to abuse.ch with the SAME account key, so a single Bee can now
-- spend 300 hash + 100 URL provider calls per minute against one free community
-- account. If that ever needs to be one combined ceiling, the honest fix is a
-- shared budget function taking a rail name -- not quietly merging these tables.
CREATE OR REPLACE FUNCTION public.dingleberry_url_rate_check(
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
    v_lookups_cap   constant integer := 100;
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

    insert into public.dingleberry_url_lookup_usage (bee_id, minute_bucket)
    values (p_bee_id, v_bucket)
    on conflict (bee_id, minute_bucket) do nothing;

    get diagnostics v_inserted = row_count;
    v_new_bucket := (v_inserted = 1);

    -- FOR UPDATE serialises concurrent calls from the same Bee onto this row, so
    -- the read-then-update below cannot double-spend the budget across two
    -- edge-function isolates.
    select calls, lookups
      into v_calls, v_lookups
      from public.dingleberry_url_lookup_usage
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

    update public.dingleberry_url_lookup_usage
       set calls   = calls + 1,
           lookups = lookups + v_granted
     where bee_id = p_bee_id and minute_bucket = v_bucket;

    -- Prune only on the Bee's first call of a minute.
    if v_new_bucket then
        delete from public.dingleberry_url_lookup_usage
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

COMMENT ON FUNCTION public.dingleberry_url_rate_check(uuid, integer) IS
  'DB38 per-Bee budget for provider-bound URL lookups: 60 calls/min, 100 provider lookups/min. Grants partially rather than rejecting whole. service_role only -- the edge function is the sole caller and a Bee must not be able to spend or inspect its own budget directly.';

-- Default privileges on THIS project grant new functions EXECUTE to PUBLIC *and*
-- role-level EXECUTE to anon and authenticated (pg_default_acl: anon=X/postgres,
-- authenticated=X/postgres). REVOKE ... FROM PUBLIC alone is a SILENT NO-OP here
-- and left DB33's first cut callable by any Bee -- that is what
-- 20260808194402_dingleberry_hash_rate_check_revoke_role_grants.sql had to fix,
-- and DB32's N02 records it permanently. Revoke from the named roles too.
REVOKE ALL ON FUNCTION public.dingleberry_url_rate_check(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dingleberry_url_rate_check(uuid, integer) TO service_role;

COMMIT;
