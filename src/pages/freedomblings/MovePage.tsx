import { BMark, HeroMark } from '@/components/freedomblings/marks';
import { useAuth } from '@/lib/auth';
import { fmtBling, toMicros } from '@/lib/freedomblings/ledger';
import { type Recipient, resolveRecipient, useGive } from '@/lib/freedomblings/move';
/* FreedomBLiNGS — Give · Get · Offer (the move-value composer).
   GIVE is LIVE: the first write surface, wrapping the prod RPC bling_send via
   useGive(). GET and OFFER are honest tabs — they say plainly when they arrive
   (Request / Escrow slices), matching the inert ".soon" treatment elsewhere; no
   fake controls, no buy/sell/pay language. Amounts are mono + tabular and obey
   the Sacred-Sum string discipline (BigInt micros, never Number()'d). The +/-
   stays ink-toned — no casino red/green — like LedgerRow. */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// deferred → Sep build — GET/OFFER hidden for the July 4 beta (GIVE-only).
// type Mode = 'give' | 'get' | 'offer';

const MIN_MICROS = 100_000n; // 0.1 BLiNG!
const AMOUNT_RE = /^\d{1,18}(\.\d{1,6})?$/;

/** Valid positive amount → micro-units; null when malformed or zero. */
function parseAmount(s: string): bigint | null {
  const t = s.trim();
  if (!AMOUNT_RE.test(t)) return null;
  const micros = toMicros(t);
  return micros > 0n ? micros : null;
}

