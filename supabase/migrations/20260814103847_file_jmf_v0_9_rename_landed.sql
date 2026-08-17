insert into ops_docs (doc, version, title, body, author)
values (
 'JMF', 'v0.9',
 'JUSTICE MASTER FILE v0.9 - RENAME LANDED and PUSHED: folder->Justice, /justice stub, Mission Control launcher, and ops_workdirs registry all shipped (OPS90 49a23bd / FRONT39 4c4137c / FRONT41 4021c0f); push confirmed by owner (both repos in-sync). Two residuals named, not claimed done: .claude allow-patterns (owner hand) and two deployed COMMENT ON strings (db-lane migration).',
 $body$# JUSTICE MASTER FILE v0.9 - delta on v0.8. 2026-08-14. ASCII only.

## WHAT CHANGED SINCE v0.8
v0.8 filed the NAMING RULING (owner, 2026-08-13): the project is Justice; atlasJUSTICE is retired;
no URL exists or may be written; DB verified clean; ONE rename pass staged on owner go. v0.9 records
that pass EXECUTED, COMMITTED, and PUSHED - the rename is LANDED across every surface that carried
the old name in the working tree.

## THE RENAME, AS LANDED (three passes, three commits, all pushed)
Owner gave the commit word 2026-08-13; owner clicked push and confirmed 2026-08-14 via GitHub
Desktop - both repos show "No local changes" and the top bar reads "Fetch origin" (not "Push
origin"), i.e. zero commits ahead on either = pushed. Commit hashes are from the three passes'
rail reports.

1. FOLDER - OPS90, workdir HONEYCOMB (root repo honeycomb-workspace). git mv atlasJUSTICE.org/ ->
   Justice/, 190 tracked renames + 4 root reference edits (CLAUDE.md, REPORT.md,
   logs/permission-needed.md, scripts/pull-rail.mjs). Committed 49a23bd. Pushed.
2. /justice STUB - FRONT39, workdir TheMANUAL.tech. One tracked file (src/lib/astra-catalog.ts):
   wordmark -> Justice, hosts: [] (EMPTIED, not substituted - any domain string would be the URL the
   ruling forbids writing). src/ greps zero for the old name; build green. Committed 4c4137c. Pushed.
3. MISSION CONTROL LAUNCHER - FRONT41, workdir TheMANUAL.tech. Two line-scoped edits
   (mission-control.ahk:29, mission-control.config.json:40): both LABEL and PATH -> Justice; target
   resolves to an existing directory; all 8 launcher entries still parse. Committed 4021c0f. Pushed.

## REGISTRY
ops_workdirs swapped (leadside, applied 2026-08-13): row Justice active; row atlasJUSTICE.org
active=false with a "never cite in a new dispatch" tombstone. The old slug named a disk path that no
longer exists after OPS90, so no newly-booting session can land on a dead workdir.

## LEFT VERBATIM BY DESIGN - NOT residuals (the OPS28 precedent)
Historical pass records (the two REPORT.md files, docs/OPS54.md, logs/permission-needed.md entries)
and applied-migration prose still contain the old name and STAY that way: rewriting a past pass to
describe a world that did not exist then falsifies the record. Live/current-state references were
updated; history was not. Same split OPS28 set and OPS90/FRONT39 followed.

## STILL OPEN - two items, each needs its own action. v0.9 does NOT claim these done.
A. Justice/.claude/settings.json - two allow patterns still read "git add atlasJUSTICE.org/". The
   secrets guard correctly refused this to the agent (R-SELF); it is OWNER'S OWN HAND. Fails CLOSED
   (a Justice-lane session hits a prompt on git add Justice/..., no permission widened). Exact
   two-line change filed in logs/permission-needed.md under "2026-08-13 - OPS90".
B. Two DEPLOYED COMMENT ON strings in the justice_* schema (justice_is_admin, justice_settings) still
   say atlasJUSTICE. This is a COMMENT ON migration, NOT file housekeeping - needs a named db-lane
   dispatch with a rollback statement under the MIGRATION AMENDMENT. Not yet cut; awaits owner word.

## LEAD NOTE - a process correction from this batch
Two dispatches (FRONT40, FRONT41) carried a lead-asserted premise the terminal had to correct against
measurement: FRONT40 was told to expect an unpushed FRONT37 commit that was in fact already on
origin/main; FRONT41 was told "one hit per file" when each line carried the old name twice (path AND
label). Both terminals measured, corrected, and declared - the harness held. Root cause: the lead
encoded a recalled/inferred fact into a dispatch instead of instructing the terminal to measure it.
STANDING CORRECTION: dispatches carry the target and the done-test; they do NOT assert counts,
hit-totals, or remote state the terminal can verify itself.
$body$,
 'chat-lead-20260814'
);