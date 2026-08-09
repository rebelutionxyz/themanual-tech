-- OPS85 -- READ THE RAIL: make the protocol self-serving from a cold start
--
-- ROLLBACK: supabase/migrations/_drafts/20260809022914_ops_rail_readme_v1_rollback.sql
--           Written FIRST, per the MIGRATION AMENDMENT.
--
-- POINTER CORRECTED AFTER THE APPLY, same as DB43 and for the same reason.
-- apply_migration stamps its own version: provisional filename was ...023000,
-- the stamp came back ...022914, both files were renamed to the stamp. This one
-- comment line therefore differs from the text in schema_migrations, which
-- still names ...023000. The catalog is the audit record and is untouched; the
-- repo file is what a human opens, and a header pointing at a filename that
-- does not exist is the trap DB39 left. Recorded in REPORT.md, OPS85.
--
-- ============================================================================
-- A POINTER, NOT A COPY
-- ============================================================================
-- Rail knowledge was spread across root CLAUDE.md, ops_docs, ops_workdirs and
-- tribal knowledge in dispatch bodies. A new session could not bootstrap from
-- "read the rail".
--
-- Three separate passes learned the same lesson on 2026-08-08: prose copies of
-- facts rot. The migration-freeze paragraph asserted a stale measurement; canon
-- named the wrong path for reconcile.mjs; R2b did not cover the root-workdir
-- case. So the STRUCTURE here is fixed prose and everything FACTUAL is read live
-- at call time -- the workdir registry, the canon doc versions, the stale
-- threshold, and the current board. This function cannot go stale about those
-- because it does not store them.
--
-- WHAT IS DELIBERATELY *NOT* IN HERE: the substance of HARNESS_SAFETY,
-- CLAIM_LIFECYCLE and the other canon docs. Those are named, versioned and
-- pointed at. Inlining them would create the second copy this pass exists to
-- avoid.
--
-- ============================================================================
-- WHY SECURITY DEFINER
-- ============================================================================
-- The briefing reads ops_workdirs and ops_docs. ops_dispatches is admin-gated by
-- RLS, so a non-admin authenticated caller would otherwise get a briefing with a
-- silently empty board section -- worse than no section. SECURITY DEFINER with a
-- pinned search_path lets the briefing be complete and identical for everyone
-- entitled to run it.
--
-- IT DISCLOSES: workdir names and relative paths, canon doc names/versions,
-- counts of open dispatch rows, and the protocol itself. It does NOT return
-- dispatch bodies, report bodies, or anything from outside the ops_* namespace.
-- That is a deliberate line: the briefing teaches the protocol, it is not a
-- back door to the board.

BEGIN;

CREATE OR REPLACE FUNCTION public.ops_rail_readme()
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_version   constant text := 'RAIL_README v1.0';
  v_out       text;
  v_workdirs  text;
  v_docs      text;
  v_board     text;
  v_threshold integer;
BEGIN
  -- ---- live: the workdir registry (DB43) -------------------------------
  SELECT coalesce(string_agg(
           '  ' || rpad(w.slug, 22) || rpad(w.rel_path, 22)
                || coalesce(w.repo, '(not a git repo)'), E'\n' ORDER BY w.slug),
         '  (registry empty -- that is a bug, see DB43)')
    INTO v_workdirs
    FROM public.ops_workdirs w
   WHERE w.active;

  -- ---- live: canon docs, newest row per slug (R8) ----------------------
  SELECT coalesce(string_agg('  ' || rpad(d.doc, 22) || d.version, E'\n' ORDER BY d.doc), '  (none)')
    INTO v_docs
    FROM (SELECT DISTINCT ON (doc) doc, version FROM public.ops_docs
           ORDER BY doc, created_at DESC) d;

  -- ---- live: the board right now ---------------------------------------
  SELECT '  queued ' || count(*) FILTER (WHERE status = 'queued')
      || ' | claimed ' || count(*) FILTER (WHERE status = 'claimed')
      || ' | stale ' || (SELECT count(*) FROM public.ops_stale_claims)
    INTO v_board
    FROM public.ops_dispatches;

  v_threshold := public.ops_stale_threshold_minutes();

  v_out :=
