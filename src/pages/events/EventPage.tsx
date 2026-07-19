import { CreateEventModal } from '@/components/events/CreateEventModal';
import { MediaPicker } from '@/components/studio/MediaPicker';
import { useAuth } from '@/lib/auth';
import {
  type EventItem,
  type EventRsvpRow,
  type EventThread,
  type RsvpStatus,
  type UpdateEventInput,
  cancelEvent,
  createEventThread,
  formatEventWhen,
  getBeeHandle,
  getEvent,
  getMyRsvp,
  listEventThreads,
  listRsvps,
  rsvp,
  updateEvent,
  uploadEventCover,
} from '@/lib/events';
import { type Group, getGroupsByIds } from '@/lib/groups';
import { relativeTime } from '@/lib/intel';
import { copyAssetToFile } from '@/lib/media';
import { cn, formatCount } from '@/lib/utils';
import {
  ArrowLeft,
  Calendar,
  CalendarX,
  Camera,
  Check,
  Clock,
  ExternalLink,
  FolderOpen,
  HelpCircle,
  MapPin,
  MessageSquare,
  Pencil,
  Users,
  Video,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

// RULE orange — canonical accent (matches EventsPage + CommunityLayout).
const RULE_COLOR = '#F97316';

/** Full field set for event_update (the RPC overwrites; cover rides along). */
function toUpdateInput(ev: EventItem): UpdateEventInput {
  return {
    title: ev.title,
    startsAt: ev.startsAt,
    endsAt: ev.endsAt,
    description: ev.description ?? undefined,
    isVirtual: ev.isVirtual,
    virtualLink: ev.virtualLink,
    locationText: ev.locationText,
    lat: ev.lat,
    lng: ev.lng,
  };
}

export function EventPage() {
  const { id } = useParams<{ id: string }>();
  const { bee } = useAuth();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [myStatus, setMyStatus] = useState<RsvpStatus | null>(null);
  const [rsvps, setRsvps] = useState<EventRsvpRow[]>([]);
  const [threads, setThreads] = useState<EventThread[]>([]);
  const [hostGroup, setHostGroup] = useState<Group | null>(null);
  const [hostHandle, setHostHandle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [cancelArmed, setCancelArmed] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInput = useRef<HTMLInputElement>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    const ev = await getEvent(id);
    if (!ev) {
      setNotFound(true);
      return;
    }
    setEvent(ev);
    const [mine, list, thr, grp, host] = await Promise.all([
      bee?.id ? getMyRsvp(ev.id, bee.id) : Promise.resolve(null),
      listRsvps(ev.id),
      listEventThreads(ev.id),
      ev.parentId ? getGroupsByIds([ev.parentId]) : Promise.resolve([]),
      getBeeHandle(ev.createdBy),
    ]);
    setMyStatus(mine);
    setRsvps(list);
    setThreads(thr);
    setHostGroup(grp[0] ?? null);
    setHostHandle(host);
  }, [id, bee?.id]);

  useEffect(() => {
    setEvent(null);
    setNotFound(false);
    setCancelArmed(false);
    refresh().catch((e) => setError(e instanceof Error ? e.message : 'Failed to load event'));
  }, [refresh]);

  const isHost = !!bee?.id && !!event && bee.id === event.createdBy;
  const isCancelled = event?.status === 'cancelled';

  async function setRsvp(status: RsvpStatus) {
    if (!id || busy) return;
    setBusy(true);
    setError(null);
    try {
      await rsvp(id, status);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'RSVP failed');
    } finally {
      setBusy(false);
    }
  }

  async function onToggleCancel(next: boolean) {
    if (!event || busy) return;
    setBusy(true);
    setError(null);
    try {
      await cancelEvent(event.id, next);
      setCancelArmed(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  async function onCoverPicked(file: File | undefined) {
    if (!file || !event || uploadingCover) return;
    setUploadingCover(true);
    setError(null);
    try {
      const url = await uploadEventCover(event.id, file);
      await updateEvent(event.id, { ...toUpdateInput(event), coverUrl: url });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploadingCover(false);
    }
  }

  if (notFound) {
    return (
      <div className="safe-pad-x mx-auto max-w-3xl bg-white px-4 py-12 text-center">
        <p className="text-zinc-600" style={{ fontSize: '15px' }}>
          This event doesn't exist.
        </p>
        <Link
          to="/rule"
          className="mt-3 inline-block"
          style={{ color: RULE_COLOR, fontSize: '13px' }}
        >
          ← Back to Events
        </Link>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="safe-pad-x mx-auto max-w-3xl px-4 py-10">
        <div className="h-40 animate-pulse-slow rounded-lg bg-zinc-100 md:h-56" />
        <div className="mt-4 h-7 w-64 animate-pulse-slow rounded bg-zinc-200" />
        <div className="mt-3 h-4 w-40 animate-pulse-slow rounded bg-zinc-100" />
      </div>
    );
  }

  const going = rsvps.filter((r) => r.status === 'going');
  const maybe = rsvps.filter((r) => r.status === 'maybe');

  return (
    <div className="min-h-full bg-white">
      <div className="safe-pad-x mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
        <Link
          to="/rule"
          className="mb-3 inline-flex items-center gap-1 font-mono text-zinc-500 transition-colors hover:text-zinc-800"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          <ArrowLeft size={11} /> Events
        </Link>

        {/* Cover */}
        <div className="relative">
          <div
            className={cn(
              'h-40 overflow-hidden rounded-lg border border-zinc-200 md:h-56',
              isCancelled && 'opacity-60 grayscale',
            )}
          >
            {event.coverUrl ? (
              <img src={event.coverUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${RULE_COLOR}12 0%, ${RULE_COLOR}55 100%)`,
                }}
              >
                <Calendar size={40} style={{ color: RULE_COLOR, opacity: 0.5 }} />
              </div>
            )}
          </div>
          {isHost && !isCancelled && (
            <>
              <button
                type="button"
                onClick={() => setLibraryOpen(true)}
                disabled={uploadingCover}
                className="absolute right-28 bottom-2 inline-flex items-center gap-1.5 rounded-md bg-black/55 px-2.5 py-1 text-white backdrop-blur-sm transition-colors hover:bg-black/70 disabled:opacity-60"
                style={{ fontSize: '11.5px' }}
              >
                <FolderOpen size={12} />
                Library
              </button>
              <button
                type="button"
                onClick={() => coverInput.current?.click()}
                disabled={uploadingCover}
                className="absolute right-2 bottom-2 inline-flex items-center gap-1.5 rounded-md bg-black/55 px-2.5 py-1 text-white backdrop-blur-sm transition-colors hover:bg-black/70 disabled:opacity-60"
                style={{ fontSize: '11.5px' }}
              >
                <Camera size={12} />
                {uploadingCover ? 'Uploading…' : event.coverUrl ? 'Change cover' : 'Add cover'}
              </button>
              <input
                ref={coverInput}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => onCoverPicked(e.target.files?.[0])}
              />
              {libraryOpen && (
                <MediaPicker
                  kinds={['image']}
                  title="Event cover from your Library"
                  onClose={() => setLibraryOpen(false)}
                  onPick={(a) => {
                    setLibraryOpen(false);
                    void copyAssetToFile(a).then((f) => onCoverPicked(f));
                  }}
                />
              )}
            </>
          )}
        </div>

        {/* Cancelled banner */}
        {isCancelled && (
          <div
            className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5"
            role="status"
          >
            <span
              className="inline-flex items-center gap-2 font-medium text-red-700"
              style={{ fontSize: '13px' }}
            >
              <CalendarX size={15} /> This event was cancelled by the host.
            </span>
            {isHost && (
              <button
                type="button"
                onClick={() => onToggleCancel(false)}
                disabled={busy}
                className="flex-shrink-0 rounded-md border border-red-300 px-2.5 py-1 font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                style={{ fontSize: '12px' }}
              >
                Restore event
              </button>
            )}
          </div>
        )}

        {/* Header */}
        <div className="mt-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div
              className="flex flex-wrap items-center gap-2 font-mono uppercase tracking-wider"
              style={{ fontSize: '11px', color: RULE_COLOR }}
              data-size="meta"
            >
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={12} />
                {formatEventWhen(event.startsAt, event.endsAt)}
              </span>
              {isCancelled && (
                <span
                  className="rounded bg-red-100 px-1.5 py-0.5 font-semibold text-red-700"
                  style={{ fontSize: '9.5px' }}
                >
                  CANCELLED
                </span>
              )}
            </div>
            <h1
              className="mt-1.5 font-display tracking-wide text-zinc-900"
              style={{ fontSize: '24px' }}
            >
              {event.title}
            </h1>
            <div
              className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-zinc-500"
              style={{ fontSize: '12.5px' }}
            >
              {hostHandle && (
                <span>
                  Hosted by <strong className="font-semibold text-zinc-700">@{hostHandle}</strong>
                </span>
              )}
              {hostGroup && (
                <Link
                  to={`/unite/${hostGroup.slug}`}
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium transition-colors hover:bg-zinc-50"
                  style={{ borderColor: '#7C3AED60', color: '#7C3AED', fontSize: '11.5px' }}
                >
                  <Users size={11} /> {hostGroup.name}
                </Link>
              )}
            </div>
          </div>

          {/* Host controls */}
          {isHost && !isCancelled && (
            <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2.5 py-0.5 font-semibold text-[11.5px] text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900"
              >
                <Pencil size={11} /> Edit
              </button>
              {cancelArmed ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onToggleCancel(true)}
                    disabled={busy}
                    className="rounded-full bg-red-600 px-2.5 py-0.5 font-semibold text-[11.5px] text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    Confirm cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setCancelArmed(false)}
                    className="rounded-full border border-zinc-200 px-2 py-0.5 font-semibold text-[11.5px] text-zinc-500 hover:text-zinc-800"
                  >
                    Keep
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCancelArmed(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-red-200 px-2.5 py-0.5 font-semibold text-[11.5px] text-red-600 transition-colors hover:bg-red-50"
                >
                  <CalendarX size={11} /> Cancel event
                </button>
              )}
            </div>
          )}
        </div>

        {/* Location */}
        <div className="mt-3 text-zinc-700" style={{ fontSize: '13px' }}>
          {event.isVirtual ? (
            <span className="inline-flex items-center gap-1.5">
              <Video size={13} style={{ color: RULE_COLOR }} />
              {event.virtualLink && !isCancelled ? (
                <a
                  href={event.virtualLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:underline"
                  style={{ color: RULE_COLOR }}
                >
                  Join virtually <ExternalLink size={11} />
                </a>
              ) : (
                'Virtual event'
              )}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={13} style={{ color: RULE_COLOR }} />
              {event.locationText || 'In person'}
              {event.lat != null && event.lng != null && (
                <a
                  href={`https://www.openstreetmap.org/?mlat=${event.lat}&mlon=${event.lng}#map=15/${event.lat}/${event.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 inline-flex items-center gap-0.5 font-mono text-zinc-400 hover:text-zinc-700"
                  style={{ fontSize: '11px' }}
                >
                  map <ExternalLink size={10} />
                </a>
              )}
            </span>
          )}
        </div>

        {/* About */}
        {event.description && (
          <p
            className="mt-3 whitespace-pre-wrap border-zinc-100 border-t pt-3 text-zinc-600"
            style={{ fontSize: '13px', lineHeight: 1.6 }}
          >
            {event.description}
          </p>
        )}

        {/* RSVP */}
        {!isCancelled && (
          <div className="mt-4 border-zinc-100 border-t pt-4">
            <div
              className="mb-2 flex items-center gap-3 font-mono text-zinc-500"
              style={{ fontSize: '11px' }}
              data-size="meta"
            >
              <span className="inline-flex items-center gap-1">
                <Check size={11} style={{ color: RULE_COLOR }} /> {formatCount(event.goingCount)}{' '}
                going
              </span>
              <span className="inline-flex items-center gap-1">
                <HelpCircle size={11} /> {formatCount(event.maybeCount)} maybe
              </span>
            </div>
            {bee ? (
              <div className="inline-flex gap-1.5">
                <RsvpButton
                  label="Going"
                  icon={<Check size={14} />}
                  active={myStatus === 'going'}
                  disabled={busy}
                  onClick={() => setRsvp('going')}
                />
                <RsvpButton
                  label="Maybe"
                  icon={<HelpCircle size={14} />}
                  active={myStatus === 'maybe'}
                  disabled={busy}
                  onClick={() => setRsvp('maybe')}
                />
                <RsvpButton
                  label="Can't go"
                  icon={<X size={14} />}
                  active={myStatus === 'not_going'}
                  disabled={busy}
                  onClick={() => setRsvp('not_going')}
                />
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-block rounded-md border px-3 py-1.5"
                style={{
                  borderColor: `${RULE_COLOR}70`,
                  color: RULE_COLOR,
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                Sign in to RSVP
              </Link>
            )}
          </div>
        )}

        {error && (
          <p className="mt-3 text-red-600" style={{ fontSize: '12px' }}>
            {error}
          </p>
        )}

        {/* Attendees */}
        {(going.length > 0 || maybe.length > 0) && (
          <section className="mt-6">
            <h2
              className="mb-2 font-mono uppercase tracking-widest text-zinc-400"
              style={{ fontSize: '11px' }}
              data-size="meta"
            >
              Who's coming
            </h2>
            <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
              {going.length > 0 && <AttendeeGroup label="Going" people={going} />}
              {maybe.length > 0 && <AttendeeGroup label="Maybe" people={maybe} />}
            </div>
          </section>
        )}

        {/* Discussion */}
        <section className="mt-6">
          <h2
            className="mb-2 font-mono uppercase tracking-widest text-zinc-400"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            Discussion
          </h2>
          {bee && <EventThreadComposer eventId={event.id} onPosted={refresh} />}
          {threads.length === 0 ? (
            <div
              className="rounded-lg border border-zinc-200 border-dashed bg-zinc-50 p-6 text-center text-zinc-500"
              style={{ fontSize: '13px' }}
            >
              No discussion yet.{bee ? ' Start the first thread.' : ''}
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

      {editOpen && event && (
        <CreateEventModal
          editing={event}
          onClose={() => setEditOpen(false)}
          onCreated={() => {
            setEditOpen(false);
            void refresh();
          }}
        />
      )}
    </div>
  );
}

function RsvpButton({
  label,
  icon,
  active,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-medium transition-colors disabled:opacity-50',
        active ? 'text-white' : 'border-zinc-200 text-zinc-600 hover:border-zinc-400',
      )}
      style={{
        fontSize: '13px',
        ...(active ? { background: RULE_COLOR, borderColor: RULE_COLOR } : {}),
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function AttendeeGroup({ label, people }: { label: string; people: EventRsvpRow[] }) {
  return (
    <div>
      <div
        className="mb-1 font-mono uppercase tracking-wider text-zinc-400"
        style={{ fontSize: '9.5px' }}
        data-size="meta"
      >
        {label} · {people.length}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {people.map((p, i) => (
          <span
            key={`${p.handle ?? 'bee'}-${i}`}
            className="rounded bg-zinc-100 px-2 py-0.5 text-zinc-700"
            style={{ fontSize: '12px' }}
          >
            {p.name ?? (p.handle ? `@${p.handle}` : 'Bee')}
          </span>
        ))}
      </div>
    </div>
  );
}

function EventThreadComposer({
  eventId,
  onPosted,
}: { eventId: string; onPosted: () => Promise<void> | void }) {
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
      await createEventThread(eventId, title.trim(), body.trim());
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
        className="mb-2 w-full rounded-lg border border-zinc-200 border-dashed bg-zinc-50 px-4 py-2.5 text-left text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-700"
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
          className="rounded-md px-4 py-1.5 font-medium text-white transition-colors hover:brightness-110 disabled:opacity-50"
          style={{ background: RULE_COLOR, fontSize: '13px' }}
        >
          {posting ? 'Posting…' : 'Post'}
        </button>
      </div>
    </div>
  );
}
