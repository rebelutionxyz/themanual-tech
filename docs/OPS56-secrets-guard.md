## OPS56 - PreToolUse secrets guard. DESIGN AND DRAFT ONLY - zero files installed.

Lane `ops`. Workdir `TheMANUAL.tech`. Scope: empty (this file only, per R6). Effort: standard.

**Nothing was installed and nothing was edited.** No file under `~/.claude/`, no settings file, no
hook registered. The only file this pass writes in the workspace is this one. The guard source and
its test harness were written to the session scratchpad
(`%LOCALAPPDATA%\Temp\claude\...\17c479f0-.../scratchpad/`) purely so the test table below reports
**measured results instead of predicted ones**. That is the single deviation from a pure paper
draft, and it is the reason section 5 can say "actual" rather than "expected".

### 0 - THE FINDING RESTATED, CONFIRMED

Confirmed live against both settings files this pass:

- `~/.claude/settings.json` -> `permissions.deny` contains `Read(**/.env*)` and `Read(**/secrets/**)`.
- The same file's `permissions.allow` contains `Bash(cat *)`.
- `TheMANUAL.tech/.claude/settings.local.json` -> `allow` contains `Bash(cat:*)`, plus `head`,
  `tail`, `grep`, `find`, `sed`, `cp`, `node`, `python`.

So `cat .env` is permitted today, and CLAUDE.md's Secrets section names a backstop that does not
backstop. **The permission layer matches on TOOL plus ARGUMENT PATTERN; it has no idea that
`Bash(cat .env)` and `Read(.env)` are the same act.** No pattern added to that layer can close it,
because the deny is written in the vocabulary of verbs and the leak is written in the vocabulary of
paths. Every verb you enumerate leaves the next one open - `head`, `tail`, `less`, `strings`,
`base64`, `awk`, `node -e`, `python -c`, or `cp .env readable.txt` followed by a permitted Read.
That is the synchronise-instead-of-derive antipattern: two lists that must agree, kept by hand.

**The derivation:** decide on the RESOLVED PATH, once, for every tool. One home.

### 1 - WHERE IT LIVES AND HOW IT REGISTERS

| Question | Answer | Why |
|:--|:--|:--|
| Script path | `C:/Users/Butch/.claude/hooks/secrets-guard.mjs` | Outside every repo. `settings.local.json` grants `Write(//c/Users/Butch/Documents/HONEYCOMB/**)`, so a guard living in a repo is a guard the agent can rewrite. `~/.claude/` is outside that grant. |
| Which settings file | `C:/Users/Butch/.claude/settings.json` (USER scope) | Machine-wide. A project-scoped hook protects one repo; the secret set spans `~/.ssh`, `%APPDATA%\postgresql`, and every future repo. Project files are also committable - a guard in git is a guard a PR can weaken. |
| Runtime | `node` (exec form, no shell) | Node is already a hard dependency of this repo. Exec form means no Windows shell-quoting hazard: `"command": "node"`, `"args": ["<abs path>"]`. |
| Matcher | `"*"` | Covers Read, Bash, Edit, Write, every MCP tool (`mcp__server__tool`), and anything added later. This is the "one home" requirement - a matcher of `"Bash|Read"` would have to be maintained, which is the antipattern again. |
| Dependencies | none | No `jq`, no npm. Every dependency is a new way for the guard to fail, and a guard that fails at startup fails OPEN (section 3). |

**What Butch pastes, exactly two things.**

**(a)** Create the file `C:\Users\Butch\.claude\hooks\secrets-guard.mjs` with the source in section 6.

**(b)** In `C:\Users\Butch\.claude\settings.json`, the `"hooks"` key already exists and holds
`"UserPromptSubmit"`. **Add `"PreToolUse"` as a SIBLING key inside that same `"hooks"` object - do
not replace it.** The result reads:

```json
  "hooks": {
    "UserPromptSubmit": [ ...leave exactly as it is... ],
    "PreToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node",
            "args": ["C:/Users/Butch/.claude/hooks/secrets-guard.mjs"],
            "timeout": 10,
            "statusMessage": "secrets guard"
          }
        ]
      }
    ]
  },
```

