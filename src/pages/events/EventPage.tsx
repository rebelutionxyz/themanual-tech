import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Calendar, Video, MapPin, Check, HelpCircle, X, MessageSquare, Clock, ArrowLeft, ExternalLink } from 'lucide-react';
import {
  getEvent,
  getMyRsvp,
  listRsvps,
  rsvp,
  listEventThreads,
  createEventThread,
  formatEventWhen,
  type EventItem,
  type RsvpStatus,
  type EventRsvpRow,
  type EventThread,
} from '@/lib/events';
import { relativeTime } from '@/lib/intel';
import { useAuth } from '@/lib/auth';
import { cn, formatCount } from '@/lib/utils';

const RULE_COLOR = '#E88938';

export function EventPage() {
  const { id } = useParams<{ id: string }>();
  const { bee } = useAuth();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [myStatus, setMyStatus] = useState<RsvpStatus | null>(null);
  const [rsvps, setRsvps] = useState<EventRsvpRow[]>([]);
  const [threads, setThreads] = useState<EventThread[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    const ev = await getEvent(id);
    if (!ev) {
      setNotFound(true);
      return;
    }
    setEvent(ev);
    const [mine, list, thr] = await Promise.all([
      bee?.id ? getMyRsvp(ev.id, bee.id) : Promise.resolve(null),
      listRsvps(ev.id),
      listEventThreads(ev.id),
    ]);
    setMyStatus(mine);
    setRsvps(list);
    setThreads(thr);
  }, [id, bee?.id]);

  useEffect(() => {
    setEvent(null);
    setNotFound(false);
    refresh().catch((e) => setError(e instanceof Error ? e.message : 'Failed to load event'));
  }, [refresh]);

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

  if (notFound) {
    return (
      <div className="safe-pad-x mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-text-silver" style={{ fontSize: '15px' }}>
          This event doesn't exist.
        </p>
        <Link to="/rule" className="mt-3 inline-block" style={{ color: RULE_COLOR, fontSize: '13px' }}>
          ← Back to Events
        </Link>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="safe-pad-x mx-auto max-w-3xl px-4 py-10">
        <div className="h-4 w-40 animate-pulse-slow rounded bg-text-muted/10" />
        <div className="mt-2 h-7 w-64 animate-pulse-slow rounded bg-text-muted/15" />
      </div>
    );
  }

  const going = rsvps.filter((r) => r.status === 'going');
  const maybe = rsvps.filter((r) => r.status === 'maybe');

  return (
    <div className="min-h-full" style={{ background: `${RULE_COLOR}0D` }}>
      <div className="safe-pad-x mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
        <Link to="/rule" className="mb-3 inline-flex items-center gap-1 font-mono text-text-muted hover:text-text-silver" style={{ fontSize: '11px' }} data-size="meta">
          <ArrowLeft size={11} /> Events
        </Link>

        {/* Header */}
        <div className="rounded-lg border border-border bg-bg-elevated p-5" style={{ borderLeft: `3px solid ${RULE_COLOR}` }}>
          <div className="flex items-center gap-1.5 font-mono uppercase tracking-wider" style={{ fontSize: '11px', color: RULE_COLOR }} data-size="meta">
            <Calendar size={12} />
            {formatEventWhen(event.startsAt, event.endsAt)}
          </div>
          <h1 className="mt-1.5 font-display tracking-wide text-text-silver-bright" style={{ fontSize: '24px' }}>
            {event.title}
          </h1>

          {/* Location */}
          <div className="mt-2 text-text-silver" style={{ fontSize: '13px' }}>
            {event.isVirtual ? (
              <span className="inline-flex items-center gap-1.5">
                <Video size={13} style={{ color: RULE_COLOR }} />
                {event.virtualLink ? (
                  <a href={event.virtualLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline" style={{ color: RULE_COLOR }}>
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
                    className="ml-1 inline-flex items-center gap-0.5 font-mono text-text-muted hover:text-text-silver"
                    style={{ fontSize: '11px' }}
                  >
                    map <ExternalLink size={10} />
                  </a>
                )}
              </span>
            )}
          </div>

          {event.description && (
            <p className="mt-3 whitespace-pre-wrap border-t border-border pt-3 text-text-dim" style={{ fontSize: '13px', lineHeight: 1.6 }}>
              {event.description}
            </p>
          )}

          {/* RSVP control */}
          <div className="mt-4 border-t border-border pt-4">
            <div className="mb-2 flex items-center gap-3 font-mono text-text-muted" style={{ fontSize: '11px' }} data-size="meta">
              <span className="inline-flex items-center gap-1">
                <Check size={11} style={{ color: RULE_COLOR }} /> {formatCount(event.goingCount)} going
              </span>
              <span className="inline-flex items-center gap-1">
                <HelpCircle size={11} /> {formatCount(event.maybeCount)} maybe
              </span>
            </div>
            {bee ? (
              <div className="inline-flex gap-1.5">
                <RsvpButton label="Going" icon={<Check size={14} />} active={myStatus === 'going'} disabled={busy} onClick={() => setRsvp('going')} />
                <RsvpButton label="Maybe" icon={<HelpCircle size={14} />} active={myStatus === 'maybe'} disabled={busy} onClick={() => setRsvp('maybe')} />
                <RsvpButton label="Can't go" icon={<X size={14} />} active={myStatus === 'not_going'} disabled={busy} onClick={() => setRsvp('not_going')} />
              </div>
            ) : (
              <Link to="/login" className="inline-block rounded-md border px-3 py-1.5" style={{ borderColor: `${RULE_COLOR}70`, color: RULE_COLOR, fontSize: '12px', fontWeight: 600 }}>
                Sign in to RSVP
              </Link>
            )}
          </div>
        </div>

        {error && (
          <p className="mt-3 text-kettle-unsourced" style={{ fontSize: '12px' }}>
            {error}
          </p>
        )}

        {/* Attendees */}
        {(going.length > 0 || maybe.length > 0) && (
          <section className="mt-6">
            <h2 className="mb-2 font-mono uppercase tracking-widest text-text-muted" style={{ fontSize: '11px' }} data-size="meta">
              Who's coming
            </h2>
            <div className="space-y-3 rounded-lg border border-border bg-bg-elevated p-4">
              {going.length > 0 && <AttendeeGroup label="Going" people={going} />}
              {maybe.length > 0 && <AttendeeGroup label="Maybe" people={maybe} />}
            </div>
          </section>
        )}

        {/* Discussion */}
        <section className="mt-6">
          <h2 className="mb-2 font-mono uppercase tracking-widest text-text-muted" style={{ fontSize: '11px' }} data-size="meta">
            Discussion
          </h2>
          {bee && <EventThreadComposer eventId={event.id} onPosted={refresh} />}
          {threads.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-bg-elevated/40 p-6 text-center text-text-dim" style={{ fontSize: '13px' }}>
              No discussion yet.{bee ? ' Start the first thread.' : ''}
            </div>
          ) : (
            <ul className="space-y-2">
              {threads.map((t) => (
                <li key={t.id}>
                  <Link to={`/intel/t/${t.id}`} className="group block rounded-lg border border-border bg-bg-elevated p-3 transition-all hover:border-border-bright hover:bg-panel-2">
                    <h3 className="font-display leading-tight text-text-silver-bright group-hover:text-text" style={{ fontSize: '15px' }}>
                      {t.title}
                    </h3>
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

function RsvpButton({ label, icon, active, disabled, onClick }: { label: string; icon: React.ReactNode; active: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-medium transition-colors disabled:opacity-50',
        active ? 'text-bg' : 'border-border text-text-silver hover:border-border-bright',
      )}
      style={{ fontSize: '13px', ...(active ? { background: RULE_COLOR, borderColor: RULE_COLOR } : {}) }}
    >
      {icon}
      {label}
    </button>
  );
}

function AttendeeGroup({ label, people }: { label: string; people: EventRsvpRow[] }) {
  return (
    <div>
      <div className="mb-1 font-mono uppercase tracking-wider text-text-muted" style={{ fontSize: '9.5px' }} data-size="meta">
        {label} · {people.length}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {people.map((p, i) => (
          <span
            key={`${p.handle ?? 'bee'}-${i}`}
            className="rounded bg-bg px-2 py-0.5 text-text-silver"
            style={{ fontSize: '12px' }}
          >
            {p.name ?? (p.handle ? `@${p.handle}` : 'Bee')}
          </span>
        ))}
      </div>
    </div>
  );
}

function EventThreadComposer({ eventId, onPosted }: { eventId: string; onPosted: () => Promise<void> | void }) {
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
        <button type="button" onClick={() => setOpen(false)} className="rounded-md px-3 py-1.5 text-text-dim hover:text-text" style={{ fontSize: '13px' }}>
          Cancel
        </button>
        <button
          type="button"
          onClick={post}
          disabled={!title.trim() || posting}
          className="rounded-md px-4 py-1.5 font-medium text-bg transition-colors hover:brightness-110 disabled:opacity-50"
          style={{ background: RULE_COLOR, fontSize: '13px' }}
        >
          {posting ? 'Posting…' : 'Post'}
        </button>
      </div>
    </div>
  );
}
