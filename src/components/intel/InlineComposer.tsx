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

  /** Draft key — used for local storage persistence. e.g. "intel-thread" or "intel-reply-<threadId>" */
  draftKey?: string;

  /** Parent context for replies — inherits realm, atoms shown on "inherited" line. */
  inheritedContext?: {
    realm?: string | null;
    front?: Front | null;
    l2?: string | null;
    atomIds?: string[];
  };

  /** Placeholder text for collapsed state */
  placeholderCollapsed?: string;

  /** Placeholder text for title input (thread mode only) */
  placeholderTitle?: string;

  /** Placeholder text for body textarea */
  placeholderBody?: string;

  /** Whether the Bee can post (needs sign-in) */
  enabled?: boolean;

  /** Text shown when not enabled */
  disabledMessage?: string;

  /** Auto-focus the body on mount (used for inline replies that appear on click) */
  autoFocus?: boolean;

  /** Controlled expanded state. If omitted, component manages its own. */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;

  /** Show "Expand to full page" button. Thread mode only. */
  allowExpand?: boolean;

  /** URL to navigate to on expand. Thread context saved to sessionStorage. */
  expandUrl?: string;
}

/**
 * Inline composer — collapses to a single-line prompt, expands on focus
 * to a full composer with title (threads only), body, optional atoms,
 * and expand-to-full-page button.
 *
 * Draft autosaves to localStorage per draftKey.
 * Replies hide the title field and inherit parent atoms (expandable).
 */
export function InlineComposer({
  mode,
  onSubmit,
  draftKey,
  inheritedContext,
  placeholderCollapsed,
  placeholderTitle = 'Title your thread...',
  placeholderBody,
  enabled = true,
  disabledMessage = 'Sign in to post',
  autoFocus = false,
  expanded: controlledExpanded,
  onExpandedChange,
  allowExpand = false,
  expandUrl,
}: InlineComposerProps) {
  const navigate = useNavigate();

  const [internalExpanded, setInternalExpanded] = useState(autoFocus);
  const expanded = controlledExpanded ?? internalExpanded;
  const setExpanded = (next: boolean) => {
    if (onExpandedChange) onExpandedChange(next);
    else setInternalExpanded(next);
  };

  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [atomIds, setAtomIds] = useState<string[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const placeholderCollapsedFinal =
    placeholderCollapsed ??
    (mode === 'thread' ? 'Start a new thread...' : 'Reply to this thread...');
  const placeholderBodyFinal =
    placeholderBody ??
    (mode === 'thread' ? 'Share your thought...' : 'Your reply...');

  // Restore draft from local storage when expanded
  useEffect(() => {
    if (!expanded || !draftKey) return;
    const saved = localStorage.getItem(`draft:${draftKey}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.body) setBody(parsed.body);
        if (parsed.atomIds) setAtomIds(parsed.atomIds);
      } catch {
        // ignore corrupt draft
      }
    }
  }, [expanded, draftKey]);

  // Autosave draft
  useEffect(() => {
    if (!expanded || !draftKey) return;
    const hasContent = title.trim() || body.trim() || atomIds.length > 0;
    if (!hasContent) {
      localStorage.removeItem(`draft:${draftKey}`);
      return;
    }
    const snap = JSON.stringify({ title, body, atomIds });
    const t = setTimeout(() => localStorage.setItem(`draft:${draftKey}`, snap), 400);
    return () => clearTimeout(t);
  }, [expanded, draftKey, title, body, atomIds]);

  // Auto-focus body when autoFocus is true
  useEffect(() => {
    if (autoFocus && expanded) {
      if (mode === 'thread') titleRef.current?.focus();
      else bodyRef.current?.focus();
    }
  }, [autoFocus, expanded, mode]);

  // Minimum body length; title required for threads
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
        // Clear draft + state on success
        if (draftKey) localStorage.removeItem(`draft:${draftKey}`);
        setTitle('');
        setBody('');
        setAtomIds([]);
        setAdvancedOpen(false);
        setExpanded(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post');
    } finally {
      setSubmitting(false);
    }
  }

  function handleExpandToFullPage() {
    if (!expandUrl) return;
    // Preserve current draft in sessionStorage for the full-page composer to pick up
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
    // If draft has content, confirm. Otherwise just collapse.
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
    setExpanded(false);
    setAdvancedOpen(false);
  }

  // Collapsed state
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => enabled && setExpanded(true)}
        disabled={!enabled}
        className={cn(
          'w-full rounded-lg border border-border bg-bg-elevated/40 px-4 py-2.5 text-left text-text-muted transition-colors',
          enabled
            ? 'hover:border-text-silver/40 hover:bg-bg-elevated hover:text-text-silver'
            : 'cursor-not-allowed opacity-60',
        )}
        style={{ fontSize: '13px' }}
      >
        {enabled ? placeholderCollapsedFinal : disabledMessage}
      </button>
    );
  }

  // Expanded state
  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-text-silver/30 bg-bg-elevated p-3"
    >
      {/* Title (threads only) */}
      {mode === 'thread' && (
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={placeholderTitle}
          className="mb-2 w-full rounded-md border border-border bg-bg px-3 py-2 text-text placeholder:text-text-muted focus:border-text-silver/50 focus:outline-none focus:ring-1 focus:ring-text-silver/30"
          style={{ fontSize: '15px', fontWeight: 500 }}
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
        rows={mode === 'thread' ? 5 : 3}
        autoFocus={autoFocus && mode === 'reply'}
        className="w-full resize-y rounded-md border border-border bg-bg px-3 py-2 text-text placeholder:text-text-muted focus:border-text-silver/50 focus:outline-none focus:ring-1 focus:ring-text-silver/30"
        style={{ fontSize: '14px', lineHeight: '1.5' }}
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
            <span> · {inheritedContext.atomIds.length} atom{inheritedContext.atomIds.length === 1 ? '' : 's'}</span>
          )}
        </div>
      )}

      {/* Advanced section (opt-in atom tagging, etc.) */}
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

      {/* Error banner */}
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
          <button
            type="button"
            onClick={handleCancel}
            className="flex items-center gap-1 rounded-md px-3 py-1 text-text-silver hover:bg-bg"
            style={{ fontSize: '12px' }}
          >
            <X size={11} />
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              'flex items-center gap-1.5 rounded-md border px-3 py-1.5 transition-all',
              canSubmit
                ? 'border-text-silver/40 bg-bg-elevated text-text-silver-bright hover:border-text-silver/70 hover:bg-panel-2'
                : 'cursor-not-allowed border-border text-text-dim opacity-60',
            )}
            style={{ fontSize: '12px' }}
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
