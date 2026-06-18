import { useState, useRef, useEffect, useMemo, type FormEvent } from 'react';
import { Send, X, Loader2 } from 'lucide-react';
import { AtomPicker } from '@/components/intel/AtomPicker';
import { CategoryPicker } from '@/components/intel/CategoryPicker';
import { RealmPathPicker } from '@/components/intel/RealmPathPicker';
import { useManualData } from '@/lib/useManualData';
import { cn } from '@/lib/utils';
import { REALM_NAMES, REALM_ID_BY_NAME } from '@/lib/constants';
import type { RealmId } from '@/types/manual';

/** Build a display-name path from realm + L2 (back-compat seed). */
function buildPath(realmId: RealmId | null | undefined, l2: string | null | undefined): string[] {
  if (!realmId) return [];
  return [REALM_NAMES[realmId], l2].filter((s): s is string => Boolean(s));
}

export type ComposerMode = 'thread' | 'reply';

export interface InlineComposerPayload {
  title?: string;
  body: string;
  atomIds: string[];
  categoryPaths: string[];
  realmId: RealmId | null;
  l2: string | null;
  /** Full taxonomy path (display names) → forum_threads.realm_path. */
  realmPath: string[];
}

export interface InlineComposerProps {
  mode: ComposerMode;
  onSubmit: (payload: InlineComposerPayload) => Promise<boolean>;
  draftKey?: string;

  /** Initial/inherited realm context. Used as default for realm picker.
   *  In reply mode, also shown as "inherited" line. */
  inheritedContext?: {
    realmId?: RealmId | null;
    l2?: string | null;
    atomIds?: string[];
  };

  placeholderTitle?: string;
  placeholderBody?: string;
  enabled?: boolean;
  disabledMessage?: string;
  autoFocus?: boolean;
  onCancel?: () => void;

  accentColor?: string;
  header?: string;
  subheader?: string;

  /** When true, starts as a thin collapsed input button. */
  startCollapsed?: boolean;
  placeholderCollapsed?: string;

  /** Context label shown under the "Earn BLiNG!" line on collapsed state
   *  (e.g., "Post to INTEL / Justice / Government") */
  collapsedContextLabel?: string;

  /** Short placeholder shown on collapsed state as the "body preview" line
   *  (e.g., "Share your thought..."). Defaults to placeholderBody. */
  collapsedBodyLine?: string;
}

