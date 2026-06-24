import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Calendar, Plus, Video, MapPin, Check, HelpCircle } from 'lucide-react';
import {
  listEvents,
  listPastEvents,
  listMyGoingEvents,
  listMyHostedEvents,
  formatEventWhen,
  type EventItem,
} from '@/lib/events';
import type { EventsOutletCtx, EventsView } from '@/pages/events/EventsLayout';
import { useAuth } from '@/lib/auth';
import { formatCount } from '@/lib/utils';

const RULE_COLOR = '#E88938';

const VIEW_META: Record<EventsView, { title: string; blurb: string }> = {
  upcoming: { title: 'Upcoming', blurb: 'Coordinate action in physical and digital space. Show up.' },
  past: { title: 'Past', blurb: 'Events that have already happened.' },
  going: { title: 'Going', blurb: "Events you've said you'll attend." },
  hosting: { title: 'Hosting', blurb: 'Events you created.' },
};

export function EventsPage() {
  const { bee } = useAuth();
  const { view, openCreate } = useOutletContext<EventsOutletCtx>();
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setEvents(null);
    setError(null);
    try {
      if (view === 'upcoming') setEvents(await listEvents(true));
      else if (view === 'past') setEvents(await listPastEvents());
      else if (!bee?.id) setEvents([]);
      else if (view === 'going') setEvents(await listMyGoingEvents(bee.id));
      else setEvents(await listMyHostedEvents(bee.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load events');
      setEvents([]);
    }
  }, [view, bee?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const meta = VIEW_META[view];

  return (
    <div className="min-h-full" style={{ background: `${RULE_COLOR}0D` }}>
      <div className="safe-pad-x mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="mb-1 font-mono uppercase tracking-widest" style={{ fontSize: '11px', color: RULE_COLOR, opacity: 0.85 }} data-size="meta">
              RULE · Events
            </div>
            <h1 className="flex items-center gap-2 font-display tracking-wide text-text-silver-bright" style={{ fontSize: '24px' }}>
              <Calendar size={22} style={{ color: RULE_COLOR }} />
              {meta.title}
            </h1>
            <p className="mt-1 text-text-dim" style={{ fontSize: '13px' }}>
              {meta.blurb}
            </p>
          </div>
          {bee && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-md px-3 py-2 font-medium text-bg transition-colors hover:brightness-110"
              style={{ background: RULE_COLOR, fontSize: '13px' }}
            >
              <Plus size={15} /> Create
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-kettle-unsourced/30 bg-bg-elevated p-5 text-kettle-unsourced" style={{ fontSize: '13px' }}>
            {error}
          </div>
        )}

        {!error && events === null && <EventsSkeleton />}

        {!error && events !== null && events.length === 0 && (
          <EmptyEvents view={view} signedIn={Boolean(bee?.id)} onCreate={openCreate} />
        )}

        {!error && events && events.length > 0 && (
          <ul className="space-y-2">
            {events.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function EventCard({ event }: { event: EventItem }) {
  return (
    <li>
      <Link
        to={`/rule/${event.id}`}
        className="group block overflow-hidden rounded-lg border border-border bg-bg-elevated p-4 transition-all hover:border-border-bright hover:bg-panel-2"
        style={{ borderLeft: `3px solid ${RULE_COLOR}80` }}
      >
        <div className="mb-1 font-mono uppercase tracking-wider" style={{ fontSize: '10.5px', color: RULE_COLOR }} data-size="meta">
          {formatEventWhen(event.startsAt, event.endsAt)}
        </div>
        <h3 className="font-display text-lg leading-tight text-text-silver-bright group-hover:text-text">{event.title}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-text-muted" style={{ fontSize: '11px' }} data-size="meta">
          <span className="inline-flex items-center gap-1">
            {event.isVirtual ? <Video size={11} /> : <MapPin size={11} />}
            {event.isVirtual ? 'Virtual' : event.locationText || 'In person'}
          </span>
          <span className="inline-flex items-center gap-1">
            <Check size={11} style={{ color: RULE_COLOR }} /> {formatCount(event.goingCount)} going
          </span>
          {event.maybeCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <HelpCircle size={11} /> {formatCount(event.maybeCount)} maybe
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}

function EventsSkeleton() {
  return (
    <ul className="space-y-2" aria-busy="true" aria-label="Loading events">
      {[60, 75, 50].map((w, i) => (
        <li
          // biome-ignore lint/suspicious/noArrayIndexKey: decorative loading skeleton, fixed-length static array
          key={i}
          className="animate-pulse-slow rounded-lg border border-border bg-bg-elevated p-4"
          style={{ borderLeft: `3px solid ${RULE_COLOR}80`, animationDelay: `${i * 100}ms` }}
        >
          <div className="h-3 w-32 rounded bg-text-muted/10" />
          <div className="mt-2 h-5 rounded bg-text-muted/15" style={{ width: `${w}%` }} />
          <div className="mt-2 h-3 w-40 rounded bg-text-muted/10" />
        </li>
      ))}
    </ul>
  );
}

function EmptyEvents({ view, signedIn, onCreate }: { view: EventsView; signedIn: boolean; onCreate: () => void }) {
  const headline =
    view === 'upcoming'
      ? 'Nothing on the calendar yet'
      : view === 'past'
        ? 'No past events'
        : view === 'going'
          ? signedIn
            ? "You haven't RSVP'd to anything"
            : 'Sign in to see your RSVPs'
          : signedIn
            ? "You're not hosting anything yet"
            : 'Sign in to see events you host';
  const subtext =
    view === 'upcoming' || view === 'hosting'
      ? 'Be the first to host. Pick a time, set the place, gather Bees.'
      : view === 'going'
        ? signedIn
          ? 'RSVP to an event from Upcoming and it shows here.'
          : 'Your RSVPs are tied to your Bee account.'
        : 'Check back later.';
  return (
    <div className="rounded-lg border-2 border-dashed p-8 text-center" style={{ borderColor: `${RULE_COLOR}40`, background: `${RULE_COLOR}08` }}>
      <Calendar size={26} className="mx-auto mb-3" style={{ color: RULE_COLOR, opacity: 0.7 }} />
      <p className="mb-1 font-display text-text-silver-bright" style={{ fontSize: '17px', fontWeight: 500 }}>
        {headline}
      </p>
      <p className="mx-auto max-w-md text-text-dim" style={{ fontSize: '13px', lineHeight: 1.5 }}>
        {subtext}
      </p>
      {signedIn && view !== 'past' && view !== 'going' && (
        <button
          type="button"
          onClick={onCreate}
          className="mt-5 inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 font-medium text-bg transition-colors hover:brightness-110"
          style={{ background: RULE_COLOR, fontSize: '12px' }}
        >
          <Plus size={14} /> Create an event
        </button>
      )}
      {!signedIn && (view === 'going' || view === 'hosting') && (
        <Link
          to="/login"
          className="mt-5 inline-flex items-center gap-1.5 rounded-md border-2 px-4 py-1.5 transition-colors hover:brightness-110"
          style={{ borderColor: `${RULE_COLOR}70`, color: RULE_COLOR, fontSize: '12px', fontWeight: 600 }}
        >
          Sign in
        </Link>
      )}
    </div>
  );
}
