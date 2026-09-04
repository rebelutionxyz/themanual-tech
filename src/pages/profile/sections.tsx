import { type BazaarListing, bazaarMyListings, formatBling } from '@/lib/bazaar';
import { type SavedItem, listMySaves } from '@/lib/bookmarks';
import type { Campaign } from '@/lib/campaigns';
import { formatMoney, fundedFraction, listMyCampaigns } from '@/lib/campaigns';
import { type EventItem, listEventsByGroup, listMyHostedEvents } from '@/lib/events';
import { type Group, type GroupActivityItem, getGroupActivity, listMyGroups } from '@/lib/groups';
import {
  BLING_RANK_NAMES,
  type ProfileSection,
  type QuickLook,
  RING_NAMES,
  RING_THRESHOLDS,
  RankCard,
  type TimelineRow,
  useProfileHost,
} from '@honeycomb/profile';
import {
  Award,
  Bookmark,
  Calendar,
  Coins,
  Crown,
  MapPin,
  MessageSquare,
  ShoppingBag,
  Sparkles,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

/**
 * PROFILE_SHARED1 — TheMANUAL.tech's own sections adapter. Everything here is
 * roof-specific (bazaar/campaigns/events/groups/bookmarks all have their own
 * tables and route namespaces on this astra) and deliberately does NOT live
 * in @honeycomb/profile. Ported from the original
 * src/pages/profile/ProfileView.tsx panes + src/pages/profile/
 * ProfileContentWindow.tsx cross-link cards, unchanged in substance.
 */
const ACCENT = 'var(--accent, #ef6c2a)';

export function useManualProfileSections(profileId: string): {
  sections: ProfileSection[];
  timelineRows: TimelineRow[];
} {
  const [hosted, setHosted] = useState<EventItem[] | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [groups, setGroups] = useState<Group[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHosted(null);
    setCampaigns(null);
    setGroups(null);
    listMyHostedEvents(profileId)
      .then((r) => !cancelled && setHosted(r))
      .catch(() => !cancelled && setHosted([]));
    listMyCampaigns(profileId)
      .then((r) => !cancelled && setCampaigns(r))
      .catch(() => !cancelled && setCampaigns([]));
    listMyGroups(profileId)
      .then((r) => !cancelled && setGroups(r))
      .catch(() => !cancelled && setGroups([]));
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const timelineRows: TimelineRow[] = useMemo(() => {
    const rows: TimelineRow[] = [];
    for (const e of hosted ?? [])
      rows.push({
        id: `e-${e.id}`,
        icon: <Calendar size={14} style={{ color: 'var(--profile-dim, #8a94a0)' }} />,
        text: `Scheduled "${e.title}"`,
        to: `/rule/${e.id}`,
        at: e.startsAt,
        thumbUrl: e.coverUrl,
      });
    for (const c of campaigns ?? [])
      rows.push({
        id: `c-${c.id}`,
        icon: <Coins size={14} style={{ color: 'var(--profile-dim, #8a94a0)' }} />,
        text: `Opened the campaign "${c.title}"`,
        to: `/fund/${c.slug}`,
        at: c.createdAt,
        thumbUrl: c.coverUrl,
      });
    for (const g of groups ?? [])
      rows.push({
        id: `g-${g.id}`,
        icon: <Users size={14} style={{ color: 'var(--profile-dim, #8a94a0)' }} />,
        text: `Part of "${g.name}"`,
        to: `/unite/${g.slug}`,
        at: g.createdAt,
      });
    return rows.sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [hosted, campaigns, groups]);

  const sections: ProfileSection[] = [
    {
      id: 'forums',
      label: 'Forums',
      icon: <MessageSquare size={13} />,
      render: ({ profile }) => (
        <EmptyPane text={`No public threads from @${profile.handle} yet.`} />
      ),
    },
    {
      id: 'events',
      label: 'Events',
      icon: <Calendar size={13} />,
      render: ({ open }) => (
        <EventsPane
          events={hosted}
          onOpen={(e) =>
            open({
              kind: 'custom',
              title: 'quick look · event',
              render: () => <EventCard event={e} hostLabel="this Bee" />,
            })
          }
        />
      ),
    },
    {
      id: 'watching',
      label: 'Watching',
      icon: <Bookmark size={13} />,
      render: ({ profile, isSelf }) => <WatchingPane beeId={profile.id} owner={isSelf} />,
    },
    {
      id: 'campaigns',
      label: 'Campaigns',
      icon: <Coins size={13} />,
      render: ({ open }) => (
        <CampaignsPane
          campaigns={campaigns}
          onOpen={(c) =>
            open({
              kind: 'custom',
              title: 'quick look · campaign',
              render: () => <CampaignCard campaign={c} />,
            })
          }
        />
      ),
    },
    {
      id: 'listings',
      label: 'Listings',
      icon: <ShoppingBag size={13} />,
      render: ({ isSelf }) => <ListingsPane isSelf={isSelf} />,
    },
    {
      id: 'groups',
      label: 'Groups',
      icon: <Users size={13} />,
      render: ({ open }) => (
        <GroupsPane
          groups={groups}
          onOpen={(g) =>
            open({
              kind: 'custom',
              title: 'quick look · group',
              render: (ctx) => <GroupCard group={g} onSwap={ctx.onSwap} />,
            })
          }
        />
      ),
    },
    {
      id: 'rank',
      label: 'Rank',
      icon: <Award size={13} />,
      render: ({ profile }) => (
        <RankPane
          blingRank={profile.blingRank}
          ring={profile.honeycombRing}
          actionCount={profile.actionCount}
        />
      ),
    },
    {
      id: 'badges',
      label: 'Badges',
      icon: <Award size={13} />,
      render: () => <BadgesPane />,
    },
  ];

  return { sections, timelineRows };
}

/* ───────────────────────────── Panes ───────────────────────────── */

function EmptyPane({ text }: { text: string }) {
  return (
    <div
      className="rounded-lg border border-dashed p-6 text-center"
      style={{
        borderColor: 'var(--hairline, #1f252c)',
        fontSize: '13px',
        color: 'var(--mute, #6b7580)',
      }}
    >
      {text}
    </div>
  );
}

function LoadingRows() {
  return (
    <ul className="space-y-2" aria-busy="true" aria-label="Loading">
      {[80, 60, 70].map((w, i) => (
        <li
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length loading skeleton
          key={i}
          className="animate-pulse-slow rounded-lg border p-3"
          style={{ borderColor: 'var(--hairline, #1f252c)', animationDelay: `${i * 100}ms` }}
        >
          <div
            className="h-4 rounded"
            style={{ width: `${w}%`, background: 'var(--profile-elevated, #0c0e12)' }}
          />
        </li>
      ))}
    </ul>
  );
}

function EventsPane({
  events,
  onOpen,
}: { events: EventItem[] | null; onOpen: (e: EventItem) => void }) {
  const border = 'var(--hairline, #1f252c)';
  const dim = 'var(--profile-dim, #8a94a0)';
  if (events === null) return <LoadingRows />;
  if (events.length === 0) return <EmptyPane text="No events hosted yet." />;
  return (
    <ul className="space-y-2">
      {events.map((e) => {
        const d = new Date(e.startsAt);
        return (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => onOpen(e)}
              className="block w-full rounded-lg border p-3 text-left transition-colors"
              style={{ borderColor: border, background: 'var(--profile-elevated, #0c0e12)66' }}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className="min-w-0 truncate font-semibold"
                  style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: '15px',
                    color: 'var(--profile-silver-bright, #e0e6ec)',
                  }}
                >
                  {e.title}
                </span>
                <span
                  className="flex-shrink-0 rounded px-1.5 py-0.5 font-mono"
                  style={{
                    fontSize: '10.5px',
                    color: ACCENT,
                    background: 'var(--accent-bg, #1e100a)',
                  }}
                >
                  {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div
                className="mt-1.5 flex flex-wrap items-center gap-3 font-mono"
                style={{ fontSize: '10.5px', color: dim }}
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
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function CampaignsPane({
  campaigns,
  onOpen,
}: {
  campaigns: Campaign[] | null;
  onOpen: (c: Campaign) => void;
}) {
  const border = 'var(--hairline, #1f252c)';
  if (campaigns === null) return <LoadingRows />;
  if (campaigns.length === 0) return <EmptyPane text="No campaigns yet." />;
  return (
    <ul className="space-y-2">
      {campaigns.map((c) => {
        const frac = fundedFraction(c);
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onOpen(c)}
              className="block w-full rounded-lg border p-3 text-left transition-colors"
              style={{ borderColor: border, background: 'var(--profile-elevated, #0c0e12)66' }}
            >
              <span
                className="block font-semibold"
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: '15px',
                  color: 'var(--profile-silver-bright, #e0e6ec)',
                }}
              >
                {c.title}
              </span>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full"
                style={{ background: 'var(--bg, #07080a)' }}
              >
                <div
                  className="h-full"
                  style={{ width: `${Math.round(frac * 100)}%`, background: ACCENT }}
                />
              </div>
              <span
                className="mt-1 block font-mono"
                style={{ fontSize: '10.5px', color: 'var(--profile-dim, #8a94a0)' }}
              >
                {Math.round(frac * 100)}% funded · {c.status}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function GroupsPane({ groups, onOpen }: { groups: Group[] | null; onOpen: (g: Group) => void }) {
  const border = 'var(--hairline, #1f252c)';
  if (groups === null) return <LoadingRows />;
  if (groups.length === 0) return <EmptyPane text="Not in any public groups yet." />;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {groups.map((g) => (
        <li key={g.id}>
          <button
            type="button"
            onClick={() => onOpen(g)}
            className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors"
            style={{ borderColor: border, background: 'var(--profile-elevated, #0c0e12)66' }}
          >
            <span
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border"
              style={{ borderColor: border, background: 'var(--bg, #07080a)' }}
            >
              {g.avatarUrl ? (
                <img src={g.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Users size={16} style={{ color: 'var(--profile-dim, #8a94a0)' }} />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className="block truncate"
                style={{ fontSize: '13.5px', color: 'var(--profile-silver-bright, #e0e6ec)' }}
              >
                {g.name}
              </span>
              <span
                className="block font-mono"
                style={{ fontSize: '10.5px', color: 'var(--profile-dim, #8a94a0)' }}
              >
                {g.memberCount} {g.memberCount === 1 ? 'member' : 'members'}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function WatchingPane({ beeId, owner }: { beeId: string; owner: boolean }) {
  const { Link } = useProfileHost();
  const [saves, setSaves] = useState<SavedItem[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    setSaves(null);
    listMySaves(beeId)
      .then((r) => !cancelled && setSaves(r))
      .catch(() => !cancelled && setSaves([]));
    return () => {
      cancelled = true;
    };
  }, [beeId]);

  if (saves === null) return <LoadingRows />;
  if (saves.length === 0)
    return (
      <EmptyPane
        text={
          owner
            ? 'Nothing watched yet — bookmark a ballot, docket, or group.'
            : 'Nothing public here.'
        }
      />
    );
  const border = 'var(--hairline, #1f252c)';
  return (
    <ul
      className="divide-y overflow-hidden rounded-lg border"
      style={{ borderColor: border, background: 'var(--profile-elevated, #0c0e12)66' }}
    >
      {saves.map((s) => {
        const inner = (
          <span className="flex items-center gap-3">
            <Bookmark
              size={13}
              className="flex-shrink-0"
              style={{ color: 'var(--bling-gold, #fad15e)' }}
            />
            <span
              className="min-w-0 flex-1 truncate"
              style={{ fontSize: '13px', color: 'var(--body, #c8d1da)' }}
            >
              {s.title || s.sourceId}
            </span>
            {s.realmName && (
              <span
                className="flex-shrink-0 rounded px-1.5 py-0.5 font-mono uppercase tracking-wider"
                style={{
                  fontSize: '9px',
                  color: s.realmColor ?? '#8A94A0',
                  background: `${s.realmColor ?? '#8A94A0'}18`,
                }}
              >
                {s.realmName}
              </span>
            )}
          </span>
        );
        return (
          <li key={s.saveId} style={{ borderColor: border }}>
            {s.url ? (
              <Link to={s.url} className="block px-3 py-2.5 transition-colors">
                {inner}
              </Link>
            ) : (
              <div className="px-3 py-2.5">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ListingsPane({ isSelf }: { isSelf: boolean }) {
  const { Link } = useProfileHost();
  const [listings, setListings] = useState<BazaarListing[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!isSelf) {
      setListings([]);
      return;
    }
    setListings(null);
    bazaarMyListings()
      .then((r) => !cancelled && setListings(r))
      .catch(() => !cancelled && setListings([]));
    return () => {
      cancelled = true;
    };
  }, [isSelf]);

  if (!isSelf) return <EmptyPane text="This Bee's public listings arrive with PROFILE4." />;
  if (listings === null) return <LoadingRows />;
  if (listings.length === 0) return <EmptyPane text="No listings offered yet." />;
  const border = 'var(--hairline, #1f252c)';
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {listings.map((l) => (
        <li key={l.id}>
          <Link
            to={`/bazaar/${l.id}`}
            className="flex items-center gap-3 rounded-lg border p-3 transition-colors"
            style={{ borderColor: border, background: 'var(--profile-elevated, #0c0e12)66' }}
          >
            <span
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border"
              style={{ borderColor: border, background: 'var(--bg, #07080a)' }}
            >
              <ShoppingBag size={16} style={{ color: 'var(--profile-dim, #8a94a0)' }} />
            </span>
            <span className="min-w-0 flex-1">
              <span
                className="block truncate"
                style={{ fontSize: '13.5px', color: 'var(--profile-silver-bright, #e0e6ec)' }}
              >
                {l.title}
              </span>
              <span
                className="block font-mono"
                style={{ fontSize: '10.5px', color: 'var(--bling-gold, #fad15e)' }}
              >
                {formatBling(l.priceBling)} BLiNG!
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function RankPane({
  blingRank,
  ring,
  actionCount,
}: { blingRank: number; ring: number; actionCount: number }) {
  const nextRingThreshold = ring < 8 ? RING_THRESHOLDS[ring + 1] : null;
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        <RankCard
          icon={<Sparkles size={16} />}
          title="BLiNG! Rank"
          subtitle="33 levels · 1.0x – 10.0x multiplier"
          level={blingRank}
          max={32}
          name={BLING_RANK_NAMES[Math.min(blingRank, 32)]}
          color="var(--bling-gold, #fad15e)"
        />
        <RankCard
          icon={<Crown size={16} />}
          title="The RiNG"
          subtitle="9 levels · raw action count · cannot be bought"
          level={ring}
          max={8}
          name={RING_NAMES[Math.min(ring, 8)]}
          color="var(--profile-silver-bright, #e0e6ec)"
          nextThreshold={nextRingThreshold}
        />
      </div>
      <p className="mt-4 font-mono" style={{ fontSize: '11px', color: 'var(--mute, #6b7580)' }}>
        {actionCount.toLocaleString()} lifetime actions · civic rank, streaks, and host roles are
        cross-astra and EARNED, never bought.
      </p>
    </div>
  );
}

function BadgesPane() {
  // Owner ruling: badges are their own design session — do NOT improvise them.
  return (
    <div
      className="rounded-lg border border-dashed p-8 text-center"
      style={{ borderColor: 'var(--hairline, #1f252c)' }}
    >
      <Award size={24} className="mx-auto mb-3" style={{ color: 'var(--profile-dim, #8a94a0)' }} />
      <p style={{ fontSize: '14px', color: 'var(--body, #c8d1da)' }}>Badges — reserved</p>
      <p className="mt-2 font-mono" style={{ fontSize: '11px', color: 'var(--mute, #6b7580)' }}>
        The badge system is its own design session.
      </p>
    </div>
  );
}

/* ───────────────────── Quick-look cards (custom QuickLook) ───────────────────── */

function mapsHref(lat: number | null, lng: number | null, text: string | null): string | null {
  if (lat != null && lng != null) return `https://www.google.com/maps?q=${lat},${lng}`;
  if (text) return `https://www.google.com/maps?q=${encodeURIComponent(text)}`;
  return null;
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="font-semibold"
      style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: '18px',
        color: 'var(--profile-silver-bright, #e0e6ec)',
      }}
    >
      {children}
    </h3>
  );
}

function MetaRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-2"
      style={{ fontSize: '12.5px', color: 'var(--body, #c8d1da)' }}
    >
      <span style={{ color: 'var(--profile-dim, #8a94a0)' }}>{icon}</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-4 mb-2 uppercase tracking-widest font-mono"
      style={{ fontSize: '10px', color: 'var(--mute, #6b7580)' }}
    >
      {children}
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: '12px', color: 'var(--mute, #6b7580)' }}>{children}</p>;
}

function FullPageDoor({ to, label }: { to: string; label: string }) {
  const { Link } = useProfileHost();
  return (
    <Link
      to={to}
      className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-4 py-2 font-medium transition-[filter] hover:brightness-110"
      style={{ background: ACCENT, color: '#000', fontSize: '13px' }}
    >
      {label} →
    </Link>
  );
}

function EventCard({ event: e, hostLabel }: { event: EventItem; hostLabel: string }) {
  const d = new Date(e.startsAt);
  const maps = mapsHref(e.lat, e.lng, e.locationText);
  const border = 'var(--hairline, #1f252c)';
  return (
    <div>
      {e.coverUrl && (
        <img
          src={e.coverUrl}
          alt=""
          className="mb-3 h-32 w-full rounded-md border object-cover"
          style={{ borderColor: border }}
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
                  className="underline decoration-dotted"
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
          {e.goingCount} going · hosted by {hostLabel}
        </MetaRow>
      </div>
      {e.description && (
        <p
          className="mt-3 whitespace-pre-wrap"
          style={{ fontSize: '12.5px', lineHeight: 1.6, color: 'var(--profile-dim, #8a94a0)' }}
        >
          {e.description}
        </p>
      )}
      <FullPageDoor to={`/rule/${e.id}`} label="Open the full event on RULE" />
    </div>
  );
}

function GroupCard({ group, onSwap }: { group: Group; onSwap: (next: QuickLook) => void }) {
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [activity, setActivity] = useState<GroupActivityItem[] | null>(null);
  const border = 'var(--hairline, #1f252c)';

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
          className="mb-3 h-32 w-full rounded-md border object-cover"
          style={{ borderColor: border }}
        />
      )}
      <CardTitle>{group.name}</CardTitle>
      {group.tagline && (
        <p className="mt-1" style={{ fontSize: '13px', color: 'var(--profile-dim, #8a94a0)' }}>
          {group.tagline}
        </p>
      )}
      <div className="mt-3 space-y-2">
        <MetaRow icon={<Users size={13} />}>
          {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'} · {group.visibility}
        </MetaRow>
        {group.locationText && <MetaRow icon={<MapPin size={13} />}>{group.locationText}</MetaRow>}
      </div>

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
                onClick={() =>
                  onSwap({
                    kind: 'custom',
                    title: 'quick look · event',
                    render: () => <EventCard event={e} hostLabel={group.name} />,
                  })
                }
                className="flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition-colors"
                style={{ borderColor: border, background: 'var(--bg, #07080a)' }}
              >
                <Calendar
                  size={12}
                  className="flex-shrink-0"
                  style={{ color: 'var(--profile-dim, #8a94a0)' }}
                />
                <span
                  className="min-w-0 flex-1 truncate"
                  style={{ fontSize: '12.5px', color: 'var(--body, #c8d1da)' }}
                >
                  {e.title}
                </span>
                <span
                  className="flex-shrink-0 font-mono"
                  style={{ fontSize: '10px', color: 'var(--profile-dim, #8a94a0)' }}
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
              className="flex items-center gap-2"
              style={{ fontSize: '12px', color: 'var(--profile-dim, #8a94a0)' }}
            >
              <MessageSquare
                size={11}
                className="flex-shrink-0"
                style={{ color: 'var(--profile-dim, #8a94a0)' }}
              />
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
  const border = 'var(--hairline, #1f252c)';
  return (
    <div>
      {campaign.coverUrl && (
        <img
          src={campaign.coverUrl}
          alt=""
          className="mb-3 h-32 w-full rounded-md border object-cover"
          style={{ borderColor: border }}
        />
      )}
      <CardTitle>{campaign.title}</CardTitle>
      {campaign.excerpt && (
        <p className="mt-1" style={{ fontSize: '13px', color: 'var(--profile-dim, #8a94a0)' }}>
          {campaign.excerpt}
        </p>
      )}
      <div className="mt-3">
        <div
          className="h-1.5 overflow-hidden rounded-full"
          style={{ background: 'var(--bg, #07080a)' }}
        >
          <div
            className="h-full"
            style={{ width: `${Math.round(frac * 100)}%`, background: ACCENT }}
          />
        </div>
        <div
          className="mt-1.5 flex items-center justify-between font-mono"
          style={{ fontSize: '11px', color: 'var(--profile-dim, #8a94a0)' }}
        >
          <span style={{ color: 'var(--body, #c8d1da)' }}>
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
