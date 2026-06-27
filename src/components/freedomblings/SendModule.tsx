import { BMark, HeroMark } from '@/components/freedomblings/marks';
import { useAuth } from '@/lib/auth';
import { fmtBling, toMicros } from '@/lib/freedomblings/ledger';
import { type Recipient, resolveRecipient, useGive } from '@/lib/freedomblings/move';
import { useEffect, useState } from 'react';

/* FreedomBLiNGS — SEND (vertical transfer module). The BLiNG! popup's action.
   A conserving peer transfer wrapping the prod RPC bling_send via useGive(),
   with p_category='transfer'. Same string discipline as the move composer
   (amount passed as a string, never Number()'d). SEND, not GIVE. */

/* Brown popup palette — MIRRORS BlingPopupContent.tsx so SEND reads on the
   dark-brown popup surface instead of the light freedomblings paper tokens.
   Same hex values/roles as the popup: espresso bg, raised panel, cream text,
   muted secondary, gold accent. No new palette is invented here. */
const PANEL = '#342216'; // raised card surface (popup tiles)
const SUNKEN = '#26170E'; // espresso — recessed input fill (popup BG)
const BORDER = '#4a331e';
const CREAM = '#F3E7D8';
const MUTED = '#C2A98F';
const GOLD = '#FAD15E';
const RED = '#E58A7B';
const BTN_INK = '#3a2a10'; // dark text on the gold button (popup's Sign-in button)

const MIN_MICROS = 100_000n; // 0.1 BLiNG!
const AMOUNT_RE = /^\d{1,18}(\.\d{1,6})?$/;

function parseAmount(s: string): bigint | null {
  const t = s.trim();
  if (!AMOUNT_RE.test(t)) return null;
  const micros = toMicros(t);
  return micros > 0n ? micros : null;
}

const cardStyle = { background: PANEL, border: `1px solid ${BORDER}` };
const inputStyle = { background: SUNKEN, border: `1px solid ${BORDER}`, color: CREAM };

