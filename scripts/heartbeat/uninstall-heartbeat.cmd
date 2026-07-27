@echo off
setlocal

REM OPS18 - remove the HONEYCOMB heartbeat scheduled task.
REM Removes ONLY the task. Logs under logs/heartbeat/ and the cost ledger are
REM left alone deliberately: they are the record of what ran unattended, and a
REM tool that erases its own audit trail on uninstall is not a good tool.

set "TASKNAME=HONEYCOMB Heartbeat"

schtasks /Query /TN "%TASKNAME%" >nul 2>&1
if errorlevel 1 (
  echo "%TASKNAME%" is not installed. Nothing to do.
  exit /b 0
)

schtasks /Delete /TN "%TASKNAME%" /F
if errorlevel 1 (
  echo ERROR: delete failed.
  exit /b 1
)

echo Removed "%TASKNAME%".
echo Logs kept at logs\heartbeat\ - delete by hand if you want them gone.
