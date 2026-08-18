-- =============================================================================
-- FORWARD DRAFT — db76 consent ledger v1
-- PROPOSAL ONLY. NOT APPLIED. Not a migration until the owner rules on the one
-- ask (see REPORT.md, DB76) and a named dispatch authorises it. Unversioned
-- filename, parked in _drafts/, so the reconcile ledger never sees it.
--
-- Rollback: db76_consent_ledger_v1_rollback.sql (authored first).
-- Model: ORACLE_MF v1.43 (build cut), v1.39 (the Access model, five scopes),
--        v1.31 (the hybrid sealed/opt-in fork).
--
-- ONE MODEL, one sentence: every grant is a row — WHO may do WHAT with WHICH of
-- yours, UNTIL WHEN. Every use is a receipt.
--
-- ── THE SOVEREIGNTY LINE ───────────────────────────────────────────────────
-- Not one column in this file can hold a byte of the user's content. Every
-- reference to a thing is a uuid POINTER into a table that already exists, or a
-- constrained slug for the two scopes whose tables are greenfield. There is no
-- filename column, no title, no caption, no free text of any kind that a caller
-- could stuff content into — the two text columns are CHECK-constrained to a
-- slug shape and 128 chars, which is what stops them silently becoming one.
-- Column-by-column walk is in REPORT.md and is part of the deliverable.
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS. Enumerated verbs and categories, never free text. Note the deliberate
-- absence of any 'enabled'/'active' flag anywhere in this file: OFF is the
-- ABSENCE OF A GRANT, not a disabled row. A disabled row is a thing that can be
-- re-enabled by a bug; an absent row cannot.
-- ─────────────────────────────────────────────────────────────────────────────

-- WHICH of yours. Seven kinds across the five v1.39 scopes:
--   scope 1 FILES/FOLDERS -> file, folder          (consumers TODAY)
--   scope 2 PEOPLE        -> person_reseal         (table exists, mechanism greenfield)
--   scope 3 DEVICES       -> device                (consumer TODAY)
--   scope 4 ASTRAS        -> astra                 (consumer TODAY)
--   scope 5 OUTSIDE       -> connector, agent_in   (BOTH GREENFIELD — no table)
CREATE TYPE public.consent_scope_kind AS ENUM (
  'file', 'folder', 'person_reseal', 'device', 'astra', 'connector', 'agent_in'
);

-- WHO may act.
CREATE TYPE public.consent_grantee_kind AS ENUM (
  'h24',        -- the platform's own AI runtime, acting for the subject
  'bee',        -- another member (a reseal target)
  'astra',      -- a room asking h24 to act on the subject's things
  'connector',  -- an outside platform posting as the subject
  'agent'       -- an outside agent calling IN. Off by default = no row.
);

-- WHAT they may do.
CREATE TYPE public.consent_capability AS ENUM (
  'read',      -- may read the thing
  'process',   -- may decrypt for ONE job and reseal ("process once, stay sealed")
  'draft',     -- may compose on the subject's behalf, output queued not sent
  'post_as',   -- may publish as the subject through a connector
  'reseal',    -- may re-encrypt to another party's device (the PEOPLE scope)
  'call_in'    -- an outside agent may invoke on the subject's behalf
);

-- UNTIL WHEN, in kind.
CREATE TYPE public.consent_mode AS ENUM ('transient', 'standing');