export function SendModule() {
  const { user } = useAuth();
  const send = useGive();

  const [recipientInput, setRecipientInput] = useState('');
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [resolving, setResolving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  // Resolve the recipient handle (debounced).
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
  const canSend =
    !!recipient &&
    !isSelf &&
    amtMicros !== null &&
    amtMicros >= MIN_MICROS &&
    send.status !== 'sending';

  // ----- success -----
  if (send.status === 'done' && send.result) {
    const sent = amtMicros ? fmtBling(amtMicros) : amount.trim();
    return (
      <div className="rounded-2xl p-4" style={cardStyle}>
        <div className="flex items-start gap-4">
          <HeroMark />
          <div>
            <h2 className="font-display text-[20px] font-semibold" style={{ color: CREAM }}>
              SENT — fee-free.
            </h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed" style={{ color: MUTED }}>
              <b style={{ color: CREAM }}>{sent} BLiNG!</b> reached{' '}
              <b style={{ color: CREAM }}>{recipient?.display}</b>. The whole amount moved — nothing
              was taken in between.
            </p>
            {send.result.senderBalanceAfter && (
              <div className="mt-2 text-[12px] tabular-nums" style={{ color: MUTED }}>
                Your balance now {fmtBling(toMicros(send.result.senderBalanceAfter))} BLiNG!
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2.5 rounded-xl px-4 py-3 text-[14px] font-semibold"
            style={{ background: GOLD, color: BTN_INK }}
            onClick={() => {
              send.reset();
              setRecipientInput('');
              setRecipient(null);
              setAmount('');
              setNote('');
            }}
          >
            SEND again
          </button>
        </div>
      </div>
    );
  }

  // ----- composer (vertical) -----
  return (
    <div className="flex flex-col gap-4 rounded-2xl p-4" style={cardStyle}>
      <div className="flex flex-col gap-2">
        <label
          className="font-mono text-[10.5px] uppercase tracking-wider"
          style={{ color: MUTED }}
          htmlFor="send-to"
        >
          To
        </label>
        <input
          id="send-to"
          className="w-full rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-[#FAD15E]"
          style={inputStyle}
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="@handle of the member"
          value={recipientInput}
          onChange={(e) => setRecipientInput(e.target.value)}
        />
        {recipient && (
          <div
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
            style={{ background: SUNKEN, border: `1px solid ${BORDER}` }}
          >
            <div
              className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[10px] font-semibold"
              style={{ background: BORDER, color: GOLD }}
            >
              {recipient.display.replace(/^@/, '').charAt(0).toUpperCase() || 'B'}
            </div>
            <div>
              <div className="text-[13px] font-semibold leading-tight" style={{ color: CREAM }}>
                {recipient.display}
              </div>
              <div className="font-mono text-[11px]" style={{ color: MUTED }}>
                @{recipient.handle}
              </div>
            </div>
            {isSelf && (
              <span
                className="ml-auto text-[10px] font-bold uppercase tracking-wider"
                style={{ color: GOLD }}
              >
                That's you
              </span>
            )}
          </div>
        )}
        {resolving && (
          <div className="text-[11.5px]" style={{ color: MUTED }}>
            Looking up member…
          </div>
        )}
        {notFound && !resolving && (
          <div className="text-[11.5px]" style={{ color: RED }}>
            No member found with that handle.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label
          className="font-mono text-[10.5px] uppercase tracking-wider"
          style={{ color: MUTED }}
          htmlFor="send-amt"
        >
          Amount
        </label>
        <div
          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 focus-within:border-[#FAD15E]"
          style={inputStyle}
        >
          <BMark fill />
          <input
            id="send-amt"
            className="min-w-0 flex-1 border-0 bg-transparent font-mono text-[24px] font-medium tabular-nums outline-none"
            style={{ color: CREAM }}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <span className="flex-none text-[12px]" style={{ color: MUTED }}>
            BLiNG!
          </span>
        </div>
        {belowMin && (
          <div className="text-[11.5px]" style={{ color: RED }}>
            The minimum SEND is 0.1 BLiNG!.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label
          className="font-mono text-[10.5px] uppercase tracking-wider"
          style={{ color: MUTED }}
          htmlFor="send-note"
        >
          Note <span className="lowercase tracking-normal">— optional</span>
        </label>
        <input
          id="send-note"
          className="w-full rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-[#FAD15E]"
          style={inputStyle}
          type="text"
          autoComplete="off"
          placeholder="What's this for?"
          value={note}
          maxLength={280}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div
        className="flex items-start gap-2.5 rounded-2xl px-4 py-3 text-[12.5px] leading-relaxed"
        style={{ background: SUNKEN, border: `1px dashed ${BORDER}`, color: MUTED }}
      >
        <BMark />
        <span>
          <b style={{ color: CREAM }}>Fee-free.</b>{' '}
          {amtMicros && amtMicros >= MIN_MICROS && recipient && !isSelf ? (
            <>
              The whole <b style={{ color: CREAM }}>{fmtBling(amtMicros)} BLiNG!</b> reaches{' '}
              <b style={{ color: CREAM }}>{recipient.display}</b> — nothing is taken in between.
            </>
          ) : (
            <>The whole amount moves — no cut, no fee, ever.</>
          )}
        </span>
      </div>

      {send.status === 'error' && send.error && (
        <div
          className="rounded-xl px-3.5 py-2.5 text-[12.5px] leading-snug"
          style={{ background: SUNKEN, border: `1px solid ${RED}`, color: CREAM }}
        >
          {send.error}
        </div>
      )}

      <button
        type="button"
        className="inline-flex items-center justify-center gap-2.5 rounded-xl px-4 py-3 text-[14px] font-semibold disabled:cursor-not-allowed disabled:opacity-40"
        style={{ background: GOLD, color: BTN_INK }}
        disabled={!canSend}
        onClick={() => {
          if (!recipient || amtMicros === null) return;
          send.give({
            recipientId: recipient.id,
            amount: amount.trim(),
            memo: note,
            category: 'transfer',
          });
        }}
      >
        <BMark fill />
        {send.status === 'sending'
          ? 'SENDING…'
          : amtMicros && amtMicros >= MIN_MICROS && recipient && !isSelf
            ? `SEND ${fmtBling(amtMicros)} to ${recipient.display}`
            : 'SEND'}
      </button>
    </div>
  );
}