const INTEL_BLUE = '#6B94C8';

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
  accentColor = INTEL_BLUE,
  header,
  subheader,
  startCollapsed = false,
  collapsedContextLabel,
  collapsedBodyLine,
}: InlineComposerProps) {
  const { atoms } = useManualData();

  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [atomIds, setAtomIds] = useState<string[]>([]);
  const [categoryPaths, setCategoryPaths] = useState<string[]>([]);
  const [realmPath, setRealmPath] = useState<string[]>(() =>
    buildPath(inheritedContext?.realmId, inheritedContext?.l2),
  );
  const [realmManuallyOverridden, setRealmManuallyOverridden] = useState(false);

  // Back-compat scalars derived from the full path.
  const realmId = realmPath[0]
    ? (REALM_ID_BY_NAME[realmPath[0]] as RealmId | undefined) ?? null
    : null;
  const l2 = realmPath[1] ?? null;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState(!startCollapsed);

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const placeholderBodyFinal =
    placeholderBody ??
    (mode === 'thread' ? 'Share your thought...' : 'Your reply...');

  // Auto-derive realm from first linked atom (unless user manually overrode)
  const derivedPath = useMemo(() => {
    if (atomIds.length === 0) return null;
    const first = atoms.find((a) => a.id === atomIds[0]);
    if (!first) return null;
    return [REALM_NAMES[first.realmId]];
  }, [atomIds, atoms]);

  useEffect(() => {
    if (realmManuallyOverridden) return;
    if (!derivedPath) return;
    setRealmPath(derivedPath);
  }, [derivedPath, realmManuallyOverridden]);

  // Keep realmPath in sync with inheritedContext changes (e.g., filter changes)
  // but only if not manually overridden and no atoms picked yet
  useEffect(() => {
    if (realmManuallyOverridden) return;
    if (atomIds.length > 0) return;
    setRealmPath(buildPath(inheritedContext?.realmId, inheritedContext?.l2));
  }, [
    inheritedContext?.realmId,
    inheritedContext?.l2,
    realmManuallyOverridden,
    atomIds.length,
  ]);

  // Restore draft from local storage
  useEffect(() => {
    if (!draftKey) return;
    const saved = localStorage.getItem(`draft:${draftKey}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.body) setBody(parsed.body);
        if (parsed.atomIds) setAtomIds(parsed.atomIds);
        if (parsed.categoryPaths) setCategoryPaths(parsed.categoryPaths);
        const savedPath: string[] | null = Array.isArray(parsed.realmPath)
          ? parsed.realmPath
          : parsed.realmId || parsed.l2
            ? buildPath(parsed.realmId, parsed.l2)
            : null;
        if (savedPath && savedPath.length > 0) {
          setRealmPath(savedPath);
          if (parsed.realmManuallyOverridden) setRealmManuallyOverridden(true);
        }
        // Note: do NOT auto-expand on draft presence. Composer respects
        // startCollapsed prop — user clicks to expand. Draft content still
        // loads into the form, it just doesn't force the composer open.
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // Autosave draft
  useEffect(() => {
    if (!draftKey) return;
    const hasContent =
      title.trim() ||
      body.trim() ||
      atomIds.length > 0 ||
      categoryPaths.length > 0;
    if (!hasContent) {
      localStorage.removeItem(`draft:${draftKey}`);
      return;
    }
    const snap = JSON.stringify({
      title,
      body,
      atomIds,
      categoryPaths,
      realmPath,
      realmManuallyOverridden,
    });
    const t = setTimeout(() => localStorage.setItem(`draft:${draftKey}`, snap), 400);
    return () => clearTimeout(t);
  }, [
    draftKey,
    title,
    body,
    atomIds,
    categoryPaths,
    realmPath,
    realmManuallyOverridden,
  ]);

  // Auto-focus
  useEffect(() => {
    if (!autoFocus || !expanded) return;
    if (mode === 'thread') titleRef.current?.focus();
    else bodyRef.current?.focus();
  }, [autoFocus, expanded, mode]);

  const canSubmit = useMemo(() => {
    if (submitting) return false;
    if (mode === 'thread') {
      return title.trim().length >= 2 && body.trim().length >= 2;
    }
    return body.trim().length >= 2;
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
        categoryPaths,
        realmId,
        l2,
        realmPath,
      });
      if (ok) {
        if (draftKey) localStorage.removeItem(`draft:${draftKey}`);
        setTitle('');
        setBody('');
        setAtomIds([]);
        setCategoryPaths([]);
        setRealmManuallyOverridden(false);
        setRealmPath(buildPath(inheritedContext?.realmId, inheritedContext?.l2));
        if (startCollapsed) setExpanded(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post');
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    const hasContent =
      title.trim() || body.trim() || atomIds.length > 0 || categoryPaths.length > 0;
    if (hasContent) {
      const keep = window.confirm('Keep draft? OK = keep, Cancel = discard');
      if (!keep && draftKey) {
        localStorage.removeItem(`draft:${draftKey}`);
        setTitle('');
        setBody('');
        setAtomIds([]);
        setCategoryPaths([]);
        setRealmManuallyOverridden(false);
        setRealmPath(buildPath(inheritedContext?.realmId, inheritedContext?.l2));
      }
    }
    if (startCollapsed) setExpanded(false);
    if (onCancel) onCancel();
  }

  // Disabled
  if (!enabled) {
    return (
      <div
        className="rounded-md border px-4 py-3 text-center text-text-muted"
        style={{
          fontSize: '13px',
          borderColor: `${accentColor}30`,
          background: 'rgba(15, 18, 23, 0.6)',
        }}
      >
        {disabledMessage}
      </div>
    );
  }

  // Collapsed — a clickable prompt that expands into the full composer
  if (!expanded) {
    const bodyLine =
      collapsedBodyLine ?? placeholderBodyFinal ?? 'Share your thought...';

    const expand = () => {
      setExpanded(true);
      setTimeout(() => {
        if (mode === 'thread') titleRef.current?.focus();
        else bodyRef.current?.focus();
      }, 50);
    };

    return (
      <div className="overflow-hidden rounded-md border border-border bg-bg">
        {/* Clickable prompt — expands into the full composer */}
        <button
          type="button"
          onClick={expand}
          className="block w-full px-4 py-3 text-left transition-colors hover:bg-bg-elevated/30"
        >
          <div className="flex flex-wrap items-baseline gap-2">
            <span
              className="font-display tracking-wide"
              style={{ fontSize: '14px', color: '#FAD15E', fontWeight: 600 }}
            >
              Earn BLiNG!
            </span>
            {collapsedContextLabel && (
              <span
                className="truncate font-mono uppercase tracking-widest"
                style={{ fontSize: '10.5px', color: `${accentColor}C0` }}
                data-size="meta"
              >
                {collapsedContextLabel}
              </span>
            )}
          </div>
          <div
            className="mt-1 truncate"
            style={{ fontSize: '13px', color: 'rgba(232, 236, 241, 0.55)' }}
          >
            {bodyLine}
          </div>
        </button>

      </div>
    );
  }

  // Expanded — everything visible
  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-md border border-border bg-bg-elevated p-4"
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
          className="mb-3 w-full rounded-md border bg-bg px-3 py-2 text-text placeholder:text-text-muted focus:outline-none focus:ring-1"
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
        className="mb-2 w-full resize-y rounded-md border bg-bg px-3 py-2 text-text placeholder:text-text-muted focus:outline-none focus:ring-1"
        style={{
          fontSize: '14px',
          lineHeight: '1.5',
          borderColor: `${accentColor}40`,
        }}
      />

      {/* Inherited context line (reply mode, informational) */}
      {mode === 'reply' && inheritedContext?.realmId && (
        <div
          className="mb-3 font-mono text-text-muted"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          Parent thread: {REALM_NAMES[inheritedContext.realmId]}
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

      {/* Atom picker — always visible */}
      <div className="mb-3">
        <AtomPicker
          value={atomIds}
          onChange={setAtomIds}
          label="Atoms"
          max={10}
          realmContext={{ realmId, l2 }}
          placeholder="Search atoms to tag..."
        />
      </div>

      {/* Category picker — multi-select L2+ branches for additive discovery */}
      <div className="mb-3">
        <CategoryPicker
          value={categoryPaths}
          onChange={setCategoryPaths}
          max={5}
        />
      </div>

      {/* Realm picker — full-tree drill, always visible, defaults from context */}
      <div className="mb-3">
        <RealmPathPicker
          value={realmPath}
          onChange={(next) => {
            setRealmPath(next);
            setRealmManuallyOverridden(true);
          }}
          label="Realm"
          autoDerived={!realmManuallyOverridden && atomIds.length > 0}
          derivedHint={
            !realmManuallyOverridden && atomIds.length > 0
              ? 'Auto-derived from first atom'
              : !realmManuallyOverridden && inheritedContext?.realmId
                ? 'From current filter'
                : undefined
          }
        />
      </div>

      {/* Error */}
      {error && (
        <p
          className="mb-2 text-kettle-unsourced"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          {error}
        </p>
      )}

      {/* Action row */}
      <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
        {(onCancel || startCollapsed) && (
          <button
            type="button"
            onClick={handleCancel}
            className="flex items-center gap-1 rounded-md px-3 py-1.5 text-text-silver hover:bg-bg"
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
            canSubmit ? 'shadow-sm' : 'cursor-not-allowed border-border text-text-dim opacity-60',
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
          {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          <span>{submitting ? 'Posting...' : 'Post'}</span>
        </button>
      </div>
    </form>
  );
}
