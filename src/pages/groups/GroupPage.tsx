import { CreateEventModal } from '@/components/events/CreateEventModal';
import { EditGroupModal } from '@/components/groups/EditGroupModal';
import { FollowBeeButton } from '@/components/intel/FollowBeeButton';
import { MediaLightbox } from '@/components/studio/MediaLightbox';
import { MediaPicker } from '@/components/studio/MediaPicker';
import { useAuth } from '@/lib/auth';
import { type EventItem, listEventsByGroup } from '@/lib/events';
import {
  type AlbumImage,
  type Group,
  type GroupActivityItem,
  type GroupMember,
  type GroupRole,
  type GroupThread,
  addMember,
  createGroupThread,
  deleteGroupAlbumImage,
  findBeeByHandle,
  getGroupActivity,
  getGroupBySlug,
  getMyRole,
  joinGroup,
  leaveGroup,
  listGroupAlbum,
  listGroupThreads,
  listMembers,
  removeMember,
  setRole,
  updateGroupDetails,
  uploadGroupImage,
} from '@/lib/groups';
import { relativeTime } from '@/lib/intel';
import { assetUrl } from '@/lib/media';
import { isSaved, toggleSave } from '@/lib/reactions';
import { cn, formatCount } from '@/lib/utils';
import {
  Activity,
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Calendar,
  CalendarPlus,
  Camera,
  Clapperboard,
  Clock,
  EyeOff,
  FolderOpen,
  Globe,
  Image as ImageIcon,
  ImagePlus,
  Lock,
  type LucideIcon,
  MapPin,
  MessageSquare,
  Pencil,
  Reply,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

// UNITE purple — canonical accent (matches GroupsPage + CommunityLayout).
const UNITE_COLOR = '#7C3AED';

/** Sidebar counts (My Groups badge) re-pull; fired after join/leave. */
function fireUniteCountsRefresh() {
  window.dispatchEvent(new CustomEvent('unite-counts-refresh'));
}

type GroupTab = 'activity' | 'forums' | 'events' | 'images' | 'videos' | 'members';

const TABS: { id: GroupTab; label: string; icon: LucideIcon }[] = [
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'forums', label: 'Forums', icon: MessageSquare },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'images', label: 'Images', icon: ImageIcon },
  { id: 'videos', label: 'Videos', icon: Clapperboard },
  { id: 'members', label: 'Members', icon: Users },
];

