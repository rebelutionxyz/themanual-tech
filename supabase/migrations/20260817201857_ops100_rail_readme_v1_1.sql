-- OPS100 - RAIL_README v1.0 -> v1.1. Targeted amendment, not a rewrite.
--
-- Three owner-reported, lead-confirmed defects in public.ops_rail_readme():
--
--   D1 THE LOOP IS MISSING. Step 5 CLOSE ended "Your LAST line of the session is
--      a state line", so a terminal that closed a pass correctly TERMINATED.
--      Observed repeatedly on 2026-08-17: FRONT51, DB51, FRONT58 and OPS98 each
--      closed and went idle while claimable work sat on the board. The terminals
--      obeyed the rail exactly; the rail was wrong. [DONE] is now stated as a
--      PASS boundary and the close loops back to the claim.
--
--   D2 NO LANE IDENTITY. Lane scoping appeared once, as an optional afterthought
--      ("Add AND d.lane=... to restrict by lane"), so a session had no notion of
--      which lane it was and a front window could claim a db pass. The session
--      now DECLARES its lane alongside its id in a new step 0, the lane-scoped
--      claim is the PRIMARY form, all-lanes is the documented exception, and a
--      per-lane depth table distinguishes an EMPTY lane from a GATED one.
--
--   D3 THE BOARD HID THE FOLDER. "BOARD RIGHT NOW" printed counts only, so
--      neither the owner nor a terminal could see which pass was where without a
--      second query. The counts survive as a totals line; beneath them is a
--      per-row table built from the EXISTING public.ops_dispatch_location view
--      joined to ops_dispatches for the three columns the view does not carry
--      (after_pass, claimed_by, heartbeat age). No new view was created.
--
-- Everything else is preserved byte-for-byte: the table list, heartbeat stanza,
-- work/report steps, close SQL, workdir table, canon doc list, standing rules,
-- onboarding stanza, and the SECURITY DEFINER / STABLE / search_path attributes.
--
-- ROLLBACK: supabase/migrations/_drafts/20260817194500_ops100_rail_readme_v1_1_rollback.sql
--   written FIRST, from verbatim pg_get_functiondef() output captured before any
--   edit. v1.0 prosrc fingerprint: md5 e7566a0ba1e3b9f78b2d69033877dc62, 9850 bytes.
--
-- REACH: RAIL_BOOTSTRAP v1.1 is explicit that a canon edit reaches the NEXT
--   session, not running ones. Sessions already looping on v1.0 keep their v1.0
--   behaviour until they re-read. This is not a fleet-wide fix.

