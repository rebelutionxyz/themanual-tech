import { useState, useMemo, useEffect, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MessagesSquare, Send, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useManualData } from '@/lib/useManualData';
import { createThread } from '@/lib/intel';
import { AtomPicker } from '@/components/intel/AtomPicker';
import { RealmPathPicker } from '@/components/intel/RealmPathPicker';
import { useIntelStore } from '@/stores/useIntelStore';
import { REALM_NAMES, REALM_ID_BY_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { RealmId } from '@/types/manual';

/** Build a display-name path from realm + L2. */
function buildPath(realmId: RealmId | null, l2: string | null): string[] {
  if (!realmId) return [];
  return [REALM_NAMES[realmId], l2].filter((s): s is string => Boolean(s));
}

/**
 * Thread composer — /intel/new
 * Reads initial realm context from the IntelStore (set by the realm bar above).
 */
export function NewThreadPage() {
  const { bee, configured } = useAuth();
  const navigate = useNavigate();
  const { atoms } = useManualData();

  const urlRealmId = useIntelStore((s) => s.selectedRealmId);
  const urlL2 = useIntelStore((s) => s.selectedL2);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [atomIds, setAtomIds] = useState<string[]>([]);
  const [realmPath, setRealmPath] = useState<string[]>(() => buildPath(urlRealmId, urlL2));
  const [realmManuallyOverridden, setRealmManuallyOverridden] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const realmId = realmPath[0]
    ? (REALM_ID_BY_NAME[realmPath[0]] as RealmId | undefined) ?? null
    : null;
  const l2 = realmPath[1] ?? null;

  // Hydrate draft from sessionStorage (handed off by the InlineComposer "Expand" button)
  useEffect(() => {
    const raw = sessionStorage.getItem('composer-draft');
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      if (draft.title) setTitle(draft.title);
      if (draft.body) setBody(draft.body);
      if (Array.isArray(draft.atomIds)) setAtomIds(draft.atomIds);
      const draftPath: string[] = Array.isArray(draft.realmPath)
        ? draft.realmPath
        : buildPath(draft.realmId ?? null, draft.l2 ?? null);
      if (draftPath.length > 0) {
        setRealmPath(draftPath);
        setRealmManuallyOverridden(true);
      }
    } catch {
      // ignore corrupt draft
    }
    sessionStorage.removeItem('composer-draft');
  }, []);

  const derivedPath = useMemo(() => {
    if (atomIds.length === 0) return null;
    const first = atoms.find((a) => a.id === atomIds[0]);
    if (!first) return null;
    return [REALM_NAMES[first.realmId]];
  }, [atomIds, atoms]);

  useEffect(() => {
    if (derivedPath && !realmManuallyOverridden) {
      setRealmPath(derivedPath);
    }
    if (atomIds.length === 0 && !realmManuallyOverridden) {
      setRealmPath(buildPath(urlRealmId, urlL2));
    }
  }, [derivedPath, realmManuallyOverridden, atomIds.length, urlRealmId, urlL2]);

  const hasRealm = realmPath.length > 0;
  const hasAtoms = atomIds.length > 0;
  const categorizationOk = hasRealm || hasAtoms;
  const canSubmit =
    title.trim().length >= 2 &&
    body.trim().length >= 1 &&
    categorizationOk &&
    !submitting &&
    !!bee;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || !bee) return;

    const finalPath =
      realmPath.length > 0
        ? realmPath
        : derivedPath ?? [];
    const finalRealmId =
      realmId ?? (derivedPath ? REALM_ID_BY_NAME[derivedPath[0]] ?? null : null);

    setSubmitting(true);
    setError(null);
    try {
      const id = await createThread(
        {
          title: title.trim(),
          body,
          atomIds,
          primaryRealm: finalRealmId,
          primaryL2: finalPath[1] ?? null,
          realmPath: finalPath,
        },
        bee.id,
      );
      navigate(`/intel/t/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create thread');
      setSubmitting(false);
    }
  }

  if (!bee) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="flex items-center gap-3">
          <Link
            to="/intel"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-text-silver hover:bg-bg-elevated"
            aria-label="Back to INTEL"
          >
            <ArrowLeft size={16} />
          </Link>
          <h1 className="font-display text-2xl font-semibold text-text-silver-bright">
            Sign in to start a thread
          </h1>
        </div>
        <div className="mt-6 rounded-lg border border-border bg-bg-elevated p-6">
          <p className="text-text-silver" style={{ fontSize: '14px' }}>
            Anyone can read INTEL. To start a thread, you need to be a Bee.
          </p>
          <Link
            to="/login"
            className="mt-4 inline-block rounded-md border border-text-silver/30 bg-bg-elevated px-4 py-2 text-text-silver-bright hover:border-text-silver/60"
            style={{ fontSize: '13px' }}
          >
            Sign in or sign up →
          </Link>
        </div>
      </div>
    );
  }

  const usingDerived =
    !realmManuallyOverridden && !!derivedPath && hasAtoms;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 md:px-10 md:py-12">
      <div className="mb-6 flex items-center gap-3">
        <Link
          to="/intel"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-border text-text-silver hover:bg-bg-elevated"
          aria-label="Back to INTEL"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="min-w-0 flex-1">
          <div
            className="font-mono uppercase tracking-wider text-text-muted"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            INTEL · new thread
          </div>
          <h1 className="font-display text-2xl font-semibold text-text-silver-bright">
            Start a discussion
          </h1>
        </div>
        <MessagesSquare size={20} style={{ color: '#6B94C8' }} />
      </div>

      {urlRealmId && !realmManuallyOverridden && (
        <div className="mb-5 rounded-md border border-border bg-bg-elevated p-3">
          <div
            className="mb-1 flex items-center gap-1.5 font-mono uppercase tracking-wider text-text-muted"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            <Sparkles size={11} />
            Creating in
          </div>
          <div className="text-text-silver" style={{ fontSize: '13px' }}>
            {REALM_NAMES[urlRealmId]}
            {urlL2 && ` · ${urlL2}`}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block">
            <span
              className="mb-1.5 block font-mono uppercase tracking-wider text-text-muted"
              style={{ fontSize: '11px' }}
              data-size="meta"
            >
              Title
              <span className="ml-1 text-kettle-unsourced">*</span>
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={300}
              placeholder="What's this thread about?"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text placeholder:text-text-muted focus:border-text-silver/50 focus:outline-none focus:ring-1 focus:ring-text-silver/30"
              style={{ fontSize: '15px' }}
              required
            />
          </label>
          <div
            className="mt-1 text-right font-mono text-text-muted"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            {title.length}/300
          </div>
        </div>

        <div>
          <label className="block">
            <span
              className="mb-1.5 block font-mono uppercase tracking-wider text-text-muted"
              style={{ fontSize: '11px' }}
              data-size="meta"
            >
              Body
              <span className="ml-1 text-kettle-unsourced">*</span>
            </span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Make your case. Cite sources. Link atoms below."
              rows={8}
              className="w-full resize-y rounded-md border border-border bg-bg px-3 py-2 text-text placeholder:text-text-muted focus:border-text-silver/50 focus:outline-none focus:ring-1 focus:ring-text-silver/30"
              style={{ fontSize: '14px', lineHeight: '1.6' }}
              required
            />
          </label>
        </div>

        <AtomPicker
          value={atomIds}
          onChange={setAtomIds}
          label="Linked atoms"
          max={10}
          searchOnly={true}
          realmContext={{
            realmId: realmId ?? urlRealmId,
            l2: l2 ?? urlL2,
          }}
        />

        <RealmPathPicker
          value={realmPath}
          onChange={(next) => {
            setRealmPath(next);
            setRealmManuallyOverridden(true);
          }}
          label="Realm"
          autoDerived={!!usingDerived}
          derivedHint={
            usingDerived
              ? `Auto-derived from linked atom "${atoms.find((a) => a.id === atomIds[0])?.name ?? ''}". You can override.`
              : undefined
          }
          required={!hasAtoms}
          error={!categorizationOk && title.length > 0 ? 'Link atoms or pick a realm' : undefined}
        />

        {error && (
          <div className="rounded-md border border-kettle-unsourced/30 bg-kettle-unsourced/10 p-3">
            <p className="text-kettle-unsourced" style={{ fontSize: '12px' }}>
              {error}
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Link
            to="/intel"
            className="rounded-md px-4 py-2 text-text-silver hover:bg-bg-elevated"
            style={{ fontSize: '13px' }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              'flex items-center gap-1.5 rounded-md border px-4 py-2 transition-all',
              canSubmit
                ? 'border-text-silver/40 bg-bg-elevated text-text-silver-bright hover:border-text-silver/70 hover:bg-panel-2'
                : 'cursor-not-allowed border-border bg-bg-elevated text-text-dim opacity-60',
            )}
            style={{ fontSize: '13px' }}
          >
            <Send size={14} />
            {submitting ? 'Posting...' : 'Post thread'}
          </button>
        </div>

        {!configured && (
          <div className="rounded-md border border-kettle-contested/30 bg-kettle-contested/10 p-3">
            <p className="text-kettle-contested" style={{ fontSize: '12px' }}>
              Supabase not configured. Posting disabled.
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
