/* ============================================================
   DingleBERRY — Karma Credit · AI soft-verification (drill-in)
   A "soft pull" on an actor: an AI scores trust live from comb
   signals, computes UNDER ENCRYPTION, surfaces only a band +
   contributing signals, leaves NO mark, and RETAINS NOTHING.
   IIFE-wrapped to keep top-level consts out of global scope.
   ============================================================ */
(function () {
const DS = window.TheLastWordDesignSystem_a9501e || window.TLW;
const { Card, Button, Avatar } = DS;
const Icon = window.TLWIcon;
const { useState, useEffect, useRef } = React;

const MONO = (x = {}) => ({ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', ...x });
const EYEBROW = { fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)' };

/* band palette (on DS tokens) */
const BAND = {
  trusted:  { key: 'trusted',  label: 'Trusted',   c: 'var(--status-sourced)', t: 'var(--status-sourced-tint)', edge: '#1F6F49', icon: 'shieldCheck' },
  watch:    { key: 'watch',    label: 'Watch',     c: 'var(--honey-600)',      t: 'var(--honey-100)',           edge: '#9A6B12', icon: 'eye' },
  highrisk: { key: 'highrisk', label: 'High-risk', c: 'var(--alert-600)',      t: 'var(--alert-100)',           edge: '#9A2A22', icon: 'ban' },
};
const bandFor = (s) => (s >= 70 ? BAND.trusted : s >= 45 ? BAND.watch : BAND.highrisk);

/* signal model — weights sum to 1.00 */
const SIGNALS = [
  { key: 'standing', label: 'Earned standing',          w: 0.24, hint: 'credibility the member has earned on the record' },
  { key: 'conduct',  label: 'On-record conduct',        w: 0.20, hint: 'history of filings, testimony, accepted evidence' },
  { key: 'shill',    label: 'Distance from shill rings', w: 0.22, hint: 'graph distance to known coordinated clusters' },
  { key: 'ledger',   label: 'Ledger integrity',         w: 0.16, hint: 'clean BLiNG! flow — no wash loops or velocity bursts' },
  { key: 'maturity', label: 'Account maturity',         w: 0.10, hint: 'age + sustained, non-bursty activity' },
  { key: 'dispatch', label: 'Dispatch authority record', w: 0.08, hint: 'rank-verified actions vs. failed rank checks' },
];

/* candidate actors with per-signal values (0..1) */
const ACTORS = [
  { id: '@comb-steward', rank: 'Security Guardian · L5', joined: '2y 4m', v: { standing: 0.95, conduct: 0.92, shill: 0.98, ledger: 0.90, maturity: 0.95, dispatch: 0.90 },
    note: 'Long-standing L5 with a clean record across every surface.' },
  { id: '@meshwarden', rank: 'Monitoring Forager · L3', joined: '11m', v: { standing: 0.80, conduct: 0.82, shill: 0.90, ledger: 0.78, maturity: 0.70, dispatch: 0.85 },
    note: 'Active monitor, strong record, mid-tenure.' },
  { id: '@forager-7f3a', rank: 'Forager · L1', joined: '6 days', v: { standing: 0.50, conduct: 0.60, shill: 0.85, ledger: 0.55, maturity: 0.15, dispatch: 0.30 },
    note: 'New account, thin record — nothing adverse, just unproven.' },
  { id: '@upline-0050', rank: 'Bee · unranked', joined: '3w', v: { standing: 0.35, conduct: 0.30, shill: 0.12, ledger: 0.20, maturity: 0.60, dispatch: 0.25 },
    note: 'Sits one hop from affiliate-fraud ring AFFIL-0050.' },
];

const scoreOf = (a) => Math.round(SIGNALS.reduce((s, sig) => s + sig.w * a.v[sig.key], 0) * 100);

/* deterministic short hash for the receipt line */
function hashFor(id, salt) {
  let h = 2166136261;
  const str = id + '|' + salt;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  const hex = (h >>> 0).toString(16).padStart(8, '0');
  return '0x' + hex.slice(0, 4) + '…' + hex.slice(4, 8);
}

const TTL = 30; // seconds a result lives before auto-discard

/* ---- score dial ---- */
function Dial({ score, band, computing }) {
  const R = 52, C = 2 * Math.PI * R;
  const pct = computing ? 0 : score / 100;
  return (
    <div style={{ position: 'relative', width: 132, height: 132, flex: 'none' }}>
      <svg width="132" height="132" viewBox="0 0 132 132">
        <circle cx="66" cy="66" r={R} fill="none" stroke="var(--line)" strokeWidth="9" />
        <circle cx="66" cy="66" r={R} fill="none" stroke={band.c} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - pct)} transform="rotate(-90 66 66)"
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(.4,0,.2,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {computing ? (
          <span style={MONO({ fontSize: 26, fontWeight: 700, color: 'var(--text-faint)' })}>··</span>
        ) : (
          <>
            <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 38, color: band.c, lineHeight: 1 }}>{score}</span>
            <span style={MONO({ fontSize: 8.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', marginTop: 2 })}>/ 100 karma</span>
          </>
        )}
      </div>
    </div>
  );
}

/* ---- one signal row ---- */
function SignalRow({ sig, val, band, computing }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-strong)' }}>{sig.label}</span>
          <span style={MONO({ fontSize: 9.5, color: 'var(--text-faint)' })}>w {sig.w.toFixed(2)}</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{sig.hint}</div>
      </div>
      <div style={{ flex: 'none', width: 132 }}>
        <div style={{ height: 7, borderRadius: 99, background: 'var(--paper-100)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 99, background: computing ? 'var(--line-strong)' : band.c,
            width: computing ? '100%' : (val * 100) + '%',
            opacity: computing ? 0.5 : 1,
            transition: 'width 0.8s cubic-bezier(.4,0,.2,1)',
            backgroundImage: computing ? 'repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(255,255,255,0.6) 4px, rgba(255,255,255,0.6) 8px)' : 'none' }} />
        </div>
      </div>
      <span style={MONO({ fontSize: 12, fontWeight: 700, width: 40, textAlign: 'right', color: computing ? 'var(--text-faint)' : 'var(--text-strong)' })}>
        {computing ? '••••' : Math.round(val * 100)}
      </span>
    </div>
  );
}

/* ---- privacy guarantee item ---- */
function Guard({ icon, title, sub }) {
  return (
    <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
      <div style={{ width: 30, height: 30, flex: 'none', borderRadius: 'var(--radius-xs)', background: 'rgba(184,144,47,0.16)', border: '1px solid rgba(184,144,47,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={15} style={{ color: 'var(--gold-400)' }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 12.5, color: '#fff', lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontSize: 11.5, color: '#9DB0C4', lineHeight: 1.35, marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

function KarmaCredit() {
  const [selId, setSelId] = useState(ACTORS[0].id);
  const [phase, setPhase] = useState('idle'); // idle | computing | result
  const [ttl, setTtl] = useState(TTL);
  const [salt, setSalt] = useState(0);
  const [log, setLog] = useState([
    { id: '@meshwarden', band: BAND.trusted, score: 82, t: '6m', hash: hashFor('@meshwarden', 91) },
    { id: '@forager-7f3a', band: BAND.watch, score: 55, t: '22m', hash: hashFor('@forager-7f3a', 44) },
    { id: '@upline-0050', band: BAND.highrisk, score: 28, t: '41m', hash: hashFor('@upline-0050', 12) },
  ]);
  const timers = useRef([]);

  const actor = ACTORS.find((a) => a.id === selId);
  const score = scoreOf(actor);
  const band = bandFor(score);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => clearTimers, []);

  const discard = (toLog) => {
    clearTimers();
    if (toLog) setLog((L) => [{ id: actor.id, band, score, t: 'now', hash: hashFor(actor.id, salt) }, ...L].slice(0, 6));
    setPhase('idle');
    setTtl(TTL);
  };

  const run = () => {
    clearTimers();
    const s = salt + 1; setSalt(s);
    setPhase('computing'); setTtl(TTL);
    timers.current.push(setTimeout(() => setPhase('result'), 1700));
  };

  // ephemeral countdown
  useEffect(() => {
    if (phase !== 'result') return;
    if (ttl <= 0) { discard(true); return; }
    const id = setTimeout(() => setTtl((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, ttl]);

  // reset when switching actor
  const pick = (id) => { clearTimers(); setSelId(id); setPhase('idle'); setTtl(TTL); };

  const computing = phase === 'computing';
  const showResult = phase === 'result' || computing;

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: '22px 26px 40px' }}>
      {/* ---- header ---- */}
      <Card padding="lg" style={{ marginBottom: 18, background: 'var(--navy-900)', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ width: 54, height: 54, flex: 'none', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, var(--gold-400), var(--gold-600))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="scale" size={26} style={{ color: 'var(--navy-900)' }} />
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={MONO({ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--gold-400)', marginBottom: 5 })}>AI soft-verification · encrypted · ephemeral</div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--size-title-l)', fontWeight: 700, color: '#fff', lineHeight: 1, margin: '0 0 5px' }}>Karma Credit</h1>
            <div style={{ fontSize: 14, color: '#C7D4E2', maxWidth: 560 }}>A soft pull on any actor — like a soft credit check. The model scores trust live from comb signals, <b style={{ color: '#fff' }}>computes under encryption</b>, returns a band, and <b style={{ color: '#fff' }}>retains nothing</b>. It leaves no mark and doesn’t touch the member’s standing.</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[['lock', 'Encrypted'], ['clock', 'Ephemeral'], ['check', 'No mark left'], ['scale', 'Soft pull']].map(([ic, c]) => (
              <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: '#E8EEF4', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 'var(--radius-pill)', padding: '5px 11px' }}>
                <Icon name={ic} size={12} style={{ color: 'var(--gold-400)' }} /> {c}
              </span>
            ))}
          </div>
        </div>
      </Card>

      <div className="cc-grid" style={{ alignItems: 'start' }}>
        {/* ---- main column ---- */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* actor picker */}
          <Card padding="none" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 9 }}>
              <Icon name="fingerprint" size={16} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text-strong)' }}>Run a soft pull on…</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, padding: 14 }}>
              {ACTORS.map((a) => {
                const sel = a.id === selId;
                return (
                  <button key={a.id} onClick={() => pick(a.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 11, textAlign: 'left', cursor: 'pointer', font: 'inherit',
                    padding: '11px 12px', borderRadius: 'var(--radius-sm)', background: sel ? 'var(--navy-100)' : 'var(--white)',
                    border: sel ? '1.5px solid var(--navy-700)' : '1px solid var(--line)',
                  }}>
                    <Avatar name={a.id.replace('@', '')} size="md" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={MONO({ fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>{a.id}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.rank}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* result / compute card */}
          <Card padding="lg">
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap', marginBottom: 16 }}>
              <Avatar name={actor.id.replace('@', '')} size="lg" ring={!computing && band.key === 'trusted'} />
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={MONO({ fontSize: 14, fontWeight: 700, color: 'var(--text-strong)' })}>{actor.id}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{actor.rank} · joined {actor.joined}</div>
              </div>
              {!showResult && (
                <Button variant="primary" size="lg" iconLeft={<Icon name="sparkle" size={16} />} onClick={run}>Run soft pull</Button>
              )}
            </div>

            {!showResult ? (
              <div style={{ border: '1px dashed var(--line-strong)', borderRadius: 'var(--radius-sm)', padding: '26px 18px', textAlign: 'center', background: 'var(--paper-50)' }}>
                <Icon name="lock" size={22} style={{ color: 'var(--text-faint)' }} />
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, color: 'var(--text-muted)', marginTop: 8 }}>No pull running.</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-faint)', maxWidth: 420, margin: '4px auto 0' }}>The pull runs over encrypted signals and is discarded the moment you’re done. Nothing about {actor.id} is written or kept.</div>
              </div>
            ) : (
              <>
                {/* verdict strip */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', padding: '16px 18px', borderRadius: 'var(--radius-sm)', background: computing ? 'var(--paper-50)' : band.t, border: `1px solid ${computing ? 'var(--line)' : band.c}`, borderLeft: `var(--bw-frame) solid ${computing ? 'var(--line-strong)' : band.c}` }}>
                  <Dial score={score} band={band} computing={computing} />
                  <div style={{ flex: 1, minWidth: 200 }}>
                    {computing ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <Icon name="lock" size={16} style={{ color: 'var(--text-muted)' }} />
                          <span style={MONO({ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' })}>Computing under encryption…</span>
                        </div>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, color: 'var(--text-faint)' }}>Scoring sealed signals</div>
                        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>Inputs stay encrypted in compute — never decrypted to a readable record, never written to disk.</div>
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 11px', borderRadius: 'var(--radius-pill)', background: band.c }}>
                            <Icon name={band.icon} size={14} style={{ color: '#fff' }} />
                            <span style={MONO({ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff' })}>{band.label}</span>
                          </span>
                          <span style={MONO({ fontSize: 10.5, color: 'var(--text-faint)' })}>soft pull · {hashFor(actor.id, salt)}</span>
                        </div>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', lineHeight: 1.15 }}>
                          {band.key === 'trusted' ? 'Clear to proceed.' : band.key === 'watch' ? 'Proceed with a second eye.' : 'Hold — escalate before acting.'}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-body)', marginTop: 4 }}>{actor.note}</div>
                      </>
                    )}
                  </div>
                </div>

                {/* ephemeral countdown */}
                {!computing && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, padding: '9px 14px', borderRadius: 'var(--radius-xs)', background: 'var(--paper-50)', border: '1px solid var(--line)' }}>
                    <Icon name="clock" size={15} style={{ color: 'var(--gold-700)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={MONO({ fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' })}>Ephemeral — auto-discards, retains nothing</span>
                        <span style={MONO({ fontSize: 11, fontWeight: 700, color: 'var(--gold-700)' })}>{ttl}s</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 99, background: 'var(--line)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'var(--gold-600)', width: (ttl / TTL * 100) + '%', transition: 'width 1s linear' }} />
                      </div>
                    </div>
                    <button onClick={() => discard(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, font: 'inherit', fontFamily: 'var(--font-text)', fontWeight: 600, fontSize: 12, color: 'var(--text-muted)', background: 'var(--white)', border: '1px solid var(--line-strong)', borderRadius: 'var(--radius-xs)', padding: '5px 11px', cursor: 'pointer' }}>
                      <Icon name="x" size={12} /> Discard now
                    </button>
                  </div>
                )}

                {/* signal breakdown */}
                <div style={{ marginTop: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
                    <span style={EYEBROW}>What moved the score</span>
                    <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                    <span style={MONO({ fontSize: 10, color: 'var(--text-faint)' })}>weighted · 0–100</span>
                  </div>
                  {SIGNALS.map((sig) => <SignalRow key={sig.key} sig={sig} val={actor.v[sig.key]} band={band} computing={computing} />)}
                </div>

                {/* footer actions */}
                {!computing && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                    <Button variant="secondary" size="sm" iconLeft={<Icon name="activity" size={14} />} onClick={run}>Re-run (fresh compute)</Button>
                    <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>Nothing is cached — a re-run re-derives from live signals.</span>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>

        {/* ---- right rail ---- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 0 }}>
          {/* privacy guarantees */}
          <Card padding="lg" style={{ background: 'var(--navy-900)', border: 'none' }}>
            <div style={{ ...EYEBROW, color: 'var(--gold-400)', marginBottom: 14 }}>The guarantee</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Guard icon="lock" title="Encrypted end to end" sub="Signals are sealed in flight and stay encrypted through compute — never decrypted into a readable record." />
              <Guard icon="clock" title="Ephemeral by design" sub="The result lives in-session only and auto-discards. No score, no inputs, no log row is persisted." />
              <Guard icon="check" title="No mark on the member" sub="A soft pull leaves no hard inquiry. The member isn’t notified and isn’t penalized." />
              <Guard icon="scale" title="Standing untouched" sub="Karma Credit reads standing; it never writes it. A pull can’t move anyone’s rank." />
            </div>
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.10)' }}>
              <div style={MONO({ fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7E93A9', marginBottom: 8 })}>We never keep</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['the score', 'the raw signals', 'the inputs', 'who you pulled'].map((x) => (
                  <span key={x} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: '#C7D4E2', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 'var(--radius-pill)', padding: '3px 9px' }}>
                    <Icon name="ban" size={11} style={{ color: 'var(--alert-400, #E08A82)' }} /> {x}
                  </span>
                ))}
              </div>
            </div>
          </Card>

          {/* session-only history */}
          <Card padding="none" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 15px', borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text-strong)' }}>This session’s pulls</span>
              <span style={{ flex: 1 }} />
              <span style={MONO({ fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-faint)' })}>discarded</span>
            </div>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {log.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', border: '1px solid var(--line)', borderLeft: `var(--bw-frame) solid ${r.band.c}`, borderRadius: 'var(--radius-sm)', background: 'var(--white)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={MONO({ fontSize: 12, fontWeight: 700, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>{r.id}</div>
                    <div style={MONO({ fontSize: 9.5, color: 'var(--text-faint)' })}>{r.hash} · result purged</div>
                  </div>
                  <span style={MONO({ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: r.band.c, background: r.band.t, borderRadius: 'var(--radius-pill)', padding: '2px 8px' })}>{r.band.label}</span>
                  <span style={MONO({ fontSize: 10, color: 'var(--text-faint)', width: 30, textAlign: 'right' })}>{r.t}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '0 14px 13px', fontSize: 11, color: 'var(--text-faint)', lineHeight: 1.4 }}>
              Only the band and a salted hash survive — enough to show a pull happened, never enough to reconstruct it. Cleared on sign-out.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

window.DB_KarmaCredit = KarmaCredit;
})();
