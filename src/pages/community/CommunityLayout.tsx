import { BAZAAR_ACCENT } from '@/components/bazaar/cards';
import { CreateEventModal } from '@/components/events/CreateEventModal';
import { CreateGroupModal } from '@/components/groups/CreateGroupModal';
import type { IntelView } from '@/components/intel/IntelSidebar';
import { CommunityShell } from '@/components/shell/CommunityShell';
import { COMMON_TAIL, type SidebarItem } from '@/components/shell/sidebarNav';
import { useAuth } from '@/lib/auth';
import { countMyGoingUpcoming } from '@/lib/events';
import { isForumModerator } from '@/lib/forumMod';
import { countMyGroups } from '@/lib/groups';
import { countMySavesForSurface } from '@/lib/bookmarks';
import { countThreadsByAuthor } from '@/lib/intel';
import { unreadNotificationsCount } from '@/lib/notifications';
import { SURFACE_BY_SLUG } from '@/lib/surfaces';
import type { EventsOutletCtx, EventsView } from '@/pages/events/EventsLayout';
import type { GiveOutletCtx, GiveView } from '@/pages/give/GiveLayout';
import type { GroupsOutletCtx, GroupsView } from '@/pages/groups/GroupsLayout';
import { useIntelStore } from '@/stores/useIntelStore';
import { useLensStore } from '@/stores/useLensStore';
import { useRealmColors } from '@/stores/useRealmColors';
import type { RealmId } from '@/types/manual';
import {
  Check,
  Compass,
  HeartHandshake,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Package,
  Plus,
  Shield,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

type Surface = 'intel' | 'unite' | 'rule' | 'give' | 'pulse' | 'bazaar' | 'comms';

const ACCENT: Record<Surface, string> = {
  intel: '#1D9BF0',
  unite: '#7C3AED',
  rule: '#F97316',
  give: '#16A34A',
  // PULSE / media red — sourced from the surface registry (kept in sync with
  // the relit cards' SURFACE_BY_SLUG.get('pulse')?.color).
  pulse: SURFACE_BY_SLUG.get('pulse')?.color ?? '#DC2626',
  bazaar: BAZAAR_ACCENT,
  // COMMS lilac — canonical color from the surface registry.
  comms: SURFACE_BY_SLUG.get('comms')?.color ?? '#9B7FC8',
};

const VIEW_ROUTE_MAP: Record<string, IntelView> = {
  '/intel/mine': 'mythreads',
  '/intel/saved': 'saved',
};

/** Utility-tail route → tail item id (sidebar highlight on tail surfaces). */
const TAIL_ROUTE_ITEM: [string, string][] = [
  ['/notifications', 'notifications'],
  ['/studio', 'creators'],
  ['/premium', 'premium'],
  ['/business', 'business'],
  ['/promotion', 'advertising'],
  ['/settings', 'settings'],
  ['/intel/reported', 'report'],
  ['/intel/saved', 'bookmarks'],
  ['/bookmarks', 'bookmarks'],
];
const UNFILTERED_VIEWS: IntelView[] = ['mythreads', 'saved', 'home'];

function surfaceFromPath(pathname: string): Surface {
  if (pathname.startsWith('/unite')) return 'unite';
  if (pathname.startsWith('/rule')) return 'rule';
  if (pathname.startsWith('/give')) return 'give';
  if (pathname.startsWith('/pulse')) return 'pulse';
  if (pathname.startsWith('/bazaar')) return 'bazaar';
  if (pathname.startsWith('/comms')) return 'comms';
  return 'intel';
}

/**
 * Persistent layout route for ALL community surfaces. Mounts the white shell
 * (sidebar + right rail) ONCE; only the center <Outlet/> swaps on navigation.
 * Owns the per-surface view state + create modals so the sidebar never unmounts.
 */
export function CommunityLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { bee } = useAuth();
  // Popup-aware surface: when a popup route is open, ModalLink stashed the
  // origin location as `background` — the shell keeps rendering THAT surface
  // (accent, items, outlet) instead of flipping to the popup path's default.
  const shellPath =
    (location.state as { background?: { pathname: string } } | null)?.background?.pathname ??
    location.pathname;
  const surface = surfaceFromPath(shellPath);

  // INTEL state lives in its store; UNITE/RULE/GIVE views are local (persist
  // because this layout mounts once).
  const { selectedRealmId, selectedL2, activeView, setRealmId, setL2, setL3, setActiveView } =
    useIntelStore();
  const setPrefix = useLensStore((s) => s.setPrefix);
  const lensRealmId = useLensStore((s) => s.realmId);
  const lensL2 = useLensStore((s) => s.l2);
  const lensL3 = useLensStore((s) => s.l3);

  // Pull realm colors from realms.color once (frontend map is the fallback).
  useEffect(() => {
    void useRealmColors.getState().load();
  }, []);

  const [uniteView, setUniteView] = useState<GroupsView>('discover');
  const [ruleView, setRuleView] = useState<EventsView>('upcoming');
  const [giveView, setGiveView] = useState<GiveView>('discover');
  const [createOpen, setCreateOpen] = useState(false);

  const [myThreads, setMyThreads] = useState(0);
  const [saved, setSaved] = useState(0);
  const [notif, setNotif] = useState(0);
  const [isMod, setIsMod] = useState(false);
  const [myGroups, setMyGroups] = useState(0);
  const [going, setGoing] = useState(0);

  // Personal counts (My Posts badge, Bookmarked badge, unread notifications).
  // Refetched on sign-in change AND on the shared `intel-counts-refresh`
  // event (fired by ThreadList on save/unsave, IntelPage on thread create,
  // NotificationsPage on read/dismiss).
  const refreshPersonal = useCallback(() => {
    if (!bee?.id) {
      setMyThreads(0);
      setSaved(0);
      setNotif(0);
      return;
    }
    countThreadsByAuthor(bee.id)
      .then(setMyThreads)
      .catch(() => setMyThreads(0));
    // Saved badge previews the popup's default scope: THIS surface's saves
    // only — the popup opens scoped to where the Bee is standing, so the
    // number and the opened view always agree.
    countMySavesForSurface(bee.id, surface)
      .then(setSaved)
      .catch(() => setSaved(0));
    unreadNotificationsCount()
      .then(setNotif)
      .catch(() => setNotif(0));
  }, [bee?.id, surface]);

  useEffect(() => {
    const onRefresh = () => refreshPersonal();
    window.addEventListener('intel-counts-refresh', onRefresh);
    return () => window.removeEventListener('intel-counts-refresh', onRefresh);
  }, [refreshPersonal]);

  const refreshGroups = useCallback(() => {
    if (!bee?.id) return setMyGroups(0);
    countMyGroups(bee.id)
      .then(setMyGroups)
      .catch(() => setMyGroups(0));
  }, [bee?.id]);

  // UNITE counts (My Groups badge) — refetched on join/leave (fired by
  // GroupPage), mirroring the intel-counts-refresh pattern.
  useEffect(() => {
    const onRefresh = () => refreshGroups();
    window.addEventListener('unite-counts-refresh', onRefresh);
    return () => window.removeEventListener('unite-counts-refresh', onRefresh);
  }, [refreshGroups]);
  const refreshGoing = useCallback(() => {
    if (!bee?.id) return setGoing(0);
    countMyGoingUpcoming(bee.id)
      .then(setGoing)
      .catch(() => setGoing(0));
  }, [bee?.id]);

  useEffect(() => {
    if (!bee?.id) {
      setIsMod(false);
      setMyGroups(0);
      setGoing(0);
      refreshPersonal();
      return;
    }
    refreshPersonal();
    isForumModerator(bee.id)
      .then(setIsMod)
      .catch(() => setIsMod(false));
    refreshGroups();
    refreshGoing();
  }, [bee?.id, refreshPersonal, refreshGroups, refreshGoing]);

  // INTEL: route → view sync (e.g. /intel/mine).
  // biome-ignore lint/correctness/useExhaustiveDependencies: only re-syncs on route change; store actions/state intentionally omitted
  useEffect(() => {
    const view = VIEW_ROUTE_MAP[location.pathname];
    if (view && view !== activeView) {
      setActiveView(view);
      if (UNFILTERED_VIEWS.includes(view)) {
        setRealmId(null);
        setL2(null);
        setL3(null);
        setPrefix([]);
      }
    }
  }, [location.pathname]);

  // INTEL: mirror the realm lens into the Intel store so ThreadList re-queries.
  // biome-ignore lint/correctness/useExhaustiveDependencies: store setters are stable; re-sync only when the lens path changes
  useEffect(() => {
    setRealmId(lensRealmId);
    if (lensL2) setL2(lensL2);
    if (lensL3) setL3(lensL3);
  }, [lensRealmId, lensL2, lensL3]);

  function handleIntelSelect(view: IntelView) {
    if (view === 'create') return navigate(buildNewThreadUrl(selectedRealmId, selectedL2));
    if (view === 'mythreads') return navigate('/intel/mine');
    if (location.pathname !== '/intel') navigate('/intel');
    if (view === 'home' || view === 'saved') {
      setRealmId(null);
      setL2(null);
      setL3(null);
      setPrefix([]);
    }
    setActiveView(view);
  }

  function handleSelect(id: string) {
    if (surface === 'intel') return handleIntelSelect(id as IntelView);
    if (surface === 'unite') {
      if (location.pathname !== '/unite') navigate('/unite');
      return setUniteView(id as GroupsView);
    }
    if (surface === 'rule') {
      if (id === 'create') return setCreateOpen(true);
      if (location.pathname !== '/rule') navigate('/rule');
      return setRuleView(id as EventsView);
    }
    if (surface === 'pulse') {
      // PULSE has no center-view switcher; the only own item is Explore → home.
      if (location.pathname !== '/pulse') navigate('/pulse');
      return;
    }
    if (surface === 'comms') {
      // COMMS is self-contained (conversation list + thread live on the center
      // page); the only own item is Conversations → /comms.
      if (location.pathname !== '/comms') navigate('/comms');
      return;
    }
    if (surface === 'bazaar') {
      // BAZAAR sidebar items are route links; this guards the give-fallthrough.
      return;
    }
    // give
    if (location.pathname !== '/give') navigate('/give');
    setGiveView(id as GiveView);
  }

  const accent = ACCENT[surface];
  const items = buildItems(surface, { myThreads, saved, notif, isMod, myGroups, going });
  const bazaarItem = location.pathname.startsWith('/bazaar/new')
    ? 'offer'
    : location.pathname.startsWith('/bazaar/orders')
      ? 'orders'
      : 'browse';
  // Utility-tail routes highlight their own tail item regardless of surface.
  const tailActive = TAIL_ROUTE_ITEM.find(([p]) => location.pathname.startsWith(p))?.[1];
  const surfaceActiveId =
    surface === 'intel'
      ? // Bookmarked is a tail link (id 'bookmarks') driving the 'saved' view.
        activeView === 'saved'
        ? 'bookmarks'
        : activeView
      : surface === 'unite'
        ? uniteView
        : surface === 'rule'
          ? ruleView
          : surface === 'pulse' || surface === 'comms'
            ? 'home'
            : surface === 'bazaar'
              ? bazaarItem
              : giveView;
  const activeItemId = tailActive ?? surfaceActiveId;

  const outletCtx =
    surface === 'unite'
      ? ({ view: uniteView, openCreate: () => setCreateOpen(true) } satisfies GroupsOutletCtx)
      : surface === 'rule'
        ? ({ view: ruleView, openCreate: () => setCreateOpen(true) } satisfies EventsOutletCtx)
        : surface === 'give'
          ? ({ view: giveView } satisfies GiveOutletCtx)
          : undefined;

  return (
    <CommunityShell
      activeSurface={surface}
      accent={accent}
      items={items}
      activeItemId={activeItemId}
      onSelect={handleSelect}
    >
      <Outlet context={outletCtx} />

      {surface === 'unite' && createOpen && (
        <CreateGroupModal
          onClose={() => setCreateOpen(false)}
          onCreated={(slug) => {
            setCreateOpen(false);
            refreshGroups();
            navigate(`/unite/${slug}`);
          }}
        />
      )}
      {surface === 'rule' && createOpen && (
        <CreateEventModal
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => {
            setCreateOpen(false);
            refreshGoing();
            navigate(`/rule/${id}`);
          }}
        />
      )}
    </CommunityShell>
  );
}

