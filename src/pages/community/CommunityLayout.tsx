import { CreateEventModal } from '@/components/events/CreateEventModal';
import { CreateGroupModal } from '@/components/groups/CreateGroupModal';
import type { IntelView } from '@/components/intel/IntelSidebar';
import { CommunityShell } from '@/components/shell/CommunityShell';
import { COMMON_TAIL, type SidebarItem } from '@/components/shell/sidebarNav';
import { useAuth } from '@/lib/auth';
import { SURFACE_BY_SLUG } from '@/lib/surfaces';
import { countMyGoingUpcoming } from '@/lib/events';
import { isForumModerator } from '@/lib/forumMod';
import { countMyGroups } from '@/lib/groups';
import { countThreadsByAuthor } from '@/lib/intel';
import { countSavedThreads } from '@/lib/reactions';
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
  MessageSquare,
  Plus,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

type Surface = 'intel' | 'unite' | 'rule' | 'give' | 'pulse';

const ACCENT: Record<Surface, string> = {
  intel: '#1D9BF0',
  unite: '#7C3AED',
  rule: '#F97316',
  give: '#16A34A',
  // PULSE / media red — sourced from the surface registry (kept in sync with
  // the relit cards' SURFACE_BY_SLUG.get('pulse')?.color).
  pulse: SURFACE_BY_SLUG.get('pulse')?.color ?? '#DC2626',
};

const VIEW_ROUTE_MAP: Record<string, IntelView> = { '/intel/mine': 'mythreads' };
const UNFILTERED_VIEWS: IntelView[] = ['mythreads', 'saved', 'home'];

function surfaceFromPath(pathname: string): Surface {
  if (pathname.startsWith('/unite')) return 'unite';
  if (pathname.startsWith('/rule')) return 'rule';
  if (pathname.startsWith('/give')) return 'give';
  if (pathname.startsWith('/pulse')) return 'pulse';
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
  const surface = surfaceFromPath(location.pathname);

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
  const [isMod, setIsMod] = useState(false);
  const [myGroups, setMyGroups] = useState(0);
  const [going, setGoing] = useState(0);

  const refreshGroups = useCallback(() => {
    if (!bee?.id) return setMyGroups(0);
    countMyGroups(bee.id)
      .then(setMyGroups)
      .catch(() => setMyGroups(0));
  }, [bee?.id]);
  const refreshGoing = useCallback(() => {
    if (!bee?.id) return setGoing(0);
    countMyGoingUpcoming(bee.id)
      .then(setGoing)
      .catch(() => setGoing(0));
  }, [bee?.id]);

  useEffect(() => {
    if (!bee?.id) {
      setMyThreads(0);
      setSaved(0);
      setIsMod(false);
      setMyGroups(0);
      setGoing(0);
      return;
    }
    countThreadsByAuthor(bee.id)
      .then(setMyThreads)
      .catch(() => setMyThreads(0));
    countSavedThreads(bee.id)
      .then(setSaved)
      .catch(() => setSaved(0));
    isForumModerator(bee.id)
      .then(setIsMod)
      .catch(() => setIsMod(false));
    refreshGroups();
    refreshGoing();
  }, [bee?.id, refreshGroups, refreshGoing]);

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
    // give
    if (location.pathname !== '/give') navigate('/give');
    setGiveView(id as GiveView);
  }

  const accent = ACCENT[surface];
  const items = buildItems(surface, { myThreads, saved, isMod, myGroups, going });
  const activeItemId =
    surface === 'intel'
      ? activeView
      : surface === 'unite'
        ? uniteView
        : surface === 'rule'
          ? ruleView
          : surface === 'pulse'
            ? 'home'
            : giveView;

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
  isMod: boolean;
  myGroups: number;
  going: number;
}

function buildItems(surface: Surface, c: Counts): SidebarItem[] {
  if (surface === 'unite') {
    // Relay UNITE pass-1 list (creation stays on the center page's Create button).
    return [
      { id: 'discover', label: 'Explore', icon: Compass },
      { id: 'following', label: 'Following', icon: Users, soon: true },
      { id: 'mine', label: 'My Groups', icon: HeartHandshake, badge: c.myGroups },
      ...COMMON_TAIL,
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
      ...COMMON_TAIL,
    ];
  }
  if (surface === 'give') {
    return [
      { id: 'discover', label: 'Explore', icon: Compass },
      { id: 'create', label: 'Create Campaign', icon: Plus },
      { id: 'mine', label: 'My Campaigns', icon: HeartHandshake },
      ...COMMON_TAIL,
    ];
  }
  if (surface === 'pulse') {
    // PULSE is self-contained (live / upcoming / library / search live on the
    // center page), so the sidebar is just Explore + the shared utility tail.
    return [{ id: 'home', label: 'Explore', icon: Compass }, ...COMMON_TAIL];
  }
  // intel — Explore · Following · My Posts (pass-12). The old Trending/Breaking/
  // For Me/Saved/Create views still exist in state; they're just no longer
  // surfaced here (Create lives on the center composer).
  return [
    { id: 'home', label: 'Explore', icon: Compass },
    { id: 'following', label: 'Following', icon: Users },
    { id: 'mythreads', label: 'My Posts', icon: MessageSquare, badge: c.myThreads },
    ...COMMON_TAIL,
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
