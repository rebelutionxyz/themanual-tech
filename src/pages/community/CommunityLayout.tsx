import { BAZAAR_ACCENT } from '@/components/bazaar/cards';
import { CreateEventModal } from '@/components/events/CreateEventModal';
import { CreateGroupModal } from '@/components/groups/CreateGroupModal';
import type { IntelView } from '@/components/intel/IntelSidebar';
import { RealmTreeContent } from '@/components/shell/RealmTreeSlider';
import {
  type PanelKey,
  type ShellNavGroup,
  type ShellNavItem,
  UniversalShell,
} from '@/components/shell/UniversalShell';
import { COMMON_TAIL, type SidebarItem } from '@/components/shell/sidebarNav';
import { useAuth } from '@/lib/auth';
import { countMySavesForSurface } from '@/lib/bookmarks';
import { countMyGoingUpcoming } from '@/lib/events';
import { isForumModerator } from '@/lib/forumMod';
import { countMyGroups } from '@/lib/groups';
import { countThreadsByAuthor } from '@/lib/intel';
import { unreadNotificationsCount } from '@/lib/notifications';
import {
  ASTRA_TOKENS,
  type AstraTokens,
  astraPath,
  tokensFromAccent,
} from '@/lib/shell/astraTokens';
import { supabase } from '@/lib/supabase';
import { SURFACE_BY_SLUG } from '@/lib/surfaces';
import { useBlingBalance } from '@/lib/useBlingBalance';
import type { EventsOutletCtx, EventsView } from '@/pages/events/EventsLayout';
import type { GiveOutletCtx, GiveView } from '@/pages/give/GiveLayout';
import type { GroupsOutletCtx, GroupsView } from '@/pages/groups/GroupsLayout';
import { useIntelStore } from '@/stores/useIntelStore';
import { useLensStore } from '@/stores/useLensStore';
import { REALM_COLOR_FALLBACK, useRealmColors } from '@/stores/useRealmColors';
import type { RealmId } from '@/types/manual';
import {
  Check,
  ChevronRight,
  Circle,
  Compass,
  HeartHandshake,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Package,
  Plus,
  Shield,
  ShoppingBag,
  Ticket,
  Users,
} from 'lucide-react';
import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

type Surface = 'intel' | 'unite' | 'rule' | 'give' | 'pulse' | 'bazaar' | 'comms' | 'security';

/* ONE_SHELL1 (owner 2026-09-03: "One shell. ONE.") — this layout now mounts
 * UniversalShell, the same frame h24 wears. CommunityShell is retired. Each
 * community surface is an astra: it takes its ratified/proposed ASTRA_TOKENS
 * row where one exists (keyed below), else tokens derived from the accent it
 * already carried. The nav model is the SidebarItem list it always built,
 * mapped onto the shell's groups. Nothing about the surfaces' content changed
 * in this pass — that is the retokenize work, page by page, that follows. */
const SURFACE_ASTRA_KEY: Record<Surface, string> = {
  intel: 'intel',
  unite: 'groups',
  rule: 'events',
  give: 'fund',
  pulse: 'news',
  bazaar: 'bazaar',
  comms: 'talk',
  security: 'security',
};
const SURFACE_TLD: Record<Surface, string> = {
  intel: '.fyi',
  unite: '.group',
  rule: '.events',
  give: '.fund',
  pulse: '.news',
  bazaar: '.shop',
  comms: '.talk',
  security: '.icu',
};

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
  // Security SLATE — matches astraColor('security') in sidebarNav. #58A6FF read
  // as the same bar as INTEL's #1D9BF0 (FRONT27).
  security: '#475569',
};

const VIEW_ROUTE_MAP: Record<string, IntelView> = {
  '/intel/mine': 'mythreads',
  '/intel/saved': 'saved',
};

