; OPS17 — Mission Control palette (TIER-1 FALLBACK)
;
; AutoHotkey v2. Always-on-top spawn palette. NO server, NO database, NO
; network, NO credentials — it only opens Windows Terminal with `claude` in a
; chosen folder. That is deliberate: this is the half that must survive if the
; Node board hits a wall, so it depends on nothing but Windows.
;
; RUN:   "C:\Program Files\AutoHotkey\v2\AutoHotkey64.exe" mission-control.ahk
;        (or just double-click it if .ahk is associated with AHK v2)
;
; HOTKEYS
;   Ctrl+Alt+G   show / hide the palette
;   Ctrl+Alt+1-8 spawn that folder directly, palette or no palette
;   Esc          hide the palette (while it is focused)
;
; The folder list below is intentionally duplicated from
; mission-control.config.json rather than parsed out of it: a fallback that
; needs a JSON parser to start is not a fallback. Keep the two in sync by hand;
; the config file is the source of truth for the Node board.

#Requires AutoHotkey v2.0
#SingleInstance Force

ROOT := "C:\Users\Butch\Documents\HONEYCOMB"

folders := [
    ["TheMANUAL.tech",    ROOT "\TheMANUAL.tech"],
    ["HONEYCOMB (root)",  ROOT],
    ["REBELUTION.org",    ROOT "\REBELUTION.org"],
    ["AtlasORACLE.to",    ROOT "\AtlasORACLE.to"],
    ["TheWORKSHOP.to",    ROOT "\TheWORKSHOP.to"],
    ["REBELUTION.vote",   ROOT "\REBELUTION.vote"],
    ["DingleBERRY.tech",  ROOT "\DingleBERRY.tech"],
    ["FreedomBLiNGS.com", ROOT "\FreedomBLiNGS.com"]
]

SpawnClaude(path, label) {
    if !DirExist(path) {
        TrayTip "Mission Control", "Folder missing:`n" path, 3
        return
    }
    ; wt.exe -d <folder> cmd /k claude
    try {
        Run 'wt.exe -d "' path '" cmd /k claude'
        TrayTip "Mission Control", "Claude opening in " label, 1
    } catch as e {
        ; Windows Terminal absent — fall back to a plain console so the palette
        ; still does its job on a machine without wt.
        try Run A_ComSpec ' /k cd /d "' path '" && claude'
        catch
            TrayTip "Mission Control", "Could not launch a terminal.", 3
    }
}

; ── palette ──────────────────────────────────────────────────────────────────
pal := Gui("+AlwaysOnTop -MinimizeBox", "Mission Control")
pal.BackColor := "0d0f13"
pal.SetFont("s9 cE6EDF7", "Consolas")
pal.Add("Text", "x12 y10 w250 cF5C451", "ADD CLAUDE")
pal.SetFont("s9 c7C879C")
pal.Add("Text", "x12 y+2 w250", "Ctrl+Alt+G toggles  ·  Ctrl+Alt+1-8 direct")
pal.SetFont("s10 cE6EDF7")

for i, f in folders {
    btn := pal.Add("Button", "x12 y+6 w250 h30", "&" i "  " f[1])
    btn.OnEvent("Click", MakeHandler(i))
}

MakeHandler(idx) {
    return (*) => SpawnClaude(folders[idx][2], folders[idx][1])
}

pal.Add("Text", "x12 y+10 w250 c7C879C", "Say `"go`" in the new window to claim.")
palShown := false

TogglePalette(*) {
    global palShown
    if palShown {
        pal.Hide()
        palShown := false
    } else {
        pal.Show("AutoSize")
        palShown := true
    }
}

^!g::TogglePalette()

#HotIf WinActive("Mission Control ahk_class AutoHotkeyGUI")
Esc:: {
    global palShown
    pal.Hide()
    palShown := false
}
#HotIf

pal.OnEvent("Close", (*) => (pal.Hide(), palShown := false))
pal.OnEvent("Escape", (*) => (pal.Hide(), palShown := false))

; ── direct hotkeys, palette-independent ──────────────────────────────────────
^!1::SpawnClaude(folders[1][2], folders[1][1])
^!2::SpawnClaude(folders[2][2], folders[2][1])
^!3::SpawnClaude(folders[3][2], folders[3][1])
^!4::SpawnClaude(folders[4][2], folders[4][1])
^!5::SpawnClaude(folders[5][2], folders[5][1])
^!6::SpawnClaude(folders[6][2], folders[6][1])
^!7::SpawnClaude(folders[7][2], folders[7][1])
^!8::SpawnClaude(folders[8][2], folders[8][1])

TrayTip "Mission Control", "Palette loaded. Ctrl+Alt+G to show.", 1