-- ─────────────────────────────────────────────────────────────────────────────
-- GRANTS.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.consent_grants (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- WHOSE. Always the authenticated caller — never an argument the browser
  -- supplies. See consent_grant() below and the give_campaign_create lesson.
  subject_bee_id    uuid NOT NULL REFERENCES public.bees(id),

  -- WHICH of theirs.
  scope_kind        public.consent_scope_kind NOT NULL,
  -- A POINTER, never a name. media_assets.id | media_folders.id | bees.id |
  -- dingleberry_devices.id | astra_registry.id, by scope_kind. Deliberately NOT
  -- a foreign key: it is polymorphic across five tables, and a per-kind FK set
  -- would need five nullable columns. Integrity is enforced by the trigger below
  -- instead, which is the honest trade and is named as such.
  scope_ref         uuid,
  -- ONLY for the two greenfield kinds, which have no table to point at yet.
  -- CHECK-constrained to a slug so it can never become a filename or a caption.
  scope_ref_key     text,

  -- WHO may act.
  grantee_kind      public.consent_grantee_kind NOT NULL,
  grantee_ref       uuid,
  grantee_key       text,

  -- WHAT they may do, and for how long.
  capability        public.consent_capability NOT NULL,
  mode              public.consent_mode NOT NULL,

  granted_at        timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz,
  revoked_at        timestamptz,

  -- A transient grant is "open for ONE job" — it must say when it dies. A
  -- standing grant may run until revoked. This is the v1.31 shape as a constraint.
  CONSTRAINT consent_grants_transient_expires
    CHECK (mode <> 'transient' OR expires_at IS NOT NULL),

  -- Exactly one form of reference, and the greenfield kinds get the text one.
  CONSTRAINT consent_grants_scope_ref_shape CHECK (
    CASE WHEN scope_kind IN ('connector', 'agent_in')
         THEN scope_ref IS NULL     AND scope_ref_key IS NOT NULL
         ELSE scope_ref IS NOT NULL AND scope_ref_key IS NULL
    END
  ),
  CONSTRAINT consent_grants_grantee_ref_shape CHECK (
    CASE WHEN grantee_kind IN ('connector', 'agent')
         THEN grantee_ref IS NULL     AND grantee_key IS NOT NULL
         ELSE grantee_ref IS NOT NULL AND grantee_key IS NULL
    END
  ),

  -- THE ANTI-CONTENT CONSTRAINT. A lowercase slug, 128 chars. 'x.com',
  -- 'mastodon-social', 'acme-research-agent'. Not a sentence, not a path, not a
  -- filename. This is the column a careless caller would otherwise turn into
  -- content, so it is the column that gets a shape.
  CONSTRAINT consent_grants_scope_key_is_slug
    CHECK (scope_ref_key IS NULL OR scope_ref_key ~ '^[a-z0-9][a-z0-9._-]{0,127}$'),
  CONSTRAINT consent_grants_grantee_key_is_slug
    CHECK (grantee_key IS NULL OR grantee_key ~ '^[a-z0-9][a-z0-9._-]{0,127}$'),

  CONSTRAINT consent_grants_revoked_after_granted
    CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
);

COMMENT ON TABLE public.consent_grants IS
  'Access model, ORACLE_MF v1.39: WHO may do WHAT with WHICH of yours, UNTIL WHEN. Pointers only - no column here can hold user content. OFF is the absence of a row, never a disabled flag.';

-- The Access view reads "my live grants" constantly; this is that query.
CREATE INDEX consent_grants_subject_live_idx
  ON public.consent_grants (subject_bee_id, scope_kind)
  WHERE revoked_at IS NULL;
CREATE INDEX consent_grants_scope_ref_idx
  ON public.consent_grants (scope_ref) WHERE scope_ref IS NOT NULL;