**Keep the existing `Read(**/.env*)` and `Read(**/secrets/**)` deny entries.** They are now
belt-and-braces, not the primary defence, and they are the only thing standing if the hook fails to
launch (section 3). Do not delete them because the hook exists.

### 2 - PATH RESOLUTION: THE HARD PART, ARGUED

There are two populations of tool call and they need different treatment. Pretending otherwise is
where this kind of guard usually goes wrong.

**2.1 Structured tools (Read, Write, Edit, Glob, Grep, and any MCP tool).** `tool_input` is JSON,
so a path is a named field. The guard walks every string leaf and tests it. Two deliberate
restrictions:

- For the tools whose shape is known, it tests **path fields only** (`file_path`, `path`,
  `notebook_path`, ...), never `content` / `new_string`. **The guard is a read-path guard, not a
  content-exfiltration guard**, and conflating the two makes it useless: this very report contains
  the string `.env` twenty times, and a guard that scanned write bodies would refuse to let me file
  it. Stated plainly as a gap: if a secret is already in context, this hook will not stop it being
  written out. Nothing at the PreToolUse layer can, and claiming otherwise would be the dishonest
  version of this document.
- `sql`, `query`, `prompt`, `description`, `body`, `message` are never scanned. SQL cannot read the
  local filesystem, so scanning it buys nothing and would break the ops rail every time a report
  discusses `.env` - exactly this pass. For tools whose shape is NOT known, every other string leaf
  IS scanned, so a future MCP tool with an unrecognised path field is still caught.

**2.2 Bash. A shell command is not a path, it is a program**, and deciding what a program will open
is undecidable in general. So the guard does not attempt to parse an AST and find "the file
argument". It does something weaker and much more robust:

> **It matches on path TEXT, anywhere in the command, and ignores the verb entirely.**

Normalise (strip `' " \``, which collapses `cat .e''nv` and `cat "$F"`), split on shell
metacharacters including `=` (so `FOO=.env` and `--file=.env` both yield a bare `.env` token), take
each token's basename, test against the secret set. Because the rule never mentions `cat`, the whole
verb-enumeration problem disappears: `head`, `strings`, `base64 .env`, `cp .env /tmp/x`,
`node -e "readFileSync('.env')"` and `cd /etc && cat .env` all carry the literal, all deny.

Two narrow rules cover the obvious ways to write a path without writing a path:

- **Rule G (glob materialisation).** A glob token (`*`, `?`, `[`) given to a **content-reading verb**
  is resolved against the effective directory - `cwd` from the hook payload, updated by any literal
  `cd` earlier in the command - and the directory is listed. If a real file there matches the secret
  set, deny. This closes `cat *` and `cat .*`, the single largest literal-free hole. It is scoped to
  reader verbs so that `ls *` in a directory holding `.env` is still allowed: listing names is not
  leaking contents, and a guard that blocks `ls` gets switched off within a day.
- **Rule V (suspicious variable).** A reader verb given `$SOMETHING` whose NAME matches
  `pass|secret|cred|token|key|envfile|pgpass|dotenv` denies, because the guard cannot resolve the
  value. It does not deny on variables generally - `$TEMP` and `$APPDATA` appear in almost every
  command this workspace runs, and blanket-denying them would make the guard intolerable.

**A material fact that shrinks the variable hole:** this harness's Bash tool does not persist shell
state between calls ("Shell state (env vars, functions) does not persist"). So a variable holding a
secret path must be assigned **inside the same command**, which puts the literal back in the text
the guard reads. `F=.env; cat $F` denies (T-8). The residual hole is variables inherited from the
user's shell profile - a small, enumerable set, which is what Rule V exists for.

**2.3 WHAT IT DOES NOT CATCH. Read this list before trusting the guard.**

1. **A program that computes the path at runtime.** `node leak.js`, where `leak.js` opens `.env`.
   The command carries no secret text. **This is unclosable at the PreToolUse layer** and it is the
   honest ceiling of the whole design. Measured as a miss: T-14.
