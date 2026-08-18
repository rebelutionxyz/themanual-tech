/* THE COMPOSER — the Anthropic-shape input bar, shared from birth.
 *
 * H24_DESIGN_SPEC v1.0 / ORACLE_MF v1.46, owner: "chat box on the bottom same
 * as anthropic ... just the up arrow not send" and "built once as a shared
 * component; h24 mounts it first; Vote, Justice, and the rest mount it later."
 *
 * So this component knows NOTHING about h24. It is a controlled input with an
 * optional attach button, an optional band picker, an optional secondary
 * selector, an optional feature-detected mic, and an up-arrow submit. Every
 * surface wires its own meaning to those slots. That is the whole point of
 * lifting it here on day one rather than growing it out of OraclePage later.
 *
 * ─── WHAT IS DELIBERATELY ABSENT ────────────────────────────────────────────
 * EFFORT. The spec's composer lists an effort selector "only if it changes a
 * real request parameter; otherwise omit and say so." The h24 router accepts
 * `{ directive, tier, astra_slug, category, confirm_cost }` and NOTHING that
 * carries an effort level — so an effort control would be a decorative select
 * that changes nothing. It is omitted here, and there is no prop for it: adding
 * a dead control to the shared component would spread the lie to every future
 * mount. When a real effort parameter exists, this is where it lands.
 */

import { cn } from '@/lib/utils';
import { ArrowUp, Mic, Plus, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface ComposerAttachment {
  id: string;
  name: string;
  /** Free-form kind label ("image", "doc"…) — shown as a hint, not validated. */
  kind?: string;
}

export interface ComposerBand {
  id: string;
  label: string;
  /** Second line — e.g. the model the band routes to, or its price note. */
  sublabel?: string;
}

export interface ComposerOption {
  id: string;
  label: string;
}

export interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  /** Fires on the up-arrow and on Enter (Shift+Enter inserts a newline). */
  onSubmit: () => void;
  /** True while a request is in flight — disables submit, keeps the field readable. */
  busy?: boolean;
  /** True when the surface cannot accept input at all (e.g. signed out). */
  disabled?: boolean;
  placeholder?: string;

  /** [+] attach. Omitted entirely when `onAttach` is not given. */
  onAttach?: () => void;
  attachments?: ComposerAttachment[];
  onRemoveAttachment?: (id: string) => void;

  /** Model/band picker (tiers-are-bands). Omitted when empty. */
  bands?: ComposerBand[];
  bandId?: string;
  onBandChange?: (id: string) => void;

  /** A second small selector, e.g. h24's directive "kind". Omitted when empty. */
  options?: ComposerOption[];
  optionId?: string;
  onOptionChange?: (id: string) => void;
  optionLabel?: string;

  /** Offer the mic. It STILL only renders if the browser supports speech input. */
  enableMic?: boolean;
}

/** Feature-detect the Web Speech API without tripping over vendor prefixes. */
function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

export function Composer({
  value,
  onChange,
  onSubmit,
  busy = false,
  disabled = false,
  placeholder = 'Type a directive…',
  onAttach,
  attachments = [],
  onRemoveAttachment,
  bands = [],
  bandId,
  onBandChange,
  options = [],
  optionId,
  onOptionChange,
  optionLabel = 'Kind',
  enableMic = false,
}: ComposerProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  // The mic mounts only where speech is actually available. A dead mic never
  // renders — the same real-data-only rule the sidebar sections follow.
  const SpeechCtor = useMemo(() => (enableMic ? getSpeechRecognition() : null), [enableMic]);
  const micAvailable = SpeechCtor !== null;

  // Auto-grow the textarea to its content, capped so a long paste scrolls
  // inside the field rather than shoving the conversation off-screen. `value` is
  // the TRIGGER, not an input read in the body — measuring scrollHeight only
  // makes sense after a value change has laid the new text out, so the linter's
  // "unnecessary dependency" is exactly the dependency that does the work.
  // biome-ignore lint/correctness/useExhaustiveDependencies: value re-runs the resize, by design
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [value]);

  useEffect(() => {
    return () => recRef.current?.stop();
  }, []);

  const canSubmit = !disabled && !busy && value.trim().length > 0;

  function submit() {
    if (!canSubmit) return;
    onSubmit();
  }

  function toggleMic() {
    if (!SpeechCtor) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new SpeechCtor();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0]?.transcript ?? '')
        .join(' ')
        .trim();
      if (text) onChange(value ? `${value} ${text}` : text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  return (
    <div className="rounded-2xl border border-border-bright bg-bg-elevated p-2 focus-within:border-honey/50">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1 pb-2">
          {attachments.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1.5 rounded-md border border-border-bright bg-panel-2 px-2 py-1 text-text-silver"
              style={{ fontSize: '11.5px' }}
            >
              <span className="max-w-[160px] truncate">{a.name}</span>
              {a.kind && <span className="text-text-muted">{a.kind}</span>}
              {onRemoveAttachment && (
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(a.id)}
                  aria-label={`Remove ${a.name}`}
                  className="text-text-muted transition-colors hover:text-text"
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        rows={1}
        disabled={disabled}
        className="w-full resize-none bg-transparent px-2 py-1.5 text-text placeholder:text-text-muted focus:outline-none disabled:opacity-50"
        style={{ fontSize: '14px', maxHeight: '200px' }}
      />

      <div className="flex items-center gap-1.5 px-1 pt-1">
        {onAttach && (
          <button
            type="button"
            onClick={onAttach}
            disabled={disabled}
            aria-label="Attach"
            title="Attach from your library or upload"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-text-silver transition-colors hover:bg-panel-2 hover:text-text disabled:opacity-40"
          >
            <Plus size={18} />
          </button>
        )}

        {bands.length > 0 && (
          <select
            value={bandId}
            onChange={(e) => onBandChange?.(e.target.value)}
            disabled={disabled}
            aria-label="Model"
            title="Model band"
            className="max-w-[150px] rounded-md border border-border-bright bg-panel-2 px-2 py-1 text-text-silver transition-colors hover:text-text disabled:opacity-40"
            style={{ fontSize: '12px' }}
          >
            {bands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
                {b.sublabel ? ` · ${b.sublabel}` : ''}
              </option>
            ))}
          </select>
        )}

        {options.length > 0 && (
          <select
            value={optionId}
            onChange={(e) => onOptionChange?.(e.target.value)}
            disabled={disabled}
            aria-label={optionLabel}
            title={optionLabel}
            className="max-w-[130px] rounded-md border border-border-bright bg-panel-2 px-2 py-1 text-text-silver transition-colors hover:text-text disabled:opacity-40"
            style={{ fontSize: '12px' }}
          >
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        )}

        <div className="flex-1" />

        {micAvailable && (
          <button
            type="button"
            onClick={toggleMic}
            disabled={disabled}
            aria-label={listening ? 'Stop dictation' : 'Dictate'}
            aria-pressed={listening}
            title={listening ? 'Stop dictation' : 'Dictate'}
            className={cn(
              'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40',
              listening
                ? 'bg-honey/20 text-honey'
                : 'text-text-silver hover:bg-panel-2 hover:text-text',
            )}
          >
            <Mic size={16} />
          </button>
        )}

        {/* SEND is the up-arrow, aria-label "Send" — never the word on the
            button, per the ruling. */}
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          aria-label="Send"
          title="Send"
          className={cn(
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors',
            canSubmit
              ? 'bg-honey text-black hover:bg-honey/90'
              : 'cursor-not-allowed bg-panel-2 text-text-muted',
          )}
        >
          <ArrowUp size={18} />
        </button>
      </div>
    </div>
  );
}
