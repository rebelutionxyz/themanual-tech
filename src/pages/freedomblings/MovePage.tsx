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

type Mode = 'give' | 'get' | 'offer';

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

      <div className="comp-summary">
        <BMark />
        <span>
          <b>Fee-free.</b>{' '}
          {amtMicros && amtMicros >= MIN_MICROS && recipient && !isSelf ? (
            <>
              The whole <b>{fmtBling(amtMicros)} BLiNG!</b> reaches <b>{recipient.display}</b> —
              nothing is taken in between.
            </>
          ) : (
            <>The whole amount moves — no cut, no fee, ever.</>
          )}
        </span>
      </div>

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

function SoonPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="card composer comp-soon">
      <span className="live-dot" />
      <div>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
    </div>
  );
}

export function MovePage() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>('give');

  return (
    <main className="app-main">
      <div className="eyebrow">Move value · the Sovereign Ledger</div>
      <h1 className="move-h1">Give · Get · Offer</h1>
      <div className="move-sub">
        Send BLiNG! to another member, fee-free. The whole amount moves — member to member, in the
        open.
      </div>

      <div className="move-tabs" role="tablist" aria-label="Move value">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'give'}
          className={`move-tab${mode === 'give' ? ' active' : ''}`}
          onClick={() => setMode('give')}
        >
          GIVE
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'get'}
          className={`move-tab${mode === 'get' ? ' active' : ''}`}
          onClick={() => setMode('get')}
        >
          GET
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'offer'}
          className={`move-tab${mode === 'offer' ? ' active' : ''}`}
          onClick={() => setMode('offer')}
        >
          OFFER
        </button>
      </div>

      {mode === 'give' &&
        (loading ? (
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
        ))}

      {mode === 'get' && (
        <SoonPanel
          title="Request — arrives next"
          body="Ask another member to GIVE you BLiNG! for something you've offered. The Request flow opens in the next slice."
        />
      )}

      {mode === 'offer' && (
        <SoonPanel
          title="Held in escrow — opens with the Escrow slice"
          body="OFFER places BLiNG! into escrow until both sides are satisfied — then it releases. This wires to escrow when that slice lands."
        />
      )}
    </main>
  );
}