interface Counts {
  myThreads: number;
  saved: number;
  notif: number;
  isMod: boolean;
  myGroups: number;
  going: number;
}

/** Shared utility tail with live personal badges (saved + unread) painted in. */
function tailItems(c: Counts): SidebarItem[] {
  return COMMON_TAIL.map((t) => {
    if (t.id === 'bookmarks' && c.saved > 0) return { ...t, badge: c.saved };
    if (t.id === 'notifications' && c.notif > 0) return { ...t, badge: c.notif };
    return t;
  });
}

function buildItems(surface: Surface, c: Counts): SidebarItem[] {
  if (surface === 'unite') {
    // Relay UNITE pass-1 list (creation stays on the center page's Create
    // button). Following live 2026-07-16 — bee_follows reuse: groups CREATED
    // by Bees you follow (same semantics as the INTEL Following feed).
    // Moderating de-orphans listMyModeratingGroups (RULE "Hosting" parallel).
    return [
      { id: 'discover', label: 'Explore', icon: Compass },
      { id: 'following', label: 'Following', icon: Users },
      { id: 'mine', label: 'My Groups', icon: HeartHandshake, badge: c.myGroups },
      { id: 'moderating', label: 'Moderating', icon: Shield },
      ...tailItems(c),
    ];
  }
  if (surface === 'rule') {
    // Explore · Following · Hosting · Attending (pass-12). Create stays on the
    // center page's Create button; Upcoming/Past are the Explore view's sorts.
    return [
      { id: 'upcoming', label: 'Explore', icon: Compass },
      { id: 'following', label: 'Following', icon: Users, soon: true },
      { id: 'hosting', label: 'Hosting', icon: Megaphone },
      { id: 'going', label: 'Attending', icon: Check, badge: c.going },
      ...tailItems(c),
    ];
  }
  if (surface === 'give') {
    return [
      { id: 'discover', label: 'Explore', icon: Compass },
      { id: 'create', label: 'Create Campaign', icon: Plus },
      { id: 'mine', label: 'My Campaigns', icon: HeartHandshake },
      ...tailItems(c),
    ];
  }
  if (surface === 'pulse') {
    // PULSE is self-contained (live / upcoming / library / search live on the
    // center page), so the sidebar is just Explore + the shared utility tail.
    return [{ id: 'home', label: 'Explore', icon: Compass }, ...tailItems(c)];
  }
  if (surface === 'comms') {
    // COMMS — conversation list + thread live on the center page, so the
    // sidebar is just Conversations + the shared utility tail.
    return [{ id: 'home', label: 'Conversations', icon: MessageCircle }, ...tailItems(c)];
  }
  if (surface === 'bazaar') {
    // BAZAAR — route-link items (Browse / OFFER / Orders) + the shared tail.
    return [
      { id: 'browse', label: 'Browse', icon: ShoppingBag, to: '/bazaar' },
      { id: 'offer', label: 'New Offer', icon: Plus, to: '/bazaar/new' },
      { id: 'orders', label: 'Orders', icon: Package, to: '/bazaar/orders' },
      ...tailItems(c),
    ];
  }
  // intel — Explore · Following · My Posts (pass-12). The old Trending/Breaking/
  // For Me/Saved/Create views still exist in state; they're just no longer
  // surfaced here (Create lives on the center composer).
  return [
    { id: 'home', label: 'Explore', icon: Compass },
    { id: 'following', label: 'Following', icon: Users },
    { id: 'mythreads', label: 'My Posts', icon: MessageSquare, badge: c.myThreads },
    ...tailItems(c),
  ];
}

/** Build /intel/new URL with optional realm context params. */
export function buildNewThreadUrl(realmId: RealmId | null, l2: string | null): string {
  const params = new URLSearchParams();
  if (realmId) params.set('realm', realmId);
  if (l2) params.set('l2', l2);
  const qs = params.toString();
  return qs ? `/intel/new?${qs}` : '/intel/new';
}
