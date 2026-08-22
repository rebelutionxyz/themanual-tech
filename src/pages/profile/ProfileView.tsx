import { FollowBeeButton } from '@/components/intel/FollowBeeButton';
import { type BazaarListing, bazaarMyListings, formatBling } from '@/lib/bazaar';
import { type SavedItem, listMySaves } from '@/lib/bookmarks';
import type { Campaign } from '@/lib/campaigns';
import { fundedFraction, listMyCampaigns } from '@/lib/campaigns';
import { type EventItem, listMyHostedEvents } from '@/lib/events';
import { type Group, listMyGroups } from '@/lib/groups';
import { getOGDisplayLabel, getOGGeneration } from '@/lib/og-generation';
import { cn, formatCount } from '@/lib/utils';
import {
  Activity as ActivityIcon,
  Award,
  Bookmark,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Coins,
  Crown,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  ShoppingBag,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BLING_RANK_NAMES, RING_NAMES, RING_THRESHOLDS, RankCard } from '../ProfilePage';
import { ProfileContentWindow, type QuickLook, type TimelineRow } from './ProfileContentWindow';

const ACCENT = 'var(--accent, #ef6c2a)';

export interface ProfileData {
  id: string;
  handle: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  blingRank: number;
  honeycombRing: number;
  actionCount: number;
  createdAt: string;
  locationText: string | null;
}

/** The nine panes the dispatch enumerates. Timeline is a LENS, not a pane. */
type TabId =
  | 'activity'
  | 'forums'
  | 'events'
  | 'watching'
  | 'campaigns'
  | 'listings'
  | 'groups'
  | 'rank'
  | 'badges';

const TABS: { id: TabId; label: string; icon: typeof ActivityIcon }[] = [
  { id: 'activity', label: 'Activity', icon: ActivityIcon },
  { id: 'forums', label: 'Forums', icon: MessageSquare },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'watching', label: 'Watching', icon: Bookmark },
  { id: 'campaigns', label: 'Campaigns', icon: Coins },
  { id: 'listings', label: 'Listings', icon: ShoppingBag },
  { id: 'groups', label: 'Groups', icon: Users },
  { id: 'rank', label: 'Rank', icon: Star },
  { id: 'badges', label: 'Badges', icon: Award },
];

const ORDER_KEY = 'profile.tabOrder.v1';

