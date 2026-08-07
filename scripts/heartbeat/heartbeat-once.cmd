@echo off
setlocal EnableDelayedExpansion

REM ============================================================================
REM OPS81 - MANUAL TRIGGER: run exactly ONE heartbeat cycle, on demand.
REM ============================================================================
REM WHY THIS EXISTS. The scheduled task is installed DISABLED and stays that way,
REM and Windows refuses `schtasks /Run` on a disabled task outright (README:
REM "You cannot manually run a disabled task"). The documented workaround is to
REM enable-run-disable, which opens a real, if brief, window in which the SCHEDULE
REM can fire. This file removes that window: Task Scheduler is not involved at all.
REM
REM WHAT IT IS NOT. It does not enable, modify, arm, or query the scheduled task.
REM It contains no `schtasks` call of any kind. Running this leaves the task
REM exactly as disabled as it found it.
REM
REM ONE SOURCE OF TRUTH. It does NOT re-implement the `claude -p` invocation - it
REM calls heartbeat.cmd. The safety posture (no --bare / no bypassPermissions /
REM dontAsk / --max-turns) is defined in exactly one place, so this trigger cannot
REM drift away from what the scheduled task runs. That drift is the whole risk a
REM second entrypoint introduces, and the only defence is to not have a second
REM invocation to drift.
REM
REM   heartbeat-once.cmd              show what a cycle would do; run NOTHING
REM   heartbeat-once.cmd run          run exactly one cycle
REM   heartbeat-once.cmd run probe-push   one cycle + the OPS19 push-park probe
REM
REM The bare form is deliberately inert. A cycle is not a probe: it wakes an
REM unattended Claude session that CLAIMS the top queued dispatch and WORKS it -
REM real file writes, real rail writes, and on 2026-08-01 a real production
REM migration. A trigger that fires on a stray double-click is the wrong shape for
REM that. Typing `run` is the confirmation.
REM ============================================================================

set "HBDIR=%~dp0"
set "WORKROOT=C:\Users\Butch\Documents\HONEYCOMB"
set "LOGDIR=%WORKROOT%\logs\heartbeat"
set "MODE=%~1"
set "PASSTHRU=%~2"

if /I not "%MODE%"=="run" (
  echo.
  echo   HONEYCOMB heartbeat - MANUAL TRIGGER ^(nothing has run^)
  echo.
  echo   ONE CYCLE = one unattended Claude Code session at %WORKROOT%
  echo   It says "go", CLAIMS the highest-priority queued dispatch, and WORKS it
  echo   to completion under --permission-mode dontAsk with a 40-turn cap.
  echo.
  echo   It therefore writes:
  echo     - ops_dispatches   claim, then status=done         [production rail]
  echo     - ops_reports      one INSERT, the full report      [production rail]
  echo     - whatever the claimed dispatch tells it to write   [UNBOUNDED]
  echo     - logs\heartbeat\hb-^<stamp^>.json / .err.txt / cost-ledger.csv
  echo.
  echo   Observed range over 7 logged cycles: 14-54 turns, $0.58-$3.59 per cycle.
  echo.
  echo   To actually run one cycle:      heartbeat-once.cmd run
  echo   With the OPS19 push probe:      heartbeat-once.cmd run probe-push
  echo.
  exit /b 2
)

echo [heartbeat-once] starting ONE cycle at %DATE% %TIME%
if not "%PASSTHRU%"=="" echo [heartbeat-once] passthrough arg: %PASSTHRU%
echo [heartbeat-once] the scheduled task is not touched by this run.
echo.

call "%HBDIR%heartbeat.cmd" %PASSTHRU%
set "RC=%ERRORLEVEL%"

echo.
echo [heartbeat-once] wrapper exit code: !RC!

REM Newest payload wins. heartbeat.cmd stamps its own filename, so reading the
REM most recent one back is simpler and less fragile than trying to predict it.
set "NEWJSON="
for /f "delims=" %%F in ('dir /b /o-d "%LOGDIR%\hb-*.json" 2^>nul') do (
  if not defined NEWJSON set "NEWJSON=%LOGDIR%\%%F"
)

if not defined NEWJSON (
  echo [heartbeat-once] no hb-*.json found in %LOGDIR% - the cycle produced no payload.
  exit /b !RC!
)

set "NEWERR=!NEWJSON:.json=.err.txt!"
echo.
node "%HBDIR%show-cycle.mjs" "!NEWJSON!" "!NEWERR!"

echo.
echo [heartbeat-once] payload: !NEWJSON!
echo [heartbeat-once] cost ledger tail:
for /f "delims=" %%L in ('type "%LOGDIR%\cost-ledger.csv" 2^>nul') do set "LASTCOST=%%L"
if defined LASTCOST echo   !LASTCOST!

exit /b !RC!