export function GroupPage() {
  const { slug } = useParams<{ slug: string }>();
  const { bee } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [group, setGroup] = useState<Group | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [myRole, setMyRole] = useState<GroupRole | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [threads, setThreads] = useState<GroupThread[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState<'avatar' | 'cover' | null>(null);

  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const rawTab = searchParams.get('tab') as GroupTab | null;
  const tab: GroupTab = TABS.some((t) => t.id === rawTab) && rawTab ? rawTab : 'activity';
  const setTab = (id: GroupTab) =>
    setSearchParams(id === 'activity' ? {} : { tab: id }, { replace: true });

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

  async function onProfileImagePicked(kind: 'avatar' | 'cover', file: File | undefined) {
    if (!file || !group || uploadingProfile) return;
    setUploadingProfile(kind);
    setError(null);
    try {
      const url = await uploadGroupImage(group.id, kind, file);
      await updateGroupDetails(
        group.id,
        kind === 'avatar' ? { avatar_url: url } : { cover_url: url },
      );
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploadingProfile(null);
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
        <div className="h-36 animate-pulse-slow rounded-lg bg-zinc-100 md:h-48" />
        <div className="mt-4 h-7 w-48 animate-pulse-slow rounded bg-zinc-200" />
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

        {/* Cover + avatar */}
        <div className="relative">
          <div className="h-36 overflow-hidden rounded-lg border border-zinc-200 md:h-48">
            {group.coverUrl ? (
              <img src={group.coverUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div
                className="h-full w-full"
                style={{
                  background: `linear-gradient(135deg, ${UNITE_COLOR}14 0%, ${UNITE_COLOR}55 100%)`,
                }}
              />
            )}
          </div>
          {isOwner && (
            <>
              <button
                type="button"
                onClick={() => coverInput.current?.click()}
                disabled={uploadingProfile !== null}
                className="absolute right-2 bottom-2 inline-flex items-center gap-1.5 rounded-md bg-black/55 px-2.5 py-1 text-white backdrop-blur-sm transition-colors hover:bg-black/70 disabled:opacity-60"
                style={{ fontSize: '11.5px' }}
              >
                <Camera size={12} />
                {uploadingProfile === 'cover' ? 'Uploading…' : 'Change cover'}
              </button>
              <input
                ref={coverInput}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => onProfileImagePicked('cover', e.target.files?.[0])}
              />
            </>
          )}

          <div className="-bottom-8 absolute left-4 md:left-6">
            <div className="relative">
              <div className="h-20 w-20 overflow-hidden rounded-xl border-4 border-white bg-white shadow-md">
                {group.avatarUrl ? (
                  <img src={group.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center font-display"
                    style={{ background: `${UNITE_COLOR}18`, color: UNITE_COLOR, fontSize: '30px' }}
                  >
                    {group.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {isOwner && (
                <>
                  <button
                    type="button"
                    onClick={() => avatarInput.current?.click()}
                    disabled={uploadingProfile !== null}
                    className="-right-1.5 -bottom-1.5 absolute rounded-full border border-zinc-200 bg-white p-1.5 text-zinc-600 shadow-sm transition-colors hover:text-zinc-900 disabled:opacity-60"
                    aria-label="Change avatar"
                    title={uploadingProfile === 'avatar' ? 'Uploading…' : 'Change avatar'}
                  >
                    <Camera size={12} />
                  </button>
                  <input
                    ref={avatarInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => onProfileImagePicked('avatar', e.target.files?.[0])}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="mt-10 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display tracking-wide text-zinc-900" style={{ fontSize: '24px' }}>
              {group.name}
            </h1>
            {group.tagline && (
              <p className="mt-0.5 text-zinc-600" style={{ fontSize: '14px' }}>
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
              {group.locationText && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={11} /> {group.locationText}
                </span>
              )}
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
            {isOwner && (
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2.5 py-0.5 font-semibold text-[11.5px] text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900"
              >
                <Pencil size={11} /> Edit
              </button>
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
            className="mt-3 whitespace-pre-wrap text-zinc-600"
            style={{ fontSize: '13px', lineHeight: 1.6 }}
          >
            {group.description}
          </p>
        )}

        {error && (
          <p className="mt-3 text-red-600" style={{ fontSize: '12px' }}>
            {error}
          </p>
        )}

        {/* Toolbar */}
        <div className="mt-5 flex gap-0.5 overflow-x-auto border-zinc-200 border-b">
          {TABS.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'inline-flex flex-shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 font-medium transition-colors',
                  active ? '' : 'border-transparent text-zinc-500 hover:text-zinc-800',
                )}
                style={{
                  fontSize: '12.5px',
                  ...(active ? { color: UNITE_COLOR, borderColor: UNITE_COLOR } : {}),
                }}
              >
                <Icon size={13} />
                {t.label}
                {t.id === 'members' && (
                  <span className="font-mono text-zinc-400" style={{ fontSize: '10.5px' }}>
                    {formatCount(group.memberCount)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Panels */}
        <div className="mt-4">
          {/* key= remounts → refetch when thread count changes */}
          {tab === 'activity' && <ActivityPanel key={threads.length} groupId={group.id} />}

          {tab === 'forums' && (
            <section>
              {isMember && <GroupThreadComposer groupId={group.id} onPosted={refresh} />}
              {threads.length === 0 ? (
                <EmptyPanel
                  text={`No discussion yet.${isMember ? ' Start the first thread.' : ''}`}
                />
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
                          <p
                            className="mt-1 line-clamp-1 text-zinc-600"
                            style={{ fontSize: '12.5px' }}
                          >
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
          )}

          {tab === 'events' && (
            // key= remounts → refetch after the Create Event modal closes
            <EventsPanel
              key={eventOpen ? 'modal-open' : 'modal-closed'}
              groupId={group.id}
              canCreate={isMember}
              onCreate={() => setEventOpen(true)}
            />
          )}

          {tab === 'images' && (
            <ImagesPanel groupId={group.id} canUpload={isMember} canModerate={isMod} />
          )}

          {tab === 'videos' && (
            <div
              className="rounded-lg border-2 border-dashed p-8 text-center"
              style={{ borderColor: `${UNITE_COLOR}40`, background: `${UNITE_COLOR}08` }}
            >
              <Clapperboard
                size={26}
                className="mx-auto mb-3"
                style={{ color: UNITE_COLOR, opacity: 0.7 }}
              />
              <p
                className="mb-1 font-display text-zinc-900"
                style={{ fontSize: '17px', fontWeight: 500 }}
              >
                Videos — SOON
              </p>
              <p
                className="mx-auto max-w-md text-zinc-500"
                style={{ fontSize: '13px', lineHeight: 1.5 }}
              >
                Group video lands with the PULSE pass, wired to the same media rail as live streams
                and creator posts.
              </p>
            </div>
          )}

          {tab === 'members' && (
            <section>
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
          )}
        </div>
      </div>

      {editOpen && (
        <EditGroupModal
          group={group}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            void refresh();
          }}
        />
      )}
      {eventOpen && (
        <CreateEventModal
          parentId={group.id}
          onClose={() => setEventOpen(false)}
          onCreated={() => {
            setEventOpen(false);
            setTab('events');
          }}
        />
      )}
    </div>
  );
}

// ───────────────────────────── Activity ─────────────────────────────

const ACTIVITY_ICON = {
  thread: MessageSquare,
  reply: Reply,
  join: UserPlus,
  event: Calendar,
  image: ImageIcon,
} as const;

function ActivityPanel({ groupId }: { groupId: string }) {
  const [items, setItems] = useState<GroupActivityItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    getGroupActivity(groupId)
      .then((r) => !cancelled && setItems(r))
      .catch(() => !cancelled && setItems([]));
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  if (items === null) {
    return (
      <ul className="space-y-2" aria-busy="true" aria-label="Loading activity">
        {[80, 60, 70].map((w, i) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: decorative loading skeleton, fixed-length static array
            key={i}
            className="animate-pulse-slow rounded-lg border border-zinc-200 p-3"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="h-4 rounded bg-zinc-100" style={{ width: `${w}%` }} />
          </li>
        ))}
      </ul>
    );
  }

  if (items.length === 0) {
    return <EmptyPanel text="Quiet in here — start a thread or schedule an event." />;
  }

  return (
    <ul className="divide-y divide-zinc-100 overflow-hidden rounded-lg border border-zinc-200 bg-white">
      {items.map((it, i) => {
        const Icon = ACTIVITY_ICON[it.kind];
        const text =
          it.kind === 'thread'
            ? 'started'
            : it.kind === 'reply'
              ? 'replied in'
              : it.kind === 'event'
                ? 'scheduled'
                : it.kind === 'image'
                  ? 'added a photo to the album'
                  : 'joined the group';
        const to =
          it.kind === 'event' && it.refId
            ? `/rule/${it.refId}`
            : it.refId
              ? `/intel/t/${it.refId}`
              : null;
        const row = (
          <span className="flex min-w-0 items-center gap-2.5">
            <span
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
              style={{ background: `${UNITE_COLOR}12`, color: UNITE_COLOR }}
            >
              <Icon size={13} />
            </span>
            <span className="min-w-0 truncate text-zinc-700" style={{ fontSize: '13px' }}>
              {it.handle ? (
                <strong className="font-semibold text-zinc-900">@{it.handle}</strong>
              ) : (
                'A Bee'
              )}{' '}
              {text}
              {it.title && (
                <>
                  {' '}
                  <span className="font-medium text-zinc-900">“{it.title}”</span>
                </>
              )}
            </span>
            <span
              className="ml-auto flex-shrink-0 font-mono text-zinc-400"
              style={{ fontSize: '10.5px' }}
              data-size="meta"
            >
              {relativeTime(it.at)}
            </span>
          </span>
        );
        const key = `${it.kind}-${it.at}-${i}`;
        return (
          <li key={key}>
            {to ? (
              <Link to={to} className="block px-3 py-2.5 transition-colors hover:bg-zinc-50">
                {row}
              </Link>
            ) : (
              <div className="px-3 py-2.5">{row}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ───────────────────────────── Events ─────────────────────────────

function EventsPanel({
  groupId,
  canCreate,
  onCreate,
}: {
  groupId: string;
  canCreate: boolean;
  onCreate: () => void;
}) {
  const [events, setEvents] = useState<EventItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEvents(null);
    listEventsByGroup(groupId, false)
      .then((r) => !cancelled && setEvents(r))
      .catch(() => !cancelled && setEvents([]));
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const now = Date.now();
  const upcoming = (events ?? []).filter((e) => new Date(e.startsAt).getTime() >= now);
  const past = (events ?? [])
    .filter((e) => new Date(e.startsAt).getTime() < now)
    .sort((a, b) => (a.startsAt < b.startsAt ? 1 : -1));

  return (
    <section>
      {canCreate && (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-bg transition-colors hover:brightness-110"
            style={{ background: UNITE_COLOR, fontSize: '12.5px' }}
          >
            <CalendarPlus size={14} /> Schedule event
          </button>
        </div>
      )}

      {events === null && (
        <div className="animate-pulse-slow rounded-lg border border-zinc-200 p-4">
          <div className="h-4 w-1/2 rounded bg-zinc-100" />
        </div>
      )}

      {events !== null && events.length === 0 && (
        <EmptyPanel
          text={
            canCreate
              ? 'No events yet. Schedule the first one.'
              : 'No events yet. Members can schedule them.'
          }
        />
      )}

      {upcoming.length > 0 && <EventList events={upcoming} />}

      {past.length > 0 && (
        <>
          <h3
            className="mt-4 mb-2 font-mono uppercase tracking-widest text-zinc-400"
            style={{ fontSize: '10px' }}
            data-size="meta"
          >
            Past
          </h3>
          <EventList events={past} muted />
        </>
      )}
    </section>
  );
}

function EventList({ events, muted = false }: { events: EventItem[]; muted?: boolean }) {
  return (
    <ul className="space-y-2">
      {events.map((e) => {
        const d = new Date(e.startsAt);
        return (
          <li key={e.id}>
            <Link
              to={`/rule/${e.id}`}
              className={cn(
                'block rounded-lg border border-zinc-200 bg-white p-3 transition-shadow hover:shadow-md',
                muted && 'opacity-70',
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <h3
                  className="min-w-0 truncate font-display leading-tight text-zinc-900"
                  style={{ fontSize: '15px' }}
                >
                  {e.title}
                </h3>
                <span
                  className="flex-shrink-0 rounded px-1.5 py-0.5 font-mono"
                  style={{ fontSize: '10.5px', color: '#F97316', background: '#F9731615' }}
                  data-size="meta"
                >
                  {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ·{' '}
                  {d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
              <div
                className="mt-1.5 flex flex-wrap items-center gap-3 font-mono text-zinc-500"
                style={{ fontSize: '10.5px' }}
                data-size="meta"
              >
                <span className="inline-flex items-center gap-1">
                  <Users size={10} /> {e.goingCount} going
                </span>
                {e.isVirtual ? (
                  <span>virtual</span>
                ) : (
                  e.locationText && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={10} /> {e.locationText}
                    </span>
                  )
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// ───────────────────────────── Images ─────────────────────────────

function ImagesPanel({
  groupId,
  canUpload,
  canModerate,
}: {
  groupId: string;
  canUpload: boolean;
  canModerate: boolean;
}) {
  const [images, setImages] = useState<AlbumImage[] | null>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [lightbox, setLightbox] = useState<AlbumImage | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    listGroupAlbum(groupId)
      .then(setImages)
      .catch(() => setImages([]));
  }, [groupId]);

  useEffect(() => {
    setImages(null);
    load();
  }, [load]);

  async function onFilesPicked(files: FileList | null) {
    if (!files || files.length === 0) return;
    const batch = Array.from(files).slice(0, 6);
    setUploading(batch.length);
    setError(null);
    for (const file of batch) {
      try {
        await uploadGroupImage(groupId, 'album', file);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed');
      } finally {
        setUploading((n) => Math.max(0, n - 1));
      }
    }
    load();
  }

  async function onDelete(path: string) {
    setError(null);
    try {
      await deleteGroupAlbumImage(path);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  return (
    <section>
      {canUpload && (
        <div className="mb-3 flex items-center justify-end gap-2">
          {uploading > 0 && (
            <span className="font-mono text-zinc-500" style={{ fontSize: '11px' }} data-size="meta">
              uploading {uploading}…
            </span>
          )}
          <button
            type="button"
            onClick={() => setLibraryOpen(true)}
            disabled={uploading > 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-60"
            style={{ fontSize: '12.5px' }}
          >
            <FolderOpen size={14} /> From Library
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading > 0}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-bg transition-colors hover:brightness-110 disabled:opacity-60"
            style={{ background: UNITE_COLOR, fontSize: '12.5px' }}
          >
            <ImagePlus size={14} /> Add photos
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(e) => {
              void onFilesPicked(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      )}

      {libraryOpen && (
        <MediaPicker
          kinds={['image']}
          title="Add to the group album from your Library"
          onClose={() => setLibraryOpen(false)}
          onPick={(a) => {
            setLibraryOpen(false);
            setUploading(1);
            setError(null);
            // Album lists the group-media folder, so a Library pick is COPIED
            // into it (public URL → blob → existing upload path + RLS).
            fetch(assetUrl(a))
              .then((r) => {
                if (!r.ok) throw new Error('Could not read the Library file');
                return r.blob();
              })
              .then((blob) =>
                uploadGroupImage(
                  groupId,
                  'album',
                  new File([blob], a.fileName, { type: a.mimeType }),
                ),
              )
              .then(() => load())
              .catch((e) => setError(e instanceof Error ? e.message : 'Copy failed'))
              .finally(() => setUploading(0));
          }}
        />
      )}

      {error && (
        <p className="mb-2 text-red-600" style={{ fontSize: '12px' }}>
          {error}
        </p>
      )}

      {images === null && (
        <div className="grid grid-cols-3 gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-square animate-pulse-slow rounded-md bg-zinc-100" />
          ))}
        </div>
      )}

      {images !== null && images.length === 0 && (
        <EmptyPanel
          text={
            canUpload
              ? 'No photos yet. Add the first ones.'
              : 'No photos yet. Members can add them.'
          }
        />
      )}

      {images !== null && images.length > 0 && (
        <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
          {images.map((img) => (
            <li key={img.path} className="group relative">
              <button
                type="button"
                onClick={() => setLightbox(img)}
                className="block w-full"
                aria-label="Open image and discussion"
              >
                <img
                  src={img.url}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full rounded-md border border-zinc-200 object-cover transition-transform hover:scale-[1.015]"
                />
              </button>
              {canModerate && (
                <button
                  type="button"
                  onClick={() => void onDelete(img.path)}
                  className="absolute top-1 right-1 rounded-md bg-black/55 p-1 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/75 group-hover:opacity-100"
                  aria-label="Remove photo"
                  title="Remove photo"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {lightbox && (
        <MediaLightbox
          media={{ kind: 'image', url: lightbox.url, title: lightbox.name }}
          targetKind="group_image"
          targetRef={lightbox.path}
          onClose={() => setLightbox(null)}
        />
      )}
    </section>
  );
}

// ───────────────────────────── Shared bits ─────────────────────────────

function EmptyPanel({ text }: { text: string }) {
  return (
    <div
      className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center text-zinc-500"
      style={{ fontSize: '13px' }}
    >
      {text}
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
        {/* Follow the Bee (bee_follows) — feeds INTEL + UNITE Following.
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
