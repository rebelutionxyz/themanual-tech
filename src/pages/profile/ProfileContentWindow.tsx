import type { Campaign } from '@/lib/campaigns';
import { formatMoney, fundedFraction } from '@/lib/campaigns';
import { type EventItem, listEventsByGroup } from '@/lib/events';
import type { Group } from '@/lib/groups';
import { type GroupActivityItem, getGroupActivity } from '@/lib/groups';
import { formatCount } from '@/lib/utils';
import {
  ArrowUpRight,
  Calendar,
  Clock,
  Coins,
  MapPin,
  MessageSquare,
  Ticket,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * PROFILE_SPEC v0.2/v0.4 — THE QUICK-LOOK LAW.
 *
 * A tab/toolbar button is the LIST; clicking a specific item opens it here in
 * the content window (a right-hand surface on desktop, an overlay on mobile),
 * NOT a new page. The window is FULL-INFO, not a teaser, and its doors
 * CROSS-LINK: a group card shows its events, an event shows its group, and
 * clicking such a door SWAPS THE WINDOW IN PLACE (a small navigation stack).
 * The single accent button is the only door that leaves — it opens the full
 * page on its astra.
 *
 * PROFILE4 wires patchboard state; this pass renders from existing tables and
 * honest stubs. Tickets/tip checkout are structural stubs here (the money walk
 * activates live fiat/BLiNG later).
 */

export type QuickLook =
  | { kind: 'event'; event: EventItem; hostLabel: string }
  | { kind: 'group'; group: Group }
  | { kind: 'campaign'; campaign: Campaign }
  | { kind: 'timeline'; rows: TimelineRow[]; ownerLabel: string }
  | { kind: 'tip'; ownerLabel: string; currencies: string[] };

export interface TimelineRow {
  id: string;
  icon: 'event' | 'campaign' | 'group';
  text: string;
  to: string | null;
  at: string;
  thumbUrl?: string | null;
}

const ACCENT = 'var(--accent, #ef6c2a)';

function mapsHref(lat: number | null, lng: number | null, text: string | null): string | null {
  if (lat != null && lng != null) return `https://www.google.com/maps?q=${lat},${lng}`;
  if (text) return `https://www.google.com/maps?q=${encodeURIComponent(text)}`;
  return null;
}

/**
 * The content window. `look` is the current card; `onSwap` pushes a cross-link
 * card onto the stack (handled by the parent so Back is possible), `onClose`
 * dismisses. Rendered fixed on the right (desktop) / full overlay (mobile).
 */
export function ProfileContentWindow({
  look,
  canBack,
  onBack,
  onClose,
  onSwap,
}: {
  look: QuickLook;
  canBack: boolean;
  onBack: () => void;
  onClose: () => void;
  onSwap: (next: QuickLook) => void;
}) {
  return (
    <>
      {/* Mobile scrim — desktop keeps the page visible beside the window. */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: scrim; explicit close button provided */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-border border-l bg-bg-elevated shadow-2xl md:top-14 md:bottom-0"
        aria-label="Quick look"
      >
        <header className="flex items-center justify-between gap-2 border-border border-b px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            {canBack && (
              <button
                type="button"
                onClick={onBack}
                className="rounded p-1 text-text-muted hover:bg-bg hover:text-text-silver-bright"
                aria-label="Back"
              >
                ←
              </button>
            )}
            <span
              className="truncate font-mono uppercase tracking-wider text-text-muted"
              style={{ fontSize: '10.5px' }}
              data-size="meta"
            >
              {look.kind === 'tip'
                ? 'Send a tip'
                : look.kind === 'timeline'
                  ? 'Timeline'
                  : `Quick look · ${look.kind}`}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-text-muted hover:bg-bg hover:text-text-silver-bright"
          >
            <X size={16} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {look.kind === 'event' && <EventCard look={look} />}
          {look.kind === 'group' && <GroupCard group={look.group} onSwap={onSwap} />}
          {look.kind === 'campaign' && <CampaignCard campaign={look.campaign} />}
          {look.kind === 'timeline' && <TimelineCard rows={look.rows} />}
          {look.kind === 'tip' && (
            <TipCard ownerLabel={look.ownerLabel} currencies={look.currencies} />
          )}
        </div>
      </aside>
    </>
  );
}

function FullPageDoor({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-4 py-2 font-medium text-black transition-[filter] hover:brightness-110"
      style={{ background: ACCENT, fontSize: '13px' }}
    >
      {label} <ArrowUpRight size={15} />
    </Link>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-display font-semibold text-text-silver-bright" style={{ fontSize: '18px' }}>
      {children}
    </h3>
  );
}

function MetaRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-text-silver" style={{ fontSize: '12.5px' }}>
      <span className="text-text-muted">{icon}</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

