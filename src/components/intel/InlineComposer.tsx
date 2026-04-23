import { useState, useRef, useEffect, useMemo, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, X, Maximize2, Tag, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { AtomPicker } from '@/components/intel/AtomPicker';
import { cn } from '@/lib/utils';
import type { Front } from '@/types/manual';

export type ComposerMode = 'thread' | 'reply';

export interface InlineComposerProps {
  mode: ComposerMode;

  /** Called on submit with the gathered content. Return true on success. */
  onSubmit: (payload: {
    title?: string;
    body: string;
    atomIds: string[];
  }) => Promise<boolean>;

  /** Draft key — used for local storage persistence. */
  draftKey?: string;

  /** Parent context for replies — inherits realm, atoms shown on "inherited" line. */
  inheritedContext?: {
    realm?: string | null;
    front?: Front | null;
    l2?: string | null;
    atomIds?: string[];
  };

  /** Placeholder text for title input (thread mode only) */
  placeholderTitle?: string;

  /** Placeholder text for body textarea */
  placeholderBody?: string;

  /** Whether the Bee can post (needs sign-in) */
  enabled?: boolean;

  /** Text shown when not enabled */
  disabledMessage?: string;

  /** Auto-focus the first input on mount (used for replies triggered by Reply button) */
  autoFocus?: boolean;

  /** Called when user cancels (for reply mode — collapses back to "Reply" button) */
  onCancel?: () => void;

  /** Show "Expand to full page" button. Thread mode only. */
  allowExpand?: boolean;

  /** URL to navigate to on expand. Thread context saved to sessionStorage. */
  expandUrl?: string;

  /** Surface accent color (default INTEL blue) */
  accentColor?: string;

  /** Header text shown above the composer (e.g. "Start a thread. Earn BLiNG!") */
  header?: string;

  /** Subheader / description under the main header */
  subheader?: string;

  /** When true, renders as a collapsed single-line prompt until clicked.
   *  When false, renders fully expanded immediately (used for replies). */
  startCollapsed?: boolean;

  /** Placeholder text for collapsed prompt */
  placeholderCollapsed?: string;
}

const INTEL_BLUE = '#6B94C8';

/**
 * Composer card. Can render collapsed (single-line prompt → click to expand) or
 * fully expanded (used for reply mode where Reply button is the trigger).
 * Title (threads only) + body + opt-in atom tagging via [Add atoms] toggle.
 */
export function InlineComposer({
  mode,
  onSubmit,
  draftKey,
  inheritedContext,
  placeholderTitle = 'Title your thread...',
  placeholderBody,
  enabled = true,
  disabledMessage = 'Sign in to post',
  autoFocus = false,
  onCancel,
  allowExpand = false,
  expandUrl,
  accentColor = INTEL_BLUE,
  header,
  subheader,
  startCollapsed = false,
  placeholderCollapsed,
}: InlineComposerProps) {
  const navigate = useNavigate();

  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [atomIds, setAtomIds] = useState<string[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Expansion state — if startCollapsed, begin collapsed; otherwise fully expanded.
  // Drafts with content auto-expand on mount so Bees see their WIP.
  const [expanded, setExpanded] = useState(!startCollapsed);

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const placeholderCollapsedFinal =
    placeholderCollapsed ??
    (mode === 'thread' ? 'Start a thread. Earn BLiNG!' : 'Reply to this thread...');

  const placeholderBodyFinal =
    placeholderBody ??
    (mode === 'thread' ? 'Share your thought...' : 'Your reply...');

  // Restore draft from local storage on mount
  useEffect(() => {
    if (!draftKey) return;
    const saved = localStorage.getItem(`draft:${draftKey}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.body) setBody(parsed.body);
        if (parsed.atomIds) setAtomIds(parsed.atomIds);
        // If draft has content, auto-expand to show it
        const hasContent =
          (parsed.title && parsed.title.trim()) ||
          (parsed.body && parsed.body.trim()) ||
          (Array.isArray(parsed.atomIds) && parsed.atomIds.length > 0);
        if (hasContent) setExpanded(true);
      } catch {
        // ignore corrupt draft
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // Autosave draft
  useEffect(() => {
    if (!draftKey) return;
    const hasContent = title.trim() || body.trim() || atomIds.length > 0;
    if (!hasContent) {
      localStorage.removeItem(`draft:${draftKey}`);
      return;
    }
    const snap = JSON.stringify({ title, body, atomIds });
    const t = setTimeout(() => localStorage.setItem(`draft:${draftKey}`, snap), 400);
    return () => clearTimeout(t);
  }, [draftKey, title, body, atomIds]);

  // Auto-focus the appropriate input
  useEffect(() => {
    if (!autoFocus) return;
    if (mode === 'thread') titleRef.current?.focus();
    else bodyRef.current?.focus();
  }, [autoFocus, mode]);

  const canSubmit = useMemo(() => {
    if (mode === 'thread') {
      return title.trim().length >= 2 && body.trim().length >= 2 && !submitting;
    }
    return body.trim().length >= 2 && !submitting;
  }, [mode, title, body, submitting]);

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (!canSubmit || !enabled) return;
    setSubmitting(true);
    setError(null);
    try {
      const ok = await onSubmit({
        title: mode === 'thread' ? title.trim() : undefined,
        body: body.trim(),
        atomIds,
      });
      if (ok) {
        if (draftKey) localStorage.removeItem(`draft:${draftKey}`);
        setTitle('');
        setBody('');
        setAtomIds([]);
        setAdvancedOpen(false);
        if (startCollapsed) setExpanded(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post');
    } finally {
      setSubmitting(false);
    }
  }

  function handleExpandToFullPage() {
    if (!expandUrl) return;
    const payload = {
      title,
      body,
      atomIds,
      realm: inheritedContext?.realm ?? null,
      front: inheritedContext?.front ?? null,
      l2: inheritedContext?.l2 ?? null,
    };
    sessionStorage.setItem('composer-draft', JSON.stringify(payload));
    navigate(expandUrl);
  }

  function handleCancel() {
    const hasContent = title.trim() || body.trim() || atomIds.length > 0;
    if (hasContent) {
      const keep = window.confirm('Keep draft? OK = keep, Cancel = discard');
      if (!keep && draftKey) {
        localStorage.removeItem(`draft:${draftKey}`);
        setTitle('');
        setBody('');
        setAtomIds([]);
      }
    }
    setAdvancedOpen(false);
    if (startCollapsed) setExpanded(false);
    if (onCancel) onCancel();
  }

  // Disabled state (not signed in)
  if (!enabled) {
    return (
      <div
        className="rounded-lg border px-4 py-3 text-center text-text-muted"
        style={{
          fontSize: '13px',
          borderColor: `${accentColor}30`,
          background: `${accentColor}08`,
        }}
      >
        {disabledMessage}
      </div>
    );
  }

  // Collapsed state — prominent single-line prompt
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => {
          setExpanded(true);
          setTimeout(() => {
            if (mode === 'thread') titleRef.current?.focus();
            else bodyRef.current?.focus();
          }, 50);
        }}
        className="group flex w-full items-center gap-2 rounded-lg border-2 bg-bg-elevated px-4 py-3 text-left transition-all hover:bg-panel-2 hover:shadow-lg"
        style={{
          borderColor: `${accentColor}60`,
          boxShadow: `0 0 0 1px ${accentColor}15, 0 2px 8px rgba(0,0,0,0.25)`,
        }}
      >
        <Send size={14} style={{ color: accentColor }} />
        <span
          className="flex-1 font-display tracking-wide"
          style={{ fontSize: '14px', color: accentColor, fontWeight: 500 }}
        >
          {placeholderCollapsedFinal}
        </span>
        <span
          className="font-mono text-text-muted"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          Click to compose →
        </span>
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border-2 bg-bg-elevated p-4 shadow-lg transition-colors"
      style={{
        borderColor: `${accentColor}60`,
        boxShadow: `0 0 0 1px ${accentColor}15, 0 4px 12px rgba(0,0,0,0.3)`,
      }}
    >
      {/* Header */}
      {(header || subheader) && (
        <div className="mb-3">
          {header && (
            <h3
              className="font-display tracking-wide"
              style={{ fontSize: '16px', color: accentColor, fontWeight: 600 }}
            >
              {header}
            </h3>
          )}
          {subheader && (
            <p
              className="mt-0.5 font-mono text-text-muted"
              style={{ fontSize: '11px' }}
              data-size="meta"
            >
              {subheader}
            </p>
          )}
        </div>
      )}

      {/* Title (threads only) */}
      {mode === 'thread' && (
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={placeholderTitle}
          className="mb-2 w-full rounded-md border bg-bg px-3 py-2 text-text placeholder:text-text-muted focus:outline-none focus:ring-1"
          style={{
            fontSize: '15px',
            fontWeight: 500,
            borderColor: `${accentColor}40`,
          }}
          maxLength={200}
          required
        />
      )}

      {/* Body */}
      <textarea
        ref={bodyRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholderBodyFinal}
        rows={mode === 'thread' ? 4 : 3}
        className="w-full resize-y rounded-md border bg-bg px-3 py-2 text-text placeholder:text-text-muted focus:outline-none focus:ring-1"
        style={{
          fontSize: '14px',
          lineHeight: '1.5',
          borderColor: `${accentColor}40`,
        }}
      />

      {/* Inherited context chip (replies) */}
      {mode === 'reply' && inheritedContext?.realm && (
        <div
          className="mt-2 font-mono text-text-muted"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          Inherits: {inheritedContext.realm}
          {inheritedContext.front && ` · ${inheritedContext.front}`}
          {inheritedContext.l2 && ` · ${inheritedContext.l2}`}
          {inheritedContext.atomIds && inheritedContext.atomIds.length > 0 && (
            <span>
              {' · '}
              {inheritedContext.atomIds.length} atom
              {inheritedContext.atomIds.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
      )}

      {/* Advanced — opt-in atom tagging */}
      <div className="mt-2">
        <button
          type="button"
          onClick={() => setAdvancedOpen((o) => !o)}
          className="flex items-center gap-1 rounded-md px-2 py-0.5 text-text-muted hover:bg-bg hover:text-text-silver"
          style={{ fontSize: '11px' }}
        >
          <Tag size={11} />
          <span>
            {atomIds.length > 0
              ? `${atomIds.length} atom${atomIds.length === 1 ? '' : 's'} added`
              : 'Add atoms'}
          </span>
          {advancedOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>

        {advancedOpen && (
          <div className="mt-2 rounded-md border border-border bg-bg/60 p-2">
            <AtomPicker
              value={atomIds}
              onChange={setAtomIds}
              max={10}
              realmContext={{
                realm: inheritedContext?.realm,
                front: inheritedContext?.front,
                l2: inheritedContext?.l2,
              }}
              placeholder="Search atoms to tag..."
            />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p
          className="mt-2 text-kettle-unsourced"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          {error}
        </p>
      )}

      {/* Action row */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {allowExpand && mode === 'thread' && expandUrl && (
            <button
              type="button"
              onClick={handleExpandToFullPage}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-text-muted hover:bg-bg hover:text-text-silver"
              style={{ fontSize: '11px' }}
              title="Open in full-page composer"
            >
              <Maximize2 size={11} />
              Expand
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center gap-1 rounded-md px-3 py-1 text-text-silver hover:bg-bg"
              style={{ fontSize: '12px' }}
            >
              <X size={11} />
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              'flex items-center gap-1.5 rounded-md border px-4 py-1.5 transition-all',
              canSubmit
                ? 'text-text shadow-sm'
                : 'cursor-not-allowed border-border text-text-dim opacity-60',
            )}
            style={{
              fontSize: '13px',
              fontWeight: 500,
              ...(canSubmit
                ? {
                    borderColor: `${accentColor}80`,
                    background: `${accentColor}20`,
                    color: accentColor,
                  }
                : {}),
            }}
          >
            {submitting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Send size={12} />
            )}
            <span>{submitting ? 'Posting...' : 'Post'}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
