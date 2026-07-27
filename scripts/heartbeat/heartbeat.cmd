@echo off
setlocal EnableDelayedExpansion

REM ============================================================================
REM OPS18 - HONEYCOMB headless heartbeat wrapper
REM ============================================================================
REM Built strictly to docs/experiments-headless-cloud-gonogo-2026-07-27.md
REM (sha256 b62f9b23c4032dae...), the binding DOCS5 verdict. Constraint numbers
REM below refer to that document's section 1.3.
REM
REM   C1  NO --bare. CLAUDE.md carries the entire Terminal Protocol; a --bare
REM       run wakes up not knowing what "go" means. The doc also warns --bare
REM       may BECOME the -p default in a future release, which would silently
REM       strip the protocol from this heartbeat. If that lands, this wrapper
REM       must gain an explicit opt-out flag and the Claude Code version must
REM       be pinned. Nothing here can detect that day arriving - a human must.
REM   C2  NO bypassPermissions / --dangerously-skip-permissions. It would repeal
REM       the push ask, which canon says is permanent.
REM   C3  dontAsk can only run what permissions.allow already covers. If the
REM       allow-list does not cover psql, this heartbeat claims nothing and is
REM       a silent no-op. See README - this is a PRECONDITION, not a detail.
REM
REM dontAsk = auto-deny anything that would prompt, session CONTINUES.
REM That is parking, not aborting. acceptEdits aborts and is forbidden here.
REM ============================================================================

set "WORKROOT=C:\Users\Butch\Documents\HONEYCOMB"
set "LOGDIR=%WORKROOT%\logs\heartbeat"
set "MAXTURNS=40"

if not exist "%LOGDIR%" mkdir "%LOGDIR%"

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value 2^>nul') do set "DT=%%I"
set "STAMP=%DT:~0,8%-%DT:~8,6%"
set "OUT=%LOGDIR%\hb-%STAMP%.json"
set "ERRLOG=%LOGDIR%\hb-%STAMP%.err.txt"

cd /d "%WORKROOT%"
if errorlevel 1 (
  echo [heartbeat] FATAL: cannot cd to %WORKROOT% >> "%ERRLOG%"
  exit /b 90
)

REM The prompt is "go" plus a marker so unattended work stays distinguishable
REM in ops_reports forever. R3 puts the LANE in ops_reports.terminal, so the
REM marker PREFIXES the lane rather than replacing it - lane information is
REM not sacrificed to get provenance.
set "PROMPT=go"
set "PROMPT=%PROMPT% (HEARTBEAT RUN - unattended, scheduled, no human is watching."
set "PROMPT=%PROMPT% When you file your report under R3, set ops_reports.terminal to 'HB:<lane>'"
set "PROMPT=%PROMPT% instead of '<lane>' so attended and unattended work stay distinguishable."
set "PROMPT=%PROMPT% Everything else about the protocol is unchanged. If a call is auto-denied,"
set "PROMPT=%PROMPT% that is expected: log it to logs/permission-needed.md, park it, and carry on.)"

call claude -p "%PROMPT%" ^
  --permission-mode dontAsk ^
  --output-format json ^
  --max-turns %MAXTURNS% ^
  1> "%OUT%" 2> "%ERRLOG%"

set "RC=%ERRORLEVEL%"

REM ---- exit-code triage -------------------------------------------------------
REM 0    clean finish
REM 143  SIGTERM - Task Scheduler kill-on-timeout. Survivable and DETECTABLE,
REM      but it kills mid-pass, so any claimed dispatch stays 'claimed' and
REM      needs the R2b abandon statement run by hand. Not self-healing.
REM else --max-turns exits with an ERROR, so a nonzero code here is ambiguous
REM      between "runaway guard fired" and "crashed". The log tells them apart.
if "%RC%"=="0" (
  echo [heartbeat] %STAMP% ok
) else if "%RC%"=="143" (
  echo [heartbeat] %STAMP% SIGTERM/timeout - a claimed dispatch may need manual release >> "%ERRLOG%"
) else (
  echo [heartbeat] %STAMP% exit %RC% - max-turns guard or crash, see %OUT% >> "%ERRLOG%"
)

REM Cost per invocation is machine-readable; append it to a running ledger so
REM spend is visible without opening the usage dashboard.
if exist "%OUT%" (
  node "%~dp0log-cost.mjs" "%OUT%" "%LOGDIR%\cost-ledger.csv" "%STAMP%" "%RC%" 2>> "%ERRLOG%"
)

exit /b %RC%
