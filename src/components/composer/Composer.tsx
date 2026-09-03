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
 * ─── EFFORT (COMPOSER v1.1, owner ruling 2026-08-22) ────────────────────────
 * EFFORT is now a slot, but a CONDITIONAL one. The earlier build omitted it
 * because Auto routes effort for you and a standing dial changed nothing. The
 * owner ruling keeps that truth — Auto shows NO dial ever — and adds one case:
 * when a Bee manually picks a specific model, an Effort chip appears beside it
 * (low / medium / high[default] / max). The shared component stays honest by
 * making the slot OPT-IN exactly like the others: a surface passes effort props
 * ONLY in the states where effort means something, and the control renders only
 * then. It is never a standing dead select.
 *
 * WIRING STATUS: the deployed h24 router accepts only
 * `{ directive, tier, category, astra_slug, confirm_cost }` — no effort field —
 * so the picked effort is CAPTURED STATE awaiting AUTOTIER1, not yet a routed
 * parameter. The composer surfaces it because the owner ruled the control in;
 * the surface that mounts it owns the honesty of when to show it.
 */

import { cn } from '@/lib/utils';
import { ArrowUp, ChevronDown, Mic, Plus, X } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

/**
 * THE SHARED READABLE MEASURE — FRONT84 (ORACLE_MF v1.54, owner: cap the
 * composer width "like this chat", it runs full-bleed now).
 *
 * The composer self-caps to this centered measure so the cap lands ONCE and
 * every future mount (Vote, Justice) inherits it — no /h24-only fork. A surface
 * aligns its message column to the SAME width by wrapping that column in this
 * exact constant, so text and input can never drift apart.
 *
 * `max-w-3xl` (48rem) is Tailwind's container scale, not an inline pixel value —
 * there is no CUSTOM house max-width token (checked tailwind.config.ts; flagged
 * in the FRONT84 report), so the standard utility is the house system's answer.
 * `w-full` + `mx-auto` mean it fills the column on narrow viewports (no cap, no
 * horizontal scroll) and centers once the column is wider than the measure.
 */