CREATE OR REPLACE FUNCTION public.ops_rail_readme()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_version   constant text := 'RAIL_README v1.1';
  v_out       text;
  v_workdirs  text;
  v_docs      text;
  v_totals    text;
  v_board     text;
  v_lanes     text;
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
    INTO v_totals
    FROM public.ops_dispatches;

  -- D3: the per-row board. ops_dispatch_location already joins the folder;
  -- ops_dispatches supplies after_pass, claimed_by and the heartbeat clock.
  SELECT coalesce(string_agg(
           '  ' || rpad(t.pass, 10) || rpad(coalesce(t.lane, '-'), 7)
                || rpad(t.status, 9) || rpad(coalesce(t.rel_path, '(unregistered)'), 20)
                || rpad(coalesce(t.after_pass, '-'), 10)
                || rpad(coalesce(t.claimed_by, '-'), 11)
                || coalesce(t.age_min::text || 'm', '-'),
           E'\n' ORDER BY t.status DESC, t.priority ASC, t.created_at ASC),
         '  (nothing queued and nothing claimed)')
    INTO v_board
    FROM (SELECT l.pass, l.lane, l.status, l.rel_path,
                 d.after_pass, d.claimed_by, d.priority, d.created_at,
                 round(extract(epoch FROM now() - coalesce(d.heartbeat_at, d.claimed_at)) / 60)::int AS age_min
            FROM public.ops_dispatch_location l
            JOIN public.ops_dispatches d ON d.pass = l.pass
           WHERE l.status IN ('queued', 'claimed')) t;

  -- D2: per-lane depth. READY is the number a terminal actually cares about --
  -- queued minus those still gated on an unfinished after_pass.
  SELECT coalesce(string_agg(
           '  ' || rpad(coalesce(x.lane, '(no lane)'), 12)
                || 'queued ' || rpad(x.q::text, 5)
                || 'ready ' || rpad(x.ready::text, 6)
                || 'claimed ' || x.c,
           E'\n' ORDER BY x.lane), '  (no open rows in any lane)')
    INTO v_lanes
    FROM (SELECT d.lane,
                 count(*) FILTER (WHERE d.status = 'queued') AS q,
                 count(*) FILTER (WHERE d.status = 'queued'
                                    AND (d.after_pass IS NULL OR EXISTS (
                                          SELECT 1 FROM public.ops_dispatches p
                                           WHERE p.pass = d.after_pass AND p.status = 'done'))) AS ready,
                 count(*) FILTER (WHERE d.status = 'claimed') AS c
            FROM public.ops_dispatches d
           WHERE d.status IN ('queued', 'claimed')
           GROUP BY d.lane) x;

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
|| E'  sessions claim them ONE AT A TIME, do the work, file a report,\n'
|| E'  close, AND CLAIM AGAIN. You are a terminal session. You never\n'
|| E'  queue work.\n'
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
|| v_totals || E'\n'
|| E'\n'
|| E'  pass      lane   status   folder              after     by         age\n'
|| E'  --------  -----  -------  ------------------  --------  ---------  ----\n'
|| v_board || E'\n'
|| E'\n'
|| E'LANES -- is your lane EMPTY, or merely GATED?\n'
|| v_lanes || E'\n'
|| E'  queued counts every open row in the lane; READY excludes the ones still\n'
|| E'  waiting on an unfinished after_pass. queued>0 with ready=0 means WAIT --\n'
|| E'  the work exists and is not yours yet. It is never licence to widen.\n'
|| E'\n'
|| E'THE LIFECYCLE -- declare, claim, heartbeat, work, report, close, LOOP\n'
|| E'\n'
|| E'0. DECLARE WHO YOU ARE. Before your first claim set BOTH your session id\n'
|| E'   and YOUR LANE. The lane is not decoration: the claim below is\n'
|| E'   lane-scoped BY DEFAULT, which is what stops a front window claiming a\n'
|| E'   db pass and working in a folder it has no business in.\n'
|| E'\n'
|| E'     SET ops.session = ''<your session id>'';\n'
|| E'     SET ops.lane    = ''<front|db|docs|ops>'';\n'
|| E'\n'
|| E'   Plain SET, never SET LOCAL -- under psql -f each statement is its own\n'
|| E'   transaction, so SET LOCAL evaporates and claimed_by is written NULL.\n'
|| E'\n'
|| E'1. CLAIM -- LANE-SCOPED. This is the normal form. One atomic statement.\n'
|| E'   It ALWAYS prints one line; a silent terminal is a bug.\n'
|| E'\n'
|| E'     WITH claimed AS (\n'
|| E'       UPDATE public.ops_dispatches SET status=''claimed'', claimed_at=now(),\n'
|| E'              claimed_by = nullif(current_setting(''ops.session'', true), '''')\n'
|| E'        WHERE id = (SELECT d.id FROM public.ops_dispatches d\n'
|| E'                     WHERE d.author=''LEAD'' AND d.status=''queued''\n'
|| E'                       AND d.lane = nullif(current_setting(''ops.lane'', true), '''')\n'
|| E'                       AND (d.after_pass IS NULL OR EXISTS (\n'
|| E'                             SELECT 1 FROM public.ops_dispatches p\n'
|| E'                              WHERE p.pass = d.after_pass AND p.status=''done''))\n'
|| E'                     ORDER BY d.priority ASC, d.created_at ASC\n'
|| E'                     LIMIT 1 FOR UPDATE SKIP LOCKED)\n'
|| E'          AND status=''queued''\n'
|| E'       RETURNING pass, lane, workdir, title, body, claimed_by)\n'
|| E'     SELECT * FROM claimed;\n'
|| E'\n'
|| E'   Zero rows = retry ONCE; zero again = YOUR LANE is empty. Read LANES\n'
|| E'   above before concluding anything: ready=0 with queued>0 means gated,\n'
|| E'   not empty. Either way it is never licence to invent work.\n'
|| E'\n'
|| E'   THE ALL-LANES CLAIM IS THE EXCEPTION. Drop the d.lane line only when\n'
|| E'   the lead has told you to work the pool. Defaulting to it is how a\n'
|| E'   window ends up editing a tree it does not own.\n'
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
|| E'6. LOOP. GO BACK TO STEP 1 AND CLAIM AGAIN.\n'
|| E'\n'
|| E'   [DONE] IS A PASS BOUNDARY, NOT A SESSION BOUNDARY. A terminal that\n'
|| E'   closes a pass and stops has stopped EARLY -- the window sits idle while\n'
|| E'   claimable work waits on the board. Closing is the middle of your\n'
|| E'   session, never the end of it. Keep claiming until the queue says stop.\n'
|| E'\n'
|| E'   ONLY THESE TWO THINGS END A SESSION:\n'
|| E'     - a claim that genuinely returns zero rows TWICE   -> [NO WORK]\n'
|| E'     - a pass you cannot finish, question filed         -> [BLOCKED]\n'
|| E'\n'
|| E'   THE STATE LINE is the last line of the message that ends the session,\n'
|| E'   with nothing after it:\n'
|| E'     [NO WORK] | queue empty for <lane>\n'
|| E'     [BLOCKED] <pass> | <what it waits on>\n'
|| E'   [DONE] <pass> | <outcome> is printed as EACH pass closes, and then you\n'
|| E'   claim the next one. A multi-pass session prints several [DONE] lines and\n'
|| E'   exactly one [NO WORK] or [BLOCKED].\n'
|| E'\n'
|| E'   Every message from claim to close STARTS with [<PASS>]. A window\n'
|| E'   holding no claim prefixes [IDLE] instead, so it is never unlabelled.\n'
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