2. **Escape-encoded literals.** `cat $'\x2eenv'`. Quote-stripping handles `''` and `""`; ANSI-C
   quoting and `\x` escapes are not decoded. Measured as a miss: T-15. Closable by decoding `$'...'`
   if it ever shows up in practice; not closed today, and I would rather list it than pretend.
3. **Variables inherited from the shell profile** whose names dodge Rule V. Measured as a miss: T-7.
4. **Command substitution that names no secret**, e.g. `cat "$(ls -a | grep -i env)"`.
5. **Content already in context.** Section 2.1. Not this hook's job.
6. **Everything outside this Claude Code process** - Cowork runs, other machines, a human paste.

That is a partial defence. It is a large partial: it turns "any of thirty verbs, trivially" into
"you must construct the path indirectly on purpose". The failures above are *deliberate obfuscation*
rather than *the default spelling*, and that is the whole gain on offer here.

### 3 - FAIL CLOSED, AND THE ONE PLACE IT CANNOT

The entire body runs inside `try { main() } catch { DENY }`. Unreadable stdin, malformed JSON, a
regex bug, an unreadable directory in Rule G - all land in the catch, which emits
`permissionDecision: "deny"` and exits 0. Proven, not asserted: **T-31** feeds the guard the bytes
`this is not json` and the guard denies. There is no code path that reaches "allow" without having
completed every check.

**Consequence, stated on purpose:** a bug in this guard halts every tool call in every session until
Butch fixes or removes it. That is the correct trade and it is loud rather than silent. It is also
why the guard has no dependencies and why section 4's install step ends with a self-test.

**The one place it cannot fail closed.** Per the hooks contract, exit code 2 blocks and exit codes
1/3+ are *non-blocking errors - the tool call proceeds*. So if the guard never runs at all - `node`
missing from PATH, the file deleted or renamed, a syntax error before the try block, the hook not
registered, `disableAllHooks`, a timeout - **the tool call is ALLOWED**. No code inside the guard
can close this, by construction: a script that does not execute cannot deny. Three mitigations, all
partial and all honest:

1. Zero dependencies and one file, so there is very little that can prevent launch.
2. The `permissions.deny` entries stay in place, so the naive `Read(.env)` path is still refused
   even with the guard dead.
3. The self-test in section 4 is the only proof the guard is live. Re-run it after any settings edit.

Rejected: a "canary" that fails closed by making some sentinel tool call fail. It would fire on
every session start and be ignored within a week.

### 4 - WHAT THE HUMAN SEES, AND HOW A LEGITIMATE NEED IS SERVED

On a deny, `systemMessage` puts one line in front of Butch:

```
SECRETS GUARD blocked a tool call - name rule ^\.env$ matched ".env".
```

and Claude receives the same text plus: *"There is no override flag. If this file genuinely needs
reading, Butch reads it himself."* That sentence is load-bearing. **There is deliberately no
`--allow-secrets` flag, no `ALLOW_SECRETS=1`, no allowlist file the agent can append to** - any
override an agent can name is an override an agent will use, and the guard would then be a speed
bump with a documented ramp. The override is a human at a different keyboard.

So the legitimate paths are, in order: read `.env.template` (explicitly allowlisted, T-2/T-29);
ask Butch, who opens the file himself and pastes back the *structure*; or, for genuinely
server-side needs, the value goes into Railway or the Supabase dashboard and never touches a local
file - which is already CLAUDE.md's Secrets rule.

**R-SELF.** The guard also refuses write-class tools aimed at `~/.claude/hooks/**` or any
`settings.json` / `settings.local.json` (T-23, T-24). Reads of those files still work (this pass read
both). This encodes "Butch owns every settings change" and closes the obvious move of editing the
guard to permit the thing the guard forbids. **If Butch would rather have Claude edit settings for
him, delete the `SELF_DENY` block** - it is eight lines and marked in the source.