export function ProfileView({ profile, isSelf }: { profile: ProfileData; isSelf: boolean }) {
  // view-as (own only): preview the public face without leaving the page.
  const [previewPublic, setPreviewPublic] = useState(false);
  const owner = isSelf && !previewPublic;

  const [tab, setTab] = useState<TabId>('activity');
  const [look, setLook] = useState<QuickLook[]>([]); // content-window nav stack

  // Shared fetch — powers Activity, Timeline, the stat strip, and three panes,
  // so it happens once here rather than per pane.
  const [hosted, setHosted] = useState<EventItem[] | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [groups, setGroups] = useState<Group[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHosted(null);
    setCampaigns(null);
    setGroups(null);
    listMyHostedEvents(profile.id)
      .then((r) => !cancelled && setHosted(r))
      .catch(() => !cancelled && setHosted([]));
    listMyCampaigns(profile.id)
      .then((r) => !cancelled && setCampaigns(r))
      .catch(() => !cancelled && setCampaigns([]));
    listMyGroups(profile.id)
      .then((r) => !cancelled && setGroups(r))
      .catch(() => !cancelled && setGroups([]));
    return () => {
      cancelled = true;
    };
  }, [profile.id]);

  const hostLabel = profile.name || `@${profile.handle}`;

  const timelineRows: TimelineRow[] = useMemo(() => {
    const rows: TimelineRow[] = [];
    for (const e of hosted ?? [])
      rows.push({
        id: `e-${e.id}`,
        icon: 'event',
        text: `Scheduled “${e.title}”`,
        to: `/rule/${e.id}`,
        at: e.startsAt,
        thumbUrl: e.coverUrl,
      });
    for (const c of campaigns ?? [])
      rows.push({
        id: `c-${c.id}`,
        icon: 'campaign',
        text: `Opened the campaign “${c.title}”`,
        to: `/fund/${c.slug}`,
        at: c.createdAt,
        thumbUrl: c.coverUrl,
      });
    for (const g of groups ?? [])
      rows.push({
        id: `g-${g.id}`,
        icon: 'group',
        text: `Part of “${g.name}”`,
        to: `/unite/${g.slug}`,
        at: g.createdAt,
      });
    return rows.sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [hosted, campaigns, groups]);

  function open(next: QuickLook) {
    setLook([next]);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      {/* Level-1 page — NO breadcrumb (PROFILE_SPEC v0.1). */}

      {/* Cover + avatar overlap. No bees.cover_url column yet, so the cover is
          an accent gradient this pass (owner cover upload = PROFILE4 + schema). */}
      <div className="relative">
        <div
          className="h-36 overflow-hidden rounded-lg border border-border md:h-44"
          style={{
            background:
              'linear-gradient(135deg, var(--accent-bg, #1e100a) 0%, var(--accent-dim, #8a3c14) 100%)',
          }}
        />
        <div className="-bottom-10 absolute left-4 md:left-6">
          <div className="h-24 w-24 overflow-hidden rounded-2xl border-4 border-bg bg-bg-elevated shadow-lg">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-display text-4xl text-text-silver-bright">
                {(profile.name || profile.handle).slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Identity block + action row */}
      <div className="mt-12 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1
            className="truncate font-display font-semibold text-text-silver-bright"
            style={{ fontSize: '26px' }}
          >
            {/* Own name is bare; everyone else is ALWAYS @name (SHELL v1.5). */}
            {isSelf ? profile.name || profile.handle : profile.name || `@${profile.handle}`}
          </h1>
          <div
            className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-text-muted"
            style={{ fontSize: '12px' }}
            data-size="meta"
          >
            <span>{isSelf ? profile.handle : `@${profile.handle}`}</span>
            <span className="inline-flex items-center gap-1">
              <Crown size={11} className="text-text-silver" />
              {RING_NAMES[Math.min(profile.honeycombRing, 8)]}
            </span>
            {profile.locationText && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={11} /> {profile.locationText}
              </span>
            )}
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-honey/40 bg-honey/10 px-2 py-0.5">
            <Sparkles size={11} className="text-honey" />
            <span
              className="font-mono uppercase tracking-wider text-honey"
              style={{ fontSize: '10.5px' }}
              data-size="meta"
            >
              {getOGDisplayLabel(getOGGeneration(profile.createdAt))}
            </span>
          </div>
        </div>

        <ActionRow
          owner={owner}
          isSelf={isSelf}
          previewPublic={previewPublic}
          beeId={profile.id}
          ownerLabel={hostLabel}
          onTip={() => open({ kind: 'tip', ownerLabel: hostLabel, currencies: ['USD'] })}
          onTogglePreview={() => setPreviewPublic((v) => !v)}
        />
      </div>

      {profile.bio && (
        <p
          className="mt-3 whitespace-pre-wrap text-text-silver"
          style={{ fontSize: '13.5px', lineHeight: 1.6 }}
        >
          {profile.bio}
        </p>
      )}

      {/* Stat strip — public columns + public-group count (always true; the
          patchboard-gated relation counts arrive with PROFILE4). */}
      <StatStrip
        actionCount={profile.actionCount}
        ring={profile.honeycombRing}
        blingRank={profile.blingRank}
        groups={groups?.length ?? null}
        events={hosted?.length ?? null}
      />

      {/* Tab toolbar — no visible scrollbar, end arrows, drag-to-reorder, no
          More menu. Timeline is a LENS pinned at the end (opens the window). */}
      <TabToolbar
        active={tab}
        onSelect={setTab}
        onTimeline={() => open({ kind: 'timeline', rows: timelineRows, ownerLabel: hostLabel })}
      />

      {/* Panes */}
      <div className="mt-4 pb-16">
        {tab === 'activity' && (
          <ActivityPane
            rows={timelineRows}
            onOpenTimeline={() =>
              open({ kind: 'timeline', rows: timelineRows, ownerLabel: hostLabel })
            }
          />
        )}
        {tab === 'forums' && <EmptyPane text={`No public threads from @${profile.handle} yet.`} />}
        {tab === 'events' && (
          <EventsPane
            events={hosted}
            onOpen={(e) => open({ kind: 'event', event: e, hostLabel })}
          />
        )}
        {tab === 'watching' && <WatchingPane beeId={profile.id} owner={owner} />}
        {tab === 'campaigns' && (
          <CampaignsPane
            campaigns={campaigns}
            onOpen={(c) => open({ kind: 'campaign', campaign: c })}
          />
        )}
        {tab === 'listings' && <ListingsPane isSelf={isSelf} />}
        {tab === 'groups' && (
          <GroupsPane groups={groups} onOpen={(g) => open({ kind: 'group', group: g })} />
        )}
        {tab === 'rank' && (
          <RankPane
            blingRank={profile.blingRank}
            ring={profile.honeycombRing}
            actionCount={profile.actionCount}
          />
        )}
        {tab === 'badges' && <BadgesPane />}
      </div>

      {look.length > 0 && (
        <ProfileContentWindow
          look={look[look.length - 1]}
          canBack={look.length > 1}
          onBack={() => setLook((s) => s.slice(0, -1))}
          onClose={() => setLook([])}
          onSwap={(next) => setLook((s) => [...s, next])}
        />
      )}
    </main>
  );
}

