@echo off
setlocal

REM ============================================================================
REM OPS19 - the R2 CLAIM transport, and nothing else.
REM ============================================================================
REM WHY THIS EXISTS. HEARTBEAT-SMOKE found that Claude Code's allow-list matches
REM a PREFIX OF THE COMMAND STRING. The canonical R3/R2 transport is invoked as
REM   "/c/Program Files/PostgreSQL/17/bin/psql.exe" ...
REM which begins with a quote, not with `psql`, so it does NOT match the
REM allow entry `Bash(psql*)` and is auto-denied under --permission-mode dontAsk.
REM Bare `psql` matches the rule but is not on PATH (exit 127). Result: allowed
REM by name, unreachable by path - every unattended heartbeat dies at the claim.
REM
REM This wrapper closes that gap at a NARROWER grant than the one it replaces.
REM `Bash(psql*)` authorizes every statement psql can carry, on any database.
REM Allowing this file by name authorizes exactly one checked-in statement -
REM claim.sql, the R2 claim - against one host. That is the narrower grant the
REM C3 ruling anticipated, so the recommendation to Butch is: add the wrapper
REM AND drop `Bash(psql*)` in the same edit.
REM
REM WHAT IT DELIBERATELY CANNOT DO.
REM   - It takes no SQL. The statement is claim.sql, resolved relative to this
REM     file (%~dp0), so no argument can point it at other SQL.
REM   - It takes no password. -w forbids a prompt; psql reads pgpass.conf. The
REM     password is never read, printed, passed or logged. (CLAUDE.md Secrets.)
REM   - It takes no host/user/db. Those are literals below.
REM   - It cannot FINISH a pass, file a report, or touch any other table. R3, R4
REM     and every project statement still go through the normal transport.
REM
REM USAGE (from the workspace root):
REM   claim.cmd                     bare `go`   - no lane filter, no sticky lanes
REM   claim.cmd ops                 `go ops`    - hard lane filter
REM   claim.cmd "" ops,docs         bare `go`, sticky-first on ops then docs
REM   claim.cmd ops ops,docs        both
REM
REM Arg 1 = :lane  (hard filter; empty = none)
REM Arg 2 = :lanes (comma-separated lanes finished this session; empty = none)
REM Both are interpolated by psql with :'name' literal quoting - see claim.sql.
REM
REM EXIT CODES: psql's own. 0 = statement ran (which includes UPDATE 0, i.e.
REM "queue empty" - per R2 that means retry once, then stop; it is never licence
REM to invent work). Nonzero = transport failure, and the pass has NOT claimed.
REM ============================================================================

set "LANE=%~1"
set "LANES=%~2"

REM Reject anything but the four known lanes in arg 1. A hard filter that
REM silently matches nothing would look identical to an empty queue.
if not "%LANE%"=="" (
  if not "%LANE%"=="front" if not "%LANE%"=="db" if not "%LANE%"=="docs" if not "%LANE%"=="ops" (
    echo [claim] ERROR: unknown lane "%LANE%" - expected front, db, docs or ops. 1>&2
    exit /b 64
  )
)

"C:\Program Files\PostgreSQL\17\bin\psql.exe" ^
  -h aws-1-us-east-1.pooler.supabase.com ^
  -p 5432 ^
  -U postgres.anxmqiehpyznifqgskzc ^
  -d postgres ^
  -w ^
  -X ^
  -v ON_ERROR_STOP=1 ^
  -v lane="%LANE%" ^
  -v lanes="%LANES%" ^
  -P pager=off ^
  -P expanded=on ^
  -f "%~dp0claim.sql"

exit /b %ERRORLEVEL%