**Install self-test.** After pasting, in a fresh session run `cat .env` from a repo root. Expected:
the block message above. If the file contents appear, the hook is not live - check that the JSON
parses and that `node` resolves.

### 5 - TEST RESULTS (ACTUAL, not expected)

Harness: scratchpad `run-tests.mjs` spawns the guard as a child process, pipes real PreToolUse
payloads on stdin, and classifies stdout. Fixture directory contains a dummy `.env` (`FAKE_KEY=
not-a-real-secret`), a `.env.template`, and `notes.md`. Verbatim output:

```
ok   T-1  Read the real .env                expect=DENY  got=DENY
ok   T-2  Read .env.template                expect=ALLOW got=ALLOW
ok   T-3  cat .env                          expect=DENY  got=DENY
ok   T-4  head shared/credentials           expect=DENY  got=DENY
ok   T-5  cd elsewhere then cat             expect=DENY  got=DENY
ok   T-6  cat $ENVFILE  [bypass]            expect=DENY  got=DENY
ok   T-7  cat $F, F set elsewhere [gap]     expect=ALLOW got=ALLOW
ok   T-8  F=.env; cat $F  [bypass]          expect=DENY  got=DENY
ok   T-9  cat .e''nv  [bypass]              expect=DENY  got=DENY
ok   T-10 cat * over a dir with .env        expect=DENY  got=DENY
ok   T-11 cat * over a clean dir            expect=ALLOW got=ALLOW
ok   T-12 ls * over a dir with .env         expect=ALLOW got=ALLOW
ok   T-13 node -e readFileSync(.env)        expect=DENY  got=DENY
ok   T-14 node leak.js  [gap]               expect=ALLOW got=ALLOW
ok   T-15 cat $'\x2eenv'  [gap]             expect=ALLOW got=ALLOW
ok   T-16 grep -r over ~/.ssh               expect=DENY  got=DENY
ok   T-17 cp .env to a temp path            expect=DENY  got=DENY
ok   T-18 base64 .env                       expect=DENY  got=DENY
ok   T-19 cat pgpass.conf                   expect=DENY  got=DENY
ok   T-20 Write REPORT.md mentioning .env   expect=ALLOW got=ALLOW
ok   T-21 execute_sql body mentions .env    expect=ALLOW got=ALLOW
ok   T-22 unknown MCP tool w/ path arg      expect=DENY  got=DENY
ok   T-23 Edit ~/.claude/settings.json      expect=DENY  got=DENY
ok   T-24 cp over the guard script          expect=DENY  got=DENY
ok   T-25 ordinary build command            expect=ALLOW got=ALLOW
ok   T-26 ordinary git status               expect=ALLOW got=ALLOW
ok   T-27 psql -f a report file             expect=ALLOW got=ALLOW
ok   T-28 Read a normal source file         expect=ALLOW got=ALLOW
ok   T-29 cat .env.template (allowlist)     expect=ALLOW got=ALLOW
ok   T-30 Glob for **/.env                  expect=DENY  got=DENY
ok   T-31 malformed hook input              expect=DENY  got=DENY
       reason: SECRETS GUARD: the guard itself failed (Unexpected token 'h', "this is not json" is
       not valid JSON), so it cannot prove this call is safe. Fail-closed policy: DENY. There is no
       override flag. If this file genuinely needs reading, Butch reads it himself.

31 passed, 0 failed
```

Bypass attempts: T-6, T-8, T-9, T-10, T-13, T-24 (defeated); T-7, T-14, T-15 (**expected to be
misses and recorded as passing BECAUSE they are allowed** - the test asserts the documented gap, it
does not hide it). T-11/T-12/T-20/T-21/T-25..T-29 are the false-positive suite: the guard must stay
out of the way of ordinary work, including this pass's own rail transport (T-27).

### 6 - THE FILE. Paste verbatim to `C:\Users\Butch\.claude\hooks\secrets-guard.mjs`