/** Utility-tail route → tail item id (sidebar highlight on tail surfaces). */
const TAIL_ROUTE_ITEM: [string, string][] = [
  ['/account', 'account'],
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

/**
 * Owner 2026-09-03: "if I am in .shop and hit account it changes to .fyi. It
 * needs to stay in .shop." Utility-tail routes (/account, /studio, /settings,
 * /notifications, /bookmarks, ...) belong to NO astra, so they return null and
 * the layout keeps the astra you came from. Only a real surface path switches.
 */
function surfaceFromPath(pathname: string): Surface | null {
  if (pathname.startsWith('/intel')) return 'intel';
  if (pathname.startsWith('/unite')) return 'unite';
  if (pathname.startsWith('/rule')) return 'rule';
  // FUND lives at /fund now (FUND_MF v0.1); the surface KEY stays 'give'.
  if (pathname.startsWith('/fund')) return 'give';
  if (pathname.startsWith('/pulse')) return 'pulse';
  if (pathname.startsWith('/bazaar')) return 'bazaar';
  if (pathname.startsWith('/comms')) return 'comms';
  if (pathname.startsWith('/security')) return 'security';
  return null;
}

const LAST_SURFACE_KEY = 'shell.lastSurface';
function readLastSurface(): Surface {
  try {
    const v = sessionStorage.getItem(LAST_SURFACE_KEY);
    if (v && v in SURFACE_ASTRA_KEY) return v as Surface;
  } catch {
    /* storage unavailable — fall through */
  }
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
  const { balance: blingBalance } = useBlingBalance(Boolean(bee));
  // Popup-aware surface: when a popup route is open, ModalLink stashed the
  // origin location as `background` — the shell keeps rendering THAT surface
  // (accent, items, outlet) instead of flipping to the popup path's default.
  const shellPath =
    (location.state as { background?: { pathname: string } } | null)?.background?.pathname ??
    location.pathname;
  // Sticky astra: a tail route keeps the surface you were on (ref survives
  // navigation because this layout mounts once; sessionStorage survives reload).
  const lastSurface = useRef<Surface>(readLastSurface());
  const routed = surfaceFromPath(shellPath);
  if (routed) {
    lastSurface.current = routed;
    try {
      sessionStorage.setItem(LAST_SURFACE_KEY, routed);
    } catch {
      /* ignore */
    }
  }
  const surface = routed ?? lastSurface.current;

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

  // REALM1: the 14 realms in display order, for the sidebar Realm nav group
  // (INTEL + UNITE only — owner ruling 2026-09-03: sidebar, never the toolbar).
  const realmColors = useRealmColors((s) => s.colors);
  const [realmList, setRealmList] = useState<{ id: RealmId; name: string }[]>([]);
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    supabase
      .from('realms')
      .select('id, name, display_order')
      .order('display_order', { ascending: true })
      .then(({ data }) => {
        if (cancelled || !data) return;
        setRealmList(
          (data as { id: string; name: string }[]).map((r) => ({
            id: r.id as RealmId,
            name: r.name,
          })),
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);
  // Right-drawer sub-realm browser (RealmTreeContent, scoped to one realm's
  // subtree) — opened by a row's chevron, not by picking the row itself.
  const [openPanel, setOpenPanel] = useState<PanelKey | null>(null);
  const [realmDrawerRoot, setRealmDrawerRoot] = useState<string | null>(null);

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
    if (surface === 'security') {
      // Security is self-contained — surfaces / threats / quarantine / history
      // are tabs on the center page, so the only own item is Overview.
      if (location.pathname !== '/security') navigate('/security');
      return;
    }
    if (surface === 'bazaar') {
      // BAZAAR sidebar items are route links; this guards the FUND fallthrough.
      return;
    }
    // give (FUND — surface key unchanged, route is /fund)
    if (location.pathname !== '/fund') navigate('/fund');
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
          : surface === 'pulse' || surface === 'comms' || surface === 'security'
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

  // ONE_SHELL1 — the surface's astra tokens, then the SidebarItem list mapped
  // onto the shell's nav groups. `dividerAbove` marks where the utility tail
  // starts; it becomes the second group.
  const tokens: AstraTokens =
    ASTRA_TOKENS[SURFACE_ASTRA_KEY[surface]] ??
    tokensFromAccent(SURFACE_ASTRA_KEY[surface], SURFACE_TLD[surface], accent);
  const toNav = (it: SidebarItem) => ({
    id: it.id,
    label: it.label,
    icon: createElement(it.icon, { size: 17 }),
    onClick: it.soon ? undefined : () => (it.to ? navigate(it.to) : handleSelect(it.id)),
    active: it.id === activeItemId,
    hint: it.soon ? 'soon' : it.badge && it.badge > 0 ? it.badge : undefined,
  });
  const tailStart = items.findIndex((it) => it.dividerAbove);
  const surfaceGroups: ShellNavGroup[] =
    tailStart > 0
      ? [
          { id: surface, items: items.slice(0, tailStart).map(toNav) },
          { id: 'tail', label: 'You', items: items.slice(tailStart).map(toNav) },
        ]
      : [{ id: surface, items: items.map(toNav) }];

  // REALM1 — Realm nav group, INTEL + UNITE only. The row itself picks the
  // realm (setRealmId + jump to the surface root, toggling off on repeat
  // click); its chevron opens the sub-realm browser in the right drawer
  // instead — the two affordances never fire together (stopPropagation).
  function selectRealm(r: { id: RealmId; name: string }) {
    setRealmId(selectedRealmId === r.id ? null : r.id);
    if (location.pathname !== `/${surface}`) navigate(`/${surface}`);
  }
  function openRealmDrawer(name: string) {
    setRealmDrawerRoot(name);
    setOpenPanel('realm');
  }
  const showRealmNav = surface === 'intel' || surface === 'unite';
  const realmNavItems: ShellNavItem[] = realmList.map((r) => {
    const color = realmColors[r.id] ?? REALM_COLOR_FALLBACK;
    return {
      id: `realm-${r.id}`,
      label: r.name,
      icon: <Circle size={10} fill={color} stroke={color} />,
      active: selectedRealmId === r.id,
      onClick: () => selectRealm(r),
      hint: (
        // biome-ignore lint/a11y/useSemanticElements: nested inside the row's own <button> (UniversalShell Sidebar) — a real <button> here is invalid HTML nesting
        <span
          role="button"
          tabIndex={0}
          aria-label={`Browse ${r.name} sub-realms`}
          onClick={(e) => {
            e.stopPropagation();
            openRealmDrawer(r.name);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              e.preventDefault();
              openRealmDrawer(r.name);
            }
          }}
          className="flex h-5 w-5 items-center justify-center rounded"
          style={{ color: 'var(--icon)' }}
        >
          <ChevronRight size={13} />
        </span>
      ),
    };
  });
  const nav: ShellNavGroup[] = showRealmNav
    ? [{ id: 'realm', label: 'Realm', items: realmNavItems }, ...surfaceGroups]
    : surfaceGroups;

  return (
    <UniversalShell
      tokens={tokens}
      nav={nav}
      bling={blingBalance}
      handle={bee?.handle ?? null}
      onBack={() => navigate(-1)}
      onForward={() => navigate(1)}
      onSearch={() => navigate('/manual')}
      onAvatar={() => navigate('/profile')}
      onOpenLedger={() => navigate('/freedomblings')}
      onTransfer={() => navigate('/freedomblings/move')}
      onSelectAstra={(key) => {
        const to = astraPath(key);
        if (to) navigate(to);
      }}
      panels={{ realm: { title: realmDrawerRoot ?? 'Realm', width: 'compact' } }}
      openPanel={openPanel}
      onOpenPanel={setOpenPanel}
      renderPanel={(slot) =>
        slot === 'realm' ? (
          <div className="overflow-hidden rounded-md bg-white">
            <RealmTreeContent
              rootPath={realmDrawerRoot ? [realmDrawerRoot] : []}
              clearLabel={realmDrawerRoot ? `All ${realmDrawerRoot}` : 'All realms'}
            />
          </div>
        ) : undefined
      }
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
    </UniversalShell>
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
    // RULE order (Butch 2026-07-18): Explore · Following · Attending ·
    // Tickets | Create Event · Hosting · Attendees | tail. Create moved
    // from the center page into the sidebar (action → CreateEventModal).
    return [
      { id: 'upcoming', label: 'Explore', icon: Compass },
      { id: 'following', label: 'Following', icon: Users, soon: true },
      { id: 'going', label: 'Attending', icon: Check, badge: c.going },
      { id: 'tickets', label: 'Tickets', icon: Ticket, soon: true },
      { id: 'create', label: 'Create Event', icon: Plus, dividerAbove: true },
      { id: 'hosting', label: 'Hosting', icon: Megaphone },
      { id: 'attendees', label: 'Attendees', icon: Users, soon: true },
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
  if (surface === 'security') {
    // Security — the scan surfaces, threats, quarantine and history are tabs on
    // the center page, so the sidebar is just Overview + the shared tail.
    return [{ id: 'home', label: 'Overview', icon: Shield }, ...tailItems(c)];
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