function GiveComposer() {
  const { user } = useAuth();
  const give = useGive();

  const [recipientInput, setRecipientInput] = useState('');
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [resolving, setResolving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  // Resolve the recipient handle (debounced) as the Bee types.
  useEffect(() => {
    const raw = recipientInput.trim();
    if (!raw) {
      setRecipient(null);
      setNotFound(false);
      setResolving(false);
      return;
    }
    setResolving(true);
    let alive = true;
    const t = setTimeout(async () => {
      const r = await resolveRecipient(raw);
      if (!alive) return;
      setRecipient(r);
      setNotFound(!r);
      setResolving(false);
    }, 350);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [recipientInput]);

  const amtMicros = parseAmount(amount);
  const belowMin = amtMicros !== null && amtMicros < MIN_MICROS;
  const isSelf = Boolean(recipient && user && recipient.id === user.id);
  const canGive =
    !!recipient &&
    !isSelf &&
    amtMicros !== null &&
    amtMicros >= MIN_MICROS &&
    give.status !== 'sending';

  // ----- success confirmation -----
  if (give.status === 'done' && give.result) {
    const sent = amtMicros ? fmtBling(amtMicros) : amount.trim();
    return (
      <div className="card composer">
        <div className="comp-success">
          <HeroMark />
          <div>
            <h2>GIVEn — fee-free.</h2>
            <p>
              <b>{sent} BLiNG!</b> reached <b>{recipient?.display}</b>. The whole amount moved —
              nothing was taken in between.
            </p>
            {give.result.senderBalanceAfter && (
              <div className="comp-balance num">
                Your balance now {fmtBling(toMicros(give.result.senderBalanceAfter))} BLiNG!
              </div>
            )}
          </div>
        </div>
        <div className="comp-success-actions">
          <button
            type="button"
            className="give-btn"
            onClick={() => {
              give.reset();
              setRecipientInput('');
              setRecipient(null);
              setAmount('');
              setNote('');
            }}
          >
            GIVE again
          </button>
          <Link className="comp-link" to="/freedomblings/ledger">
            See it in The Ledger →
          </Link>
        </div>
      </div>
    );
  }

  // ----- composer -----
  return (
    <div className="card composer">
      <div className="comp-field">
        <label className="comp-label" htmlFor="give-to">
          To
        </label>
        <input
          id="give-to"
          className="comp-input"
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="@handle of the member"
          value={recipientInput}
          onChange={(e) => setRecipientInput(e.target.value)}
        />
        {recipient && (
          <div className="recipient-chip">
            <div className="avatar sm">
              {recipient.display.replace(/^@/, '').charAt(0).toUpperCase() || 'B'}
            </div>
            <div>
              <div className="rc-name">{recipient.display}</div>
              <div className="rc-handle">@{recipient.handle}</div>
            </div>
            {isSelf && <span className="rc-warn">That's you</span>}
          </div>
        )}
        {resolving && <div className="comp-hint">Looking up member…</div>}
        {notFound && !resolving && (
          <div className="comp-hint err">No member found with that handle.</div>
        )}
      </div>

      <div className="comp-field">
        <label className="comp-label" htmlFor="give-amt">
          Amount
        </label>
        <div className="comp-amount">
          <BMark fill />
          <input
            id="give-amt"
            className="comp-amount-in num"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <span className="comp-unit">BLiNG!</span>
        </div>
        {belowMin && <div className="comp-hint err">The minimum GIVE is 0.1 BLiNG!.</div>}
      </div>

      <div className="comp-field">
        <label className="comp-label" htmlFor="give-note">
          Note <span className="comp-opt">— optional</span>
        </label>
        <input
          id="give-note"
          className="comp-input"
          type="text"
          autoComplete="off"
          placeholder="What's this for?"
          value={note}
          maxLength={280}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {/* Fee-free info box removed 2026-07-16 (Butch) — matches the SEND popup. */}
      {give.status === 'error' && give.error && <div className="comp-error">{give.error}</div>}

      <button
        type="button"
        className="give-btn"
        disabled={!canGive}
        onClick={() => {
          if (!recipient || amtMicros === null) return;
          give.give({ recipientId: recipient.id, amount: amount.trim(), memo: note });
        }}
      >
        <BMark fill />
        {give.status === 'sending'
          ? 'GIVING…'
          : amtMicros && amtMicros >= MIN_MICROS && recipient && !isSelf
            ? `GIVE ${fmtBling(amtMicros)} to ${recipient.display}`
            : 'GIVE'}
      </button>
    </div>
  );
}

// deferred → Sep build — used only by the hidden GET panel.
// function SoonPanel({ title, body }: { title: string; body: string }) {
//   return (
//     <div className="card composer comp-soon">
//       <span className="live-dot" />
//       <div>
//         <h2>{title}</h2>
//         <p>{body}</p>
//       </div>
//     </div>
//   );
// }

export function MovePage() {
  const { user, loading } = useAuth();
  // Beta scope: GIVE-only. GET/OFFER tabs deferred → Sep build, so no tab state.

  return (
    <main className="app-main">
      <div className="eyebrow">Move value · the Sovereign Ledger</div>
      {/* triad name (Give · Get · Offer) restored in Sep */}
      <h1 className="move-h1">Give</h1>
      <div className="move-sub">
        Send BLiNG! to another member, fee-free. The whole amount moves — member to member.
      </div>

      {/* deferred → Sep build — GET + OFFER tabs hidden for the July 4 beta. GIVE is
          the only live action, so the tab bar is dropped (no lone tab).
      <div className="move-tabs" role="tablist" aria-label="Move value">
        <button type="button" role="tab" aria-selected={mode === 'give'}
          className={`move-tab${mode === 'give' ? ' active' : ''}`} onClick={() => setMode('give')}>GIVE</button>
        <button type="button" role="tab" aria-selected={mode === 'get'}
          className={`move-tab${mode === 'get' ? ' active' : ''}`} onClick={() => setMode('get')}>GET</button>
        <button type="button" role="tab" aria-selected={mode === 'offer'}
          className={`move-tab${mode === 'offer' ? ' active' : ''}`} onClick={() => setMode('offer')}>OFFER</button>
      </div> */}

      {loading ? (
        <div className="feed-empty">
          <span className="live-dot" /> Opening the composer…
        </div>
      ) : !user ? (
        <div className="state-card">
          <h2>Sign in to GIVE</h2>
          <p>
            GIVING moves BLiNG! from your ledger to another member's, fee-free. Sign in to send.
          </p>
          <a className="signin" href="/login">
            <BMark fill /> Sign in
          </a>
        </div>
      ) : (
        <GiveComposer />
      )}

      {/* deferred → Sep build — GET (Request) panel
      <SoonPanel title="Request — arrives next"
        body="Ask another member to GIVE you BLiNG! for something you've offered. The Request flow opens in the next slice." /> */}

      {/* deferred → Sep build — OFFER panel (Escrow pointer + Entertheprize affordance)
      <div className="card composer">
        <p className="offer-lead">
          OFFER a good or service in the marketplace — and when a deal needs trust, BLiNG! rests
          in escrow until it's complete.
        </p>
        <div className="offer-points">
          <Link className="offer-point" to="/freedomblings/escrow">
            <span className="op-mark" />
            <div className="op-main">
              <div className="op-k">Escrow</div>
              <div className="op-d">Holds BLiNG! in trust until both sides are satisfied, then releases — whole, never a fee.</div>
            </div>
            <span className="op-go" aria-hidden="true">›</span>
          </Link>
          <div className="offer-point soon">
            <span className="op-mark" />
            <div className="op-main">
              <div className="op-k">Entertheprize · the marketplace</div>
              <div className="op-d">Where OFFERs live. A separate Astra — arrives at launch.</div>
            </div>
            <span className="op-soon">At launch</span>
          </div>
        </div>
      </div> */}
    </main>
  );
}