/* ───────────────────────────── Action row ───────────────────────────── */

function ActionRow({
  owner,
  isSelf,
  previewPublic,
  beeId,
  ownerLabel,
  onTip,
  onTogglePreview,
}: {
  owner: boolean;
  isSelf: boolean;
  previewPublic: boolean;
  beeId: string;
  ownerLabel: string;
  onTip: () => void;
  onTogglePreview: () => void;
}) {
  const [mobileMenu, setMobileMenu] = useState(false);

  // OWN VIEW: Contact / Edit profile / view-as — all visible, no dropdown.
  if (owner) {
    return (
      <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-1.5">
        <GhostButton icon={<Mail size={13} />}>Contact</GhostButton>
        <Link
          to="/profile"
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-text-silver transition-colors hover:border-border-bright hover:bg-bg-elevated"
          style={{ fontSize: '13px' }}
        >
          <Pencil size={13} /> Edit profile
        </Link>
        <button
          type="button"
          onClick={onTogglePreview}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-text-dim transition-colors hover:border-border-bright hover:text-text-silver"
          style={{ fontSize: '13px' }}
        >
          View as public
        </button>
      </div>
    );
  }

  // PUBLIC VIEW (incl. owner previewing): Follow (accent, first) / Subscribe /
  // Contact / Tip. Mobile: Follow+Subscribe+Contact visible, Tip + view-toggle
  // fold into the "…" dots.
  return (
    <div className="relative flex flex-shrink-0 items-center justify-end gap-1.5">
      {/* Follow is real (bee_follows); it hides itself for self/signed-out. */}
      {!isSelf && <FollowBeeButton beeId={beeId} accent="var(--accent, #ef6c2a)" />}
      <GhostButton icon={<Star size={13} />}>Subscribe</GhostButton>
      <GhostButton icon={<Mail size={13} />}>Contact</GhostButton>
      {/* Tip — visible on desktop, folds into the dots on mobile. */}
      <button
        type="button"
        onClick={onTip}
        className="hidden items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-black transition-[filter] hover:brightness-110 sm:inline-flex"
        style={{ background: ACCENT, fontSize: '13px' }}
      >
        <Coins size={13} /> Tip
      </button>

      <button
        type="button"
        onClick={() => setMobileMenu((v) => !v)}
        className="inline-flex items-center rounded-md border border-border p-1.5 text-text-dim hover:text-text-silver sm:hidden"
        aria-label="More actions"
      >
        <MoreHorizontal size={16} />
      </button>
      {mobileMenu && (
        <div className="absolute top-full right-0 z-30 mt-1 w-40 rounded-md border border-border bg-bg-elevated p-1 shadow-xl sm:hidden">
          <button
            type="button"
            onClick={() => {
              setMobileMenu(false);
              onTip();
            }}
            className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-text-silver hover:bg-bg"
            style={{ fontSize: '13px' }}
          >
            <Coins size={13} style={{ color: ACCENT }} /> Tip {ownerLabel}
          </button>
          {previewPublic && (
            <button
              type="button"
              onClick={() => {
                setMobileMenu(false);
                onTogglePreview();
              }}
              className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-text-dim hover:bg-bg"
              style={{ fontSize: '13px' }}
            >
              Exit preview
            </button>
          )}
        </div>
      )}

      {previewPublic && (
        <button
          type="button"
          onClick={onTogglePreview}
          className="hidden items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-text-dim hover:text-text-silver sm:inline-flex"
          style={{ fontSize: '13px' }}
        >
          Exit preview
        </button>
      )}
    </div>
  );
}

