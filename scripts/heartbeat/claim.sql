-- OPS19 — the R2 CLAIM, and nothing else.
--
-- This file is the ONLY statement claim.cmd can run. It is checked in, so the
-- grant "allow claim.cmd by name" is a grant to run THIS text — not a grant to
-- run arbitrary SQL. That is the whole point of the wrapper: `Bash(psql*)`
-- authorizes every statement psql can carry; `Bash(<wrapper>*)` authorizes one.
--
-- Two psql variables, both supplied by claim.cmd:
--   :lane   hard lane filter for `go <lane>`. Empty string = no filter.
--   :lanes  comma-separated lanes this session has already finished a pass in,
--           for R2 sticky-first ordering. Empty string = none.
--
-- Both are interpolated with :'name', which applies psql's own literal quoting
-- (single quotes doubled), so neither can terminate the literal and inject SQL.
--
-- Deviations from the R2 text in CLAUDE.md, and why each is a no-op:
--   * `ARRAY['<lanes>']` → `string_to_array(:'lanes', ',')`. Same array, built
--     from a parameter instead of hand-edited into the statement. The empty
--     case is clean: string_to_array('', ',') = {''} and no lane equals '',
--     so every row sorts FALSE — identical to ARRAY[]::text[].
--   * `go <lane>` is written as an always-present predicate that is vacuously
--     true when :lane is empty, rather than a clause assembled by the shell.
--     Nothing about the plan changes; nothing gets concatenated.
-- Everything else — author/status/after_pass guard, ORDER BY, LIMIT 1,
-- FOR UPDATE SKIP LOCKED, the outer status re-check, the RETURNING list — is
-- the R2 statement verbatim.

UPDATE public.ops_dispatches SET status='claimed', claimed_at=now()
 WHERE id = (SELECT d.id FROM public.ops_dispatches d
              WHERE d.author='LEAD' AND d.status='queued'
                AND (:'lane' = '' OR d.lane = :'lane')
                AND (d.after_pass IS NULL
                     OR EXISTS (SELECT 1 FROM public.ops_dispatches p
                                 WHERE p.pass = d.after_pass AND p.status='done'))
              ORDER BY (d.lane = ANY(string_to_array(:'lanes', ','))) DESC NULLS LAST,
                       d.priority ASC, d.created_at ASC
              LIMIT 1 FOR UPDATE SKIP LOCKED)
   AND status='queued'
RETURNING id, lane, pass, title, workdir, scope, body;
