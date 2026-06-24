import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Users, Lock, EyeOff, Globe, UserPlus, MessageSquare, Clock, ArrowLeft } from 'lucide-react';
import {
  getGroupBySlug,
  getMyRole,
  listMembers,
  listGroupThreads,
  joinGroup,
  leaveGroup,
  addMember,
  setRole,
  removeMember,
  findBeeByHandle,
  createGroupThread,
  type Group,
  type GroupMember,
  type GroupRole,
  type GroupThread,
} from '@/lib/groups';
import { relativeTime } from '@/lib/intel';
import { useAuth } from '@/lib/auth';
import { cn, formatCount } from '@/lib/utils';

const UNITE_COLOR = '#6FCF8F';

export function GroupPage() {
  const { slug } = useParams<{ slug: string }>();
  const { bee } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [myRole, setMyRole] = useState<GroupRole | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [threads, setThreads] = useState<GroupThread[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isMember = myRole !== null;
  const isMod = myRole === 'owner' || myRole === 'moderator';
  const isOwner = myRole === 'owner';

  const refresh = useCallback(async () => {
    if (!slug) return;
    setError(null);
    const g = await getGroupBySlug(slug);
    if (!g) {
      setNotFound(true);
      return;
    }
    setGroup(g);
    const [role, mem, thr] = await Promise.all([
      bee?.id ? getMyRole(g.id, bee.id) : Promise.resolve(null),
      listMembers(g.id),
      listGroupThreads(g.id),
    ]);
    setMyRole(role);
    setMembers(mem);
    setThreads(thr);
  }, [slug, bee?.id]);

  useEffect(() => {
    setGroup(null);
    setNotFound(false);
    refresh().catch((e) => setError(e instanceof Error ? e.message : 'Failed to load group'));
  }, [refresh]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  if (notFound) {
    return (
      <div className="safe-pad-x mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-text-silver" style={{ fontSize: '15px' }}>
          This group doesn't exist, or it's private.
        </p>
        <Link to="/unite" className="mt-3 inline-block" style={{ color: UNITE_COLOR, fontSize: '13px' }}>
          ← Back to Groups
        </Link>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="safe-pad-x mx-auto max-w-3xl px-4 py-10">
        <div className="h-7 w-48 animate-pulse-slow rounded bg-text-muted/15" />
        <div className="mt-3 h-4 w-72 animate-pulse-slow rounded bg-text-muted/10" />
      </div>
    );
  }

  const VisIcon = group.visibility === 'public' ? Globe : group.visibility === 'private' ? Lock : EyeOff;

  return (
    <div className="min-h-full" style={{ background: `${UNITE_COLOR}0D` }}>
      <div className="safe-pad-x mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
        <Link to="/unite" className="mb-3 inline-flex items-center gap-1 font-mono text-text-muted hover:text-text-silver" style={{ fontSize: '11px' }} data-size="meta">
          <ArrowLeft size={11} /> Groups
        </Link>

        {/* Header */}
        <div className="rounded-lg border border-border bg-bg-elevated p-5" style={{ borderLeft: `3px solid ${UNITE_COLOR}` }}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display tracking-wide text-text-silver-bright" style={{ fontSize: '24px' }}>
                {group.name}
              </h1>
              {group.tagline && (
                <p className="mt-1 text-text-silver" style={{ fontSize: '14px' }}>
                  {group.tagline}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-text-muted" style={{ fontSize: '11px' }} data-size="meta">
                <span className="inline-flex items-center gap-1">
                  <VisIcon size={11} /> {group.visibility}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users size={11} /> {formatCount(group.memberCount)} {group.memberCount === 1 ? 'member' : 'members'}
                </span>
              </div>
            </div>
            <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
              {!isMember && group.visibility === 'public' && bee && (
                <ActionButton onClick={() => run(() => joinGroup(group.id))} disabled={busy} primary>
                  Join
                </ActionButton>
              )}
              {isMember && (
                <ActionButton onClick={() => run(() => leaveGroup(group.id))} disabled={busy}>
                  Leave
                </ActionButton>
              )}
              {myRole && (
                <span className="font-mono uppercase tracking-wider text-text-muted" style={{ fontSize: '9.5px' }} data-size="meta">
                  you · {myRole}
                </span>
              )}
            </div>
          </div>
          {group.description && (
            <p className="mt-3 whitespace-pre-wrap border-t border-border pt-3 text-text-dim" style={{ fontSize: '13px', lineHeight: 1.6 }}>
              {group.description}
            </p>
          )}
        </div>

        {error && (
          <p className="mt-3 text-kettle-unsourced" style={{ fontSize: '12px' }}>
            {error}
          </p>
        )}

        {/* Members */}
        <section className="mt-6">
          <h2 className="mb-2 font-mono uppercase tracking-widest text-text-muted" style={{ fontSize: '11px' }} data-size="meta">
            Members
          </h2>
          {isMod && (
            <AddMemberControl groupId={group.id} disabled={busy} onAdded={refresh} onError={setError} />
          )}
          <ul className="mt-2 divide-y divide-border overflow-hidden rounded-lg border border-border bg-bg-elevated">
            {members.map((m) => (
              <MemberRow
                key={m.beeId}
                member={m}
                canManage={isMod}
                canSetRole={isOwner}
                isSelf={m.beeId === bee?.id}
                disabled={busy}
                onSetRole={(role) => run(() => setRole(group.id, m.beeId, role))}
                onRemove={() => run(() => removeMember(group.id, m.beeId))}
              />
            ))}
          </ul>
        </section>

        {/* Discussion */}
        <section className="mt-6">
          <h2 className="mb-2 font-mono uppercase tracking-widest text-text-muted" style={{ fontSize: '11px' }} data-size="meta">
            Discussion
          </h2>
          {isMember && <GroupThreadComposer groupId={group.id} onPosted={refresh} />}
          {threads.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-bg-elevated/40 p-6 text-center text-text-dim" style={{ fontSize: '13px' }}>
              No discussion yet.{isMember ? ' Start the first thread.' : ''}
            </div>
          ) : (
            <ul className="space-y-2">
              {threads.map((t) => (
                <li key={t.id}>
                  <Link
                    to={`/intel/t/${t.id}`}
                    className="group block rounded-lg border border-border bg-bg-elevated p-3 transition-all hover:border-border-bright hover:bg-panel-2"
                  >
                    <h3 className="font-display leading-tight text-text-silver-bright group-hover:text-text" style={{ fontSize: '15px' }}>
                      {t.title}
                    </h3>
                    {t.body && (
                      <p className="mt-1 line-clamp-1 text-text-dim" style={{ fontSize: '12.5px' }}>
                        {t.body}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-3 font-mono text-text-muted" style={{ fontSize: '10.5px' }} data-size="meta">
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare size={10} /> {t.replyCount}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock size={10} /> {relativeTime(t.lastActivityAt)}
                      </span>
                      {t.authorHandle && <span>@{t.authorHandle}</span>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  primary,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center rounded-md px-4 py-1.5 font-medium transition-colors disabled:opacity-50',
        primary ? 'text-bg hover:brightness-110' : 'border border-border text-text-silver hover:border-border-bright',
      )}
      style={{ fontSize: '13px', ...(primary ? { background: UNITE_COLOR } : {}) }}
    >
      {children}
    </button>
  );
}

const ROLE_OPTS: GroupRole[] = ['member', 'moderator', 'owner'];

function MemberRow({
  member,
  canManage,
  canSetRole,
  isSelf,
  disabled,
  onSetRole,
  onRemove,
}: {
  member: GroupMember;
  canManage: boolean;
  canSetRole: boolean;
  isSelf: boolean;
  disabled?: boolean;
  onSetRole: (role: GroupRole) => void;
  onRemove: () => void;
}) {
  // A moderator may remove plain members only; owners manage everyone.
  const removable = canManage && !isSelf && (canSetRole || member.role === 'member');
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2">
      <div className="min-w-0">
        <span className="text-text-silver-bright" style={{ fontSize: '13px' }}>
          {member.name ?? (member.handle ? `@${member.handle}` : 'Bee')}
        </span>
        {member.name && member.handle && (
          <span className="ml-1.5 font-mono text-text-muted" style={{ fontSize: '11px' }} data-size="meta">
            @{member.handle}
          </span>
        )}
      </div>
      <div className="flex flex-shrink-0 items-center gap-1.5">
        {canSetRole && !isSelf ? (
          <select
            value={member.role}
            disabled={disabled}
            onChange={(e) => onSetRole(e.target.value as GroupRole)}
            className="rounded border border-border bg-bg px-1.5 py-0.5 font-mono text-text-silver outline-none focus:border-border-bright"
            style={{ fontSize: '11px' }}
            aria-label={`Role for ${member.handle ?? 'member'}`}
          >
            {ROLE_OPTS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        ) : (
          <span
            className="rounded px-1.5 py-0.5 font-mono uppercase tracking-wider"
            style={{
              fontSize: '9.5px',
              color: member.role === 'member' ? '#8A94A0' : UNITE_COLOR,
              background: member.role === 'member' ? 'transparent' : `${UNITE_COLOR}15`,
            }}
            data-size="meta"
          >
            {member.role}
          </span>
        )}
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="rounded px-1.5 py-0.5 font-mono text-text-muted transition-colors hover:text-kettle-unsourced disabled:opacity-50"
            style={{ fontSize: '11px' }}
          >
            Remove
          </button>
        )}
      </div>
    </li>
  );
}

function AddMemberControl({
  groupId,
  disabled,
  onAdded,
  onError,
}: {
  groupId: string;
  disabled?: boolean;
  onAdded: () => Promise<void> | void;
  onError: (msg: string) => void;
}) {
  const [handle, setHandle] = useState('');
  const [pending, setPending] = useState(false);

  async function add() {
    const h = handle.trim();
    if (!h || pending) return;
    setPending(true);
    try {
      const found = await findBeeByHandle(h);
      if (!found) {
        onError(`No Bee with handle @${h.replace(/^@/, '')}`);
        return;
      }
      await addMember(groupId, found.id, 'member');
      setHandle('');
      await onAdded();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to add member');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative flex-1">
        <span className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2 text-text-muted">
          <UserPlus size={13} />
        </span>
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add member by @handle"
          disabled={disabled || pending}
          className="w-full rounded-md border border-border bg-bg py-1.5 pr-3 pl-7 text-text outline-none focus:border-border-bright"
          style={{ fontSize: '13px' }}
        />
      </div>
      <button
        type="button"
        onClick={add}
        disabled={disabled || pending || !handle.trim()}
        className="rounded-md px-3 py-1.5 font-medium text-bg transition-colors hover:brightness-110 disabled:opacity-50"
        style={{ background: UNITE_COLOR, fontSize: '13px' }}
      >
        {pending ? '…' : 'Add'}
      </button>
    </div>
  );
}

function GroupThreadComposer({ groupId, onPosted }: { groupId: string; onPosted: () => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post() {
    if (!title.trim() || posting) return;
    setPosting(true);
    setError(null);
    try {
      await createGroupThread(groupId, title.trim(), body.trim());
      setTitle('');
      setBody('');
      setOpen(false);
      await onPosted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post');
    } finally {
      setPosting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-2 w-full rounded-lg border border-dashed border-border bg-bg-elevated/40 px-4 py-2.5 text-left text-text-dim transition-colors hover:border-border-bright hover:text-text-silver"
        style={{ fontSize: '13px' }}
      >
        Start a discussion thread…
      </button>
    );
  }

  return (
    <div className="mb-2 rounded-lg border border-border bg-bg-elevated p-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Thread title"
        className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-border-bright"
        style={{ fontSize: '14px' }}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Say something…"
        className="mt-2 w-full resize-none rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-border-bright"
        style={{ fontSize: '14px', lineHeight: 1.5 }}
      />
      {error && (
        <p className="mt-1 text-kettle-unsourced" style={{ fontSize: '12px' }}>
          {error}
        </p>
      )}
      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-3 py-1.5 text-text-dim hover:text-text"
          style={{ fontSize: '13px' }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={post}
          disabled={!title.trim() || posting}
          className="rounded-md px-4 py-1.5 font-medium text-bg transition-colors hover:brightness-110 disabled:opacity-50"
          style={{ background: UNITE_COLOR, fontSize: '13px' }}
        >
          {posting ? 'Posting…' : 'Post'}
        </button>
      </div>
    </div>
  );
}