```javascript
#!/usr/bin/env node
// secrets-guard.mjs - PreToolUse guard. Denies any tool call whose RESOLVED PATH
// touches the secret set. Verb-agnostic: it matches on path text, not on the command.
// No dependencies. Fails CLOSED on any internal error.
// Home: C:/Users/Butch/.claude/hooks/secrets-guard.mjs   (outside every repo, on purpose)

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';

// ---------------------------------------------------------------- decisions
function emitDeny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason:
        'SECRETS GUARD: ' + reason +
        ' There is no override flag. If this file genuinely needs reading, Butch reads it himself.'
    },
    systemMessage: 'SECRETS GUARD blocked a tool call - ' + reason
  }));
  process.exit(0);
}
function emitAllow() { process.exit(0); } // no stdout = normal permission flow

// ---------------------------------------------------------------- secret set
// Matched against the BASENAME of a path-shaped token, case-insensitive.
const NAME_DENY = [
  /^\.env$/i, /^\.env\..+$/i, /^.+\.env$/i,
  /^\.pgpass$/i, /^pgpass\.conf$/i,
  /^id_(rsa|dsa|ecdsa|ed25519)$/i,
  /^.+\.(pem|p12|pfx|key|kdbx|kdb|jks|keystore|ppk)$/i,
  /^credentials(\.json)?$/i, /^service-account.*\.json$/i,
  /^\.netrc$/i, /^_netrc$/i, /^\.npmrc$/i, /^\.pypirc$/i, /^\.git-credentials$/i,
  /bitwarden/i, /^master\.env$/i
];
// Explicit non-secrets that would otherwise match above.
const NAME_ALLOW = [
  /^\.env\.(template|example|sample|schema|dist)$/i,
  /\.pub$/i
];
// Matched against the WHOLE token / whole command, separator-agnostic.
const SEGMENT_DENY = [
  /(^|[\/\\])\.ssh([\/\\]|$)/i,
  /(^|[\/\\])\.aws([\/\\]|$)/i,
  /(^|[\/\\])\.gnupg([\/\\]|$)/i,
  /(^|[\/\\])\.azure([\/\\]|$)/i,
  /(^|[\/\\])gcloud([\/\\]|$)/i,
  /(^|[\/\\])secrets?([\/\\]|$)/i,
  /(^|[\/\\])credentials([\/\\]|$)/i,
  /appdata[\/\\]roaming[\/\\]postgresql/i
];
// R-SELF: the guard and the files that register it are themselves protected.
// DELETE THIS BLOCK (and its two use sites) if Butch wants Claude editing settings.
const SELF_DENY = [
  /[\/\\]\.claude[\/\\]hooks[\/\\]/i,
  /[\/\\]\.claude[\/\\]settings(\.local)?\.json$/i
];
const SELF_WRITE_TOOLS = new Set(['Write', 'Edit', 'NotebookEdit', 'MultiEdit']);
const SELF_WRITE_VERBS = new Set([
  'cp', 'mv', 'rm', 'tee', 'truncate', 'sed', 'chmod', 'attrib', 'del', 'ren', 'move', 'copy'
]);

// Verbs that can put file CONTENT somewhere a model can see it.
const READER_VERBS = new Set([
  'cat', 'head', 'tail', 'less', 'more', 'bat', 'nl', 'type', 'grep', 'egrep', 'fgrep', 'rg',
  'awk', 'gawk', 'sed', 'cut', 'tr', 'sort', 'uniq', 'wc', 'xxd', 'od', 'strings', 'base64',
  'openssl', 'jq', 'yq', 'dd', 'split', 'tee', 'cp', 'mv', 'scp', 'rsync', 'tar', 'zip', '7z',
  'gzip', 'gunzip', 'zcat', 'curl', 'wget', 'node', 'python', 'python3', 'py', 'perl', 'ruby',
  'php', 'pwsh', 'powershell', 'source', '.', 'diff', 'cmp', 'md5sum', 'sha256sum', 'find',
  'xargs', 'printenv', 'env'
]);
const SUSPICIOUS_VAR = /(pass|secret|cred|token|apikey|api_key|\bkey\b|envfile|env_file|pgpass|dotenv)/i;

// ---------------------------------------------------------------- primitives
function baseNameOf(tok) {
  const parts = tok.split(/[\/\\]+/);
  return parts[parts.length - 1] || tok;
}
function isSecretToken(tok) {
  if (!tok) return null;
  const t = tok.replace(/^~/, '').trim();
  if (!t) return null;
  const base = baseNameOf(t);
  for (const re of NAME_ALLOW) if (re.test(base)) return null;
  for (const re of NAME_DENY) if (re.test(base)) return 'name rule ' + re.source + ' matched "' + base + '"';
  for (const re of SEGMENT_DENY) if (re.test(t)) return 'path rule ' + re.source + ' matched "' + t + '"';
  return null;
}
// Quotes are stripped before splitting, so cat .e''nv and cat "$F" both normalise.
function tokenize(s) {
  return String(s).replace(/['"`]/g, '').split(/[\s;|&<>()={},]+/).filter(Boolean);
}
function scanText(s) {
  for (const re of SEGMENT_DENY) if (re.test(String(s))) return 'path rule ' + re.source + ' matched the argument text';
  for (const tok of tokenize(s)) {
    const hit = isSecretToken(tok);
    if (hit) return hit;
  }
  return null;
}

