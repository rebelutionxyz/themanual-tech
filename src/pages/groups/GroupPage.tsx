import { FollowBeeButton } from '@/components/intel/FollowBeeButton';
import { useAuth } from '@/lib/auth';
import {
  type Group,
  type GroupMember,
  type GroupRole,
  type GroupThread,
  addMember,
  createGroupThread,
  findBeeByHandle,
  getGroupBySlug,
  getMyRole,
  joinGroup,
  leaveGroup,
  listGroupThreads,
  listMembers,
  removeMember,
  setRole,
} from '@/lib/groups';
import { relativeTime } from '@/lib/intel';
import { isSaved, toggleSave } from '@/lib/reactions';
import { cn, formatCount } from '@/lib/utils';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Clock,
  EyeOff,
  Globe,
  Lock,
  MessageSquare,
  UserPlus,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

// UNITE purple — canonical accent (matches GroupsPage + CommunityLayout).
const UNITE_COLOR = '#7C3AED';

/** Sidebar counts (My Groups badge) re-pull; fired after join/leave. */
function fireUniteCountsRefresh() {
  window.dispatchEvent(new CustomEvent('unite-counts-refresh'));
}

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
      <div className="safe-pad-x mx-auto max-w-3xl bg-white px-4 py-12 text-center">
        <p className="text-zinc-600" style={{ fontSize: '15px' }}>
          This group doesn't exist, or it's private.
        </p>
        <Link
          to="/unite"
          className="mt-3 inline-block"
          style={{ color: UNITE_COLOR, fontSize: '13px' }}
        >
          ← Back to Groups
        </Link>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="safe-pad-x mx-auto max-w-3xl px-4 py-10">
        <div className="h-7 w-48 animate-pulse-slow rounded bg-zinc-200" />
        <div className="mt-3 h-4 w-72 animate-pulse-slow rounded bg-zinc-100" />
      </div>
    );
  }

  const VisIcon =
    group.visibility === 'public' ? Globe : group.visibility === 'private' ? Lock : EyeOff;

  return (
    <div className="min-h-full bg-white">
      <div className="safe-pad-x mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
        <Link
          to="/unite"
          className="mb-3 inline-flex items-center gap-1 font-mono text-zinc-500 transition-colors hover:text-zinc-800"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          <ArrowLeft size={11} /> Groups
        </Link>

        {/* Header */}
        <div
          className="rounded-lg border border-zinc-200 bg-white p-5"
          style={{ borderLeft: `3px solid ${UNITE_COLOR}` }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display tracking-wide text-zinc-900" style={{ fontSize: '24px' }}>
                {group.name}
              </h1>
              {group.tagline && (
                <p className="mt-1 text-zinc-600" style={{ fontSize: '14px' }}>
                  {group.tagline}
                </p>
              )}
              <div
                className="mt-2 flex flex-wrap items-center gap-3 font-mono text-zinc-500"
                style={{ fontSize: '11px' }}
                data-size="meta"
              >
                <span className="inline-flex items-center gap-1">
                  <VisIcon size={11} /> {group.visibility}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users size={11} /> {formatCount(group.memberCount)}{' '}
                  {group.memberCount === 1 ? 'member' : 'members'}
                </span>
              </div>
            </div>
            <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
              {!isMember && group.visibility === 'public' && bee && (
                <ActionButton
                  onClick={() =>
                    run(async () => {
                      await joinGroup(group.id);
                      fireUniteCountsRefresh();
                    })
                  }
                  disabled={busy}
                  primary
                >
                  Join
                </ActionButton>
              )}
              {/* Watching = a Bookmark (entity_saves 'unite') — private save,
                  lands on the Bookmarked page. Members can watch too. */}
              {bee?.id && <WatchButton groupId={group.id} beeId={bee.id} />}
              {isMember && (
                <ActionButton
                  onClick={() =>
                    run(async () => {
                      await leaveGroup(group.id);
                      fireUniteCountsRefresh();
                    })
                  }
                  disabled={busy}
                >
                  Leave
                </ActionButton>
              )}
              {myRole && (
                <span
                  className="font-mono uppercase tracking-wider text-zinc-500"
                  style={{ fontSize: '9.5px' }}
                  data-size="meta"
                >
                  you · {myRole}
                </span>
              )}
            </div>
          </div>
          {group.description && (
            <p
              className="mt-3 whitespace-pre-wrap border-t border-zinc-200 pt-3 text-zinc-600"
              style={{ fontSize: '13px', lineHeight: 1.6 }}
            >
              {group.description}
            </p>
          )}
        </div>

        {error && (
          <p className="mt-3 text-red-600" style={{ fontSize: '12px' }}>
            {error}
          </p>
        )}

        {/* Members */}
        <section className="mt-6">
          <h2
            className="mb-2 font-mono uppercase tracking-widest text-zinc-500"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            Members
          </h2>
          {isMod && (
            <AddMemberControl
              groupId={group.id}
              disabled={busy}
              onAdded={refresh}
              onError={setError}
            />
          )}
          <ul className="mt-2 divide-y divide-zinc-100 overflow-hidden rounded-lg border border-zinc-200 bg-white">
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
          <h2
            className="mb-2 font-mono uppercase tracking-widest text-zinc-500"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            Discussion
          </h2>
          {isMember && <GroupThreadComposer groupId={group.id} onPosted={refresh} />}
          {threads.length === 0 ? (
            <div
              className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center text-zinc-500"
              style={{ fontSize: '13px' }}
            >
              No discussion yet.{isMember ? ' Start the first thread.' : ''}
            </div>
          ) : (
            <ul className="space-y-2">
              {threads.map((t) => (
                <li key={t.id}>
                  <Link
                    to={`/intel/t/${t.id}`}
                    className="group block rounded-lg border border-zinc-200 bg-white p-3 transition-shadow hover:shadow-md"
                  >
                    <h3
                      className="font-display leading-tight text-zinc-900"
                      style={{ fontSize: '15px' }}
                    >
                      {t.title}
                    </h3>
                    {t.body && (
                      <p className="mt-1 line-clamp-1 text-zinc-600" style={{ fontSize: '12.5px' }}>
                        {t.body}
                      </p>
                    )}
                    <div
                      className="mt-2 flex items-center gap-3 font-mono text-zinc-500"
                      style={{ fontSize: '10.5px' }}
                      data-size="meta"
                    >
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
        primary
          ? 'text-bg hover:brightness-110'
          : 'border border-zinc-200 text-zinc-600 hover:border-zinc-400',
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
        <span className="text-zinc-900" style={{ fontSize: '13px' }}>
          {member.name ?? (member.handle ? `@${member.handle}` : 'Bee')}
        </span>
        {member.name && member.handle && (
          <span
            className="ml-1.5 font-mono text-zinc-500"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            @{member.handle}
          </span>
        )}
      </div>
      <div className="flex flex-shrink-0 items-center gap-1.5">
        {/* Follow the Bee (bee_follows) — feeds the INTEL Following feed.
            Self + signed-out cases hide inside the button. */}
        <FollowBeeButton beeId={member.beeId} accent={UNITE_COLOR} />
        {canSetRole && !isSelf ? (
          <select
            value={member.role}
            disabled={disabled}
            onChange={(e) => onSetRole(e.target.value as GroupRole)}
            className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 font-mono text-zinc-700 outline-none focus:border-zinc-400"
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
              color: member.role === 'member' ? '#536471' : UNITE_COLOR,
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
            className="rounded px-1.5 py-0.5 font-mono text-zinc-400 transition-colors hover:text-red-600 disabled:opacity-50"
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
        <span className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2 text-zinc-400">
          <UserPlus size={13} />
        </span>
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add member by @handle"
          disabled={disabled || pending}
          className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pr-3 pl-7 text-zinc-900 outline-none focus:border-zinc-400"
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

function GroupThreadComposer({
  groupId,
  onPosted,
}: { groupId: string; onPosted: () => Promise<void> | void }) {
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
        className="mb-2 w-full rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-2.5 text-left text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-700"
        style={{ fontSize: '13px' }}
      >
        Start a discussion thread…
      </button>
    );
  }

  return (
    <div className="mb-2 rounded-lg border border-zinc-200 bg-white p-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Thread title"
        className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-400"
        style={{ fontSize: '14px' }}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Say something…"
        className="mt-2 w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-400"
        style={{ fontSize: '14px', lineHeight: 1.5 }}
      />
      {error && (
        <p className="mt-1 text-red-600" style={{ fontSize: '12px' }}>
          {error}
        </p>
      )}
      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-3 py-1.5 text-zinc-500 hover:text-zinc-800"
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

// Bookmark gold — matches the Bookmarked accent (ThreadList savedMode).
const WATCH_GOLD = '#FAD15E';
const WATCH_INK = '#8A6D1A';

/**
 * Watch / Watching toggle — a Bookmark on the group (entity_saves,
 * source_surface 'unite'). "Bookmarked = Watching": private, no follow
 * edge, no owner notification. Fires `intel-counts-refresh` so the
 * Bookmarked badge + page stay honest.
 */
function WatchButton({ groupId, beeId }: { groupId: string; beeId: string }) {
  const [watching, setWatching] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    isSaved(groupId, beeId)
      .then((s) => !cancelled && setWatching(s))
      .catch(() => !cancelled && setWatching(false));
    return () => {
      cancelled = true;
    };
  }, [groupId, beeId]);

  if (watching === null) return null;

  async function toggle() {
    if (busy) return;
    const next = !watching;
    setBusy(true);
    setWatching(next);
    try {
      await toggleSave('unite', groupId, beeId);
      window.dispatchEvent(new CustomEvent('intel-counts-refresh'));
    } catch (err) {
      console.warn('watch toggle failed:', err);
      setWatching(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      title={watching ? 'Stop watching this group' : 'Watch this group — lands in Bookmarked'}
      className="inline-flex flex-shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold transition-all disabled:opacity-60"
      style={
        watching
          ? { borderColor: `${WATCH_GOLD}`, color: WATCH_INK, background: `${WATCH_GOLD}30` }
          : { borderColor: `${WATCH_GOLD}90`, color: WATCH_INK, background: 'transparent' }
      }
    >
      {watching ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
      {watching ? 'Watching' : 'Watch'}
    </button>
  );
}