E'================================================================\n'
|| 'THE RAIL -- cold-start briefing' || E'\n'
|| v_version || '   generated ' || to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') || ' UTC' || E'\n'
|| E'================================================================\n'
|| E'\n'
|| E'You were told to READ THE RAIL. This is it. Everything below is\n'
|| E'assembled live from the database at the moment you called this\n'
|| E'function, except the protocol shape itself. Quote the version\n'
|| E'string above when you say what you read.\n'
|| E'\n'
|| E'WHAT THE RAIL IS\n'
|| E'  A work queue in Postgres. A LEAD queues dispatches; terminal\n'
|| E'  sessions claim them one at a time, do the work, file a report,\n'
|| E'  and close. You are a terminal session. You never queue work.\n'
|| E'\n'
|| E'  public.ops_dispatches   the queue. One row per pass. pass is UNIQUE.\n'
|| E'  public.ops_reports      the reports. Append-only. Never UPDATE or DELETE.\n'
|| E'  public.ops_docs         canon docs. Latest = newest row per slug by created_at,\n'
|| E'                          NOT by version string. Append-only.\n'
|| E'  public.ops_workdirs     the folder registry. ops_dispatches.workdir is NOT NULL\n'
|| E'                          with an FK to this table (DB43) -- an INSERT that omits\n'
|| E'                          workdir, or names an unregistered folder, is REJECTED.\n'
|| E'  public.ops_stale_claims a view: claims silent past the threshold. Suspicion, not verdict.\n'
|| E'\n'
|| E'BOARD RIGHT NOW\n'
|| v_board || E'\n'
|| E'\n'
|| E'THE LIFECYCLE -- claim, heartbeat, work, report, close\n'
|| E'\n'
|| E'1. CLAIM. One atomic statement. It ALWAYS prints one line; a silent\n'
|| E'   terminal is a bug. Set the session id first -- plain SET, never SET\n'
|| E'   LOCAL (under psql -f each statement is its own transaction, so SET\n'
|| E'   LOCAL evaporates and claimed_by is written NULL).\n'
|| E'\n'
|| E'     SET ops.session = ''<your session id>'';\n'
|| E'     WITH claimed AS (\n'
|| E'       UPDATE public.ops_dispatches SET status=''claimed'', claimed_at=now(),\n'
|| E'              claimed_by = nullif(current_setting(''ops.session'', true), '''')\n'
|| E'        WHERE id = (SELECT d.id FROM public.ops_dispatches d\n'
|| E'                     WHERE d.author=''LEAD'' AND d.status=''queued''\n'
|| E'                       AND (d.after_pass IS NULL OR EXISTS (\n'
|| E'                             SELECT 1 FROM public.ops_dispatches p\n'
|| E'                              WHERE p.pass = d.after_pass AND p.status=''done''))\n'
|| E'                     ORDER BY d.priority ASC, d.created_at ASC\n'
|| E'                     LIMIT 1 FOR UPDATE SKIP LOCKED)\n'
|| E'          AND status=''queued''\n'
|| E'       RETURNING pass, lane, workdir, title, body, claimed_by)\n'
|| E'     SELECT * FROM claimed;\n'
|| E'\n'
|| E'   Zero rows = retry ONCE; zero again = queue empty, STOP. That is never\n'
|| E'   licence to invent work. Add AND d.lane=''<lane>'' to restrict by lane.\n'
|| E'\n'
|| E'2. HEARTBEAT. Immediately after the claim returns, then every few\n'
|| E'   minutes and after every significant step:\n'
|| E'\n'
|| E'     SELECT public.ops_claim_heartbeat(''<PASS>'', ''<your session id>'');\n'
|| E'\n'
|| E'   A claim silent past ' || v_threshold || E' minutes is FLAGGED in ops_stale_claims.\n'
|| E'   A heartbeating claim is never subject to release, at any age. A silent\n'
|| E'   one is. This is the cheapest thing you can do to protect your own work.\n'
|| E'\n'
|| E'3. WORK. Obey the dispatch body -- but if it would be destructive,\n'
|| E'   irreversible, or outside the stated scope, file a question instead of\n'
|| E'   executing it. cd into the dispatch''s workdir (table below) and follow\n'
|| E'   THAT folder''s CLAUDE.md house rules.\n'
|| E'\n'
|| E'4. REPORT. REPORT.md at the workdir root is the report of record, updated\n'
|| E'   in place, and it is ALWAYS in scope -- scope bounds the work, not the\n'
|| E'   reporting. It carries every deviation and judgement call with its\n'
|| E'   reason, test output verbatim, and an explicit could-not-verify list.\n'
|| E'   Blocked instead? File <PASS>-Q into ops_reports, say "question filed",\n'
|| E'   STOP, and leave the dispatch claimed.\n'
|| E'\n'
|| E'5. CLOSE. One statement files the report AND closes the dispatch:\n'
|| E'\n'
|| E'     WITH r AS (INSERT INTO public.ops_reports (terminal, pass, title, body)\n'
|| E'                VALUES (''<lane>'', ''<PASS>'', ''<title>'', ''<full report>'') RETURNING id)\n'
|| E'     UPDATE public.ops_dispatches SET status=''done''\n'
|| E'      WHERE pass=''<PASS>'' AND status=''claimed''\n'
|| E'     RETURNING id;\n'
|| E'\n'
|| E'   Never retype a long report into a tool call -- hand-escaping corrupts\n'
|| E'   bodies. Write it to a file, dollar-quote it ($OPSRPT$), run via psql -f,\n'
|| E'   then verify md5(body) and octet_length(body) against local values.\n'
|| E'\n'
|| E'   Your LAST line of the session is a state line, nothing after it:\n'
|| E'     [DONE] <pass> | <outcome>     [BLOCKED] <pass> | <what it waits on>\n'
|| E'     [NO WORK] | queue empty\n'
|| E'   And every message from claim to close STARTS with [<PASS>].\n'
|| E'\n'
|| E'WORKDIRS -- slug, path relative to the workspace root, git repo\n'
|| v_workdirs || E'\n'
|| E'\n'
|| E'  Resolve a pass to its folder in one read:\n'
|| E'    SELECT rel_path FROM public.ops_dispatch_location WHERE pass = ''<PASS>'';\n'
|| E'\n'
|| E'CANON DOCS -- read the ones your pass touches. Newest row per slug:\n'
|| v_docs || E'\n'
|| E'\n'
|| E'    SELECT title, version, body FROM public.ops_docs\n'
|| E'     WHERE doc = ''<SLUG>'' ORDER BY created_at DESC LIMIT 1;\n'
|| E'\n'
|| E'  Start with RAIL_BOOTSTRAP (why the rail exists, what a good report looks\n'
|| E'  like), then CLAIM_LIFECYCLE and HARNESS_SAFETY.\n'
|| E'\n'
|| E'STANDING RULES THAT BITE HARDEST\n'
|| E'\n'
|| E'  NEVER WRITE TO A ROW YOU DO NOT HOLD. You may INSERT into ops_reports and\n'
|| E'  update the status of YOUR OWN claimed row. Nothing else. You never INSERT\n'
|| E'  into ops_dispatches -- only the lead queues work.\n'
|| E'\n'
|| E'  A SILENT CLAIM IS NOT A DEAD CLAIM. ops_stale_claims raises a suspicion,\n'
|| E'  never a verdict. Read suggested_action before touching anything. Releasing\n'
|| E'  a live claim puts two terminals on the same tree; a stuck lock only costs\n'
|| E'  a queue slot. Releasing requires a non-empty reason and is admin-gated.\n'
|| E'\n'
|| E'  HARNESS SAFETY -- fail closed. ON_ERROR_STOP on every psql run, assert the\n'
|| E'  transaction is actually open, and wrap rehearsals STRUCTURALLY rather than\n'
|| E'  by text edit. A rehearsal that quietly commits is the DB37 breach.\n'
|| E'\n'
|| E'  MIGRATION AMENDMENT -- a migration needs a named dispatch, a pre-flight\n'
|| E'  recorded in REPORT.md, and THE ROLLBACK WRITTEN FIRST. The apply is\n'
|| E'  ask-gated: the human click is the enforcement. Run the reconcile measure\n'
|| E'  before applying and expect exit 0. apply_migration stamps ITS OWN version,\n'
|| E'  not your filename -- rename the repo file to the stamped version afterward\n'
|| E'  or you manufacture fresh drift.\n'
|| E'\n'
|| E'  REVOKE FROM NAMED ROLES, NOT PUBLIC. This project grants anon and\n'
|| E'  authenticated their own role-level EXECUTE on new functions via ALTER\n'
|| E'  DEFAULT PRIVILEGES, which REVOKE ... FROM PUBLIC does not remove. Revoke\n'
|| E'  by role name and verify by reading pg_proc.proacl back.\n'
|| E'\n'
|| E'  SECRETS. Never read, print or commit a real env file, key, token or\n'
|| E'  connection URI. Passwords come from pgpass.conf, never an argument.\n'
|| E'\n'
|| E'  GIT. The human commits and the human clicks push. History-rewriting git\n'
|| E'  (force push, reset --hard, rebase, checkout, merge, clean, restore) is\n'
|| E'  denied by design. Read-only git is always fine.\n'
|| E'\n'
|| E'ONBOARDING A NEW PROJECT -- two steps, and it is on the rail\n'
|| E'  1. Register the folder:\n'
|| E'       INSERT INTO public.ops_workdirs (slug, rel_path, repo, is_git_repo, notes)\n'
|| E'       VALUES (''<slug>'', ''<path relative to workspace root>'', ''<repo or NULL>'',\n'
|| E'               <true|false>, ''<why it exists>'');\n'
|| E'     Paths are RELATIVE and enforced -- an absolute path is rejected.\n'
|| E'  2. Drop the pointer stanza into that repo''s CLAUDE.md, if it has one.\n'
|| E'     The stanza only says how to reach this function. It never restates the\n'
|| E'     protocol, so it never needs changing again.\n'
|| E'\n'
|| E'================================================================\n'
|| 'END ' || v_version || E'\n'
|| E'================================================================\n';

  RETURN v_out;
END;
$function$;

COMMENT ON FUNCTION public.ops_rail_readme() IS
  'Cold-start rail briefing, assembled live. The single entry point for "read the rail". OPS85.';

-- Default privileges hand anon and authenticated their own role-level EXECUTE
-- on new functions in public, and REVOKE ... FROM PUBLIC does NOT remove that
-- (DB33). Revoke by role name, then grant back only what is intended, and
-- verify by reading pg_proc.proacl rather than trusting the statement.
REVOKE EXECUTE ON FUNCTION public.ops_rail_readme() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.ops_rail_readme() TO authenticated, service_role;

COMMIT;