function EventCard({ look }: { look: Extract<QuickLook, { kind: 'event' }> }) {
  const e = look.event;
  const d = new Date(e.startsAt);
  const maps = mapsHref(e.lat, e.lng, e.locationText);
  return (
    <div>
      {e.coverUrl && (
        <img
          src={e.coverUrl}
          alt=""
          className="mb-3 h-32 w-full rounded-md border border-border object-cover"
        />
      )}
      <CardTitle>{e.title}</CardTitle>
      <div className="mt-3 space-y-2">
        <MetaRow icon={<Calendar size={13} />}>
          {d.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' })}
          {' · '}
          {d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
        </MetaRow>
        {e.isVirtual ? (
          <MetaRow icon={<MapPin size={13} />}>Virtual event</MetaRow>
        ) : (
          e.locationText && (
            <MetaRow icon={<MapPin size={13} />}>
              {maps ? (
                <a
                  href={maps}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-dotted hover:text-text-silver-bright"
                >
                  {e.locationText}
                </a>
              ) : (
                e.locationText
              )}
            </MetaRow>
          )
        )}
        <MetaRow icon={<Users size={13} />}>
          {formatCount(e.goingCount)} going · hosted by {look.hostLabel}
        </MetaRow>
      </div>

      {e.description && (
        <p
          className="mt-3 whitespace-pre-wrap text-text-dim"
          style={{ fontSize: '12.5px', lineHeight: 1.6 }}
        >
          {e.description}
        </p>
      )}

      {/* Tickets — BLiNG or fiat. Structural stub; the money walk wires it. */}
      <div className="mt-4 rounded-md border border-border bg-bg p-3">
        <div className="flex items-center gap-2 text-text-silver" style={{ fontSize: '12.5px' }}>
          <Ticket size={14} style={{ color: ACCENT }} /> Tickets
        </div>
        <p className="mt-1 text-text-muted" style={{ fontSize: '11px' }} data-size="meta">
          RSVP and ticketing open on the full event page.
        </p>
      </div>

      <FullPageDoor to={`/rule/${e.id}`} label="Open the full event on RULE" />
    </div>
  );
}

function GroupCard({ group, onSwap }: { group: Group; onSwap: (next: QuickLook) => void }) {
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [activity, setActivity] = useState<GroupActivityItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listEventsByGroup(group.id, false)
      .then((r) => !cancelled && setEvents(r))
      .catch(() => !cancelled && setEvents([]));
    getGroupActivity(group.id)
      .then((r) => !cancelled && setActivity(r.slice(0, 5)))
      .catch(() => !cancelled && setActivity([]));
    return () => {
      cancelled = true;
    };
  }, [group.id]);

  return (
    <div>
      {group.coverUrl && (
        <img
          src={group.coverUrl}
          alt=""
          className="mb-3 h-32 w-full rounded-md border border-border object-cover"
        />
      )}
      <CardTitle>{group.name}</CardTitle>
      {group.tagline && (
        <p className="mt-1 text-text-dim" style={{ fontSize: '13px' }}>
          {group.tagline}
        </p>
      )}
      <div className="mt-3 space-y-2">
        <MetaRow icon={<Users size={13} />}>
          {formatCount(group.memberCount)} {group.memberCount === 1 ? 'member' : 'members'} ·{' '}
          {group.visibility}
        </MetaRow>
        {group.locationText && <MetaRow icon={<MapPin size={13} />}>{group.locationText}</MetaRow>}
      </div>

      {/* CROSS-LINK: a group shows its events; each event door swaps the window. */}
      <SectionLabel>Events</SectionLabel>
      {events === null ? (
        <Muted>Loading…</Muted>
      ) : events.length === 0 ? (
        <Muted>No events yet.</Muted>
      ) : (
        <ul className="space-y-1.5">
          {events.slice(0, 4).map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => onSwap({ kind: 'event', event: e, hostLabel: group.name })}
                className="flex w-full items-center gap-2 rounded-md border border-border bg-bg px-2.5 py-1.5 text-left transition-colors hover:border-border-bright"
              >
                <Calendar size={12} className="flex-shrink-0 text-text-muted" />
                <span
                  className="min-w-0 flex-1 truncate text-text-silver"
                  style={{ fontSize: '12.5px' }}
                >
                  {e.title}
                </span>
                <span
                  className="flex-shrink-0 font-mono text-text-muted"
                  style={{ fontSize: '10px' }}
                >
                  {new Date(e.startsAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <SectionLabel>Recent posts</SectionLabel>
      {activity === null ? (
        <Muted>Loading…</Muted>
      ) : activity.length === 0 ? (
        <Muted>Quiet in here.</Muted>
      ) : (
        <ul className="space-y-1">
          {activity.map((a, i) => (
            <li
              key={`${a.kind}-${a.at}-${i}`}
              className="flex items-center gap-2 text-text-dim"
              style={{ fontSize: '12px' }}
            >
              <MessageSquare size={11} className="flex-shrink-0 text-text-muted" />
              <span className="min-w-0 truncate">
                {a.handle ? `@${a.handle}` : 'A Bee'} {a.title ? `· ${a.title}` : a.kind}
              </span>
            </li>
          ))}
        </ul>
      )}

      <FullPageDoor to={`/unite/${group.slug}`} label="Open the full group on UNITE" />
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const frac = fundedFraction(campaign);
  return (
    <div>
      {campaign.coverUrl && (
        <img
          src={campaign.coverUrl}
          alt=""
          className="mb-3 h-32 w-full rounded-md border border-border object-cover"
        />
      )}
      <CardTitle>{campaign.title}</CardTitle>
      {campaign.excerpt && (
        <p className="mt-1 text-text-dim" style={{ fontSize: '13px' }}>
          {campaign.excerpt}
        </p>
      )}
      <div className="mt-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-bg">
          <div
            className="h-full"
            style={{ width: `${Math.round(frac * 100)}%`, background: ACCENT }}
          />
        </div>
        <div
          className="mt-1.5 flex items-center justify-between font-mono text-text-muted"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          <span className="text-text-silver">
            {formatMoney(campaign.raisedCents, campaign.currency)} raised
          </span>
          <span>{formatMoney(campaign.goalCents, campaign.currency)} goal</span>
        </div>
      </div>
      <div className="mt-3">
        <MetaRow icon={<Coins size={13} />}>
          {campaign.status} · {Math.round(frac * 100)}% funded
        </MetaRow>
      </div>
      <FullPageDoor to={`/fund/${campaign.slug}`} label="Open the full campaign on FUND" />
    </div>
  );
}

function TimelineCard({ rows }: { rows: TimelineRow[] }) {
  if (rows.length === 0) return <Muted>No activity on the timeline yet.</Muted>;
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => {
        const d = new Date(r.at);
        const inner = (
          <span className="flex items-start gap-2.5">
            <span
              className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
              style={{ background: 'var(--accent-bg, #1e100a)', color: ACCENT }}
            >
              {r.icon === 'event' ? (
                <Calendar size={12} />
              ) : r.icon === 'campaign' ? (
                <Coins size={12} />
              ) : (
                <Users size={12} />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-text-silver" style={{ fontSize: '12.5px' }}>
                {r.text}
              </span>
              <span
                className="mt-0.5 flex items-center gap-1 font-mono text-text-muted"
                style={{ fontSize: '10px' }}
                data-size="meta"
              >
                <Clock size={9} />
                {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ·{' '}
                {d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </span>
            </span>
          </span>
        );
        return (
          <li key={r.id}>
            {r.to ? (
              <Link
                to={r.to}
                className="block rounded-md border border-border bg-bg px-2.5 py-2 transition-colors hover:border-border-bright"
              >
                {inner}
              </Link>
            ) : (
              <div className="rounded-md border border-border bg-bg px-2.5 py-2">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Tip checkout — v0.3/v0.4 shape (amount + currency + reward levels). The
 *  live rails (BLiNG + CURRENCY_LAW-gated fiat) activate at the money walk;
 *  this pass renders the structure only. */
function TipCard({ ownerLabel, currencies }: { ownerLabel: string; currencies: string[] }) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(currencies[0] ?? 'USD');
  return (
    <div>
      <CardTitle>Tip {ownerLabel}</CardTitle>
      <p className="mt-1 text-text-dim" style={{ fontSize: '12.5px' }}>
        Give directly — no greed taken. Rewards ride along when your amount qualifies.
      </p>

      <label
        htmlFor="tip-amount"
        className="mt-4 block font-mono uppercase tracking-wider text-text-muted"
        style={{ fontSize: '10px' }}
        data-size="meta"
      >
        Amount
      </label>
      <div className="mt-1 flex items-center gap-2">
        <input
          id="tip-amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
          inputMode="decimal"
          placeholder="0.00"
          className="min-w-0 flex-1 rounded-md border border-border bg-bg px-3 py-2 text-text-silver-bright outline-none focus:border-border-bright"
          style={{ fontSize: '15px' }}
        />
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="rounded-md border border-border bg-bg px-2 py-2 font-mono text-text-silver outline-none focus:border-border-bright"
          style={{ fontSize: '12.5px' }}
          aria-label="Currency"
        >
          {currencies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <SectionLabel>Reward levels</SectionLabel>
      <p className="text-text-muted" style={{ fontSize: '11.5px' }}>
        {ownerLabel} hasn’t set reward levels yet. Any amount is a pure tip.
      </p>

      <button
        type="button"
        disabled
        className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-4 py-2 font-medium text-black opacity-60"
        style={{ background: ACCENT, fontSize: '13px' }}
        title="Tip rails activate at the money walk (PROFILE4)"
      >
        <Coins size={15} /> Send tip
      </button>
      <p
        className="mt-2 text-center text-text-muted"
        style={{ fontSize: '10.5px' }}
        data-size="meta"
      >
        Tip rails activate after the money walk.
      </p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-4 mb-2 font-mono uppercase tracking-widest text-text-muted"
      style={{ fontSize: '10px' }}
      data-size="meta"
    >
      {children}
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-text-muted" style={{ fontSize: '12px' }}>
      {children}
    </p>
  );
}
