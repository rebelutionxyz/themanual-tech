@echo off
setlocal

REM ============================================================================
REM OPS18 - install the HONEYCOMB heartbeat as a Windows scheduled task
REM ============================================================================
REM CREATES THE TASK **DISABLED**. That is not a nicety - the dispatch requires
REM Butch to enable it deliberately and watch the first supervised run. This
REM script will not enable it, and neither should anything else automatically.
REM
REM Usage:   install-heartbeat.cmd [minutes]     (default 30)
REM Example: install-heartbeat.cmd 60
REM ============================================================================

set "TASKNAME=HONEYCOMB Heartbeat"
set "HERE=%~dp0"
set "RUNNER=%HERE%heartbeat.cmd"

set "EVERY=%~1"
if "%EVERY%"=="" set "EVERY=30"

if not exist "%RUNNER%" (
  echo ERROR: cannot find %RUNNER%
  exit /b 1
)

echo Installing "%TASKNAME%" - every %EVERY% minutes - DISABLED.
echo Runner: %RUNNER%
echo.

REM /RL LIMITED = run with the user's normal rights, NOT elevated. A heartbeat
REM has no business holding admin. /F overwrites a previous definition so this
REM script is re-runnable.
schtasks /Create ^
  /TN "%TASKNAME%" ^
  /TR "cmd /c \"\"%RUNNER%\"\"" ^
  /SC MINUTE ^
  /MO %EVERY% ^
  /RL LIMITED ^
  /F

if errorlevel 1 (
  echo.
  echo ERROR: task creation failed.
  exit /b 1
)

REM Immediately disable. Between /Create and /Change the task exists in an
REM enabled state; /SC MINUTE will not fire within that window, but if you are
REM reading this and worried about the gap, that instinct is correct - the
REM ordering is a limitation of schtasks, not a design choice.
schtasks /Change /TN "%TASKNAME%" /DISABLE
if errorlevel 1 (
  echo.
  echo WARNING: created but COULD NOT DISABLE. Disable it by hand NOW:
  echo    schtasks /Change /TN "%TASKNAME%" /DISABLE
  exit /b 2
)

echo.
echo Installed and DISABLED. Verify:
echo    schtasks /Query /TN "%TASKNAME%" /V /FO LIST
echo.
echo BEFORE ENABLING, read the README. The allow-list precondition (C3) is
echo real: without a psql entry in ~/.claude/settings.json this heartbeat
echo claims nothing and silently does no work.
echo.
echo Windows will NOT run a disabled task, so a supervised single run means
echo briefly enabling it. Re-disable IMMEDIATELY - do not wait for the run,
echo /Run launches a separate process:
echo    schtasks /Change /TN "%TASKNAME%" /ENABLE
echo    schtasks /Run    /TN "%TASKNAME%"
echo    schtasks /Change /TN "%TASKNAME%" /DISABLE
echo.
echo Enable the schedule for real (Butch's deliberate act):
echo    schtasks /Change /TN "%TASKNAME%" /ENABLE