-- Integrity for the polymorphic pointer, since a FK cannot span five tables.
-- Fails closed: an unknown kind raises rather than falling through.
CREATE OR REPLACE FUNCTION public.consent_grants_check_scope_ref()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  ok boolean;
BEGIN
  IF NEW.scope_kind IN ('connector', 'agent_in') THEN
    RETURN NEW;  -- greenfield: nothing to point at yet
  END IF;

  CASE NEW.scope_kind
    WHEN 'file'          THEN SELECT EXISTS (SELECT 1 FROM public.media_assets         t WHERE t.id = NEW.scope_ref AND t.bee_id = NEW.subject_bee_id) INTO ok;
    WHEN 'folder'        THEN SELECT EXISTS (SELECT 1 FROM public.media_folders        t WHERE t.id = NEW.scope_ref AND t.bee_id = NEW.subject_bee_id) INTO ok;
    WHEN 'device'        THEN SELECT EXISTS (SELECT 1 FROM public.dingleberry_devices  t WHERE t.id = NEW.scope_ref AND t.bee_id = NEW.subject_bee_id) INTO ok;
    WHEN 'person_reseal' THEN SELECT EXISTS (SELECT 1 FROM public.bees                 t WHERE t.id = NEW.scope_ref) INTO ok;
    WHEN 'astra'         THEN SELECT EXISTS (SELECT 1 FROM public.astra_registry       t WHERE t.id = NEW.scope_ref) INTO ok;
    ELSE RAISE EXCEPTION 'consent_grants: unhandled scope_kind %', NEW.scope_kind;
  END CASE;

  IF NOT ok THEN
    -- Note what this also enforces for file/folder/device: the subject can only
    -- grant over things that are THEIRS. A grant naming someone else's file is
    -- rejected here, not caught later by a reader.
    RAISE EXCEPTION 'consent_grants: scope_ref % is not a % belonging to the subject', NEW.scope_ref, NEW.scope_kind;
  END IF;
  RETURN NEW;
END
$fn$;

CREATE TRIGGER consent_grants_check_scope_ref_trg
  BEFORE INSERT OR UPDATE OF scope_kind, scope_ref, subject_bee_id
  ON public.consent_grants
  FOR EACH ROW EXECUTE FUNCTION public.consent_grants_check_scope_ref();

-- ─────────────────────────────────────────────────────────────────────────────
-- RECEIPTS. Append-only. This is the user-facing answer to "what has h24 ever
-- seen" — so it is history, and history is not editable.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.consent_receipts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id        uuid NOT NULL REFERENCES public.consent_grants(id),

  -- Denormalised from the grant ON PURPOSE: the RLS policy and the Access view
  -- both filter on it, and a join to consent_grants inside a policy would make
  -- every receipt read depend on the grants policy too. One column, one index,
  -- no policy interaction. Kept honest by the trigger below, which copies it
  -- from the grant rather than trusting the caller.
  subject_bee_id  uuid NOT NULL REFERENCES public.bees(id),

  action          public.consent_capability NOT NULL,

  -- WHAT WAS TOUCHED — METADATA ONLY. A uuid pointer, exactly as in grants.
  object_kind     public.consent_scope_kind NOT NULL,
  object_ref      uuid,
  object_key      text,

  -- Ties the receipt to the routed directive that produced it, so "what has h24
  -- seen" joins to "what did it cost" without either table holding the other's
  -- business. NULL for uses that were not a routed AI call (a reseal, a plain read).
  directive_id    uuid REFERENCES public.atlasoracle_directives(id),
  -- numeric(20,6) matches oracle_token_ledger.amount_tokens exactly.
  tokens_metered  numeric(20,6),

  occurred_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT consent_receipts_object_ref_shape CHECK (
    CASE WHEN object_kind IN ('connector', 'agent_in')
         THEN object_ref IS NULL     AND object_key IS NOT NULL
         ELSE object_ref IS NOT NULL AND object_key IS NULL
    END
  ),
  CONSTRAINT consent_receipts_object_key_is_slug
    CHECK (object_key IS NULL OR object_key ~ '^[a-z0-9][a-z0-9._-]{0,127}$'),
  CONSTRAINT consent_receipts_tokens_nonneg
    CHECK (tokens_metered IS NULL OR tokens_metered >= 0)
);

COMMENT ON TABLE public.consent_receipts IS
  'Append-only record of every USE of a consent grant. Metadata only - a pointer and a verb, never the thing itself. Never UPDATEd, never DELETEd; the trigger enforces it independently of RLS.';

CREATE INDEX consent_receipts_subject_time_idx
  ON public.consent_receipts (subject_bee_id, occurred_at DESC);
CREATE INDEX consent_receipts_grant_idx
  ON public.consent_receipts (grant_id);

-- Append-only, enforced in the table rather than only in policy. RLS grants no
-- UPDATE or DELETE to anyone, but a SECURITY DEFINER routine runs as owner and
-- would bypass RLS entirely — so the guarantee lives here, where nothing bypasses it.
CREATE OR REPLACE FUNCTION public.consent_receipts_append_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $fn$
BEGIN
  RAISE EXCEPTION 'consent_receipts is append-only: % is not permitted', TG_OP;
