<#
  OPS22 — focus-window.ps1
  Bring a just-spawned terminal window to the front of the browser that owns the
  foreground.

  WHY THIS FILE EXISTS
    Mission Control's spawn button runs in the browser. The browser is the
    foreground process; the Node server is not, and neither is the Windows
    Terminal it launches. Windows' foreground lock refuses a foreground change
    from a process that did not receive the last input event — so the new
    terminal opens BEHIND the browser and only flashes its taskbar button. That
    is the OS working as documented, not a bug in the spawn.

  TWO MODES
    -Snapshot        Print the handles of every candidate top-level window that
                     exists RIGHT NOW, and exit. The server calls this BEFORE
                     launching the terminal.
    (activate)       Given that snapshot as -Exclude, find the window that
                     appeared since, and bring it forward.

  WHY A HANDLE SNAPSHOT AND NOT THE SPAWNED PID — the finding that cost the time
    The obvious approach is "activate the window owned by the process that just
    appeared." It does not work for Windows Terminal. WT is a multi-window,
    single-process application: `wt -w new` creates a new WINDOW hosted by the
    WindowsTerminal.exe that is ALREADY RUNNING. Measured here: a spawn produced
    three fresh pids (an OpenConsole pty host and the shell), none of which owned
    a window, while the window itself belonged to a WindowsTerminal.exe that
    predated the click by hours. wt.exe is itself only a stub that exits at once,
    so its pid is no help either.

    Diffing WINDOW HANDLES is immune to all of that — it does not care which
    process ends up hosting the window, so it works for Windows Terminal, for the
    cmd.exe/conhost fallback, and for whatever ships next. The pid and title are
    kept as preference hints for the case where more than one window appears
    during the same second.

  THE LADDER — first rung that works wins, and the caller is told which
      rung 1  attach   AttachThreadInput to the foreground thread, then
                       SetForegroundWindow. Sharing an input queue is what makes
                       our thread eligible under the foreground rules; this is
                       the technique launchers and window managers on Windows
                       have always used (it is what AutoHotkey's WinActivate does
                       internally). Full win: in front AND focused.
      rung 2  raise    Topmost flip — SetWindowPos HWND_TOPMOST then
                       HWND_NOTOPMOST — plus a SetForegroundWindow try.
                       Non-destructive; guarantees Z-ORDER even when focus is
                       refused.
      rung 3  restore  Minimize then restore. Genuinely works where the others
                       lose, but the window visibly flickers and the minimize can
                       hand foreground to whatever it exposed, so it sits LAST
                       among the focus rungs rather than first.
      rung 4  flash    FlashWindowEx(FLASHW_ALL | FLASHW_TIMERNOFG). The API
                       Microsoft provides for exactly this situation: you may not
                       take focus, so ask for attention until the user acts. Also
                       fires whenever rungs 1-3 raised the window but could not
                       focus it, so a partial win still leaves a visible cue.

    A second finding worth keeping: AttachThreadInput fails outright unless BOTH
    threads have a message queue, and a console PowerShell thread has none until
    something forces one into existence. Without the PeekMessage primer in
    EnsureMessageQueue(), rung 1 failed every single time and the ladder fell
    through to the flickery minimize/restore. With it, rung 1 wins.

  WHAT IT DOES NOT DO
    No input synthesis — no key or click injection, which is the line between
    "activate a window" and a focus-stealing hack. No global hooks, no residual
    process, no system-wide setting changed (notably it does NOT touch
    SPI_SETFOREGROUNDLOCKTIMEOUT, which would leave every app on the machine free
    to steal focus if this script died mid-run). It touches one window and exits,
    and only ever in response to a deliberate button click.

  OUTPUT
    Exactly one line of compact JSON on stdout. Exit code is 0 whenever the
    script ran to completion, including when no rung took foreground — "could not
    focus" is a result, not a crash.

  USAGE
    powershell -NoProfile -ExecutionPolicy Bypass -File focus-window.ps1 -Snapshot
    powershell -NoProfile -ExecutionPolicy Bypass -File focus-window.ps1 `
               -Exclude "65900,132422" [-Pids "1234,5678"] [-Title "MC repo"] `
               [-TimeoutMs 4000] [-NoFlash]
#>

[CmdletBinding()]
param(
  # Print current candidate window handles and exit.
  [switch] $Snapshot,
  # Comma-separated window handles that already existed before the spawn.
  [string] $Exclude = '',
  # Comma-separated pids observed during the spawn. A hint, not a requirement —
  # see the header: for Windows Terminal the window's owner is usually NOT here.
  [string] $Pids = '',
  # Expected window title. Also only a hint; the shell may rewrite it.
  [string] $Title = '',
  # How long to wait for a new window to appear.
  [int] $TimeoutMs = 4000,
  # Suppress the taskbar flash fallback (rung 4).
  [switch] $NoFlash
)

$ErrorActionPreference = 'Stop'

function Emit([hashtable] $o) {
  [Console]::Out.WriteLine((ConvertTo-Json $o -Compress))
}

Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

