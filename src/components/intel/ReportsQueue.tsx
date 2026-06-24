import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, MessageSquare, FileText, Check, X, Gavel } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  isForumModerator,
  listOpenFlags,
  resolveFlag,
  type ForumFlag,
  type FlagResolution,
} from '@/lib/forumMod';
import { relativeTime } from '@/lib/intel';
import { cn } from '@/lib/utils';

const INTEL_COLOR = '#6B94C8';

/**
 * Mod-only Reports queue (work order §3). Lists open forum_flags with the
 * target context and resolve actions. Gated twice: the sidebar only surfaces
 * the entry for moderators, and this component re-checks is_forum_moderator
 * before reading (RLS is the real boundary — this is UX).
 */
export function ReportsQueue() {
  const { bee } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [flags, setFlags] = useState<ForumFlag[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setAllowed(null);
    setFlags(null);
    setError(null);
    (async () => {
      const mod = await isForumModerator(bee?.id);
      if (cancelled) return;
      setAllowed(mod);
      if (!mod) return;
      try {
        const rows = await listOpenFlags();
        if (!cancelled) setFlags(rows);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load reports');
          setFlags([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bee?.id]);

  async function handleResolve(flagId: number, status: FlagResolution) {
    setPending((prev) => new Set(prev).add(flagId));
    try {
      await resolveFlag(flagId, status);
      // Optimistic: a resolved flag leaves the open queue.
      setFlags((prev) => (prev ? prev.filter((f) => f.id !== flagId) : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to resolve report');
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(flagId);
        return next;
      });
    }
  }

  return (
    <div className="safe-pad-x mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-5 flex items-center gap-2">
        <ShieldAlert size={18} style={{ color: INTEL_COLOR }} />
        <h1 className="font-display tracking-wide text-text-silver-bright" style={{ fontSize: '22px' }}>
          Reports
        </h1>
        {flags && flags.length > 0 && (
          <span
            className="rounded px-1.5 py-0.5 font-mono tabular-nums"
            style={{ fontSize: '11px', color: INTEL_COLOR, background: `${INTEL_COLOR}18` }}
            data-size="meta"
          >
            {flags.length} open
          </span>
        )}
      </div>

      {allowed === null && (
        <p className="font-mono text-text-muted" style={{ fontSize: '12px' }}>
          Checking access…
        </p>
      )}

      {allowed === false && (
        <div className="rounded-lg border border-border bg-bg-elevated p-6 text-text-dim" style={{ fontSize: '13px' }}>
          This queue is for forum moderators.
        </div>
      )}

      {allowed && error && (
        <div className="mb-3 rounded-lg border border-kettle-unsourced/30 bg-bg-elevated p-4 text-kettle-unsourced" style={{ fontSize: '13px' }}>
          {error}
        </div>
      )}

      {allowed && flags !== null && flags.length === 0 && !error && (
        <div
          className="rounded-lg border-2 border-dashed p-8 text-center"
          style={{ borderColor: `${INTEL_COLOR}33`, background: `${INTEL_COLOR}08` }}
        >
          <p className="mb-1 font-display text-text-silver-bright" style={{ fontSize: '16px' }}>
            Queue clear
          </p>
          <p className="text-text-dim" style={{ fontSize: '13px' }}>
            No open reports right now.
          </p>
        </div>
      )}

      {allowed && flags && flags.length > 0 && (
        <ul className="space-y-2">
          {flags.map((flag) => (
            <FlagRow
              key={flag.id}
              flag={flag}
              busy={pending.has(flag.id)}
              onResolve={(status) => handleResolve(flag.id, status)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function FlagRow({
  flag,
  busy,
  onResolve,
}: {
  flag: ForumFlag;
  busy: boolean;
  onResolve: (status: FlagResolution) => void;
}) {
  const KindIcon = flag.targetKind === 'post' ? MessageSquare : FileText;
  const targetUrl = flag.linkThreadId
    ? flag.targetKind === 'post'
      ? `/intel/t/${flag.linkThreadId}#post-${flag.postId}`
      : `/intel/t/${flag.linkThreadId}`
    : null;

  return (
    <li className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5 font-mono uppercase tracking-wider text-text-muted" style={{ fontSize: '10px' }} data-size="meta">
            <KindIcon size={11} />
            {flag.targetKind}
            <span className="text-text-dim">·</span>
            {relativeTime(flag.createdAt)}
          </div>

          {targetUrl ? (
            <Link
              to={targetUrl}
              className="font-display tracking-wide text-text-silver-bright hover:text-text"
              style={{ fontSize: '15px' }}
            >
              {flag.threadTitle ?? 'View target'}
            </Link>
          ) : (
            <span className="font-display tracking-wide text-text-silver" style={{ fontSize: '15px' }}>
              {flag.threadTitle ?? 'Unknown target'}
            </span>
          )}

          <p className="mt-1.5 text-text-dim" style={{ fontSize: '13px', lineHeight: 1.5 }}>
            <span className="text-text-muted">Reason: </span>
            {flag.reason}
          </p>
          {flag.flaggedByHandle && (
            <p className="mt-1 font-mono text-text-muted" style={{ fontSize: '11px' }} data-size="meta">
              reported by @{flag.flaggedByHandle}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <ResolveButton label="Dismiss" icon={<X size={13} />} onClick={() => onResolve('dismissed')} disabled={busy} />
        <ResolveButton label="Reviewed" icon={<Check size={13} />} onClick={() => onResolve('reviewed')} disabled={busy} />
        <ResolveButton
          label="Actioned"
          icon={<Gavel size={13} />}
          onClick={() => onResolve('actioned')}
          disabled={busy}
          emphasis
        />
      </div>
    </li>
  );
}

function ResolveButton({
  label,
  icon,
  onClick,
  disabled,
  emphasis,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  emphasis?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2.5 py-1 font-mono tracking-wide transition-colors',
        emphasis
          ? 'border-kettle-unsourced/40 text-kettle-unsourced hover:bg-kettle-unsourced/10'
          : 'border-border text-text-silver hover:border-border-bright hover:text-text',
        disabled && 'opacity-50',
      )}
      style={{ fontSize: '11px' }}
    >
      {icon}
      {label}
    </button>
  );
}
