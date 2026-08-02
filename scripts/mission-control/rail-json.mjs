// FRONT19 - line-oriented JSON parsing for rail reads, with PER-ROW fail-soft.
//
// WHY THIS EXISTS AS ITS OWN FILE
//   OPS43's rule is that one bad byte must not blank a panel. The board read
//   satisfied that PER SECTION: a poisoned section is dropped and the other two
//   still draw. That granularity is too coarse for the reports list, which is
//   one section holding 174 independent rows - losing all of them because one
//   title is unrenderable is the same failure at a larger scale.
//
//   So the reports read does NOT ask psql for one json_agg array. It asks for
//   `row_to_json(r)` and gets ONE JSON OBJECT PER LINE. row_to_json escapes
//   newlines inside values as \n, so a line boundary is a row boundary with no
//   exceptions - that is what makes per-line parsing safe rather than a guess.
//   Each line is then parsed on its own, and a line that will not parse becomes
//   a MARKED row instead of an exception that takes the other 173 with it.
//
//   Kept in a separate module purely so it can be tested without starting the
//   server: importing server.mjs binds a port.
//
// ASCII ONLY in this file, like the SQL it serves. See server.mjs assertAscii().

// A row that could not be parsed. Rendered by the panel as a visible warning in
// its own row - never dropped, because a silently shorter list is a lie about
// how many reports exist.
export const BAD_ROW = '__bad';

// Parses psql `-A -t` stdout where each line is one row_to_json object.
//
// Returns { rows, bad } where `rows` preserves the server's ordering and any
// unparseable entry is { __bad: true, error, raw } instead of a row. `bad` is
// the count, so a caller can report degradation without re-scanning.
export function parseJsonLines(stdout) {
  const rows = [];
  let bad = 0;
  for (const raw of String(stdout ?? '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;                 // psql emits a trailing newline
    try {
      const v = JSON.parse(line);
      // A JSON scalar where an object was expected is corruption too - a null
      // or a bare number would render as an empty row and read as a real one.
      if (v === null || typeof v !== 'object' || Array.isArray(v)) {
        throw new Error('row is not a JSON object');
      }
      rows.push(v);
    } catch (e) {
      bad += 1;
      rows.push({
        [BAD_ROW]: true,
        error: e.message,
        // Bounded: a corrupt line could be the whole 185KB body. Enough to
        // recognise the row, never enough to flood the page.
        raw: line.slice(0, 160),
      });
    }
  }
  return { rows, bad };
}

// Deliberate corruption for the fail-soft done-test, off unless MC_FAULT_INJECT
// names this stream. It exists because the alternative way to prove per-row
// degradation is writing a broken row to ops_reports, and R7 forbids that
// write - the rail is append-only and not a test fixture.
export function injectFault(stdout, active) {
  if (!active) return stdout;
  const lines = String(stdout ?? '').split('\n');
  const target = lines.findIndex((l, i) => i >= 2 && l.trim());
  if (target === -1) return stdout;
  lines[target] = lines[target].slice(0, Math.max(8, lines[target].length >> 1));
  return lines.join('\n');
}