function GhostButton({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-text-silver transition-colors hover:border-border-bright hover:bg-bg-elevated"
      style={{ fontSize: '13px' }}
    >
      {icon}
      {children}
    </button>
  );
}

/* ───────────────────────────── Stat strip ───────────────────────────── */

function StatStrip({
  actionCount,
  ring,
  blingRank,
  groups,
  events,
}: {
  actionCount: number;
  ring: number;
  blingRank: number;
  groups: number | null;
  events: number | null;
}) {
  const stats: { label: string; value: string }[] = [
    { label: 'Actions', value: formatCount(actionCount) },
    { label: 'Ring', value: RING_NAMES[Math.min(ring, 8)] },
    { label: 'BLiNG! rank', value: BLING_RANK_NAMES[Math.min(blingRank, 32)] },
    { label: 'Groups', value: groups == null ? '—' : formatCount(groups) },
    { label: 'Events', value: events == null ? '—' : formatCount(events) },
  ];
  return (
    <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-border border-y py-3">
      {stats.map((s) => (
        <div key={s.label}>
          <div
            className="font-display font-semibold text-text-silver-bright"
            style={{ fontSize: '15px' }}
          >
            {s.value}
          </div>
          <div
            className="font-mono uppercase tracking-wider text-text-muted"
            style={{ fontSize: '9.5px' }}
            data-size="meta"
          >
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────────── Tab toolbar ───────────────────────────── */

function loadOrder(): TabId[] {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    if (!raw) return TABS.map((t) => t.id);
    const saved = JSON.parse(raw) as TabId[];
    const valid = saved.filter((id) => TABS.some((t) => t.id === id));
    // Append any tabs added since the order was saved.
    for (const t of TABS) if (!valid.includes(t.id)) valid.push(t.id);
    return valid;
  } catch {
    return TABS.map((t) => t.id);
  }
}

function TabToolbar({
  active,
  onSelect,
  onTimeline,
}: {
  active: TabId;
  onSelect: (id: TabId) => void;
  onTimeline: () => void;
}) {
  const [order, setOrder] = useState<TabId[]>(loadOrder);
  const [drag, setDrag] = useState<TabId | null>(null);
  const [arrows, setArrows] = useState({ left: false, right: false });
  const scroller = useRef<HTMLDivElement>(null);

  function persist(next: TabId[]) {
    setOrder(next);
    try {
      localStorage.setItem(ORDER_KEY, JSON.stringify(next));
    } catch {
      // Patchboard persistence (PROFILE4) supersedes this local fallback.
    }
  }

  const refreshArrows = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setArrows({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    refreshArrows();
    const el = scroller.current;
    if (!el) return;
    el.addEventListener('scroll', refreshArrows, { passive: true });
    window.addEventListener('resize', refreshArrows);
    return () => {
      el.removeEventListener('scroll', refreshArrows);
      window.removeEventListener('resize', refreshArrows);
    };
  }, [refreshArrows]);

  function nudge(dir: -1 | 1) {
    scroller.current?.scrollBy({ left: dir * 180, behavior: 'smooth' });
  }

  function onDrop(target: TabId) {
    if (!drag || drag === target) return;
    const next = [...order];
    next.splice(next.indexOf(drag), 1);
    next.splice(next.indexOf(target), 0, drag);
    persist(next);
    setDrag(null);
  }

  const tabsById = useMemo(() => new Map(TABS.map((t) => [t.id, t])), []);

  return (
    <div className="relative mt-5 border-border border-b">
      {arrows.left && <ArrowButton dir="left" onClick={() => nudge(-1)} />}
      <div
        ref={scroller}
        className="flex gap-0.5 overflow-x-auto [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        {order.map((id) => {
          const t = tabsById.get(id);
          if (!t) return null;
          const Icon = t.icon;
          const on = active === id;
          return (
            <button
              key={id}
              type="button"
              draggable
              onDragStart={() => setDrag(id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(id)}
              onDragEnd={() => setDrag(null)}
              onClick={() => onSelect(id)}
              className={cn(
                'inline-flex flex-shrink-0 cursor-pointer items-center gap-1.5 border-b-2 px-3 py-2 font-medium transition-colors',
                on
                  ? 'text-text-silver-bright'
                  : 'border-transparent text-text-muted hover:text-text-silver',
                drag === id && 'opacity-40',
              )}
              style={{
                fontSize: '12.5px',
                ...(on ? { color: 'var(--accent, #ef6c2a)', borderColor: ACCENT } : {}),
              }}
            >
              <Icon size={13} />
              {t.label}
            </button>
          );
        })}
        {/* Timeline — a LENS, not a pane: it opens the content window. */}
        <button
          type="button"
          onClick={onTimeline}
          className="ml-1 inline-flex flex-shrink-0 items-center gap-1.5 border-transparent border-b-2 px-3 py-2 font-medium text-text-muted transition-colors hover:text-text-silver"
          style={{ fontSize: '12.5px' }}
          title="Open the timeline lens"
        >
          <ActivityIcon size={13} /> Timeline
        </button>
      </div>
      {arrows.right && <ArrowButton dir="right" onClick={() => nudge(1)} />}
    </div>
  );
}

function ArrowButton({ dir, onClick }: { dir: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === 'left' ? 'Scroll tabs left' : 'Scroll tabs right'}
      className={cn(
        '-translate-y-1/2 absolute top-1/2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-bg-elevated text-text-silver shadow-md hover:text-text-silver-bright',
        dir === 'left' ? 'left-0' : 'right-0',
      )}
    >
      {dir === 'left' ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
    </button>
  );
}

/* ───────────────────────────── Panes ───────────────────────────── */

function ActivityPane({
  rows,
  onOpenTimeline,
}: {
  rows: TimelineRow[];
  onOpenTimeline: () => void;
}) {
  if (rows.length === 0) return <EmptyPane text="Nothing public yet." />;
  return (
    <div>
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-bg-elevated/40">
        {rows.slice(0, 12).map((r) => {
          const d = new Date(r.at);
          const inner = (
            <span className="flex items-center gap-3">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-bg">
                {r.thumbUrl ? (
                  <img src={r.thumbUrl} alt="" className="h-full w-full object-cover" />
                ) : r.icon === 'event' ? (
                  <Calendar size={14} className="text-text-muted" />
                ) : r.icon === 'campaign' ? (
                  <Coins size={14} className="text-text-muted" />
                ) : (
                  <Users size={14} className="text-text-muted" />
                )}
              </span>
              <span
                className="min-w-0 flex-1 truncate text-text-silver"
                style={{ fontSize: '13px' }}
              >
                {r.text}
              </span>
              <span
                className="flex-shrink-0 font-mono text-text-muted"
                style={{ fontSize: '10.5px' }}
                data-size="meta"
              >
                {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ·{' '}
                {d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </span>
            </span>
          );
          return (
            <li key={r.id}>
              {r.to ? (
                <Link
                  to={r.to}
                  className="block px-3 py-2.5 transition-colors hover:bg-bg-elevated"
                >
                  {inner}
                </Link>
              ) : (
                <div className="px-3 py-2.5">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={onOpenTimeline}
        className="mt-3 font-mono text-text-muted hover:text-text-silver"
        style={{ fontSize: '11.5px' }}
      >
        → Open the full timeline
      </button>
    </div>
  );
}

function EventsPane({
  events,
  onOpen,
}: {
  events: EventItem[] | null;
  onOpen: (e: EventItem) => void;
}) {
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
              className="block w-full rounded-lg border border-border bg-bg-elevated/40 p-3 text-left transition-colors hover:border-border-bright"
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className="min-w-0 truncate font-display text-text-silver-bright"
                  style={{ fontSize: '15px' }}
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
                  data-size="meta"
                >
                  {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div
                className="mt-1.5 flex flex-wrap items-center gap-3 font-mono text-text-muted"
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
              className="block w-full rounded-lg border border-border bg-bg-elevated/40 p-3 text-left transition-colors hover:border-border-bright"
            >
              <span
                className="block font-display text-text-silver-bright"
                style={{ fontSize: '15px' }}
              >
                {c.title}
              </span>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg">
                <div
                  className="h-full"
                  style={{ width: `${Math.round(frac * 100)}%`, background: ACCENT }}
                />
              </div>
              <span
                className="mt-1 block font-mono text-text-muted"
                style={{ fontSize: '10.5px' }}
                data-size="meta"
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

function GroupsPane({
  groups,
  onOpen,
}: {
  groups: Group[] | null;
  onOpen: (g: Group) => void;
}) {
  if (groups === null) return <LoadingRows />;
  if (groups.length === 0) return <EmptyPane text="Not in any public groups yet." />;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {groups.map((g) => (
        <li key={g.id}>
          <button
            type="button"
            onClick={() => onOpen(g)}
            className="flex w-full items-center gap-3 rounded-lg border border-border bg-bg-elevated/40 p-3 text-left transition-colors hover:border-border-bright"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-bg">
              {g.avatarUrl ? (
                <img src={g.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Users size={16} className="text-text-muted" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className="block truncate text-text-silver-bright"
                style={{ fontSize: '13.5px' }}
              >
                {g.name}
              </span>
              <span
                className="block font-mono text-text-muted"
                style={{ fontSize: '10.5px' }}
                data-size="meta"
              >
                {formatCount(g.memberCount)} {g.memberCount === 1 ? 'member' : 'members'}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function WatchingPane({ beeId, owner }: { beeId: string; owner: boolean }) {
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
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-bg-elevated/40">
      {saves.map((s) => {
        const inner = (
          <span className="flex items-center gap-3">
            <Bookmark size={13} className="flex-shrink-0 text-honey" />
            <span className="min-w-0 flex-1 truncate text-text-silver" style={{ fontSize: '13px' }}>
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
                data-size="meta"
              >
                {s.realmName}
              </span>
            )}
          </span>
        );
        return (
          <li key={s.saveId}>
            {s.url ? (
              <Link to={s.url} className="block px-3 py-2.5 transition-colors hover:bg-bg-elevated">
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
  const [listings, setListings] = useState<BazaarListing[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    // bazaarMyListings reads the signed-in Bee's own listings (auth.uid); a
    // by-seller public read is not in the data layer yet (PROFILE4/BAZAAR).
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

  if (!isSelf) return <EmptyPane text="This Bee’s public listings arrive with PROFILE4." />;
  if (listings === null) return <LoadingRows />;
  if (listings.length === 0) return <EmptyPane text="No listings offered yet." />;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {listings.map((l) => (
        <li key={l.id}>
          <Link
            to={`/bazaar/${l.id}`}
            className="flex items-center gap-3 rounded-lg border border-border bg-bg-elevated/40 p-3 transition-colors hover:border-border-bright"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border border-border bg-bg">
              <ShoppingBag size={16} className="text-text-muted" />
            </span>
            <span className="min-w-0 flex-1">
              <span
                className="block truncate text-text-silver-bright"
                style={{ fontSize: '13.5px' }}
              >
                {l.title}
              </span>
              <span
                className="block font-mono text-honey"
                style={{ fontSize: '10.5px' }}
                data-size="meta"
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
}: {
  blingRank: number;
  ring: number;
  actionCount: number;
}) {
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
          colorClass="text-honey"
        />
        <RankCard
          icon={<Crown size={16} />}
          title="The RiNG"
          subtitle="9 levels · raw action count · cannot be bought"
          level={ring}
          max={8}
          name={RING_NAMES[Math.min(ring, 8)]}
          colorClass="text-text-silver-bright"
          nextThreshold={nextRingThreshold}
        />
      </div>
      <p className="mt-4 font-mono text-text-muted" style={{ fontSize: '11px' }} data-size="meta">
        {formatCount(actionCount)} lifetime actions · civic rank, streaks, and host roles are
        cross-astra and EARNED, never bought.
      </p>
    </div>
  );
}

function BadgesPane() {
  // Owner ruling: badges are their own design session — do NOT improvise them.
  return (
    <div className="rounded-lg border border-dashed border-border bg-bg-elevated/40 p-8 text-center">
      <Award size={24} className="mx-auto mb-3 text-text-muted" />
      <p className="text-text-silver" style={{ fontSize: '14px' }}>
        Badges — reserved
      </p>
      <p className="mt-2 font-mono text-text-muted" style={{ fontSize: '11px' }} data-size="meta">
        The badge system is its own design session.
      </p>
    </div>
  );
}

/* ───────────────────────────── Shared bits ───────────────────────────── */

function EmptyPane({ text }: { text: string }) {
  return (
    <div
      className="rounded-lg border border-dashed border-border bg-bg-elevated/40 p-6 text-center text-text-muted"
      style={{ fontSize: '13px' }}
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
          className="animate-pulse-slow rounded-lg border border-border p-3"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="h-4 rounded bg-bg-elevated" style={{ width: `${w}%` }} />
        </li>
      ))}
    </ul>
  );
}