namespace MissionControl {
  public static class Fg {
    private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")] private static extern bool EnumWindows(EnumWindowsProc cb, IntPtr p);
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] private static extern IntPtr GetWindow(IntPtr h, uint cmd);
    [DllImport("user32.dll")] private static extern int GetWindowTextLength(IntPtr h);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
    [DllImport("user32.dll")] private static extern bool FlashWindowEx(ref FLASHWINFO fw);
    [DllImport("user32.dll")] private static extern bool PeekMessage(out MSG m, IntPtr h, uint min, uint max, uint remove);

    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
    [DllImport("user32.dll", SetLastError = true)] public static extern bool AttachThreadInput(uint from, uint to, bool attach);
    [DllImport("user32.dll")] public static extern bool AllowSetForegroundWindow(int pid);
    [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);
    [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();

    [StructLayout(LayoutKind.Sequential)]
    private struct FLASHWINFO {
      public uint cbSize; public IntPtr hwnd; public uint dwFlags; public uint uCount; public uint dwTimeout;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MSG {
      public IntPtr hwnd; public uint message; public IntPtr wParam; public IntPtr lParam;
      public uint time; public int ptX; public int ptY;
    }

    private const uint GW_OWNER         = 4;
    private const int  SW_RESTORE       = 9;
    private const int  SW_MINIMIZE      = 6;
    private const int  SW_SHOW          = 5;
    private const uint SWP_NOSIZE       = 0x0001;
    private const uint SWP_NOMOVE       = 0x0002;
    private const int  ASFW_ANY         = -1;
    private const uint PM_NOREMOVE      = 0;
    private const uint FLASHW_ALL       = 0x00000003;
    private const uint FLASHW_TIMERNOFG = 0x0000000C;
    private static readonly IntPtr HWND_TOPMOST   = new IntPtr(-1);
    private static readonly IntPtr HWND_NOTOPMOST = new IntPtr(-2);

    public static string LastAttachDiag = "";

    public static int PidOf(IntPtr h) { uint p; GetWindowThreadProcessId(h, out p); return (int)p; }

    public static string TitleOf(IntPtr h) {
      int n = GetWindowTextLength(h);
      if (n <= 0) return "";
      StringBuilder sb = new StringBuilder(n + 1);
      GetWindowText(h, sb, sb.Capacity);
      return sb.ToString();
    }

    // Candidate = a real top-level application window: visible, unowned, titled.
    // Windows Terminal builds its frame before it has a title, so the title test
    // is what stops us grabbing a half-constructed window.
    // Returned as "hwnd|pid|title" so PowerShell does the selection in plain
    // sight rather than inside the marshalled layer.
    public static string[] List() {
      List<string> rows = new List<string>();
      EnumWindows(delegate(IntPtr h, IntPtr l) {
        if (!IsWindowVisible(h)) return true;
        if (GetWindow(h, GW_OWNER) != IntPtr.Zero) return true;
        if (GetWindowTextLength(h) <= 0) return true;
        rows.Add(h.ToInt64().ToString() + "|" + PidOf(h).ToString() + "|" + TitleOf(h));
        return true;
      }, IntPtr.Zero);
      return rows.ToArray();
    }

    // AttachThreadInput fails if EITHER thread lacks a message queue, and a
    // console host thread has none until it asks USER32 for something that
    // creates one. PM_NOREMOVE reads nothing; it exists purely for the side
    // effect of the queue coming into being.
    private static void EnsureMessageQueue() {
      MSG m;
      PeekMessage(out m, IntPtr.Zero, 0, 0, PM_NOREMOVE);
    }

    // Rung 1.
    public static bool Attach(IntPtr h) {
      EnsureMessageQueue();
      uint ignored;
      uint fgThread = GetWindowThreadProcessId(GetForegroundWindow(), out ignored);
      uint ourThread = GetCurrentThreadId();
      bool attached = false;
      try {
        if (fgThread != 0 && fgThread != ourThread) {
          attached = AttachThreadInput(ourThread, fgThread, true);
          LastAttachDiag = attached ? "attached" : ("AttachThreadInput failed, err " + Marshal.GetLastWin32Error());
        } else {
          LastAttachDiag = "no attach needed";
        }
        AllowSetForegroundWindow(ASFW_ANY);   // no-op unless we already hold the right; cheap
        if (IsIconic(h)) ShowWindow(h, SW_RESTORE);
        BringWindowToTop(h);
        SetForegroundWindow(h);
        ShowWindow(h, SW_SHOW);
      } finally {
        if (attached) AttachThreadInput(ourThread, fgThread, false);
      }
      return GetForegroundWindow() == h;
    }

    // Rung 2. Z-order is guaranteed; the return value reports whether FOCUS
    // followed, so the caller can distinguish "in front" from "in front and
    // typing goes here".
    public static bool Raise(IntPtr h) {
      if (IsIconic(h)) ShowWindow(h, SW_RESTORE);
      SetWindowPos(h, HWND_TOPMOST,   0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE);
      SetWindowPos(h, HWND_NOTOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE);
      SetForegroundWindow(h);
      return GetForegroundWindow() == h;
    }

    // Rung 3.
    public static bool Restore(IntPtr h) {
      ShowWindow(h, SW_MINIMIZE);
      ShowWindow(h, SW_RESTORE);
      SetForegroundWindow(h);
      return GetForegroundWindow() == h;
    }

    // Rung 4.
    public static void Flash(IntPtr h) {
      FLASHWINFO fw = new FLASHWINFO();
      fw.cbSize = (uint)Marshal.SizeOf(typeof(FLASHWINFO));
      fw.hwnd = h;
      fw.dwFlags = FLASHW_ALL | FLASHW_TIMERNOFG;   // flash until the user activates it
      fw.uCount = 0;
      fw.dwTimeout = 0;
      FlashWindowEx(ref fw);
    }

    public static bool HasFocus(IntPtr h) { return GetForegroundWindow() == h; }
  }
}
'@

function Get-Candidates {
  $out = @()
  foreach ($row in [MissionControl.Fg]::List()) {
    $parts = $row.Split('|', 3)
    $out += [pscustomobject]@{
      Hwnd  = [int64]$parts[0]
      Pid   = [int]$parts[1]
      Title = $parts[2]
    }
  }
  return $out
}

# ── snapshot mode ───────────────────────────────────────────────────────────
if ($Snapshot) {
  $handles = @(Get-Candidates | ForEach-Object { $_.Hwnd.ToString() })
  Emit @{ ok = $true; mode = 'snapshot'; hwnds = $handles; count = $handles.Count }
  exit 0
}

# ── activate mode ───────────────────────────────────────────────────────────
$excluded = New-Object 'System.Collections.Generic.HashSet[string]'
foreach ($h in ($Exclude -split ',')) {
  $t = $h.Trim(); if ($t) { [void]$excluded.Add($t) }
}
$wantPids = New-Object 'System.Collections.Generic.HashSet[int]'
foreach ($p in ($Pids -split ',')) {
  $t = $p.Trim(); if ($t -match '^\d+$') { [void]$wantPids.Add([int]$t) }
}

$before   = [MissionControl.Fg]::GetForegroundWindow()
$deadline = (Get-Date).AddMilliseconds($TimeoutMs)
$target   = $null
$how      = ''

while ($true) {
  # Windows that did not exist when the server took its pre-spawn snapshot.
  $fresh = @(Get-Candidates | Where-Object { -not $excluded.Contains($_.Hwnd.ToString()) })

  if ($fresh.Count -gt 0) {
    # Preference order, most specific first. With one new window — the normal
    # case — all three land on the same object; the hints only matter when the
    # machine happened to open something else in the same second.
    $byPid = @($fresh | Where-Object { $wantPids.Contains($_.Pid) })
    if ($byPid.Count -gt 0) { $target = $byPid[0]; $how = 'new window, pid hint' }
    elseif ($Title -and @($fresh | Where-Object { $_.Title -like "*$Title*" }).Count -gt 0) {
      $target = @($fresh | Where-Object { $_.Title -like "*$Title*" })[0]; $how = 'new window, title hint'
    }
    else { $target = $fresh[0]; $how = 'new window' }
    break
  }

  if ((Get-Date) -ge $deadline) { break }
  Start-Sleep -Milliseconds 120
}

if ($null -eq $target) {
  Emit @{
    ok = $false; rung = 'none'; focused = $false; raised = $false; flashed = $false
    reason = "no new top-level window appeared within ${TimeoutMs}ms"
  }
  exit 0
}

$hwnd = [IntPtr]$target.Hwnd

# Already in front — the lock did not bite this time. Touch nothing.
if ([MissionControl.Fg]::HasFocus($hwnd)) {
  Emit @{ ok = $true; rung = 'already'; focused = $true; raised = $true; flashed = $false
          pid = $target.Pid; title = $target.Title; how = $how
          wasForeground = $before.ToString() }
  exit 0
}

# The ladder. Order is deliberate: cheapest and least visually disruptive first,
# with the flickery minimize/restore below the non-destructive raise.
$rung = 'none'; $focused = $false; $raised = $false

if ([MissionControl.Fg]::Attach($hwnd)) {
  $rung = 'attach'; $focused = $true; $raised = $true
}
elseif ([MissionControl.Fg]::Raise($hwnd)) {
  $rung = 'raise'; $focused = $true; $raised = $true
}
elseif ([MissionControl.Fg]::Restore($hwnd)) {
  $rung = 'restore'; $focused = $true; $raised = $true
}
else {
  # Every focus rung lost, but Raise already put the window at the top of the
  # Z-order — it IS in front, it just does not own the keyboard.
  $raised = $true; $focused = $false; $rung = 'raise-nofocus'
}

$flashed = $false
if (-not $focused -and -not $NoFlash) {
  [MissionControl.Fg]::Flash($hwnd)
  $flashed = $true
  if ($rung -eq 'raise-nofocus') { $rung = 'raise+flash' }
}

Emit @{
  ok            = $raised
  rung          = $rung
  focused       = $focused
  raised        = $raised
  flashed       = $flashed
  pid           = $target.Pid
  title         = $target.Title
  how           = $how
  wasForeground = $before.ToString()
  attachDiag    = [MissionControl.Fg]::LastAttachDiag
}
exit 0
