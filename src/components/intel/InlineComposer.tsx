import { useState, useRef, useEffect, useMemo, type FormEvent } from 'react';
import { Send, X, Loader2, Image, Video, FileText, MapPin, Link2, Tag, AtSign, DollarSign, Gift, BarChart3, Trophy } from 'lucide-react';
import { AtomPicker } from '@/components/intel/AtomPicker';
import { CategoryPicker } from '@/components/intel/CategoryPicker';
import { RealmPicker, type RealmSelection } from '@/components/intel/RealmPicker';
import { useManualData } from '@/lib/useManualData';
import { cn } from '@/lib/utils';
import type { Front } from '@/types/manual';

export type ComposerMode = 'thread' | 'reply';

export interface InlineComposerPayload {
  title?: string;
  body: string;
  atomIds: string[];
  categoryPaths: string[];
  realm: string | null;
  front: Front | null;
  l2: string | null;
}

export interface InlineComposerProps {
  mode: ComposerMode;
  onSubmit: (payload: InlineComposerPayload) => Promise<boolean>;
  draftKey?: string;

  /** Initial/inherited realm context. Used as default for realm picker.
   *  In reply mode, also shown as "inherited" line. */
  inheritedContext?: {
    realm?: string | null;
    front?: Front | null;
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
   *  (e.g., "Post to INTEL / Power / INVESTIGATE") */
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
  const [realmSel, setRealmSel] = useState<RealmSelection>({
    realm: inheritedContext?.realm ?? null,
    front: inheritedContext?.front ?? null,
    l2: inheritedContext?.l2 ?? null,
  });
  const [realmManuallyOverridden, setRealmManuallyOverridden] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState(!startCollapsed);

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const placeholderBodyFinal =
    placeholderBody ??
    (mode === 'thread' ? 'Share your thought...' : 'Your reply...');

  // Auto-derive realm from first linked atom (unless user manually overrode)
  const derivedFromAtoms = useMemo(() => {
    if (atomIds.length === 0) return null;
    const first = atoms.find((a) => a.id === atomIds[0]);
    if (!first) return null;
    return {
      realm: first.realm,
      front: first.front ?? null,
      l2: null,
    } as RealmSelection;
  }, [atomIds, atoms]);

  useEffect(() => {
    if (realmManuallyOverridden) return;
    if (!derivedFromAtoms) return;
    setRealmSel(derivedFromAtoms);
  }, [derivedFromAtoms, realmManuallyOverridden]);

  // Keep realmSel in sync with inheritedContext changes (e.g., filter bar changes)
  // but only if not manually overridden and no atoms picked yet
  useEffect(() => {
    if (realmManuallyOverridden) return;
    if (atomIds.length > 0) return;
    setRealmSel({
      realm: inheritedContext?.realm ?? null,
      front: inheritedContext?.front ?? null,
      l2: inheritedContext?.l2 ?? null,
    });
  }, [
    inheritedContext?.realm,
    inheritedContext?.front,
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
        if (parsed.realm || parsed.front || parsed.l2) {
          setRealmSel({
            realm: parsed.realm ?? null,
            front: parsed.front ?? null,
            l2: parsed.l2 ?? null,
          });
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
      realm: realmSel.realm,
      front: realmSel.front,
      l2: realmSel.l2,
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
    realmSel.realm,
    realmSel.front,
    realmSel.l2,
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
        realm: realmSel.realm,
        front: realmSel.front,
        l2: realmSel.l2,
      });
      if (ok) {
        if (draftKey) localStorage.removeItem(`draft:${draftKey}`);
        setTitle('');
        setBody('');
        setAtomIds([]);
        setCategoryPaths([]);
        setRealmManuallyOverridden(false);
        setRealmSel({
          realm: inheritedContext?.realm ?? null,
          front: inheritedContext?.front ?? null,
          l2: inheritedContext?.l2 ?? null,
        });
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
        setRealmSel({
          realm: inheritedContext?.realm ?? null,
          front: inheritedContext?.front ?? null,
          l2: inheritedContext?.l2 ?? null,
        });
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

  // Collapsed — two-line info + action icons + inactive Post
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

    // Icon defs — all trigger expand for now (UI only, no backend wired yet)
    const actionIcons: { id: string; icon: typeof Image; label: string; title: string }[] = [
      { id: 'image', icon: Image, label: 'Image', title: 'Attach image (coming soon)' },
      { id: 'video', icon: Video, label: 'Video', title: 'Attach video (coming soon)' },
      { id: 'doc', icon: FileText, label: 'Doc', title: 'Attach document (coming soon)' },
      { id: 'location', icon: MapPin, label: 'Location', title: 'Add location (coming soon)' },
      { id: 'link', icon: Link2, label: 'Link', title: 'Preview link (coming soon)' },
      { id: 'atoms', icon: Tag, label: 'Atoms', title: 'Tag atoms from the Manual' },
      { id: 'mention', icon: AtSign, label: 'Mention', title: 'Mention a Bee (coming soon)' },
      { id: 'sale', icon: DollarSign, label: 'Sale', title: 'Make this a Bazaar listing (coming soon)' },
      { id: 'give', icon: Gift, label: 'Give', title: 'Start a Give campaign (coming soon)' },
      { id: 'poll', icon: BarChart3, label: 'Poll', title: 'Add a poll (coming soon)' },
      { id: 'prize', icon: Trophy, label: 'Prize', title: 'Post a bet with BLiNG! escrow (coming soon)' },
    ];

    return (
      <div
        className="group relative overflow-hidden rounded-lg border-2 bg-bg transition-all hover:shadow-xl"
        style={{
          borderColor: `${accentColor}80`,
          boxShadow: `0 0 0 1px ${accentColor}25, 0 4px 14px rgba(0,0,0,0.35), 0 0 16px ${accentColor}20`,
        }}
      >
        {/* Subtle inner gradient glow */}
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background: `radial-gradient(ellipse at 10% 0%, ${accentColor}15 0%, transparent 60%)`,
          }}
        />

        {/* Clickable text area (top portion) */}
        <button
          type="button"
          onClick={expand}
          className="relative block w-full px-4 py-3 text-left"
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

        {/* Divider */}
        <div
          className="relative h-px"
          style={{ background: `${accentColor}25` }}
        />

        {/* Action icon row + inactive Post button */}
        <div className="relative flex items-center justify-between gap-2 px-3 py-2">
          <div className="flex items-center gap-0.5 sm:gap-1">
            {actionIcons.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    expand();
                  }}
                  title={action.title}
                  aria-label={action.label}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-silver"
                >
                  <Icon size={15} />
                </button>
              );
            })}
          </div>

          {/* Inactive Post button — clickable, expands composer */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              expand();
            }}
            title="Write to enable posting"
            className="hidden items-center gap-1.5 rounded-md border px-3 py-1 transition-colors sm:flex"
            style={{
              fontSize: '12px',
              borderColor: `${accentColor}30`,
              color: `${accentColor}80`,
              background: 'transparent',
              opacity: 0.7,
              cursor: 'pointer',
            }}
          >
            <Send size={11} />
            <span>Post</span>
          </button>
        </div>
      </div>
    );
  }

  // Expanded — everything visible
  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border-2 bg-bg-elevated p-4 shadow-lg"
      style={{
        borderColor: `${accentColor}60`,
        boxShadow: `0 0 0 1px ${accentColor}15, 0 4px 12px rgba(0,0,0,0.2)`,
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

      {/* Attachments row — placeholder icons, show coming-soon tooltips */}
      <div className="mb-3">
        <div
          className="mb-1 font-mono uppercase tracking-wider text-text-muted"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          Attach
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: 'image', icon: Image, label: 'Image' },
            { id: 'video', icon: Video, label: 'Video' },
            { id: 'doc', icon: FileText, label: 'Doc' },
            { id: 'location', icon: MapPin, label: 'Location' },
            { id: 'link', icon: Link2, label: 'Link' },
            { id: 'mention', icon: AtSign, label: 'Mention' },
            { id: 'sale', icon: DollarSign, label: 'Sale' },
            { id: 'give', icon: Gift, label: 'Give' },
            { id: 'poll', icon: BarChart3, label: 'Poll' },
            { id: 'prize', icon: Trophy, label: 'Prize' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              disabled
              title={`${label} — coming soon`}
              className="flex items-center gap-1 rounded-md border border-border bg-bg/40 px-2 py-1 text-text-muted opacity-60"
              style={{ fontSize: '11px', cursor: 'not-allowed' }}
            >
              <Icon size={12} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
          <span
            className="ml-1 font-mono text-text-dim"
            style={{ fontSize: '10.5px' }}
            data-size="meta"
          >
            Coming soon
          </span>
        </div>
      </div>

      {/* Inherited context line (reply mode, informational) */}
      {mode === 'reply' && inheritedContext?.realm && (
        <div
          className="mb-3 font-mono text-text-muted"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          Parent thread: {inheritedContext.realm}
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

      {/* Atom picker — always visible */}
      <div className="mb-3">
        <AtomPicker
          value={atomIds}
          onChange={setAtomIds}
          label="Atoms"
          max={10}
          realmContext={{
            realm: realmSel.realm,
            front: realmSel.front,
            l2: realmSel.l2,
          }}
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

      {/* Realm picker — always visible, editable, defaults from context */}
      <div className="mb-3">
        <RealmPicker
          value={realmSel}
          onChange={(next) => {
            setRealmSel(next);
            setRealmManuallyOverridden(true);
          }}
          label="Realm"
          autoDerived={!realmManuallyOverridden && atomIds.length > 0}
          derivedHint={
            !realmManuallyOverridden && atomIds.length > 0
              ? 'Auto-derived from first atom'
              : !realmManuallyOverridden && inheritedContext?.realm
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