-- THE ONE DOC NOTE the dispatch allows. New slug rather than a RAIL_BOOTSTRAP
-- rewrite: RAIL_BOOTSTRAP v1.1 explains WHY the rail exists and was not read or
-- edited by this pass, and appending a version to it would misattribute this
-- amendment to a document it did not change. A session can now see which
-- briefing version exists before it calls the function.
INSERT INTO public.ops_docs (doc, version, title, body)
VALUES (
  'RAIL_README',
  'v1.1',
  'RAIL README v1.1 - the cold-start briefing loops now: [DONE] is a pass boundary, not a session boundary. Lane declared at step 0 and the claim lane-scoped by default. Board prints the folder per row instead of bare counts.',
  'RAIL_README v1.1. 2026-08-17. OPS100. ASCII only.

WHAT THIS DOC IS. A pointer, not a copy. The briefing itself is
public.ops_rail_readme() and is assembled live at call time; this row exists so
a session can see WHICH version is deployed before calling, and so the amendment
has a dated record. Never paste the briefing text in here - a copy rots, which
is the failure mode the function shape exists to prevent.

v1.0 -> v1.1, three defects, all owner-reported and lead-confirmed 2026-08-17.

D1 THE LOOP WAS MISSING - the important one. Step 5 CLOSE ended "Your LAST line
   of the session is a state line, nothing after it". Read literally, and
   terminals do read literally, a correctly closed pass ENDS THE SESSION. On
   2026-08-17 FRONT51, DB51, FRONT58 and OPS98 each closed and went idle with
   claimable work on the board. The terminals were not at fault; the rail told
   them to stop. v1.1 adds step 6 LOOP and states the distinction plainly:
   [DONE] is a PASS boundary, [NO WORK] and [BLOCKED] are the only SESSION
   boundaries.

D2 NO LANE IDENTITY. Lane scoping appeared once as an afterthought, so a session
   had no notion of which lane it was and a front window could claim a db pass.
   v1.1 adds step 0 DECLARE (session id AND lane), makes the lane-scoped claim
   the primary form with all-lanes as the documented exception, and prints a
   LANES table whose READY column separates an EMPTY lane from one merely GATED
   on an unfinished after_pass - the distinction that decides whether waiting is
   correct.

D3 THE BOARD HID THE FOLDER. "BOARD RIGHT NOW" printed counts only, so the owner
   asked "which pass is where" by hand every time. v1.1 keeps the counts as a
   totals line and adds a per-row table - pass, lane, status, folder, after_pass,
   claimed_by, heartbeat age - built from the EXISTING ops_dispatch_location
   view joined to ops_dispatches. No new view.

REACH. Per RAIL_BOOTSTRAP v1.1 a canon edit reaches the NEXT session, not
running ones. Windows already looping on v1.0 keep v1.0 behaviour until they
re-read, so the idle-after-close symptom persists in open windows until each is
restarted. This is not a fleet-wide fix and should not be reported as one.

ROLLBACK. supabase/migrations/_drafts/20260817194500_ops100_rail_readme_v1_1_rollback.sql
restores v1.0 verbatim (prosrc md5 e7566a0ba1e3b9f78b2d69033877dc62, 9850 bytes).'
);
