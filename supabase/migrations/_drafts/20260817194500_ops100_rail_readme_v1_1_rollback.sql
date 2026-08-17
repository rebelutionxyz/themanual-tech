-- ROLLBACK for 20260817194500_ops100_rail_readme_v1_1.sql  (OPS100, 2026-08-17)
--
-- Restores public.ops_rail_readme() to RAIL_README v1.0 EXACTLY as it stood
-- before OPS100. The body below is the verbatim output of
--   SELECT pg_get_functiondef(oid) FROM pg_proc ... WHERE proname='ops_rail_readme'
-- captured BEFORE any edit was authored. It was written to this file by script,
-- never retyped, so "verbatim" is a fact rather than a claim.
--
-- Pre-flight fingerprint of the v1.0 prosrc (pg_proc.prosrc, not this file):
--   md5           e7566a0ba1e3b9f78b2d69033877dc62
--   octet_length  9850
--
-- This function is the cold-start briefing for every session on the board. If a
-- replace goes wrong the whole workspace is blinded, which is why this file
-- exists before the migration does.

CREATE OR REPLACE FUNCTION public.ops_rail_readme()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
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
  SELECT coalesce(string_agg(
           '  ' || rpad(w.slug, 22) || rpad(w.rel_path, 22)
                || coalesce(w.repo, '(not a git repo)'), E'\n' ORDER BY w.slug),
         '  (registry empty -- that is a bug, see DB43)')
    INTO v_workdirs
    FROM public.ops_workdirs w
   WHERE w.active;

  SELECT coalesce(string_agg('  ' || rpad(d.doc, 22) || d.version, E'\n' ORDER BY d.doc), '  (none)')
    INTO v_docs
    FROM (SELECT DISTINCT ON (doc) doc, version FROM public.ops_docs
           ORDER BY doc, created_at DESC) d;

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