// ---------------------------------------------------------------- Bash path
function subCommands(cmd) {
  return String(cmd).split(/(?:\|\||&&|[;|&\n])+/).map(s => s.trim()).filter(Boolean);
}
function verbOf(sub) {
  const words = sub.replace(/['"`]/g, '').trim().split(/\s+/).filter(Boolean);
  let i = 0;
  while (i < words.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[i])) i++;   // strip FOO=bar prefixes
  if (i >= words.length) return '';
  return baseNameOf(words[i]).replace(/\.exe$/i, '').toLowerCase();
}
// Rule G: a glob argument to a reader verb, in a directory that actually holds a
// secret file, is denied - because the shell would expand onto it.
function globCouldHitSecret(tok, dir) {
  if (!/[*?\[]/.test(tok)) return null;
  let target = dir;
  if (/[\/\\]/.test(tok)) {
    const head = tok.replace(/[^\/\\]*$/, '');
    target = isAbsolute(head) ? head : resolve(dir, head);
  }
  let entries;
  try { entries = readdirSync(target); } catch { return null; }  // unreadable dir: nothing to expand onto
  for (const e of entries) {
    if (isSecretToken(e)) {
      return 'glob "' + tok + '" would expand in a directory holding "' + e + '"; name the file explicitly';
    }
  }
  return null;
}
function checkBash(cmd, cwd) {
  const whole = String(cmd);
  for (const re of SEGMENT_DENY) if (re.test(whole)) emitDeny('path rule ' + re.source + ' matched the command.');
  for (const re of SELF_DENY) {
    if (re.test(whole) && SELF_WRITE_VERBS.has(verbOf(whole))) {
      emitDeny('R-SELF: this command would modify the guard or its registration. Butch owns every settings change.');
    }
  }
  let dir = cwd;
  for (const sub of subCommands(whole)) {
    const verb = verbOf(sub);
    const toks = tokenize(sub);
    for (const tok of toks) {
      const hit = isSecretToken(tok);
      if (hit) emitDeny(hit + '.');
    }
    if (READER_VERBS.has(verb)) {
      for (const tok of toks) {
        const g = globCouldHitSecret(tok, dir);
        if (g) emitDeny(g + '.');
      }
      for (const v of (sub.match(/\$\{?[A-Za-z_][A-Za-z0-9_]*\}?/g) || [])) {
        if (SUSPICIOUS_VAR.test(v)) {
          emitDeny('reader verb "' + verb + '" is given variable ' + v +
                   ', whose name reads as a secret and whose value the guard cannot resolve.');
        }
      }
    }
    if (verb === 'cd' && toks.length > 1) {
      const t = toks[1];
      dir = isAbsolute(t) ? t : resolve(dir, t);
    }
  }
  emitAllow();
}

// ---------------------------------------------------------------- other tools
const KNOWN_TOOLS = new Set(['Read', 'Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'Glob', 'Grep']);
const PATH_FIELDS = new Set([
  'file_path', 'filePath', 'path', 'notebook_path', 'file', 'target_file',
  'source', 'destination', 'dest', 'src', 'output_path', 'paths', 'files', 'url'
]);
// Never scanned: model-authored prose and non-filesystem payloads. Scanning these
// denies writing a report that merely discusses .env, and SQL cannot read local files.
const NEVER_SCAN = new Set([
  'content', 'new_string', 'old_string', 'prompt', 'description', 'body', 'message',
  'text', 'instructions', 'sql', 'query', 'commit_message', 'title'
]);

function walk(node, key, tool, hits) {
  if (node === null || node === undefined) return;
  if (typeof node === 'string') {
    if (NEVER_SCAN.has(key)) return;
    if (KNOWN_TOOLS.has(tool) && !(PATH_FIELDS.has(key) || (tool === 'Glob' && key === 'pattern'))) return;
    const hit = scanText(node);
    if (hit) hits.push(hit);
    return;
  }
  if (Array.isArray(node)) { for (const v of node) walk(v, key, tool, hits); return; }
  if (typeof node === 'object') { for (const k of Object.keys(node)) walk(node[k], k, tool, hits); }
}
function checkStructured(tool, input) {
  const hits = [];
  walk(input, '', tool, hits);
  if (hits.length) emitDeny(hits[0] + '.');
  if (SELF_WRITE_TOOLS.has(tool)) {
    const target = String(input.file_path || input.notebook_path || input.path || '');
    for (const re of SELF_DENY) {
      if (re.test(target)) {
        emitDeny('R-SELF: this would edit the guard or its registration. Butch owns every settings change.');
      }
    }
  }
  emitAllow();
}

// ---------------------------------------------------------------- entry
function main() {
  let payload;
  const raw = readFileSync(0, 'utf8');
  payload = JSON.parse(raw);
  const tool = String(payload.tool_name || '');
  const cwd = String(payload.cwd || process.cwd());
  const input = payload.tool_input || {};
  if (tool === 'Bash') return checkBash(String(input.command || ''), cwd);
  return checkStructured(tool, input);
}

try {
  main();
} catch (err) {
  emitDeny('the guard itself failed (' + ((err && err.message) || 'unknown') +
           '), so it cannot prove this call is safe. Fail-closed policy: DENY.');
}
```

### 7 - COULD NOT VERIFY

- **That the hook fires at all**, that `matcher: "*"` reaches MCP tools in this build, and that a
  deny renders as described. Verifying requires registering the hook, which the dispatch forbids.
  Everything in section 5 tests the guard's LOGIC against hand-built payloads shaped per the
  published PreToolUse contract; it does not test Claude Code's dispatch of it. First real proof is
  the section 4 self-test after Butch pastes.
- **Behaviour under `permission_mode: "bypassPermissions"`.** Hooks are documented to run
  independently of the permission layer, which is the main argument for this design over more deny
  patterns, but I did not confirm that a PreToolUse deny still blocks in bypass mode. Worth one
  explicit check.
- **Timeout behaviour.** The contract states exit codes 1/3+ are non-blocking; it does not state
  what a 10s timeout does. Assumed to fail OPEN and listed as such in section 3. The guard runs in
  milliseconds, so this is theoretical, but it is unconfirmed.
- **False-positive rate in real use.** Twelve representative commands from this workspace pass
  (T-11/12/20/21/25-29). That is a sample, not a survey. The likeliest nuisance is the
  `secrets?` / `credentials` path segments matching a directory that holds no secret.

### 8 - WHO OWNS THE NEXT MOVE

**BUTCH.** Two files to paste (section 1), then the self-test (section 4). Two rulings while he is
in there: keep or delete **R-SELF** (does Claude get to edit settings on his behalf - default in this
draft is NO), and whether `Bash(cat *)` should be narrowed in `~/.claude/settings.json` regardless.
The hook makes that entry survivable; it does not make it a good idea.

