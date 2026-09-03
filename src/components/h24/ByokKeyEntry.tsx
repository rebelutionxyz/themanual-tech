// H24_BYOK2 — extracted out of OraclePage so the SAME entry UI serves the
// composer's inline panel, the composer's Model-menu Add/Edit action, and the
// /h24/customize management page (H24_BYOK1's original, byte-for-byte —
// masked input, live validation, error surfaced inline, never closes on a
// rejected key).

import type { ByokProvider, ByokSubmitResult } from '@/lib/atlasoracle/byok';
import { PROVIDER_LABEL } from '@/lib/atlasoracle/byok';
import { useState } from 'react';

/** H24_BYOK2 — the one honest limitation carried forward from H24_BYOK1:
 *  Meta has no verified direct API anywhere in this codebase, so a Meta key
 *  gets a format-only check server-side, never a real live validation. */
const FORMAT_CHECK_ONLY: Partial<Record<ByokProvider, true>> = { meta: true };

export function ByokKeyEntry({
  provider,
  onSubmit,
  onSaved,
  onCancel,
}: {
  provider: ByokProvider;
  onSubmit: (raw: string) => Promise<ByokSubmitResult>;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formatCheckOnly = FORMAT_CHECK_ONLY[provider] === true;

  async function handleSave() {
    setBusy(true);
    setError(null);
    const result = await onSubmit(val);
    setBusy(false);
    if (result.valid) {
      setVal('');
      onSaved();
    } else {
      setError(result.error ?? 'Key validation failed.');
    }
  }

  return (
    <div
      className="mt-2 rounded-md p-3"
      style={{
        border: '1px solid var(--hairline, rgba(248,249,250,0.14))',
        background: 'var(--input, #10141b)',
      }}
    >
      <label
        htmlFor={`byok-key-${provider}`}
        className="mb-1 block"
        style={{ color: 'var(--body)', fontSize: 12 }}
      >
        Your {PROVIDER_LABEL[provider]} API key
      </label>
      {formatCheckOnly && (
        <p className="mb-1.5" style={{ color: 'var(--bling-gold)', fontSize: 10.5 }}>
          {PROVIDER_LABEL[provider]} has no verified direct API in h24 yet — this only checks the
          key LOOKS right (format), not that it actually works.
        </p>
      )}
      <input
        id={`byok-key-${provider}`}
        type="password"
        autoComplete="off"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={
          formatCheckOnly
            ? 'Paste your key — format-checked only, used by the router only, never shown or logged'
            : 'Paste your key — validated live, used by the router only, never shown or logged'
        }
        className="w-full rounded-md border border-border-bright bg-panel-2 px-2 py-1.5 text-text focus:outline-none"
        style={{ fontSize: 12.5 }}
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={busy || val.trim().length === 0}
          className="rounded-md px-3 py-1 font-semibold transition-colors disabled:opacity-40"
          style={{ background: 'var(--accent, #ef6c2a)', color: '#000', fontSize: 12 }}
        >
          {busy ? 'Validating…' : 'Save key'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-md px-3 py-1 transition-colors disabled:opacity-40"
          style={{ border: '1px solid var(--line, rgba(248,249,250,0.2))', fontSize: 12 }}
        >
          Cancel
        </button>
      </div>
      {error && (
        <p className="mt-2" style={{ color: 'var(--error)', fontSize: 11.5 }} role="alert">
          {error}
        </p>
      )}
      <p className="mt-2" style={{ color: 'var(--mute)', fontSize: 10.5, lineHeight: 1.5 }}>
        Your key{' '}
        {formatCheckOnly
          ? 'is format-checked, then'
          : 'is validated live against the provider, then'}{' '}
        goes to the routing process only — never into the model, never logged. Routing through it
        lands with AUTOTIER1.
      </p>
    </div>
  );
}