END
$fn$;

CREATE TRIGGER consent_receipts_no_update_trg
  BEFORE UPDATE OR DELETE ON public.consent_receipts
  FOR EACH ROW EXECUTE FUNCTION public.consent_receipts_append_only();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS FROM BIRTH. Deny by default; a member reads ONLY their own rows; anon
-- sees nothing; nobody writes through the API at all.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.consent_grants   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_grants   FORCE ROW LEVEL SECURITY;
ALTER TABLE public.consent_receipts FORCE ROW LEVEL SECURITY;

-- SELECT only, authenticated only, own rows only. There is deliberately NO
-- INSERT/UPDATE/DELETE policy on either table: with RLS on and no policy for a
-- command, that command is denied. Writes go through the routines below.
CREATE POLICY consent_grants_select_own ON public.consent_grants
  FOR SELECT TO authenticated
  USING (subject_bee_id = auth.uid());

CREATE POLICY consent_receipts_select_own ON public.consent_receipts
  FOR SELECT TO authenticated
  USING (subject_bee_id = auth.uid());

-- anon gets no policy and no grant. Belt and braces, and revoked by NAME rather
-- than FROM PUBLIC — this project hands anon/authenticated their own role-level
-- privileges via ALTER DEFAULT PRIVILEGES, which a REVOKE FROM PUBLIC leaves
-- untouched. Verify with pg_class.relacl after applying, not by assumption.
REVOKE ALL ON public.consent_grants   FROM anon;
REVOKE ALL ON public.consent_receipts FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.consent_grants   FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.consent_receipts FROM authenticated;
GRANT SELECT ON public.consent_grants   TO authenticated;
GRANT SELECT ON public.consent_receipts TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- WRITE PATH. SECURITY DEFINER, subject taken from auth.uid().
--
-- THE give_campaign_create LESSON, stated plainly: none of these routines takes
-- the subject as an argument. The browser can name WHAT it is granting and to
-- WHOM, but it can never name WHOSE. That is read from the session and nowhere else.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.consent_grant(
  p_scope_kind    public.consent_scope_kind,
  p_scope_ref     uuid,
  p_scope_ref_key text,
  p_grantee_kind  public.consent_grantee_kind,
  p_grantee_ref   uuid,
  p_grantee_key   text,
  p_capability    public.consent_capability,
  p_mode          public.consent_mode,
  p_expires_at    timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_subject uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_subject IS NULL THEN
    RAISE EXCEPTION 'consent_grant: not authenticated';
  END IF;

  INSERT INTO public.consent_grants (
    subject_bee_id, scope_kind, scope_ref, scope_ref_key,
    grantee_kind, grantee_ref, grantee_key, capability, mode, expires_at
  ) VALUES (
    v_subject, p_scope_kind, p_scope_ref, p_scope_ref_key,
    p_grantee_kind, p_grantee_ref, p_grantee_key, p_capability, p_mode, p_expires_at
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END
$fn$;

-- Revoke sets a timestamp. It NEVER deletes: the grant is the reason the
-- receipts under it exist, and deleting it would orphan a user's own history.
CREATE OR REPLACE FUNCTION public.consent_revoke(p_grant_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_subject uuid := auth.uid();
  v_when timestamptz;
BEGIN
  IF v_subject IS NULL THEN
    RAISE EXCEPTION 'consent_revoke: not authenticated';
  END IF;

  UPDATE public.consent_grants
     SET revoked_at = now()
   WHERE id = p_grant_id
     AND subject_bee_id = v_subject      -- you may only revoke your own
     AND revoked_at IS NULL              -- idempotent: re-revoking is a no-op
  RETURNING revoked_at INTO v_when;

  IF v_when IS NULL THEN
    -- Already revoked, or not yours. Deliberately does not distinguish the two:
    -- telling a caller "that grant exists but is not yours" is an information leak.
    SELECT revoked_at INTO v_when
      FROM public.consent_grants
     WHERE id = p_grant_id AND subject_bee_id = v_subject;
    IF v_when IS NULL THEN
      RAISE EXCEPTION 'consent_revoke: no such grant';
    END IF;
  END IF;

  RETURN v_when;
END
$fn$;

-- Receipts are written by the platform, never by a browser. service_role only.
CREATE OR REPLACE FUNCTION public.consent_receipt_write(
  p_grant_id       uuid,
  p_action         public.consent_capability,
  p_object_kind    public.consent_scope_kind,
  p_object_ref     uuid,
  p_object_key     text,
  p_tokens_metered numeric,
  p_directive_id   uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  g public.consent_grants%ROWTYPE;
  v_id uuid;
BEGIN
  SELECT * INTO g FROM public.consent_grants WHERE id = p_grant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'consent_receipt_write: no such grant';
  END IF;

  -- A receipt may only be written against a grant that was LIVE at this moment.
  -- This is where revocation actually bites: it stops future reads by making
  -- their receipts unwritable, which makes an unreceipted read a hard error
  -- rather than a silent one.
  IF g.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'consent_receipt_write: grant % was revoked at %', p_grant_id, g.revoked_at;
  END IF;
  IF g.expires_at IS NOT NULL AND g.expires_at <= now() THEN
    RAISE EXCEPTION 'consent_receipt_write: grant % expired at %', p_grant_id, g.expires_at;
  END IF;
  IF g.capability <> p_action THEN
    RAISE EXCEPTION 'consent_receipt_write: grant % permits %, not %', p_grant_id, g.capability, p_action;
  END IF;

  INSERT INTO public.consent_receipts (
    grant_id, subject_bee_id, action, object_kind, object_ref, object_key,
    tokens_metered, directive_id
  ) VALUES (
    p_grant_id, g.subject_bee_id,   -- copied from the grant, never from the caller
    p_action, p_object_kind, p_object_ref, p_object_key,
    p_tokens_metered, p_directive_id
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END
$fn$;

-- Grants by ROLE NAME, never FROM PUBLIC (see the RLS block above for why).
REVOKE ALL ON FUNCTION public.consent_grant(public.consent_scope_kind, uuid, text, public.consent_grantee_kind, uuid, text, public.consent_capability, public.consent_mode, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.consent_revoke(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.consent_receipt_write(uuid, public.consent_capability, public.consent_scope_kind, uuid, text, numeric, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.consent_grant(public.consent_scope_kind, uuid, text, public.consent_grantee_kind, uuid, text, public.consent_capability, public.consent_mode, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consent_revoke(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consent_receipt_write(uuid, public.consent_capability, public.consent_scope_kind, uuid, text, numeric, uuid) TO service_role;

-- ── Verify.
DO $verify$
BEGIN
  IF to_regclass('public.consent_grants')   IS NULL THEN RAISE EXCEPTION 'db76: consent_grants missing'; END IF;
  IF to_regclass('public.consent_receipts') IS NULL THEN RAISE EXCEPTION 'db76: consent_receipts missing'; END IF;

  IF NOT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = 'public.consent_grants'::regclass)
  THEN RAISE EXCEPTION 'db76: RLS not forced on consent_grants'; END IF;
  IF NOT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = 'public.consent_receipts'::regclass)
  THEN RAISE EXCEPTION 'db76: RLS not forced on consent_receipts'; END IF;

  -- SELECT-only policy set: exactly one policy per table, and it is a SELECT.
  IF (SELECT count(*) FROM pg_policy WHERE polrelid = 'public.consent_grants'::regclass   AND polcmd <> 'r') > 0
  THEN RAISE EXCEPTION 'db76: a non-SELECT policy exists on consent_grants'; END IF;
  IF (SELECT count(*) FROM pg_policy WHERE polrelid = 'public.consent_receipts'::regclass AND polcmd <> 'r') > 0
  THEN RAISE EXCEPTION 'db76: a non-SELECT policy exists on consent_receipts'; END IF;
END
$verify$;

COMMIT;
