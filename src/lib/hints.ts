// ═════════════════════════════════════════════════════════════════════
// One-time discoverability hints (Block 20, 2026-07-25). Several Studio
// powers were invisible until stumbled on — the draggable PiP bubble, the
// draggable text overlays. Each hint shows until the Bee performs the
// gesture once, then never again on this browser. localStorage-backed,
// fail-open: if storage is blocked, hints simply show each visit.
// ═════════════════════════════════════════════════════════════════════

const KEY = 'studio_hints_v1';

export type HintId = 'pip_drag' | 'text_drag';

function readSeen(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function hintSeen(id: HintId): boolean {
  return readSeen().includes(id);
}

export function markHintSeen(id: HintId): void {
  try {
    const seen = readSeen();
    if (seen.includes(id)) return;
    seen.push(id);
    localStorage.setItem(KEY, JSON.stringify(seen));
  } catch {
    /* storage blocked — hint will show again; harmless */
  }
}