export const COMPOSER_MEASURE = 'mx-auto w-full max-w-3xl';

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
  /**
   * H24_BYOK2 — optional rich content rendered at the row's trailing edge in
   * the dropdown (NOT the native-select era; see the options block below).
   * The generic Composer knows nothing about what this renders — h24 uses it
   * for per-provider Add/Edit/Delete so a Bee can manage a BYOK key without
   * leaving the composer. Omit for a plain label row.
   */
  adornment?: ReactNode;
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
  /**
   * H24_FIX3 — blocks SEND only, leaving typing and the band/option/effort
   * pickers live. `disabled` deliberately also freezes those (signed-out has
   * nothing to pick between); this is for "you can change your mind" cases —
   * e.g. a picked model with no real route yet — where locking the whole
   * composer would trap the Bee on the very selection that needs changing.
   */
  submitDisabled?: boolean;
  placeholder?: string;

  /** [+] attach. Omitted entirely when `onAttach` is not given. */
  onAttach?: () => void;
  attachments?: ComposerAttachment[];
  onRemoveAttachment?: (id: string) => void;

  /** Model/band picker (tiers-are-bands). Omitted when empty. */
  bands?: ComposerBand[];
  bandId?: string;
  onBandChange?: (id: string) => void;

  /** A second small selector, e.g. h24's Model menu. Omitted when empty. */
  options?: ComposerOption[];
  optionId?: string;
  onOptionChange?: (id: string) => void;
  optionLabel?: string;
  /** Small marker rendered against the options chip — e.g. h24's "your key". */
  optionBadge?: ReactNode;

  /**
   * Conditional EFFORT selector (COMPOSER v1.1). Rendered ONLY when a surface
   * passes a non-empty list — h24 passes it solely when a specific model is
   * picked, so Auto never shows a dial. Omitted entirely otherwise.
   */
  effortOptions?: ComposerOption[];
  effortId?: string;
  onEffortChange?: (id: string) => void;
  effortLabel?: string;

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
  submitDisabled = false,
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
  optionBadge,
  effortOptions = [],
  effortId,
  onEffortChange,
  effortLabel = 'Effort',
  enableMic = false,
}: ComposerProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [listening, setListening] = useState(false);
  const [focused, setFocused] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  // H24_BYOK2 — the options (Model) menu, popover instead of a native
  // <select>: an <option> element cannot host the Add/Edit/Delete adornment
  // BYOK2 needs per row. Click-outside close mirrors UniversalShell's
  // AstraPicker (document mousedown listener — a click handler, not the
  // mousemove HEADLESS LAW forbids).
  const [optionMenuOpen, setOptionMenuOpen] = useState(false);
  const optionMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!optionMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (optionMenuRef.current && !optionMenuRef.current.contains(e.target as Node)) {
        setOptionMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [optionMenuOpen]);

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

  const canSubmit = !disabled && !submitDisabled && !busy && value.trim().length > 0;

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
    // SHELL v1.5 H24 COMPOSER: white outline at rest, ACCENT outline on focus,
    // directive text white, ground = the fixed --input token. The accent focus
    // ring is driven by JS focus state (CSS focus-within can't reach a custom
    // property swap cleanly across the fallback). Fallbacks keep the composer
    // sane if it is ever mounted outside an `.astra-shell` scope.
    <div
      className={cn(COMPOSER_MEASURE, 'rounded-2xl p-2 transition-colors')}
      style={{
        background: 'var(--input, #10141b)',
        border: `1px solid ${focused ? 'var(--accent, #ef6c2a)' : 'rgba(248,249,250,0.22)'}`,
      }}
    >
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
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        rows={1}
        disabled={disabled}
        className="w-full resize-none bg-transparent px-2 py-1.5 placeholder:text-text-muted focus:outline-none disabled:opacity-50"
        style={{ fontSize: '14px', maxHeight: '200px', color: 'var(--ink, #f8f9fa)' }}
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
          <div className="relative flex items-center gap-1.5" ref={optionMenuRef}>
            <button
              type="button"
              onClick={() => setOptionMenuOpen((o) => !o)}
              disabled={disabled}
              aria-haspopup="true"
              aria-expanded={optionMenuOpen}
              aria-label={optionLabel}
              title={optionLabel}
              className="flex max-w-[150px] items-center gap-1 rounded-md border border-border-bright bg-panel-2 px-2 py-1 text-text-silver transition-colors hover:text-text disabled:opacity-40"
              style={{ fontSize: '12px' }}
            >
              <span className="truncate">
                {options.find((o) => o.id === optionId)?.label ?? optionLabel}
              </span>
              <ChevronDown size={12} className="flex-shrink-0" />
            </button>
            {optionBadge}
            {optionMenuOpen && (
              <div
                className="absolute bottom-full left-0 z-50 mb-1 w-56 rounded-lg p-1 shadow-xl"
                style={{
                  background: 'var(--panel-2, #171b23)',
                  border: '1px solid var(--border-bright, rgba(248,249,250,0.22))',
                }}
              >
                {options.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5"
                    style={{
                      background:
                        o.id === optionId
                          ? 'color-mix(in srgb, var(--accent, #ef6c2a) 14%, transparent)'
                          : undefined,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onOptionChange?.(o.id);
                        setOptionMenuOpen(false);
                      }}
                      className="flex-1 truncate text-left text-text-silver transition-colors hover:text-text"
                      style={{ fontSize: '12.5px' }}
                    >
                      {o.label}
                    </button>
                    {o.adornment}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* EFFORT — conditional (COMPOSER v1.1). The surface passes options only
            when a specific model is picked; Auto never mounts this. */}
        {effortOptions.length > 0 && (
          <select
            value={effortId}
            onChange={(e) => onEffortChange?.(e.target.value)}
            disabled={disabled}
            aria-label={effortLabel}
            title={effortLabel}
            className="max-w-[110px] rounded-md border border-border-bright bg-panel-2 px-2 py-1 text-text-silver transition-colors hover:text-text disabled:opacity-40"
            style={{ fontSize: '12px' }}
          >
            {effortOptions.map((o) => (
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

        {/* SEND — SHELL v1.5: solid ACCENT SQUARE, white up-arrow; the arrow
            flips BLACK on hover, the box STAYS accent. aria-label "Send", never
            the word on the button. */}
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          aria-label="Send"
          title="Send"
          className={cn(
            'group flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md transition-colors',
            !canSubmit && 'cursor-not-allowed',
          )}
          style={{
            background: canSubmit ? 'var(--accent, #ef6c2a)' : 'var(--input, #14171c)',
          }}
        >
          <ArrowUp
            size={18}
            className={canSubmit ? 'text-white group-hover:text-black' : 'text-text-muted'}
          />
        </button>
      </div>
    </div>
  );
}
